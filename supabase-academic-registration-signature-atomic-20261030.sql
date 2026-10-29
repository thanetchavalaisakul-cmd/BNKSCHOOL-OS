-- Central signature adapter for three student registration approval documents.
-- An approved/rejected decision and its chosen signature method commit atomically.
-- Preserves existing per-slot authorization, sequential workflow, and paper-signature semantics.
ALTER TABLE public.academic_certificate_request_signatures DROP CONSTRAINT IF EXISTS academic_certificate_request_signatures_method_check;
ALTER TABLE public.academic_certificate_request_signatures ADD CONSTRAINT academic_certificate_request_signatures_method_check
  CHECK (method IN ('paper','drawn','upload','stored'));
ALTER TABLE public.academic_certificate_request_signatures DROP CONSTRAINT IF EXISTS academic_certificate_signature_asset;
ALTER TABLE public.academic_certificate_request_signatures ADD CONSTRAINT academic_certificate_signature_asset
  CHECK ((method='paper' AND storage_path IS NULL) OR (method IN ('drawn','upload','stored') AND storage_path IS NOT NULL));

ALTER TABLE public.academic_document_service_signatures DROP CONSTRAINT IF EXISTS academic_document_service_signatures_method_check;
ALTER TABLE public.academic_document_service_signatures ADD CONSTRAINT academic_document_service_signatures_method_check
  CHECK (method IN ('paper','drawn','upload','stored'));

ALTER TABLE public.academic_transfer_request_signatures DROP CONSTRAINT IF EXISTS academic_transfer_request_signatures_method_check;
ALTER TABLE public.academic_transfer_request_signatures ADD CONSTRAINT academic_transfer_request_signatures_method_check
  CHECK (method IN ('paper','drawn','upload','stored'));
ALTER TABLE public.academic_transfer_request_signatures DROP CONSTRAINT IF EXISTS academic_transfer_signature_asset;
ALTER TABLE public.academic_transfer_request_signatures ADD CONSTRAINT academic_transfer_signature_asset
  CHECK ((method='paper' AND storage_path IS NULL) OR (method IN ('drawn','upload','stored') AND storage_path IS NOT NULL));

