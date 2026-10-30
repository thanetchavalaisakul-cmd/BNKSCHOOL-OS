-- BNK School OS v5.12.9.48: enforce pre-action signatures on all nine adapted workflows.
-- Foundation (bnk_action_signatures, record_bnk_action_signature,
-- submit_bnk_document_signed and assign_bnk_substitute_signed) is applied separately.
CREATE OR REPLACE FUNCTION private.bnk_require_preaction_signature()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $fn$
DECLARE s public.bnk_action_signatures%ROWTYPE;
        v_code text;
        v_action text;
        v_previous text;
        v_changed boolean;
BEGIN
 IF TG_OP='INSERT' THEN
   v_previous:=NULL;
   v_changed:=true;
 ELSE
   v_previous:=OLD.status;
   v_changed:=NEW.status IS DISTINCT FROM OLD.status;
 END IF;
 IF TG_TABLE_NAME='lesson_plans' AND NEW.status='pending_head' AND v_changed THEN
   v_code:='lesson_plans';v_action:='submit';
 ELSIF TG_TABLE_NAME='academic_certificate_requests' AND NEW.status='submitted' AND v_changed THEN
   v_code:='academic_certificate';v_action:='submit';
 ELSIF TG_TABLE_NAME='academic_document_service_requests' AND NEW.status='submitted' AND v_changed THEN
   v_code:='academic_document_service';v_action:='submit';
 ELSIF TG_TABLE_NAME='academic_transfer_requests' AND NEW.status='submitted' AND v_changed THEN
   v_code:='academic_transfer';v_action:='submit';
 ELSIF TG_TABLE_NAME='personnel_pa_submissions' AND NEW.status='submitted' AND v_changed THEN
   v_code:='personnel_pa';v_action:='pa_start';
 ELSIF TG_TABLE_NAME='personnel_pa_reports' AND NEW.status='submitted' AND v_changed THEN
   v_code:='personnel_pa';v_action:='pa_end';
 ELSIF TG_TABLE_NAME='personnel_pa_assessments' AND NEW.status='submitted' AND v_changed THEN
   v_code:='personnel_pa';v_action:='pa_assess';
 ELSIF TG_TABLE_NAME='home_visit_records' AND NEW.status='complete' AND v_changed THEN
   v_code:='home_visit';v_action:='complete';
 ELSIF TG_TABLE_NAME='budget_disbursements' AND NEW.status='document_ready' AND v_changed THEN
   v_code:='budget_disbursement';v_action:='document_ready';
 ELSIF TG_TABLE_NAME='substitute_lessons' AND NEW.status='assigned'
   AND (v_changed OR (TG_OP='UPDATE' AND NEW.substitute_teacher_id IS DISTINCT FROM OLD.substitute_teacher_id)) THEN
   v_code:='substitute_teaching';v_action:='assign';
 ELSE
   RETURN NEW;
 END IF;
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authenticated signer required'; END IF;
 SELECT * INTO s FROM public.bnk_action_signatures a
 WHERE a.system_code=v_code AND a.document_id=NEW.id AND a.action_code=v_action
 AND a.actor_user_id=auth.uid();
 IF s.actor_user_id IS NULL OR s.method NOT IN('paper','stored','drawn','upload') THEN
   RAISE EXCEPTION 'กรุณาเลือกวิธีลงลายเซ็นก่อนส่งงานหรืออนุมัติ (% / %)',v_code,v_action;
 END IF;
 IF TG_TABLE_NAME='personnel_pa_submissions' OR TG_TABLE_NAME='personnel_pa_reports' THEN
   NEW.teacher_signature_id_snapshot:=s.signature_id;
   NEW.teacher_signature_bucket_snapshot:=s.bucket_id;
   NEW.teacher_signature_path_snapshot:=s.storage_path;
   NEW.teacher_signature_source_snapshot:=s.method;
   NEW.teacher_signed_at:=CASE WHEN s.method='paper' THEN NULL ELSE s.selected_at END;
 ELSIF TG_TABLE_NAME='personnel_pa_assessments' THEN
   NEW.evaluator_signature_bucket_snapshot:=s.bucket_id;
   NEW.evaluator_signature_path_snapshot:=s.storage_path;
   NEW.evaluator_signature_method_snapshot:=s.method;
   NEW.evaluator_signature_mime_snapshot:=CASE WHEN s.method='paper' THEN NULL ELSE
     (SELECT COALESCE(NULLIF(o.metadata->>'mimetype',''),'image/png')
      FROM storage.objects o WHERE o.bucket_id=s.bucket_id AND o.name=s.storage_path LIMIT 1) END;
 END IF;
 RETURN NEW;
END;$fn$;

