-- Per-day leave sessions for mixed full-day / half-day ranges.
-- Existing requests keep their previous leave_session behavior because the new JSON map defaults to {}.
ALTER TABLE public.leave_requests
  ADD COLUMN IF NOT EXISTS daily_leave_sessions jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.leave_requests
  ALTER COLUMN daily_leave_sessions SET DEFAULT '{}'::jsonb,
  ALTER COLUMN daily_leave_sessions SET NOT NULL;

DO $body$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid='public.leave_requests'::regclass
      AND conname='leave_requests_daily_leave_sessions_object_check'
  ) THEN
    ALTER TABLE public.leave_requests
      ADD CONSTRAINT leave_requests_daily_leave_sessions_object_check
      CHECK (jsonb_typeof(daily_leave_sessions)='object');
  END IF;
END
$body$;

COMMENT ON COLUMN public.leave_requests.daily_leave_sessions IS
  'Per-date leave session map: YYYY-MM-DD -> full_day, morning, or afternoon. Missing dates use leave_session for backward compatibility.';

CREATE OR REPLACE FUNCTION private.leave_session_for_date(
  p_leave_date date,
  p_daily_sessions jsonb,
  p_fallback_session text
)
RETURNS text
LANGUAGE sql
STABLE
SET search_path TO ''
AS $function$
  SELECT CASE
    WHEN jsonb_typeof(coalesce(p_daily_sessions,'{}'::jsonb))='object'
      AND coalesce(p_daily_sessions,'{}'::jsonb) ? to_char(p_leave_date,'YYYY-MM-DD')
    THEN coalesce(p_daily_sessions,'{}'::jsonb)->>to_char(p_leave_date,'YYYY-MM-DD')
    ELSE coalesce(nullif(btrim(p_fallback_session),''),'full_day')
  END;
$function$;