CREATE OR REPLACE FUNCTION public.review_academic_registration_signed(
  p_system_code text,p_request_id uuid,p_slot text,p_decision text,p_reason text,
  p_method text,p_storage_path text DEFAULT NULL,p_signature_id uuid DEFAULT NULL,
  p_finance_status text DEFAULT NULL,p_finance_amount_due numeric DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $function$
DECLARE v_master public.signatures%ROWTYPE; v_prefix text; v_table text;
BEGIN
  IF auth.uid() IS NULL OR NOT private.is_active_user() THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  IF p_system_code NOT IN ('academic_certificate','academic_document_service','academic_transfer')
    OR p_method NOT IN ('paper','drawn','upload','stored')
    OR p_decision NOT IN ('pending','approve','reject') THEN
    RAISE EXCEPTION 'Unsupported system, decision, or signature method';
  END IF;
  IF p_system_code='academic_certificate' THEN
    IF NOT private.can_review_certificate_request_slot(p_request_id,p_slot) THEN RAISE EXCEPTION 'Not authorized to review certificate'; END IF;
    v_prefix:='certificate-signatures';v_table:='academic_certificate_request_signatures';
  ELSIF p_system_code='academic_document_service' THEN
    IF NOT private.can_review_academic_document_service_slot(p_request_id,p_slot) THEN RAISE EXCEPTION 'Not authorized to review document service'; END IF;
    v_prefix:='document-service-signatures';v_table:='academic_document_service_signatures';
  ELSE
    IF NOT private.can_review_transfer_request_slot(p_request_id,p_slot) THEN RAISE EXCEPTION 'Not authorized to review transfer'; END IF;
    v_prefix:='transfer-signatures';v_table:='academic_transfer_request_signatures';
  END IF;
  IF p_method='paper' THEN
    IF p_storage_path IS NOT NULL OR p_signature_id IS NOT NULL THEN
      RAISE EXCEPTION 'Paper approval must have no electronic signature';
    END IF;
  ELSIF p_method='stored' THEN
    IF p_storage_path IS NOT NULL OR p_signature_id IS NULL THEN RAISE EXCEPTION 'Choose one saved signature'; END IF;
    SELECT * INTO v_master FROM public.signatures s
     WHERE s.id=p_signature_id AND s.user_id=auth.uid();
    IF v_master.id IS NULL OR v_master.bucket_id IS NULL OR v_master.storage_path IS NULL
     OR NOT EXISTS (SELECT 1 FROM storage.objects o
        WHERE o.bucket_id=v_master.bucket_id AND o.name=v_master.storage_path) THEN
      RAISE EXCEPTION 'Saved signature is invalid or is not yours';
    END IF;
  ELSE
    IF p_signature_id IS NOT NULL OR p_storage_path IS NULL
       OR split_part(p_storage_path,'/',1)<>v_prefix
       OR split_part(p_storage_path,'/',2)<>p_request_id::text
       OR split_part(p_storage_path,'/',3)<>p_slot
       OR NOT EXISTS(SELECT 1 FROM storage.objects o
         WHERE o.bucket_id='academic-registration' AND o.name=p_storage_path) THEN
      RAISE EXCEPTION 'New signature asset is missing or not attached to this request and slot';
    END IF;
  END IF;

  -- Existing permission-aware workflow action and signature write run in ONE transaction.
  -- If any later validation/save fails, the review decision is rolled back.
  IF p_system_code='academic_certificate' THEN
    PERFORM public.set_academic_certificate_review(p_request_id,p_slot,p_decision,p_reason);
    PERFORM public.set_academic_certificate_signature(p_request_id,p_slot,
      CASE WHEN p_method='stored' THEN 'upload' ELSE p_method END,
      CASE WHEN p_method='stored' THEN v_master.storage_path ELSE p_storage_path END);
  ELSIF p_system_code='academic_document_service' THEN
    PERFORM public.set_academic_document_service_review(p_request_id,p_slot,p_decision,p_reason);
    PERFORM public.set_academic_document_service_signature(p_request_id,p_slot,
      CASE WHEN p_method='stored' THEN 'upload' ELSE p_method END,
      CASE WHEN p_method='stored' THEN v_master.storage_path ELSE p_storage_path END);
  ELSE
    PERFORM public.set_academic_transfer_review(p_request_id,p_slot,p_decision,p_reason,p_finance_status,p_finance_amount_due);
    PERFORM public.set_academic_transfer_signature(p_request_id,p_slot,
      CASE WHEN p_method='stored' THEN 'upload' ELSE p_method END,
      CASE WHEN p_method='stored' THEN v_master.storage_path ELSE p_storage_path END);
  END IF;

  IF p_method='stored' THEN
    EXECUTE format('UPDATE public.%I SET method=$1,bucket=$2,storage_path=$3,master_signature_id=$4,automatic=false,updated_at=now() WHERE request_id=$5 AND signer_slot=$6 AND signer_user_id=auth.uid()',v_table)
    USING 'stored',v_master.bucket_id,v_master.storage_path,v_master.id,p_request_id,p_slot;
  END IF;
END;
$function$;

REVOKE ALL ON FUNCTION public.review_academic_registration_signed(text,uuid,text,text,text,text,text,uuid,text,numeric) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.review_academic_registration_signed(text,uuid,text,text,text,text,text,uuid,text,numeric) TO authenticated;
COMMENT ON FUNCTION public.review_academic_registration_signed(text,uuid,text,text,text,text,text,uuid,text,numeric)
  IS 'Atomic review and four-method signature for three registration systems; uses existing role checks and exact signed document. Paper means approved/reviewed but physical signature pending.';

-- A viewer of the *document* may download only the saved signature explicitly bound to it.
DROP POLICY IF EXISTS academic_registration_master_signature_asset_read ON storage.objects;
CREATE POLICY academic_registration_master_signature_asset_read ON storage.objects FOR SELECT TO authenticated
USING (
 bucket_id='signatures' AND (
   EXISTS (SELECT 1 FROM public.academic_certificate_request_signatures sg
     WHERE sg.method='stored' AND sg.bucket=objects.bucket_id AND sg.storage_path=objects.name
       AND private.can_view_certificate_request(sg.request_id))
   OR EXISTS (SELECT 1 FROM public.academic_document_service_signatures sg
     WHERE sg.method='stored' AND sg.bucket=objects.bucket_id AND sg.storage_path=objects.name
       AND private.can_view_academic_document_service_request(sg.request_id))
   OR EXISTS (SELECT 1 FROM public.academic_transfer_request_signatures sg
     WHERE sg.method='stored' AND sg.bucket=objects.bucket_id AND sg.storage_path=objects.name
       AND private.can_view_transfer_request(sg.request_id))
 )
);
