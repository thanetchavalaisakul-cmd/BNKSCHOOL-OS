-- Special school-open days become the shared source for leave counting and substitute timetables.
-- Existing manually selected weekend dates are preserved separately from calendar-derived dates.

ALTER TABLE public.academic_calendar_day_overrides
  ADD COLUMN IF NOT EXISTS timetable_weekday smallint;

UPDATE public.academic_calendar_day_overrides
SET timetable_weekday = CASE
  WHEN category = 'makeup' AND make_up_for IS NOT NULL
    THEN extract(isodow FROM make_up_for)::smallint
  ELSE extract(isodow FROM event_date)::smallint
END
WHERE override_type = 'special_school_day'
  AND timetable_weekday IS NULL;

DO $constraint$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'academic_calendar_day_overrides_timetable_weekday_check'
      AND conrelid = 'public.academic_calendar_day_overrides'::regclass
  ) THEN
    ALTER TABLE public.academic_calendar_day_overrides
      ADD CONSTRAINT academic_calendar_day_overrides_timetable_weekday_check
      CHECK (timetable_weekday IS NULL OR timetable_weekday BETWEEN 1 AND 7);
  END IF;
END
$constraint$;

ALTER TABLE public.leave_requests
  ADD COLUMN IF NOT EXISTS manual_weekend_working_dates date[];

UPDATE public.leave_requests
SET manual_weekend_working_dates = coalesce(weekend_working_dates, '{}'::date[])
WHERE manual_weekend_working_dates IS NULL;

CREATE OR REPLACE FUNCTION private.normalize_academic_calendar_day_override()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO ''
AS $function$
BEGIN
  IF NEW.override_type = 'special_school_day' THEN
    IF NEW.category = 'makeup' THEN
      IF NEW.make_up_for IS NULL THEN
        RAISE EXCEPTION 'A makeup school day must identify the date it replaces';
      END IF;
      NEW.timetable_weekday := extract(isodow FROM NEW.make_up_for)::smallint;
    ELSIF NEW.category = 'special_opening' THEN
      NEW.timetable_weekday := coalesce(
        NEW.timetable_weekday,
        extract(isodow FROM NEW.event_date)::smallint
      );
    ELSE
      RAISE EXCEPTION 'Invalid special school day category';
    END IF;
  ELSE
    NEW.timetable_weekday := NULL;
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS academic_calendar_day_overrides_00_normalize
  ON public.academic_calendar_day_overrides;
CREATE TRIGGER academic_calendar_day_overrides_00_normalize
BEFORE INSERT OR UPDATE OF event_date, override_type, category, make_up_for, timetable_weekday
ON public.academic_calendar_day_overrides
FOR EACH ROW EXECUTE FUNCTION private.normalize_academic_calendar_day_override();

