-- BNK SCHOOL OS | v5.12.9.49 | all-day substitute | additive and reversible
create table if not exists public.substitute_day_assignments (
 id uuid primary key default gen_random_uuid(),
 leave_request_id uuid not null references public.leave_requests(id),
 leave_date date not null,
 academic_year integer not null,
 semester smallint not null,
 absent_teacher_id uuid not null references public.profiles(id),
 substitute_teacher_id uuid not null references public.profiles(id),
 substitute_teacher_name text not null,
 assigned_by uuid not null references public.profiles(id),
 assigned_by_name text not null,
 assigned_at timestamptz not null default now(),
 status text not null default 'assigned' check(status in ('assigned','accepted','cancelled')),
 accepted_by uuid references public.profiles(id),
 accepted_at timestamptz,
 signature_method text check(signature_method in ('paper','stored','drawn','upload')),
 signature_id uuid references public.signatures(id),
 signed_at timestamptz,
 note text,
 updated_at timestamptz not null default now(),
 unique(leave_request_id,leave_date),
 constraint substitute_day_acceptance_check check(
  (status='accepted' and accepted_by=substitute_teacher_id and accepted_at is not null and signature_method is not null)
  or (status<>'accepted' and accepted_at is null and accepted_by is null and signature_method is null and signature_id is null and signed_at is null)
 )
);
create table if not exists public.substitute_day_periods (
 day_assignment_id uuid not null references public.substitute_day_assignments(id) on delete cascade,
 period_no integer not null,
 start_time time not null,
 end_time time not null,
 class_label text,
 subject_name text,
 status text not null check(status in ('assigned','accepted','cancelled')),
 primary key(day_assignment_id,period_no),
 check(end_time>start_time)
);
create table if not exists public.substitute_day_audit (
 id bigint generated always as identity primary key,
 day_assignment_id uuid not null references public.substitute_day_assignments(id),
 actor_id uuid not null references public.profiles(id),
 action text not null,
 previous_teacher_id uuid,
 new_teacher_id uuid,
 note text,
 happened_at timestamptz not null default now()
);
create index if not exists substitute_day_teacher_date_idx on public.substitute_day_assignments(substitute_teacher_id,leave_date) where status<>'cancelled';
create index if not exists substitute_day_period_status_idx on public.substitute_day_periods(status);
alter table public.substitute_day_assignments enable row level security;
alter table public.substitute_day_periods enable row level security;
alter table public.substitute_day_audit enable row level security;
revoke all on public.substitute_day_assignments,public.substitute_day_periods,public.substitute_day_audit from public,anon,authenticated;
grant select on public.substitute_day_assignments,public.substitute_day_periods,public.substitute_day_audit to authenticated;
create policy substitute_day_read on public.substitute_day_assignments for select to authenticated using (
 private.is_active_user() and (substitute_teacher_id=auth.uid() or absent_teacher_id=auth.uid()
 or private.can_view_leave_request(leave_request_id))
);
create policy substitute_day_period_read on public.substitute_day_periods for select to authenticated using (
 exists(select 1 from public.substitute_day_assignments d where d.id=day_assignment_id)
);
create policy substitute_day_audit_read on public.substitute_day_audit for select to authenticated using (
 exists(select 1 from public.substitute_day_assignments d where d.id=day_assignment_id)
);

create or replace function private.substitute_day_slots(p_leave_request_id uuid,p_leave_date date)
returns table(period_no integer,start_time time,end_time time,class_label text,subject_name text)
language sql stable security definer set search_path='' as $fn$
 select z.period_no,z.start_time,z.end_time,
 (select string_agg(distinct sl.class_label,', ') from public.substitute_lessons sl
  where sl.leave_request_id=p_leave_request_id and sl.leave_date=p_leave_date and sl.period_no=z.period_no and sl.status<>'cancelled'),
 (select string_agg(distinct sl.subject_name,', ') from public.substitute_lessons sl
  where sl.leave_request_id=p_leave_request_id and sl.leave_date=p_leave_date and sl.period_no=z.period_no and sl.status<>'cancelled')
 from (
  select distinct on (per.period_no) per.period_no,per.start_time,per.end_time
  from public.timetable_periods per
  join public.timetable_profiles tp on tp.id=per.timetable_id and tp.status='published'
  join public.school_classes c on c.id=tp.class_id and c.is_active=true
  join public.leave_requests lr on lr.id=p_leave_request_id
    and c.academic_year=lr.academic_year::text and c.semester=lr.semester
  where not per.is_break
   and extract(isodow from p_leave_date)::smallint=any(tp.weekdays)
  order by per.period_no,
    case when exists(select 1 from public.substitute_lessons sl
      join public.timetable_entries te on te.id=sl.timetable_entry_id
      where sl.leave_request_id=p_leave_request_id and sl.leave_date=p_leave_date
      and te.timetable_id=tp.id) then 0 else 1 end,
    per.sort_order
 ) z
 order by z.period_no;
