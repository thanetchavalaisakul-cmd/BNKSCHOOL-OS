-- Office Admin is a staff self-service account, not an operational administrator.
-- It can submit and view its own leave requests, and use only its assigned electricity meter.

CREATE OR REPLACE FUNCTION private.normalize_leave_request_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
declare
  v_profile public.profiles;
  v_position text;
  v_month integer;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  select * into v_profile from public.profiles where id=auth.uid();
  if v_profile.id is null or v_profile.account_status <> 'active'
     or v_profile.role not in ('teacher','department_head','director','super_admin','office_admin') then
    raise exception 'Current account cannot submit leave requests';
  end if;
  select pr.position_title into v_position
  from public.personnel_records pr
  where pr.user_id=auth.uid()
  limit 1;
  new.requester_id := auth.uid();
  new.requester_name := coalesce(nullif(btrim(v_profile.full_name),''),v_profile.email,'ผู้ใช้งาน');
  new.requester_role := v_profile.role;
  new.requester_position := v_position;
  new.status := 'draft';
  new.submitted_at := null;
  new.personnel_reviewer_id := null;
  new.personnel_reviewer_name := null;
  new.personnel_reviewed_at := null;
  new.director_reviewer_id := null;
  new.director_reviewer_name := null;
  new.director_reviewed_at := null;
  new.approved_at := null;
  new.leave_days := (new.end_date - new.start_date) + 1;
  new.leave_year := extract(year from new.start_date)::integer;
  v_month := extract(month from new.start_date)::integer;
  if new.academic_year is null then
    new.academic_year := case when v_month between 1 and 4 then extract(year from new.start_date)::integer + 542 else extract(year from new.start_date)::integer + 543 end;
  end if;
  if new.semester is null then
    new.semester := case when v_month between 5 and 10 then 1 else 2 end;
  end if;
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.submit_leave_request(p_leave_request_id uuid)
RETURNS public.leave_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
declare
  v_request public.leave_requests;
  v_actor public.profiles;
  v_target_status text;
  v_is_personnel_head boolean;
begin
  select * into v_actor from public.profiles where id=auth.uid();
  if v_actor.id is null or v_actor.account_status <> 'active'
     or v_actor.role not in ('teacher','department_head','director','super_admin','office_admin') then
    raise exception 'Current account cannot submit leave requests';
  end if;

  select * into v_request
  from public.leave_requests
  where id=p_leave_request_id and requester_id=auth.uid() and status='draft'
  for update;
  if v_request.id is null then raise exception 'Leave request cannot be submitted'; end if;

  v_is_personnel_head := (v_actor.role='department_head' and v_actor.department_id=private.personnel_department_id());
  v_target_status := case when v_is_personnel_head then 'pending_director' else 'pending_personnel' end;

  update public.leave_requests
  set status=v_target_status, submitted_at=now()
  where id=v_request.id
  returning * into v_request;

  insert into public.leave_actions(leave_request_id,actor_id,actor_name,actor_role,action,from_status,to_status)
  values(v_request.id,auth.uid(),coalesce(v_actor.full_name,v_actor.email,'ผู้ใช้งาน'),v_actor.role,'submit','draft',v_target_status);

  if v_target_status='pending_personnel' then
    insert into public.notifications(recipient_id,type,title,message,entity_type,entity_id,action_url)
    select p.id,'leave_pending_personnel','มีคำขอลารอตรวจ',
      v_request.requester_name || ' ยื่นคำขอ ' || coalesce(lt.name_th,v_request.leave_type_code) || ' ' || v_request.leave_days::text || ' วัน',
      'leave_request',v_request.id,'/personnel/leave/'||v_request.id::text
    from public.profiles p
    join public.departments d on d.id=p.department_id and d.code='personnel'
    left join public.leave_types lt on lt.code=v_request.leave_type_code
    where p.role='department_head' and p.account_status='active' and p.id<>auth.uid();
  else
    insert into public.notifications(recipient_id,type,title,message,entity_type,entity_id,action_url)
    select p.id,'leave_pending_director','มีคำขอลารออนุมัติ',
      v_request.requester_name || ' ยื่นคำขอ ' || coalesce(lt.name_th,v_request.leave_type_code) || ' ' || v_request.leave_days::text || ' วัน (ข้ามการตรวจของหัวหน้าบุคคลเพื่อป้องกัน self-approval)',
      'leave_request',v_request.id,'/personnel/leave/'||v_request.id::text
    from public.profiles p
    left join public.leave_types lt on lt.code=v_request.leave_type_code
    where p.role in ('director','super_admin') and p.account_status='active' and p.id<>auth.uid();
  end if;

  if v_request.affects_teaching_schedule=true and not exists(
    select 1 from public.substitute_lessons sl where sl.leave_request_id=v_request.id and sl.status<>'cancelled'
  ) then
    insert into public.notifications(recipient_id,type,title,message,entity_type,entity_id,action_url)
    values(
      v_request.requester_id,
      'substitute_no_published_lessons',
      'ตรวจรายการสอนแทน',
      'ยังไม่พบคาบสอนที่ Published ตรงกับช่วงวันลา หากตารางถูกเผยแพร่ภายหลัง ระบบจะสร้างรายการสอนแทนให้อัตโนมัติ',
      'substitute_batch',v_request.id,'/academic/substitute-teaching'
    );
  end if;

  return v_request;
