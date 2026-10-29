
-- Workflow-bound signing. Action and signature commit or roll back together.
CREATE OR REPLACE FUNCTION public.submit_leave_request_signed(
  p_leave_request_id uuid,p_method text,p_signature uuid DEFAULT NULL
) RETURNS public.leave_requests
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
DECLARE v public.leave_requests;
BEGIN
  -- Existing leave submit RPC keeps its full actor validation and notification flow.
  v:=public.submit_leave_request(p_leave_request_id);
  PERFORM public.set_school_document_signature('leave',v.id,NULL,'requester',p_method,p_signature);
  UPDATE public.school_document_signatures SET automatic=false
    WHERE document_kind='leave' AND document_id=v.id AND slot_code='requester';
  RETURN v;
END; $$;

CREATE OR REPLACE FUNCTION public.personnel_review_leave_request_signed(
  p_leave_request_id uuid,p_decision text,p_comment text,
  p_method text,p_signature uuid DEFAULT NULL
) RETURNS public.leave_requests
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
DECLARE v public.leave_requests;
BEGIN
  -- Existing review decides first, then the same transaction binds the reviewer's signature.
  v:=public.personnel_review_leave_request(p_leave_request_id,p_decision,p_comment);
  PERFORM public.set_school_document_signature('leave',v.id,NULL,'personnel_head',p_method,p_signature);
  UPDATE public.school_document_signatures SET automatic=false
    WHERE document_kind='leave' AND document_id=v.id AND slot_code='personnel_head';
  RETURN v;
END; $$;

CREATE OR REPLACE FUNCTION public.director_review_leave_request_signed(
  p_leave_request_id uuid,p_decision text,p_comment text,
  p_method text,p_signature uuid DEFAULT NULL
) RETURNS public.leave_requests
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
DECLARE v public.leave_requests;
BEGIN
  v:=public.director_review_leave_request(p_leave_request_id,p_decision,p_comment);
  PERFORM public.set_school_document_signature('leave',v.id,NULL,'director',p_method,p_signature);
  UPDATE public.school_document_signatures SET automatic=false
    WHERE document_kind='leave' AND document_id=v.id AND slot_code='director';
  -- Maintain the legacy PDF and approval signature reference for signed approvals,
  -- while deliberately not treating a paper choice as a digital signature.
  IF p_method<>'paper' THEN
    UPDATE public.leave_requests SET director_signature_id=p_signature WHERE id=v.id;
  END IF;
  RETURN (SELECT r FROM public.leave_requests r WHERE r.id=v.id);
END; $$;

ALTER TABLE public.school_document_signatures
  ADD COLUMN IF NOT EXISTS accepted_at timestamptz;

CREATE OR REPLACE FUNCTION public.confirm_substitute_teacher_signed(
  p_substitute_lesson_id uuid,p_method text,p_signature uuid DEFAULT NULL
) RETURNS public.school_document_signatures
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
DECLARE v public.substitute_lessons; v_sig public.signatures; v_row public.school_document_signatures;
BEGIN
  IF auth.uid() IS NULL OR NOT private.is_active_user() THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE='42501'; END IF;
  SELECT * INTO v FROM public.substitute_lessons
    WHERE id=p_substitute_lesson_id FOR UPDATE;
  IF v.id IS NULL OR v.status<>'assigned' OR v.substitute_teacher_id<>auth.uid() THEN
    RAISE EXCEPTION 'Only the assigned teacher may confirm this substitute lesson'
      USING ERRCODE='42501';
  END IF;
  IF p_method NOT IN ('paper','stored','drawn','upload') THEN
    RAISE EXCEPTION 'Invalid signature method'; END IF;
  IF p_method='paper' THEN
    IF p_signature IS NOT NULL THEN RAISE EXCEPTION 'Paper signature must not include image'; END IF;
  ELSE
    SELECT * INTO v_sig FROM public.signatures
      WHERE id=p_signature AND user_id=auth.uid();
    IF v_sig.id IS NULL THEN
      RAISE EXCEPTION 'Signature must belong to the assigned teacher' USING ERRCODE='42501'; END IF;
    IF p_method IN ('drawn','upload') AND v_sig.source<>p_method THEN
      RAISE EXCEPTION 'Signature source mismatch'; END IF;
  END IF;
  INSERT INTO public.school_document_signatures (
    document_kind,document_id,document_date,slot_code,signer_user_id,
    method,signature_id,signed_at,accepted_at,automatic
  ) VALUES (
    'substitute',v.leave_request_id,v.leave_date,'substitute:'||v.id::text,auth.uid(),
    p_method,p_signature,CASE WHEN p_method='paper' THEN NULL ELSE now() END,now(),false
  )
  ON CONFLICT(document_kind,document_id,document_date,slot_code)
  DO UPDATE SET signer_user_id=excluded.signer_user_id,method=excluded.method,
    signature_id=excluded.signature_id,signed_at=excluded.signed_at,
    accepted_at=excluded.accepted_at,automatic=false,updated_at=now()
  RETURNING * INTO v_row;
  RETURN v_row;
END; $$;

REVOKE ALL ON FUNCTION public.submit_leave_request_signed(uuid,text,uuid) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.personnel_review_leave_request_signed(uuid,text,text,text,uuid) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.director_review_leave_request_signed(uuid,text,text,text,uuid) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.confirm_substitute_teacher_signed(uuid,text,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.submit_leave_request_signed(uuid,text,uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.personnel_review_leave_request_signed(uuid,text,text,text,uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.director_review_leave_request_signed(uuid,text,text,text,uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_substitute_teacher_signed(uuid,text,uuid) TO authenticated;
