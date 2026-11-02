-- School-wide student options for appointed certificate preparer only.
-- Existing student-status filter and homeroom restrictions for other teachers remain.
DO $bnk$
DECLARE original_sql text;
        older text;
        updated text;
BEGIN
  older := E'or private.can_manage_academic_certificate()\n      or s.id in(select student_id from current_scope)';
  updated := E'or private.can_manage_academic_certificate()\n      or private.can_prepare_academic_certificate()\n      or s.id in(select student_id from current_scope)';
  SELECT pg_get_functiondef('public.get_certificate_request_student_options(text,integer)'::regprocedure)
    INTO original_sql;
  IF original_sql IS NULL THEN
    RAISE EXCEPTION 'Certificate student options RPC missing';
  END IF;
  IF position(updated IN original_sql)=0 THEN
    IF position(older IN original_sql)=0 THEN
      RAISE EXCEPTION 'Certificate options permission clause changed; review required';
    END IF;
    original_sql := replace(original_sql,older,updated);
    EXECUTE original_sql;
  END IF;
END
$bnk$;
