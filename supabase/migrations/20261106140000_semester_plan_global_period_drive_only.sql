-- v20261106: semester lesson plans follow the school's current academic term.
-- Every second semester accepts Google Drive links only. Existing files are retained.
CREATE OR REPLACE FUNCTION private.semester_lesson_plan_submission_mode(p_academic_year text,p_semester integer)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO ''
AS $function$
  SELECT CASE WHEN p_semester=2 THEN 'drive_only'::text ELSE COALESCE((
    SELECT x.submission_mode
      FROM public.semester_lesson_plan_submission_settings x
     WHERE x.academic_year=p_academic_year AND x.semester=p_semester
  ),'both'::text) END;
$function$;
REVOKE ALL ON FUNCTION private.semester_lesson_plan_submission_mode(text,integer) FROM PUBLIC,anon;

CREATE OR REPLACE FUNCTION private.semester_plan_drive_only_setting_guard()
RETURNS trigger LANGUAGE plpgsql SET search_path TO ''
AS $function$
BEGIN
  IF NEW.semester=2 AND NEW.submission_mode<>'drive_only' THEN
    RAISE EXCEPTION 'ภาคเรียนที่ 2 กำหนดให้ส่งลิงก์ Google Drive เท่านั้น';
  END IF;
  RETURN NEW;
END;
$function$;
DROP TRIGGER IF EXISTS trg_semester_plan_drive_only_setting_guard
  ON public.semester_lesson_plan_submission_settings;
CREATE TRIGGER trg_semester_plan_drive_only_setting_guard
  BEFORE INSERT OR UPDATE OF semester,submission_mode
  ON public.semester_lesson_plan_submission_settings
  FOR EACH ROW EXECUTE FUNCTION private.semester_plan_drive_only_setting_guard();

-- New semester plans must belong to the term selected in the central school system.
-- Editing the metadata of a historical plan does not silently migrate it.
CREATE OR REPLACE FUNCTION private.enforce_semester_plan_current_period()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $function$
DECLARE v_year text; v_semester integer;
BEGIN
  IF NEW.plan_type IS DISTINCT FROM 'semester' THEN RETURN NEW; END IF;
  IF TG_OP='UPDATE'
     AND NEW.academic_year IS NOT DISTINCT FROM OLD.academic_year
     AND NEW.semester IS NOT DISTINCT FROM OLD.semester THEN RETURN NEW; END IF;
  SELECT t.academic_year,t.semester INTO v_year,v_semester
    FROM public.academic_terms t WHERE t.is_current IS TRUE
    ORDER BY t.academic_year DESC,t.semester DESC LIMIT 1;
  IF v_year IS NULL THEN
    RAISE EXCEPTION 'ยังไม่ได้ตั้งปีการศึกษาและภาคเรียนปัจจุบันในระบบหลัก';
  END IF;
  IF NEW.academic_year IS DISTINCT FROM v_year OR NEW.semester IS DISTINCT FROM v_semester THEN
    RAISE EXCEPTION 'แผนรายภาคเรียนใหม่ต้องใช้ปีการศึกษา % ภาคเรียนที่ % ตามระบบหลัก',v_year,v_semester;
  END IF;
  RETURN NEW;
END;
$function$;
DROP TRIGGER IF EXISTS trg_semester_plan_current_period ON public.lesson_plans;
CREATE TRIGGER trg_semester_plan_current_period
  BEFORE INSERT OR UPDATE OF academic_year,semester ON public.lesson_plans
  FOR EACH ROW EXECUTE FUNCTION private.enforce_semester_plan_current_period();
