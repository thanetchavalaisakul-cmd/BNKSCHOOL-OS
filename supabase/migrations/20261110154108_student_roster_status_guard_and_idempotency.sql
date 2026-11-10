
-- Make verified exits idempotent and enforce the central master status across all current/future rosters.

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

    -- Repeated submissions of the same reviewed row are safe; changing a verified
    -- decision requires a new review item so a past exit cannot be silently reversed.
    IF v_rec.resolved_at IS NOT NULL THEN
      IF v_rec.resolution_code IS DISTINCT FROM v_code THEN
        RAISE EXCEPTION 'รายการนี้ยืนยันสถานะแล้ว หากต้องการแก้ไขให้เปิดรายการตรวจสอบรอบใหม่';
      END IF;
      CONTINUE;
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

CREATE OR REPLACE FUNCTION private.sync_student_master_status_to_current_enrollments()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_year text;
  v_semester integer;
  v_enrollment_status text;
  v_exit_reason text;
BEGIN
  IF OLD.status IS NOT DISTINCT FROM NEW.status OR NEW.status='active' THEN
    RETURN NEW;
  END IF;

  SELECT t.academic_year,t.semester INTO v_year,v_semester
  FROM public.academic_terms t
  WHERE t.is_current=true
  ORDER BY t.academic_year DESC,t.semester DESC
  LIMIT 1;

  IF v_year IS NULL OR v_semester IS NULL THEN
    v_year:=(extract(year FROM timezone('Asia/Bangkok',clock_timestamp()))::integer+543)::text;
    v_semester:=CASE
      WHEN extract(month FROM timezone('Asia/Bangkok',clock_timestamp()))::integer >= 11
        OR extract(month FROM timezone('Asia/Bangkok',clock_timestamp()))::integer < 6
      THEN 2 ELSE 1 END;
  END IF;

  v_enrollment_status:=CASE
    WHEN NEW.status='transferred_out' THEN 'transferred_out'
    WHEN NEW.status='graduated' THEN 'graduated'
    ELSE 'inactive'
  END;
  v_exit_reason:=CASE WHEN NEW.status='transferred_out' THEN 'transferred_out' ELSE 'other' END;

  UPDATE public.student_enrollments e
     SET enrollment_status=v_enrollment_status,
         exit_reason=v_exit_reason,
         exit_note=coalesce(nullif(e.exit_note,''),'ปิดรายชื่อจากสถานะทะเบียนนักเรียนกลาง'),
         ended_at=coalesce(e.ended_at,clock_timestamp()),
         ended_by=coalesce(e.ended_by,NEW.updated_by),
         updated_at=clock_timestamp()
   WHERE e.student_id=NEW.id
     AND e.enrollment_status='active'
     AND (e.academic_year>v_year OR (e.academic_year=v_year AND e.semester>=v_semester));

  RETURN NEW;
END;
$function$;
REVOKE ALL ON FUNCTION private.sync_student_master_status_to_current_enrollments() FROM PUBLIC,anon,authenticated;

DROP TRIGGER IF EXISTS trg_sync_student_master_status_to_current_enrollments ON public.students;
CREATE TRIGGER trg_sync_student_master_status_to_current_enrollments
AFTER UPDATE OF status ON public.students
FOR EACH ROW
EXECUTE FUNCTION private.sync_student_master_status_to_current_enrollments();

CREATE OR REPLACE FUNCTION private.guard_active_student_enrollment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  IF NEW.enrollment_status='active'
     AND NOT EXISTS (
       SELECT 1 FROM public.students s
       WHERE s.id=NEW.student_id AND s.status='active'
     ) THEN
    RAISE EXCEPTION 'ไม่สามารถเพิ่มนักเรียนที่ไม่ได้มีสถานะปัจจุบันกลับเข้ารายชื่อได้ กรุณาใช้ขั้นตอนรับย้ายเข้าเพื่อคืนสถานะทะเบียนกลางก่อน';
  END IF;
  RETURN NEW;
END;
$function$;
REVOKE ALL ON FUNCTION private.guard_active_student_enrollment() FROM PUBLIC,anon,authenticated;

DROP TRIGGER IF EXISTS trg_guard_active_student_enrollment ON public.student_enrollments;
CREATE TRIGGER trg_guard_active_student_enrollment
BEFORE INSERT OR UPDATE OF student_id,enrollment_status ON public.student_enrollments
FOR EACH ROW
EXECUTE FUNCTION private.guard_active_student_enrollment();

-- Repair only current/future rows; historical period rows remain intact.
DO $block$
DECLARE
  v_year text;
  v_semester integer;
BEGIN
  SELECT t.academic_year,t.semester INTO v_year,v_semester
  FROM public.academic_terms t
  WHERE t.is_current=true
  ORDER BY t.academic_year DESC,t.semester DESC
  LIMIT 1;

  IF v_year IS NOT NULL AND v_semester IS NOT NULL THEN
    UPDATE public.student_enrollments e
       SET enrollment_status=CASE
             WHEN s.status='transferred_out' THEN 'transferred_out'
             WHEN s.status='graduated' THEN 'graduated'
             ELSE 'inactive'
           END,
           exit_reason=CASE WHEN s.status='transferred_out' THEN 'transferred_out' ELSE 'other' END,
           exit_note=coalesce(nullif(e.exit_note,''),'ปรับสถานะตามทะเบียนนักเรียนกลาง'),
           ended_at=coalesce(e.ended_at,clock_timestamp()),
           updated_at=clock_timestamp()
      FROM public.students s
     WHERE s.id=e.student_id
       AND s.status<>'active'
       AND e.enrollment_status='active'
       AND (e.academic_year>v_year OR (e.academic_year=v_year AND e.semester>=v_semester));
  END IF;
END;
$block$;
