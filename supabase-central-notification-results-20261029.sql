-- Approval outcome notices (existing leave/lesson-plan/budget outcome notifications remain intact).
CREATE OR REPLACE FUNCTION private.central_notify_document_result(p_system text, p_document uuid, p_version integer, p_new_status text)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE d jsonb; v_user uuid; v_text text; v_title text;
 v_route text; v_module text; v_key text; v_count integer:=0;
BEGIN
  -- Leave, lesson-plan and budget flows already deliver their own outcome notices.
  IF p_system IN ('leave_management','lesson_plans','budget_disbursement') THEN RETURN 0; END IF;
  IF p_new_status NOT IN ('approved','rejected','revision_requested','completed') THEN RETURN 0; END IF;
  SELECT system_name_th,module_code INTO v_title,v_module
    FROM public.approval_system_registry WHERE system_code=p_system AND is_active=true;
  IF v_title IS NULL THEN RETURN 0; END IF;
  d:=private.central_notification_document(p_system,p_document);
  IF d IS NULL THEN RETURN 0; END IF;
  v_route:=case v_module
    when 'academic_submissions' then '/academic/submissions'
    when 'academic_registration' then '/academic/registration'
    when 'home_visit_management' then '/general/home-visit'
    when 'timetable_management' then '/academic/timetables'
    when 'substitute_teaching' then '/academic/substitute-teaching'
    else '/'||coalesce(v_module,'dashboard') end;
  v_title:=case p_new_status
    when 'approved' then 'เอกสารได้รับการอนุมัติแล้ว'
    when 'rejected' then 'เอกสารไม่ได้รับการอนุมัติ'
    when 'revision_requested' then 'เอกสารถูกส่งกลับให้แก้ไข'
    when 'completed' then 'ดำเนินการเอกสารเรียบร้อยแล้ว' end;
  v_key:=format('approval-result:%s:%s:%s:%s',p_system,p_document,p_version,p_new_status);
  -- Use only actual submitters/owners from the source document. Shared teams get their own notice.
  FOR v_user IN
    SELECT DISTINCT p.id
    FROM public.profiles p
    WHERE p.account_status='active' AND p.deleted_at IS NULL
      AND p.id IN (
        SELECT nullif(coalesce(d->>'submitted_by',d->>'teacher_id',d->>'requester_id',
                  d->>'created_by',d->>'homeroom_teacher_id',d->>'absent_teacher_id'),'')::uuid
        UNION
        SELECT value::uuid
        FROM jsonb_array_elements_text(
          case when jsonb_typeof(d->'shared_teacher_ids')='array'
               then d->'shared_teacher_ids' else '[]'::jsonb end
        ) as team(value)
      )
  LOOP
    INSERT INTO public.notifications(
      recipient_id,type,title,message,entity_type,entity_id,action_url,workflow_key,notification_kind
    )
    VALUES(v_user,'central_approval_result',v_title,
      coalesce((SELECT system_name_th FROM public.approval_system_registry WHERE system_code=p_system),p_system)
        ||' · สถานะ '||p_new_status,
      'approval_document',p_document,v_route,v_key,'result')
    ON CONFLICT (recipient_id,workflow_key) WHERE workflow_key IS NOT NULL DO NOTHING;
    v_count:=v_count+1;
  END LOOP;
  RETURN v_count;
END $function$
;

CREATE OR REPLACE FUNCTION private.central_document_notify_trigger()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE v_system text; v_version integer;
BEGIN
  v_system:=TG_ARGV[0];
  v_version:=coalesce(nullif(to_jsonb(NEW)->>'approval_version','')::integer,1);
  PERFORM private.central_sync_approval_notice(v_system,NEW.id,v_version);
  IF TG_OP='UPDATE' THEN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      PERFORM private.central_notify_document_result(v_system,NEW.id,v_version,NEW.status);
    END IF;
  END IF;
  RETURN NEW;
END $function$
;
