-- Make the approved transfer workflow the only authority for transferred-out status.
-- DMC imports synchronize active rosters but cannot infer transfers or reactivate exited learners.

CREATE OR REPLACE FUNCTION private.is_authorized_transfer_out(
  p_student_id uuid,p_academic_year text DEFAULT NULL::text,p_semester integer DEFAULT NULL::integer
)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO ''
AS $function$
  SELECT auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.academic_transfer_requests r
    WHERE r.student_id=p_student_id AND r.status='approved'
      AND r.roster_processed_by=auth.uid()
      AND r.roster_processed_at=statement_timestamp()
      AND (p_academic_year IS NULL OR r.academic_year<p_academic_year
        OR (r.academic_year=p_academic_year AND r.semester<=p_semester))
  );
$function$;
REVOKE ALL ON FUNCTION private.is_authorized_transfer_out(uuid,text,integer) FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION private.guard_transfer_out_enrollment()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $function$
BEGIN
  IF NEW.enrollment_status='transferred_out' THEN
    IF TG_OP='INSERT' THEN
      IF NOT private.is_authorized_transfer_out(NEW.student_id,NEW.academic_year,NEW.semester) THEN
        RAISE EXCEPTION 'การย้ายออกต้องดำเนินการผ่านระบบย้ายสถานศึกษาเท่านั้น';
      END IF;
    ELSIF OLD.enrollment_status IS DISTINCT FROM 'transferred_out' THEN
      IF NOT private.is_authorized_transfer_out(NEW.student_id,NEW.academic_year,NEW.semester) THEN
        RAISE EXCEPTION 'การย้ายออกต้องดำเนินการผ่านระบบย้ายสถานศึกษาเท่านั้น';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;
REVOKE ALL ON FUNCTION private.guard_transfer_out_enrollment() FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS trg_guard_transfer_out_enrollment ON public.student_enrollments;
CREATE TRIGGER trg_guard_transfer_out_enrollment
BEFORE INSERT OR UPDATE OF enrollment_status ON public.student_enrollments
FOR EACH ROW EXECUTE FUNCTION private.guard_transfer_out_enrollment();

CREATE OR REPLACE FUNCTION private.guard_student_transfer_out_status()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $function$
BEGIN
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
  RETURN NEW;
