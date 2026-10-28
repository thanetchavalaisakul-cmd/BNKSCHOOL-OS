
create table if not exists public.behavior_managers (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  assigned_by uuid references public.profiles(id),
  assigned_at timestamptz not null default now()
);
create table if not exists public.behavior_settings (
  id smallint primary key default 1 check(id=1),
  starting_score int not null default 100 check (starting_score between 0 and 1000),
  good_min int not null default 80,
  monitor_min int not null default 50,
  updated_by uuid references public.profiles(id),
  updated_at timestamptz not null default now(),
  constraint behavior_threshold_order check(good_min>monitor_min and monitor_min>=0 and starting_score>=good_min)
);
insert into public.behavior_settings(id) values(1) on conflict(id) do nothing;
create table if not exists public.behavior_events (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id),
  academic_year text not null,
  semester smallint not null check(semester between 1 and 2),
  kind text not null check(kind in ('deduction','addition')),
  occurred_on date not null default current_date,
  location text,
  description text not null check(char_length(trim(description)) between 5 and 2000),
  outcomes text[] not null default '{}'::text[],
  score_delta smallint not null check(score_delta between -100 and 100),
  note text,
  parent_status text not null default 'not_required' check(parent_status in ('not_required','pending','notified','appointment','acknowledged')),
  event_status text not null default 'recorded' check(event_status in ('recorded','in_review','completed','void')),
  created_by uuid not null default auth.uid() references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint behavior_kind_delta check((kind='deduction' and score_delta<=0) or (kind='addition' and score_delta>0))
);
create index if not exists behavior_events_student_period_idx on public.behavior_events(student_id,academic_year,semester,created_at desc);
create index if not exists behavior_events_created_idx on public.behavior_events(created_at desc);
create table if not exists public.behavior_signatures (
 id uuid primary key default gen_random_uuid(),
 event_id uuid not null references public.behavior_events(id) on delete cascade,
 signer_role text not null check(signer_role in ('student','guardian','homeroom','student_affairs','witness')),
 signer_name text not null check(char_length(trim(signer_name)) between 2 and 180),
 signature_png text not null check(char_length(signature_png)<500000 and signature_png like 'data:image/png;base64,%'),
 signed_at timestamptz not null default now(),
 collected_by uuid not null default auth.uid() references public.profiles(id),
 unique(event_id,signer_role)
);
create table if not exists public.behavior_evidence (
 id uuid primary key default gen_random_uuid(),
 event_id uuid not null references public.behavior_events(id) on delete cascade,
 file_name text not null,
 storage_path text not null unique,
 mime_type text not null,
 uploaded_by uuid not null default auth.uid() references public.profiles(id),
 created_at timestamptz not null default now()
);
create or replace function public.behavior_is_super_admin() returns boolean
 language sql stable security definer set search_path=public
 as $$ select auth.uid() is not null and exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='super_admin' and p.deleted_at is null and p.account_status='approved') $$;
create or replace function public.behavior_is_editor() returns boolean
 language sql stable security definer set search_path=public
 as $$ select public.behavior_is_super_admin() or (auth.uid() is not null and exists(select 1 from public.behavior_managers b join public.profiles p on p.id=b.user_id where b.user_id=auth.uid() and p.deleted_at is null and p.account_status='approved')) $$;
create or replace function public.behavior_is_leader() returns boolean
 language sql stable security definer set search_path=public
 as $$ select public.behavior_is_editor() or (auth.uid() is not null and exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='director' and p.deleted_at is null and p.account_status='approved')) $$;
create or replace function public.behavior_can_read(p_student uuid,p_year text,p_semester int) returns boolean
 language sql stable security definer set search_path=public
 as $$ select public.behavior_is_leader() or (auth.uid() is not null and exists(
 select 1 from public.student_enrollments e
 join public.homeroom_teachers ht on ht.class_id=e.class_id
 join public.profiles p on p.id=ht.teacher_id
 where e.student_id=p_student and e.academic_year=p_year and e.semester=p_semester
 and ht.teacher_id=auth.uid() and p.deleted_at is null and p.account_status='approved'
 )) $$;