$fn$;

create or replace function public.preview_substitute_day(p_leave_request_id uuid,p_leave_date date)
returns table(period_no integer,start_time time,end_time time,class_label text,subject_name text)
language plpgsql stable security definer set search_path='' as $fn$
declare v_lesson uuid;
begin
 select sl.id into v_lesson from public.substitute_lessons sl
 where sl.leave_request_id=p_leave_request_id and sl.leave_date=p_leave_date and sl.status<>'cancelled' limit 1;
 if v_lesson is null or not (
  private.can_manage_substitute_lesson(v_lesson)
  or private.can_view_substitute_lesson(v_lesson)
 ) then raise exception 'Not authorized for this leave date' using errcode='42501'; end if;
 return query select * from private.substitute_day_slots(p_leave_request_id,p_leave_date);
end;
$fn$;

create or replace function public.get_substitute_day_candidates(p_leave_request_id uuid,p_leave_date date)
returns table(teacher_id uuid,teacher_name text,available boolean,conflict_reason text,workload integer)
language plpgsql stable security definer set search_path='' as $fn$
declare v_row public.substitute_lessons; v_start time; v_end time;
begin
 select * into v_row from public.substitute_lessons
 where leave_request_id=p_leave_request_id and leave_date=p_leave_date and status<>'cancelled' limit 1;
 if v_row.id is null or not private.can_manage_substitute_lesson(v_row.id) then
  raise exception 'Not authorized to choose a whole-day substitute' using errcode='42501';
 end if;
 select min(s.start_time),max(s.end_time) into v_start,v_end
 from private.substitute_day_slots(p_leave_request_id,p_leave_date) s;
 if v_start is null then raise exception 'No published periods for this date'; end if;
 return query
 select p.id,coalesce(p.full_name,p.email,'ครูผู้สอน')::text,
  (conf.reason is null) as available,conf.reason,
  (select count(*)::integer from public.timetable_entries te
    join public.timetable_profiles tp on tp.id=te.timetable_id and tp.status='published'
    join public.school_classes c on c.id=tp.class_id
    join public.teaching_assignments ta on ta.id=te.assignment_id and ta.teacher_id=p.id and ta.is_active=true
    join public.timetable_periods per on per.id=te.period_id and not per.is_break
    where c.academic_year=v_row.academic_year::text and c.semester=v_row.semester
      and te.weekday=extract(isodow from p_leave_date)::smallint)
 from public.profiles p
 cross join lateral (
 select case
  when p.id=v_row.absent_teacher_id then 'ครูผู้ลาไม่สามารถสอนแทนตนเอง'
  when exists(select 1 from public.leave_requests lr where lr.requester_id=p.id
    and lr.status in ('pending_personnel','pending_director','approved')
    and p_leave_date between lr.start_date and lr.end_date) then 'ครูมีคำขอลาในวันเดียวกัน'
  when exists(
    select 1 from public.timetable_entries te
    join public.timetable_profiles tp on tp.id=te.timetable_id and tp.status='published'
    join public.school_classes c on c.id=tp.class_id
    join public.teaching_assignments ta on ta.id=te.assignment_id and ta.teacher_id=p.id and ta.is_active=true
    join public.timetable_periods per on per.id=te.period_id and not per.is_break
    where c.academic_year=v_row.academic_year::text and c.semester=v_row.semester
      and te.weekday=extract(isodow from p_leave_date)::smallint
      and per.start_time<v_end and per.end_time>v_start
  ) then 'มีคาบสอนประจำชนกับช่วงเวลาทั้งวัน'
  when exists(select 1 from public.substitute_lessons sl where sl.substitute_teacher_id=p.id and sl.status='assigned'
    and sl.leave_date=p_leave_date and not (sl.leave_request_id=p_leave_request_id)
    and sl.start_time<v_end and sl.end_time>v_start) then 'มีงานสอนแทนอื่นชนกับช่วงเวลาทั้งวัน'
  when exists(select 1 from public.substitute_day_assignments d
    where d.substitute_teacher_id=p.id and d.leave_date=p_leave_date and d.status<>'cancelled'
    and d.leave_request_id<>p_leave_request_id) then 'ได้รับมอบหมายทั้งวันให้ใบลาอื่นแล้ว'
  else null::text end as reason
 ) conf
 where p.account_status='active' and p.deleted_at is null and p.role in('teacher','department_head')
 order by (conf.reason is null) desc,coalesce(p.full_name,p.email);
