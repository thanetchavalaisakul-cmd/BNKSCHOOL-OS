-- General student roster management: shared student master, transfer finalization, scoped access and notifications.
-- Additive only. Existing academic registry and historical enrollments remain intact.

CREATE TABLE IF NOT EXISTS public.general_student_roster_permissions (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  can_view boolean NOT NULL DEFAULT false,
  can_manage_transfers boolean NOT NULL DEFAULT false,
  can_add_students boolean NOT NULL DEFAULT false,
  can_export boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT general_student_roster_permissions_scope_check
    CHECK (NOT (can_manage_transfers OR can_add_students OR can_export) OR can_view)
);
ALTER TABLE public.general_student_roster_permissions ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.general_student_roster_permissions TO authenticated;
DROP POLICY IF EXISTS general_student_roster_permissions_select_scope ON public.general_student_roster_permissions;
CREATE POLICY general_student_roster_permissions_select_scope
  ON public.general_student_roster_permissions FOR SELECT TO authenticated
  USING (private.is_super_admin() OR user_id=(SELECT auth.uid()));
DROP POLICY IF EXISTS general_student_roster_permissions_admin_insert ON public.general_student_roster_permissions;
CREATE POLICY general_student_roster_permissions_admin_insert
  ON public.general_student_roster_permissions FOR INSERT TO authenticated
  WITH CHECK (private.is_super_admin());
DROP POLICY IF EXISTS general_student_roster_permissions_admin_update ON public.general_student_roster_permissions;
CREATE POLICY general_student_roster_permissions_admin_update
  ON public.general_student_roster_permissions FOR UPDATE TO authenticated
  USING (private.is_super_admin()) WITH CHECK (private.is_super_admin());
DROP POLICY IF EXISTS general_student_roster_permissions_admin_delete ON public.general_student_roster_permissions;
CREATE POLICY general_student_roster_permissions_admin_delete
  ON public.general_student_roster_permissions FOR DELETE TO authenticated
  USING (private.is_super_admin());

CREATE TABLE IF NOT EXISTS public.general_student_roster_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL CHECK (event_type IN ('student_added','transfer_in','transfer_out')),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE RESTRICT,
  enrollment_id uuid REFERENCES public.student_enrollments(id) ON DELETE SET NULL,
  transfer_request_id uuid REFERENCES public.academic_transfer_requests(id) ON DELETE SET NULL,
  actor_user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  student_code text NOT NULL,
  student_name text NOT NULL,
  class_label text NOT NULL,
  academic_year text NOT NULL,
  semester integer NOT NULL CHECK (semester BETWEEN 1 AND 3),
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX IF NOT EXISTS general_student_roster_events_created_idx
  ON public.general_student_roster_events(created_at DESC);
CREATE INDEX IF NOT EXISTS general_student_roster_events_student_idx
  ON public.general_student_roster_events(student_id,created_at DESC);
ALTER TABLE public.general_student_roster_events ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.general_student_roster_events TO authenticated;

CREATE OR REPLACE FUNCTION private.can_access_general_student_roster()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $function$
  SELECT private.is_active_user() AND (
    private.is_super_admin()
    OR EXISTS (
      SELECT 1
      FROM public.general_student_roster_permissions p
      WHERE p.user_id=(SELECT auth.uid())
        AND p.is_active=true
        AND p.can_view=true
    )
  );
$function$;

CREATE OR REPLACE FUNCTION private.can_manage_general_student_transfers()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $function$
  SELECT private.is_active_user() AND (
    private.is_super_admin()
    OR EXISTS (
      SELECT 1
      FROM public.general_student_roster_permissions p
      WHERE p.user_id=(SELECT auth.uid())
        AND p.is_active=true
        AND p.can_view=true
        AND p.can_manage_transfers=true
    )
  );
$function$;

CREATE OR REPLACE FUNCTION private.can_add_general_students()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $function$
  SELECT private.is_active_user() AND (
    private.is_super_admin()
    OR EXISTS (
      SELECT 1
      FROM public.general_student_roster_permissions p
      WHERE p.user_id=(SELECT auth.uid())
        AND p.is_active=true
        AND p.can_view=true
        AND p.can_add_students=true
    )
  );
