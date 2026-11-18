-- BNK School OS: student suspension is a non-terminal attendance follow-up marker.
-- It MUST NOT change student/enrollment lifecycle or remove names from registers.
ALTER TABLE public.student_enrollments
  ADD COLUMN IF NOT EXISTS is_suspended boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS suspension_note text,
  ADD COLUMN IF NOT EXISTS suspended_at timestamptz,
  ADD COLUMN IF NOT EXISTS suspension_updated_by uuid;

CREATE INDEX IF NOT EXISTS student_enrollments_suspended_period_idx
  ON public.student_enrollments(academic_year,semester,class_id)
  WHERE is_suspended = true;
ALTER TABLE public.student_enrollments
  DROP CONSTRAINT IF EXISTS student_enrollments_suspension_note_length;
ALTER TABLE public.student_enrollments
  ADD CONSTRAINT student_enrollments_suspension_note_length
  CHECK (char_length(coalesce(suspension_note,'')) <= 1000);

CREATE TABLE IF NOT EXISTS public.student_suspension_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id uuid NOT NULL REFERENCES public.student_enrollments(id) ON DELETE RESTRICT,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE RESTRICT,
  previous_suspended boolean NOT NULL,
  is_suspended boolean NOT NULL,
  suspension_note text,
  changed_by uuid,
  changed_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX IF NOT EXISTS student_suspension_events_student_idx
  ON public.student_suspension_events(student_id,changed_at DESC);
ALTER TABLE public.student_suspension_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS student_suspension_events_read_scope ON public.student_suspension_events;
CREATE POLICY student_suspension_events_read_scope ON public.student_suspension_events
  FOR SELECT TO authenticated
  USING (private.can_view_student(student_id));
REVOKE ALL ON public.student_suspension_events FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.student_suspension_events TO authenticated;

CREATE OR REPLACE FUNCTION private.audit_student_suspension_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $function$
BEGIN
  IF OLD.is_suspended IS DISTINCT FROM NEW.is_suspended THEN
    INSERT INTO public.student_suspension_events
      (enrollment_id,student_id,previous_suspended,is_suspended,suspension_note,changed_by)
    VALUES (NEW.id,NEW.student_id,OLD.is_suspended,NEW.is_suspended,
            NEW.suspension_note,coalesce(NEW.suspension_updated_by,auth.uid()));
  END IF;
  RETURN NEW;
END;
$function$;
REVOKE ALL ON FUNCTION private.audit_student_suspension_change() FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS trg_student_enrollment_suspension_audit ON public.student_enrollments;
CREATE TRIGGER trg_student_enrollment_suspension_audit
  AFTER UPDATE OF is_suspended ON public.student_enrollments
  FOR EACH ROW EXECUTE FUNCTION private.audit_student_suspension_change();

-- Only central academic administrators and currently assigned homeroom teachers
-- can change this isolated flag; no general UPDATE permission is added.
CREATE OR REPLACE FUNCTION public.set_student_enrollment_suspension(
  p_enrollment_id uuid,
  p_is_suspended boolean,
  p_note text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $function$
DECLARE
  v_enrollment public.student_enrollments%rowtype;
  v_actor uuid := auth.uid();
  v_is_admin boolean;
BEGIN
  IF v_actor IS NULL OR NOT private.is_active_user() THEN
    RAISE EXCEPTION 'กรุณาเข้าสู่ระบบด้วยบัญชีที่ใช้งานได้';
  END IF;
  IF p_enrollment_id IS NULL OR p_is_suspended IS NULL THEN
    RAISE EXCEPTION 'กรุณาระบุนักเรียนและสถานะแขวนลอย';
  END IF;
  IF char_length(coalesce(p_note,'')) > 1000 THEN
    RAISE EXCEPTION 'หมายเหตุยาวเกิน 1000 ตัวอักษร';
  END IF;
  SELECT * INTO v_enrollment FROM public.student_enrollments
    WHERE id = p_enrollment_id FOR UPDATE;
  IF NOT FOUND OR v_enrollment.enrollment_status <> 'active'
     OR NOT EXISTS (
       SELECT 1 FROM public.students s
       WHERE s.id = v_enrollment.student_id AND s.status = 'active'
     ) THEN
    RAISE EXCEPTION 'ไม่พบรายชื่อนักเรียนที่กำลังเรียนในทะเบียน';
  END IF;
  v_is_admin := private.can_manage_student_master();
  IF NOT v_is_admin AND NOT EXISTS (
    SELECT 1 FROM public.homeroom_teachers h
    WHERE h.class_id = v_enrollment.class_id AND h.teacher_id = v_actor
  ) THEN
    RAISE EXCEPTION 'เฉพาะครูประจำชั้นที่ได้รับมอบหมายหรือผู้ดูแลทะเบียนเท่านั้น';
  END IF;
  IF v_enrollment.is_suspended IS DISTINCT FROM p_is_suspended THEN
    UPDATE public.student_enrollments
      SET is_suspended=p_is_suspended,
          suspension_note=CASE WHEN p_is_suspended THEN nullif(btrim(p_note),'') ELSE NULL END,
          suspended_at=CASE WHEN p_is_suspended THEN clock_timestamp() ELSE NULL END,
          suspension_updated_by=v_actor,
          updated_at=clock_timestamp()
      WHERE id=p_enrollment_id;
  END IF;
  RETURN jsonb_build_object(
    'ok',true,'enrollment_id',p_enrollment_id,
    'student_id',v_enrollment.student_id,'is_suspended',p_is_suspended
  );
END;
$function$;
REVOKE ALL ON FUNCTION public.set_student_enrollment_suspension(uuid,boolean,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.set_student_enrollment_suspension(uuid,boolean,text) TO authenticated;

COMMENT ON COLUMN public.student_enrollments.is_suspended
  IS 'Non-terminal student suspension/follow-up marker; preserves active roster, student number, and lifecycle.';
COMMENT ON FUNCTION public.set_student_enrollment_suspension(uuid,boolean,text)
  IS 'Authorized homeroom/academic admin sets marker only. Does not transfer, withdraw, dispose, or create follow-up letters.';
