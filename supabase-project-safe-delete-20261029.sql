-- Atomic project deletion: archived procurement remains, live finance blocks deletion.
CREATE TABLE IF NOT EXISTS private.deleted_project_procurement_links (
 procurement_case_id uuid PRIMARY KEY, project_id uuid NOT NULL, activity_id uuid,
 project_no text NOT NULL, project_name text NOT NULL, archived_by uuid NOT NULL,
 archived_at timestamptz NOT NULL DEFAULT now()
);
REVOKE ALL ON private.deleted_project_procurement_links FROM PUBLIC,anon,authenticated;
CREATE OR REPLACE FUNCTION public.school_project_delete_impact(p_project_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE pr public.school_projects%ROWTYPE; v_total int;v_archived int;v_budget int;v_activities int;
BEGIN
 SELECT * INTO pr FROM public.school_projects WHERE id=p_project_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'PROJECT_NOT_FOUND';END IF;
 IF NOT private.is_active_user() OR
    NOT (private.is_super_admin() OR pr.owner_id=auth.uid()) THEN
    RAISE EXCEPTION 'PROJECT_DELETE_NOT_ALLOWED';END IF;
 SELECT count(*) INTO v_activities FROM public.project_activities WHERE project_id=pr.id;
 SELECT count(*) INTO v_budget FROM public.budget_disbursements b
 WHERE b.project_id=pr.id OR b.activity_id IN
   (SELECT id FROM public.project_activities WHERE project_id=pr.id);
 SELECT count(*),count(*) FILTER(WHERE c.status='deleted' AND c.deleted_at IS NOT NULL)
 INTO v_total,v_archived FROM public.procurement_document_cases c
 WHERE c.project_id=pr.id OR c.activity_id IN
   (SELECT id FROM public.project_activities WHERE project_id=pr.id);
 RETURN jsonb_build_object('archived_procurement',v_archived,
  'active_procurement',v_total-v_archived,'budget_disbursements',v_budget,
  'activities',v_activities,'can_delete',v_total=v_archived AND v_budget=0);
END $function$

CREATE OR REPLACE FUNCTION public.delete_school_project_safely(p_project_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE pr public.school_projects%ROWTYPE; v_impact jsonb; v_archived int;
BEGIN
 SELECT * INTO pr FROM public.school_projects WHERE id=p_project_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'PROJECT_NOT_FOUND';END IF;
 IF NOT private.is_active_user() OR
    NOT (private.is_super_admin() OR
      (pr.owner_id=auth.uid() AND private.has_recent_password_auth(90))) THEN
    RAISE EXCEPTION 'PROJECT_DELETE_REQUIRES_RECENT_PASSWORD';END IF;
 -- Recheck inside the transaction immediately before unlinking/deleting.
 SELECT count(*) INTO v_archived FROM public.budget_disbursements b
 WHERE b.project_id=pr.id OR b.activity_id IN
  (SELECT id FROM public.project_activities WHERE project_id=pr.id);
 IF v_archived>0 THEN RAISE EXCEPTION 'PROJECT_HAS_BUDGET_DOCUMENTS: %',v_archived;END IF;
 IF EXISTS (
  SELECT 1 FROM public.procurement_document_cases c
  WHERE (c.project_id=pr.id OR c.activity_id IN
    (SELECT id FROM public.project_activities WHERE project_id=pr.id))
   AND (c.status<>'deleted' OR c.deleted_at IS NULL)
 ) THEN RAISE EXCEPTION 'PROJECT_HAS_ACTIVE_PROCUREMENT';END IF;
 -- Archived procurement cases retain their original project/activity names in
 -- form_data, and their old relational IDs are saved privately for audit.
 IF EXISTS(
  SELECT 1 FROM public.procurement_document_cases c
  WHERE (c.project_id=pr.id OR c.activity_id IN
    (SELECT id FROM public.project_activities WHERE project_id=pr.id))
  AND (coalesce(c.form_data->>'project_name','')='' OR
       (c.activity_id IS NOT NULL AND coalesce(c.form_data->>'activity_name','')=''))
 ) THEN RAISE EXCEPTION 'PROJECT_ARCHIVED_DOC_MISSING_SNAPSHOT';END IF;
 INSERT INTO private.deleted_project_procurement_links(
   procurement_case_id,project_id,activity_id,project_no,project_name,archived_by)
 SELECT c.id,pr.id,c.activity_id,pr.project_no,pr.project_name,auth.uid()
 FROM public.procurement_document_cases c
 WHERE c.project_id=pr.id OR c.activity_id IN
   (SELECT id FROM public.project_activities WHERE project_id=pr.id);
 GET DIAGNOSTICS v_archived=ROW_COUNT;
 UPDATE public.procurement_document_cases c SET project_id=NULL,activity_id=NULL
 WHERE c.project_id=pr.id OR c.activity_id IN
   (SELECT id FROM public.project_activities WHERE project_id=pr.id);
 DELETE FROM public.school_projects WHERE id=pr.id;
 IF NOT FOUND THEN RAISE EXCEPTION 'PROJECT_DELETE_NOT_COMPLETED';END IF;
 RETURN jsonb_build_object('deleted',true,'archived_documents_preserved',v_archived);
END $function$

REVOKE ALL ON FUNCTION public.school_project_delete_impact(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.school_project_delete_impact(uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.delete_school_project_safely(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.delete_school_project_safely(uuid) TO authenticated;
