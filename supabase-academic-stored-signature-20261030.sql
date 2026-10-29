-- Stored signatures for 6 academic submission document systems; actor and per-slot checks remain in existing RPC functions.
ALTER TABLE public.academic_post_lesson_signatures DROP CONSTRAINT IF EXISTS academic_post_lesson_signatures_method_check;
ALTER TABLE public.academic_post_lesson_signatures ADD CONSTRAINT academic_post_lesson_signatures_method_check CHECK(method IN('paper','drawn','upload','stored'));
ALTER TABLE public.academic_post_lesson_signatures DROP CONSTRAINT IF EXISTS academic_post_lesson_signatures_check;
ALTER TABLE public.academic_post_lesson_signatures ADD CONSTRAINT academic_post_lesson_signatures_check CHECK((method='paper' AND storage_path IS NULL) OR (method IN('drawn','upload','stored') AND bucket IS NOT NULL AND storage_path IS NOT NULL));
ALTER TABLE public.academic_lesson_plan_usage_signatures DROP CONSTRAINT IF EXISTS academic_lesson_plan_usage_signatures_method_check;
ALTER TABLE public.academic_lesson_plan_usage_signatures ADD CONSTRAINT academic_lesson_plan_usage_signatures_method_check CHECK(method IN('paper','drawn','upload','stored'));
ALTER TABLE public.academic_lesson_plan_usage_signatures DROP CONSTRAINT IF EXISTS academic_lesson_plan_usage_signatures_check;
ALTER TABLE public.academic_lesson_plan_usage_signatures ADD CONSTRAINT academic_lesson_plan_usage_signatures_check CHECK((method='paper' AND storage_path IS NULL) OR (method IN('drawn','upload','stored') AND bucket IS NOT NULL AND storage_path IS NOT NULL));
ALTER TABLE public.academic_learning_media_signatures DROP CONSTRAINT IF EXISTS academic_learning_media_signatures_method_check;
ALTER TABLE public.academic_learning_media_signatures ADD CONSTRAINT academic_learning_media_signatures_method_check CHECK(method IN('paper','drawn','upload','stored'));
ALTER TABLE public.academic_learning_media_signatures DROP CONSTRAINT IF EXISTS academic_learning_media_signatures_check;
ALTER TABLE public.academic_learning_media_signatures ADD CONSTRAINT academic_learning_media_signatures_check CHECK((method='paper' AND storage_path IS NULL) OR (method IN('drawn','upload','stored') AND bucket IS NOT NULL AND storage_path IS NOT NULL));
ALTER TABLE public.academic_classroom_research_signatures DROP CONSTRAINT IF EXISTS academic_classroom_research_signatures_method_check;
ALTER TABLE public.academic_classroom_research_signatures ADD CONSTRAINT academic_classroom_research_signatures_method_check CHECK(method IN('paper','drawn','upload','stored'));
ALTER TABLE public.academic_classroom_research_signatures DROP CONSTRAINT IF EXISTS academic_classroom_research_signatures_check;
ALTER TABLE public.academic_classroom_research_signatures ADD CONSTRAINT academic_classroom_research_signatures_check CHECK((method='paper' AND storage_path IS NULL) OR (method IN('drawn','upload','stored') AND bucket IS NOT NULL AND storage_path IS NOT NULL));
ALTER TABLE public.academic_learner_activity_signatures DROP CONSTRAINT IF EXISTS academic_learner_activity_signatures_method_check;
ALTER TABLE public.academic_learner_activity_signatures ADD CONSTRAINT academic_learner_activity_signatures_method_check CHECK(method IN('paper','drawn','upload','stored'));
ALTER TABLE public.academic_learner_activity_signatures DROP CONSTRAINT IF EXISTS academic_learner_activity_signatures_check;
ALTER TABLE public.academic_learner_activity_signatures ADD CONSTRAINT academic_learner_activity_signatures_check CHECK((method='paper' AND storage_path IS NULL) OR (method IN('drawn','upload','stored') AND bucket IS NOT NULL AND storage_path IS NOT NULL));
ALTER TABLE public.academic_club_activity_signatures DROP CONSTRAINT IF EXISTS academic_club_activity_signatures_method_check;
ALTER TABLE public.academic_club_activity_signatures ADD CONSTRAINT academic_club_activity_signatures_method_check CHECK(method IN('paper','drawn','upload','stored'));
ALTER TABLE public.academic_club_activity_signatures DROP CONSTRAINT IF EXISTS academic_club_activity_signatures_check;
ALTER TABLE public.academic_club_activity_signatures ADD CONSTRAINT academic_club_activity_signatures_check CHECK((method='paper' AND storage_path IS NULL) OR (method IN('drawn','upload','stored') AND bucket IS NOT NULL AND storage_path IS NOT NULL));

