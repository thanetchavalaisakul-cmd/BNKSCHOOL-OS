
-- BNK SCHOOL OS: central student lifecycle and two annual roster cycles.
-- Preserve student identity and historical rows; close current/future enrollments only.

ALTER TABLE public.general_student_roster_events
  DROP CONSTRAINT IF EXISTS general_student_roster_events_event_type_check;
ALTER TABLE public.general_student_roster_events
  ADD CONSTRAINT general_student_roster_events_event_type_check
  CHECK (event_type IN ('student_added','transfer_in','transfer_out','student_exit_verified'));

CREATE OR REPLACE FUNCTION private.close_student_enrollments_from_period(
  p_student_id uuid,p_academic_year text,p_semester integer,
  p_enrollment_status text,p_exit_reason text,p_exit_note text,p_actor uuid
)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $function$
DECLARE v_changed integer:=0;
BEGIN
  IF p_student_id IS NULL OR p_academic_year IS NULL OR p_academic_year !~ '^[0-9]{4}$'
     OR p_semester NOT BETWEEN 1 AND 3
     OR p_enrollment_status NOT IN ('inactive','transferred_out','graduated')
     OR p_exit_reason NOT IN ('transferred_out','not_continuing','withdrawn','deceased','other') THEN
    RAISE EXCEPTION 'ข้อมูลการสิ้นสุดสถานะนักเรียนไม่ถูกต้อง';
  END IF;
  UPDATE public.student_enrollments e
     SET enrollment_status=p_enrollment_status,exit_reason=p_exit_reason,
         exit_note=nullif(btrim(coalesce(p_exit_note,'')),''),
         ended_at=clock_timestamp(),ended_by=p_actor,updated_at=clock_timestamp()
   WHERE e.student_id=p_student_id AND e.enrollment_status='active'
     AND (e.academic_year>p_academic_year
       OR (e.academic_year=p_academic_year AND e.semester>=p_semester));
  GET DIAGNOSTICS v_changed=ROW_COUNT;
  RETURN v_changed;