revoke all on function public.behavior_is_super_admin() from public,anon;
revoke all on function public.behavior_is_editor() from public,anon;
revoke all on function public.behavior_is_leader() from public,anon;
revoke all on function public.behavior_can_read(uuid,text,int) from public,anon;
grant execute on function public.behavior_is_super_admin(),public.behavior_is_editor(),public.behavior_is_leader(),public.behavior_can_read(uuid,text,int) to authenticated;
create or replace function public.behavior_roster(p_year text,p_semester int)
returns table(student_id uuid,student_code text,full_name text,class_id uuid,class_name text,student_number int,guardian_name text)
language sql stable security definer set search_path=public as $$
 select s.id,s.student_code,trim(concat_ws(' ',s.prefix,s.first_name,s.last_name)),c.id,
 concat(c.level_name,'/',c.room_name),e.student_number,
 trim(concat_ws(' ',s.guardian_prefix,s.guardian_first_name,s.guardian_last_name))
 from public.student_enrollments e
 join public.students s on s.id=e.student_id
 join public.school_classes c on c.id=e.class_id
 where e.academic_year=p_year and e.semester=p_semester and e.enrollment_status='active'
 and c.is_active is true and public.behavior_can_read(s.id,p_year,p_semester)
 order by c.sort_order,e.student_number,s.last_name
$$;
revoke all on function public.behavior_roster(text,int) from public,anon;
grant execute on function public.behavior_roster(text,int) to authenticated;
alter table public.behavior_managers enable row level security;
alter table public.behavior_settings enable row level security;
alter table public.behavior_events enable row level security;
alter table public.behavior_signatures enable row level security;
alter table public.behavior_evidence enable row level security;
create policy behavior_managers_read on public.behavior_managers for select to authenticated using(public.behavior_is_editor() or public.behavior_is_super_admin());
create policy behavior_managers_insert on public.behavior_managers for insert to authenticated with check(public.behavior_is_super_admin());
create policy behavior_managers_delete on public.behavior_managers for delete to authenticated using(public.behavior_is_super_admin());
create policy behavior_settings_read on public.behavior_settings for select to authenticated using(public.behavior_is_leader() or exists(select 1 from public.homeroom_teachers ht where ht.teacher_id=auth.uid()));
create policy behavior_settings_update on public.behavior_settings for update to authenticated using(public.behavior_is_editor()) with check(public.behavior_is_editor());
create policy behavior_events_read on public.behavior_events for select to authenticated using(public.behavior_can_read(student_id,academic_year,semester));
create policy behavior_events_insert on public.behavior_events for insert to authenticated with check(public.behavior_is_editor() and created_by=auth.uid());
create policy behavior_events_update on public.behavior_events for update to authenticated using(public.behavior_is_editor()) with check(public.behavior_is_editor() and kind in ('addition','deduction') and created_by is not null);
create policy behavior_signatures_read on public.behavior_signatures for select to authenticated using(exists(select 1 from public.behavior_events e where e.id=event_id and public.behavior_can_read(e.student_id,e.academic_year,e.semester)));
create policy behavior_signatures_insert on public.behavior_signatures for insert to authenticated with check(public.behavior_is_editor() and collected_by=auth.uid());
create policy behavior_evidence_read on public.behavior_evidence for select to authenticated using(exists(select 1 from public.behavior_events e where e.id=event_id and public.behavior_can_read(e.student_id,e.academic_year,e.semester)));
create policy behavior_evidence_insert on public.behavior_evidence for insert to authenticated with check(public.behavior_is_editor() and uploaded_by=auth.uid());
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('behavior-evidence','behavior-evidence',false,10485760,array['image/jpeg','image/png','image/webp','application/pdf']) on conflict(id) do nothing;
create policy behavior_storage_insert on storage.objects for insert to authenticated with check(bucket_id='behavior-evidence' and public.behavior_is_editor());
create policy behavior_storage_select on storage.objects for select to authenticated using(bucket_id='behavior-evidence' and exists(select 1 from public.behavior_evidence b join public.behavior_events e on e.id=b.event_id where b.storage_path=name and public.behavior_can_read(e.student_id,e.academic_year,e.semester)));
insert into public.modules(department_id,code,name_th,name_en,route,sort_order,is_active)
select d.id,'student_behavior','ระบบคะแนนพฤติกรรมนักเรียน','Student Behavior Management','/general/student-behavior',31,true from public.departments d where d.code='general'
on conflict do nothing;
grant select,insert,update,delete on public.behavior_managers,public.behavior_settings,public.behavior_events,public.behavior_signatures,public.behavior_evidence to authenticated;
