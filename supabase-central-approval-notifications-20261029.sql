-- BNK SCHOOL OS central approval notifications (applied to Supabase October 29, 2026)
-- No permission/approval workflow is changed. Idempotent trigger installation.
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS workflow_key text;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS notification_kind text NOT NULL DEFAULT 'info';
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS resolved_at timestamptz;
CREATE UNIQUE INDEX IF NOT EXISTS notifications_recipient_workflow_key_ux
 ON public.notifications(recipient_id,workflow_key) WHERE workflow_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS notifications_pending_action_recipient_idx
 ON public.notifications(recipient_id,created_at DESC)
 WHERE notification_kind='action' AND dismissed_at IS NULL;

CREATE OR REPLACE FUNCTION private.central_notification_document(p_system text, p_document uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE tbl text; v jsonb;
BEGIN
  tbl:=case p_system
    when 'academic_certificate' then 'academic_certificate_requests'
    when 'academic_document_service' then 'academic_document_service_requests'
    when 'academic_transfer' then 'academic_transfer_requests'
    when 'budget_disbursement' then 'budget_disbursements'
    when 'classroom_research' then 'academic_classroom_research_reports'
    when 'club_activity' then 'academic_club_activity_reports'
    when 'home_visit' then 'home_visit_records'
    when 'learner_activities' then 'academic_learner_activity_reports'
    when 'learning_media' then 'academic_learning_media_reports'
    when 'leave_management' then 'leave_requests'
    when 'lesson_plan_usage' then 'academic_lesson_plan_usage_reports'
    when 'lesson_plans' then 'lesson_plans'
    when 'post_lesson' then 'academic_post_lesson_reports'
    when 'substitute_teaching' then 'substitute_lessons'
    when 'timetable_management' then 'timetable_profiles'
    else null end;
  IF tbl IS NULL THEN RETURN NULL; END IF;
  EXECUTE format('SELECT to_jsonb(t) FROM public.%I t WHERE t.id=$1',tbl) INTO v USING p_document;
  RETURN v;
END $function$
;

CREATE OR REPLACE FUNCTION private.central_notification_actionable(p_system text, p_document uuid, p_version integer, p_slot text)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE d jsonb; st text; v integer;
BEGIN
  d:=private.central_notification_document(p_system,p_document);
  IF d IS NULL THEN RETURN false; END IF;
  st:=d->>'status';
  v:=coalesce((d->>'approval_version')::integer,1);
  IF v<>p_version THEN RETURN false; END IF;
  IF NOT private.approval_slot_available(p_system,p_document,p_version,p_slot) THEN RETURN false; END IF;
  IF p_system='leave_management' THEN
    RETURN st=case p_slot when 'personnel_head' then 'pending_personnel' when 'director' then 'pending_director' else 'never' end;
  ELSIF p_system='lesson_plans' THEN
    RETURN st=case p_slot when 'academic_head' then 'pending_head' when 'director' then 'pending_director' else 'never' end;
  ELSIF p_system='budget_disbursement' THEN
    RETURN st IN ('document_ready','printed');
  ELSIF p_system='home_visit' THEN
    RETURN st='submitted';
  ELSIF p_system='substitute_teaching' THEN
    RETURN st IN ('assigned','completed');
  ELSIF p_system='timetable_management' THEN
    RETURN st='submitted';
  ELSE
    RETURN st='submitted';
  END IF;
END $function$
;

CREATE OR REPLACE FUNCTION private.central_notification_recipients(p_system text, p_document uuid, p_slot text)
 RETURNS TABLE(user_id uuid)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE d jsonb; v_id uuid; reg_code text; cfg_table text; cfg_col text;
BEGIN
  d:=private.central_notification_document(p_system,p_document);
  IF d IS NULL THEN RETURN; END IF;
  IF p_slot='director' THEN
    RETURN QUERY
      SELECT DISTINCT e.user_id FROM public.approval_executives e
      JOIN public.profiles p ON p.id=e.user_id
      JOIN public.approval_system_registry r ON r.system_code=p_system
      WHERE e.is_active=true AND e.executive_kind IN ('director','acting_director')
        AND r.executive_kinds ? e.executive_kind
        AND p.account_status='active' AND p.deleted_at IS NULL;
    -- Existing registration workflows may authorize a configured director account.
    cfg_table:=case p_system
      when 'academic_certificate' then 'academic_certificate_settings'
      when 'academic_document_service' then 'academic_document_service_settings'
      when 'academic_transfer' then 'academic_registration_settings'
      else null end;
    IF cfg_table IS NOT NULL THEN
      RETURN QUERY EXECUTE format(
        'SELECT p.id FROM public.%I s JOIN public.profiles p ON p.id=s.director_user_id WHERE s.id=1 AND p.account_status=%L AND p.deleted_at IS NULL',
        cfg_table,'active');
    END IF;
  ELSIF p_slot IN ('academic_head','personnel_head') THEN
    reg_code:=case when p_slot='academic_head' then 'academic' else 'personnel' end;
    RETURN QUERY SELECT p.id FROM public.profiles p
      JOIN public.departments dep ON dep.id=p.department_id
      WHERE p.role='department_head' AND dep.code=reg_code AND dep.is_active
        AND p.account_status='active' AND p.deleted_at IS NULL;
  ELSIF p_slot='subject_group_head' THEN
    v_id:=nullif(d->>'subject_group_head_id','')::uuid;
    IF v_id IS NULL THEN
      SELECT g.head_user_id INTO v_id FROM public.academic_subject_group_heads g
      WHERE g.subject_group_id=nullif(d->>'subject_group_id','')::uuid
        AND g.academic_year=d->>'academic_year' LIMIT 1;
    END IF;
    RETURN QUERY SELECT p.id FROM public.profiles p WHERE p.id=v_id
      AND p.account_status='active' AND p.deleted_at IS NULL;
  ELSIF p_slot IN ('assessment_head','level_reviewer') THEN
    v_id:=nullif(d->>(p_slot||'_id'),'')::uuid;
    RETURN QUERY SELECT p.id FROM public.profiles p WHERE p.id=v_id
      AND p.account_status='active' AND p.deleted_at IS NULL;
  ELSIF p_system IN ('academic_certificate','academic_document_service','academic_transfer')
      AND p_slot IN ('preparer','registrar','finance','assessment') THEN
    cfg_table:=case p_system
      when 'academic_certificate' then 'academic_certificate_settings'
      when 'academic_document_service' then 'academic_document_service_settings'
      else 'academic_registration_settings' end;
    cfg_col:=p_slot||'_user_id';
    RETURN QUERY EXECUTE format(
      'SELECT p.id FROM public.%I s JOIN public.profiles p ON p.id=s.%I WHERE s.id=1 AND p.account_status=%L AND p.deleted_at IS NULL',
      cfg_table,cfg_col,'active');
  END IF;
END $function$
;

CREATE OR REPLACE FUNCTION private.central_sync_approval_notice(p_system text, p_document uuid, p_version integer DEFAULT 1)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE s record; recipient uuid; v_key text; v_current uuid[]; v_title text;
 v_module text; v_route text; v_count integer:=0;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.approval_system_registry r WHERE r.system_code=p_system AND r.is_active) THEN RETURN 0; END IF;
  SELECT r.system_name_th,r.module_code INTO v_title,v_module
    FROM public.approval_system_registry r WHERE r.system_code=p_system;
  v_route:=case v_module
    when 'leave_management' then '/personnel/leave/'||p_document::text
    when 'lesson_plans' then '/academic/lesson-plans'
    when 'project_management' then '/plan-budget/projects'
    when 'academic_submissions' then '/academic/submissions'
    when 'academic_registration' then '/academic/registration'
    when 'substitute_teaching' then '/academic/substitute-teaching'
    when 'timetable_management' then '/academic/timetables'
    when 'home_visit_management' then '/general/home-visit'
    else '/'||coalesce(v_module,'dashboard') end;
  FOR s IN SELECT slot_code,slot_order,decision FROM public.approval_document_slots
    WHERE system_code=p_system AND document_id=p_document AND document_version=p_version
  LOOP
    v_key:=format('approval:%s:%s:%s:%s',p_system,p_document,p_version,s.slot_code);
    IF s.decision='pending' AND
       private.central_notification_actionable(p_system,p_document,p_version,s.slot_code) THEN
      SELECT coalesce(array_agg(distinct z.user_id),'{}'::uuid[]) INTO v_current
        FROM private.central_notification_recipients(p_system,p_document,s.slot_code) z;
      -- Close notices that have lost authority, for example when delegated signers change.
      UPDATE public.notifications n SET resolved_at=coalesce(n.resolved_at,now()),
        dismissed_at=coalesce(n.dismissed_at,now())
      WHERE n.workflow_key=v_key AND n.recipient_id<>ALL(v_current) AND n.resolved_at IS NULL;
      FOREACH recipient IN ARRAY v_current LOOP
        -- Do not duplicate existing per-module pending notifications to the same recipient.
        IF NOT EXISTS (
          SELECT 1 FROM public.notifications n
          WHERE n.recipient_id=recipient AND n.entity_id=p_document
            AND n.dismissed_at IS NULL
            AND n.read_at IS NULL
            AND n.type=case when p_system='leave_management' then
              case s.slot_code when 'personnel_head' then 'leave_pending_personnel' else 'leave_pending_director' end
              when p_system='lesson_plans' then
              case s.slot_code when 'academic_head' then 'lesson_plan_pending_head' else 'lesson_plan_pending_director' end
              else 'NEVER_MATCH_LEGACY' end
        ) THEN
          INSERT INTO public.notifications(recipient_id,type,title,message,entity_type,entity_id,action_url,notification_kind,workflow_key)
          VALUES(recipient,'central_approval_action','มีงานรอตรวจสอบหรืออนุมัติ',
                 v_title||' · ขั้นตอน '||s.slot_code||' · กรุณาตรวจสอบเอกสาร',
                 'approval_document',p_document,v_route,'action',v_key)
          ON CONFLICT (recipient_id,workflow_key) WHERE workflow_key IS NOT NULL DO NOTHING;
          v_count:=v_count+1;
        END IF;
      END LOOP;
    ELSE
      UPDATE public.notifications n SET resolved_at=coalesce(n.resolved_at,now()),
        dismissed_at=coalesce(n.dismissed_at,now())
      WHERE n.workflow_key=v_key AND n.resolved_at IS NULL;
      -- The existing bell types also need to stop showing completed requests.
      IF p_system='leave_management' THEN
        UPDATE public.notifications n SET dismissed_at=coalesce(n.dismissed_at,now())
        WHERE n.entity_type='leave_request' AND n.entity_id=p_document AND n.dismissed_at IS NULL
          AND n.type=case s.slot_code when 'personnel_head' then 'leave_pending_personnel' else 'leave_pending_director' end;
      ELSIF p_system='lesson_plans' THEN
        UPDATE public.notifications n SET dismissed_at=coalesce(n.dismissed_at,now())
        WHERE n.entity_type='lesson_plan' AND n.entity_id=p_document AND n.dismissed_at IS NULL
          AND n.type=case s.slot_code when 'academic_head' then 'lesson_plan_pending_head' else 'lesson_plan_pending_director' end;
      END IF;
    END IF;
  END LOOP;
  RETURN v_count;
