-- Current DMC roster is the only source for operational student lists.

-- Students must be active in the master record and active in the exact selected period.

-- Unresolved missing-from-latest-DMC records are excluded until reconciled.

CREATE INDEX IF NOT EXISTS idx_student_import_reconciliation_sessions_latest_period

  ON public.student_import_reconciliation_sessions (academic_year,semester,created_at DESC,id DESC);

CREATE INDEX IF NOT EXISTS idx_student_import_reconciliation_items_unresolved_missing

  ON public.student_import_reconciliation_items (session_id,student_id)

  WHERE issue_type='missing_from_file' AND resolution_code IS NULL;

CREATE OR REPLACE FUNCTION private.is_current_dmc_roster_student(p_student_id uuid, p_academic_year text, p_semester integer)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.students s
    JOIN public.student_enrollments e ON e.student_id=s.id
    WHERE s.id=p_student_id
      AND s.status='active'
      AND e.academic_year=p_academic_year
      AND e.semester=p_semester
      AND e.enrollment_status='active'
      AND NOT EXISTS (
        SELECT 1
        FROM public.student_import_reconciliation_items i
        WHERE i.student_id=s.id
          AND i.issue_type='missing_from_file'
          AND i.resolution_code IS NULL
          AND i.session_id = (
            SELECT rs.id
            FROM public.student_import_reconciliation_sessions rs
            WHERE rs.academic_year=p_academic_year
              AND rs.semester=p_semester
            ORDER BY rs.created_at DESC,rs.id DESC
            LIMIT 1
          )
      )
  );
$function$;

REVOKE ALL ON FUNCTION private.is_current_dmc_roster_student(uuid,text,integer) FROM PUBLIC,anon;

GRANT EXECUTE ON FUNCTION private.is_current_dmc_roster_student(uuid,text,integer) TO authenticated;

COMMENT ON FUNCTION private.is_current_dmc_roster_student(uuid,text,integer) IS 'True only for an active student with an active enrollment in the exact period, excluding unresolved missing rows in the latest DMC reconciliation.';

