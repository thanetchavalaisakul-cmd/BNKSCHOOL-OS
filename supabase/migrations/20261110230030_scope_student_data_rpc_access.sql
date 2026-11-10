-- Scope student-facing RPCs and follow-up case access to the same
-- per-student visibility rule enforced by the central student RLS policies.

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
  WHERE c.id=p_class_id AND c.is_active=true
    AND private.is_active_user() AND private.can_view_student(s.id)
    AND (s.status='active' OR EXISTS (
      SELECT 1 FROM public.academic_terms t WHERE t.is_current=true
       AND (c.academic_year<t.academic_year OR (c.academic_year=t.academic_year AND c.semester<t.semester))))
  ORDER BY CASE s.gender WHEN 'ชาย' THEN 0 WHEN 'หญิง' THEN 1 ELSE 2 END,
    CASE WHEN s.student_code~'^[0-9]+$' THEN s.student_code::bigint ELSE NULL END NULLS LAST,
    s.student_code,s.last_name,s.first_name;
$function$;
REVOKE ALL ON FUNCTION public.get_student_class_roster(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_student_class_roster(uuid) TO authenticated;

-- This read-only picker uses caller privileges so table RLS also applies.
CREATE OR REPLACE FUNCTION public.get_student_followup_student_options(p_academic_year text,p_semester integer)
RETURNS TABLE (
  student_id uuid,enrollment_id uuid,class_id uuid,student_number integer,
  student_code text,student_name text,class_label text,guardian_name text
)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path TO ''
AS $function$
  SELECT s.id,e.id,c.id,e.student_number,s.student_code,
    concat_ws(' ',s.prefix,s.first_name,s.last_name),
    c.level_name||'/'||c.room_name,
    nullif(btrim(concat_ws(' ',s.guardian_prefix,s.guardian_first_name,s.guardian_last_name)),'')
  FROM public.student_enrollments e
  JOIN public.students s ON s.id=e.student_id
  JOIN public.school_classes c ON c.id=e.class_id
  WHERE private.is_active_user() AND private.can_view_student(s.id)
    AND e.academic_year=p_academic_year AND e.semester=p_semester
    AND e.enrollment_status='active' AND s.status='active'
  ORDER BY c.sort_order,e.student_number,s.student_code;
$function$;
REVOKE ALL ON FUNCTION public.get_student_followup_student_options(text,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_student_followup_student_options(text,integer) TO authenticated;

-- Case creation runs as the caller; the RLS policies below enforce both
-- draft ownership and per-student visibility for INSERT/ON CONFLICT UPDATE.
CREATE OR REPLACE FUNCTION public.add_student_followup_cases(p_batch_id uuid,p_items jsonb)
RETURNS SETOF public.student_followup_cases
LANGUAGE plpgsql SECURITY INVOKER SET search_path TO ''
AS $function$
DECLARE
  v_batch public.student_followup_batches%rowtype; v_item jsonb; v_student_id uuid;
  v_days integer; v_over5 boolean; v_over7 boolean; v_note text; v_rec record;
  v_case public.student_followup_cases%rowtype;
BEGIN
  IF NOT private.can_edit_student_followup_batch(p_batch_id) THEN
    RAISE EXCEPTION 'ไม่มีสิทธิ์แก้ไขชุดหนังสือติดตามนี้';
  END IF;
  SELECT * INTO v_batch FROM public.student_followup_batches WHERE id=p_batch_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'ไม่พบชุดหนังสือติดตาม'; END IF;
  IF v_batch.status<>'draft' THEN RAISE EXCEPTION 'เพิ่มนักเรียนได้เฉพาะชุดที่ยังเป็นฉบับร่าง'; END IF;
  IF jsonb_typeof(p_items)<>'array' OR jsonb_array_length(p_items)=0 THEN
    RAISE EXCEPTION 'กรุณาเลือกรายชื่อนักเรียนอย่างน้อย 1 คน';
  END IF;
  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items)
  LOOP
    v_student_id:=nullif(v_item->>'student_id','')::uuid;
    v_days:=greatest(1,least(366,coalesce((v_item->>'absence_total_days')::integer,1)));
    v_over5:=coalesce((v_item->>'over_five_consecutive')::boolean,false);
    v_over7:=coalesce((v_item->>'over_seven_in_month')::boolean,false);
    v_note:=nullif(btrim(coalesce(v_item->>'absence_note','')),'');
    SELECT s.id AS student_id,e.id AS enrollment_id,c.id AS class_id,e.student_number,
      s.student_code,concat_ws(' ',s.prefix,s.first_name,s.last_name) AS student_name,
      c.level_name||'/'||c.room_name AS class_label,
      nullif(btrim(concat_ws(' ',s.guardian_prefix,s.guardian_first_name,s.guardian_last_name)),'') AS guardian_name
    INTO v_rec
    FROM public.student_enrollments e
    JOIN public.students s ON s.id=e.student_id
    JOIN public.school_classes c ON c.id=e.class_id
    WHERE s.id=v_student_id AND e.academic_year=v_batch.academic_year
      AND e.semester=v_batch.semester AND e.enrollment_status='active'
      AND s.status='active' AND private.can_view_student(s.id)
    LIMIT 1;
    IF v_rec.student_id IS NULL THEN
      RAISE EXCEPTION 'ไม่พบรายชื่อนักเรียนในปีการศึกษา/ภาคเรียนของชุดหนังสือ หรือไม่มีสิทธิ์เข้าถึงข้อมูลรายบุคคล';
    END IF;
    INSERT INTO public.student_followup_cases(
      batch_id,student_id,enrollment_id,class_id,student_code,student_name,class_label,student_number,
      guardian_name,absence_total_days,over_five_consecutive,over_seven_in_month,absence_note,created_by,updated_by
    ) VALUES (
      p_batch_id,v_rec.student_id,v_rec.enrollment_id,v_rec.class_id,v_rec.student_code,v_rec.student_name,
      v_rec.class_label,v_rec.student_number,v_rec.guardian_name,v_days,v_over5,v_over7,v_note,auth.uid(),auth.uid()
    )
    ON CONFLICT(batch_id,student_id) DO UPDATE SET
      absence_total_days=excluded.absence_total_days,over_five_consecutive=excluded.over_five_consecutive,
      over_seven_in_month=excluded.over_seven_in_month,absence_note=excluded.absence_note,
      enrollment_id=excluded.enrollment_id,class_id=excluded.class_id,class_label=excluded.class_label,
      student_number=excluded.student_number,student_code=excluded.student_code,student_name=excluded.student_name,
      guardian_name=excluded.guardian_name,updated_by=auth.uid(),updated_at=clock_timestamp()
    RETURNING * INTO v_case;
    RETURN NEXT v_case;
  END LOOP;
  RETURN;
END;
$function$;
REVOKE ALL ON FUNCTION public.add_student_followup_cases(uuid,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.add_student_followup_cases(uuid,jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.mark_student_followup_case_followed(p_case_id uuid,p_note text)
RETURNS public.student_followup_cases
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $function$
DECLARE v_case public.student_followup_cases%rowtype; v_batch_id uuid;
BEGIN
  SELECT * INTO v_case FROM public.student_followup_cases WHERE id=p_case_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'ไม่พบรายการติดตามนักเรียน'; END IF;
  IF NOT private.can_follow_student_followup_batch(v_case.batch_id)
     OR NOT private.can_view_student(v_case.student_id) THEN
    RAISE EXCEPTION 'ไม่มีสิทธิ์บันทึกผลการติดตามนักเรียนรายนี้';
  END IF;
  UPDATE public.student_followup_cases
  SET followup_status='followed',followup_note=nullif(btrim(coalesce(p_note,'')),''),
      followed_at=clock_timestamp(),followed_by=auth.uid(),updated_by=auth.uid(),updated_at=clock_timestamp()
  WHERE id=p_case_id RETURNING * INTO v_case;
  v_batch_id:=v_case.batch_id;
  IF NOT EXISTS(SELECT 1 FROM public.student_followup_cases c
    WHERE c.batch_id=v_batch_id AND c.followup_status<>'followed') THEN
    UPDATE public.student_followup_batches
    SET status='completed',completed_at=coalesce(completed_at,clock_timestamp()),
        updated_by=auth.uid(),updated_at=clock_timestamp()
    WHERE id=v_batch_id AND status IN ('issued','completed');
  END IF;
  RETURN v_case;
END;
$function$;
REVOKE ALL ON FUNCTION public.mark_student_followup_case_followed(uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.mark_student_followup_case_followed(uuid,text) TO authenticated;

DROP POLICY IF EXISTS student_followup_cases_select ON public.student_followup_cases;
CREATE POLICY student_followup_cases_select ON public.student_followup_cases FOR SELECT TO authenticated
USING (private.can_view_student_followup_batch(batch_id) AND private.can_view_student(student_id));

DROP POLICY IF EXISTS student_followup_cases_insert ON public.student_followup_cases;
CREATE POLICY student_followup_cases_insert ON public.student_followup_cases FOR INSERT TO authenticated
WITH CHECK (private.can_edit_student_followup_batch(batch_id) AND private.can_view_student(student_id));

DROP POLICY IF EXISTS student_followup_cases_update ON public.student_followup_cases;
CREATE POLICY student_followup_cases_update ON public.student_followup_cases FOR UPDATE TO authenticated
USING (private.can_edit_student_followup_batch(batch_id) AND private.can_view_student(student_id))
WITH CHECK (private.can_edit_student_followup_batch(batch_id) AND private.can_view_student(student_id));

DROP POLICY IF EXISTS student_followup_cases_delete ON public.student_followup_cases;
CREATE POLICY student_followup_cases_delete ON public.student_followup_cases FOR DELETE TO authenticated
USING (private.can_edit_student_followup_batch(batch_id) AND private.can_view_student(student_id));
