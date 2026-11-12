-- Separate operational school-open days from the editable academic calendar.
-- Preserve published historical calendar entries for 100-day display, but never use them for leave or substitute calculations.
CREATE TABLE IF NOT EXISTS public.school_special_open_days (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  academic_year integer NOT NULL,
  semester smallint NOT NULL CHECK (semester IN (1,2)),
  event_date date NOT NULL,
  category text NOT NULL CHECK (category IN ('makeup','special_opening')),
  title text NOT NULL CHECK (length(btrim(title)) > 0),
  make_up_for date,
  timetable_weekday smallint NOT NULL CHECK (timetable_weekday BETWEEN 1 AND 7),
  note text,
  legacy_override_id uuid UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_by uuid,
  UNIQUE (academic_year, semester, event_date),
  CONSTRAINT school_special_makeup_requires_date CHECK (
    category <> 'makeup' OR make_up_for IS NOT NULL
  )
);
CREATE INDEX IF NOT EXISTS school_special_open_days_period_date_idx
  ON public.school_special_open_days(academic_year,semester,event_date);
ALTER TABLE public.school_special_open_days ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.school_special_open_days FROM anon;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.school_special_open_days TO authenticated;

DROP POLICY IF EXISTS school_special_open_select ON public.school_special_open_days;
CREATE POLICY school_special_open_select ON public.school_special_open_days
FOR SELECT TO authenticated USING ((select private.is_active_user()));

DROP POLICY IF EXISTS school_special_open_admin_insert ON public.school_special_open_days;
CREATE POLICY school_special_open_admin_insert ON public.school_special_open_days
FOR INSERT TO authenticated WITH CHECK (
  (select private.is_active_user()) AND (select private.is_super_admin())
  AND created_by = (select auth.uid())
);
DROP POLICY IF EXISTS school_special_open_admin_update ON public.school_special_open_days;
CREATE POLICY school_special_open_admin_update ON public.school_special_open_days
FOR UPDATE TO authenticated USING (
  (select private.is_active_user()) AND (select private.is_super_admin())
) WITH CHECK (
  (select private.is_active_user()) AND (select private.is_super_admin())
);
DROP POLICY IF EXISTS school_special_open_admin_delete ON public.school_special_open_days;
CREATE POLICY school_special_open_admin_delete ON public.school_special_open_days
FOR DELETE TO authenticated USING (
  (select private.is_active_user()) AND (select private.is_super_admin())
);

-- One-time, idempotent data copy. Do not delete old academic calendar entries:
-- they are part of the already-issued 100-day document, but are no longer the operational source.
INSERT INTO public.school_special_open_days (
  academic_year,semester,event_date,category,title,make_up_for,
  timetable_weekday,note,legacy_override_id,created_at,updated_at,created_by,updated_by
)
SELECT c.academic_year::integer,c.semester::smallint,o.event_date,
  o.category,o.title,o.make_up_for,
  coalesce(o.timetable_weekday,extract(isodow from coalesce(o.make_up_for,o.event_date))::smallint),
  o.note,o.id,o.created_at,o.updated_at,o.created_by,o.updated_by
FROM public.academic_calendar_day_overrides o
JOIN public.academic_calendars c ON c.id=o.calendar_id
WHERE o.override_type='special_school_day' AND c.status='published'
ON CONFLICT (academic_year,semester,event_date) DO NOTHING;

CREATE OR REPLACE FUNCTION private.normalize_school_special_open_day()
RETURNS trigger LANGUAGE plpgsql SET search_path TO '' AS $function$
BEGIN
  IF NEW.category='makeup' THEN
    IF NEW.make_up_for IS NULL THEN
      RAISE EXCEPTION 'A makeup school day must identify the date it replaces';
    END IF;
    NEW.timetable_weekday:=extract(isodow FROM NEW.make_up_for)::smallint;
  ELSE
    NEW.make_up_for:=NULL;
    IF NEW.timetable_weekday IS NULL THEN
      RAISE EXCEPTION 'Choose a timetable weekday for the special school day';
    END IF;
  END IF;
  NEW.updated_at:=now();
  RETURN NEW;
END;
$function$;
DROP TRIGGER IF EXISTS school_special_open_days_00_normalize ON public.school_special_open_days;
CREATE TRIGGER school_special_open_days_00_normalize
BEFORE INSERT OR UPDATE ON public.school_special_open_days
FOR EACH ROW EXECUTE FUNCTION private.normalize_school_special_open_day();

CREATE OR REPLACE FUNCTION private.guard_school_special_open_day_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $function$
DECLARE
  v_active_leave boolean;
BEGIN
  IF TG_OP IN ('UPDATE','DELETE') THEN
    SELECT EXISTS(
      SELECT 1 FROM public.leave_requests lr
      WHERE lr.academic_year=OLD.academic_year
        AND lr.semester=OLD.semester
        AND OLD.event_date BETWEEN lr.start_date AND lr.end_date
        AND lr.status IN ('pending_personnel','pending_director','approved')
    ) INTO v_active_leave;
    IF v_active_leave AND (
      TG_OP='DELETE'
      OR (TG_OP='UPDATE' AND (
          NEW.event_date IS DISTINCT FROM OLD.event_date
          OR NEW.academic_year IS DISTINCT FROM OLD.academic_year
          OR NEW.semester IS DISTINCT FROM OLD.semester
          OR NEW.timetable_weekday IS DISTINCT FROM OLD.timetable_weekday
      ))
    ) THEN
      RAISE EXCEPTION 'This school-open day is used by active leave requests. Review those requests before changing its date or timetable.';
    END IF;
  END IF;

  IF TG_OP IN ('INSERT','UPDATE') THEN
    IF EXISTS(
      SELECT 1 FROM public.leave_requests lr
      JOIN public.substitute_lessons sl
        ON sl.leave_request_id=lr.id
       AND sl.leave_date=NEW.event_date AND sl.status<>'cancelled'
      JOIN public.timetable_entries te ON te.id=sl.timetable_entry_id
      WHERE lr.academic_year=NEW.academic_year
        AND lr.semester=NEW.semester
        AND lr.status IN ('pending_personnel','pending_director','approved')
        AND lr.affects_teaching_schedule=true
        AND NEW.event_date BETWEEN lr.start_date AND lr.end_date
        AND te.weekday<>NEW.timetable_weekday
    ) THEN
      RAISE EXCEPTION 'Substitute lessons already use a different timetable for this day.';
    END IF;
  END IF;

  IF TG_OP='DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$function$;