end;
$fn$;

create or replace function public.assign_substitute_day_signed(
 p_leave_request_id uuid,p_leave_date date,p_teacher_id uuid,p_method text,p_signature_id uuid default null,p_note text default null
) returns public.substitute_day_assignments
language plpgsql security definer set search_path='' as $fn$
declare v_lesson public.substitute_lessons; v_leave public.leave_requests; v_actor public.profiles;
 v_teacher public.profiles; v_old public.substitute_day_assignments; v_row public.substitute_day_assignments;
 v_conflict text; v_period_count integer;
begin
 perform pg_advisory_xact_lock(hashtextextended('substitute-leave:'||p_leave_request_id::text||':'||p_leave_date::text,0));
 perform pg_advisory_xact_lock(hashtextextended('substitute-teacher:'||p_teacher_id::text||':'||p_leave_date::text,0));
 select * into v_leave from public.leave_requests where id=p_leave_request_id for update;
 if v_leave.id is null or p_leave_date not between v_leave.start_date and v_leave.end_date
   or v_leave.status not in ('pending_personnel','pending_director','approved')
 then raise exception 'Leave request is not active on this date'; end if;
 select * into v_lesson from public.substitute_lessons
 where leave_request_id=p_leave_request_id and leave_date=p_leave_date and status<>'cancelled' limit 1 for update;
 if v_lesson.id is null or not private.can_manage_substitute_lesson(v_lesson.id) then
  raise exception 'Not authorized to assign this day' using errcode='42501'; end if;
 select * into v_actor from public.profiles where id=auth.uid() and account_status='active' and deleted_at is null;
 select * into v_teacher from public.profiles where id=p_teacher_id and account_status='active' and deleted_at is null and role in('teacher','department_head');
 if v_actor.id is null or v_teacher.id is null then raise exception 'Teacher account is unavailable'; end if;
 select conflict_reason into v_conflict from public.get_substitute_day_candidates(p_leave_request_id,p_leave_date)
 where teacher_id=p_teacher_id;
 if v_conflict is not null then raise exception 'Whole-day conflict: %',v_conflict; end if;
 select count(*) into v_period_count from private.substitute_day_slots(p_leave_request_id,p_leave_date);
 if v_period_count=0 then raise exception 'No published periods configured for this date'; end if;
 -- Existing regular periods cannot be owned by another substitute without a formal reassignment.
 if exists(select 1 from public.substitute_lessons sl
    where sl.leave_request_id=p_leave_request_id and sl.leave_date=p_leave_date and sl.status='assigned'
    and sl.substitute_teacher_id<>p_teacher_id
    and (not exists(select 1 from public.substitute_day_assignments d
      where d.leave_request_id=p_leave_request_id and d.leave_date=p_leave_date and d.status<>'cancelled')))
 then raise exception 'Existing per-period assignments must be cleared before switching to whole-day mode'; end if;
 -- Reuse the central action-signature verifier, once for the entire batch.
 perform public.record_bnk_action_signature('substitute_teaching',v_lesson.id,'assign',p_method,p_signature_id);
 select * into v_old from public.substitute_day_assignments where leave_request_id=p_leave_request_id and leave_date=p_leave_date for update;
 if v_old.id is not null and v_old.status<>'cancelled' and v_old.substitute_teacher_id=p_teacher_id then
  return v_old; -- idempotent: no extra notices or history
 end if;
 insert into public.substitute_day_assignments(
   leave_request_id,leave_date,academic_year,semester,absent_teacher_id,substitute_teacher_id,
   substitute_teacher_name,assigned_by,assigned_by_name,assigned_at,status,note
 ) values(p_leave_request_id,p_leave_date,v_leave.academic_year,v_leave.semester,v_leave.requester_id,p_teacher_id,
   coalesce(v_teacher.full_name,v_teacher.email,'ครูผู้สอน'),auth.uid(),coalesce(v_actor.full_name,v_actor.email,'ผู้จัดสอนแทน'),
   now(),'assigned',nullif(btrim(coalesce(p_note,'')),''))
 on conflict(leave_request_id,leave_date) do update set
  substitute_teacher_id=excluded.substitute_teacher_id,
  substitute_teacher_name=excluded.substitute_teacher_name,assigned_by=excluded.assigned_by,
  assigned_by_name=excluded.assigned_by_name,assigned_at=now(),status='assigned',
  accepted_by=null,accepted_at=null,signature_method=null,signature_id=null,signed_at=null,
  note=excluded.note,updated_at=now()
 returning * into v_row;
 delete from public.substitute_day_periods where day_assignment_id=v_row.id;
 insert into public.substitute_day_periods(day_assignment_id,period_no,start_time,end_time,class_label,subject_name,status)
 select v_row.id,s.period_no,s.start_time,s.end_time,s.class_label,s.subject_name,'assigned'
 from private.substitute_day_slots(p_leave_request_id,p_leave_date) s;
 -- The legacy per-period RPCs are fenced off while an all-day batch is active.
 perform set_config('bnk.substitute_day_batch',v_row.id::text,true);
 -- Actual subject periods retain their real timetable metadata. No fake subject is created.
 update public.substitute_lessons sl set
  substitute_teacher_id=p_teacher_id,substitute_teacher_name=v_row.substitute_teacher_name,
  assigned_by=auth.uid(),assigned_by_name=v_row.assigned_by_name,assigned_at=now(),
  status='assigned',note='จัดสอนแทนทั้งวัน',updated_at=now()
 where sl.leave_request_id=p_leave_request_id and sl.leave_date=p_leave_date and sl.status<>'cancelled';
 delete from public.school_document_signatures sig where sig.document_kind='substitute' and sig.document_id=p_leave_request_id
  and sig.document_date=p_leave_date and
    (sig.slot_code='substitute_day:'||v_row.id::text
      or sig.slot_code in(select 'substitute:'||sl.id::text from public.substitute_lessons sl
         where sl.leave_request_id=p_leave_request_id and sl.leave_date=p_leave_date));
 insert into public.substitute_day_audit(day_assignment_id,actor_id,action,previous_teacher_id,new_teacher_id,note)
 values(v_row.id,auth.uid(),case when v_old.id is null or v_old.status='cancelled' then 'assign' else 'reassign' end,
   v_old.substitute_teacher_id,p_teacher_id,p_note);
 if v_old.id is not null and v_old.status<>'cancelled' and v_old.substitute_teacher_id<>p_teacher_id then
  insert into public.notifications(recipient_id,type,title,message,entity_type,entity_id,action_url)
  values(v_old.substitute_teacher_id,'substitute_reassigned','เปลี่ยนครูสอนแทนทั้งวัน',
  'งานสอนแทนทั้งวันวันที่ '||to_char(p_leave_date,'DD/MM/YYYY')||' ถูกมอบหมายให้ครูท่านอื่น',
  'substitute_batch',p_leave_request_id,'/academic/substitute-teaching');
 end if;
 insert into public.notifications(recipient_id,type,title,message,entity_type,entity_id,action_url)
 values(p_teacher_id,'substitute_assigned','ได้รับมอบหมายสอนแทนทั้งวัน',
 'วันที่ '||to_char(p_leave_date,'DD/MM/YYYY')||' ครบ '||v_period_count::text||' คาบ แทน '||v_leave.requester_name,
 'substitute_batch',p_leave_request_id,'/academic/substitute-teaching');
 return v_row;
