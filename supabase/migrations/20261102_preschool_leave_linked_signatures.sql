-- Kindergarten group substitute is derived from the already approved leave.
-- The leave requester's recorded submit signature and director's recorded approval
-- are reused, WITHOUT new approval events or backdated digital signatures.
-- The stage / academic heads have independent acknowledgement-only signing slots.

CREATE OR REPLACE FUNCTION private.can_view_preschool_cover_document(p_cover_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public', 'private'
AS $body$
 SELECT private.is_active_user() AND EXISTS(
  SELECT 1 FROM public.preschool_group_covers g
  WHERE g.id=p_cover_id AND g.status='active'
    AND EXISTS(SELECT 1 FROM public.leave_requests l
               WHERE l.id=g.leave_request_id AND l.status='approved')
    AND (
      private.can_read_preschool_cover_signature(g.id)
      OR private.is_academic_head()
      OR EXISTS(SELECT 1 FROM public.stage_heads h
                WHERE h.stage_code='early_childhood'
                  AND h.academic_year=g.academic_year::text
                  AND h.teacher_id=auth.uid())
    )
 );
$body$;
REVOKE ALL ON FUNCTION private.can_view_preschool_cover_document(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION private.can_view_preschool_cover_document(uuid) TO authenticated;

-- Extend existing school-document signing infrastructure, preserving its
-- exact leave/substitute logic and restrictive owner checks.
DO $body$
DECLARE definition text; before_branch text; after_branch text;
BEGIN
 SELECT pg_get_functiondef('public.my_school_document_signing_slots(text,uuid,date)'::regprocedure)
   INTO definition;
 before_branch:='  ELSIF p_kind=''substitute'' THEN';
 after_branch:=$replace$  ELSIF p_kind='preschool' THEN
    IF v_day=DATE '1900-01-01' THEN RETURN; END IF;
    IF NOT EXISTS(
      SELECT 1 FROM public.preschool_group_covers g
      JOIN public.leave_requests l ON l.id=g.leave_request_id
      WHERE g.id=p_doc AND g.leave_date=v_day AND g.status='active'
        AND l.status='approved'
    ) THEN RETURN; END IF;
    IF private.is_academic_head() THEN
      RETURN QUERY SELECT 'academic_head'::text,'หัวหน้ากลุ่มงานบริหารงานวิชาการ (รับทราบ)'::text;
    END IF;
    RETURN QUERY SELECT 'stage_head'::text,'หัวหน้าช่วงชั้นปฐมวัย (รับทราบ)'::text
      FROM public.preschool_group_covers g
      JOIN public.stage_heads h ON h.stage_code='early_childhood'
        AND h.academic_year=g.academic_year::text AND h.teacher_id=auth.uid()
      WHERE g.id=p_doc AND g.leave_date=v_day AND g.status='active';
  ELSIF p_kind='substitute' THEN$replace$;
 IF position(after_branch IN definition)=0 THEN
  IF position(before_branch IN definition)=0 THEN RAISE EXCEPTION 'School sign slot branch drift'; END IF;
  definition:=replace(definition,before_branch,after_branch);
  EXECUTE definition;
 END IF;
 SELECT pg_get_functiondef('private.can_view_school_document_signatures(text,uuid,date)'::regprocedure)
  INTO definition;
 before_branch:=$replace$    (p_kind='leave' AND EXISTS ($replace$;
 after_branch:=$replace$    (p_kind='preschool' AND private.can_view_preschool_cover_document(p_id)
      AND EXISTS(SELECT 1 FROM public.preschool_group_covers g
                 WHERE g.id=p_id AND g.leave_date=p_day))
    OR
    (p_kind='leave' AND EXISTS ($replace$;
 IF position(after_branch IN definition)=0 THEN
  IF position(before_branch IN definition)=0 THEN RAISE EXCEPTION 'School doc view branch drift'; END IF;
  definition:=replace(definition,before_branch,after_branch);
  EXECUTE definition;
 END IF;
END
$body$;

-- A read-only asset list, filtered to actual leave signing actions and actual
-- preschool head acknowledgement signatures. Paper has no image.
CREATE OR REPLACE FUNCTION public.get_preschool_cover_linked_signatures(p_cover_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public', 'private'
AS $body$
DECLARE v_result jsonb;
BEGIN
 IF NOT private.can_view_preschool_cover_document(p_cover_id) THEN
   RAISE EXCEPTION 'No permission to view preschool coverage signature assets' USING ERRCODE='42501';
 END IF;
 SELECT COALESCE(jsonb_agg(jsonb_build_object(
   'slot_code', a.slot_code, 'method',a.method,'signed_at',a.signed_at,
   'bucket_id',a.bucket_id,'storage_path',a.storage_path,'source_kind',a.source_kind
 ) ORDER BY a.sort_key),'[]'::jsonb) INTO v_result
 FROM (
  SELECT d.slot_code,d.method,d.signed_at,sg.bucket_id,sg.storage_path,
         'leave_action'::text source_kind,
         CASE d.slot_code WHEN 'requester' THEN 1 ELSE 4 END sort_key
  FROM public.preschool_group_covers g
  JOIN public.leave_requests l ON l.id=g.leave_request_id AND l.status='approved'
  JOIN public.school_document_signatures d ON d.document_kind='leave'
     AND d.document_id=l.id AND d.slot_code IN ('requester','director')
  LEFT JOIN public.signatures sg ON sg.id=d.signature_id AND sg.user_id=d.signer_user_id
    AND d.method<>'paper' AND d.signed_at IS NOT NULL
  WHERE g.id=p_cover_id AND g.status='active'
   AND ((d.slot_code='requester' AND d.signer_user_id=l.requester_id
          AND l.submitted_at IS NOT NULL)
     OR (d.slot_code='director' AND d.signer_user_id=l.director_reviewer_id
          AND l.director_reviewed_at IS NOT NULL))
  UNION ALL
  SELECT 'director'::text,'stored'::text,l.director_reviewed_at,
         sg.bucket_id,sg.storage_path,'leave_action'::text,4
  FROM public.preschool_group_covers g
  JOIN public.leave_requests l ON l.id=g.leave_request_id AND l.status='approved'
  JOIN public.signatures sg ON sg.id=l.director_signature_id
    AND sg.user_id=l.director_reviewer_id
  WHERE g.id=p_cover_id AND g.status='active'
    AND l.director_reviewed_at IS NOT NULL
    AND NOT EXISTS(SELECT 1 FROM public.school_document_signatures d
                   WHERE d.document_kind='leave' AND d.document_id=l.id
                     AND d.slot_code='director')
  UNION ALL
  SELECT d.slot_code,d.method,d.signed_at,sg.bucket_id,sg.storage_path,
         'preschool_acknowledgement'::text,
         CASE d.slot_code WHEN 'stage_head' THEN 2 ELSE 3 END
  FROM public.preschool_group_covers g
  JOIN public.school_document_signatures d ON d.document_kind='preschool'
    AND d.document_id=g.id AND d.document_date=g.leave_date
    AND d.slot_code IN ('stage_head','academic_head')
  LEFT JOIN public.signatures sg ON sg.id=d.signature_id
    AND sg.user_id=d.signer_user_id AND d.method<>'paper' AND d.signed_at IS NOT NULL
  WHERE g.id=p_cover_id AND g.status='active'
 ) a;
 RETURN v_result;
END;
$body$;
REVOKE ALL ON FUNCTION public.get_preschool_cover_linked_signatures(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_preschool_cover_linked_signatures(uuid) TO authenticated;

-- Grant access to the EXACT images used in the linked documents; never open
-- the signatures bucket generally.  This helper must be executable by
-- authenticated users because Storage evaluates it inside an RLS policy.
CREATE OR REPLACE FUNCTION private.can_read_preschool_cover_linked_signature_storage(p_bucket text,p_path text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'pg_catalog','public','private'
AS $body$
 SELECT private.is_active_user() AND p_bucket='signatures' AND (
  EXISTS(
    SELECT 1 FROM public.preschool_group_covers g
    JOIN public.leave_requests l ON l.id=g.leave_request_id AND l.status='approved'
    JOIN public.school_document_signatures d ON d.document_kind='leave'
      AND d.document_id=l.id AND d.slot_code IN ('requester','director')
      AND d.method IN ('stored','drawn','upload') AND d.signed_at IS NOT NULL
    JOIN public.signatures sg ON sg.id=d.signature_id AND sg.user_id=d.signer_user_id
      AND sg.bucket_id=p_bucket AND sg.storage_path=p_path
    WHERE g.status='active' AND private.can_view_preschool_cover_document(g.id)
      AND ((d.slot_code='requester' AND d.signer_user_id=l.requester_id
             AND l.submitted_at IS NOT NULL)
        OR (d.slot_code='director' AND d.signer_user_id=l.director_reviewer_id
             AND l.director_reviewed_at IS NOT NULL))
  )
  OR EXISTS(
    SELECT 1 FROM public.preschool_group_covers g
    JOIN public.leave_requests l ON l.id=g.leave_request_id AND l.status='approved'
    JOIN public.signatures sg ON sg.id=l.director_signature_id
      AND sg.user_id=l.director_reviewer_id AND sg.bucket_id=p_bucket
      AND sg.storage_path=p_path
    WHERE g.status='active' AND l.director_reviewed_at IS NOT NULL
      AND NOT EXISTS(SELECT 1 FROM public.school_document_signatures d
          WHERE d.document_kind='leave' AND d.document_id=l.id AND d.slot_code='director')
      AND private.can_view_preschool_cover_document(g.id)
  )
  OR EXISTS(
    SELECT 1 FROM public.preschool_group_covers g
    JOIN public.school_document_signatures d ON d.document_kind='preschool'
      AND d.document_id=g.id AND d.document_date=g.leave_date
      AND d.slot_code IN ('stage_head','academic_head')
      AND d.method IN ('stored','drawn','upload') AND d.signed_at IS NOT NULL
    JOIN public.signatures sg ON sg.id=d.signature_id AND sg.user_id=d.signer_user_id
      AND sg.bucket_id=p_bucket AND sg.storage_path=p_path
    WHERE g.status='active' AND private.can_view_preschool_cover_document(g.id)
  )
 );
$body$;
REVOKE ALL ON FUNCTION private.can_read_preschool_cover_linked_signature_storage(text,text)
 FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION private.can_read_preschool_cover_linked_signature_storage(text,text)
 TO authenticated;

DROP POLICY IF EXISTS bnk_preschool_cover_linked_leave_signatures_select ON storage.objects;
CREATE POLICY bnk_preschool_cover_linked_leave_signatures_select
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id='signatures'
 AND private.can_read_preschool_cover_linked_signature_storage(bucket_id,name));
