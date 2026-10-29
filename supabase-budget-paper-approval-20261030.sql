-- Decision and signature execution are separate events.
-- PAPER: the assigned person approves/acknowledges the document, but has not yet signed a physical sheet.
-- ELECTRONIC: requires its existing stored image; never invent a signature on paper.
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
  IF v_signer.method='paper' THEN
    IF v_signer.signed_at IS NOT NULL OR v_signer.signature_id IS NOT NULL
       OR v_signer.storage_path IS NOT NULL THEN
      RAISE EXCEPTION 'Paper approval must not include an electronic signature';
    END IF;
  ELSE
    IF v_signer.method NOT IN ('drawn','upload','stored') OR v_signer.signed_at IS NULL
       OR v_signer.storage_path IS NULL OR v_signer.bucket_id IS NULL THEN
      RAISE EXCEPTION 'Choose and save a real electronic signature before acknowledging';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM storage.objects o
      WHERE o.bucket_id=v_signer.bucket_id AND o.name=v_signer.storage_path) THEN
      RAISE EXCEPTION 'Saved signature image does not exist';
    END IF;
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
    VALUES(v_requester,'budget_signatures_complete','ผู้ลงนามรับรองใบขอเบิกครบแล้ว',
      'รับรองครบทั้ง 8 ตำแหน่งแล้ว เลขคุม '||coalesce(v_control,'-')||
      ' (ผู้ที่เลือกกระดาษยังต้องลงลายเซ็นจริงในเอกสาร)',
      'budget_disbursement',p_disbursement_id,'/plan-budget/projects');
  END IF;
END;
$function$;

REVOKE ALL ON FUNCTION public.confirm_budget_signer(uuid,text,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.confirm_budget_signer(uuid,text,boolean) TO authenticated;
COMMENT ON FUNCTION public.confirm_budget_signer(uuid,text,boolean)
 IS 'Assigned authenticated signer explicitly records a document decision. Paper approval stores approved_at while leaving signed_at null and PDF blank; electronic signatures require a valid stored asset.';