end;
$fn$;

create or replace function public.confirm_substitute_day_signed(
 p_day_assignment_id uuid,p_method text,p_signature uuid default null
) returns public.substitute_day_assignments
language plpgsql security definer set search_path='' as $fn$
declare v public.substitute_day_assignments; v_sig public.signatures; v_lesson public.substitute_lessons;
begin
 select * into v from public.substitute_day_assignments where id=p_day_assignment_id for update;
 if v.id is null or not private.is_active_user() or v.substitute_teacher_id<>auth.uid() or v.status='cancelled'
 then raise exception 'Only the assigned teacher can accept the whole-day duty' using errcode='42501'; end if;
 if v.status='accepted' then return v; end if;
 if p_method not in ('paper','stored','drawn','upload') then raise exception 'Invalid signature method'; end if;
 if p_method='paper' then
  if p_signature is not null then raise exception 'Paper signing cannot include an image'; end if;
 else
  select * into v_sig from public.signatures where id=p_signature and user_id=auth.uid() and bucket_id='signatures';
  if v_sig.id is null or v_sig.storage_path is null
    or not exists(select 1 from storage.objects o where o.bucket_id=v_sig.bucket_id and o.name=v_sig.storage_path)
  then raise exception 'Signature does not belong to the assigned teacher' using errcode='42501'; end if;
  if p_method in ('drawn','upload') and v_sig.source<>p_method then raise exception 'Signature source mismatch'; end if;
 end if;
 update public.substitute_day_assignments set
  status='accepted',accepted_by=auth.uid(),accepted_at=now(),signature_method=p_method,
  signature_id=case when p_method='paper' then null else p_signature end,
  signed_at=case when p_method='paper' then null else now() end,updated_at=now()
 where id=v.id returning * into v;
 update public.substitute_day_periods set status='accepted' where day_assignment_id=v.id;
 insert into public.school_document_signatures(
  document_kind,document_id,document_date,slot_code,signer_user_id,method,signature_id,signed_at,accepted_at,automatic
 ) values('substitute',v.leave_request_id,v.leave_date,'substitute_day:'||v.id::text,auth.uid(),
  p_method,v.signature_id,v.signed_at,v.accepted_at,false)
 on conflict(document_kind,document_id,document_date,slot_code)
 do update set signer_user_id=excluded.signer_user_id,method=excluded.method,signature_id=excluded.signature_id,
  signed_at=excluded.signed_at,accepted_at=excluded.accepted_at,automatic=false,updated_at=now();
 -- Legacy subject-period PDFs see the same one-time acceptance and signature, no second confirmation.
 insert into public.school_document_signatures(
  document_kind,document_id,document_date,slot_code,signer_user_id,method,signature_id,signed_at,accepted_at,automatic
 )
 select 'substitute',v.leave_request_id,v.leave_date,'substitute:'||sl.id::text,
  auth.uid(),p_method,v.signature_id,v.signed_at,v.accepted_at,false
 from public.substitute_lessons sl
 where sl.leave_request_id=v.leave_request_id and sl.leave_date=v.leave_date
  and sl.status='assigned' and sl.substitute_teacher_id=auth.uid()
 on conflict(document_kind,document_id,document_date,slot_code)
 do update set signer_user_id=excluded.signer_user_id,method=excluded.method,signature_id=excluded.signature_id,
  signed_at=excluded.signed_at,accepted_at=excluded.accepted_at,automatic=false,updated_at=now();
 insert into public.substitute_day_audit(day_assignment_id,actor_id,action,previous_teacher_id,new_teacher_id)
 values(v.id,auth.uid(),'accept',v.substitute_teacher_id,v.substitute_teacher_id);
 insert into public.notifications(recipient_id,type,title,message,entity_type,entity_id,action_url)
 values(v.absent_teacher_id,'substitute_accepted','ครูสอนแทนทั้งวันตอบรับแล้ว',
  'วันที่ '||to_char(v.leave_date,'DD/MM/YYYY')||' ครู '||v.substitute_teacher_name||' ตอบรับการสอนแทนทั้งวันแล้ว',
  'substitute_batch',v.leave_request_id,'/academic/substitute-teaching');
 return v;
