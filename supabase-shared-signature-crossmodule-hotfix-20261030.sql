-- BNK SCHOOL OS v5.12.9.52 | Shared signature hardening, no data reset.
-- Fix a cross-table trigger field reference confirmed by PostgreSQL logs for budget disbursements.
-- Preserve the four signature choices, approval checks, and old per-period substitute workflow.
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
END;$fn$;

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
  SELECT EXISTS(SELECT 1 FROM public.substitute_lessons r WHERE r.id=p_document_id AND private.can_manage_substitute_lesson(r.id)) INTO v_ok;
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
END;$function$;
-- Cascade only when an authorized leave deletion occurs; parent deletion is still RLS-controlled.
-- Child periods are already cascading; historical leave deletion audit remains in deletion_audit_log.
alter table public.substitute_day_audit
 drop constraint substitute_day_audit_day_assignment_id_fkey,
 add constraint substitute_day_audit_day_assignment_id_fkey
 foreign key (day_assignment_id) references public.substitute_day_assignments(id) on delete cascade;
alter table public.substitute_day_assignments
 drop constraint substitute_day_assignments_leave_request_id_fkey,
 add constraint substitute_day_assignments_leave_request_id_fkey
 foreign key (leave_request_id) references public.leave_requests(id) on delete cascade;
-- Explicit execution permissions after CREATE OR REPLACE.
revoke all on function private.bnk_require_preaction_signature() from public,anon,authenticated;
revoke all on function public.record_bnk_action_signature(text,uuid,text,text,uuid) from public,anon;
grant execute on function public.record_bnk_action_signature(text,uuid,text,text,uuid) to authenticated;
