-- Keep the student master status in sync with verified reconciliation decisions.
-- Historical student and enrollment rows are retained; only the master lifecycle status changes.

CREATE OR REPLACE FUNCTION public.resolve_student_import_reconciliation(
  p_session_id uuid,
  p_resolutions jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_item jsonb;
  v_id uuid;
  v_code text;
  v_note text;
  v_rec public.student_import_reconciliation_items%rowtype;
  v_actor text;
  v_status text;
  v_exit_reason text;
  v_default_note text;
  v_resolved integer := 0;
  v_pending integer := 0;
BEGIN
  IF auth.uid() IS NULL OR NOT private.can_manage_student_master() THEN
    RAISE EXCEPTION 'ไม่มีสิทธิ์ยืนยันสถานะนักเรียนจากการนำเข้า';
  END IF;

  IF jsonb_typeof(coalesce(p_resolutions, '[]'::jsonb)) <> 'array' THEN
    RAISE EXCEPTION 'ข้อมูลการยืนยันสถานะไม่ถูกต้อง';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.student_import_reconciliation_sessions
    WHERE id = p_session_id
  ) THEN
    RAISE EXCEPTION 'ไม่พบรายการตรวจสอบการนำเข้า';
  END IF;

  SELECT coalesce(nullif(btrim(p.full_name), ''), p.email, 'ผู้ใช้งาน')
    INTO v_actor
  FROM public.profiles p
  WHERE p.id = auth.uid();

  FOR v_item IN
    SELECT value FROM jsonb_array_elements(coalesce(p_resolutions, '[]'::jsonb))
  LOOP
    v_id := nullif(v_item->>'item_id', '')::uuid;
    v_code := nullif(btrim(coalesce(v_item->>'resolution_code', '')), '');
    v_note := nullif(btrim(coalesce(v_item->>'resolution_note', '')), '');

    IF v_code IS NULL THEN
      CONTINUE;
    END IF;

    IF v_code NOT IN (
      'keep_active', 'transferred_out', 'not_continuing', 'withdrawn',
      'over_criteria', 'graduated', 'deceased', 'invalid_record', 'other'
    ) THEN
      RAISE EXCEPTION 'สถานะการตรวจสอบไม่ถูกต้อง';
    END IF;

    IF v_code IN ('over_criteria', 'invalid_record', 'other') AND v_note IS NULL THEN
      RAISE EXCEPTION 'กรุณาระบุรายละเอียดสำหรับรายการที่เลือกเหตุผลเพิ่มเติม';
    END IF;

    SELECT *
      INTO v_rec
    FROM public.student_import_reconciliation_items i
    WHERE i.id = v_id
      AND i.session_id = p_session_id
      AND i.issue_type = 'missing_from_file'
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'ไม่พบรายชื่อนักเรียนที่ต้องตรวจสอบ';
    END IF;

    IF v_code = 'keep_active' THEN
      v_status := NULL;
      v_exit_reason := NULL;
      v_default_note := 'คงสภาพนักเรียนไว้';
    ELSIF v_code = 'transferred_out' THEN
      v_status := 'transferred_out';
      v_exit_reason := 'transferred_out';
      v_default_note := 'ย้ายสถานศึกษา / ย้ายออก';
    ELSIF v_code = 'not_continuing' THEN
      v_status := 'inactive';
      v_exit_reason := 'not_continuing';
      v_default_note := 'ไม่เรียนต่อ';
    ELSIF v_code = 'withdrawn' THEN
      v_status := 'inactive';
      v_exit_reason := 'withdrawn';
      v_default_note := 'ลาออก / พ้นสภาพ';
    ELSIF v_code = 'over_criteria' THEN
      v_status := 'inactive';
      v_exit_reason := 'other';
      v_default_note := 'เกินเกณฑ์';
    ELSIF v_code = 'graduated' THEN
      v_status := 'graduated';
      v_exit_reason := 'other';
      v_default_note := 'จบการศึกษา';
    ELSIF v_code = 'deceased' THEN
      v_status := 'inactive';
      v_exit_reason := 'deceased';
      v_default_note := 'เสียชีวิต';
    ELSIF v_code = 'invalid_record' THEN
      v_status := 'inactive';
      v_exit_reason := 'other';
      v_default_note := 'ข้อมูลซ้ำ / ไม่มีตัวตนในทะเบียนจริง';
    ELSE
      v_status := 'inactive';
      v_exit_reason := 'other';
      v_default_note := 'อื่น ๆ';
    END IF;

    IF v_status IS NOT NULL THEN
      IF v_rec.enrollment_id IS NOT NULL THEN
        UPDATE public.student_enrollments e
           SET enrollment_status = v_status,
               exit_reason = v_exit_reason,
               exit_note = CASE
                 WHEN v_note IS NULL THEN v_default_note
                 ELSE v_default_note || ' · ' || v_note
               END,
               ended_at = clock_timestamp(),
               ended_by = auth.uid(),
               updated_at = clock_timestamp()
         WHERE e.id = v_rec.enrollment_id;
      END IF;

      -- Keep historical records; remove confirmed leavers from the active master roster.
      IF v_rec.student_id IS NOT NULL THEN
        UPDATE public.students s
           SET status = v_status,
               updated_by = auth.uid(),
               updated_at = clock_timestamp()
         WHERE s.id = v_rec.student_id;
      END IF;
    END IF;

    UPDATE public.student_import_reconciliation_items
       SET resolution_code = v_code,
           resolution_note = v_note,
           resolved_by = auth.uid(),
           resolved_by_name = coalesce(v_actor, 'ผู้ใช้งาน'),
           resolved_at = clock_timestamp()
     WHERE id = v_id;

    v_resolved := v_resolved + 1;
  END LOOP;

  SELECT count(*)
    INTO v_pending
  FROM public.student_import_reconciliation_items
  WHERE session_id = p_session_id
    AND issue_type = 'missing_from_file'
    AND resolution_code IS NULL;

  UPDATE public.student_import_reconciliation_sessions
     SET status = CASE WHEN v_pending = 0 THEN 'reviewed' ELSE 'pending_review' END,
         completed_at = CASE WHEN v_pending = 0 THEN clock_timestamp() ELSE NULL END,
         updated_at = clock_timestamp()
   WHERE id = p_session_id;

  RETURN jsonb_build_object('resolved', v_resolved, 'pending', v_pending);