end;
$fn$;

create or replace function public.cancel_substitute_day(p_day_assignment_id uuid,p_note text default null)
returns public.substitute_day_assignments
language plpgsql security definer set search_path='' as $fn$
declare v public.substitute_day_assignments; v_lesson uuid;
begin
 select * into v from public.substitute_day_assignments where id=p_day_assignment_id for update;
 if v.id is null then raise exception 'Day assignment not found'; end if;
 select id into v_lesson from public.substitute_lessons where leave_request_id=v.leave_request_id
  and leave_date=v.leave_date and status<>'cancelled' limit 1;
 if v_lesson is null or not private.can_manage_substitute_lesson(v_lesson) then
  raise exception 'Not permitted to cancel this day assignment' using errcode='42501'; end if;
 if v.status='cancelled' then return v; end if;
 perform set_config('bnk.substitute_day_batch',v.id::text,true);
 update public.substitute_day_periods set status='cancelled' where day_assignment_id=v.id;
 update public.substitute_lessons set status='unassigned',substitute_teacher_id=null,substitute_teacher_name=null,
  assigned_by=null,assigned_by_name=null,assigned_at=null,note=p_note,updated_at=now()
 where leave_request_id=v.leave_request_id and leave_date=v.leave_date and status='assigned'
 and substitute_teacher_id=v.substitute_teacher_id;
 delete from public.school_document_signatures sig where sig.document_kind='substitute' and sig.document_id=v.leave_request_id
  and sig.document_date=v.leave_date and (sig.slot_code='substitute_day:'||v.id::text or
    sig.slot_code in(select 'substitute:'||sl.id::text from public.substitute_lessons sl
      where sl.leave_request_id=v.leave_request_id and sl.leave_date=v.leave_date));
 update public.substitute_day_assignments set status='cancelled',accepted_by=null,accepted_at=null,
  signature_method=null,signature_id=null,signed_at=null,updated_at=now() where id=v.id returning * into v;
 insert into public.substitute_day_audit(day_assignment_id,actor_id,action,previous_teacher_id,note)
 values(v.id,auth.uid(),'cancel',v.substitute_teacher_id,p_note);
 insert into public.notifications(recipient_id,type,title,message,entity_type,entity_id,action_url)
 values(v.substitute_teacher_id,'substitute_unassigned','ยกเลิกมอบหมายสอนแทนทั้งวัน',
  'วันที่ '||to_char(v.leave_date,'DD/MM/YYYY')||' ยกเลิกการมอบหมายสอนแทนทั้งวันแล้ว',
  'substitute_batch',v.leave_request_id,'/academic/substitute-teaching');
 return v;
