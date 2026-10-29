-- Budget request parallel acknowledgements: distinct from payment and purchasing workflows.
ALTER TABLE public.budget_disbursement_signers
  ADD COLUMN IF NOT EXISTS approved_at timestamptz;

COMMENT ON COLUMN public.budget_disbursement_signers.approved_at IS
'Individual online budget-document acknowledgement; never populated for paper signatures. Existing signatures remain pending until the owner explicitly confirms.';

CREATE OR REPLACE FUNCTION public.budget_signer_clear_approval_on_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $function$
BEGIN
  IF (NEW.user_id,NEW.method,NEW.signature_id,NEW.storage_path,NEW.signed_at)
     IS DISTINCT FROM (OLD.user_id,OLD.method,OLD.signature_id,OLD.storage_path,OLD.signed_at) THEN
    NEW.approved_at := NULL;
  END IF;
  RETURN NEW;
END;
$function$;
DROP TRIGGER IF EXISTS budget_signer_clear_approval ON public.budget_disbursement_signers;
CREATE TRIGGER budget_signer_clear_approval BEFORE UPDATE OF user_id,method,signature_id,storage_path,signed_at
ON public.budget_disbursement_signers FOR EACH ROW
EXECUTE FUNCTION public.budget_signer_clear_approval_on_change();

CREATE OR REPLACE FUNCTION public.confirm_budget_signer(
  p_disbursement_id uuid, p_slot text, p_inspection_confirmed boolean DEFAULT false
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $function$
DECLARE v_signer public.budget_disbursement_signers%ROWTYPE;
        v_status text; v_requester uuid; v_control text;
BEGIN
  IF auth.uid() IS NULL OR NOT private.is_active_user() THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  SELECT s.* INTO v_signer FROM public.budget_disbursement_signers s
   WHERE s.disbursement_id=p_disbursement_id AND s.slot=p_slot FOR UPDATE;
  IF v_signer.id IS NULL OR v_signer.user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Only the assigned signer can acknowledge this slot';
  END IF;
  SELECT status,requester_id,control_number INTO v_status,v_requester,v_control
    FROM public.budget_disbursements WHERE id=p_disbursement_id;
  IF v_status NOT IN ('document_ready','printed') OR v_status IS NULL THEN
    RAISE EXCEPTION 'Budget request is not ready for signing';
  END IF;
  IF v_signer.approved_at IS NOT NULL THEN RETURN; END IF;
  IF v_signer.slot LIKE 'inspector%' AND p_inspection_confirmed IS DISTINCT FROM TRUE THEN
    RAISE EXCEPTION 'Acceptance committee must confirm that inspection actually occurred';
  END IF;
  IF v_signer.method NOT IN ('drawn','upload','stored') OR v_signer.signed_at IS NULL
     OR v_signer.storage_path IS NULL OR v_signer.bucket_id IS NULL THEN
    RAISE EXCEPTION 'Choose and save a real electronic signature before acknowledging';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM storage.objects o
      WHERE o.bucket_id=v_signer.bucket_id AND o.name=v_signer.storage_path) THEN
    RAISE EXCEPTION 'Saved signature image does not exist';
  END IF;
  UPDATE public.budget_disbursement_signers SET approved_at=now(), updated_at=now()
   WHERE id=v_signer.id AND approved_at IS NULL;
  IF v_requester IS NOT NULL AND
     (SELECT count(*) FROM public.budget_disbursement_signers
      WHERE disbursement_id=p_disbursement_id
        AND slot IN ('requester','department_head','plan_budget','plan_staff',
                     'inspector1','inspector2','inspector3','director')
        AND approved_at IS NOT NULL)=8 THEN
    INSERT INTO public.notifications(recipient_id,type,title,message,entity_type,entity_id,action_url)
    VALUES(v_requester,'budget_signatures_complete','ผู้ลงนามใบขอเบิกครบแล้ว',
      'ผู้ลงนามครบทั้ง 8 ตำแหน่งแล้ว เลขคุม '||coalesce(v_control,'-'),
      'budget_disbursement',p_disbursement_id,'/plan-budget/projects');
  END IF;
END;
$function$;
REVOKE ALL ON FUNCTION public.confirm_budget_signer(uuid,text,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.confirm_budget_signer(uuid,text,boolean) TO authenticated;

CREATE OR REPLACE FUNCTION public.budget_signer_notify_assignment()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $function$
DECLARE v_status text; v_requester uuid; v_control text;
BEGIN
  IF NEW.user_id IS NULL OR NEW.slot='requester' OR NEW.slot LIKE 'inspector%' THEN RETURN NEW; END IF;
  IF TG_OP='UPDATE' AND NEW.user_id IS NOT DISTINCT FROM OLD.user_id THEN RETURN NEW; END IF;
  SELECT status,requester_id,control_number INTO v_status,v_requester,v_control
    FROM public.budget_disbursements WHERE id=NEW.disbursement_id;
  IF v_status IN ('document_ready','printed') AND NEW.user_id IS DISTINCT FROM v_requester THEN
    INSERT INTO public.notifications(recipient_id,type,title,message,entity_type,entity_id,action_url)
    VALUES(NEW.user_id,'budget_signer_pending','มีใบขอเบิกรอรับรอง',
      'กรุณาตรวจคำขอเบิกเลขคุม '||coalesce(v_control,'-')||
      ' และเลือกลายเซ็นเพื่อรับรองในตำแหน่ง '||NEW.signer_position,
      'budget_disbursement',NEW.disbursement_id,'/plan-budget/projects');
  END IF;
  RETURN NEW;
END;
$function$;
DROP TRIGGER IF EXISTS budget_signer_assignment_notice ON public.budget_disbursement_signers;
CREATE TRIGGER budget_signer_assignment_notice AFTER INSERT OR UPDATE OF user_id
 ON public.budget_disbursement_signers FOR EACH ROW
 EXECUTE FUNCTION public.budget_signer_notify_assignment();

CREATE OR REPLACE FUNCTION public.budget_signer_notify_ready()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $function$
DECLARE s record;
BEGIN
  IF NEW.status='document_ready' AND OLD.status IS DISTINCT FROM NEW.status THEN
    FOR s IN SELECT user_id,signer_position FROM public.budget_disbursement_signers
      WHERE disbursement_id=NEW.id AND user_id IS NOT NULL AND user_id<>NEW.requester_id LOOP
      INSERT INTO public.notifications(recipient_id,type,title,message,entity_type,entity_id,action_url)
      VALUES(s.user_id,'budget_signer_pending','ใบขอเบิกพร้อมรับรอง',
       'ใบขอเบิกเลขคุม '||coalesce(NEW.control_number,'-')||
       ' พร้อมให้ตรวจและรับรองตำแหน่ง '||s.signer_position,
       'budget_disbursement',NEW.id,'/plan-budget/projects');
    END LOOP;
  END IF;
  RETURN NEW;
END;
$function$;
DROP TRIGGER IF EXISTS budget_signer_ready_notice ON public.budget_disbursements;
CREATE TRIGGER budget_signer_ready_notice AFTER UPDATE OF status
 ON public.budget_disbursements FOR EACH ROW
 EXECUTE FUNCTION public.budget_signer_notify_ready();