END;
$function$;

-- Backfill the 2569/2 verified missing-from-file decisions already confirmed by admins.
WITH verified AS (
  SELECT DISTINCT ON (i.student_id)
         i.student_id,
         i.resolution_code,
         i.resolved_by,
         i.resolved_at
  FROM public.student_import_reconciliation_items i
  JOIN public.student_import_reconciliation_sessions s
    ON s.id = i.session_id
  WHERE i.issue_type = 'missing_from_file'
    AND i.resolved_at IS NOT NULL
    AND i.resolution_code IN (
      'transferred_out', 'not_continuing', 'withdrawn', 'over_criteria',
      'graduated', 'deceased', 'invalid_record', 'other'
    )
    AND s.academic_year = '2569'
    AND s.semester = 2
    AND i.student_id IS NOT NULL
  ORDER BY i.student_id, i.resolved_at DESC
)
UPDATE public.students s
   SET status = CASE verified.resolution_code
         WHEN 'transferred_out' THEN 'transferred_out'
         WHEN 'graduated' THEN 'graduated'
         ELSE 'inactive'
       END,
       updated_by = coalesce(verified.resolved_by, s.updated_by),
       updated_at = clock_timestamp()
  FROM verified
 WHERE s.id = verified.student_id
   AND s.status IS DISTINCT FROM CASE verified.resolution_code
         WHEN 'transferred_out' THEN 'transferred_out'
         WHEN 'graduated' THEN 'graduated'
         ELSE 'inactive'
       END;