CREATE OR REPLACE FUNCTION private.school_special_open_weekend_dates(
  p_start date,
  p_end date,
  p_academic_year integer,
  p_semester smallint
)
RETURNS date[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $function$
  SELECT coalesce(array_agg(DISTINCT o.event_date ORDER BY o.event_date), '{}'::date[])
  FROM public.academic_calendar_day_overrides o
  JOIN public.academic_calendars c ON c.id = o.calendar_id
  WHERE o.override_type = 'special_school_day'
    AND c.status = 'published'
    AND c.academic_year = p_academic_year::text
    AND c.semester = p_semester
    AND o.event_date BETWEEN p_start AND p_end
    AND extract(isodow FROM o.event_date) IN (6,7);
$function$;

CREATE OR REPLACE FUNCTION private.school_timetable_weekday(
  p_date date,
  p_academic_year integer,
  p_semester smallint
)
RETURNS smallint
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $function$
  SELECT coalesce(
    (
      SELECT o.timetable_weekday
      FROM public.academic_calendar_day_overrides o
      JOIN public.academic_calendars c ON c.id = o.calendar_id
      WHERE o.event_date = p_date
        AND o.override_type = 'special_school_day'
        AND c.status = 'published'
        AND c.academic_year = p_academic_year::text
        AND c.semester = p_semester
      ORDER BY c.updated_at DESC, c.created_at DESC
      LIMIT 1
    ),
    extract(isodow FROM p_date)::smallint
  );
$function$;

CREATE OR REPLACE FUNCTION private.apply_leave_working_day_total()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO ''
AS $function$
DECLARE
  v_entry record;
  v_date date;
  v_session text;
  v_effective_weekend_dates date[];
  v_special_weekend_dates date[];
BEGIN
  -- Backward compatibility: older clients still write weekend_working_dates directly.
  IF TG_OP = 'INSERT' THEN
    NEW.manual_weekend_working_dates := coalesce(
      NEW.manual_weekend_working_dates,
      NEW.weekend_working_dates,
      '{}'::date[]
    );
  ELSIF NEW.manual_weekend_working_dates IS NOT DISTINCT FROM OLD.manual_weekend_working_dates
        AND NEW.weekend_working_dates IS DISTINCT FROM OLD.weekend_working_dates THEN
    NEW.manual_weekend_working_dates := coalesce(NEW.weekend_working_dates, '{}'::date[]);
  END IF;

  NEW.manual_weekend_working_dates := ARRAY(
    SELECT DISTINCT selected_date
    FROM unnest(coalesce(NEW.manual_weekend_working_dates, '{}'::date[])) AS selected(selected_date)
    WHERE selected_date IS NOT NULL
    ORDER BY selected_date
  );

  IF EXISTS (
    SELECT 1
    FROM unnest(NEW.manual_weekend_working_dates) AS selected(selected_date)
    WHERE selected_date < NEW.start_date
       OR selected_date > NEW.end_date
       OR extract(isodow FROM selected_date) NOT IN (6,7)
  ) THEN
    RAISE EXCEPTION 'Weekend school-open dates must be Saturdays or Sundays within the leave date range';
  END IF;

  v_special_weekend_dates := private.school_special_open_weekend_dates(
    NEW.start_date, NEW.end_date, NEW.academic_year, NEW.semester
  );

  SELECT coalesce(array_agg(DISTINCT selected_date ORDER BY selected_date), '{}'::date[])
  INTO v_effective_weekend_dates
  FROM unnest(
    coalesce(NEW.manual_weekend_working_dates, '{}'::date[])
    || coalesce(v_special_weekend_dates, '{}'::date[])
  ) AS selected(selected_date)
  WHERE selected_date IS NOT NULL;

  -- Existing leave, preschool coverage and substitute workflows continue to use this effective list.
  NEW.weekend_working_dates := v_effective_weekend_dates;

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
         AND NOT (v_date=ANY(coalesce(v_effective_weekend_dates,'{}'::date[])))
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
     OR day_at::date=ANY(coalesce(v_effective_weekend_dates,'{}'::date[]));

  IF NEW.leave_days<=0 THEN
    RAISE EXCEPTION 'Leave period must include at least one weekday or selected school-open weekend date';
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS leave_requests_zz_apply_working_day_total ON public.leave_requests;
CREATE TRIGGER leave_requests_zz_apply_working_day_total
BEFORE INSERT OR UPDATE OF
  start_date,end_date,leave_session,weekend_working_dates,
  manual_weekend_working_dates,daily_leave_sessions,academic_year,semester
ON public.leave_requests
FOR EACH ROW EXECUTE FUNCTION private.apply_leave_working_day_total();

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
      AND private.school_timetable_weekday(
        p_leave_date,lr.academic_year,lr.semester
      )::smallint=ANY(tp.weekdays)
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
      ) AS leave_session,
      private.school_timetable_weekday(
        day_at::date,v_leave.academic_year,v_leave.semester
      ) AS timetable_weekday
    FROM generate_series(
      v_leave.start_date::timestamp,
      v_leave.end_date::timestamp,
      interval '1 day'
    ) AS days(day_at)
    WHERE extract(isodow FROM day_at) BETWEEN 1 AND 5
       OR day_at::date=ANY(coalesce(v_leave.weekend_working_dates,'{}'::date[]))
  ) gs
  JOIN public.timetable_entries te
    ON te.weekday=gs.timetable_weekday
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
          SELECT 1 FROM public.substitute_lessons sl
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

-- Keep all timetable-conflict checks on the same weekday template as the special school day.
DO $rewrite$
DECLARE
  v_original text;
  v_rewritten text;
BEGIN
  v_original := pg_get_functiondef('public.get_substitute_candidates(uuid)'::regprocedure);
  v_rewritten := replace(
    v_original,
    'extract(isodow from v_lesson.leave_date)::smallint',
    'private.school_timetable_weekday(v_lesson.leave_date,v_lesson.academic_year,v_lesson.semester)'
  );
  IF v_rewritten = v_original THEN
    RAISE EXCEPTION 'Could not patch get_substitute_candidates weekday mapping';
  END IF;
  EXECUTE v_rewritten;

  v_original := pg_get_functiondef('public.assign_substitute_teacher(uuid,uuid,text)'::regprocedure);
  v_rewritten := replace(
    v_original,
    'extract(isodow from v_lesson.leave_date)::smallint',
    'private.school_timetable_weekday(v_lesson.leave_date,v_lesson.academic_year,v_lesson.semester)'
  );
  IF v_rewritten = v_original THEN
    RAISE EXCEPTION 'Could not patch assign_substitute_teacher weekday mapping';
  END IF;
  EXECUTE v_rewritten;

  v_original := pg_get_functiondef('public.get_substitute_day_candidates(uuid,date)'::regprocedure);
  v_rewritten := replace(
    v_original,
    'extract(isodow from p_leave_date)::smallint',
    'private.school_timetable_weekday(p_leave_date,v_row.academic_year,v_row.semester)'
  );
  IF v_rewritten = v_original THEN
    RAISE EXCEPTION 'Could not patch get_substitute_day_candidates weekday mapping';
  END IF;
  EXECUTE v_rewritten;