CREATE OR REPLACE FUNCTION public.set_academic_report_saved_signature(
 p_system_code text,p_report_id uuid,p_slot text,p_signature_id uuid,p_comment text DEFAULT NULL,
 p_cert_content_appropriate boolean DEFAULT NULL,p_cert_practical boolean DEFAULT NULL,p_cert_other text DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $function$
DECLARE v_master public.signatures%ROWTYPE; v_table text; v_json jsonb;
BEGIN
 IF auth.uid() IS NULL OR NOT private.is_active_user() THEN RAISE EXCEPTION 'Authentication required'; END IF;
 SELECT * INTO v_master FROM public.signatures s WHERE s.id=p_signature_id AND s.user_id=auth.uid();
 IF v_master.id IS NULL OR v_master.bucket_id<>'signatures' OR v_master.storage_path IS NULL
    OR NOT EXISTS (SELECT 1 FROM storage.objects o
        WHERE o.bucket_id=v_master.bucket_id AND o.name=v_master.storage_path) THEN
    RAISE EXCEPTION 'Choose a saved signature belonging to the logged-in signer';
 END IF;
 CASE p_system_code
 WHEN 'post_lesson' THEN
   v_table:='academic_post_lesson_signatures';
   PERFORM public.set_post_lesson_signature(p_report_id,p_slot,'upload',v_master.storage_path);
 WHEN 'lesson_plan_usage' THEN
   v_table:='academic_lesson_plan_usage_signatures';
   PERFORM public.set_lesson_plan_usage_signature(p_report_id,p_slot,'upload',v_master.storage_path,p_comment);
 WHEN 'learning_media' THEN
   v_table:='academic_learning_media_signatures';
   PERFORM public.set_learning_media_signature(p_report_id,p_slot,'upload',v_master.storage_path,p_comment,
       p_cert_content_appropriate,p_cert_practical,p_cert_other);
 WHEN 'classroom_research' THEN
   v_table:='academic_classroom_research_signatures';
   PERFORM public.set_classroom_research_signature(p_report_id,p_slot,'upload',v_master.storage_path,p_comment);
 WHEN 'learner_activities' THEN
   v_table:='academic_learner_activity_signatures';
   PERFORM public.set_learner_activity_signature(p_report_id,p_slot,'upload',v_master.storage_path,p_comment);
 WHEN 'club_activity' THEN
   v_table:='academic_club_activity_signatures';
   PERFORM public.set_club_activity_signature(p_report_id,p_slot,'upload',v_master.storage_path,p_comment);
 ELSE
   RAISE EXCEPTION 'Unsupported academic signature module';
 END CASE;
 -- The legacy function validates the signed-in actor and every slot, executes its approval
 -- transitions, and either succeeds in this same transaction or rolls back entirely.
 EXECUTE format(
  'UPDATE public.%I AS x SET method=''stored'',bucket=$1,storage_path=$2,master_signature_id=$3,automatic=false,updated_at=now()
   WHERE x.report_id=$4 AND x.signer_slot=$5 AND x.signer_user_id=auth.uid() RETURNING to_jsonb(x)',v_table)
   INTO v_json USING v_master.bucket_id,v_master.storage_path,v_master.id,p_report_id,p_slot;
 IF v_json IS NULL THEN RAISE EXCEPTION 'No signed slot updated'; END IF;
 UPDATE public.approval_document_slots
   SET signature_id=v_master.id,signature_bucket=v_master.bucket_id,signature_path=v_master.storage_path,
       automatic=false,updated_at=now()
   WHERE system_code=p_system_code AND document_id=p_report_id AND slot_code=p_slot
         AND actor_user_id=auth.uid() AND decision='approve';
 RETURN v_json;
END;
$function$;

REVOKE ALL ON FUNCTION public.set_academic_report_saved_signature(text,uuid,text,uuid,text,boolean,boolean,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.set_academic_report_saved_signature(text,uuid,text,uuid,text,boolean,boolean,text) TO authenticated;

DROP POLICY IF EXISTS academic_submission_saved_signature_view ON storage.objects;
CREATE POLICY academic_submission_saved_signature_view ON storage.objects FOR SELECT TO authenticated
USING(bucket_id='signatures' AND (
EXISTS(SELECT 1 FROM public.academic_post_lesson_signatures sg
  WHERE sg.method='stored' AND sg.bucket=objects.bucket_id AND sg.storage_path=objects.name
    AND private.can_view_post_lesson_report(sg.report_id))
 OR EXISTS(SELECT 1 FROM public.academic_lesson_plan_usage_signatures sg
  WHERE sg.method='stored' AND sg.bucket=objects.bucket_id AND sg.storage_path=objects.name
    AND private.can_view_lesson_plan_usage_report(sg.report_id))
 OR EXISTS(SELECT 1 FROM public.academic_learning_media_signatures sg
  WHERE sg.method='stored' AND sg.bucket=objects.bucket_id AND sg.storage_path=objects.name
    AND private.can_view_learning_media_report(sg.report_id))
 OR EXISTS(SELECT 1 FROM public.academic_classroom_research_signatures sg
  WHERE sg.method='stored' AND sg.bucket=objects.bucket_id AND sg.storage_path=objects.name
    AND private.can_view_classroom_research_report(sg.report_id))
 OR EXISTS(SELECT 1 FROM public.academic_learner_activity_signatures sg
  WHERE sg.method='stored' AND sg.bucket=objects.bucket_id AND sg.storage_path=objects.name
    AND private.can_view_learner_activity_report(sg.report_id))
 OR EXISTS(SELECT 1 FROM public.academic_club_activity_signatures sg
  WHERE sg.method='stored' AND sg.bucket=objects.bucket_id AND sg.storage_path=objects.name
    AND private.can_view_club_activity_report(sg.report_id))
));