end;
$fn$;

-- Do not let the legacy per-period RPC change a period while a full-day batch owns it.
create or replace function private.guard_substitute_day_lesson_update()
returns trigger language plpgsql security definer set search_path='' as $fn$
declare v_day uuid;
begin
 if new.substitute_teacher_id is not distinct from old.substitute_teacher_id
   and new.status is not distinct from old.status
   and new.assigned_by is not distinct from old.assigned_by then
  return new;
 end if;
 select d.id into v_day from public.substitute_day_assignments d
 where d.leave_request_id=old.leave_request_id and d.leave_date=old.leave_date
   and d.status<>'cancelled' limit 1;
 if v_day is not null and current_setting('bnk.substitute_day_batch',true) is distinct from v_day::text then
   raise exception 'This date is managed by a whole-day substitute batch. Cancel that batch first.';
 end if;
 return new;
end;
$fn$;
drop trigger if exists substitute_day_lesson_guard on public.substitute_lessons;
create trigger substitute_day_lesson_guard before update on public.substitute_lessons
for each row execute function private.guard_substitute_day_lesson_update();
revoke all on function private.guard_substitute_day_lesson_update() from public,anon,authenticated;

revoke all on function private.substitute_day_slots(uuid,date) from public,anon,authenticated;
revoke all on function public.preview_substitute_day(uuid,date) from public,anon;
revoke all on function public.get_substitute_day_candidates(uuid,date) from public,anon;
revoke all on function public.assign_substitute_day_signed(uuid,date,uuid,text,uuid,text) from public,anon;
revoke all on function public.confirm_substitute_day_signed(uuid,text,uuid) from public,anon;
revoke all on function public.cancel_substitute_day(uuid,text) from public,anon;
grant execute on function public.preview_substitute_day(uuid,date) to authenticated;
grant execute on function public.get_substitute_day_candidates(uuid,date) to authenticated;
grant execute on function public.assign_substitute_day_signed(uuid,date,uuid,text,uuid,text) to authenticated;
grant execute on function public.confirm_substitute_day_signed(uuid,text,uuid) to authenticated;
grant execute on function public.cancel_substitute_day(uuid,text) to authenticated;