DO $do$
DECLARE tab text;
BEGIN
 FOREACH tab IN ARRAY ARRAY[
  'lesson_plans','academic_certificate_requests','academic_document_service_requests','academic_transfer_requests',
  'personnel_pa_submissions','personnel_pa_reports','personnel_pa_assessments',
  'home_visit_records','budget_disbursements','substitute_lessons'] LOOP
   EXECUTE format('DROP TRIGGER IF EXISTS zz_bnk_signed_action_gate ON public.%I',tab);
   EXECUTE format('CREATE TRIGGER zz_bnk_signed_action_gate BEFORE INSERT OR UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION private.bnk_require_preaction_signature()',tab);
 END LOOP;
END;$do$;

-- Mark the requester's original signature as acknowledged when the request enters document_ready.
CREATE OR REPLACE FUNCTION private.bnk_budget_requester_signature_snapshot()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $fn$
DECLARE sig public.bnk_action_signatures%ROWTYPE;
BEGIN
 IF NEW.status='document_ready' AND OLD.status IS DISTINCT FROM NEW.status THEN
   SELECT * INTO sig FROM public.bnk_action_signatures
   WHERE system_code='budget_disbursement' AND document_id=NEW.id
     AND action_code='document_ready' AND actor_user_id=NEW.requester_id;
   IF sig.actor_user_id IS NULL THEN RAISE EXCEPTION 'Requester signature choice is missing'; END IF;
   UPDATE public.budget_disbursement_signers SET
     method=sig.method,signature_id=sig.signature_id,bucket_id=sig.bucket_id,
     storage_path=sig.storage_path,
     signed_at=CASE WHEN sig.method='paper' THEN NULL ELSE sig.selected_at END,
     approved_at=now(),updated_at=now()
   WHERE disbursement_id=NEW.id AND slot='requester' AND user_id=NEW.requester_id;
 END IF;
 RETURN NEW;
END;$fn$;
DROP TRIGGER IF EXISTS zz_bnk_budget_requester_signature_snapshot ON public.budget_disbursements;
CREATE TRIGGER zz_bnk_budget_requester_signature_snapshot
 AFTER UPDATE OF status ON public.budget_disbursements FOR EACH ROW
 EXECUTE FUNCTION private.bnk_budget_requester_signature_snapshot();

-- When a record is completed by its teacher, use the explicit personal choice in the PDF.
CREATE OR REPLACE FUNCTION private.bnk_home_visit_teacher_signature_snapshot()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $fn$
DECLARE sig public.bnk_action_signatures%ROWTYPE;
BEGIN
 IF NEW.status='complete' AND OLD.status IS DISTINCT FROM NEW.status
   AND auth.uid() IN(NEW.homeroom_teacher_id,NEW.recorder_id) THEN
   SELECT * INTO sig FROM public.bnk_action_signatures WHERE system_code='home_visit'
    AND document_id=NEW.id AND action_code='complete' AND actor_user_id=auth.uid();
   IF sig.actor_user_id IS NOT NULL THEN
     INSERT INTO public.home_visit_signatures(record_id,signer_type,signer_name,signer_position,
       method,signature_id,bucket_id,storage_path,signed_by_user_id,signed_at)
     SELECT NEW.id,'teacher',COALESCE(NULLIF(p.full_name,''),p.email),'ครูผู้เยี่ยมบ้าน',
       sig.method,sig.signature_id,sig.bucket_id,sig.storage_path,
       CASE WHEN sig.method='paper' THEN NULL ELSE auth.uid() END,
       CASE WHEN sig.method='paper' THEN NULL ELSE sig.selected_at END
     FROM public.profiles p WHERE p.id=auth.uid()
     ON CONFLICT(record_id,signer_type) DO UPDATE SET method=EXCLUDED.method,signature_id=EXCLUDED.signature_id,
       bucket_id=EXCLUDED.bucket_id,storage_path=EXCLUDED.storage_path,
       signer_name=EXCLUDED.signer_name,signed_by_user_id=EXCLUDED.signed_by_user_id,
       signed_at=EXCLUDED.signed_at;
   END IF;
 END IF;
 RETURN NEW;
END;$fn$;
DROP TRIGGER IF EXISTS zz_bnk_home_visit_teacher_snapshot ON public.home_visit_records;
CREATE TRIGGER zz_bnk_home_visit_teacher_snapshot AFTER UPDATE OF status ON public.home_visit_records
 FOR EACH ROW EXECUTE FUNCTION private.bnk_home_visit_teacher_signature_snapshot();

-- Old individual review endpoints must not bypass the atomic four-method workflow.
REVOKE EXECUTE ON FUNCTION public.set_academic_certificate_review(uuid,text,text,text) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.set_academic_document_service_review(uuid,text,text,text) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.set_academic_transfer_review(uuid,text,text,text,text,numeric) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.submit_lesson_plan(uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.submit_academic_certificate_request(uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.submit_academic_document_service_request(uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.submit_academic_transfer_request(uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.assign_substitute_teacher(uuid,uuid,text) FROM authenticated;