END;
$function$;
REVOKE ALL ON FUNCTION private.close_student_enrollments_from_period(uuid,text,integer,text,text,text,uuid)
  FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.resolve_student_import_reconciliation(p_session_id uuid,p_resolutions jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $function$
DECLARE
  v_item jsonb; v_id uuid; v_code text; v_note text;
  v_rec public.student_import_reconciliation_items%rowtype;
  v_session public.student_import_reconciliation_sessions%rowtype;
  v_student public.students%rowtype;
  v_actor text; v_status text; v_exit_reason text; v_default_note text;
  v_resolved integer:=0; v_pending integer:=0; v_closed integer:=0; v_total_closed integer:=0;
BEGIN
  IF auth.uid() IS NULL OR NOT private.can_manage_student_master() THEN
    RAISE EXCEPTION 'ไม่มีสิทธิ์ยืนยันสถานะนักเรียนจากการนำเข้า';
  END IF;
  IF jsonb_typeof(coalesce(p_resolutions,'[]'::jsonb))<>'array' THEN
    RAISE EXCEPTION 'ข้อมูลการยืนยันสถานะไม่ถูกต้อง';
  END IF;
  SELECT * INTO v_session FROM public.student_import_reconciliation_sessions
   WHERE id=p_session_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'ไม่พบรายการตรวจสอบการนำเข้า'; END IF;
  SELECT coalesce(nullif(btrim(p.full_name),''),p.email,'ผู้ใช้งาน')
    INTO v_actor FROM public.profiles p WHERE p.id=auth.uid();

  FOR v_item IN SELECT value FROM jsonb_array_elements(coalesce(p_resolutions,'[]'::jsonb))
  LOOP
    v_id:=nullif(v_item->>'item_id','')::uuid;
    v_code:=nullif(btrim(coalesce(v_item->>'resolution_code','')),'');
    v_note:=nullif(btrim(coalesce(v_item->>'resolution_note','')),'');
    IF v_code IS NULL THEN CONTINUE; END IF;
    IF v_code NOT IN ('keep_active','transferred_out','not_continuing','withdrawn',
      'over_criteria','graduated','deceased','invalid_record','other') THEN
      RAISE EXCEPTION 'สถานะการตรวจสอบไม่ถูกต้อง';
    END IF;
    IF v_code IN ('over_criteria','invalid_record','other') AND v_note IS NULL THEN
      RAISE EXCEPTION 'กรุณาระบุรายละเอียดสำหรับรายการที่เลือกเหตุผลเพิ่มเติม';
    END IF;
    SELECT * INTO v_rec FROM public.student_import_reconciliation_items i
     WHERE i.id=v_id AND i.session_id=p_session_id AND i.issue_type='missing_from_file'
     FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'ไม่พบรายชื่อนักเรียนที่ต้องตรวจสอบ'; END IF;
    IF v_rec.resolved_at IS NOT NULL AND v_rec.resolution_code IS DISTINCT FROM v_code THEN
      RAISE EXCEPTION 'รายการนี้ยืนยันสถานะแล้ว หากต้องการแก้ไขให้เปิดรายการตรวจสอบรอบใหม่';
    END IF;

    v_status:=NULL; v_exit_reason:=NULL; v_default_note:='คงสภาพนักเรียนไว้';
    IF v_code='transferred_out' THEN
      v_status:='transferred_out'; v_exit_reason:='transferred_out'; v_default_note:='ย้ายสถานศึกษา / ย้ายออก';
    ELSIF v_code='not_continuing' THEN
      v_status:='inactive'; v_exit_reason:='not_continuing'; v_default_note:='ไม่เรียนต่อ';
    ELSIF v_code='withdrawn' THEN
      v_status:='inactive'; v_exit_reason:='withdrawn'; v_default_note:='ลาออก / พ้นสภาพ';
    ELSIF v_code='over_criteria' THEN
      v_status:='inactive'; v_exit_reason:='other'; v_default_note:='เกินเกณฑ์';
    ELSIF v_code='graduated' THEN
      v_status:='graduated'; v_exit_reason:='other'; v_default_note:='จบการศึกษา';
    ELSIF v_code='deceased' THEN
      v_status:='inactive'; v_exit_reason:='deceased'; v_default_note:='เสียชีวิต';
    ELSIF v_code='invalid_record' THEN
      v_status:='inactive'; v_exit_reason:='other'; v_default_note:='ข้อมูลซ้ำ / ไม่มีตัวตนในทะเบียนจริง';
    ELSIF v_code='other' THEN
      v_status:='inactive'; v_exit_reason:='other'; v_default_note:='อื่น ๆ';
    END IF;

    IF v_status IS NOT NULL THEN
      IF v_rec.student_id IS NULL THEN
        RAISE EXCEPTION 'รายการนี้ยังไม่เชื่อมกับรหัสนักเรียนกลาง จึงไม่สามารถนำออกจากรายชื่อปัจจุบันได้';
      END IF;
      SELECT * INTO v_student FROM public.students WHERE id=v_rec.student_id FOR UPDATE;
      IF NOT FOUND THEN RAISE EXCEPTION 'ไม่พบข้อมูลนักเรียนกลางที่ต้องการปรับสถานะ'; END IF;
      v_closed:=private.close_student_enrollments_from_period(
        v_rec.student_id,v_session.academic_year,v_session.semester,v_status,v_exit_reason,
        CASE WHEN v_note IS NULL THEN v_default_note ELSE v_default_note||' · '||v_note END,
        auth.uid()
      );
      v_total_closed:=v_total_closed+v_closed;
      UPDATE public.students SET status=v_status,updated_by=auth.uid(),updated_at=clock_timestamp()
       WHERE id=v_rec.student_id;
      INSERT INTO public.general_student_roster_events(
        event_type,student_id,enrollment_id,actor_user_id,student_code,student_name,
        class_label,academic_year,semester,details
      ) VALUES (
        'student_exit_verified',v_rec.student_id,v_rec.enrollment_id,auth.uid(),
        coalesce(nullif(v_rec.student_code,''),v_student.student_code,''),
        concat_ws(' ',v_student.prefix,v_student.first_name,v_student.last_name),
        coalesce(nullif(v_rec.from_class_label,''),'ไม่ระบุชั้น/ห้อง'),
        v_session.academic_year,v_session.semester,
        jsonb_build_object('resolution_code',v_code,'resolution_note',v_note,
          'exit_reason',v_exit_reason,'affected_enrollments',v_closed,
          'effective_from_academic_year',v_session.academic_year,
          'effective_from_semester',v_session.semester,'source_session_id',p_session_id)
      );
    END IF;

    UPDATE public.student_import_reconciliation_items
       SET resolution_code=v_code,resolution_note=v_note,resolved_by=auth.uid(),
           resolved_by_name=coalesce(v_actor,'ผู้ใช้งาน'),resolved_at=clock_timestamp()
     WHERE id=v_id;
    v_resolved:=v_resolved+1;
  END LOOP;

  SELECT count(*) INTO v_pending
  FROM public.student_import_reconciliation_items
  WHERE session_id=p_session_id AND issue_type='missing_from_file' AND resolution_code IS NULL;
  UPDATE public.student_import_reconciliation_sessions
     SET status=CASE WHEN v_pending=0 THEN 'reviewed' ELSE 'pending_review' END,
         completed_at=CASE WHEN v_pending=0 THEN clock_timestamp() ELSE NULL END,
         updated_at=clock_timestamp()
   WHERE id=p_session_id;
  RETURN jsonb_build_object('resolved',v_resolved,'pending',v_pending,'closed_enrollments',v_total_closed);
END;
$function$;
REVOKE ALL ON FUNCTION public.resolve_student_import_reconciliation(uuid,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.resolve_student_import_reconciliation(uuid,jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.student_roster_cycle_overview(p_academic_year text DEFAULT NULL)
RETURNS TABLE (
  academic_year text,semester integer,due_date date,cycle_label text,cycle_status text,
  latest_session_id uuid,latest_session_status text,latest_source_filename text,
  latest_created_at timestamptz,completed_at timestamptz,missing_count integer,pending_count integer
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO ''
AS $function$
DECLARE
  v_year text:=nullif(btrim(coalesce(p_academic_year,'')),'');
  v_today date:=timezone('Asia/Bangkok',clock_timestamp())::date;
BEGIN
  IF auth.uid() IS NULL OR NOT private.can_manage_student_master() THEN
    RAISE EXCEPTION 'ไม่มีสิทธิ์ดูรอบการอัปเดตรายชื่อนักเรียน';
  END IF;
  IF v_year IS NULL THEN
    SELECT t.academic_year INTO v_year FROM public.academic_terms t
     WHERE t.is_current=true ORDER BY t.academic_year DESC,t.semester DESC LIMIT 1;
  END IF;
  IF v_year IS NULL THEN
    v_year:=(extract(year FROM timezone('Asia/Bangkok',clock_timestamp()))::integer+543)::text;
  END IF;
  IF v_year !~ '^[0-9]{4}$' OR v_year::integer<2500 OR v_year::integer>3000 THEN
    RAISE EXCEPTION 'ปีการศึกษาไม่ถูกต้อง';
  END IF;
  RETURN QUERY
  WITH cycles AS (
    SELECT 1::integer AS term,make_date(v_year::integer-543,6,10) AS due
    UNION ALL SELECT 2::integer,make_date(v_year::integer-543,11,10)
  )
  SELECT v_year,c.term,c.due,
    CASE WHEN c.term=1 THEN '10 มิถุนายน' ELSE '10 พฤศจิกายน' END,
    CASE WHEN l.id IS NULL THEN CASE WHEN v_today>=c.due THEN 'due' ELSE 'upcoming' END
         WHEN l.status='reviewed' THEN 'completed' ELSE l.status END,
    l.id,l.status,l.source_filename,l.created_at,l.completed_at,
    coalesce(l.missing_count,0)::integer,coalesce(pending.pending_count,0)::integer
  FROM cycles c
  LEFT JOIN LATERAL (
    SELECT s.* FROM public.student_import_reconciliation_sessions s
    WHERE s.academic_year=v_year AND s.semester=c.term
    ORDER BY s.created_at DESC,s.id DESC LIMIT 1
  ) l ON true
  LEFT JOIN LATERAL (
    SELECT count(*)::integer AS pending_count
    FROM public.student_import_reconciliation_items i
    WHERE i.session_id=l.id AND i.issue_type='missing_from_file' AND i.resolution_code IS NULL
  ) pending ON true
  ORDER BY c.term;
END;
$function$;
REVOKE ALL ON FUNCTION public.student_roster_cycle_overview(text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.student_roster_cycle_overview(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.general_student_roster_create_student(
  p_student_code text,p_citizen_id text,p_prefix text,p_first_name text,p_last_name text,
  p_birth_date date,p_gender text,p_class_id uuid,p_academic_year text,p_semester integer,
  p_entry_type text DEFAULT 'transfer_in',p_source_school text DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $function$
DECLARE
  c public.school_classes; s public.students; v_by_code public.students; v_by_citizen public.students;
  v_enrollment public.student_enrollments; v_student_number integer; v_full_name text;
  v_existing boolean:=false; v_reactivated boolean:=false; v_event_type text;
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
    IF s.status='graduated' THEN RAISE EXCEPTION 'นักเรียนรายนี้มีสถานะจบการศึกษาแล้ว กรุณาตรวจสอบก่อนรับกลับเข้าเรียน'; END IF;
    IF EXISTS (SELECT 1 FROM public.student_enrollments x WHERE x.student_id=s.id AND x.exit_reason='deceased') THEN
      RAISE EXCEPTION 'ไม่สามารถรับนักเรียนที่มีบันทึกสถานะเสียชีวิตกลับเข้าเรียนได้';
    END IF;
    IF EXISTS (SELECT 1 FROM public.student_enrollments x WHERE x.student_id=s.id
      AND x.academic_year=p_academic_year AND x.semester=p_semester AND x.enrollment_status='active') THEN
      RAISE EXCEPTION 'นักเรียนรายนี้มีรายชื่อในภาคเรียนและปีการศึกษานี้อยู่แล้ว กรุณาใช้เมนูเปลี่ยนห้องเรียน';
    END IF;
    v_reactivated:=s.status IS DISTINCT FROM 'active';
    UPDATE public.students SET student_code=btrim(p_student_code),citizen_id=btrim(p_citizen_id),
      prefix=btrim(p_prefix),first_name=btrim(p_first_name),last_name=btrim(p_last_name),
      birth_date=p_birth_date,gender=coalesce(p_gender,gender),status='active',
      updated_by=auth.uid(),updated_at=clock_timestamp()
    WHERE id=s.id RETURNING * INTO s;
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
$function$;
REVOKE ALL ON FUNCTION public.general_student_roster_create_student(text,text,text,text,text,date,text,uuid,text,integer,text,text)
  FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.general_student_roster_create_student(text,text,text,text,text,date,text,uuid,text,integer,text,text)
  TO authenticated;

CREATE OR REPLACE FUNCTION public.general_student_roster_list(p_academic_year text,p_semester integer)
RETURNS TABLE (
  enrollment_id uuid,student_id uuid,student_code text,prefix text,first_name text,last_name text,
  gender text,class_id uuid,class_label text,stage_code text,student_number integer,
  enrollment_status text,exit_reason text,exit_note text,ended_at timestamptz,created_at timestamptz
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO ''
AS $function$
BEGIN
  IF auth.uid() IS NULL OR NOT private.can_access_general_student_roster() THEN
    RAISE EXCEPTION 'ไม่มีสิทธิ์ดูบัญชีรายชื่อนักเรียนฝ่ายบริหารทั่วไป';
  END IF;
  IF p_academic_year IS NULL OR p_academic_year !~ '^[0-9]{4}$' OR p_semester NOT BETWEEN 1 AND 3 THEN
    RAISE EXCEPTION 'Academic period is invalid';
  END IF;
  RETURN QUERY
  SELECT e.id,s.id,s.student_code,s.prefix,s.first_name,s.last_name,s.gender,
    c.id,c.level_name||'/'||c.room_name,c.stage_code,e.student_number,
    e.enrollment_status,e.exit_reason,e.exit_note,e.ended_at,e.created_at
  FROM public.student_enrollments e
  JOIN public.students s ON s.id=e.student_id
  JOIN public.school_classes c ON c.id=e.class_id
  WHERE e.academic_year=p_academic_year AND e.semester=p_semester
    AND (e.enrollment_status<>'active' OR s.status='active'
      OR EXISTS (SELECT 1 FROM public.academic_terms t WHERE t.is_current=true
        AND (e.academic_year<t.academic_year OR (e.academic_year=t.academic_year AND e.semester<t.semester))))
  ORDER BY c.sort_order,c.level_name,c.room_name,e.student_number,s.student_code;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_student_class_roster(p_class_id uuid)
RETURNS TABLE (
  student_id uuid,student_code text,prefix text,first_name text,last_name text,gender text,
  class_id uuid,academic_year text,semester integer,stage_code text,level_name text,
  room_name text,homeroom_teacher_names text[]
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO ''
AS $function$
  SELECT s.id,s.student_code,s.prefix,s.first_name,s.last_name,s.gender,c.id,
    c.academic_year,c.semester,c.stage_code,c.level_name,c.room_name,
    coalesce((SELECT array_agg(DISTINCT p.full_name ORDER BY p.full_name)
      FROM public.homeroom_teachers h JOIN public.profiles p ON p.id=h.teacher_id
      WHERE h.class_id=c.id AND p.account_status='active' AND p.deleted_at IS NULL),array[]::text[])
  FROM public.school_classes c
  JOIN public.student_enrollments e ON e.class_id=c.id AND e.enrollment_status='active'
  JOIN public.students s ON s.id=e.student_id
  WHERE c.id=p_class_id AND c.is_active=true AND private.is_active_user()
    AND (s.status='active' OR EXISTS (
      SELECT 1 FROM public.academic_terms t WHERE t.is_current=true
       AND (c.academic_year<t.academic_year OR (c.academic_year=t.academic_year AND c.semester<t.semester))))
  ORDER BY CASE s.gender WHEN 'ชาย' THEN 0 WHEN 'หญิง' THEN 1 ELSE 2 END,
    CASE WHEN s.student_code~'^[0-9]+$' THEN s.student_code::bigint ELSE NULL END NULLS LAST,
    s.student_code,s.last_name,s.first_name;
$function$;

REVOKE ALL ON FUNCTION public.general_student_roster_list(text,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.general_student_roster_list(text,integer) TO authenticated;
REVOKE ALL ON FUNCTION public.get_student_class_roster(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_student_class_roster(uuid) TO authenticated;
