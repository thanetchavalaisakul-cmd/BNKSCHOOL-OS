
-- BNK School OS | Safe additive shared/co-teaching timetable support (2026-10-28)
create table if not exists public.timetable_joint_activities (
  id uuid primary key default gen_random_uuid(),
  owner_timetable_id uuid not null references public.timetable_profiles(id) on delete cascade,
  academic_year text not null,
  semester integer not null check (semester between 1 and 3),
  weekday smallint not null check (weekday between 1 and 7),
  start_time time not null,
  end_time time not null,
  title text not null check (char_length(btrim(title)) between 1 and 160),
  kind text not null check (kind in ('homeroom','scouts','club','development','co_teaching','other')),
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  check (start_time < end_time)
);
create table if not exists public.timetable_joint_activity_teachers (
  activity_id uuid not null references public.timetable_joint_activities(id) on delete cascade,
  teacher_id uuid not null references public.profiles(id),
  added_at timestamptz not null default now(),
  primary key (activity_id,teacher_id)
);
alter table public.timetable_entries add column if not exists joint_activity_id uuid
  references public.timetable_joint_activities(id) on delete set null;
create index if not exists timetable_entries_joint_activity_idx on public.timetable_entries(joint_activity_id)
 where joint_activity_id is not null;
create index if not exists timetable_joint_teacher_teacher_idx on public.timetable_joint_activity_teachers(teacher_id);

alter table public.timetable_joint_activities enable row level security;
alter table public.timetable_joint_activity_teachers enable row level security;
drop policy if exists timetable_joint_activities_read on public.timetable_joint_activities;
create policy timetable_joint_activities_read on public.timetable_joint_activities
 for select to authenticated using (
   exists (select 1 from public.timetable_entries e
     where e.joint_activity_id=id and private.can_view_timetable_profile(e.timetable_id))
 );
drop policy if exists timetable_joint_teachers_read on public.timetable_joint_activity_teachers;
create policy timetable_joint_teachers_read on public.timetable_joint_activity_teachers
 for select to authenticated using (
   exists (select 1 from public.timetable_joint_activities g where g.id=activity_id)
 );
revoke all on public.timetable_joint_activities from anon, authenticated;
revoke all on public.timetable_joint_activity_teachers from anon, authenticated;
grant select on public.timetable_joint_activities, public.timetable_joint_activity_teachers to authenticated;

-- Check all forms of occupancy: direct assignment or an extra co-teacher on another activity.
create or replace function private.timetable_joint_teacher_busy(
 p_teacher uuid,p_year text,p_semester integer,p_day smallint,p_start time,p_end time,
 p_activity uuid default null,p_ignore_entry uuid default null
) returns boolean language sql stable security definer set search_path='' as $fn$
 select exists (
  select 1
    from public.timetable_entries e
    join public.timetable_profiles tp on tp.id=e.timetable_id
    join public.school_classes c on c.id=tp.class_id
    join public.timetable_periods per on per.id=e.period_id
    join public.teaching_assignments ta on ta.id=e.assignment_id
   where c.academic_year=p_year and c.semester=p_semester and e.weekday=p_day
     and per.start_time < p_end and per.end_time > p_start
     and (p_ignore_entry is null or e.id <> p_ignore_entry)
     and (p_activity is null or e.joint_activity_id is distinct from p_activity)
     and (ta.teacher_id=p_teacher or exists(
       select 1 from public.timetable_joint_activity_teachers jt
       where jt.activity_id=e.joint_activity_id and jt.teacher_id=p_teacher
     ))
 );
$fn$;

-- Tighten the existing validator, preserving its original access, quota and clash checks.
do $patch$
declare v_old text; v_new text; v_needle text; v_guard text;
begin
 v_old:=pg_get_functiondef('private.validate_timetable_entry()'::regprocedure);
 v_needle:='  if not (new.weekday = any(v_weekdays)) then raise exception ''This weekday is not enabled for the selected class''; end if;';
 if position(v_needle in v_old)=0 then raise exception 'Timetable validator day-check signature changed; aborting safe migration'; end if;
 v_guard:=$guard$
  if new.joint_activity_id is not null then
    if not exists(
      select 1 from public.timetable_joint_activities g
      join public.school_classes c on c.id=v_class_id
      where g.id=new.joint_activity_id
        and g.academic_year=c.academic_year and g.semester=c.semester
        and g.weekday=new.weekday and g.start_time=v_start and g.end_time=v_end
    ) then
      raise exception 'คาบเรียนร่วมต้องอยู่ในปี ภาคเรียน วัน และช่วงเวลาเดียวกัน';
    end if;
  end if;