END;
$function$;
REVOKE ALL ON FUNCTION private.guard_student_transfer_out_status() FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS trg_guard_student_transfer_out_status ON public.students;
CREATE TRIGGER trg_guard_student_transfer_out_status
BEFORE INSERT OR UPDATE OF status ON public.students
FOR EACH ROW EXECUTE FUNCTION private.guard_student_transfer_out_status();

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
  SET status='transferred_out'
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
CREATE OR REPLACE FUNCTION public.import_student_registry(p_rows jsonb, p_academic_year text, p_semester integer, p_source_filename text DEFAULT 'student_import.xlsx'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
 SET statement_timeout TO '60s'
AS $function$
declare
  v_row jsonb;
  v_class public.school_classes;
  v_student_id uuid;
  v_by_code uuid;
  v_by_citizen uuid;
  v_batch_id uuid;
  v_inserted integer:=0;
  v_updated integer:=0;
  v_skipped_non_active integer:=0;
  v_existing_status text;
  v_enrolled integer:=0;
  v_total integer:=0;
  v_gender text;
  v_student_number integer;
  v_student_code text;
  v_citizen_id text;
  v_level text;
  v_room text;
  v_prefix text;
  v_counter integer:=0;
  v_affected_classes uuid[];
begin
  if auth.uid() is null or not private.can_manage_student_master() then
    raise exception 'Only Academic Head or Super Admin can import student registry data';
  end if;
  if p_semester not in (1,2,3) then raise exception 'Invalid semester'; end if;
  if jsonb_typeof(p_rows)<>'array' then raise exception 'p_rows must be a JSON array'; end if;

  v_total:=jsonb_array_length(p_rows);
  if v_total=0 then raise exception 'No student rows supplied'; end if;

  if exists (
    select 1
    from jsonb_array_elements(p_rows) x(value)
    where btrim(coalesce(x.value->>'student_code',''))=''
       or btrim(coalesce(x.value->>'citizen_id',''))=''
       or btrim(coalesce(x.value->>'level_name',''))=''
       or btrim(coalesce(x.value->>'room_name',''))=''
       or btrim(coalesce(x.value->>'first_name',''))=''
       or btrim(coalesce(x.value->>'last_name',''))=''
       or btrim(coalesce(x.value->>'birth_date',''))=''
  ) then
    raise exception 'Import contains rows with missing required data';
  end if;

  if exists (
    select 1 from (
      select btrim(value->>'student_code') as k, count(*)
      from jsonb_array_elements(p_rows)
      group by btrim(value->>'student_code')
      having count(*) > 1
    ) d
  ) then
    raise exception 'Duplicate student codes found in import file';
  end if;

  if exists (
    select 1 from (
      select btrim(value->>'citizen_id') as k, count(*)
      from jsonb_array_elements(p_rows)
      group by btrim(value->>'citizen_id')
      having count(*) > 1
    ) d
  ) then
    raise exception 'Duplicate citizen/G IDs found in import file';
  end if;

  if exists (
    select 1
    from (
      select distinct btrim(x.value->>'level_name') as level_name,
                      btrim(x.value->>'room_name') as room_name
      from jsonb_array_elements(p_rows) x(value)
    ) r
    where not exists (
      select 1 from public.school_classes c
      where c.academic_year=btrim(p_academic_year)
        and c.semester=p_semester
        and c.level_name=r.level_name
        and c.room_name=r.room_name
        and c.is_active=true
    )
  ) then
    raise exception 'One or more classes in the import file do not exist in the selected academic term';
  end if;

  select array_agg(distinct c.id)
  into v_affected_classes
  from jsonb_array_elements(p_rows) x(value)
  join public.school_classes c
    on c.academic_year=btrim(p_academic_year)
   and c.semester=p_semester
   and c.level_name=btrim(x.value->>'level_name')
   and c.room_name=btrim(x.value->>'room_name')
   and c.is_active=true;

  insert into public.student_import_batches(source_filename,academic_year,semester,total_rows,status,uploaded_by)
  values(coalesce(nullif(btrim(p_source_filename),''),'student_import.xlsx'),btrim(p_academic_year),p_semester,v_total,'preview',auth.uid())
  returning id into v_batch_id;

  with ranked as (
    select e.id,
           row_number() over(partition by e.class_id order by e.student_number,e.id) as rn
    from public.student_enrollments e
    where e.enrollment_status='active'
      and e.class_id = any(v_affected_classes)
  )
  update public.student_enrollments e
     set student_number = 1000000 + ranked.rn::integer,
         updated_at = now()
  from ranked
  where e.id=ranked.id;

  for v_row in select value from jsonb_array_elements(p_rows)
  loop
    v_counter:=v_counter+1;
    v_student_code:=btrim(coalesce(v_row->>'student_code',''));
    v_citizen_id:=btrim(coalesce(v_row->>'citizen_id',''));
    v_level:=btrim(coalesce(v_row->>'level_name',''));
    v_room:=btrim(coalesce(v_row->>'room_name',''));
    v_prefix:=btrim(coalesce(v_row->>'prefix',''));
    v_gender:=coalesce(nullif(btrim(v_row->>'gender'),''),
      case when v_prefix in ('เด็กชาย','นาย') then 'ชาย'
           when v_prefix in ('เด็กหญิง','นางสาว') then 'หญิง'
           else null end);

    if v_gender not in ('ชาย','หญิง') then
      raise exception 'Cannot determine gender for student code %',v_student_code;
    end if;

    select * into v_class
    from public.school_classes c
    where c.academic_year=btrim(p_academic_year)
      and c.semester=p_semester
      and c.level_name=v_level
      and c.room_name=v_room
      and c.is_active=true
    order by c.sort_order,c.id
    limit 1;

    select id into v_by_code from public.students where student_code=v_student_code limit 1;
    select id into v_by_citizen from public.students where citizen_id=v_citizen_id limit 1;
    if v_by_code is not null and v_by_citizen is not null and v_by_code<>v_by_citizen then
      raise exception 'Student code % and citizen/G ID % belong to different existing students',v_student_code,v_citizen_id;
    end if;
    v_student_id:=coalesce(v_by_code,v_by_citizen);

    IF v_student_id IS NOT NULL THEN
      SELECT s.status INTO v_existing_status FROM public.students s WHERE s.id=v_student_id FOR UPDATE;
      IF v_existing_status IS DISTINCT FROM 'active' THEN
        v_skipped_non_active:=v_skipped_non_active+1;
        CONTINUE;
      END IF;
    END IF;

    if v_student_id is null then
      insert into public.students(
        student_code,citizen_id,prefix,first_name,last_name,gender,birth_date,
        weight_kg,height_cm,blood_group,religion,ethnicity,nationality,
        house_no,village_no,road_soi,subdistrict,district,province,
        guardian_prefix,guardian_first_name,guardian_last_name,guardian_occupation,guardian_relationship,
        father_prefix,father_first_name,father_last_name,father_occupation,
        mother_prefix,mother_first_name,mother_last_name,mother_occupation,
        disadvantaged_status,pending_disposal_status,status,created_by,updated_by
      ) values (
        v_student_code,v_citizen_id,v_prefix,btrim(v_row->>'first_name'),btrim(v_row->>'last_name'),v_gender,(v_row->>'birth_date')::date,
        nullif(v_row->>'weight_kg','')::numeric,nullif(v_row->>'height_cm','')::numeric,nullif(v_row->>'blood_group',''),nullif(v_row->>'religion',''),nullif(v_row->>'ethnicity',''),nullif(v_row->>'nationality',''),
        nullif(v_row->>'house_no',''),nullif(v_row->>'village_no',''),nullif(v_row->>'road_soi',''),nullif(v_row->>'subdistrict',''),nullif(v_row->>'district',''),nullif(v_row->>'province',''),
        nullif(v_row->>'guardian_prefix',''),nullif(v_row->>'guardian_first_name',''),nullif(v_row->>'guardian_last_name',''),nullif(v_row->>'guardian_occupation',''),nullif(v_row->>'guardian_relationship',''),
        nullif(v_row->>'father_prefix',''),nullif(v_row->>'father_first_name',''),nullif(v_row->>'father_last_name',''),nullif(v_row->>'father_occupation',''),
        nullif(v_row->>'mother_prefix',''),nullif(v_row->>'mother_first_name',''),nullif(v_row->>'mother_last_name',''),nullif(v_row->>'mother_occupation',''),
        nullif(v_row->>'disadvantaged_status',''),nullif(v_row->>'pending_disposal_status',''),'active',auth.uid(),auth.uid()
      ) returning id into v_student_id;
      v_inserted:=v_inserted+1;
    else
      update public.students set
        student_code=v_student_code,citizen_id=v_citizen_id,prefix=v_prefix,first_name=btrim(v_row->>'first_name'),last_name=btrim(v_row->>'last_name'),gender=v_gender,birth_date=(v_row->>'birth_date')::date,
        weight_kg=nullif(v_row->>'weight_kg','')::numeric,height_cm=nullif(v_row->>'height_cm','')::numeric,blood_group=nullif(v_row->>'blood_group',''),religion=nullif(v_row->>'religion',''),ethnicity=nullif(v_row->>'ethnicity',''),nationality=nullif(v_row->>'nationality',''),
        house_no=nullif(v_row->>'house_no',''),village_no=nullif(v_row->>'village_no',''),road_soi=nullif(v_row->>'road_soi',''),subdistrict=nullif(v_row->>'subdistrict',''),district=nullif(v_row->>'district',''),province=nullif(v_row->>'province',''),
        guardian_prefix=nullif(v_row->>'guardian_prefix',''),guardian_first_name=nullif(v_row->>'guardian_first_name',''),guardian_last_name=nullif(v_row->>'guardian_last_name',''),guardian_occupation=nullif(v_row->>'guardian_occupation',''),guardian_relationship=nullif(v_row->>'guardian_relationship',''),
        father_prefix=nullif(v_row->>'father_prefix',''),father_first_name=nullif(v_row->>'father_first_name',''),father_last_name=nullif(v_row->>'father_last_name',''),father_occupation=nullif(v_row->>'father_occupation',''),
        mother_prefix=nullif(v_row->>'mother_prefix',''),mother_first_name=nullif(v_row->>'mother_first_name',''),mother_last_name=nullif(v_row->>'mother_last_name',''),mother_occupation=nullif(v_row->>'mother_occupation',''),
        disadvantaged_status=nullif(v_row->>'disadvantaged_status',''),pending_disposal_status=nullif(v_row->>'pending_disposal_status',''),updated_by=auth.uid(),updated_at=now()
      where id=v_student_id;
      v_updated:=v_updated+1;
    end if;

    v_student_number:=2000000+v_counter;
    insert into public.student_enrollments(student_id,class_id,academic_year,semester,student_number,enrollment_status,promotion_status,created_by)
    values(v_student_id,v_class.id,btrim(p_academic_year),p_semester,v_student_number,'active','pending',auth.uid())
    on conflict(student_id,academic_year,semester) do update set
      class_id=excluded.class_id,
      student_number=excluded.student_number,
      enrollment_status='active',
      exit_reason=null,
      exit_note=null,
      ended_at=null,
      ended_by=null,
      updated_at=now();
    v_enrolled:=v_enrolled+1;
  end loop;

  with ranked as (
    select e.id,
           row_number() over(
             partition by e.class_id
             order by
               case s.gender when 'ชาย' then 0 when 'หญิง' then 1 else 2 end,
               case when s.student_code ~ '^[0-9]+$' then s.student_code::bigint else 9223372036854775807 end,
               s.student_code,
               s.first_name,
               s.last_name,
               s.id
           ) as rn
    from public.student_enrollments e
    join public.students s on s.id=e.student_id
    where e.enrollment_status='active'
      and e.class_id = any(v_affected_classes)
  )
  update public.student_enrollments e
     set student_number = 3000000 + ranked.rn::integer,
         updated_at = now()
  from ranked
  where e.id=ranked.id;

  with ranked as (
    select e.id,
           row_number() over(
             partition by e.class_id
             order by
               case s.gender when 'ชาย' then 0 when 'หญิง' then 1 else 2 end,
               case when s.student_code ~ '^[0-9]+$' then s.student_code::bigint else 9223372036854775807 end,
               s.student_code,
               s.first_name,
               s.last_name,
               s.id
           ) as rn
    from public.student_enrollments e
    join public.students s on s.id=e.student_id
    where e.enrollment_status='active'
      and e.class_id = any(v_affected_classes)
  )
  update public.student_enrollments e
     set student_number = ranked.rn::integer,
         updated_at = now()
  from ranked
  where e.id=ranked.id;

  update public.student_import_batches
  set inserted_count=v_inserted,updated_count=v_updated,error_count=0,status='imported',completed_at=now(),
      notes=jsonb_build_object('enrollments',v_enrolled,'skipped_non_active',v_skipped_non_active,'numbering_rule','male_then_student_code_then_female')
  where id=v_batch_id;

  return jsonb_build_object(
    'batch_id',v_batch_id,
    'total_rows',v_total,
    'inserted',v_inserted,
    'updated',v_updated,
    'enrollments',v_enrolled,
    'skipped_non_active',v_skipped_non_active,
    'renumbered',true
  );
exception when others then
  if v_batch_id is not null then
    update public.student_import_batches
      set status='failed',error_count=greatest(v_total-v_inserted-v_updated,1),notes=jsonb_build_object('error',sqlerrm),completed_at=now()
      where id=v_batch_id;
  end if;
  raise;
end;
$function$
;
REVOKE ALL ON FUNCTION public.import_student_registry(jsonb,text,integer,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.import_student_registry(jsonb,text,integer,text) TO authenticated;
CREATE OR REPLACE FUNCTION public.resolve_student_import_reconciliation(p_session_id uuid, p_resolutions jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
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
    IF v_code NOT IN ('keep_active','not_continuing','withdrawn',
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

    IF v_code='transferred_out' THEN
      RAISE EXCEPTION 'การย้ายออกต้องยืนยันผ่านระบบย้ายสถานศึกษาเท่านั้น ไม่สามารถยืนยันจากไฟล์ DMC ได้';
    END IF;
    IF v_code<>'keep_active' AND v_rec.student_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.academic_transfer_requests r
      WHERE r.student_id=v_rec.student_id AND r.status='approved' AND r.roster_processed_at IS NULL
    ) THEN
      RAISE EXCEPTION 'นักเรียนรายนี้มีใบย้ายที่ได้รับอนุมัติและรอดำเนินการ กรุณาดำเนินการผ่านระบบย้ายสถานศึกษา';
    END IF;

    v_status:=NULL; v_exit_reason:=NULL; v_default_note:='คงสภาพนักเรียนไว้';
    IF v_code='not_continuing' THEN
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
$function$
;
REVOKE ALL ON FUNCTION public.resolve_student_import_reconciliation(uuid,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.resolve_student_import_reconciliation(uuid,jsonb) TO authenticated;
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
$function$
;
REVOKE ALL ON FUNCTION public.general_student_roster_create_student(text,text,text,text,text,date,text,uuid,text,integer,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.general_student_roster_create_student(text,text,text,text,text,date,text,uuid,text,integer,text,text) TO authenticated;
CREATE OR REPLACE FUNCTION public.apply_student_promotion_batch(p_batch_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_batch public.student_promotion_batches;
  v_item record;
  v_target public.school_classes;
  v_next_no integer;
  v_count integer:=0;
begin
  if auth.uid() is null or not private.is_active_user() then raise exception 'Authentication required'; end if;
  select * into v_batch from public.student_promotion_batches where id=p_batch_id for update;
  if v_batch.id is null then raise exception 'Promotion batch not found'; end if;
  if v_batch.status<>'draft' then raise exception 'Promotion batch is not editable'; end if;
  if not private.can_manage_student_class(v_batch.source_class_id) then raise exception 'You do not have permission to promote this class'; end if;

  for v_item in
    select i.*,e.academic_year as source_year,e.semester as source_semester
    from public.student_promotion_items i
    join public.student_enrollments e on e.id=i.source_enrollment_id
    where i.batch_id=p_batch_id
    order by i.created_at,i.id
  loop
    if v_item.decision='transferred_out' then
      raise exception 'การย้ายออกต้องดำเนินการผ่านระบบย้ายสถานศึกษาเท่านั้น';
    end if;
    if v_item.decision='promoted' then
      if v_item.target_class_id is null then raise exception 'Target class is required for promoted students'; end if;
      select * into v_target from public.school_classes where id=v_item.target_class_id and is_active=true for update;
      if v_target.id is null or v_target.academic_year<>v_batch.target_academic_year or v_target.semester<>v_batch.target_semester then
        raise exception 'Target class period does not match promotion batch';
      end if;
      if exists(select 1 from public.student_enrollments where student_id=v_item.student_id and academic_year=v_batch.target_academic_year and semester=v_batch.target_semester) then
        raise exception 'Student already has an enrollment in target period';
      end if;
      select coalesce(max(student_number),0)+1 into v_next_no from public.student_enrollments where class_id=v_target.id;
      insert into public.student_enrollments(student_id,class_id,academic_year,semester,student_number,enrollment_status,promotion_status,created_by)
      values(v_item.student_id,v_target.id,v_target.academic_year,v_target.semester,v_next_no,'active','pending',auth.uid());
      update public.student_enrollments set promotion_status='promoted',promoted_to_class_id=v_target.id,promoted_at=now(),promoted_by=auth.uid() where id=v_item.source_enrollment_id;
    else
      update public.student_enrollments set promotion_status=v_item.decision,promoted_to_class_id=null,promoted_at=now(),promoted_by=auth.uid() where id=v_item.source_enrollment_id;
    end if;
    v_count:=v_count+1;
  end loop;
  update public.student_promotion_batches set status='applied',applied_by=auth.uid(),applied_at=now() where id=p_batch_id;
  return v_count;
end;
$function$
;
REVOKE ALL ON FUNCTION public.apply_student_promotion_batch(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.apply_student_promotion_batch(uuid) TO authenticated;
CREATE OR REPLACE FUNCTION public.payment_evidence_roster(p_academic_year text, p_semester integer, p_class_id uuid)
 RETURNS TABLE(student_id uuid, enrollment_id uuid, student_code text, citizen_id text, prefix text, first_name text, last_name text, student_number integer, stage_code text, level_name text, room_name text, class_label text, enrollment_status text, exit_reason text, source_semester integer, roster_status text, transfer_request_status text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_target record;
begin
  if not private.is_active_user() then
    raise exception 'กรุณาเข้าสู่ระบบก่อนใช้งาน';
  end if;
  if p_academic_year is null or p_semester not in (1, 2) then
    raise exception 'ภาคเรียนไม่ถูกต้อง';
  end if;
  if not private.can_access_payment_evidence_class(p_class_id) then
    raise exception 'ไม่มีสิทธิ์ดูรายชื่อนักเรียนห้องนี้';
  end if;

  select c.*
    into v_target
  from public.school_classes c
  where c.id = p_class_id
    and c.academic_year = p_academic_year
    and c.semester = p_semester
    and c.is_active = true;

  if not found then
    raise exception 'ไม่พบห้องเรียนในปีการศึกษาและภาคเรียนที่เลือก';
  end if;

  return query
  with candidates as (
    select distinct on (e.student_id)
      e.id as enrollment_id,
      e.student_id,
      e.student_number,
      e.enrollment_status,
      e.exit_reason,
      e.semester as source_semester
    from public.student_enrollments e
    join public.school_classes ec on ec.id = e.class_id
    where e.academic_year = p_academic_year
      and (
        (p_semester = 1 and e.semester = 1 and e.class_id = p_class_id)
        or
        (
          p_semester = 2
          and (
            (e.semester = 2 and e.class_id = p_class_id)
            or
            (
              e.semester = 1
              and ec.stage_code = v_target.stage_code
              and ec.level_name = v_target.level_name
              and ec.room_name = v_target.room_name
              and not exists (
                select 1
                from public.student_enrollments e2
                where e2.student_id = e.student_id
                  and e2.academic_year = p_academic_year
                  and e2.semester = 2
              )
            )
          )
        )
      )
    order by e.student_id, e.semester desc, e.updated_at desc
  ),
  transfer_requests as (
    select distinct on (r.student_id)
      r.student_id,
      r.status,
      r.roster_processed_at
    from public.academic_transfer_requests r
    join candidates c on c.student_id = r.student_id
    where r.academic_year = p_academic_year
      and (
        r.semester = p_semester
        or (p_semester = 2 and c.source_semester = 1)
      )
      and r.status not in ('rejected', 'cancelled')
    order by r.student_id, r.semester desc, r.updated_at desc
  )
  select
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
    v_target.level_name || '/' || v_target.room_name,
    c.enrollment_status,
    c.exit_reason,
    c.source_semester,
    case
      when tr.roster_processed_at is not null then 'transferred_out'
      when tr.status is not null then 'transfer_pending'
      when p_semester = 2 and c.source_semester = 1 then 'ghost'
      when c.enrollment_status <> 'active' then 'ghost'
      else 'active'
    end,
    tr.status
  from candidates c
  join public.students s on s.id = c.student_id
  left join transfer_requests tr on tr.student_id = c.student_id
  order by c.student_number, s.first_name, s.last_name;
end;
$function$
;
REVOKE ALL ON FUNCTION public.payment_evidence_roster(text,integer,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.payment_evidence_roster(text,integer,uuid) TO authenticated;