END $function$
;

CREATE OR REPLACE FUNCTION private.central_slot_notify_trigger()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
  PERFORM private.central_sync_approval_notice(NEW.system_code,NEW.document_id,NEW.document_version);
  RETURN NEW;
END $function$
;

CREATE OR REPLACE FUNCTION private.central_document_notify_trigger()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE v_system text;
BEGIN
  v_system:=TG_ARGV[0];
  PERFORM private.central_sync_approval_notice(v_system,NEW.id,
      coalesce(nullif(to_jsonb(NEW)->>'approval_version','')::integer,1));
  RETURN NEW;
END $function$
;

CREATE OR REPLACE FUNCTION public.refresh_my_approval_notifications()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE r record; v_total integer:=0;
BEGIN
  IF auth.uid() IS NULL OR NOT private.is_active_user() THEN
    RAISE EXCEPTION 'AUTHENTICATION_REQUIRED' USING ERRCODE='42501';
  END IF;
  FOR r IN SELECT DISTINCT s.system_code,s.document_id,s.document_version
    FROM public.approval_document_slots s
    JOIN public.approval_system_registry reg ON reg.system_code=s.system_code AND reg.is_active
    WHERE s.decision='pending' AND s.created_at > now()-interval '180 days'
    LIMIT 150
  LOOP
    v_total:=v_total+private.central_sync_approval_notice(r.system_code,r.document_id,r.document_version);
  END LOOP;
  RETURN v_total;