CREATE OR REPLACE FUNCTION public.payment_evidence_roster(p_academic_year text, p_semester integer, p_class_id uuid)
 RETURNS TABLE(student_id uuid, enrollment_id uuid, student_code text, citizen_id text, prefix text, first_name text, last_name text, student_number integer, stage_code text, level_name text, room_name text, class_label text, enrollment_status text, exit_reason text, source_semester integer, roster_status text, transfer_request_status text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_target record;
BEGIN
  IF NOT private.is_active_user() THEN
    RAISE EXCEPTION 'กรุณาเข้าสู่ระบบก่อนใช้งาน';
  END IF;
  IF p_academic_year IS NULL OR p_semester NOT IN (1,2) THEN
    RAISE EXCEPTION 'ภาคเรียนไม่ถูกต้อง';
  END IF;
  IF NOT private.can_access_payment_evidence_class(p_class_id) THEN
    RAISE EXCEPTION 'ไม่มีสิทธิ์ดูรายชื่อนักเรียนห้องนี้';
  END IF;

  SELECT c.* INTO v_target
  FROM public.school_classes c
  WHERE c.id=p_class_id
    AND c.academic_year=p_academic_year
    AND c.semester=p_semester
    AND c.is_active=true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ไม่พบห้องเรียนในปีการศึกษาและภาคเรียนที่เลือก';
  END IF;

  RETURN QUERY
  WITH candidates AS (
    SELECT
      e.id AS enrollment_id,
      e.student_id,
      e.student_number,
      e.enrollment_status,
      e.exit_reason,
      e.semester AS source_semester
    FROM public.student_enrollments e
    WHERE e.academic_year=p_academic_year
      AND e.semester=p_semester
      AND e.class_id=p_class_id
      AND private.is_current_dmc_roster_student(e.student_id,p_academic_year,p_semester)
  ),
  transfer_requests AS (
    SELECT DISTINCT ON (r.student_id)
      r.student_id,
      r.status,
      r.roster_processed_at
    FROM public.academic_transfer_requests r
    JOIN candidates c ON c.student_id=r.student_id
    WHERE r.academic_year=p_academic_year
      AND r.semester=p_semester
      AND r.status NOT IN ('rejected','cancelled')
    ORDER BY r.student_id,r.updated_at DESC
  )
  SELECT
    s.id,
    c.enrollment_id,
    s.student_code,
    s.citizen_id,
    s.prefix,
    s.first_name,
    s.last_name,
    c.student_number,
    v_target.stage_code,
    v_target.level_name,
    v_target.room_name,
    v_target.level_name||'/'||v_target.room_name,
    c.enrollment_status,
    c.exit_reason,
    c.source_semester,
    CASE
      WHEN tr.roster_processed_at IS NOT NULL THEN 'transferred_out'
      WHEN tr.status IS NOT NULL THEN 'transfer_pending'
      ELSE 'active'
    END,
    tr.status
  FROM candidates c
  JOIN public.students s ON s.id=c.student_id
  LEFT JOIN transfer_requests tr ON tr.student_id=c.student_id
  WHERE private.is_current_dmc_roster_student(s.id,p_academic_year,p_semester)
    AND tr.roster_processed_at IS NULL
  ORDER BY c.student_number,s.first_name,s.last_name;
END;
$function$;

CREATE OR REPLACE FUNCTION public.behavior_roster(p_year text, p_semester integer)
 RETURNS TABLE(student_id uuid, student_code text, full_name text, class_id uuid, class_name text, student_number integer, guardian_name text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    s.id,
    s.student_code,
    trim(concat_ws(' ',s.prefix,s.first_name,s.last_name)),
    c.id,
    concat(c.level_name,'/',c.room_name),
    e.student_number,
    trim(concat_ws(' ',s.guardian_prefix,s.guardian_first_name,s.guardian_last_name))
  FROM public.student_enrollments e
  JOIN public.students s ON s.id=e.student_id
  JOIN public.school_classes c ON c.id=e.class_id
  WHERE e.academic_year=p_year
    AND e.semester=p_semester
    AND e.enrollment_status='active'
    AND c.is_active IS TRUE
    AND private.is_current_dmc_roster_student(s.id,p_year,p_semester)
    AND public.behavior_can_read(s.id,p_year,p_semester)
  ORDER BY c.sort_order,e.student_number,s.last_name;
$function$;

CREATE OR REPLACE FUNCTION public.edufee_roster(p_year text, p_semester integer)
 RETURNS TABLE(student_id uuid, student_code text, full_name text, class_id uuid, class_name text, student_number integer, guardian_name text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    s.id,
    s.student_code,
    trim(concat_ws(' ',s.prefix,s.first_name,s.last_name)),
    c.id,
    concat(c.level_name,'/',c.room_name),
    e.student_number,
    trim(concat_ws(' ',s.guardian_prefix,s.guardian_first_name,s.guardian_last_name))
  FROM public.student_enrollments e
  JOIN public.students s ON s.id=e.student_id
  JOIN public.school_classes c ON c.id=e.class_id
  WHERE e.academic_year=p_year
    AND e.semester=p_semester
    AND e.enrollment_status='active'
    AND c.is_active
    AND private.is_current_dmc_roster_student(s.id,p_year,p_semester)
    AND public.edufee_can_read_class(c.id)
  ORDER BY c.sort_order,e.student_number,s.last_name;
$function$;

CREATE OR REPLACE FUNCTION public.get_student_class_roster(p_class_id uuid)
 RETURNS TABLE(student_id uuid, student_code text, prefix text, first_name text, last_name text, gender text, class_id uuid, academic_year text, semester integer, stage_code text, level_name text, room_name text, homeroom_teacher_names text[])
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  SELECT
    s.id,s.student_code,s.prefix,s.first_name,s.last_name,s.gender,c.id,
    c.academic_year,c.semester,c.stage_code,c.level_name,c.room_name,
    coalesce((
      SELECT array_agg(DISTINCT p.full_name ORDER BY p.full_name)
      FROM public.homeroom_teachers h
      JOIN public.profiles p ON p.id=h.teacher_id
      WHERE h.class_id=c.id
        AND p.account_status='active'
        AND p.deleted_at IS NULL
    ),array[]::text[])
  FROM public.school_classes c
  JOIN public.student_enrollments e
    ON e.class_id=c.id AND e.enrollment_status='active'
  JOIN public.students s ON s.id=e.student_id
  WHERE c.id=p_class_id
    AND c.is_active=true
    AND private.is_active_user()
    AND private.can_view_student(s.id)
    AND private.is_current_dmc_roster_student(s.id,c.academic_year,c.semester)
  ORDER BY
    CASE s.gender WHEN 'ชาย' THEN 0 WHEN 'หญิง' THEN 1 ELSE 2 END,
    CASE WHEN s.student_code~'^[0-9]+$' THEN s.student_code::bigint ELSE NULL END NULLS LAST,
    s.student_code,s.last_name,s.first_name;
$function$;

CREATE OR REPLACE FUNCTION public.general_student_roster_list(p_academic_year text, p_semester integer)
 RETURNS TABLE(enrollment_id uuid, student_id uuid, student_code text, prefix text, first_name text, last_name text, gender text, class_id uuid, class_label text, stage_code text, student_number integer, enrollment_status text, exit_reason text, exit_note text, ended_at timestamp with time zone, created_at timestamp with time zone)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
  IF auth.uid() IS NULL OR NOT private.can_access_general_student_roster() THEN
    RAISE EXCEPTION 'ไม่มีสิทธิ์ดูบัญชีรายชื่อนักเรียนฝ่ายบริหารทั่วไป';
  END IF;
  IF p_academic_year IS NULL OR p_academic_year !~ '^[0-9]{4}$' OR p_semester NOT BETWEEN 1 AND 3 THEN
    RAISE EXCEPTION 'Academic period is invalid';
  END IF;

  RETURN QUERY
  SELECT
    e.id,s.id,s.student_code,s.prefix,s.first_name,s.last_name,s.gender,
    c.id,c.level_name||'/'||c.room_name,c.stage_code,e.student_number,
    e.enrollment_status,e.exit_reason,e.exit_note,e.ended_at,e.created_at
  FROM public.student_enrollments e
  JOIN public.students s ON s.id=e.student_id
  JOIN public.school_classes c ON c.id=e.class_id
  WHERE e.academic_year=p_academic_year
    AND e.semester=p_semester
    AND private.is_current_dmc_roster_student(s.id,p_academic_year,p_semester)
  ORDER BY c.sort_order,c.level_name,c.room_name,e.student_number,s.student_code;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_club_activity_student_candidates(p_academic_year text, p_semester integer)
 RETURNS TABLE(student_id uuid, student_code text, student_name text, gender text, class_id uuid, class_label text, student_number integer, is_my_homeroom boolean)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'private'
AS $function$
  SELECT
    s.id,
    s.student_code,
    btrim(concat_ws(' ',coalesce(s.prefix,'')||coalesce(s.first_name,''),s.last_name)),
    s.gender,
    c.id,
    c.level_name||'/'||c.room_name,
    e.student_number,
    private.is_homeroom_teacher_for_class(auth.uid(),c.id)
  FROM public.student_enrollments e
  JOIN public.students s ON s.id=e.student_id
  JOIN public.school_classes c ON c.id=e.class_id
  WHERE private.is_active_user()
    AND private.is_teacher_capable_user(auth.uid())
    AND e.academic_year=p_academic_year
    AND e.semester=p_semester
    AND e.enrollment_status='active'
    AND c.is_active=true
    AND private.is_current_dmc_roster_student(s.id,p_academic_year,p_semester)
  ORDER BY
    CASE WHEN private.is_homeroom_teacher_for_class(auth.uid(),c.id) THEN 0 ELSE 1 END,
    c.sort_order,c.level_name,c.room_name,e.student_number,s.first_name,s.last_name;
$function$;

CREATE OR REPLACE FUNCTION public.get_transfer_request_student_options(p_academic_year text, p_semester integer)
 RETURNS TABLE(student_id uuid, class_id uuid, student_number integer, student_code text, citizen_id text, prefix text, first_name text, last_name text, gender text, birth_date date, guardian_name text, father_name text, mother_name text, class_label text, academic_year text, semester integer, student_address text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'private'
AS $function$
  SELECT
    s.id,sc.id,e.student_number,s.student_code,s.citizen_id,s.prefix,s.first_name,s.last_name,s.gender,s.birth_date,
    nullif(btrim(concat_ws(' ',s.guardian_prefix,s.guardian_first_name,s.guardian_last_name)),''),
    nullif(btrim(concat_ws(' ',s.father_prefix,s.father_first_name,s.father_last_name)),''),
    nullif(btrim(concat_ws(' ',s.mother_prefix,s.mother_first_name,s.mother_last_name)),''),
    sc.level_name||'/'||sc.room_name,e.academic_year,e.semester,
    nullif(btrim(concat_ws(' ',
      CASE WHEN nullif(btrim(s.house_no),'') IS NOT NULL THEN 'บ้านเลขที่ '||btrim(s.house_no) END,
      CASE WHEN nullif(btrim(s.village_no),'') IS NOT NULL THEN 'หมู่ที่ '||btrim(s.village_no) END,
      nullif(btrim(s.road_soi),''),
      CASE WHEN nullif(btrim(s.subdistrict),'') IS NOT NULL THEN 'ตำบล'||btrim(s.subdistrict) END,
      CASE WHEN nullif(btrim(s.district),'') IS NOT NULL THEN 'อำเภอ'||btrim(s.district) END,
      CASE WHEN nullif(btrim(s.province),'') IS NOT NULL THEN 'จังหวัด'||btrim(s.province) END
    )),'')
  FROM public.student_enrollments e
  JOIN public.students s ON s.id=e.student_id
  JOIN public.school_classes sc ON sc.id=e.class_id
  WHERE private.is_active_user()
    AND e.enrollment_status='active'
    AND sc.is_active
    AND e.academic_year=p_academic_year
    AND e.semester=p_semester
    AND private.is_current_dmc_roster_student(s.id,p_academic_year,p_semester)
    AND private.can_create_transfer_request_for_period(s.id,p_academic_year,p_semester)
  ORDER BY
    CASE WHEN private.is_homeroom_teacher_for_student_period(s.id,p_academic_year,p_semester) THEN 0 ELSE 1 END,
    sc.sort_order,e.student_number,s.student_code;
$function$;

CREATE OR REPLACE FUNCTION public.get_academic_document_service_student_options(p_academic_year text, p_semester integer)
 RETURNS TABLE(student_id uuid, class_id uuid, student_number integer, student_code text, prefix text, first_name text, last_name text, class_label text, enrollment_academic_year text, enrollment_semester integer, guardian_prefix text, guardian_first_name text, guardian_last_name text, house_no text, village_no text, subdistrict text, district text, province text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'private'
AS $function$
  SELECT
    s.id,e.class_id,e.student_number,s.student_code,
    s.prefix,s.first_name,s.last_name,
    CASE WHEN c.id IS NULL THEN NULL ELSE c.level_name||'/'||c.room_name END,
    e.academic_year,e.semester,
    s.guardian_prefix,s.guardian_first_name,s.guardian_last_name,
    s.house_no,s.village_no,s.subdistrict,s.district,s.province
  FROM public.student_enrollments e
  JOIN public.students s ON s.id=e.student_id
  LEFT JOIN public.school_classes c ON c.id=e.class_id
  WHERE e.academic_year=p_academic_year
    AND e.semester=p_semester
    AND e.enrollment_status='active'
    AND private.is_current_dmc_roster_student(s.id,p_academic_year,p_semester)
    AND private.is_active_user()
    AND (
      private.can_manage_academic_document_service()
      OR private.can_create_certificate_request_for_period(s.id,p_academic_year,p_semester)
    )
  ORDER BY
    CASE WHEN private.is_homeroom_teacher_for_student_period(s.id,p_academic_year,p_semester) THEN 0 ELSE 1 END,
    coalesce(c.sort_order,9999),coalesce(e.student_number,9999),s.student_code;
$function$;

CREATE OR REPLACE FUNCTION public.get_certificate_request_student_options(p_academic_year text, p_semester integer)
 RETURNS TABLE(student_id uuid, class_id uuid, student_number integer, student_code text, citizen_id text, prefix text, first_name text, last_name text, gender text, birth_date date, father_name text, mother_name text, class_label text, enrollment_academic_year text, enrollment_semester integer, student_address text, photo_bucket text, photo_path text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'private'
AS $function$
  WITH latest AS (
    SELECT e.*,
      row_number() OVER (PARTITION BY e.student_id ORDER BY e.updated_at DESC,e.id DESC) rn
    FROM public.student_enrollments e
    WHERE e.academic_year=p_academic_year
      AND e.semester=p_semester
      AND e.enrollment_status='active'
      AND private.is_current_dmc_roster_student(e.student_id,p_academic_year,p_semester)
  ),
  current_scope AS (
    SELECT e.student_id
    FROM public.student_enrollments e
    WHERE e.academic_year=p_academic_year
      AND e.semester=p_semester
      AND e.enrollment_status='active'
      AND private.is_current_dmc_roster_student(e.student_id,p_academic_year,p_semester)
      AND private.can_create_certificate_request_for_period(e.student_id,p_academic_year,p_semester)
  )
  SELECT
    s.id,l.class_id,l.student_number,s.student_code,s.citizen_id,s.prefix,s.first_name,s.last_name,s.gender,s.birth_date,
    nullif(btrim(concat_ws(' ',s.father_prefix,s.father_first_name,s.father_last_name)),''),
    nullif(btrim(concat_ws(' ',s.mother_prefix,s.mother_first_name,s.mother_last_name)),''),
    CASE WHEN sc.id IS NULL THEN NULL ELSE sc.level_name||'/'||sc.room_name END,
    l.academic_year,l.semester,
    nullif(btrim(concat_ws(' ',
      CASE WHEN nullif(btrim(s.house_no),'') IS NOT NULL THEN 'บ้านเลขที่ '||btrim(s.house_no) END,
      CASE WHEN nullif(btrim(s.village_no),'') IS NOT NULL THEN 'หมู่ที่ '||btrim(s.village_no) END,
      CASE WHEN nullif(btrim(s.subdistrict),'') IS NOT NULL THEN 'ตำบล'||btrim(s.subdistrict) END,
      CASE WHEN nullif(btrim(s.district),'') IS NOT NULL THEN 'อำเภอ'||btrim(s.district) END,
      CASE WHEN nullif(btrim(s.province),'') IS NOT NULL THEN 'จังหวัด'||btrim(s.province) END
    )),''),s.photo_bucket,s.photo_path
  FROM public.students s
  JOIN latest l ON l.student_id=s.id AND l.rn=1
  LEFT JOIN public.school_classes sc ON sc.id=l.class_id
  WHERE private.is_active_user()
    AND s.status='active'
    AND private.is_current_dmc_roster_student(s.id,p_academic_year,p_semester)
    AND (
      private.can_finalize_academic_certificate()
      OR private.can_manage_academic_certificate()
      OR private.can_prepare_academic_certificate()
      OR s.id IN (SELECT student_id FROM current_scope)
    )
  ORDER BY
    CASE WHEN private.is_homeroom_teacher_for_student_period(s.id,p_academic_year,p_semester) THEN 0 ELSE 1 END,
    coalesce(sc.sort_order,9999),coalesce(l.student_number,9999),s.student_code;
$function$;

CREATE OR REPLACE FUNCTION public.get_student_followup_student_options(p_academic_year text, p_semester integer)
 RETURNS TABLE(student_id uuid, enrollment_id uuid, class_id uuid, student_number integer, student_code text, student_name text, class_label text, guardian_name text)
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
  SELECT
    s.id,e.id,c.id,e.student_number,s.student_code,
    concat_ws(' ',s.prefix,s.first_name,s.last_name),
    c.level_name||'/'||c.room_name,
    nullif(btrim(concat_ws(' ',s.guardian_prefix,s.guardian_first_name,s.guardian_last_name)),'')
  FROM public.student_enrollments e
  JOIN public.students s ON s.id=e.student_id
  JOIN public.school_classes c ON c.id=e.class_id
  WHERE private.is_active_user()
    AND private.can_view_student(s.id)
    AND e.academic_year=p_academic_year
    AND e.semester=p_semester
    AND e.enrollment_status='active'
    AND private.is_current_dmc_roster_student(s.id,p_academic_year,p_semester)
  ORDER BY c.sort_order,e.student_number,s.student_code;
$function$;

COMMENT ON FUNCTION public.payment_evidence_roster(text,integer,uuid) IS 'Returns only active students from the exact selected DMC period; excludes transferred, inactive, ghost, and unresolved missing-from-latest-file records.';