$guard$;
 v_new:=replace(v_old,v_needle,v_needle||E'\n'||v_guard);
 v_needle:='where ta2.teacher_id=v_teacher_id';
 if position(v_needle in v_new)=0 then raise exception 'Timetable teacher clash signature changed; aborting safe migration'; end if;
 v_new:=replace(v_new,v_needle,$replace$
where (ta2.teacher_id=v_teacher_id or exists(
      select 1 from public.timetable_joint_activity_teachers jt
      where jt.activity_id=e.joint_activity_id and jt.teacher_id=v_teacher_id
    ))
    and (new.joint_activity_id is null or e.joint_activity_id is distinct from new.joint_activity_id)
$replace$);
 v_needle:='  new.created_by := coalesce(new.created_by,auth.uid());';
 if position(v_needle in v_new)=0 then raise exception 'Timetable validator audit signature changed; aborting safe migration'; end if;
 v_new:=replace(v_new,v_needle,$extra$
  if new.joint_activity_id is not null and exists (
    select 1 from public.timetable_joint_activity_teachers jt
    join public.school_classes c on c.id=v_class_id
    where jt.activity_id=new.joint_activity_id
      and private.timetable_joint_teacher_busy(
        jt.teacher_id,c.academic_year,c.semester,new.weekday,v_start,v_end,
        new.joint_activity_id,new.id
      )
  ) then raise exception 'คาบชน: ครูผู้สอนร่วมมีภาระสอนอื่นในช่วงเวลานี้'; end if;
$extra$||E'\n'||v_needle);
 execute v_new;
end;
$patch$;

create or replace function private.validate_timetable_joint_teacher() returns trigger
 language plpgsql security definer set search_path='' as $fn$
declare v_group public.timetable_joint_activities%rowtype; v_row record;
begin
 select * into v_group from public.timetable_joint_activities where id=new.activity_id;
 if not found then raise exception 'ไม่พบกลุ่มกิจกรรมร่วม'; end if;
 if not private.can_manage_timetable_profile(v_group.owner_timetable_id) then
  raise exception 'ไม่มีสิทธิ์เพิ่มครูในกิจกรรมร่วม';
 end if;
 if not exists(select 1 from public.timetable_profiles tp
               where tp.id=v_group.owner_timetable_id and tp.status='draft') then
  raise exception 'ตารางต้องเป็นฉบับร่างก่อนแก้ไขครูร่วม';
 end if;
 for v_row in select e.id from public.timetable_entries e where e.joint_activity_id=new.activity_id loop
   if private.timetable_joint_teacher_busy(new.teacher_id,v_group.academic_year,v_group.semester,
           v_group.weekday,v_group.start_time,v_group.end_time,new.activity_id,v_row.id)
   then raise exception 'คาบชน: ครูผู้สอนร่วมมีตารางสอนอื่นในช่วงเดียวกัน'; end if;
 end loop;
 return new;
end;
$fn$;
drop trigger if exists timetable_joint_teacher_validate on public.timetable_joint_activity_teachers;
create trigger timetable_joint_teacher_validate before insert or update on public.timetable_joint_activity_teachers
 for each row execute function private.validate_timetable_joint_teacher();

-- Single atomic operation: attach the chosen lesson to a shared activity, join rooms,
-- and add optional co-teachers. A failure rolls back all rows.
create or replace function public.create_timetable_joint_activity(
 p_source_entry_id uuid,
 p_other_assignment_ids uuid[] default '{}'::uuid[],
 p_extra_teacher_ids uuid[] default '{}'::uuid[],
 p_title text default null,
 p_kind text default 'other'
) returns uuid
language plpgsql security definer set search_path='' as $fn$
declare v_source record; v_target record; v_existing record; v_group_id uuid;
        v_assignment_id uuid; v_teacher_id uuid; v_title text;
