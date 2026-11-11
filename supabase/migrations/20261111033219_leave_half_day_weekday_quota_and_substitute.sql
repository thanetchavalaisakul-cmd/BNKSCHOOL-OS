-- Full-day / half-day leave and weekday-only quota calculation.
-- Existing leave_days values are intentionally preserved; existing records default to full_day.
ALTER TABLE public.leave_requests ADD COLUMN IF NOT EXISTS leave_session text NOT NULL DEFAULT 'full_day';
ALTER TABLE public.leave_requests ALTER COLUMN leave_session SET DEFAULT 'full_day', ALTER COLUMN leave_session SET NOT NULL;
DO $body$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.leave_requests'::regclass AND conname='leave_requests_leave_session_check') THEN
  ALTER TABLE public.leave_requests ADD CONSTRAINT leave_requests_leave_session_check CHECK (leave_session IN ('full_day','morning','afternoon'));
 END IF;
END $body$;

ALTER TABLE public.preschool_group_covers ADD COLUMN IF NOT EXISTS leave_session text NOT NULL DEFAULT 'full_day';
ALTER TABLE public.preschool_group_covers ALTER COLUMN leave_session SET DEFAULT 'full_day', ALTER COLUMN leave_session SET NOT NULL;
DO $body$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.preschool_group_covers'::regclass AND conname='preschool_group_covers_leave_session_check') THEN
  ALTER TABLE public.preschool_group_covers ADD CONSTRAINT preschool_group_covers_leave_session_check CHECK (leave_session IN ('full_day','morning','afternoon'));
 END IF;
END $body$;

CREATE OR REPLACE FUNCTION private.leave_working_day_total(p_start date,p_end date,p_session text)
RETURNS numeric LANGUAGE sql IMMUTABLE SET search_path TO ''
AS $function$
 SELECT coalesce(count(*)::numeric,0) * CASE WHEN p_session IN ('morning','afternoon') THEN 0.5 ELSE 1.0 END
 FROM generate_series(p_start::timestamp,p_end::timestamp,interval '1 day') AS days(day_at)
 WHERE extract(isodow FROM day_at) BETWEEN 1 AND 5;