DROP TRIGGER IF EXISTS school_special_open_days_10_guard ON public.school_special_open_days;
CREATE TRIGGER school_special_open_days_10_guard
BEFORE INSERT OR UPDATE OR DELETE ON public.school_special_open_days
FOR EACH ROW EXECUTE FUNCTION private.guard_school_special_open_day_change();

-- Existing leave and substitute functions keep their names/signatures; change only their source.
CREATE OR REPLACE FUNCTION private.school_special_open_weekend_dates(
  p_start date,p_end date,p_academic_year integer,p_semester smallint
)
RETURNS date[] LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO '' AS $function$
  SELECT coalesce(array_agg(DISTINCT d.event_date ORDER BY d.event_date),'{}'::date[])
  FROM public.school_special_open_days d
  WHERE d.academic_year=p_academic_year
    AND d.semester=p_semester AND d.event_date BETWEEN p_start AND p_end
    AND extract(isodow FROM d.event_date) IN (6,7);
$function$;

CREATE OR REPLACE FUNCTION private.school_timetable_weekday(
  p_date date,p_academic_year integer,p_semester smallint
)
RETURNS smallint LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO '' AS $function$
  SELECT coalesce(
    (SELECT d.timetable_weekday FROM public.school_special_open_days d
      WHERE d.event_date=p_date AND d.academic_year=p_academic_year AND d.semester=p_semester
      LIMIT 1),
    extract(isodow FROM p_date)::smallint
  );
$function$;

CREATE OR REPLACE FUNCTION private.refresh_leave_requests_for_school_open_day(
  p_academic_year integer,p_semester smallint,p_event_date date
)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $function$
DECLARE v_leave record; v_count integer:=0;
BEGIN
  FOR v_leave IN
    SELECT lr.id,lr.status,lr.affects_teaching_schedule
    FROM public.leave_requests lr
    WHERE lr.academic_year=p_academic_year AND lr.semester=p_semester
      AND p_event_date BETWEEN lr.start_date AND lr.end_date
      AND lr.status IN ('draft','pending_personnel','pending_director','approved')
  LOOP
    UPDATE public.leave_requests
    SET manual_weekend_working_dates=coalesce(manual_weekend_working_dates,'{}'::date[])
    WHERE id=v_leave.id;
    IF v_leave.status IN ('pending_personnel','pending_director','approved')
       AND v_leave.affects_teaching_schedule THEN
      PERFORM private.sync_substitute_lessons_for_leave(v_leave.id,true);
    END IF;
    v_count:=v_count+1;
  END LOOP;
  RETURN v_count;
END;
$function$;

CREATE OR REPLACE FUNCTION private.school_special_open_days_refresh_leave()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $function$
BEGIN
  IF TG_OP='INSERT' THEN
    PERFORM private.refresh_leave_requests_for_school_open_day(
      NEW.academic_year,NEW.semester,NEW.event_date);
    RETURN NEW;
  ELSIF TG_OP='DELETE' THEN
    PERFORM private.refresh_leave_requests_for_school_open_day(
      OLD.academic_year,OLD.semester,OLD.event_date);
    RETURN OLD;
  END IF;
  IF ROW(OLD.academic_year,OLD.semester,OLD.event_date,OLD.timetable_weekday)
     IS DISTINCT FROM ROW(NEW.academic_year,NEW.semester,NEW.event_date,NEW.timetable_weekday) THEN
    PERFORM private.refresh_leave_requests_for_school_open_day(
      OLD.academic_year,OLD.semester,OLD.event_date);
    PERFORM private.refresh_leave_requests_for_school_open_day(
      NEW.academic_year,NEW.semester,NEW.event_date);
  END IF;
  RETURN NEW;
END;
$function$;
DROP TRIGGER IF EXISTS school_special_open_days_zz_refresh_leave ON public.school_special_open_days;
CREATE TRIGGER school_special_open_days_zz_refresh_leave
AFTER INSERT OR UPDATE OR DELETE ON public.school_special_open_days
FOR EACH ROW EXECUTE FUNCTION private.school_special_open_days_refresh_leave();

-- Remove calendar-to-leave coupling. Academic calendar publication and draft saves
-- must not have operational side effects on leave requests.
DROP TRIGGER IF EXISTS academic_calendar_day_overrides_10_special_guard
  ON public.academic_calendar_day_overrides;
DROP TRIGGER IF EXISTS academic_calendar_day_overrides_zz_refresh_leave
  ON public.academic_calendar_day_overrides;
DROP TRIGGER IF EXISTS academic_calendars_10_guard_special_leave
  ON public.academic_calendars;
DROP TRIGGER IF EXISTS academic_calendars_zz_refresh_special_leave
  ON public.academic_calendars;
