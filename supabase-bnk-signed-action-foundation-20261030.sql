-- BNK v5.12.9.48 foundation: applied to production before shipping UI.
CREATE TABLE IF NOT EXISTS public.bnk_action_signatures(
 system_code text NOT NULL REFERENCES public.approval_system_registry(system_code),
 document_id uuid NOT NULL, action_code text NOT NULL, actor_user_id uuid NOT NULL,
 method text NOT NULL CHECK(method IN('paper','drawn','upload','stored')),
 signature_id uuid,bucket_id text,storage_path text,selected_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(system_code,document_id,action_code,actor_user_id),
 CHECK((method='paper' AND signature_id IS NULL AND storage_path IS NULL) OR
 (method<>'paper' AND signature_id IS NOT NULL AND storage_path IS NOT NULL))
);
ALTER TABLE public.bnk_action_signatures ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.bnk_action_signatures FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.bnk_action_signatures TO authenticated;
DROP POLICY IF EXISTS bnk_action_signature_owner_read ON public.bnk_action_signatures;
CREATE POLICY bnk_action_signature_owner_read ON public.bnk_action_signatures FOR SELECT TO authenticated USING(actor_user_id=(select auth.uid()));
CREATE OR REPLACE FUNCTION public.assign_bnk_substitute_signed(p_substitute_lesson_id uuid, p_teacher_id uuid, p_note text, p_method text, p_signature_id uuid DEFAULT NULL::uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
 PERFORM public.record_bnk_action_signature('substitute_teaching',p_substitute_lesson_id,'assign',p_method,p_signature_id);
 PERFORM public.assign_substitute_teacher(p_substitute_lesson_id,p_teacher_id,p_note);
END;$function$
;
CREATE OR REPLACE FUNCTION public.record_bnk_action_signature(p_system_code text, p_document_id uuid, p_action_code text, p_method text, p_signature_id uuid DEFAULT NULL::uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE v_uid uuid:=auth.uid(); v_master public.signatures%ROWTYPE; v_ok boolean:=false;
BEGIN
 IF v_uid IS NULL OR NOT private.is_active_user() OR p_document_id IS NULL THEN
  RAISE EXCEPTION 'Authentication and document are required';
 END IF;
 IF p_method NOT IN('paper','drawn','upload','stored') THEN RAISE EXCEPTION 'Please select a valid signing method'; END IF;
 CASE
 WHEN p_system_code='lesson_plans' AND p_action_code='submit' THEN
  SELECT EXISTS(SELECT 1 FROM public.lesson_plans r WHERE r.id=p_document_id AND r.teacher_id=v_uid AND r.status IN('draft','revision_requested')) INTO v_ok;
 WHEN p_system_code='academic_certificate' AND p_action_code='submit' THEN
  SELECT EXISTS(SELECT 1 FROM public.academic_certificate_requests r WHERE r.id=p_document_id AND r.created_by=v_uid AND r.status='draft') INTO v_ok;
 WHEN p_system_code='academic_document_service' AND p_action_code='submit' THEN
  SELECT EXISTS(SELECT 1 FROM public.academic_document_service_requests r WHERE r.id=p_document_id AND r.created_by=v_uid AND r.status='draft') INTO v_ok;
 WHEN p_system_code='academic_transfer' AND p_action_code='submit' THEN
  SELECT EXISTS(SELECT 1 FROM public.academic_transfer_requests r WHERE r.id=p_document_id AND r.created_by=v_uid AND r.status='draft') INTO v_ok;
 WHEN p_system_code='personnel_pa' AND p_action_code='pa_start' THEN
  SELECT EXISTS(SELECT 1 FROM public.personnel_pa_submissions r WHERE r.id=p_document_id AND r.user_id=v_uid AND r.status IN('draft','submitted')) INTO v_ok;
 WHEN p_system_code='personnel_pa' AND p_action_code='pa_end' THEN
  SELECT EXISTS(SELECT 1 FROM public.personnel_pa_reports r WHERE r.id=p_document_id AND r.user_id=v_uid AND r.status IN('draft','submitted')) INTO v_ok;
 WHEN p_system_code='personnel_pa' AND p_action_code='pa_assess' THEN
  SELECT EXISTS(SELECT 1 FROM public.personnel_pa_assessments r JOIN public.personnel_pa_period_committee_members cm ON cm.id=r.committee_member_id WHERE r.id=p_document_id AND cm.evaluator_user_id=v_uid AND r.status='draft') INTO v_ok;
 WHEN p_system_code='home_visit' AND p_action_code='complete' THEN
  SELECT EXISTS(SELECT 1 FROM public.home_visit_records r WHERE r.id=p_document_id AND r.status='draft' AND private.can_edit_home_visit_record(r.id)) INTO v_ok;
 WHEN p_system_code='budget_disbursement' AND p_action_code='document_ready' THEN
  SELECT EXISTS(SELECT 1 FROM public.budget_disbursements r WHERE r.id=p_document_id AND r.requester_id=v_uid AND r.status='draft') INTO v_ok;
 WHEN p_system_code='substitute_teaching' AND p_action_code='assign' THEN
  SELECT EXISTS(SELECT 1 FROM public.substitute_lessons r WHERE r.id=p_document_id) INTO v_ok;
 ELSE RAISE EXCEPTION 'Unsupported signature action for this system';
 END CASE;
 IF NOT v_ok THEN RAISE EXCEPTION 'You cannot sign this document at the current stage'; END IF;
 IF p_method='paper' THEN
  IF p_signature_id IS NOT NULL THEN RAISE EXCEPTION 'Paper signing must not attach a digital image'; END IF;
 ELSE
  IF p_signature_id IS NULL THEN RAISE EXCEPTION 'Please select or create your personal signature'; END IF;
  SELECT * INTO v_master FROM public.signatures s WHERE s.id=p_signature_id AND s.user_id=v_uid;
  IF v_master.id IS NULL OR v_master.bucket_id<>'signatures' OR v_master.storage_path IS NULL
   OR NOT EXISTS(SELECT 1 FROM storage.objects o WHERE o.bucket_id=v_master.bucket_id AND o.name=v_master.storage_path)
  THEN RAISE EXCEPTION 'Signed-in user does not own a valid signature image'; END IF;
  IF p_method IN('drawn','upload') AND v_master.source IS DISTINCT FROM p_method
  THEN RAISE EXCEPTION 'Signature source must match the chosen method'; END IF;
 END IF;
 INSERT INTO public.bnk_action_signatures(system_code,document_id,action_code,actor_user_id,method,signature_id,bucket_id,storage_path,selected_at)
 VALUES(p_system_code,p_document_id,p_action_code,v_uid,p_method,
  CASE WHEN p_method='paper' THEN NULL ELSE v_master.id END,
  CASE WHEN p_method='paper' THEN NULL ELSE v_master.bucket_id END,
  CASE WHEN p_method='paper' THEN NULL ELSE v_master.storage_path END,now())
 ON CONFLICT(system_code,document_id,action_code,actor_user_id) DO UPDATE SET
  method=EXCLUDED.method,signature_id=EXCLUDED.signature_id,bucket_id=EXCLUDED.bucket_id,
  storage_path=EXCLUDED.storage_path,selected_at=EXCLUDED.selected_at;
END;$function$
;
CREATE OR REPLACE FUNCTION public.submit_bnk_document_signed(p_system_code text, p_document_id uuid, p_method text, p_signature_id uuid DEFAULT NULL::uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
 PERFORM public.record_bnk_action_signature(p_system_code,p_document_id,'submit',p_method,p_signature_id);
 CASE p_system_code
 WHEN 'lesson_plans' THEN PERFORM public.submit_lesson_plan(p_document_id);
 WHEN 'academic_certificate' THEN PERFORM public.submit_academic_certificate_request(p_document_id);
 WHEN 'academic_document_service' THEN PERFORM public.submit_academic_document_service_request(p_document_id);
 WHEN 'academic_transfer' THEN PERFORM public.submit_academic_transfer_request(p_document_id);
 ELSE RAISE EXCEPTION 'Unsupported signed document submission';
 END CASE;
END;$function$
;
REVOKE ALL ON FUNCTION public.record_bnk_action_signature(text,uuid,text,text,uuid) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.submit_bnk_document_signed(text,uuid,text,uuid) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.assign_bnk_substitute_signed(uuid,uuid,text,text,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.record_bnk_action_signature(text,uuid,text,text,uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_bnk_document_signed(text,uuid,text,uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.assign_bnk_substitute_signed(uuid,uuid,text,text,uuid) TO authenticated;
