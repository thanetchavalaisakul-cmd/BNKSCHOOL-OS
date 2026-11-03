-- Keep the academic approval timestamp separate from general-office roster processing.
ALTER TABLE public.academic_transfer_requests
  ADD COLUMN IF NOT EXISTS roster_processed_at timestamptz,
  ADD COLUMN IF NOT EXISTS roster_processed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS academic_transfer_roster_pending_idx
  ON public.academic_transfer_requests(status,roster_processed_at)
  WHERE status='approved' AND roster_processed_at IS NULL;

CREATE OR REPLACE FUNCTION public.general_student_roster_transfer_queue()
RETURNS TABLE (
  request_id uuid, request_code text, student_id uuid, student_code text,
  student_name text, class_label text, academic_year text, semester integer,
  request_date date, transfer_date date, destination_school text,
  destination_district text, destination_province text, updated_at timestamptz,
  has_active_enrollment boolean
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO ''
AS $function$
BEGIN
  IF auth.uid() IS NULL OR NOT private.can_access_general_student_roster() THEN
    RAISE EXCEPTION 'ไม่มีสิทธิ์ดูรายการย้ายออก';
  END IF;
  RETURN QUERY
  SELECT r.id,r.request_code,r.student_id,r.student_code,r.student_name,r.class_label,
    r.academic_year,r.semester,r.request_date,r.transfer_date,
    r.destination_school,r.destination_district,r.destination_province,r.updated_at,
    EXISTS (
      SELECT 1 FROM public.student_enrollments e
      WHERE e.student_id=r.student_id AND e.academic_year=r.academic_year
        AND e.semester=r.semester AND e.enrollment_status='active'
        AND (r.class_id IS NULL OR e.class_id=r.class_id)
    )
  FROM public.academic_transfer_requests r
  WHERE r.status='approved' AND r.roster_processed_at IS NULL
  ORDER BY r.updated_at DESC,r.created_at DESC;
END;
$function$;

CREATE OR REPLACE FUNCTION public.general_student_roster_finalize_transfer(p_request_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $function$
DECLARE
  r public.academic_transfer_requests;
  e public.student_enrollments;
  v_class_label text;
  v_student_name text;
  v_exit_note text;
BEGIN
  IF auth.uid() IS NULL OR NOT private.can_manage_general_student_transfers() THEN
    RAISE EXCEPTION 'ไม่มีสิทธิ์ดำเนินการย้ายออก';
  END IF;
  SELECT * INTO r FROM public.academic_transfer_requests WHERE id=p_request_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'ไม่พบใบคำร้องย้ายสถานศึกษานี้'; END IF;
  IF r.status<>'approved' OR r.finance_status<>'paid' OR r.finance_decision<>'approve'
     OR r.registrar_decision<>'approve' OR r.assessment_decision<>'approve'
     OR r.director_decision<>'approve' THEN
    RAISE EXCEPTION 'ใบย้ายยังไม่ผ่านการอนุมัติครบทุกฝ่าย';
  END IF;
  IF r.roster_processed_at IS NOT NULL THEN
    RAISE EXCEPTION 'รายการนี้ดำเนินการย้ายออกแล้ว';
  END IF;
  SELECT * INTO e FROM public.student_enrollments x
  WHERE x.student_id=r.student_id AND x.academic_year=r.academic_year
    AND x.semester=r.semester AND x.enrollment_status='active'
    AND (r.class_id IS NULL OR x.class_id=r.class_id)
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'ไม่พบรายชื่อนักเรียนที่กำลังเรียนในชั้น/ภาคเรียนตามใบย้าย';
  END IF;
  SELECT c.level_name||'/'||c.room_name INTO v_class_label
  FROM public.school_classes c WHERE c.id=e.class_id;
  SELECT concat_ws(' ',s.prefix,s.first_name,s.last_name) INTO v_student_name
  FROM public.students s WHERE s.id=r.student_id;
  v_exit_note:=concat('ย้ายไป ',coalesce(nullif(btrim(r.destination_school),''),'ไม่ระบุโรงเรียนปลายทาง'),
    ' ตามใบย้าย ',coalesce(r.request_code,p_request_id::text));
  UPDATE public.student_enrollments
  SET enrollment_status='transferred_out',exit_reason='transferred_out',
      exit_note=v_exit_note,ended_at=clock_timestamp(),ended_by=auth.uid()
  WHERE id=e.id;
  UPDATE public.academic_transfer_requests
  SET roster_processed_at=clock_timestamp(),roster_processed_by=auth.uid(),updated_by=auth.uid()
  WHERE id=r.id;
  INSERT INTO public.general_student_roster_events(
    event_type,student_id,enrollment_id,transfer_request_id,actor_user_id,
    student_code,student_name,class_label,academic_year,semester,details
  ) VALUES (
    'transfer_out',r.student_id,e.id,r.id,auth.uid(),r.student_code,
    coalesce(v_student_name,r.student_name),coalesce(v_class_label,r.class_label),
    r.academic_year,r.semester,
    jsonb_build_object('request_code',r.request_code,'transfer_date',r.transfer_date,
      'destination_school',r.destination_school,'destination_district',r.destination_district,
      'destination_province',r.destination_province,'exit_note',v_exit_note)
  );
  RETURN jsonb_build_object('ok',true,'request_id',r.id,'student_id',r.student_id,
    'student_name',coalesce(v_student_name,r.student_name),
    'class_label',coalesce(v_class_label,r.class_label),'roster_processed_at',clock_timestamp());
END;
$function$;

CREATE OR REPLACE FUNCTION private.notify_general_student_roster_transfer()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $function$
BEGIN
  IF NEW.status='approved' AND NEW.roster_processed_at IS NULL
     AND (TG_OP='INSERT' OR OLD.status IS DISTINCT FROM 'approved') THEN
    INSERT INTO public.notifications(recipient_id,type,title,message,entity_type,entity_id,action_url,workflow_key,notification_kind)
    SELECT p.id,'general_student_transfer_action','มีใบย้ายนักเรียนรอดำเนินการ',
      concat(coalesce(NEW.student_name,'นักเรียน'),' · ',coalesce(NEW.class_label,'ไม่ระบุชั้น'),
        ' · ใบย้าย ',coalesce(NEW.request_code,'ไม่ระบุเลขที่'),' ได้รับอนุมัติแล้ว กรุณาตรวจสอบและดำเนินการย้ายออก'),
      'general_student_transfer',NEW.id,'module:general_student_roster',
      'general-student-transfer:'||NEW.id::text||':approved','action'
    FROM public.profiles p
    LEFT JOIN public.general_student_roster_permissions g ON g.user_id=p.id
    WHERE p.account_status='active' AND p.deleted_at IS NULL
      AND (p.role='super_admin' OR (g.is_active=true AND g.can_view=true AND g.can_manage_transfers=true))
    ON CONFLICT (recipient_id,workflow_key) WHERE workflow_key IS NOT NULL DO NOTHING;
  END IF;
  RETURN NEW;
END;
$function$;

INSERT INTO public.notifications(recipient_id,type,title,message,entity_type,entity_id,action_url,workflow_key,notification_kind)
SELECT p.id,'general_student_transfer_action','มีใบย้ายนักเรียนรอดำเนินการ',
  concat(coalesce(r.student_name,'นักเรียน'),' · ',coalesce(r.class_label,'ไม่ระบุชั้น'),
    ' · ใบย้าย ',coalesce(r.request_code,'ไม่ระบุเลขที่'),' ได้รับอนุมัติแล้ว กรุณาตรวจสอบและดำเนินการย้ายออก'),
  'general_student_transfer',r.id,'module:general_student_roster',
  'general-student-transfer:'||r.id::text||':approved','action'
FROM public.academic_transfer_requests r
CROSS JOIN public.profiles p
LEFT JOIN public.general_student_roster_permissions g ON g.user_id=p.id
WHERE r.status='approved' AND r.roster_processed_at IS NULL
  AND p.account_status='active' AND p.deleted_at IS NULL
  AND (p.role='super_admin' OR (g.is_active=true AND g.can_view=true AND g.can_manage_transfers=true))
ON CONFLICT (recipient_id,workflow_key) WHERE workflow_key IS NOT NULL DO NOTHING;

REVOKE ALL ON FUNCTION public.general_student_roster_transfer_queue() FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.general_student_roster_finalize_transfer(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.general_student_roster_transfer_queue() TO authenticated;
GRANT EXECUTE ON FUNCTION public.general_student_roster_finalize_transfer(uuid) TO authenticated;
