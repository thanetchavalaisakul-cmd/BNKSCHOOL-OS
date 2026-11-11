-- Add a least-privilege office administrator account for only leave and housing electricity.
-- The office_admin role can view all leave records (without personnel approval powers)
-- and manage the housing electricity module. All other public tables are denied by
-- restrictive RLS policies for this role.

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role = ANY (ARRAY[
    'super_admin'::text,
    'director'::text,
    'department_head'::text,
    'teacher'::text,
    'pa_evaluator'::text,
    'office_admin'::text
  ]));

CREATE OR REPLACE FUNCTION public.admin_review_user(
  p_user_id uuid,
  p_decision text,
  p_role text DEFAULT NULL::text,
  p_department_id uuid DEFAULT NULL::uuid
)
RETURNS public.profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_profile public.profiles;
BEGIN
  IF NOT private.is_super_admin() THEN
    RAISE EXCEPTION 'Only Super Admin can review users';
  END IF;
  IF p_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Cannot review your own active admin account here';
  END IF;
  IF p_decision NOT IN ('approve','reject','suspend','reactivate') THEN
    RAISE EXCEPTION 'Invalid decision';
  END IF;

  IF p_decision IN ('approve','reactivate') THEN
    IF p_role NOT IN ('teacher','department_head','director','office_admin') THEN
      RAISE EXCEPTION 'Invalid role';
    END IF;
    IF p_role = 'department_head' AND p_department_id IS NULL THEN
      RAISE EXCEPTION 'Department is required for department head';
    END IF;
    IF p_department_id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM public.departments WHERE id = p_department_id AND is_active = true
    ) THEN
      RAISE EXCEPTION 'Invalid department';
    END IF;

    UPDATE public.profiles
    SET role = p_role,
        department_id = CASE WHEN p_role = 'department_head' THEN p_department_id ELSE NULL END,
        account_status = 'active',
        approved_by = auth.uid(),
        approved_at = now()
    WHERE id = p_user_id
      AND account_status IN ('pending','suspended','rejected')
    RETURNING * INTO v_profile;
  ELSIF p_decision = 'reject' THEN
    UPDATE public.profiles
    SET account_status = 'rejected', approved_by = auth.uid(), approved_at = now()
    WHERE id = p_user_id AND account_status = 'pending'
    RETURNING * INTO v_profile;
  ELSE
    UPDATE public.profiles
    SET account_status = 'suspended'
    WHERE id = p_user_id AND account_status = 'active'
    RETURNING * INTO v_profile;
  END IF;

  IF v_profile.id IS NULL THEN
    RAISE EXCEPTION 'User state does not allow this action';
  END IF;

  INSERT INTO public.notifications(recipient_id, type, title, message, entity_type, entity_id, action_url)
  VALUES (
    p_user_id,
    'account_' || p_decision,
    CASE p_decision
      WHEN 'approve' THEN 'บัญชีได้รับการอนุมัติ'
      WHEN 'reactivate' THEN 'บัญชีเปิดใช้งานอีกครั้ง'
      WHEN 'reject' THEN 'คำขอใช้งานไม่ได้รับการอนุมัติ'
      ELSE 'บัญชีถูกระงับการใช้งาน'
    END,
    CASE p_decision
      WHEN 'approve' THEN 'คุณสามารถเข้าใช้งาน School OS ได้แล้ว'
      WHEN 'reactivate' THEN 'บัญชีของคุณกลับมาใช้งานได้แล้ว'
      WHEN 'reject' THEN 'กรุณาติดต่อผู้ดูแลระบบหากต้องการข้อมูลเพิ่มเติม'
      ELSE 'กรุณาติดต่อผู้ดูแลระบบ'
    END,
    'profile', p_user_id, '/account'
  );

  INSERT INTO public.audit_logs(actor_id, action, entity_type, entity_id, details)
  VALUES (
    auth.uid(), 'admin_' || p_decision || '_user', 'profile', p_user_id::text,
    jsonb_build_object('role',v_profile.role,'department_id',v_profile.department_id,'status',v_profile.account_status)
  );

  RETURN v_profile;
END;
$function$;

CREATE OR REPLACE FUNCTION private.can_view_leave_request(p_request_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.leave_requests r
    WHERE r.id = p_request_id
      AND private.is_active_user()
      AND (
        r.requester_id = auth.uid()
        OR private.is_personnel_head()
        OR private.current_role() IN ('director','super_admin','office_admin')
      )
  );
$function$;

CREATE OR REPLACE FUNCTION private.electricity_is_manager()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $function$
  SELECT private.is_active_user()
    AND (
      private.is_super_admin()
      OR private.current_role() = 'office_admin'
      OR EXISTS (
        SELECT 1
        FROM public.electricity_settings s
        WHERE s.id = 1
          AND s.manager_user_id = auth.uid()
      )
    );
$function$;

