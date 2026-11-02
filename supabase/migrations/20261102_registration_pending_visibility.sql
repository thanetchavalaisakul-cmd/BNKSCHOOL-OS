-- Production applied as bnk_approval_visibility_independent_of_sequence_20261102.
-- Assigned users see submitted/approved/rejected requests even before their own approval step.
-- This does NOT permit approval out of sequence.
CREATE OR REPLACE FUNCTION private.can_view_registration_assigned_workflow(p_system text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public', 'private'
AS $bnk$
 SELECT private.is_active_user() AND (
  (p_system='academic_transfer' AND EXISTS(
    SELECT 1 FROM public.academic_registration_settings s WHERE s.id=1
    AND (s.finance_user_id=auth.uid() OR s.registrar_user_id=auth.uid()
      OR s.assessment_user_id=auth.uid() OR s.director_user_id=auth.uid())))
  OR (p_system='academic_certificate' AND EXISTS(
    SELECT 1 FROM public.academic_certificate_settings s WHERE s.id=1
    AND (s.preparer_user_id=auth.uid() OR s.registrar_user_id=auth.uid()
      OR s.director_user_id=auth.uid())))
  OR (p_system='academic_document_service' AND EXISTS(
    SELECT 1 FROM public.academic_document_service_settings s WHERE s.id=1
    AND (s.assessment_user_id=auth.uid() OR s.registrar_user_id=auth.uid()
      OR s.director_user_id=auth.uid())))
  OR (p_system IN ('academic_transfer','academic_certificate','academic_document_service')
    AND EXISTS(SELECT 1 FROM public.approval_executives e
      WHERE e.user_id=auth.uid() AND e.is_active=true
        AND e.executive_kind IN ('director','acting_director')))
 );
$bnk$;
REVOKE ALL ON FUNCTION private.can_view_registration_assigned_workflow(text) FROM PUBLIC,anon,authenticated;

DO $bnk$
DECLARE rec record; def text; needle text; replacement text;
BEGIN
 FOR rec IN SELECT * FROM (VALUES
  ('private.can_view_transfer_request(uuid)','academic_transfer', 'or private.can_review_transfer_request_slot(r.id,''director'')'),
  ('private.can_view_certificate_request(uuid)','academic_certificate','or private.can_review_certificate_request_slot(r.id,''director'')'),
  ('private.can_view_academic_document_service_request(uuid)','academic_document_service','or private.can_review_academic_document_service_slot(r.id,''director'')')
 ) r(signature,system_code,original_clause)
 LOOP
  SELECT pg_get_functiondef(to_regprocedure(rec.signature)) INTO def;
  IF def IS NULL THEN RAISE EXCEPTION 'Missing %', rec.signature; END IF;
  needle:=rec.original_clause;
  replacement:=needle||E'\n      or (r.status in (''submitted'',''approved'',''rejected'') and private.can_view_registration_assigned_workflow('''||rec.system_code||'''))';
  IF position(replacement IN def)>0 THEN CONTINUE; END IF;
  IF position(needle IN def)=0 THEN RAISE EXCEPTION 'Visibility predicate drift in %',rec.signature; END IF;
  def:=replace(def,needle,replacement);
  EXECUTE def;
 END LOOP;
END $bnk$;
