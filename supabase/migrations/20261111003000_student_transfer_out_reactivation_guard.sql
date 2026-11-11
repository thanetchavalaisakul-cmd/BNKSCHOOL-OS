-- Harden confirmed transfer-out lifecycle.
-- Keep master rows and historical enrollments for audit/document history.
-- Operational rosters are removed by closing all current/future active enrollments.
-- Only the receive-transfer RPC can reactivate a confirmed transfer-out record.

CREATE OR REPLACE FUNCTION private.guard_student_transfer_out_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  -- Only the approved transfer workflow can mark a learner as transferred out.
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

  -- A confirmed transfer-out can be reactivated only by the receive-transfer RPC.
  -- The RPC sets transaction-local markers for this exact student and actor,
  -- immediately resets them after the status update, and is permission-checked.
  IF TG_OP='UPDATE'
     AND OLD.status='transferred_out'
     AND NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status IS DISTINCT FROM 'active'
       OR auth.uid() IS NULL
       OR NOT private.can_add_general_students()
       OR pg_catalog.current_setting('bnk.transfer_in_student_id',true) IS DISTINCT FROM NEW.id::text
       OR pg_catalog.current_setting('bnk.transfer_in_actor_id',true) IS DISTINCT FROM auth.uid()::text THEN
      RAISE EXCEPTION 'นักเรียนที่ยืนยันย้ายออกแล้วจะคืนสถานะได้เฉพาะผ่านระบบรับย้ายเข้าเท่านั้น';
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION private.guard_student_transfer_out_status() FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.general_student_roster_create_student(p_student_code text, p_citizen_id text, p_prefix text, p_first_name text, p_last_name text, p_birth_date date, p_gender text, p_class_id uuid, p_academic_year text, p_semester integer, p_entry_type text DEFAULT 'transfer_in'::text, p_source_school text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  c public.school_classes; s public.students; v_by_code public.students; v_by_citizen public.students;
  v_enrollment public.student_enrollments; v_student_number integer; v_full_name text;
  v_existing boolean:=false; v_reactivated boolean:=false; v_event_type text;
  v_transfer_in_authorized boolean:=false;
BEGIN
  IF auth.uid() IS NULL OR NOT private.can_add_general_students() THEN
    RAISE EXCEPTION 'ไม่มีสิทธิ์เพิ่มนักเรียน';
  END IF;
  IF nullif(btrim(p_student_code),'') IS NULL OR nullif(btrim(p_citizen_id),'') IS NULL
     OR nullif(btrim(p_prefix),'') IS NULL OR nullif(btrim(p_first_name),'') IS NULL
     OR nullif(btrim(p_last_name),'') IS NULL OR p_birth_date IS NULL OR p_class_id IS NULL
     OR p_academic_year !~ '^[0-9]{4}$' OR p_semester NOT BETWEEN 1 AND 3 THEN
    RAISE EXCEPTION 'กรุณากรอกข้อมูลนักเรียนและห้องเรียนให้ครบถ้วน';
  END IF;
  IF p_gender IS NOT NULL AND p_gender NOT IN ('ชาย','หญิง') THEN RAISE EXCEPTION 'เพศไม่ถูกต้อง'; END IF;
  IF p_entry_type IS NULL OR p_entry_type NOT IN ('student_added','transfer_in') THEN
    RAISE EXCEPTION 'ประเภทการรับนักเรียนไม่ถูกต้อง';
  END IF;
  SELECT * INTO c FROM public.school_classes
   WHERE id=p_class_id AND academic_year=p_academic_year AND semester=p_semester AND is_active=true;
  IF NOT FOUND THEN RAISE EXCEPTION 'ไม่พบห้องเรียนที่เปิดใช้งานในปี/ภาคเรียนที่เลือก'; END IF;

  SELECT * INTO v_by_code FROM public.students WHERE student_code=btrim(p_student_code) FOR UPDATE;
  SELECT * INTO v_by_citizen FROM public.students WHERE citizen_id=btrim(p_citizen_id) FOR UPDATE;
  IF v_by_code.id IS NOT NULL AND v_by_citizen.id IS NOT NULL AND v_by_code.id<>v_by_citizen.id THEN
    RAISE EXCEPTION 'เลขประจำตัวนักเรียนและเลขประชาชน/เลข G ตรงกับคนละระเบียน กรุณาให้ฝ่ายวิชาการตรวจสอบ';
  END IF;
  IF v_by_code.id IS NOT NULL AND v_by_citizen.id IS NULL THEN
    RAISE EXCEPTION 'เลขประจำตัวนักเรียนนี้มีอยู่แล้ว แต่เลขประชาชน/เลข G ไม่ตรงกับทะเบียนเดิม';
  END IF;

  IF v_by_citizen.id IS NOT NULL THEN
    s:=v_by_citizen; v_existing:=true;
    IF s.status='transferred_out' AND p_entry_type<>'transfer_in' THEN
      RAISE EXCEPTION 'นักเรียนที่ยืนยันย้ายออกแล้ว ต้องดำเนินการรับย้ายเข้าผ่านระบบรับย้ายเข้าเท่านั้น';
    END IF;
    IF s.status='graduated' THEN RAISE EXCEPTION 'นักเรียนรายนี้มีสถานะจบการศึกษาแล้ว กรุณาตรวจสอบก่อนรับกลับเข้าเรียน'; END IF;
    IF EXISTS (SELECT 1 FROM public.student_enrollments x WHERE x.student_id=s.id AND x.exit_reason='deceased') THEN
      RAISE EXCEPTION 'ไม่สามารถรับนักเรียนที่มีบันทึกสถานะเสียชีวิตกลับเข้าเรียนได้';
    END IF;
    IF EXISTS (SELECT 1 FROM public.student_enrollments x WHERE x.student_id=s.id
      AND x.academic_year=p_academic_year AND x.semester=p_semester AND x.enrollment_status='active') THEN
      RAISE EXCEPTION 'นักเรียนรายนี้มีรายชื่อในภาคเรียนและปีการศึกษานี้อยู่แล้ว กรุณาใช้เมนูเปลี่ยนห้องเรียน';
    END IF;
    v_transfer_in_authorized:=s.status='transferred_out' AND p_entry_type='transfer_in';
    IF v_transfer_in_authorized THEN
      PERFORM pg_catalog.set_config('bnk.transfer_in_student_id',s.id::text,true);
      PERFORM pg_catalog.set_config('bnk.transfer_in_actor_id',auth.uid()::text,true);
    END IF;
    v_reactivated:=s.status IS DISTINCT FROM 'active';
    UPDATE public.students SET student_code=btrim(p_student_code),citizen_id=btrim(p_citizen_id),
      prefix=btrim(p_prefix),first_name=btrim(p_first_name),last_name=btrim(p_last_name),
      birth_date=p_birth_date,gender=coalesce(p_gender,gender),status='active',
      updated_by=auth.uid(),updated_at=clock_timestamp()
    WHERE id=s.id RETURNING * INTO s;
    IF v_transfer_in_authorized THEN
      PERFORM pg_catalog.set_config('bnk.transfer_in_student_id','',true);
      PERFORM pg_catalog.set_config('bnk.transfer_in_actor_id','',true);
    END IF;
  ELSE
    INSERT INTO public.students(student_code,citizen_id,prefix,first_name,last_name,birth_date,gender,status,created_by,updated_by)
    VALUES(btrim(p_student_code),btrim(p_citizen_id),btrim(p_prefix),btrim(p_first_name),
      btrim(p_last_name),p_birth_date,p_gender,'active',auth.uid(),auth.uid())
    RETURNING * INTO s;
  END IF;

  SELECT coalesce(max(x.student_number),0)+1 INTO v_student_number
  FROM public.student_enrollments x WHERE x.class_id=c.id AND x.enrollment_status='active';
  SELECT * INTO v_enrollment FROM public.student_enrollments x
   WHERE x.student_id=s.id AND x.academic_year=p_academic_year AND x.semester=p_semester FOR UPDATE;
  IF FOUND THEN
    IF v_enrollment.enrollment_status='active' THEN RAISE EXCEPTION 'นักเรียนรายนี้มีรายชื่อในภาคเรียนนี้อยู่แล้ว'; END IF;
    UPDATE public.student_enrollments SET class_id=c.id,student_number=v_student_number,
      enrollment_status='active',exit_reason=NULL,exit_note=NULL,ended_at=NULL,ended_by=NULL,
      updated_at=clock_timestamp()
    WHERE id=v_enrollment.id RETURNING * INTO v_enrollment;
    v_reactivated:=true;
  ELSE
    INSERT INTO public.student_enrollments(student_id,class_id,academic_year,semester,student_number,enrollment_status,created_by)
    VALUES(s.id,c.id,p_academic_year,p_semester,v_student_number,'active',auth.uid())
    RETURNING * INTO v_enrollment;
  END IF;

  v_full_name:=concat_ws(' ',s.prefix,s.first_name,s.last_name);
  v_event_type:=CASE WHEN v_reactivated THEN 'transfer_in' ELSE p_entry_type END;
  INSERT INTO public.general_student_roster_events(
    event_type,student_id,enrollment_id,actor_user_id,student_code,student_name,class_label,
    academic_year,semester,details
  ) VALUES(v_event_type,s.id,v_enrollment.id,auth.uid(),s.student_code,v_full_name,
    c.level_name||'/'||c.room_name,p_academic_year,p_semester,
    jsonb_build_object('gender',s.gender,'birth_date',s.birth_date,
      'source_school',nullif(btrim(p_source_school),''),'reused_master_record',v_existing,'reactivated',v_reactivated));
  RETURN jsonb_build_object('ok',true,'student_id',s.id,'student_code',s.student_code,
    'student_name',v_full_name,'class_label',c.level_name||'/'||c.room_name,
    'academic_year',p_academic_year,'semester',p_semester,
    'reused_master_record',v_existing,'reactivated',v_reactivated);
END;
$function$
;

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