END
$rewrite$;

CREATE OR REPLACE FUNCTION private.guard_special_school_day_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_old_year text;
  v_old_semester integer;
  v_new_year text;
  v_new_semester integer;
  v_has_active_leave boolean:=false;
BEGIN
  IF TG_OP IN ('UPDATE','DELETE') THEN
    IF OLD.override_type='special_school_day' THEN
      SELECT c.academic_year,c.semester
      INTO v_old_year,v_old_semester
      FROM public.academic_calendars c
      WHERE c.id=OLD.calendar_id;

      SELECT EXISTS(
        SELECT 1
        FROM public.leave_requests lr
        WHERE lr.academic_year::text=v_old_year
          AND lr.semester=v_old_semester
          AND OLD.event_date BETWEEN lr.start_date AND lr.end_date
          AND lr.status IN ('pending_personnel','pending_director','approved')
      ) INTO v_has_active_leave;

      IF v_has_active_leave THEN
        IF TG_OP='DELETE' THEN
          RAISE EXCEPTION 'This special school day is used by an active leave request. Cancel or complete the affected leave request before changing its date or timetable.';
        ELSIF NEW.override_type IS DISTINCT FROM 'special_school_day'
           OR NEW.calendar_id IS DISTINCT FROM OLD.calendar_id
           OR NEW.event_date IS DISTINCT FROM OLD.event_date
           OR NEW.timetable_weekday IS DISTINCT FROM OLD.timetable_weekday THEN
          RAISE EXCEPTION 'This special school day is used by an active leave request. Cancel or complete the affected leave request before changing its date or timetable.';
        END IF;
      END IF;
    END IF;
  END IF;

  IF TG_OP IN ('INSERT','UPDATE') THEN
    IF NEW.override_type='special_school_day' THEN
      SELECT c.academic_year,c.semester
      INTO v_new_year,v_new_semester
      FROM public.academic_calendars c
      WHERE c.id=NEW.calendar_id;

      IF EXISTS(
        SELECT 1
        FROM public.leave_requests lr
        JOIN public.substitute_lessons sl
          ON sl.leave_request_id=lr.id
         AND sl.leave_date=NEW.event_date
         AND sl.status<>'cancelled'
        JOIN public.timetable_entries te ON te.id=sl.timetable_entry_id
        WHERE lr.academic_year::text=v_new_year
          AND lr.semester=v_new_semester
          AND NEW.event_date BETWEEN lr.start_date AND lr.end_date
          AND lr.status IN ('pending_personnel','pending_director','approved')
          AND lr.affects_teaching_schedule=true
          AND te.weekday<>NEW.timetable_weekday
      ) THEN
        RAISE EXCEPTION 'A leave request already has substitute lessons on this date using another timetable weekday. Cancel or complete it before changing the special-day schedule.';
      END IF;
    END IF;
  END IF;

  IF TG_OP='DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$function$;
DROP TRIGGER IF EXISTS academic_calendar_day_overrides_10_special_guard
  ON public.academic_calendar_day_overrides;
CREATE TRIGGER academic_calendar_day_overrides_10_special_guard
BEFORE INSERT OR UPDATE OR DELETE
ON public.academic_calendar_day_overrides
FOR EACH ROW EXECUTE FUNCTION private.guard_special_school_day_changes();