REVOKE ALL ON FUNCTION private.leave_session_for_date(date,jsonb,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION private.leave_session_for_date(date,jsonb,text) TO authenticated,service_role;

CREATE OR REPLACE FUNCTION private.apply_leave_working_day_total()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO ''
AS $function$
DECLARE
  v_entry record;
  v_date date;
  v_session text;
BEGIN
  NEW.weekend_working_dates := ARRAY(
    SELECT DISTINCT selected_date
    FROM unnest(coalesce(NEW.weekend_working_dates,'{}'::date[])) AS selected(selected_date)
    WHERE selected_date IS NOT NULL
    ORDER BY selected_date
  );

  IF EXISTS (
    SELECT 1
    FROM unnest(NEW.weekend_working_dates) AS selected(selected_date)
    WHERE selected_date < NEW.start_date
       OR selected_date > NEW.end_date
       OR extract(isodow FROM selected_date) NOT IN (6,7)
  ) THEN
    RAISE EXCEPTION 'Weekend school-open dates must be Saturdays or Sundays within the leave date range';
  END IF;

  NEW.leave_session := coalesce(nullif(btrim(NEW.leave_session),''),'full_day');
  IF NEW.leave_session NOT IN ('full_day','morning','afternoon') THEN
    RAISE EXCEPTION 'Invalid leave session. Choose full_day, morning, or afternoon';
  END IF;

  IF NEW.daily_leave_sessions IS NULL OR jsonb_typeof(NEW.daily_leave_sessions)<>'object' THEN
    RAISE EXCEPTION 'Daily leave sessions must be a JSON object';
  END IF;

  FOR v_entry IN
    SELECT key,value FROM jsonb_each(NEW.daily_leave_sessions)
  LOOP
    IF v_entry.key !~ '^\d{4}-\d{2}-\d{2}$' THEN
      RAISE EXCEPTION 'Invalid daily leave date key: %',v_entry.key;
    END IF;

    BEGIN
      v_date := v_entry.key::date;
    EXCEPTION WHEN others THEN
      RAISE EXCEPTION 'Invalid daily leave date: %',v_entry.key;
    END;

    IF v_date < NEW.start_date
       OR v_date > NEW.end_date
       OR (
         extract(isodow FROM v_date) NOT BETWEEN 1 AND 5
         AND NOT (v_date=ANY(coalesce(NEW.weekend_working_dates,'{}'::date[])))
       ) THEN
      RAISE EXCEPTION 'Daily leave date % is not a working date within the leave range',v_entry.key;
    END IF;

    IF jsonb_typeof(v_entry.value)<>'string' THEN
      RAISE EXCEPTION 'Daily leave session for % must be a string',v_entry.key;
    END IF;

    v_session := v_entry.value #>> '{}';
    IF v_session NOT IN ('full_day','morning','afternoon') THEN
      RAISE EXCEPTION 'Invalid daily leave session for %',v_entry.key;
    END IF;
  END LOOP;

  SELECT coalesce(sum(
    CASE
      WHEN private.leave_session_for_date(
        day_at::date,NEW.daily_leave_sessions,NEW.leave_session
      ) IN ('morning','afternoon') THEN 0.5::numeric
      ELSE 1.0::numeric
    END
  ),0::numeric)
  INTO NEW.leave_days
  FROM generate_series(
    NEW.start_date::timestamp,
    NEW.end_date::timestamp,
    interval '1 day'
  ) AS days(day_at)
  WHERE extract(isodow FROM day_at) BETWEEN 1 AND 5
     OR day_at::date=ANY(coalesce(NEW.weekend_working_dates,'{}'::date[]));

  IF NEW.leave_days<=0 THEN
    RAISE EXCEPTION 'Leave period must include at least one weekday or selected school-open weekend date';
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS leave_requests_zz_apply_working_day_total ON public.leave_requests;
CREATE TRIGGER leave_requests_zz_apply_working_day_total
BEFORE INSERT OR UPDATE OF
  start_date,end_date,leave_session,weekend_working_dates,daily_leave_sessions
ON public.leave_requests
FOR EACH ROW EXECUTE FUNCTION private.apply_leave_working_day_total();

CREATE OR REPLACE FUNCTION private.refresh_preschool_coverage_for_leave(p_leave_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_leave public.leave_requests%rowtype;
  v_room record;
  v_date date;
  v_day_session text;
  v_cover uuid;
  v_count integer := 0;
  v_active boolean;
BEGIN
  SELECT * INTO v_leave
  FROM public.leave_requests
  WHERE id=p_leave_id;

  IF NOT FOUND THEN
    RETURN 0;
  END IF;

  v_active := v_leave.status IN ('pending_personnel','pending_director','approved')
    AND v_leave.affects_teaching_schedule;

  -- Keep old documents as cancelled records instead of silently deleting signed history.
  UPDATE public.preschool_group_covers
  SET status='cancelled',updated_at=now()
  WHERE leave_request_id=p_leave_id;

  IF v_active THEN
    FOR v_room IN
      SELECT c.id,c.level_name,c.room_name
      FROM public.homeroom_teachers h
      JOIN public.school_classes c ON c.id=h.class_id
      WHERE h.teacher_id=v_leave.requester_id
        AND c.stage_code='early_childhood'
        AND c.is_active
        AND c.academic_year=v_leave.academic_year::text
        AND c.semester=v_leave.semester
    LOOP
      FOR v_date IN
        SELECT day_at::date
        FROM generate_series(
          v_leave.start_date::timestamp,
          v_leave.end_date::timestamp,
          interval '1 day'
        ) AS days(day_at)
        WHERE extract(isodow FROM day_at) BETWEEN 1 AND 5
           OR day_at::date=ANY(coalesce(v_leave.weekend_working_dates,'{}'::date[]))
      LOOP
        v_day_session := private.leave_session_for_date(
          v_date,v_leave.daily_leave_sessions,v_leave.leave_session
        );

        INSERT INTO public.preschool_group_covers(
          leave_request_id,leave_date,class_id,academic_year,semester,
          leave_session,absent_teacher_id,absent_teacher_name,class_label,status
        )
        VALUES(
          v_leave.id,v_date,v_room.id,v_leave.academic_year,v_leave.semester,
          v_day_session,v_leave.requester_id,v_leave.requester_name,
          v_room.level_name||'/'||v_room.room_name,'active'
        )
        ON CONFLICT (leave_request_id,leave_date,class_id)
        DO UPDATE SET
          status='active',
          leave_session=excluded.leave_session,
          absent_teacher_name=excluded.absent_teacher_name,
          class_label=excluded.class_label,
          updated_at=now()
        RETURNING id INTO v_cover;

        -- Preserve historic acknowledgements, but hide staff removed from the current roster.
        UPDATE public.preschool_group_cover_members
        SET is_current_staff=false,updated_at=now()
        WHERE cover_id=v_cover;

        -- Include all active homeroom, subject and explicitly assigned preschool teachers.
        INSERT INTO public.preschool_group_cover_members(
          cover_id,teacher_id,teacher_name,is_available,is_current_staff
        )
        SELECT
          v_cover,
          p.id,
          coalesce(p.full_name,p.email,'ครูปฐมวัย'),
          NOT EXISTS(
            SELECT 1
            FROM public.leave_requests lr
            WHERE lr.requester_id=p.id
              AND lr.status IN ('pending_personnel','pending_director','approved')
              AND lr.start_date<=v_date
              AND lr.end_date>=v_date
              AND (
                extract(isodow FROM v_date) BETWEEN 1 AND 5
                OR v_date=ANY(coalesce(lr.weekend_working_dates,'{}'::date[]))
              )
              AND (
                private.leave_session_for_date(v_date,lr.daily_leave_sessions,lr.leave_session)='full_day'
                OR v_day_session='full_day'
                OR private.leave_session_for_date(v_date,lr.daily_leave_sessions,lr.leave_session)=v_day_session
              )
          ),
          true
        FROM public.profiles p
        WHERE p.account_status='active'
          AND p.deleted_at IS NULL
          AND p.role IN ('teacher','department_head')
          AND p.id<>v_leave.requester_id
          AND (
            EXISTS(
              SELECT 1
              FROM public.homeroom_teachers h
              JOIN public.school_classes c ON c.id=h.class_id
              WHERE h.teacher_id=p.id
                AND c.stage_code='early_childhood'
                AND c.is_active
                AND c.academic_year=v_leave.academic_year::text
                AND c.semester=v_leave.semester
            )
            OR EXISTS(
              SELECT 1
              FROM public.teaching_assignments a
              JOIN public.school_classes c ON c.id=a.class_id
              WHERE a.teacher_id=p.id
                AND a.is_active
                AND c.stage_code='early_childhood'
                AND c.is_active
                AND c.academic_year=v_leave.academic_year::text
                AND c.semester=v_leave.semester
            )
            OR EXISTS(
              SELECT 1
              FROM public.stage_heads sh
              WHERE sh.teacher_id=p.id
                AND sh.stage_code='early_childhood'
                AND sh.academic_year=v_leave.academic_year::text
            )
            OR EXISTS(
              SELECT 1
              FROM public.preschool_staff_roster roster
              WHERE roster.teacher_id=p.id
                AND roster.academic_year=v_leave.academic_year
                AND roster.semester=v_leave.semester
            )
          )
        ON CONFLICT(cover_id,teacher_id)
        DO UPDATE SET
          teacher_name=excluded.teacher_name,
          is_available=excluded.is_available,
          is_current_staff=true,
          updated_at=now();

        v_count := v_count + 1;
      END LOOP;
    END LOOP;
  END IF;

  -- Re-evaluate availability for this teacher across other preschool cover sheets on matching dates.
  UPDATE public.preschool_group_cover_members m
  SET is_available=calc.available,updated_at=now()
  FROM (
    SELECT
      member.id AS member_id,
      NOT EXISTS(
        SELECT 1
        FROM public.leave_requests lr
        WHERE lr.requester_id=member.teacher_id
          AND lr.status IN ('pending_personnel','pending_director','approved')
          AND g.leave_date BETWEEN lr.start_date AND lr.end_date
          AND (
            extract(isodow FROM g.leave_date) BETWEEN 1 AND 5
            OR g.leave_date=ANY(coalesce(lr.weekend_working_dates,'{}'::date[]))
          )
          AND (
            private.leave_session_for_date(g.leave_date,lr.daily_leave_sessions,lr.leave_session)='full_day'
            OR g.leave_session='full_day'
            OR private.leave_session_for_date(g.leave_date,lr.daily_leave_sessions,lr.leave_session)=g.leave_session
          )
      ) AS available
    FROM public.preschool_group_cover_members member
    JOIN public.preschool_group_covers g ON g.id=member.cover_id
    WHERE member.teacher_id=v_leave.requester_id
      AND g.status='active'
  ) calc
  WHERE m.id=calc.member_id;

  RETURN v_count;
END;
$function$;

CREATE OR REPLACE FUNCTION private.sync_substitute_lessons_for_leave(
  p_leave_request_id uuid,
  p_notify boolean DEFAULT true
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_leave public.leave_requests%rowtype;
  v_inserted integer := 0;
BEGIN
  SELECT * INTO v_leave
  FROM public.leave_requests
  WHERE id=p_leave_request_id
    AND status IN ('pending_personnel','pending_director','approved')
    AND affects_teaching_schedule=true;

  IF v_leave.id IS NULL THEN
    RETURN 0;
  END IF;

  INSERT INTO public.substitute_lessons(
    leave_request_id,leave_request_no,leave_date,academic_year,semester,stage_code,
    class_id,class_label,subject_id,subject_name,timetable_entry_id,period_no,start_time,end_time,
    absent_teacher_id,absent_teacher_name,status
  )
  SELECT
    v_leave.id,
    v_leave.request_no,
    gs.leave_date,
    v_leave.academic_year,
    v_leave.semester,
    c.stage_code,
    c.id,
    c.level_name || CASE WHEN nullif(btrim(c.room_name),'') IS NOT NULL THEN '/'||c.room_name ELSE '' END,
    s.id,
    s.subject_name,
    te.id,
    per.period_no,
    per.start_time,
    per.end_time,
    v_leave.requester_id,
    v_leave.requester_name,
    'unassigned'
  FROM (
    SELECT
      day_at::date AS leave_date,
      private.leave_session_for_date(
        day_at::date,v_leave.daily_leave_sessions,v_leave.leave_session
      ) AS leave_session
    FROM generate_series(
      v_leave.start_date::timestamp,
      v_leave.end_date::timestamp,
      interval '1 day'
    ) AS days(day_at)
    WHERE extract(isodow FROM day_at) BETWEEN 1 AND 5
       OR day_at::date=ANY(coalesce(v_leave.weekend_working_dates,'{}'::date[]))
  ) gs
  JOIN public.timetable_entries te
    ON te.weekday=extract(isodow FROM gs.leave_date)::smallint
  JOIN public.timetable_profiles tp
    ON tp.id=te.timetable_id
   AND tp.status='published'
   AND te.weekday=ANY(tp.weekdays)
  JOIN public.school_classes c
    ON c.id=tp.class_id
   AND c.is_active=true
   AND c.academic_year=v_leave.academic_year::text
   AND c.semester=v_leave.semester
  JOIN public.teaching_assignments ta
    ON ta.id=te.assignment_id
   AND ta.teacher_id=v_leave.requester_id
   AND ta.is_active=true
  JOIN public.academic_subjects s
    ON s.id=ta.subject_id
  JOIN public.timetable_periods per
    ON per.id=te.period_id
   AND per.is_break=false
   AND (
     gs.leave_session='full_day'
     OR (gs.leave_session='morning' AND per.start_time < time '12:00')
     OR (gs.leave_session='afternoon' AND per.start_time >= time '12:00')
   )
  ON CONFLICT (leave_request_id,leave_date,timetable_entry_id) DO NOTHING;

  GET DIAGNOSTICS v_inserted = ROW_COUNT;

  IF p_notify AND v_inserted > 0 THEN
    INSERT INTO public.notifications(recipient_id,type,title,message,entity_type,entity_id,action_url)
    VALUES(
      v_leave.requester_id,
      'substitute_arrangement_required',
      'กรุณาจัดครูสอนแทน',
      'คำขอลา #'||v_leave.request_no::text||' มี '||
        (SELECT count(*)::text FROM public.substitute_lessons sl
         WHERE sl.leave_request_id=v_leave.id AND sl.status<>'cancelled')||
        ' คาบที่ต้องจัดครูสอนแทน สามารถจัดได้ทันทีโดยไม่ต้องรออนุมัติใบลา',
      'substitute_batch',v_leave.id,'/academic/substitute-teaching'
    );

    INSERT INTO public.notifications(recipient_id,type,title,message,entity_type,entity_id,action_url)
    SELECT
      recipients.id,
      'substitute_pending',
      'มีคาบสอนแทนรอจัด',
      v_leave.requester_name || ' ยื่นใบลาและมีคาบที่ต้องจัดครูสอนแทน',
      'substitute_batch',v_leave.id,'/academic/substitute-teaching'
    FROM (
      SELECT p.id
      FROM public.profiles p
      JOIN public.departments d ON d.id=p.department_id AND d.code='academic'
      WHERE p.role='department_head'
        AND p.account_status='active'
        AND p.deleted_at IS NULL
      UNION
      SELECT p.id
      FROM public.stage_heads sh
      JOIN public.profiles p ON p.id=sh.teacher_id
      WHERE sh.academic_year=v_leave.academic_year::text
        AND p.account_status='active'
        AND p.deleted_at IS NULL
        AND EXISTS(
          SELECT 1
          FROM public.substitute_lessons sl
          WHERE sl.leave_request_id=v_leave.id
            AND sl.stage_code=sh.stage_code
            AND sl.status<>'cancelled'
        )
    ) recipients
    WHERE recipients.id<>v_leave.requester_id;
  END IF;

  RETURN v_inserted;
END;
$function$;

CREATE OR REPLACE FUNCTION private.substitute_day_slots(
  p_leave_request_id uuid,
  p_leave_date date
)
RETURNS TABLE(
  period_no integer,
  start_time time without time zone,
  end_time time without time zone,
  class_label text,
  subject_name text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $function$
  SELECT
    z.period_no,
    z.start_time,
    z.end_time,
    (
      SELECT string_agg(DISTINCT sl.class_label,', ')
      FROM public.substitute_lessons sl
      WHERE sl.leave_request_id=p_leave_request_id
        AND sl.leave_date=p_leave_date
        AND sl.period_no=z.period_no
        AND sl.status<>'cancelled'
    ),
    (
      SELECT string_agg(DISTINCT sl.subject_name,', ')
      FROM public.substitute_lessons sl
      WHERE sl.leave_request_id=p_leave_request_id
        AND sl.leave_date=p_leave_date
        AND sl.period_no=z.period_no
        AND sl.status<>'cancelled'
    )
  FROM (
    SELECT DISTINCT ON (per.period_no)
      per.period_no,per.start_time,per.end_time
    FROM public.timetable_periods per
    JOIN public.timetable_profiles tp
      ON tp.id=per.timetable_id
     AND tp.status='published'
    JOIN public.school_classes c
      ON c.id=tp.class_id
     AND c.is_active=true
    JOIN public.leave_requests lr
      ON lr.id=p_leave_request_id
     AND c.academic_year=lr.academic_year::text
     AND c.semester=lr.semester
    WHERE NOT per.is_break
      AND (
        private.leave_session_for_date(p_leave_date,lr.daily_leave_sessions,lr.leave_session)='full_day'
        OR (
          private.leave_session_for_date(p_leave_date,lr.daily_leave_sessions,lr.leave_session)='morning'
          AND per.start_time < time '12:00'
        )
        OR (
          private.leave_session_for_date(p_leave_date,lr.daily_leave_sessions,lr.leave_session)='afternoon'
          AND per.start_time >= time '12:00'
        )
      )
      AND (
        extract(isodow FROM p_leave_date) BETWEEN 1 AND 5
        OR p_leave_date=ANY(coalesce(lr.weekend_working_dates,'{}'::date[]))
      )
      AND extract(isodow FROM p_leave_date)::smallint=ANY(tp.weekdays)
    ORDER BY
      per.period_no,
      CASE WHEN EXISTS(
        SELECT 1
        FROM public.substitute_lessons sl
        JOIN public.timetable_entries te ON te.id=sl.timetable_entry_id
        WHERE sl.leave_request_id=p_leave_request_id
          AND sl.leave_date=p_leave_date
          AND te.timetable_id=tp.id
      ) THEN 0 ELSE 1 END,
      per.sort_order
  ) z
  ORDER BY z.period_no;
$function$;

CREATE OR REPLACE FUNCTION private.leave_approved_substitute_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  IF NEW.status IN ('pending_personnel','pending_director','approved')
     AND NEW.affects_teaching_schedule=true
     AND (
       OLD.status IS DISTINCT FROM NEW.status
       OR OLD.affects_teaching_schedule IS DISTINCT FROM NEW.affects_teaching_schedule
       OR OLD.weekend_working_dates IS DISTINCT FROM NEW.weekend_working_dates
       OR OLD.daily_leave_sessions IS DISTINCT FROM NEW.daily_leave_sessions
     ) THEN
    PERFORM private.sync_substitute_lessons_for_leave(NEW.id,true);
  END IF;

  IF NEW.status='rejected' AND OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.notifications(recipient_id,type,title,message,entity_type,entity_id,action_url)
    SELECT DISTINCT sl.substitute_teacher_id,
      'substitute_cancelled_leave_rejected',
      'ยกเลิกงานสอนแทน',
      'งานสอนแทนของ '||sl.absent_teacher_name||' วันที่ '||to_char(sl.leave_date,'DD/MM/YYYY')||' ถูกยกเลิก เนื่องจากคำขอลาไม่ได้รับอนุมัติ',
      'substitute_lesson',sl.id,'/academic/substitute-teaching'
    FROM public.substitute_lessons sl
    WHERE sl.leave_request_id=NEW.id
      AND sl.status='assigned'
      AND sl.substitute_teacher_id IS NOT NULL;

    UPDATE public.substitute_lessons
    SET status='cancelled',updated_at=now()
    WHERE leave_request_id=NEW.id
      AND status<>'cancelled';
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS preschool_leave_coverage_sync ON public.leave_requests;
CREATE TRIGGER preschool_leave_coverage_sync
AFTER INSERT OR UPDATE OF
  status,start_date,end_date,affects_teaching_schedule,academic_year,semester,
  leave_session,weekend_working_dates,daily_leave_sessions
ON public.leave_requests
FOR EACH ROW EXECUTE FUNCTION private.preschool_leave_coverage_trigger();

DROP TRIGGER IF EXISTS leave_requests_generate_substitute ON public.leave_requests;
CREATE TRIGGER leave_requests_generate_substitute
AFTER UPDATE OF
  status,affects_teaching_schedule,weekend_working_dates,daily_leave_sessions
ON public.leave_requests
FOR EACH ROW EXECUTE FUNCTION private.leave_approved_substitute_trigger();
