-- Reconsidering a rejected transfer after payment must not be treated as a second application submission.
-- Review/signature is still required by review_academic_registration_signed for the finance reviewer.
-- Only academic_transfer rejected -> submitted is exempt; all other original submission gates remain.
CREATE OR REPLACE FUNCTION private.bnk_require_preaction_signature()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
 ELSIF TG_TABLE_NAME='academic_transfer_requests' AND NEW.status='submitted' AND v_changed AND v_previous IS DISTINCT FROM 'rejected' THEN
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
 ELSIF TG_TABLE_NAME='substitute_lessons' THEN
   -- Never evaluate a substitute-only field on any other record type.
   -- INSERT is always a status transition; OLD may be absent on INSERT.
   IF NEW.status IS DISTINCT FROM 'assigned' THEN RETURN NEW; END IF;
   IF v_changed THEN
     v_code:='substitute_teaching';v_action:='assign';
   ELSIF TG_OP='UPDATE' THEN
     IF NEW.substitute_teacher_id IS NOT DISTINCT FROM OLD.substitute_teacher_id THEN RETURN NEW; END IF;
     v_code:='substitute_teaching';v_action:='assign';
   ELSE
     RETURN NEW;
   END IF;
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
END;$function$