DROP POLICY IF EXISTS profiles_read_scope ON public.profiles;
CREATE POLICY profiles_read_scope
ON public.profiles
FOR SELECT
TO authenticated
USING (
  id = (SELECT auth.uid())
  OR (SELECT private.is_super_admin())
  OR (
    (SELECT private.current_role()) = 'director'
    AND account_status = 'active'
  )
  OR (
    (SELECT private.current_role()) = 'department_head'
    AND department_id = (SELECT private.current_department_id())
    AND account_status = 'active'
  )
  OR (
    (SELECT private.is_department_head_of('academic'))
    AND role = ANY (ARRAY['teacher'::text,'department_head'::text])
    AND account_status = 'active'
    AND deleted_at IS NULL
  )
  OR (
    (SELECT private.is_stage_head())
    AND role = ANY (ARRAY['teacher'::text,'department_head'::text])
    AND account_status = 'active'
    AND deleted_at IS NULL
  )
  OR (
    (SELECT private.is_personnel_head())
    AND account_status = 'active'
    AND deleted_at IS NULL
  )
  OR (
    (SELECT private.current_role()) = 'office_admin'
    AND account_status = 'active'
    AND deleted_at IS NULL
  )
);

DROP POLICY IF EXISTS leave_requests_read_scope ON public.leave_requests;
CREATE POLICY leave_requests_read_scope
ON public.leave_requests
FOR SELECT
TO authenticated
USING (
  (
    (SELECT private.is_active_user())
    AND (
      requester_id = (SELECT auth.uid())
      OR (SELECT private.is_personnel_head())
      OR (SELECT private.current_role()) = ANY (ARRAY['director'::text,'super_admin'::text,'office_admin'::text])
    )
  )
  OR (SELECT private.is_director_approval_executive((SELECT auth.uid())))
);

-- Office admins may see only the two module records in the module catalog.
DROP POLICY IF EXISTS modules_office_admin_scope ON public.modules;
CREATE POLICY modules_office_admin_scope
ON public.modules
AS RESTRICTIVE
FOR SELECT
TO authenticated
USING (
  coalesce((SELECT private.current_role()), '') <> 'office_admin'
  OR code IN ('leave_management','housing_electricity')
);

-- Keep all existing RLS behavior for other roles, while explicitly denying
-- office_admin access to every other public table.
DO $$
DECLARE
  r record;
  allowed_tables text[] := ARRAY[
    'profiles',
    'departments',
    'subject_groups',
    'system_settings',
    'modules',
    'notifications',
    'academic_terms',
    'personnel_public_directory',
    'leave_requests',
    'leave_actions',
    'leave_types',
    'electricity_settings',
    'electricity_meters',
    'electricity_periods',
    'electricity_readings',
    'electricity_events',
    'electricity_action_audit'
  ];
BEGIN
  FOR r IN
    SELECT c.relname
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind IN ('r','p')
      AND c.relrowsecurity = true
      AND NOT (c.relname = ANY (allowed_tables))
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS office_admin_module_scope ON public.%I', r.relname);
    EXECUTE format(
      'CREATE POLICY office_admin_module_scope ON public.%I AS RESTRICTIVE FOR ALL TO authenticated USING (coalesce((SELECT private.current_role()), '''') <> ''office_admin'') WITH CHECK (coalesce((SELECT private.current_role()), '''') <> ''office_admin'')',
      r.relname
    );
  END LOOP;
END;
$$;

-- Do not prompt office-only accounts to complete unrelated personnel/signature setup.
CREATE OR REPLACE FUNCTION private.notify_personnel_profile_on_activation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  IF NEW.account_status = 'active'
     AND OLD.account_status IS DISTINCT FROM 'active'
     AND NEW.deleted_at IS NULL
     AND NEW.role <> 'office_admin' THEN
    IF NOT EXISTS (SELECT 1 FROM public.personnel_records r WHERE r.user_id = NEW.id) THEN
      INSERT INTO public.notifications(recipient_id,type,title,message,entity_type,entity_id,action_url)
      SELECT NEW.id,'personnel_profile_required','กรุณาบันทึกข้อมูลบุคลากร',
        'บัญชีของคุณเปิดใช้งานแล้ว กรุณาบันทึกข้อมูลข้าราชการและบุคลากรทางการศึกษาให้ครบถ้วน',
        'personnel_profile',NEW.id,'/personnel/records/me'
      WHERE NOT EXISTS (
        SELECT 1 FROM public.notifications n
        WHERE n.recipient_id = NEW.id
          AND n.type = 'personnel_profile_required'
          AND n.dismissed_at IS NULL
      );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM public.signatures s WHERE s.user_id = NEW.id)
       AND NOT EXISTS (SELECT 1 FROM public.user_signature_preferences usp WHERE usp.user_id = NEW.id) THEN
      INSERT INTO public.notifications(recipient_id,type,title,message,entity_type,entity_id,action_url)
      SELECT NEW.id,'signature_profile_required','กรุณาตั้งค่าลายเซ็นของคุณ',
        'ตั้งค่าวิธีลงนามและบันทึกลายเซ็นหลัก เพื่อใช้กับเอกสารและระบบลงนามอัตโนมัติที่โรงเรียนเปิดใช้งาน',
        'signature_profile',NEW.id,'/signature-settings'
      WHERE NOT EXISTS (
        SELECT 1 FROM public.notifications n
        WHERE n.recipient_id = NEW.id
          AND n.type = 'signature_profile_required'
          AND n.dismissed_at IS NULL
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;