$function$;
REVOKE ALL ON FUNCTION private.leave_working_day_total(date,date,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION private.leave_working_day_total(date,date,text) TO authenticated,service_role;

CREATE OR REPLACE FUNCTION private.apply_leave_working_day_total()
RETURNS trigger LANGUAGE plpgsql SET search_path TO ''
AS $function$
BEGIN
 NEW.leave_session := coalesce(nullif(btrim(NEW.leave_session),''),'full_day');
 IF NEW.leave_session NOT IN ('full_day','morning','afternoon') THEN
  RAISE EXCEPTION 'Invalid leave session. Choose full_day, morning, or afternoon';
 END IF;
 NEW.leave_days := private.leave_working_day_total(NEW.start_date,NEW.end_date,NEW.leave_session);
 IF NEW.leave_days <= 0 THEN
  RAISE EXCEPTION 'Leave period must include at least one working day (Monday-Friday)';
 END IF;
 RETURN NEW;
END;
$function$;
DROP TRIGGER IF EXISTS leave_requests_zz_apply_working_day_total ON public.leave_requests;
CREATE TRIGGER leave_requests_zz_apply_working_day_total
BEFORE INSERT OR UPDATE OF start_date,end_date,leave_session ON public.leave_requests
FOR EACH ROW EXECUTE FUNCTION private.apply_leave_working_day_total();

CREATE OR REPLACE FUNCTION private.refresh_preschool_coverage_for_leave(p_leave_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_leave public.leave_requests%rowtype;
  v_room record;
  v_date date;
  v_cover uuid;
  v_count integer := 0;
  v_active boolean;
begin
  select * into v_leave from public.leave_requests where id=p_leave_id;
  if not found then return 0; end if;
  v_active := v_leave.status in ('pending_personnel','pending_director','approved')
    and v_leave.affects_teaching_schedule;

  -- Keep old documents as cancelled records instead of silently deleting signed history.
  update public.preschool_group_covers
  set status='cancelled',updated_at=now()
  where leave_request_id=p_leave_id;
  if v_active then
    for v_room in
      select c.id,c.level_name,c.room_name
      from public.homeroom_teachers h join public.school_classes c on c.id=h.class_id
      where h.teacher_id=v_leave.requester_id and c.stage_code='early_childhood' and c.is_active
        and c.academic_year=v_leave.academic_year::text and c.semester=v_leave.semester
    loop
      for v_date in select day_at::date from generate_series(v_leave.start_date::timestamp,v_leave.end_date::timestamp,interval '1 day') as days(day_at)
                    where extract(isodow from day_at) between 1 and 5 loop
        insert into public.preschool_group_covers
          (leave_request_id,leave_date,class_id,academic_year,semester,leave_session,absent_teacher_id,absent_teacher_name,class_label,status)
        values (v_leave.id,v_date,v_room.id,v_leave.academic_year,v_leave.semester,v_leave.leave_session,v_leave.requester_id,
                v_leave.requester_name,v_room.level_name||'/'||v_room.room_name,'active')
        on conflict (leave_request_id,leave_date,class_id)
        do update set status='active',leave_session=excluded.leave_session,absent_teacher_name=excluded.absent_teacher_name,
          class_label=excluded.class_label,updated_at=now()
        returning id into v_cover;

        -- Preserve historic acknowledgements, but hide staff removed from the current roster.
        update public.preschool_group_cover_members
        set is_current_staff=false,updated_at=now() where cover_id=v_cover;
        -- Include all active homeroom, subject and explicitly assigned preschool teachers.
        insert into public.preschool_group_cover_members(cover_id,teacher_id,teacher_name,is_available,is_current_staff)
        select v_cover,p.id,coalesce(p.full_name,p.email,'ครูปฐมวัย'),
               not exists(select 1 from public.leave_requests lr where lr.requester_id=p.id
                 and lr.status in ('pending_personnel','pending_director','approved')
                 and lr.start_date<=v_date and lr.end_date>=v_date
                 and (lr.leave_session='full_day' or v_leave.leave_session='full_day' or lr.leave_session=v_leave.leave_session)),true
        from public.profiles p
        where p.account_status='active' and p.deleted_at is null and p.role in ('teacher','department_head')
          and p.id<>v_leave.requester_id
          and (
            exists(select 1 from public.homeroom_teachers h join public.school_classes c on c.id=h.class_id
              where h.teacher_id=p.id and c.stage_code='early_childhood' and c.is_active
                and c.academic_year=v_leave.academic_year::text and c.semester=v_leave.semester)
            or exists(select 1 from public.teaching_assignments a join public.school_classes c on c.id=a.class_id
              where a.teacher_id=p.id and a.is_active and c.stage_code='early_childhood' and c.is_active
                and c.academic_year=v_leave.academic_year::text and c.semester=v_leave.semester)
            or exists(select 1 from public.stage_heads sh where sh.teacher_id=p.id and sh.stage_code='early_childhood'
              and sh.academic_year=v_leave.academic_year::text)
            or exists(select 1 from public.preschool_staff_roster roster where roster.teacher_id=p.id
              and roster.academic_year=v_leave.academic_year and roster.semester=v_leave.semester)
          )
        on conflict(cover_id,teacher_id) do update set
          teacher_name=excluded.teacher_name,is_available=excluded.is_available,
          is_current_staff=true,updated_at=now();
        v_count := v_count + 1;
      end loop;
    end loop;
  end if;

  -- Re-evaluate availability for this teacher across *other* preschool cover sheets on matching dates.
  update public.preschool_group_cover_members m
  set is_available=calc.available,updated_at=now()
  from (
    select member.id as member_id,not exists(select 1 from public.leave_requests lr
      where lr.requester_id=member.teacher_id
        and lr.status in ('pending_personnel','pending_director','approved')
        and g.leave_date between lr.start_date and lr.end_date
        and (lr.leave_session='full_day' or g.leave_session='full_day' or lr.leave_session=g.leave_session)) as available
    from public.preschool_group_cover_members member
    join public.preschool_group_covers g on g.id=member.cover_id
    where member.teacher_id=v_leave.requester_id and g.status='active'
  ) calc
  where m.id=calc.member_id;
  return v_count;
end $function$
;
CREATE OR REPLACE FUNCTION private.sync_substitute_lessons_for_leave(p_leave_request_id uuid, p_notify boolean DEFAULT true)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_leave public.leave_requests;
  v_inserted integer := 0;
begin
  select * into v_leave
  from public.leave_requests
  where id=p_leave_request_id
    and status in ('pending_personnel','pending_director','approved')
    and affects_teaching_schedule=true;

  if v_leave.id is null then
    return 0;
  end if;

  insert into public.substitute_lessons(
    leave_request_id,leave_request_no,leave_date,academic_year,semester,stage_code,
    class_id,class_label,subject_id,subject_name,timetable_entry_id,period_no,start_time,end_time,
    absent_teacher_id,absent_teacher_name,status
  )
  select
    v_leave.id,
    v_leave.request_no,
    gs.leave_date,
    v_leave.academic_year,
    v_leave.semester,
    c.stage_code,
    c.id,
    c.level_name || case when nullif(btrim(c.room_name),'') is not null then '/'||c.room_name else '' end,
    s.id,
    s.subject_name,
    te.id,
    per.period_no,
    per.start_time,
    per.end_time,
    v_leave.requester_id,
    v_leave.requester_name,
    'unassigned'
  from (
    select d::date as leave_date
    from generate_series(v_leave.start_date::timestamp, v_leave.end_date::timestamp, interval '1 day') d
  ) gs
  join public.timetable_entries te
    on te.weekday=extract(isodow from gs.leave_date)::smallint
  join public.timetable_profiles tp
    on tp.id=te.timetable_id
   and tp.status='published'
   and te.weekday=any(tp.weekdays)
  join public.school_classes c
    on c.id=tp.class_id
   and c.is_active=true
   and c.academic_year=v_leave.academic_year::text
   and c.semester=v_leave.semester
  join public.teaching_assignments ta
    on ta.id=te.assignment_id
   and ta.teacher_id=v_leave.requester_id
   and ta.is_active=true
  join public.academic_subjects s
    on s.id=ta.subject_id
  join public.timetable_periods per
    on per.id=te.period_id
   and per.is_break=false
   and (
     v_leave.leave_session='full_day'
     or (v_leave.leave_session='morning' and per.start_time < time '12:00')
     or (v_leave.leave_session='afternoon' and per.start_time >= time '12:00')
   )
  on conflict (leave_request_id,leave_date,timetable_entry_id) do nothing;

  get diagnostics v_inserted = row_count;

  if p_notify and v_inserted > 0 then
    insert into public.notifications(recipient_id,type,title,message,entity_type,entity_id,action_url)
    values(
      v_leave.requester_id,
      'substitute_arrangement_required',
      'กรุณาจัดครูสอนแทน',
      'คำขอลา #'||v_leave.request_no::text||' มี '||
        (select count(*)::text from public.substitute_lessons sl where sl.leave_request_id=v_leave.id and sl.status<>'cancelled')||
        ' คาบที่ต้องจัดครูสอนแทน สามารถจัดได้ทันทีโดยไม่ต้องรออนุมัติใบลา',
      'substitute_batch',v_leave.id,'/academic/substitute-teaching'
    );

    insert into public.notifications(recipient_id,type,title,message,entity_type,entity_id,action_url)
    select recipients.id,
      'substitute_pending',
      'มีคาบสอนแทนรอจัด',
      v_leave.requester_name || ' ยื่นใบลาและมีคาบที่ต้องจัดครูสอนแทน',
      'substitute_batch',v_leave.id,'/academic/substitute-teaching'
    from (
      select p.id
      from public.profiles p
      join public.departments d on d.id=p.department_id and d.code='academic'
      where p.role='department_head' and p.account_status='active' and p.deleted_at is null
      union
      select p.id
      from public.stage_heads sh
      join public.profiles p on p.id=sh.teacher_id
      where sh.academic_year=v_leave.academic_year::text
        and p.account_status='active' and p.deleted_at is null
        and exists (
          select 1 from public.substitute_lessons sl
          where sl.leave_request_id=v_leave.id and sl.stage_code=sh.stage_code and sl.status<>'cancelled'
        )
    ) recipients
    where recipients.id<>v_leave.requester_id;
  end if;

  return v_inserted;
end;
$function$
;
CREATE OR REPLACE FUNCTION private.substitute_day_slots(p_leave_request_id uuid, p_leave_date date)
 RETURNS TABLE(period_no integer, start_time time without time zone, end_time time without time zone, class_label text, subject_name text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
   and (
     lr.leave_session='full_day'
     or (lr.leave_session='morning' and per.start_time < time '12:00')
     or (lr.leave_session='afternoon' and per.start_time >= time '12:00')
   )
   and extract(isodow from p_leave_date)::smallint=any(tp.weekdays)
  order by per.period_no,
    case when exists(select 1 from public.substitute_lessons sl
      join public.timetable_entries te on te.id=sl.timetable_entry_id
      where sl.leave_request_id=p_leave_request_id and sl.leave_date=p_leave_date
      and te.timetable_id=tp.id) then 0 else 1 end,
    per.sort_order
 ) z
 order by z.period_no;
$function$
;

DROP TRIGGER IF EXISTS preschool_leave_coverage_sync ON public.leave_requests;
CREATE TRIGGER preschool_leave_coverage_sync
AFTER INSERT OR UPDATE OF status,start_date,end_date,affects_teaching_schedule,academic_year,semester,leave_session
ON public.leave_requests FOR EACH ROW EXECUTE FUNCTION private.preschool_leave_coverage_trigger();