$function$;

CREATE OR REPLACE FUNCTION private.can_export_general_student_roster()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $function$
  SELECT private.is_active_user() AND (
    private.is_super_admin()
    OR EXISTS (
      SELECT 1
      FROM public.general_student_roster_permissions p
      WHERE p.user_id=(SELECT auth.uid())
        AND p.is_active=true
        AND p.can_view=true
        AND p.can_export=true
    )
  );
$function$;

REVOKE ALL ON FUNCTION private.can_access_general_student_roster() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.can_manage_general_student_transfers() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.can_add_general_students() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.can_export_general_student_roster() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.can_access_general_student_roster() TO authenticated;
GRANT EXECUTE ON FUNCTION private.can_manage_general_student_transfers() TO authenticated;
GRANT EXECUTE ON FUNCTION private.can_add_general_students() TO authenticated;
GRANT EXECUTE ON FUNCTION private.can_export_general_student_roster() TO authenticated;

DROP POLICY IF EXISTS general_student_roster_events_select_scope ON public.general_student_roster_events;
CREATE POLICY general_student_roster_events_select_scope
  ON public.general_student_roster_events FOR SELECT TO authenticated
  USING ((SELECT private.can_access_general_student_roster()));

CREATE OR REPLACE FUNCTION public.get_general_student_roster_access()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE p public.general_student_roster_permissions;
BEGIN
  IF auth.uid() IS NULL OR NOT private.is_active_user() THEN
    RAISE EXCEPTION 'Active account required';
  END IF;
  IF private.is_super_admin() THEN
    RETURN jsonb_build_object(
      'can_view',true,'can_manage_transfers',true,'can_add_students',true,
      'can_export',true,'is_super_admin',true
    );
  END IF;
  SELECT * INTO p FROM public.general_student_roster_permissions
  WHERE user_id=auth.uid() AND is_active=true;
  RETURN jsonb_build_object(
    'can_view',coalesce(p.can_view,false),
    'can_manage_transfers',coalesce(p.can_view,false) AND coalesce(p.can_manage_transfers,false),
    'can_add_students',coalesce(p.can_view,false) AND coalesce(p.can_add_students,false),
    'can_export',coalesce(p.can_view,false) AND coalesce(p.can_export,false),
    'is_super_admin',false
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.general_student_roster_list(
  p_academic_year text,
  p_semester integer
)
RETURNS TABLE (
  enrollment_id uuid,
  student_id uuid,
  student_code text,
  prefix text,
  first_name text,
  last_name text,
  gender text,
  class_id uuid,
  class_label text,
  stage_code text,
  student_number integer,
  enrollment_status text,
  exit_reason text,
  exit_note text,
  ended_at timestamptz,
  created_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  IF auth.uid() IS NULL OR NOT private.can_access_general_student_roster() THEN
    RAISE EXCEPTION 'ไม่มีสิทธิ์ดูบัญชีรายชื่อนักเรียนฝ่ายบริหารทั่วไป';
  END IF;
  IF p_academic_year IS NULL OR p_academic_year !~ '^[0-9]{4}$'
     OR p_semester NOT BETWEEN 1 AND 3 THEN
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
  ORDER BY c.sort_order,c.level_name,c.room_name,e.student_number,s.student_code;
END;
$function$;

CREATE OR REPLACE FUNCTION public.general_student_roster_transfer_queue()
RETURNS TABLE (
  request_id uuid,
  request_code text,
  student_id uuid,
  student_code text,
  student_name text,
  class_label text,
  academic_year text,
  semester integer,
  request_date date,
  transfer_date date,
  destination_school text,
  destination_district text,
  destination_province text,
  updated_at timestamptz,
  has_active_enrollment boolean
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO ''
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
  WHERE r.status='approved' AND r.finalized_at IS NULL
  ORDER BY r.updated_at DESC,r.created_at DESC;
END;
$function$;

CREATE OR REPLACE FUNCTION public.general_student_roster_event_history(p_limit integer DEFAULT 100)
RETURNS TABLE (
  event_id uuid,
  event_type text,
  student_code text,
  student_name text,
  class_label text,
  academic_year text,
  semester integer,
  actor_name text,
  details jsonb,
  created_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  IF auth.uid() IS NULL OR NOT private.can_access_general_student_roster() THEN
    RAISE EXCEPTION 'ไม่มีสิทธิ์ดูประวัติการจัดการรายชื่อนักเรียน';
  END IF;
  RETURN QUERY
  SELECT e.id,e.event_type,e.student_code,e.student_name,e.class_label,
    e.academic_year,e.semester,coalesce(p.full_name,'ไม่พบข้อมูลผู้ดำเนินการ'),
    e.details,e.created_at
  FROM public.general_student_roster_events e
  LEFT JOIN public.profiles p ON p.id=e.actor_user_id
  ORDER BY e.created_at DESC
  LIMIT greatest(1,least(coalesce(p_limit,100),200));
END;
$function$;

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
BEGIN
  IF auth.uid() IS NULL OR NOT private.can_manage_general_student_transfers() THEN
    RAISE EXCEPTION 'ไม่มีสิทธิ์ดำเนินการย้ายออก';
  END IF;
  SELECT * INTO r
  FROM public.academic_transfer_requests
  WHERE id=p_request_id
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'ไม่พบใบคำร้องย้ายสถานศึกษานี้'; END IF;
  IF r.status<>'approved'
     OR r.finance_status<>'paid'
     OR r.finance_decision<>'approve'
     OR r.registrar_decision<>'approve'
     OR r.assessment_decision<>'approve'
     OR r.director_decision<>'approve' THEN
    RAISE EXCEPTION 'ใบย้ายยังไม่ผ่านการอนุมัติครบทุกฝ่าย';
  END IF;
  IF r.finalized_at IS NOT NULL THEN
    RAISE EXCEPTION 'รายการนี้ดำเนินการย้ายออกแล้ว';
  END IF;
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
  v_exit_note:=concat(
    'ย้ายไป ',coalesce(nullif(btrim(r.destination_school),''),'ไม่ระบุโรงเรียนปลายทาง'),
    ' ตามใบย้าย ',coalesce(r.request_code,p_request_id::text)
  );
  UPDATE public.student_enrollments
  SET enrollment_status='transferred_out',
      exit_reason='transferred_out',
      exit_note=v_exit_note,
      ended_at=clock_timestamp(),
      ended_by=auth.uid()
  WHERE id=e.id;
  UPDATE public.academic_transfer_requests
  SET finalized_at=clock_timestamp(),finalized_by=auth.uid(),updated_by=auth.uid()
  WHERE id=r.id;
  INSERT INTO public.general_student_roster_events(
    event_type,student_id,enrollment_id,transfer_request_id,actor_user_id,
    student_code,student_name,class_label,academic_year,semester,details
  ) VALUES (
    'transfer_out',r.student_id,e.id,r.id,auth.uid(),
    r.student_code,coalesce(v_student_name,r.student_name),coalesce(v_class_label,r.class_label),
    r.academic_year,r.semester,
    jsonb_build_object('request_code',r.request_code,'transfer_date',r.transfer_date,
      'destination_school',r.destination_school,'destination_district',r.destination_district,
      'destination_province',r.destination_province,'exit_note',v_exit_note)
  );
  RETURN jsonb_build_object(
    'ok',true,'request_id',r.id,'student_id',r.student_id,
    'student_name',coalesce(v_student_name,r.student_name),
    'class_label',coalesce(v_class_label,r.class_label),
    'finalized_at',clock_timestamp()
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.general_student_roster_create_student(
  p_student_code text,
  p_citizen_id text,
  p_prefix text,
  p_first_name text,
  p_last_name text,
  p_birth_date date,
  p_gender text,
  p_class_id uuid,
  p_academic_year text,
  p_semester integer,
  p_entry_type text DEFAULT 'transfer_in',
  p_source_school text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  c public.school_classes;
  s public.students;
  v_student_number integer;
  v_full_name text;
BEGIN
  IF auth.uid() IS NULL OR NOT private.can_add_general_students() THEN
    RAISE EXCEPTION 'ไม่มีสิทธิ์เพิ่มนักเรียน';
  END IF;
  IF nullif(btrim(p_student_code),'') IS NULL
     OR nullif(btrim(p_citizen_id),'') IS NULL
     OR nullif(btrim(p_prefix),'') IS NULL
     OR nullif(btrim(p_first_name),'') IS NULL
     OR nullif(btrim(p_last_name),'') IS NULL
     OR p_birth_date IS NULL
     OR p_class_id IS NULL
     OR p_academic_year !~ '^[0-9]{4}$'
     OR p_semester NOT BETWEEN 1 AND 3 THEN
    RAISE EXCEPTION 'กรุณากรอกข้อมูลนักเรียนและห้องเรียนให้ครบถ้วน';
  END IF;
  IF p_gender IS NOT NULL AND p_gender NOT IN ('ชาย','หญิง') THEN
    RAISE EXCEPTION 'เพศไม่ถูกต้อง';
  END IF;
  IF p_entry_type IS NULL OR p_entry_type NOT IN ('student_added','transfer_in') THEN
    RAISE EXCEPTION 'ประเภทการรับนักเรียนไม่ถูกต้อง';
  END IF;
  SELECT * INTO c FROM public.school_classes
  WHERE id=p_class_id AND academic_year=p_academic_year
    AND semester=p_semester AND is_active=true;
  IF NOT FOUND THEN RAISE EXCEPTION 'ไม่พบห้องเรียนที่เปิดใช้งานในปี/ภาคเรียนที่เลือก'; END IF;
  IF EXISTS (SELECT 1 FROM public.students x WHERE x.student_code=btrim(p_student_code))
     OR EXISTS (SELECT 1 FROM public.students x WHERE x.citizen_id=btrim(p_citizen_id)) THEN
    RAISE EXCEPTION 'พบเลขประจำตัวนักเรียนหรือเลขประชาชน/เลข G ซ้ำในทะเบียนกลาง กรุณาตรวจสอบก่อนเพิ่ม';
  END IF;
  SELECT coalesce(max(x.student_number),0)+1 INTO v_student_number
  FROM public.student_enrollments x
  WHERE x.class_id=c.id AND x.enrollment_status='active';
  INSERT INTO public.students(
    student_code,citizen_id,prefix,first_name,last_name,birth_date,gender,status,created_by,updated_by
  ) VALUES (
    btrim(p_student_code),btrim(p_citizen_id),btrim(p_prefix),btrim(p_first_name),
    btrim(p_last_name),p_birth_date,p_gender,'active',auth.uid(),auth.uid()
  ) RETURNING * INTO s;
  INSERT INTO public.student_enrollments(
    student_id,class_id,academic_year,semester,student_number,enrollment_status,created_by
  ) VALUES (
    s.id,c.id,p_academic_year,p_semester,v_student_number,'active',auth.uid()
  );
  v_full_name:=concat_ws(' ',s.prefix,s.first_name,s.last_name);
  INSERT INTO public.general_student_roster_events(
    event_type,student_id,actor_user_id,student_code,student_name,class_label,
    academic_year,semester,details
  ) VALUES (
    p_entry_type,s.id,auth.uid(),s.student_code,v_full_name,
    c.level_name||'/'||c.room_name,p_academic_year,p_semester,
    jsonb_build_object('gender',s.gender,'birth_date',s.birth_date,'source_school',nullif(btrim(p_source_school),''))
  );
  RETURN jsonb_build_object(
    'ok',true,'student_id',s.id,'student_code',s.student_code,
    'student_name',v_full_name,'class_label',c.level_name||'/'||c.room_name,
    'academic_year',p_academic_year,'semester',p_semester
  );
END;
$function$;

CREATE OR REPLACE FUNCTION private.notify_general_student_roster_transfer()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  IF NEW.status='approved'
     AND NEW.finalized_at IS NULL
     AND (TG_OP='INSERT' OR OLD.status IS DISTINCT FROM 'approved') THEN
    INSERT INTO public.notifications(
      recipient_id,type,title,message,entity_type,entity_id,action_url,
      workflow_key,notification_kind
    )
    SELECT p.id,'general_student_transfer_action',
      'มีใบย้ายนักเรียนรอดำเนินการ',
      concat(coalesce(NEW.student_name,'นักเรียน'),' · ',coalesce(NEW.class_label,'ไม่ระบุชั้น'),
        ' · ใบย้าย ',coalesce(NEW.request_code,'ไม่ระบุเลขที่'),
        ' ได้รับอนุมัติแล้ว กรุณาตรวจสอบและดำเนินการย้ายออก'),
      'general_student_transfer',NEW.id,'module:general_student_roster',
      'general-student-transfer:'||NEW.id::text||':approved','action'
    FROM public.profiles p
    LEFT JOIN public.general_student_roster_permissions g ON g.user_id=p.id
    WHERE p.account_status='active' AND p.deleted_at IS NULL
      AND (
        p.role='super_admin'
        OR (g.is_active=true AND g.can_view=true AND g.can_manage_transfers=true)
      )
    ON CONFLICT (recipient_id,workflow_key) WHERE workflow_key IS NOT NULL DO NOTHING;
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS general_student_roster_transfer_notify ON public.academic_transfer_requests;
CREATE TRIGGER general_student_roster_transfer_notify
  AFTER INSERT OR UPDATE OF status ON public.academic_transfer_requests
  FOR EACH ROW EXECUTE FUNCTION private.notify_general_student_roster_transfer();

-- Existing approved-but-unprocessed requests are surfaced once as actionable notices.
INSERT INTO public.notifications(
  recipient_id,type,title,message,entity_type,entity_id,action_url,workflow_key,notification_kind
)
SELECT p.id,'general_student_transfer_action',
  'มีใบย้ายนักเรียนรอดำเนินการ',
  concat(coalesce(r.student_name,'นักเรียน'),' · ',coalesce(r.class_label,'ไม่ระบุชั้น'),
    ' · ใบย้าย ',coalesce(r.request_code,'ไม่ระบุเลขที่'),
    ' ได้รับอนุมัติแล้ว กรุณาตรวจสอบและดำเนินการย้ายออก'),
  'general_student_transfer',r.id,'module:general_student_roster',
  'general-student-transfer:'||r.id::text||':approved','action'
FROM public.academic_transfer_requests r
CROSS JOIN public.profiles p
LEFT JOIN public.general_student_roster_permissions g ON g.user_id=p.id
WHERE r.status='approved' AND r.finalized_at IS NULL
  AND p.account_status='active' AND p.deleted_at IS NULL
  AND (p.role='super_admin' OR (g.is_active=true AND g.can_view=true AND g.can_manage_transfers=true))
ON CONFLICT (recipient_id,workflow_key) WHERE workflow_key IS NOT NULL DO NOTHING;

INSERT INTO public.modules(
  department_id,code,name_th,name_en,route,sort_order,is_active
)
SELECT d.id,'general_student_roster','ระบบจัดการรายชื่อนักเรียน',
  'General Student Roster Management','/general/student-roster',2,true
FROM public.departments d
WHERE d.code='general'
ON CONFLICT (code) DO UPDATE
SET department_id=EXCLUDED.department_id,name_th=EXCLUDED.name_th,
    name_en=EXCLUDED.name_en,route=EXCLUDED.route,sort_order=EXCLUDED.sort_order,
    is_active=true;

REVOKE ALL ON FUNCTION public.get_general_student_roster_access() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.general_student_roster_list(text,integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.general_student_roster_transfer_queue() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.general_student_roster_event_history(integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.general_student_roster_finalize_transfer(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.general_student_roster_create_student(text,text,text,text,text,date,text,uuid,text,integer,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_general_student_roster_access() TO authenticated;
GRANT EXECUTE ON FUNCTION public.general_student_roster_list(text,integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.general_student_roster_transfer_queue() TO authenticated;
GRANT EXECUTE ON FUNCTION public.general_student_roster_event_history(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.general_student_roster_finalize_transfer(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.general_student_roster_create_student(text,text,text,text,text,date,text,uuid,text,integer,text,text) TO authenticated;
