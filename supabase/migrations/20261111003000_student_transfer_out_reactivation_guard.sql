-- Keep a confirmed transfer-out as a durable tombstone.
-- Only the explicitly authorized receive-transfer workflow may reactivate it.
-- The student master row and historical enrollments are retained for audit,
-- documents, and to prevent a later DMC import from recreating the student.

CREATE OR REPLACE FUNCTION private.guard_student_transfer_out_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  -- Entering transferred_out is still allowed only from the approved transfer workflow.
  IF NEW.status='transferred_out' THEN
    IF TG_OP='INSERT' THEN
      IF NOT private.is_authorized_transfer_out(NEW.id,NULL,NULL) THEN
        RAISE EXCEPTION 'การย้ายออกต้องดำเนินการผ่านระบบย้ายสถานศึกษาเท่านั้น';
      END IF;
    ELSIF OLD.status IS DISTINCT FROM 'transferred_out' THEN
      IF NOT private.is_authorized_transfer_out(NEW.id,NULL,NULL) THEN
        RAISE EXCEPTION 'การย้ายออกต้องดำเนินการผ่านระบบย้ายสถานศึกษาเท่านั้น';
      END IF;
    END IF;
  END IF;

  -- Once transfer-out is confirmed, only the authorized receive-transfer workflow
  -- may reactivate the master record. DMC imports and general edits cannot restore it.
  IF TG_OP='UPDATE'
     AND OLD.status='transferred_out'
     AND NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status<>'active'
       OR auth.uid() IS NULL
       OR NOT private.can_add_general_students() THEN
      RAISE EXCEPTION 'นักเรียนที่ยืนยันย้ายออกแล้วจะคืนสถานะได้เฉพาะผ่านระบบรับย้ายเข้าเท่านั้น';
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION private.guard_student_transfer_out_status() FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.general_student_roster_finalize_transfer(p_request_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  r public.academic_transfer_requests;
  e public.student_enrollments;
  v_class_label text;
  v_student_name text;
  v_exit_note text;
  v_affected_periods jsonb := '[]'::jsonb;
  v_changed integer := 0;
  v_processed_at timestamptz;
BEGIN
  IF auth.uid() IS NULL OR NOT private.can_manage_general_student_transfers() THEN
    RAISE EXCEPTION 'ไม่มีสิทธิ์ดำเนินการย้ายออก';
  END IF;

  SELECT * INTO r
  FROM public.academic_transfer_requests
  WHERE id=p_request_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'ไม่พบใบคำร้องย้ายสถานศึกษานี้'; END IF;
  IF r.status<>'approved' OR r.finance_status<>'paid'
     OR r.finance_decision<>'approve' OR r.registrar_decision<>'approve'
     OR r.assessment_decision<>'approve' OR r.director_decision<>'approve' THEN
    RAISE EXCEPTION 'ใบย้ายยังไม่ผ่านการอนุมัติครบทุกฝ่าย';
  END IF;
  IF r.roster_processed_at IS NOT NULL THEN
    RAISE EXCEPTION 'รายการนี้ดำเนินการย้ายออกแล้ว';
  END IF;
  IF r.academic_year IS NULL OR r.academic_year !~ '^[0-9]{4}$'
     OR r.semester NOT BETWEEN 1 AND 3 THEN
    RAISE EXCEPTION 'ปีการศึกษา/ภาคเรียนในใบย้ายไม่ถูกต้อง';
  END IF;

  -- Lock the referenced enrollment: do not accept a request that points at a
  -- different class or an already-processed child.
  SELECT * INTO e
  FROM public.student_enrollments x
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
  v_exit_note:=concat('ย้ายไป ',
    coalesce(nullif(btrim(r.destination_school),''),'ไม่ระบุโรงเรียนปลายทาง'),
    ' ตามใบย้าย ',coalesce(r.request_code,p_request_id::text));

  -- Preserve each old number in the audit event; do NOT delete enrollments.
  -- The yyyy/semester comparison includes already-copied subsequent terms.
  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'enrollment_id',x.id,'class_id',x.class_id,
    'academic_year',x.academic_year,'semester',x.semester,
    'previous_student_number',x.student_number)
    ORDER BY x.academic_year,x.semester),'[]'::jsonb)
  INTO v_affected_periods
  FROM public.student_enrollments x
  WHERE x.student_id=r.student_id AND x.enrollment_status='active'
    AND (x.academic_year>r.academic_year
      OR (x.academic_year=r.academic_year AND x.semester>=r.semester));

  v_processed_at:=statement_timestamp();
  UPDATE public.academic_transfer_requests
  SET roster_processed_at=v_processed_at,
      roster_processed_by=auth.uid(),updated_by=auth.uid()
  WHERE id=r.id;

  UPDATE public.student_enrollments x
  SET enrollment_status='transferred_out',exit_reason='transferred_out',
      exit_note=v_exit_note,ended_at=v_processed_at,ended_by=auth.uid()
  WHERE x.student_id=r.student_id AND x.enrollment_status='active'
    AND (x.academic_year>r.academic_year
      OR (x.academic_year=r.academic_year AND x.semester>=r.semester));
  GET DIAGNOSTICS v_changed = ROW_COUNT;
  IF v_changed<1 OR v_changed<>jsonb_array_length(v_affected_periods) THEN
    RAISE EXCEPTION 'ไม่สามารถปรับสถานะรายชื่อนักเรียนได้ครบทุกภาคเรียน';
  END IF;

  -- Master status reflects the learner's CURRENT school membership; prior
  -- enrollment rows in earlier terms still exist for historical documents.
  UPDATE public.students
  SET status='transferred_out',updated_by=auth.uid(),updated_at=v_processed_at
  WHERE id=r.student_id AND status IS DISTINCT FROM 'transferred_out';

  UPDATE public.notifications
  SET resolved_at=coalesce(resolved_at,v_processed_at)
  WHERE entity_id=r.id AND type='general_student_transfer_action';

  INSERT INTO public.general_student_roster_events(
    event_type,student_id,enrollment_id,transfer_request_id,actor_user_id,
    student_code,student_name,class_label,academic_year,semester,details
  ) VALUES (
    'transfer_out',r.student_id,e.id,r.id,auth.uid(),r.student_code,
    coalesce(v_student_name,r.student_name),coalesce(v_class_label,r.class_label),
    r.academic_year,r.semester,
    jsonb_build_object('request_code',r.request_code,'transfer_date',r.transfer_date,
      'destination_school',r.destination_school,
      'destination_district',r.destination_district,
      'destination_province',r.destination_province,'exit_note',v_exit_note,
      'affected_periods',v_affected_periods,'affected_enrollments',v_changed)
  );

  RETURN jsonb_build_object('ok',true,'request_id',r.id,'student_id',r.student_id,
    'student_name',coalesce(v_student_name,r.student_name),
    'class_label',coalesce(v_class_label,r.class_label),
    'roster_processed_at',v_processed_at,'affected_enrollments',v_changed);
END;
$function$
;
