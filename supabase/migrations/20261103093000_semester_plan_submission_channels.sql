-- Term-scoped submission channel control for semester lesson plans only.
-- Only the Academic Department Head and Super Admin can change it.
-- No rows are seeded: absent configuration means BOTH channels stay enabled.
CREATE TABLE IF NOT EXISTS public.semester_lesson_plan_submission_settings (
  academic_year text NOT NULL CHECK (academic_year ~ '^[0-9]{4}$'),
  semester integer NOT NULL CHECK (semester BETWEEN 1 AND 3),
  submission_mode text NOT NULL DEFAULT 'both'
    CHECK (submission_mode IN ('both','pdf_only','drive_only')),
  updated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY (academic_year,semester)
);
ALTER TABLE public.semester_lesson_plan_submission_settings ENABLE ROW LEVEL SECURITY;
GRANT SELECT,INSERT,UPDATE ON public.semester_lesson_plan_submission_settings TO authenticated;
REVOKE DELETE ON public.semester_lesson_plan_submission_settings FROM authenticated;

DROP POLICY IF EXISTS semester_plan_submission_read ON public.semester_lesson_plan_submission_settings;
CREATE POLICY semester_plan_submission_read
 ON public.semester_lesson_plan_submission_settings FOR SELECT TO authenticated
 USING (private.is_active_user());
DROP POLICY IF EXISTS semester_plan_submission_insert ON public.semester_lesson_plan_submission_settings;
CREATE POLICY semester_plan_submission_insert
 ON public.semester_lesson_plan_submission_settings FOR INSERT TO authenticated
 WITH CHECK (private.is_active_user() AND
   (private.is_super_admin() OR private.is_academic_head()));
DROP POLICY IF EXISTS semester_plan_submission_update ON public.semester_lesson_plan_submission_settings;
CREATE POLICY semester_plan_submission_update
 ON public.semester_lesson_plan_submission_settings FOR UPDATE TO authenticated
 USING (private.is_active_user() AND
   (private.is_super_admin() OR private.is_academic_head()))
 WITH CHECK (private.is_active_user() AND
   (private.is_super_admin() OR private.is_academic_head()));

CREATE OR REPLACE FUNCTION private.semester_lesson_plan_submission_mode(p_academic_year text,p_semester integer)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO ''
AS $function$
  SELECT COALESCE((
    SELECT x.submission_mode
    FROM public.semester_lesson_plan_submission_settings x
    WHERE x.academic_year=p_academic_year AND x.semester=p_semester
  ),'both'::text);
$function$;
REVOKE ALL ON FUNCTION private.semester_lesson_plan_submission_mode(text,integer) FROM PUBLIC,anon;

-- Even if a user manipulates the client UI, attaching a new forbidden format is rejected.
-- Existing documents remain intact when management changes the permitted channel.
CREATE OR REPLACE FUNCTION private.enforce_semester_lesson_attachment_channel()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $function$
DECLARE
  v_plan public.lesson_plans;
  v_mode text;
  v_type text;
BEGIN
  SELECT * INTO v_plan FROM public.lesson_plans WHERE id=NEW.lesson_plan_id;
  IF NOT FOUND THEN RETURN NEW; END IF;
  IF v_plan.plan_type IS DISTINCT FROM 'semester' THEN RETURN NEW; END IF;

  v_mode:=private.semester_lesson_plan_submission_mode(v_plan.academic_year,v_plan.semester);
  v_type:=coalesce(NEW.attachment_type,'pdf');
  IF v_type NOT IN ('pdf','google_drive') THEN
    RAISE EXCEPTION 'รองรับเฉพาะไฟล์ PDF หรือลิงก์ Google Drive';
  END IF;
  IF v_mode='drive_only' AND v_type<>'google_drive' THEN
    RAISE EXCEPTION 'แผนรายภาคเรียนนี้เปิดรับเฉพาะลิงก์ Google Drive';
  ELSIF v_mode='pdf_only' AND v_type<>'pdf' THEN
    RAISE EXCEPTION 'แผนรายภาคเรียนนี้เปิดรับเฉพาะไฟล์ PDF';
  END IF;
  IF v_type='google_drive' AND
     (NEW.external_url IS NULL OR NEW.external_url !~* '^https://(drive|docs)\.google\.com/') THEN
    RAISE EXCEPTION 'กรุณาใช้ลิงก์ Google Drive ที่ขึ้นต้นด้วย https://drive.google.com หรือ https://docs.google.com';
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_enforce_semester_lesson_attachment_channel ON public.lesson_plan_files;
CREATE TRIGGER trg_enforce_semester_lesson_attachment_channel
 BEFORE INSERT OR UPDATE OF attachment_type,external_url,lesson_plan_id ON public.lesson_plan_files
 FOR EACH ROW EXECUTE FUNCTION private.enforce_semester_lesson_attachment_channel();

-- Submission is protected at database level, including the existing signed RPC path.
-- The check runs only on a NEW submission/resubmission; approvals of previously
-- submitted documents do not fail if a setting is changed afterwards.
CREATE OR REPLACE FUNCTION private.enforce_semester_lesson_submission_channel()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $function$
DECLARE
  v_mode text;
BEGIN
  IF NEW.plan_type='semester'
     AND OLD.status IN ('draft','revision_requested')
     AND NEW.status NOT IN ('draft','revision_requested') THEN
    v_mode:=private.semester_lesson_plan_submission_mode(NEW.academic_year,NEW.semester);
    IF NOT EXISTS (
      SELECT 1 FROM public.lesson_plan_files f
      WHERE f.lesson_plan_id=NEW.id
        AND (v_mode='both' AND coalesce(f.attachment_type,'pdf') IN ('pdf','google_drive')
          OR v_mode='pdf_only' AND coalesce(f.attachment_type,'pdf')='pdf'
          OR v_mode='drive_only' AND f.attachment_type='google_drive')
    ) THEN
      RAISE EXCEPTION 'แผนรายภาคเรียนต้องมีเอกสารแนบตามช่องทางที่ฝ่ายวิชาการเปิดรับ (%).',
        CASE v_mode WHEN 'pdf_only' THEN 'PDF เท่านั้น'
                    WHEN 'drive_only' THEN 'Google Drive เท่านั้น'
                    ELSE 'PDF หรือ Google Drive' END;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_enforce_semester_lesson_submission_channel ON public.lesson_plans;
CREATE TRIGGER trg_enforce_semester_lesson_submission_channel
 BEFORE UPDATE OF status ON public.lesson_plans
 FOR EACH ROW EXECUTE FUNCTION private.enforce_semester_lesson_submission_channel();
