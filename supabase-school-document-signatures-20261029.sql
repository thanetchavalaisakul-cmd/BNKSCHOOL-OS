
-- Shared, authenticated, per-document signatures for leave and substitute teaching.
CREATE TABLE IF NOT EXISTS public.school_document_signatures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_kind text NOT NULL CHECK (document_kind IN ('leave','substitute')),
  document_id uuid NOT NULL,
  document_date date NOT NULL DEFAULT DATE '1900-01-01',
  slot_code text NOT NULL,
  signer_user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  method text NOT NULL CHECK (method IN ('paper','stored','drawn','upload')),
  signature_id uuid REFERENCES public.signatures(id) ON DELETE RESTRICT,
  signed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT school_doc_signatures_kind_date_ck CHECK (
    (document_kind='leave' AND document_date=DATE '1900-01-01')
    OR (document_kind='substitute' AND document_date<>DATE '1900-01-01')
  ),
  CONSTRAINT school_doc_signatures_sig_ck CHECK (
    (method='paper' AND signature_id IS NULL AND signed_at IS NULL)
    OR (method<>'paper' AND signature_id IS NOT NULL AND signed_at IS NOT NULL)
  ),
  CONSTRAINT school_doc_signatures_unique UNIQUE(document_kind,document_id,document_date,slot_code)
);
CREATE INDEX IF NOT EXISTS school_doc_signatures_signature_id_idx ON public.school_document_signatures(signature_id);
CREATE INDEX IF NOT EXISTS school_doc_signatures_document_idx ON public.school_document_signatures(document_kind,document_id,document_date);

CREATE OR REPLACE FUNCTION private.can_view_school_document_signatures(p_kind text,p_id uuid,p_day date)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO '' AS $$
  SELECT private.is_active_user() AND (
    (p_kind='leave' AND EXISTS (
      SELECT 1 FROM public.leave_requests r
      WHERE r.id=p_id AND private.can_view_leave_request(r.id)
    ))
    OR
    (p_kind='substitute' AND EXISTS (
      SELECT 1 FROM public.substitute_lessons l
      WHERE l.leave_request_id=p_id AND l.leave_date=p_day
        AND private.can_view_substitute_lesson(l.id)
    ))
  );
$$;

ALTER TABLE public.school_document_signatures ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS school_doc_signatures_read_scope ON public.school_document_signatures;
CREATE POLICY school_doc_signatures_read_scope ON public.school_document_signatures
FOR SELECT TO authenticated USING (
  private.can_view_school_document_signatures(document_kind,document_id,document_date)
);
-- Reuse the existing private signature library only for documents the reader can already open.
DROP POLICY IF EXISTS signatures_read_school_documents ON public.signatures;
CREATE POLICY signatures_read_school_documents ON public.signatures FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.school_document_signatures s
    WHERE s.signature_id=signatures.id
      AND private.can_view_school_document_signatures(s.document_kind,s.document_id,s.document_date)
  )
);
REVOKE ALL ON public.school_document_signatures FROM PUBLIC,anon;
GRANT SELECT ON public.school_document_signatures TO authenticated;

