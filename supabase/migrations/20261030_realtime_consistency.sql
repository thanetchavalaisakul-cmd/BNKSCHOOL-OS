-- Apply only after the v5.12.9.56 debounced Realtime client deploys.
-- Each table already has RLS enabled; enrollment and student listeners are burst-coalesced.
DO $bnk$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['home_visit_records','students','student_enrollments','academic_post_lesson_reports','academic_post_lesson_behavior_scores','academic_post_lesson_signatures','academic_lesson_plan_usage_reports','academic_lesson_plan_usage_signatures','academic_learning_media_reports','academic_learning_media_signatures','academic_club_activity_reports','academic_club_activity_members','academic_club_activity_signatures','academic_subject_group_heads','academic_submission_deadlines','academic_document_service_requests','academic_document_service_signatures','personnel_pa_periods','personnel_pa_submissions','student_cards','home_visit_settings','home_visit_household_members'] LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables pt
      WHERE pt.pubname='supabase_realtime' AND pt.schemaname='public' AND pt.tablename=t
    ) THEN
      IF NOT EXISTS (
         SELECT 1 FROM pg_class c JOIN pg_namespace n ON c.relnamespace=n.oid
         WHERE n.nspname='public' AND c.relname=t AND c.relrowsecurity
      ) THEN
        RAISE EXCEPTION 'Realtime table %. must have RLS enabled', t;
      END IF;
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I',t);
    END IF;
  END LOOP;
END
$bnk$;