END $function$
;
DROP TRIGGER IF EXISTS central_slot_notify ON public.approval_document_slots;
CREATE TRIGGER central_slot_notify AFTER INSERT OR UPDATE OF decision ON public.approval_document_slots FOR EACH ROW EXECUTE FUNCTION private.central_slot_notify_trigger();
DROP TRIGGER IF EXISTS central_document_notify ON public.leave_requests;
CREATE TRIGGER central_document_notify AFTER INSERT OR UPDATE OF status ON public.leave_requests FOR EACH ROW EXECUTE FUNCTION private.central_document_notify_trigger('leave_management');
DROP TRIGGER IF EXISTS central_document_notify ON public.lesson_plans;
CREATE TRIGGER central_document_notify AFTER INSERT OR UPDATE OF status ON public.lesson_plans FOR EACH ROW EXECUTE FUNCTION private.central_document_notify_trigger('lesson_plans');
DROP TRIGGER IF EXISTS central_document_notify ON public.academic_certificate_requests;
CREATE TRIGGER central_document_notify AFTER INSERT OR UPDATE OF status ON public.academic_certificate_requests FOR EACH ROW EXECUTE FUNCTION private.central_document_notify_trigger('academic_certificate');
DROP TRIGGER IF EXISTS central_document_notify ON public.academic_document_service_requests;
CREATE TRIGGER central_document_notify AFTER INSERT OR UPDATE OF status ON public.academic_document_service_requests FOR EACH ROW EXECUTE FUNCTION private.central_document_notify_trigger('academic_document_service');
DROP TRIGGER IF EXISTS central_document_notify ON public.academic_transfer_requests;
CREATE TRIGGER central_document_notify AFTER INSERT OR UPDATE OF status ON public.academic_transfer_requests FOR EACH ROW EXECUTE FUNCTION private.central_document_notify_trigger('academic_transfer');
DROP TRIGGER IF EXISTS central_document_notify ON public.budget_disbursements;
CREATE TRIGGER central_document_notify AFTER INSERT OR UPDATE OF status ON public.budget_disbursements FOR EACH ROW EXECUTE FUNCTION private.central_document_notify_trigger('budget_disbursement');
DROP TRIGGER IF EXISTS central_document_notify ON public.academic_classroom_research_reports;
CREATE TRIGGER central_document_notify AFTER INSERT OR UPDATE OF status ON public.academic_classroom_research_reports FOR EACH ROW EXECUTE FUNCTION private.central_document_notify_trigger('classroom_research');
DROP TRIGGER IF EXISTS central_document_notify ON public.academic_club_activity_reports;
CREATE TRIGGER central_document_notify AFTER INSERT OR UPDATE OF status ON public.academic_club_activity_reports FOR EACH ROW EXECUTE FUNCTION private.central_document_notify_trigger('club_activity');
DROP TRIGGER IF EXISTS central_document_notify ON public.home_visit_records;
CREATE TRIGGER central_document_notify AFTER INSERT OR UPDATE OF status ON public.home_visit_records FOR EACH ROW EXECUTE FUNCTION private.central_document_notify_trigger('home_visit');
DROP TRIGGER IF EXISTS central_document_notify ON public.academic_learner_activity_reports;
CREATE TRIGGER central_document_notify AFTER INSERT OR UPDATE OF status ON public.academic_learner_activity_reports FOR EACH ROW EXECUTE FUNCTION private.central_document_notify_trigger('learner_activities');
DROP TRIGGER IF EXISTS central_document_notify ON public.academic_learning_media_reports;
CREATE TRIGGER central_document_notify AFTER INSERT OR UPDATE OF status ON public.academic_learning_media_reports FOR EACH ROW EXECUTE FUNCTION private.central_document_notify_trigger('learning_media');
DROP TRIGGER IF EXISTS central_document_notify ON public.academic_lesson_plan_usage_reports;
CREATE TRIGGER central_document_notify AFTER INSERT OR UPDATE OF status ON public.academic_lesson_plan_usage_reports FOR EACH ROW EXECUTE FUNCTION private.central_document_notify_trigger('lesson_plan_usage');
DROP TRIGGER IF EXISTS central_document_notify ON public.academic_post_lesson_reports;
CREATE TRIGGER central_document_notify AFTER INSERT OR UPDATE OF status ON public.academic_post_lesson_reports FOR EACH ROW EXECUTE FUNCTION private.central_document_notify_trigger('post_lesson');
DROP TRIGGER IF EXISTS central_document_notify ON public.substitute_lessons;
CREATE TRIGGER central_document_notify AFTER INSERT OR UPDATE OF status ON public.substitute_lessons FOR EACH ROW EXECUTE FUNCTION private.central_document_notify_trigger('substitute_teaching');
DROP TRIGGER IF EXISTS central_document_notify ON public.timetable_profiles;
CREATE TRIGGER central_document_notify AFTER INSERT OR UPDATE OF status ON public.timetable_profiles FOR EACH ROW EXECUTE FUNCTION private.central_document_notify_trigger('timetable_management');
REVOKE ALL ON FUNCTION public.refresh_my_approval_notifications() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.refresh_my_approval_notifications() TO authenticated;
