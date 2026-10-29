-- Bind previously opted-in personal Auto Sign preferences to leave and substitute PDF documents.
-- This does not change workflow approval status or grant any new reviewer rights.
ALTER TABLE public.school_document_signatures
  ADD COLUMN IF NOT EXISTS automatic boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.refresh_school_document_auto_signatures(
  p_kind text,p_doc uuid,p_day date DEFAULT NULL
)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $fn$
DECLARE
 v_day date:=coalesce(p_day,DATE '1900-01-01');
 v_leave public.leave_requests;
 v_count integer:=0;
 v_rows integer:=0;
 v_system text;
BEGIN
 IF auth.uid() IS NULL OR NOT private.is_active_user() THEN
   RAISE EXCEPTION 'Authentication required' USING ERRCODE='42501';
 END IF;
 IF p_kind NOT IN ('leave','substitute') THEN
   RAISE EXCEPTION 'Invalid document kind';
 END IF;
 IF NOT private.can_view_school_document_signatures(p_kind,p_doc,v_day) THEN
   RAISE EXCEPTION 'Not allowed to view document' USING ERRCODE='42501';
 END IF;
 SELECT * INTO v_leave FROM public.leave_requests WHERE id=p_doc;
 IF v_leave.id IS NULL THEN RETURN 0; END IF;
 v_system:=CASE WHEN p_kind='leave' THEN 'leave_management' ELSE 'substitute_teaching' END;

 IF p_kind='leave' THEN
   IF v_day<>DATE '1900-01-01' OR v_leave.submitted_at IS NULL OR v_leave.status='draft' THEN RETURN 0; END IF;
   WITH candidates AS (
      SELECT 'requester'::text AS slot,v_leave.requester_id AS uid
      UNION ALL
      SELECT 'personnel_head',v_leave.personnel_reviewer_id WHERE v_leave.personnel_reviewed_at IS NOT NULL
      UNION ALL
      SELECT 'director',v_leave.director_reviewer_id WHERE v_leave.director_reviewed_at IS NOT NULL
   ),
   allowed AS (
      SELECT c.slot,c.uid,private.signature_preference_default_id(c.uid) AS signature_id
      FROM candidates c JOIN public.profiles p ON p.id=c.uid
      WHERE c.uid IS NOT NULL AND p.account_status='active' AND p.deleted_at IS NULL
        AND private.personal_auto_sign_for_system(c.uid,v_system)
   )
   INSERT INTO public.school_document_signatures(
      document_kind,document_id,document_date,slot_code,signer_user_id,method,signature_id,signed_at,automatic
   )
   SELECT 'leave',p_doc,v_day,a.slot,a.uid,'stored',a.signature_id,now(),true
   FROM allowed a WHERE a.signature_id IS NOT NULL
   ON CONFLICT(document_kind,document_id,document_date,slot_code) DO NOTHING;
   GET DIAGNOSTICS v_count=ROW_COUNT;
 ELSE
   -- An incomplete or canceled substitution may not be signed automatically.
   IF v_day=DATE '1900-01-01'
      OR NOT EXISTS (SELECT 1 FROM public.substitute_lessons l
                     WHERE l.leave_request_id=p_doc AND l.leave_date=v_day AND l.status='assigned')
      OR EXISTS (SELECT 1 FROM public.substitute_lessons l
                 WHERE l.leave_request_id=p_doc AND l.leave_date=v_day AND l.status<>'assigned')
   THEN RETURN 0; END IF;
   WITH candidate AS (
      SELECT 'requester'::text AS slot,v_leave.requester_id AS uid
      UNION ALL
      SELECT 'academic_head',
        (SELECT p.id FROM public.profiles p
         WHERE p.role='department_head' AND p.department_id=private.academic_department_id()
            AND p.account_status='active' AND p.deleted_at IS NULL
         ORDER BY p.approved_at NULLS LAST,p.created_at LIMIT 1)
      UNION ALL
      SELECT DISTINCT ('stage:'||l.stage_code)::text,h.teacher_id
      FROM public.substitute_lessons l
      JOIN public.stage_heads h ON h.academic_year=l.academic_year::text
         AND h.stage_code=l.stage_code
      WHERE l.leave_request_id=p_doc AND l.leave_date=v_day AND l.status='assigned'
      UNION ALL
      SELECT 'director',
        coalesce(
          (SELECT p.id FROM public.profiles p
           WHERE p.role='director' AND p.account_status='active' AND p.deleted_at IS NULL
           ORDER BY p.approved_at NULLS LAST,p.created_at LIMIT 1),
          (SELECT e.user_id FROM public.approval_executives e JOIN public.profiles p ON p.id=e.user_id
           WHERE e.is_active=true AND e.executive_kind IN ('director','acting_director')
             AND p.account_status='active' AND p.deleted_at IS NULL
           ORDER BY CASE WHEN e.executive_kind='director' THEN 0 ELSE 1 END LIMIT 1)
        )
      UNION ALL
      SELECT ('substitute:'||l.id::text)::text,l.substitute_teacher_id
      FROM public.substitute_lessons l
      WHERE l.leave_request_id=p_doc AND l.leave_date=v_day AND l.status='assigned'
   ),
   allowed AS (
      SELECT DISTINCT ON (c.slot)
         c.slot,c.uid,private.signature_preference_default_id(c.uid) AS signature_id
      FROM candidate c JOIN public.profiles p ON p.id=c.uid
      WHERE c.uid IS NOT NULL AND p.account_status='active' AND p.deleted_at IS NULL
        AND private.personal_auto_sign_for_system(c.uid,v_system)
      ORDER BY c.slot,c.uid
   )
   INSERT INTO public.school_document_signatures(
      document_kind,document_id,document_date,slot_code,signer_user_id,method,signature_id,signed_at,automatic
   )
   SELECT 'substitute',p_doc,v_day,a.slot,a.uid,'stored',a.signature_id,now(),true
   FROM allowed a WHERE a.signature_id IS NOT NULL
   ON CONFLICT(document_kind,document_id,document_date,slot_code) DO NOTHING;
   GET DIAGNOSTICS v_rows=ROW_COUNT;
   v_count:=v_count+v_rows;
 END IF;
 RETURN v_count;
END;
$fn$;

REVOKE ALL ON FUNCTION public.refresh_school_document_auto_signatures(text,uuid,date) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.refresh_school_document_auto_signatures(text,uuid,date) TO authenticated;

COMMENT ON FUNCTION public.refresh_school_document_auto_signatures(text,uuid,date) IS
'Snapshot personal Auto Sign preferences only for eligible slots on an already submitted/processed leave request or fully assigned substitute document; never performs approval. Existing manual/paper signatures are preserved.';