end;
$function$;

-- A regular Office Admin may read only their own leave request and its action timeline.
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
        OR private."current_role"() IN ('director','super_admin')
      )
  );
$function$;

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
      OR (SELECT private."current_role"()) = ANY (ARRAY['director'::text,'super_admin'::text])
    )
  )
  OR (SELECT private.is_director_approval_executive((SELECT auth.uid())))
);

-- Office Admin no longer receives a directory-wide profile read grant.
DROP POLICY IF EXISTS profiles_read_scope ON public.profiles;
CREATE POLICY profiles_read_scope
ON public.profiles
FOR SELECT
TO authenticated
USING (
  id = (SELECT auth.uid())
  OR (SELECT private.is_super_admin())
  OR (
    (SELECT private."current_role"()) = 'director'
    AND account_status = 'active'
  )
  OR (
    (SELECT private."current_role"()) = 'department_head'
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
);

-- The office_admin role can never become an electricity manager, even if its
-- user id is accidentally selected in the settings row.
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
      OR (
        coalesce(private."current_role"(), '') <> 'office_admin'
        AND EXISTS (
          SELECT 1
          FROM public.electricity_settings s
          WHERE s.id = 1
            AND s.manager_user_id = auth.uid()
        )
      )
    );
$function$;

-- Keep legacy invoices and evidence visible to the currently assigned occupant
-- of the meter, even when those historical invoices predate their account link.
CREATE OR REPLACE FUNCTION private.electricity_can_view_reading(p_reading_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $function$
  SELECT (SELECT private.is_active_user())
    AND (
      (SELECT private.electricity_is_manager())
      OR EXISTS (
        SELECT 1
        FROM public.electricity_readings r
        LEFT JOIN public.electricity_meters m ON m.id = r.meter_id
        WHERE r.id = p_reading_id
          AND (
            r.payer_user_id = (SELECT auth.uid())
            OR m.occupant_user_id = (SELECT auth.uid())
          )
      )
    );
$function$;

CREATE OR REPLACE FUNCTION private.electricity_can_view_file(p_path text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $function$
  SELECT (SELECT private.is_active_user())
    AND (
      p_path LIKE ((SELECT auth.uid())::text || '/%')
      OR EXISTS (
        SELECT 1
        FROM public.electricity_readings r
        JOIN public.electricity_meters m ON m.id = r.meter_id
        WHERE (r.meter_photo_path = p_path OR r.payment_slip_path = p_path)
          AND (
            (SELECT private.electricity_is_manager())
            OR r.payer_user_id = (SELECT auth.uid())
            OR m.occupant_user_id = (SELECT auth.uid())
          )
      )
    );
$function$;

DROP POLICY IF EXISTS electricity_readings_read ON public.electricity_readings;
CREATE POLICY electricity_readings_read
ON public.electricity_readings
FOR SELECT
TO authenticated
USING ((SELECT private.electricity_can_view_reading(id)));