begin
 if auth.uid() is null then raise exception 'กรุณาเข้าสู่ระบบก่อน'; end if;
 if p_kind not in ('homeroom','scouts','club','development','co_teaching','other') then
   raise exception 'ประเภทคาบเรียนร่วมไม่ถูกต้อง';
 end if;
 select e.*, tp.status, c.academic_year, c.semester, ta.subject_id, s.subject_name,
        per.start_time,per.end_time
   into v_source from public.timetable_entries e
   join public.timetable_profiles tp on tp.id=e.timetable_id
   join public.school_classes c on c.id=tp.class_id
   join public.teaching_assignments ta on ta.id=e.assignment_id
   join public.academic_subjects s on s.id=ta.subject_id
   join public.timetable_periods per on per.id=e.period_id
  where e.id=p_source_entry_id for update of e;
 if not found then raise exception 'ไม่พบคาบต้นทาง'; end if;
 if v_source.status<>'draft' then raise exception 'ต้องนำตารางกลับเป็นฉบับร่างก่อน'; end if;
 if not private.can_manage_timetable_profile(v_source.timetable_id) then
   raise exception 'ไม่มีสิทธิ์จัดคาบนี้'; end if;
 v_title:=left(coalesce(nullif(btrim(p_title),''),v_source.subject_name),160);
 if v_source.joint_activity_id is not null then
   v_group_id:=v_source.joint_activity_id;
   if not exists(select 1 from public.timetable_joint_activities g
                 where g.id=v_group_id and g.owner_timetable_id=v_source.timetable_id)
      and not exists(select 1 from public.timetable_joint_activities g
                 where g.id=v_group_id and private.can_manage_timetable_profile(g.owner_timetable_id))
   then raise exception 'ไม่มีสิทธิ์แก้ไขกลุ่มกิจกรรมร่วมนี้'; end if;
 else
   insert into public.timetable_joint_activities(
      owner_timetable_id,academic_year,semester,weekday,start_time,end_time,title,kind,created_by
   ) values(v_source.timetable_id,v_source.academic_year,v_source.semester,v_source.weekday,
            v_source.start_time,v_source.end_time,v_title,p_kind,auth.uid())
   returning id into v_group_id;
   update public.timetable_entries set joint_activity_id=v_group_id where id=v_source.id;
 end if;
 for v_assignment_id in select distinct unnest(coalesce(p_other_assignment_ids,'{}'::uuid[])) loop
   select ta.id as assignment_id,ta.class_id,ta.subject_id,tp.id as timetable_id,tp.status,
          c.academic_year,c.semester,per.id as period_id
     into v_target from public.teaching_assignments ta
     join public.school_classes c on c.id=ta.class_id
     join public.timetable_profiles tp on tp.class_id=ta.class_id
     join lateral (
       select id from public.timetable_periods p
        where p.timetable_id=tp.id and p.start_time=v_source.start_time
          and p.end_time=v_source.end_time and p.is_break=false
        order by p.sort_order limit 1
     ) per on true
    where ta.id=v_assignment_id and ta.is_active=true;
   if not found then raise exception 'ห้องปลายทางต้องมีการกำหนดครูและคาบเวลาตรงกับต้นทาง'; end if;
   if v_target.academic_year<>v_source.academic_year or v_target.semester<>v_source.semester then
      raise exception 'กิจกรรมร่วมต้องอยู่ในปีและภาคเรียนเดียวกัน'; end if;
   if v_target.status<>'draft' or not private.can_manage_timetable_profile(v_target.timetable_id) then
      raise exception 'ไม่มีสิทธิ์แก้ไขห้องปลายทาง หรือห้องยังไม่ได้เป็นฉบับร่าง'; end if;
   if v_target.timetable_id=v_source.timetable_id then
      raise exception 'เลือกห้องอื่นเท่านั้น; ครูร่วมในห้องเดียวกันให้เลือกจากรายชื่อครูร่วม'; end if;
   select * into v_existing from public.timetable_entries e
     where e.timetable_id=v_target.timetable_id and e.weekday=v_source.weekday
       and e.period_id=v_target.period_id for update;
   if found then
     if v_existing.assignment_id<>v_assignment_id or
        (v_existing.joint_activity_id is not null and v_existing.joint_activity_id<>v_group_id)
     then raise exception 'ห้องปลายทางมีวิชาอื่นอยู่ในคาบนี้แล้ว'; end if;
     if v_existing.joint_activity_id is null then
       update public.timetable_entries set joint_activity_id=v_group_id where id=v_existing.id;
     end if;
   else
     insert into public.timetable_entries(timetable_id,assignment_id,weekday,period_id,joint_activity_id,created_by)
       values(v_target.timetable_id,v_assignment_id,v_source.weekday,v_target.period_id,v_group_id,auth.uid());
   end if;
 end loop;
 for v_teacher_id in select distinct unnest(coalesce(p_extra_teacher_ids,'{}'::uuid[])) loop
   if not exists(select 1 from public.profiles p where p.id=v_teacher_id
     and p.account_status='active' and p.deleted_at is null
     and p.role in ('teacher','department_head','director','super_admin')) then
      raise exception 'ครูร่วมที่เลือกไม่อยู่ในบัญชีบุคลากรที่ใช้งาน'; end if;
   insert into public.timetable_joint_activity_teachers(activity_id,teacher_id)
     values(v_group_id,v_teacher_id) on conflict do nothing;
 end loop;
 return v_group_id;
end;
$fn$;
revoke all on function public.create_timetable_joint_activity(uuid,uuid[],uuid[],text,text) from public,anon;
grant execute on function public.create_timetable_joint_activity(uuid,uuid[],uuid[],text,text) to authenticated;