CREATE OR REPLACE FUNCTION public.my_school_document_signing_slots(
  p_kind text,p_doc uuid,p_day date DEFAULT NULL
) RETURNS TABLE(slot_code text,slot_label text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO '' AS $$
DECLARE v_leave public.leave_requests; v_day date:=coalesce(p_day,DATE '1900-01-01');
BEGIN
  IF auth.uid() IS NULL OR NOT private.is_active_user() THEN RETURN; END IF;
  IF p_kind='leave' THEN
    IF v_day <> DATE '1900-01-01' THEN RETURN; END IF;
    SELECT * INTO v_leave FROM public.leave_requests WHERE id=p_doc;
    IF v_leave.id IS NULL THEN RETURN; END IF;
    IF v_leave.requester_id=auth.uid() AND v_leave.submitted_at IS NOT NULL AND v_leave.status<>'draft' THEN
      RETURN QUERY SELECT 'requester'::text,'ผู้ยื่นคำขอลา'::text;
    END IF;
    IF v_leave.personnel_reviewer_id=auth.uid() AND v_leave.personnel_reviewed_at IS NOT NULL THEN
      RETURN QUERY SELECT 'personnel_head'::text,'หัวหน้ากลุ่มงานบริหารงานบุคคล'::text;
    END IF;
    IF v_leave.director_reviewer_id=auth.uid() AND v_leave.director_reviewed_at IS NOT NULL THEN
      RETURN QUERY SELECT 'director'::text,'ผู้อนุมัติคำขอลา (ผู้อำนวยการ)'::text;
    END IF;
  ELSIF p_kind='substitute' THEN
    IF v_day=DATE '1900-01-01' OR NOT EXISTS (
      SELECT 1 FROM public.substitute_lessons l
      WHERE l.leave_request_id=p_doc AND l.leave_date=v_day AND l.status='assigned'
    ) OR EXISTS (
      SELECT 1 FROM public.substitute_lessons l
      WHERE l.leave_request_id=p_doc AND l.leave_date=v_day AND l.status<>'assigned'
    ) THEN RETURN; END IF;
    SELECT * INTO v_leave FROM public.leave_requests WHERE id=p_doc;
    IF v_leave.id IS NULL THEN RETURN; END IF;
    IF v_leave.requester_id=auth.uid() THEN
      RETURN QUERY SELECT 'requester'::text,'ครูผู้ลา / ผู้จัดสอนแทน'::text;
    END IF;
    IF private.is_academic_head() THEN
      RETURN QUERY SELECT 'academic_head'::text,'หัวหน้ากลุ่มงานบริหารงานวิชาการ'::text;
    END IF;
    RETURN QUERY
      SELECT DISTINCT ('stage:'||l.stage_code)::text,
        ('หัวหน้าช่วงชั้น '||l.stage_code)::text
      FROM public.substitute_lessons l
      JOIN public.stage_heads h ON h.academic_year=l.academic_year::text
        AND h.stage_code=l.stage_code AND h.teacher_id=auth.uid()
      WHERE l.leave_request_id=p_doc AND l.leave_date=v_day AND l.status='assigned';
    IF EXISTS (
      SELECT 1 FROM public.approval_executives e
      WHERE e.user_id=auth.uid() AND e.is_active
        AND e.executive_kind IN ('director','acting_director')
    ) THEN
      RETURN QUERY SELECT 'director'::text,'ผู้อำนวยการ / ผู้รักษาการ'::text;
    END IF;
    RETURN QUERY
      SELECT ('substitute:'||l.id::text)::text,
        ('ครูผู้สอนแทน คาบ '||l.period_no||' · '||l.class_label)::text
      FROM public.substitute_lessons l
      WHERE l.leave_request_id=p_doc AND l.leave_date=v_day
        AND l.status='assigned' AND l.substitute_teacher_id=auth.uid();
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.my_school_document_signing_slots(text,uuid,date) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.my_school_document_signing_slots(text,uuid,date) TO authenticated;

CREATE OR REPLACE FUNCTION public.set_school_document_signature(
  p_kind text,p_doc uuid,p_day date,p_slot text,p_method text,p_signature uuid DEFAULT NULL
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
DECLARE v_day date:=coalesce(p_day,DATE '1900-01-01'); v_source text;
BEGIN
  IF auth.uid() IS NULL OR NOT private.is_active_user() THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE='42501';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.my_school_document_signing_slots(p_kind,p_doc,v_day) s
    WHERE s.slot_code=p_slot
  ) THEN
    RAISE EXCEPTION 'Only the assigned document signer can sign this slot' USING ERRCODE='42501';
  END IF;
  IF p_method NOT IN ('paper','stored','drawn','upload') THEN RAISE EXCEPTION 'Invalid signing method'; END IF;
  IF p_method='paper' THEN
    IF p_signature IS NOT NULL THEN RAISE EXCEPTION 'Paper method cannot include signature'; END IF;
  ELSE
    SELECT s.source INTO v_source
    FROM public.signatures s WHERE s.id=p_signature AND s.user_id=auth.uid();
    IF v_source IS NULL THEN
      RAISE EXCEPTION 'Signature must belong to the logged in signer' USING ERRCODE='42501';
    END IF;
    IF p_method IN ('drawn','upload') AND v_source<>p_method THEN
      RAISE EXCEPTION 'Signature source does not match the selected method';
    END IF;
  END IF;
  INSERT INTO public.school_document_signatures(
    document_kind,document_id,document_date,slot_code,signer_user_id,
    method,signature_id,signed_at
  ) VALUES(
    p_kind,p_doc,v_day,p_slot,auth.uid(),p_method,p_signature,
    CASE WHEN p_method='paper' THEN NULL ELSE now() END
  )
  ON CONFLICT(document_kind,document_id,document_date,slot_code) DO UPDATE
    SET signer_user_id=EXCLUDED.signer_user_id,method=EXCLUDED.method,
        signature_id=EXCLUDED.signature_id,signed_at=EXCLUDED.signed_at,
        updated_at=now();
END;
$$;
REVOKE ALL ON FUNCTION public.set_school_document_signature(text,uuid,date,text,text,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.set_school_document_signature(text,uuid,date,text,text,uuid) TO authenticated;

-- A changed or cancelled substitute assignment invalidates document signatures
-- so that an old teacher's handwriting cannot persist on a new assignment.
CREATE OR REPLACE FUNCTION private.invalidate_changed_substitute_document_signatures()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
BEGIN
  IF TG_OP='DELETE' THEN
    DELETE FROM public.school_document_signatures
      WHERE document_kind='substitute'
        AND document_id=OLD.leave_request_id AND document_date=OLD.leave_date;
    RETURN OLD;
  END IF;
  IF OLD.substitute_teacher_id IS DISTINCT FROM NEW.substitute_teacher_id
    OR OLD.status IS DISTINCT FROM NEW.status
    OR OLD.leave_date IS DISTINCT FROM NEW.leave_date
    OR OLD.stage_code IS DISTINCT FROM NEW.stage_code
  THEN
    DELETE FROM public.school_document_signatures
      WHERE document_kind='substitute' AND document_id=OLD.leave_request_id AND document_date=OLD.leave_date;
    IF NEW.leave_request_id IS DISTINCT FROM OLD.leave_request_id
      OR NEW.leave_date IS DISTINCT FROM OLD.leave_date THEN
      DELETE FROM public.school_document_signatures
        WHERE document_kind='substitute' AND document_id=NEW.leave_request_id AND document_date=NEW.leave_date;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS invalidate_changed_substitute_doc_signatures ON public.substitute_lessons;
CREATE TRIGGER invalidate_changed_substitute_doc_signatures
AFTER UPDATE OF substitute_teacher_id,status,leave_date,stage_code OR DELETE
ON public.substitute_lessons FOR EACH ROW
EXECUTE FUNCTION private.invalidate_changed_substitute_document_signatures();

-- Signer display can rely on exactly the active and immutable referenced signature.
COMMENT ON TABLE public.school_document_signatures IS
'Personal signatures on leave and substitute-teaching documents; decisions/approvals remain in existing workflows.';
