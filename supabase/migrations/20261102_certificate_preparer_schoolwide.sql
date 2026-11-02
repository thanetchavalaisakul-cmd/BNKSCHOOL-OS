-- Only the appointed certificate preparer gains school-wide student selection.
-- Ordinary teachers remain restricted to their classes; approval/signature rights unchanged.
CREATE OR REPLACE FUNCTION private.can_prepare_academic_certificate()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public', 'private'
AS $bnk$
  SELECT private.is_active_user()
    AND EXISTS (
      SELECT 1 FROM public.academic_certificate_settings s
      WHERE s.id=1 AND s.preparer_user_id=(SELECT auth.uid())
    );
$bnk$;
REVOKE ALL ON FUNCTION private.can_prepare_academic_certificate() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION private.can_create_certificate_request_for_period(
    p_student_id uuid, p_year text, p_sem integer)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public', 'private'
AS $bnk$
  SELECT private.is_active_user() AND (
    private.can_finalize_academic_certificate()
    OR private.can_manage_academic_certificate()
    OR private.can_prepare_academic_certificate()
    OR EXISTS (
      SELECT 1 FROM public.student_enrollments e
      WHERE e.student_id=p_student_id
        AND e.academic_year=p_year
        AND e.semester=p_sem
        AND e.enrollment_status='active'
        AND private.can_manage_student_class(e.class_id)
    )
  );
$bnk$;

-- The original save RPC already enforces student existence and current enrollment.
-- Permit the designated preparer to process a former-student request too.
-- Preserve all other validation, creation, editing and signing rules verbatim.
DO $bnk$
DECLARE old_clause text;
        new_clause text;
        definition text;
BEGIN
  old_clause := 'if v_type=''former'' and not (private.can_manage_academic_certificate() or private.can_finalize_academic_certificate()) then';
  new_clause := 'if v_type=''former'' and not (private.can_manage_academic_certificate() or private.can_finalize_academic_certificate() or private.can_prepare_academic_certificate()) then';
  SELECT pg_get_functiondef('public.save_academic_certificate_request(uuid,jsonb)'::regprocedure)
    INTO definition;
  IF definition IS NULL THEN
    RAISE EXCEPTION 'Certificate save RPC missing';
  END IF;
  IF position(new_clause IN definition)=0 THEN
    IF position(old_clause IN definition)=0 THEN
      RAISE EXCEPTION 'Certificate former-student role gate has changed; review required';
    END IF;
    definition := replace(definition,old_clause,new_clause);
    EXECUTE definition;
  END IF;
END
$bnk$;