CREATE OR REPLACE FUNCTION private.refresh_leave_requests_for_special_calendar_day(
  p_calendar_id uuid,
  p_event_date date
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_calendar public.academic_calendars%rowtype;
  v_leave record;
  v_count integer:=0;
BEGIN
  SELECT * INTO v_calendar
  FROM public.academic_calendars
  WHERE id=p_calendar_id;

  IF v_calendar.id IS NULL THEN RETURN 0; END IF;

  FOR v_leave IN
    SELECT lr.id,lr.status,lr.affects_teaching_schedule
    FROM public.leave_requests lr
    WHERE lr.academic_year::text=v_calendar.academic_year
      AND lr.semester=v_calendar.semester
      AND p_event_date BETWEEN lr.start_date AND lr.end_date
  LOOP
    UPDATE public.leave_requests
    SET manual_weekend_working_dates=coalesce(manual_weekend_working_dates,'{}'::date[])
    WHERE id=v_leave.id;

    IF v_leave.status IN ('pending_personnel','pending_director','approved')
       AND v_leave.affects_teaching_schedule=true THEN
      PERFORM private.sync_substitute_lessons_for_leave(v_leave.id,true);
    END IF;

    v_count:=v_count+1;
  END LOOP;

  RETURN v_count;
END;
$function$;

CREATE OR REPLACE FUNCTION private.academic_calendar_day_override_refresh_leave()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_old_calendar_id uuid;
  v_old_date date;
  v_new_calendar_id uuid;
  v_new_date date;
BEGIN
  IF TG_OP IN ('UPDATE','DELETE') THEN
    IF OLD.override_type='special_school_day' THEN
      v_old_calendar_id:=OLD.calendar_id;
      v_old_date:=OLD.event_date;
    END IF;
  END IF;

  IF TG_OP IN ('INSERT','UPDATE') THEN
    IF NEW.override_type='special_school_day' THEN
      v_new_calendar_id:=NEW.calendar_id;
      v_new_date:=NEW.event_date;
    END IF;
  END IF;

  IF v_old_calendar_id IS NOT NULL THEN
    PERFORM private.refresh_leave_requests_for_special_calendar_day(v_old_calendar_id,v_old_date);
  END IF;

  IF v_new_calendar_id IS NOT NULL
     AND (v_new_calendar_id IS DISTINCT FROM v_old_calendar_id
          OR v_new_date IS DISTINCT FROM v_old_date) THEN
    PERFORM private.refresh_leave_requests_for_special_calendar_day(v_new_calendar_id,v_new_date);
  ELSIF v_new_calendar_id IS NOT NULL AND v_old_calendar_id IS NULL THEN
    PERFORM private.refresh_leave_requests_for_special_calendar_day(v_new_calendar_id,v_new_date);
  END IF;

  IF TG_OP='DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS academic_calendar_day_overrides_zz_refresh_leave
  ON public.academic_calendar_day_overrides;
CREATE TRIGGER academic_calendar_day_overrides_zz_refresh_leave
AFTER INSERT OR UPDATE OR DELETE
ON public.academic_calendar_day_overrides
FOR EACH ROW EXECUTE FUNCTION private.academic_calendar_day_override_refresh_leave();

CREATE OR REPLACE FUNCTION private.guard_academic_calendar_unpublish_with_active_leave()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  IF OLD.status='published' AND NEW.status<>'published' AND EXISTS(
    SELECT 1
    FROM public.academic_calendar_day_overrides o
    JOIN public.leave_requests lr
      ON lr.academic_year=OLD.academic_year::integer
     AND lr.semester=OLD.semester
     AND o.event_date BETWEEN lr.start_date AND lr.end_date
    WHERE o.calendar_id=OLD.id
      AND o.override_type='special_school_day'
      AND lr.status IN ('pending_personnel','pending_director','approved')
  ) THEN
    RAISE EXCEPTION 'This published calendar has special school days used by active leave requests. Complete or cancel those requests before unpublishing it.';
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS academic_calendars_10_guard_special_leave
  ON public.academic_calendars;
CREATE TRIGGER academic_calendars_10_guard_special_leave
BEFORE UPDATE OF status
ON public.academic_calendars
FOR EACH ROW EXECUTE FUNCTION private.guard_academic_calendar_unpublish_with_active_leave();

CREATE OR REPLACE FUNCTION private.academic_calendar_status_refresh_leave()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_date date;
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    FOR v_date IN
      SELECT o.event_date
      FROM public.academic_calendar_day_overrides o
      WHERE o.calendar_id=NEW.id
        AND o.override_type='special_school_day'
      ORDER BY o.event_date
    LOOP
      PERFORM private.refresh_leave_requests_for_special_calendar_day(NEW.id,v_date);
    END LOOP;
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS academic_calendars_zz_refresh_special_leave
  ON public.academic_calendars;
CREATE TRIGGER academic_calendars_zz_refresh_special_leave
AFTER UPDATE OF status
ON public.academic_calendars
FOR EACH ROW EXECUTE FUNCTION private.academic_calendar_status_refresh_leave();

-- Recalculate and synchronize the existing leave requests that already overlap published special school days.
UPDATE public.leave_requests lr
SET manual_weekend_working_dates=coalesce(lr.manual_weekend_working_dates,'{}'::date[])
WHERE EXISTS(
  SELECT 1
  FROM public.academic_calendars c
  JOIN public.academic_calendar_day_overrides o ON o.calendar_id=c.id
  WHERE c.status='published'
    AND c.academic_year=lr.academic_year::text
    AND c.semester=lr.semester
    AND o.override_type='special_school_day'
    AND o.event_date BETWEEN lr.start_date AND lr.end_date
);
