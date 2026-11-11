-- Current DMC roster guards for remaining operational modules.
-- Historical documents and transfer workflow records are retained.

CREATE OR REPLACE FUNCTION public.get_classroom_research_assignment_options(p_academic_year text, p_semester integer)
 RETURNS TABLE(assignment_id uuid, class_id uuid, subject_id uuid, subject_group_id uuid, subject_code text, subject_name text, subject_group_code text, subject_group_name text, class_label text, student_count integer)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'private'
AS $function$
  select ta.id,c.id,s.id,sg.id,s.subject_code,s.subject_name,sg.code,sg.name_th,
    c.level_name||'/'||c.room_name,
    (select count(*)::integer from public.student_enrollments e where e.class_id=c.id and e.enrollment_status='active' and private.is_current_dmc_roster_student(e.student_id,p_academic_year,p_semester))
  from public.teaching_assignments ta
  join public.school_classes c on c.id=ta.class_id
  join public.academic_subjects s on s.id=ta.subject_id
  left join public.subject_groups sg on sg.id=s.subject_group_id
  where ta.teacher_id=auth.uid() and ta.is_active=true and c.is_active=true and s.is_active=true
    and c.academic_year=p_academic_year and c.semester=p_semester
    and private.is_teacher_capable_user(auth.uid())
  order by c.sort_order,c.level_name,c.room_name,s.subject_name;
$function$;

CREATE OR REPLACE FUNCTION public.get_learning_media_assignment_options(p_academic_year text, p_semester integer)
 RETURNS TABLE(assignment_id uuid, class_id uuid, subject_id uuid, subject_group_id uuid, subject_code text, subject_name text, subject_group_code text, subject_group_name text, class_label text, student_count integer)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'private'
AS $function$
  select
    ta.id,c.id,s.id,sg.id,s.subject_code,s.subject_name,sg.code,sg.name_th,
    c.level_name||'/'||c.room_name,
    (select count(*)::integer from public.student_enrollments e where e.class_id=c.id and e.enrollment_status='active' and private.is_current_dmc_roster_student(e.student_id,p_academic_year,p_semester))
  from public.teaching_assignments ta
  join public.school_classes c on c.id=ta.class_id
  join public.academic_subjects s on s.id=ta.subject_id
  left join public.subject_groups sg on sg.id=s.subject_group_id
  where ta.teacher_id=auth.uid()
    and ta.is_active=true and c.is_active=true and s.is_active=true
    and c.academic_year=p_academic_year and c.semester=p_semester
    and private.is_teacher_capable_user(auth.uid())
  order by c.sort_order,c.level_name,c.room_name,s.subject_name;
$function$;

CREATE OR REPLACE FUNCTION public.get_lesson_plan_usage_assignment_options(p_academic_year text, p_semester integer)
 RETURNS TABLE(assignment_id uuid, class_id uuid, subject_id uuid, subject_group_id uuid, subject_code text, subject_name text, subject_group_code text, subject_group_name text, class_label text, student_count integer)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'private'
AS $function$
  select
    ta.id,c.id,s.id,sg.id,s.subject_code,s.subject_name,sg.code,sg.name_th,
    c.level_name||'/'||c.room_name,
    (
      select count(*)::integer
      from public.student_enrollments e
      where e.class_id=c.id and e.enrollment_status='active'
        and private.is_current_dmc_roster_student(e.student_id,p_academic_year,p_semester)
    )
  from public.teaching_assignments ta
  join public.school_classes c on c.id=ta.class_id
  join public.academic_subjects s on s.id=ta.subject_id
  left join public.subject_groups sg on sg.id=s.subject_group_id
  where ta.teacher_id=auth.uid()
    and ta.is_active=true
    and c.is_active=true
    and s.is_active=true
    and c.academic_year=p_academic_year
    and c.semester=p_semester
    and private.is_teacher_capable_user(auth.uid())
  order by c.sort_order,c.level_name,c.room_name,s.subject_name;
$function$;

CREATE OR REPLACE FUNCTION public.get_learner_activity_class_options(p_academic_year text, p_semester integer)
 RETURNS TABLE(class_id uuid, class_label text, stage_code text, student_count integer, co_adviser_user_id uuid, co_adviser_name text, co_adviser_position text, reviewer_user_id uuid, reviewer_name text, reviewer_position text, assessment_head_user_id uuid, assessment_head_name text, assessment_head_position text, homeroom_teacher_ids uuid[], homeroom_teacher_names text[])
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'private'
AS $function$
  select c.id,c.level_name||'/'||c.room_name,c.stage_code,
    (select count(*)::integer from public.student_enrollments e where e.class_id=c.id and e.enrollment_status='active' and private.is_current_dmc_roster_student(e.student_id,p_academic_year,p_semester)),
    ca.id,coalesce(nullif(btrim(ca.full_name),''),ca.email,''),coalesce(nullif(btrim(cap.position_title),''),'ครูที่ปรึกษา'),
    rv.id,coalesce(nullif(btrim(rv.full_name),''),rv.email,''),coalesce(nullif(btrim(rvp.position_title),''),'หัวหน้าช่วงชั้น'),
    ah.id,coalesce(nullif(btrim(ah.full_name),''),ah.email,''),coalesce(nullif(btrim(ahp.position_title),''),'หัวหน้าวัดและประเมินผล'),
    coalesce(ht.ids,'{}'::uuid[]),coalesce(ht.names,'{}'::text[])
  from public.school_classes c
  left join lateral (
    select p.* from public.homeroom_teachers h join public.profiles p on p.id=h.teacher_id
    where h.class_id=c.id and h.teacher_id<>auth.uid() and p.account_status='active' and p.deleted_at is null
    order by h.created_at limit 1
  ) ca on true
  left join public.personnel_records cap on cap.user_id=ca.id
  left join lateral (
    select array_agg(h.teacher_id order by h.created_at) ids,
           array_agg(coalesce(nullif(btrim(p.full_name),''),p.email,'') order by h.created_at) names
    from public.homeroom_teachers h join public.profiles p on p.id=h.teacher_id
    where h.class_id=c.id and p.account_status='active' and p.deleted_at is null
  ) ht on true
  left join public.profiles rv on rv.id=private.learner_activity_class_reviewer_user(p_academic_year,c.id)
  left join public.personnel_records rvp on rvp.user_id=rv.id
  left join public.profiles ah on ah.id=private.learner_activity_assessment_head_user(p_academic_year)
  left join public.personnel_records ahp on ahp.user_id=ah.id
  where c.academic_year=p_academic_year and c.semester=p_semester and c.is_active=true
    and private.is_homeroom_teacher_for_class(auth.uid(),c.id)
  order by c.sort_order,c.level_name,c.room_name;
$function$;

CREATE OR REPLACE FUNCTION public.get_my_homeroom_context(p_academic_year text, p_semester integer)
 RETURNS TABLE(class_id uuid, class_label text, stage_code text, homeroom_teacher_ids uuid[], homeroom_teacher_names text[], student_count integer)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'private'
AS $function$
  select
    c.id,
    c.level_name||'/'||c.room_name,
    c.stage_code,
    coalesce(array_agg(h2.teacher_id order by h2.created_at) filter (where h2.teacher_id is not null),'{}'::uuid[]),
    coalesce(array_agg(coalesce(nullif(btrim(p.full_name),''),p.email,'') order by h2.created_at) filter (where h2.teacher_id is not null),'{}'::text[]),
    (
      select count(*)::integer
      from public.student_enrollments e
      where e.class_id=c.id and e.enrollment_status='active'
        and private.is_current_dmc_roster_student(e.student_id,p_academic_year,p_semester)
    )
  from public.school_classes c
  join public.homeroom_teachers mine
    on mine.class_id=c.id and mine.teacher_id=auth.uid()
  left join public.homeroom_teachers h2 on h2.class_id=c.id
  left join public.profiles p
    on p.id=h2.teacher_id and p.account_status='active' and p.deleted_at is null
  where private.is_active_user()
    and private.is_teacher_capable_user(auth.uid())
    and c.is_active=true
    and c.academic_year=p_academic_year
    and c.semester=p_semester
  group by c.id,c.level_name,c.room_name,c.stage_code,c.sort_order
  order by c.sort_order,c.level_name,c.room_name;
$function$;

CREATE OR REPLACE FUNCTION public.initialize_academic_exam_attempts(p_exam_set_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_uid uuid := auth.uid();
  v_class_id uuid;
  v_academic_year text;
  v_semester integer;
  v_inserted integer := 0;
begin
  if v_uid is null then
    raise exception 'authentication required';
  end if;
  if not private.can_access_academic_exam_set(p_exam_set_id) then
    raise exception 'permission denied for exam set';
  end if;

  select s.class_id, s.academic_year, s.semester
    into v_class_id, v_academic_year, v_semester
  from public.academic_exam_sets s
  where s.id = p_exam_set_id;

  if v_class_id is null then
    raise exception 'exam set has no class';
  end if;

  insert into public.academic_exam_attempts (
    exam_set_id, student_id, student_number_snapshot, student_code_snapshot,
    student_name_snapshot, attendance_status, created_by, updated_by
  )
  select
    p_exam_set_id,
    st.id,
    e.student_number,
    st.student_code,
    trim(concat_ws(' ', st.prefix, st.first_name, st.last_name)),
    'present',
    v_uid,
    v_uid
  from public.student_enrollments e
  join public.students st on st.id = e.student_id
  where e.class_id = v_class_id
    and e.academic_year = v_academic_year
    and e.semester = v_semester
    and e.enrollment_status = 'active'
    and st.status = 'active'
    and private.is_current_dmc_roster_student(st.id,v_academic_year,v_semester)
  order by e.student_number, st.student_code, st.last_name, st.first_name
  on conflict (exam_set_id, student_id) do nothing;

  get diagnostics v_inserted = row_count;
  return v_inserted;
end;
$function$;

CREATE OR REPLACE FUNCTION public.edufee_record_payment(p_student uuid, p_class uuid, p_year text, p_semester integer, p_category text, p_amount numeric, p_paid_on date, p_payer text, p_note text, p_request uuid)
 RETURNS edufee_payments
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_rate numeric(10,2);v_enabled boolean;v_paid numeric(10,2);
v_row public.edufee_payments%ROWTYPE;v_cycle text;v_rate_sem int;
BEGIN
 IF auth.uid() IS NULL OR NOT public.edufee_can_collect(p_class) THEN
  RAISE EXCEPTION 'Not authorized to receive payments for this class'; END IF;
 IF p_category NOT IN ('tuition','deposit','water') OR p_semester NOT IN (1,2)
    OR p_request IS NULL OR p_amount IS NULL OR p_amount<=0 THEN
  RAISE EXCEPTION 'Invalid payment details'; END IF;
 IF p_paid_on IS NULL OR p_paid_on>current_date THEN RAISE EXCEPTION 'Payment date cannot be in the future'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.student_enrollments e WHERE e.student_id=p_student
  AND e.class_id=p_class AND e.academic_year=p_year AND e.semester=p_semester AND e.enrollment_status='active'
  AND private.is_current_dmc_roster_student(e.student_id,p_year,p_semester))
 THEN RAISE EXCEPTION 'Student not enrolled in selected class and term'; END IF;
 SELECT cycle INTO v_cycle FROM public.edufee_cycles WHERE academic_year=p_year AND category=p_category;
 v_cycle:=coalesce(v_cycle,CASE WHEN p_category='tuition' THEN 'semester' ELSE 'annual' END);
 v_rate_sem:=CASE WHEN v_cycle='annual' THEN 0 ELSE p_semester END;
 SELECT w.enabled INTO v_enabled FROM public.edufee_windows w
 WHERE w.academic_year=p_year AND w.semester=p_semester AND w.category=p_category;
 IF NOT coalesce(v_enabled,false) THEN RAISE EXCEPTION 'Fee category is not enabled for this term'; END IF;
 SELECT r.amount INTO v_rate FROM public.edufee_rates r
 WHERE r.academic_year=p_year AND r.semester=v_rate_sem AND r.category=p_category;
 IF coalesce(v_rate,0)<=0 THEN RAISE EXCEPTION 'Configure a positive fee amount before receiving payments'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(
  p_student::text||'/'||p_year||'/'||p_category||'/'||
  (CASE WHEN v_cycle='annual' THEN 'year' ELSE p_semester::text END),0));
 SELECT * INTO v_row FROM public.edufee_payments WHERE request_id=p_request;
 IF FOUND THEN
  IF v_row.student_id=p_student AND v_row.academic_year=p_year AND v_row.semester=p_semester
   AND v_row.category=p_category AND v_row.amount=p_amount AND v_row.voided_at IS NULL
   THEN RETURN v_row; END IF;
  RAISE EXCEPTION 'Duplicate payment request identifier'; END IF;
 SELECT coalesce(sum(t.amount),0) INTO v_paid FROM public.edufee_payments t
 WHERE t.student_id=p_student AND t.academic_year=p_year AND t.category=p_category
 AND (v_cycle='annual' OR t.semester=p_semester) AND t.voided_at IS NULL;
 -- Totals imported from the original Google Sheet have no invented receipt date.
 -- Count them toward the existing charge to prevent double collection.
 IF p_year='2569' THEN
  v_paid:=v_paid+
   coalesce((select sum(case
    when p_category='tuition' and p_semester=1 then r.source_paid_term1
    when p_category='water' then r.source_paid_water
    else 0 end)
    from public.edufee_import_rows r
    where r.student_id=p_student and r.academic_year=p_year and r.review_status='ready'),0)
   +coalesce((select sum(l.amount)
    from public.edufee_import_receipts l join public.edufee_import_rows r on r.id=l.import_row_id
    where r.student_id=p_student and r.academic_year=p_year and r.review_status='ready'
     and l.category=p_category and (v_cycle='annual' or l.semester=p_semester)
     and l.voided_at is null),0);
 END IF;
 IF p_amount>v_rate-v_paid THEN
  RAISE EXCEPTION 'Payment exceeds outstanding balance (remaining %)',v_rate-v_paid; END IF;
 INSERT INTO public.edufee_payments
 (request_id,student_id,class_id,academic_year,semester,category,amount,paid_on,payer_name,note,recorded_by)
 VALUES(p_request,p_student,p_class,p_year,p_semester,p_category,p_amount,p_paid_on,
  nullif(btrim(p_payer),''),nullif(btrim(p_note),''),auth.uid())
 RETURNING * INTO v_row;
 INSERT INTO public.edufee_audit(payment_id,actor_id,action,note)
 VALUES(v_row.id,auth.uid(),'recorded','Recorded payment');
 RETURN v_row;
END $function$;

CREATE OR REPLACE FUNCTION public.edufee_set_deposit_choice(p_student uuid, p_year text, p_opted_in boolean)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_actor uuid := (select auth.uid()); v_prior boolean; v_eligible boolean;
begin
 if v_actor is null or p_student is null or p_year !~ '^[0-9]{4}$' or p_opted_in is null then
  raise exception 'Invalid insurance selection'; end if;
 select exists(
  select 1 from public.student_enrollments en
  where en.student_id=p_student and en.academic_year=p_year and en.enrollment_status='active'
    and private.is_current_dmc_roster_student(en.student_id,p_year,
      coalesce((select max(t.semester) from public.academic_terms t where t.academic_year=p_year and t.is_current),en.semester))
    and (public.edufee_is_manager() or public.edufee_can_collect(en.class_id))
 ) into v_eligible;
 if not v_eligible then raise exception 'No permission to change insurance for this student and year'; end if;
 perform pg_advisory_xact_lock(hashtextextended('deposit-choice/'||p_student::text||'/'||p_year,0));
 if not p_opted_in and exists(
    select 1 from public.edufee_payments p
    where p.student_id=p_student and p.academic_year=p_year
     and p.category='deposit' and p.voided_at is null
 ) then raise exception 'Cannot remove insurance while an active insurance payment exists'; end if;
 select opted_in into v_prior from public.edufee_deposit_choices
 where student_id=p_student and academic_year=p_year for update;
 if found and v_prior=p_opted_in then return true; end if;
 insert into public.edufee_deposit_choices(student_id,academic_year,opted_in,updated_by)
 values (p_student,p_year,p_opted_in,v_actor)
 on conflict(student_id,academic_year) do update
 set opted_in=excluded.opted_in, updated_by=excluded.updated_by, updated_at=clock_timestamp();
 insert into public.edufee_deposit_choice_audit
 (student_id,academic_year,previous_choice,next_choice,actor_id)
 values (p_student,p_year,v_prior,p_opted_in,v_actor);
 return true;
end $function$;

CREATE OR REPLACE FUNCTION public.add_student_followup_cases(p_batch_id uuid, p_items jsonb)
 RETURNS SETOF student_followup_cases
 LANGUAGE plpgsql
 SET search_path TO ''
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
      AND s.status='active'
      AND private.is_current_dmc_roster_student(s.id,v_batch.academic_year,v_batch.semester)
      AND private.can_view_student(s.id)
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

CREATE OR REPLACE FUNCTION public.copy_student_registry_semester(p_academic_year text, p_from_semester integer, p_to_semester integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_year text := btrim(p_academic_year);
  v_classes integer := 0;
  v_reactivated integer := 0;
  v_enrollments integer := 0;
begin
  if auth.uid() is null or not private.can_manage_student_master() then
    raise exception 'Only Academic Head or Super Admin can copy student registry semester data';
  end if;
  if v_year is null or v_year = '' then raise exception 'Academic year is required'; end if;
  if p_from_semester not in (1,2) or p_to_semester not in (1,2) or p_from_semester = p_to_semester then
    raise exception 'Semester must be 1 or 2 and source/target must be different';
  end if;

  insert into public.academic_terms(academic_year,semester,is_current)
  values(v_year,p_to_semester,false)
  on conflict(academic_year,semester) do nothing;

  update public.school_classes tc
     set is_active=true,
         stage_code=sc.stage_code,
         sort_order=sc.sort_order,
         updated_at=clock_timestamp()
    from public.school_classes sc
   where sc.academic_year=v_year
     and sc.semester=p_from_semester
     and sc.is_active=true
     and tc.academic_year=v_year
     and tc.semester=p_to_semester
     and tc.level_name=sc.level_name
     and tc.room_name=sc.room_name
     and tc.is_active=false;
  get diagnostics v_reactivated = row_count;

  insert into public.school_classes(
    academic_year,semester,stage_code,level_name,room_name,sort_order,is_active,created_by
  )
  select v_year,p_to_semester,c.stage_code,c.level_name,c.room_name,c.sort_order,true,auth.uid()
  from public.school_classes c
  where c.academic_year=v_year
    and c.semester=p_from_semester
    and c.is_active=true
  on conflict(academic_year,semester,level_name,room_name) do nothing;
  get diagnostics v_classes = row_count;

  with candidates as (
    select
      e.student_id,
      tc.id as target_class_id,
      coalesce(mx.max_no,0) as base_no,
      row_number() over (
        partition by tc.id
        order by
          case when s.gender='ชาย' then 0 when s.gender='หญิง' then 1 else 2 end,
          case when s.student_code ~ '^[0-9]+$' then s.student_code::bigint else 9223372036854775807::bigint end,
          s.student_code,
          s.id
      ) as seq_no
    from public.student_enrollments e
    join public.school_classes sc on sc.id=e.class_id
    join public.students s on s.id=e.student_id
    join public.school_classes tc
      on tc.academic_year=v_year
     and tc.semester=p_to_semester
     and tc.level_name=sc.level_name
     and tc.room_name=sc.room_name
     and tc.is_active=true
    left join lateral (
      select max(te.student_number) as max_no
      from public.student_enrollments te
      where te.class_id=tc.id
    ) mx on true
    where e.academic_year=v_year
      and e.semester=p_from_semester
      and e.enrollment_status='active'
      and private.is_current_dmc_roster_student(e.student_id,v_year,p_from_semester)
      and sc.is_active=true
      and not exists (
        select 1
        from public.student_enrollments te
        where te.student_id=e.student_id
          and te.academic_year=v_year
          and te.semester=p_to_semester
      )
  )
  insert into public.student_enrollments(
    student_id,class_id,academic_year,semester,student_number,enrollment_status,promotion_status,created_by
  )
  select student_id,target_class_id,v_year,p_to_semester,base_no+seq_no,'active','pending',auth.uid()
  from candidates
  on conflict do nothing;
  get diagnostics v_enrollments = row_count;

  return jsonb_build_object(
    'academic_year',v_year,
    'from_semester',p_from_semester,
    'to_semester',p_to_semester,
    'classes_created',v_classes,
    'classes_reactivated',v_reactivated,
    'enrollments_created',v_enrollments
  );
end;
$function$;

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
    if not private.is_current_dmc_roster_student(v_item.student_id,v_item.source_year,v_item.source_semester) then
      raise exception 'ไม่สามารถดำเนินการกับนักเรียนที่ไม่อยู่ในทะเบียน DMC ปัจจุบันของภาคเรียนต้นทางได้';
    end if;
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
$function$;

CREATE OR REPLACE FUNCTION public.save_academic_transfer_request(p_request_id uuid, p_payload jsonb)
 RETURNS academic_transfer_requests
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'private'
AS $function$
declare
  v_row public.academic_transfer_requests;
  v_student_id uuid;
  v_year text;
  v_sem integer;
  v_class_id uuid;
  v_student_number integer;
  v_student_name text;
  v_class_label text;
  v_student_code text;
  v_birth_date date;
  v_citizen_id text;
  v_father_name text;
  v_mother_name text;
  v_is_manager boolean := private.can_manage_academic_registration();
begin
  if not private.is_active_user() then raise exception 'บัญชีผู้ใช้ไม่มีสิทธิ์ใช้งาน'; end if;

  if p_request_id is null then
    v_student_id := nullif(p_payload->>'student_id','')::uuid;
    v_year := nullif(p_payload->>'academic_year','');
    v_sem := nullif(p_payload->>'semester','')::integer;

    if v_student_id is null
      or not private.can_create_transfer_request_for_period(v_student_id,v_year,v_sem)
      or not private.is_current_dmc_roster_student(v_student_id,v_year,v_sem) then
      raise exception 'ไม่มีสิทธิ์สร้างคำร้องสำหรับนักเรียนรายนี้ในปี/ภาคเรียนที่เลือก';
    end if;

    select
      e.class_id,e.student_number,
      concat(coalesce(s.prefix,''),coalesce(s.first_name,''),case when nullif(btrim(s.last_name),'') is null then '' else ' '||btrim(s.last_name) end),
      sc.level_name||'/'||sc.room_name,
      s.student_code,s.birth_date,s.citizen_id,
      nullif(btrim(concat_ws(' ',s.father_prefix,s.father_first_name,s.father_last_name)),''),
      nullif(btrim(concat_ws(' ',s.mother_prefix,s.mother_first_name,s.mother_last_name)),'')
    into v_class_id,v_student_number,v_student_name,v_class_label,v_student_code,v_birth_date,v_citizen_id,v_father_name,v_mother_name
    from public.student_enrollments e
    join public.students s on s.id=e.student_id
    join public.school_classes sc on sc.id=e.class_id
    where e.student_id=v_student_id
      and e.academic_year=v_year
      and e.semester=v_sem
      and e.enrollment_status='active'
      and sc.is_active
    order by e.updated_at desc
    limit 1;

    if v_class_id is null then raise exception 'ไม่พบทะเบียนนักเรียนที่กำลังใช้งานในปี/ภาคเรียนนี้'; end if;

    insert into public.academic_transfer_requests(
      academic_year,semester,student_id,class_id,student_number,request_date,
      guardian_name,student_name,class_label,student_code,birth_date,citizen_id,
      father_name,mother_name,contact_phone,reason_type,destination_school,
      destination_district,destination_province,other_reason,transfer_date,
      applicant_name,applicant_role,evidence_photo,evidence_birth_certificate,
      evidence_house_registration,evidence_parent_id,evidence_phone,evidence_other,
      evidence_other_note,finance_status,finance_amount_due,registrar_decision,
      registrar_reason,assessment_decision,assessment_reason,director_decision,
      director_reason,status,created_by,updated_by
    ) values (
      v_year,v_sem,v_student_id,v_class_id,v_student_number,
      (p_payload->>'request_date')::date,
      btrim(p_payload->>'guardian_name'),v_student_name,v_class_label,v_student_code,v_birth_date,v_citizen_id,
      v_father_name,v_mother_name,btrim(p_payload->>'contact_phone'),
      p_payload->>'reason_type',nullif(btrim(p_payload->>'destination_school'),''),
      nullif(btrim(p_payload->>'destination_district'),''),nullif(btrim(p_payload->>'destination_province'),''),
      nullif(btrim(p_payload->>'other_reason'),''),(p_payload->>'transfer_date')::date,
      btrim(p_payload->>'applicant_name'),coalesce(nullif(p_payload->>'applicant_role',''),'guardian'),
      coalesce((p_payload->>'evidence_photo')::boolean,false),
      coalesce((p_payload->>'evidence_birth_certificate')::boolean,false),
      coalesce((p_payload->>'evidence_house_registration')::boolean,false),
      coalesce((p_payload->>'evidence_parent_id')::boolean,false),
      coalesce((p_payload->>'evidence_phone')::boolean,false),
      coalesce((p_payload->>'evidence_other')::boolean,false),
      nullif(btrim(p_payload->>'evidence_other_note'),''),
      case when v_is_manager then coalesce(nullif(p_payload->>'finance_status',''),'pending') else 'pending' end,
      case when v_is_manager and nullif(p_payload->>'finance_amount_due','') is not null then (p_payload->>'finance_amount_due')::numeric else null end,
      case when v_is_manager then coalesce(nullif(p_payload->>'registrar_decision',''),'pending') else 'pending' end,
      case when v_is_manager then nullif(btrim(p_payload->>'registrar_reason'),'') else null end,
      case when v_is_manager then coalesce(nullif(p_payload->>'assessment_decision',''),'pending') else 'pending' end,
      case when v_is_manager then nullif(btrim(p_payload->>'assessment_reason'),'') else null end,
      case when v_is_manager then coalesce(nullif(p_payload->>'director_decision',''),'pending') else 'pending' end,
      case when v_is_manager then nullif(btrim(p_payload->>'director_reason'),'') else null end,
      'draft',auth.uid(),auth.uid()
    ) returning * into v_row;
  else
    select * into v_row from public.academic_transfer_requests where id=p_request_id;
    if v_row.id is null then raise exception 'ไม่พบคำร้อง'; end if;
    if not private.can_edit_transfer_request(p_request_id) then raise exception 'ไม่มีสิทธิ์แก้ไขคำร้องนี้'; end if;

    update public.academic_transfer_requests
    set
      request_date=(p_payload->>'request_date')::date,
      guardian_name=btrim(p_payload->>'guardian_name'),
      contact_phone=btrim(p_payload->>'contact_phone'),
      reason_type=p_payload->>'reason_type',
      destination_school=nullif(btrim(p_payload->>'destination_school'),''),
      destination_district=nullif(btrim(p_payload->>'destination_district'),''),
      destination_province=nullif(btrim(p_payload->>'destination_province'),''),
      other_reason=nullif(btrim(p_payload->>'other_reason'),''),
      transfer_date=(p_payload->>'transfer_date')::date,
      applicant_name=btrim(p_payload->>'applicant_name'),
      applicant_role=coalesce(nullif(p_payload->>'applicant_role',''),applicant_role),
      evidence_photo=coalesce((p_payload->>'evidence_photo')::boolean,false),
      evidence_birth_certificate=coalesce((p_payload->>'evidence_birth_certificate')::boolean,false),
      evidence_house_registration=coalesce((p_payload->>'evidence_house_registration')::boolean,false),
      evidence_parent_id=coalesce((p_payload->>'evidence_parent_id')::boolean,false),
      evidence_phone=coalesce((p_payload->>'evidence_phone')::boolean,false),
      evidence_other=coalesce((p_payload->>'evidence_other')::boolean,false),
      evidence_other_note=nullif(btrim(p_payload->>'evidence_other_note'),''),
      finance_status=case when v_is_manager then coalesce(nullif(p_payload->>'finance_status',''),finance_status) else finance_status end,
      finance_amount_due=case when v_is_manager then case when nullif(p_payload->>'finance_amount_due','') is null then null else (p_payload->>'finance_amount_due')::numeric end else finance_amount_due end,
      registrar_decision=case when v_is_manager then coalesce(nullif(p_payload->>'registrar_decision',''),registrar_decision) else registrar_decision end,
      registrar_reason=case when v_is_manager then nullif(btrim(p_payload->>'registrar_reason'),'') else registrar_reason end,
      assessment_decision=case when v_is_manager then coalesce(nullif(p_payload->>'assessment_decision',''),assessment_decision) else assessment_decision end,
      assessment_reason=case when v_is_manager then nullif(btrim(p_payload->>'assessment_reason'),'') else assessment_reason end,
      director_decision=case when v_is_manager then coalesce(nullif(p_payload->>'director_decision',''),director_decision) else director_decision end,
      director_reason=case when v_is_manager then nullif(btrim(p_payload->>'director_reason'),'') else director_reason end,
      updated_by=auth.uid()
    where id=p_request_id
    returning * into v_row;
  end if;

  return v_row;
end;
$function$;

CREATE OR REPLACE FUNCTION public.save_academic_certificate_request(p_request_id uuid, p_payload jsonb)
 RETURNS academic_certificate_requests
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'private'
AS $function$
declare
  v_row public.academic_certificate_requests;
  v_student public.students;
  v_enroll public.student_enrollments;
  v_class public.school_classes;
  v_student_id uuid := nullif(p_payload->>'student_id','')::uuid;
  v_year text := nullif(p_payload->>'academic_year','');
  v_sem integer := nullif(p_payload->>'semester','')::integer;
  v_type text := coalesce(nullif(p_payload->>'certificate_type',''),'current');
begin
  if not private.is_active_user() then raise exception 'บัญชีผู้ใช้ไม่มีสิทธิ์ใช้งาน'; end if;

  if p_request_id is null then
    if v_student_id is null or not private.can_create_certificate_request_for_period(v_student_id,v_year,v_sem) then
      raise exception 'ไม่มีสิทธิ์สร้างคำร้องสำหรับนักเรียนรายนี้';
    end if;
    if v_type='former' and not (private.can_manage_academic_certificate() or private.can_finalize_academic_certificate() or private.can_prepare_academic_certificate()) then
      raise exception 'คำร้องสำหรับอดีตนักเรียนจัดทำได้โดยงานใบรับรอง/หัวหน้าวิชาการ/ผู้ดูแลระบบ';
    end if;
    if v_type='current' and not private.is_current_dmc_roster_student(v_student_id,v_year,v_sem) then
      raise exception 'ไม่พบรายชื่อนักเรียนปัจจุบันในทะเบียน DMC รอบล่าสุด';
    end if;

    select * into v_student from public.students where id=v_student_id;
    if v_student.id is null then raise exception 'ไม่พบข้อมูลนักเรียน'; end if;

    if v_type='current' then
      select * into v_enroll from public.student_enrollments
      where student_id=v_student_id and academic_year=v_year and semester=v_sem and enrollment_status='active'
      order by updated_at desc limit 1;
      if v_enroll.id is null then raise exception 'ไม่พบทะเบียนนักเรียนปัจจุบันในปี/ภาคเรียนที่เลือก'; end if;
    else
      select * into v_enroll from public.student_enrollments
      where student_id=v_student_id order by academic_year desc,semester desc,updated_at desc limit 1;
    end if;
    if v_enroll.class_id is not null then select * into v_class from public.school_classes where id=v_enroll.class_id; end if;

    insert into public.academic_certificate_requests(
      academic_year,semester,student_id,class_id,student_number,request_date,
      student_name,student_code,citizen_id,birth_date,class_label,father_name,mother_name,student_address,
      certificate_type,former_class_label,former_academic_year,former_gpa,
      purpose_type,purpose_other,contact_phone,
      evidence_photo,evidence_birth_certificate,evidence_house_registration,evidence_parent_id,evidence_phone,evidence_other,evidence_other_note,
      applicant_name,created_by,updated_by
    ) values(
      v_year,v_sem,v_student_id,v_enroll.class_id,v_enroll.student_number,(p_payload->>'request_date')::date,
      concat(coalesce(v_student.prefix,''),coalesce(v_student.first_name,''),case when nullif(btrim(v_student.last_name),'') is null then '' else ' '||btrim(v_student.last_name) end),
      v_student.student_code,v_student.citizen_id,v_student.birth_date,
      case when v_class.id is null then null else v_class.level_name||'/'||v_class.room_name end,
      nullif(btrim(concat_ws(' ',v_student.father_prefix,v_student.father_first_name,v_student.father_last_name)),''),
      nullif(btrim(concat_ws(' ',v_student.mother_prefix,v_student.mother_first_name,v_student.mother_last_name)),''),
      nullif(btrim(concat_ws(' ',
        case when nullif(btrim(v_student.house_no),'') is not null then 'บ้านเลขที่ '||btrim(v_student.house_no) end,
        case when nullif(btrim(v_student.village_no),'') is not null then 'หมู่ที่ '||btrim(v_student.village_no) end,
        case when nullif(btrim(v_student.subdistrict),'') is not null then 'ตำบล'||btrim(v_student.subdistrict) end,
        case when nullif(btrim(v_student.district),'') is not null then 'อำเภอ'||btrim(v_student.district) end,
        case when nullif(btrim(v_student.province),'') is not null then 'จังหวัด'||btrim(v_student.province) end
      )),''),
      v_type,nullif(btrim(p_payload->>'former_class_label'),''),nullif(btrim(p_payload->>'former_academic_year'),''),
      case when nullif(p_payload->>'former_gpa','') is null then null else (p_payload->>'former_gpa')::numeric end,
      p_payload->>'purpose_type',nullif(btrim(p_payload->>'purpose_other'),''),
      nullif(btrim(p_payload->>'contact_phone'),''),
      coalesce((p_payload->>'evidence_photo')::boolean,false),
      coalesce((p_payload->>'evidence_birth_certificate')::boolean,false),
      coalesce((p_payload->>'evidence_house_registration')::boolean,false),
      coalesce((p_payload->>'evidence_parent_id')::boolean,false),
      coalesce((p_payload->>'evidence_phone')::boolean,false),
      coalesce((p_payload->>'evidence_other')::boolean,false),
      nullif(btrim(p_payload->>'evidence_other_note'),''),
      btrim(p_payload->>'applicant_name'),auth.uid(),auth.uid()
    ) returning * into v_row;
  else
    select * into v_row from public.academic_certificate_requests where id=p_request_id;
    if v_row.id is null then raise exception 'ไม่พบคำร้อง'; end if;
    if not private.can_edit_certificate_request(p_request_id) then raise exception 'ไม่มีสิทธิ์แก้ไขคำร้องนี้'; end if;

    update public.academic_certificate_requests set
      request_date=(p_payload->>'request_date')::date,
      certificate_type=coalesce(nullif(p_payload->>'certificate_type',''),certificate_type),
      former_class_label=nullif(btrim(p_payload->>'former_class_label'),''),
      former_academic_year=nullif(btrim(p_payload->>'former_academic_year'),''),
      former_gpa=case when nullif(p_payload->>'former_gpa','') is null then null else (p_payload->>'former_gpa')::numeric end,
      purpose_type=p_payload->>'purpose_type',
      purpose_other=nullif(btrim(p_payload->>'purpose_other'),''),
      contact_phone=nullif(btrim(p_payload->>'contact_phone'),''),
      evidence_photo=coalesce((p_payload->>'evidence_photo')::boolean,false),
      evidence_birth_certificate=coalesce((p_payload->>'evidence_birth_certificate')::boolean,false),
      evidence_house_registration=coalesce((p_payload->>'evidence_house_registration')::boolean,false),
      evidence_parent_id=coalesce((p_payload->>'evidence_parent_id')::boolean,false),
      evidence_phone=coalesce((p_payload->>'evidence_phone')::boolean,false),
      evidence_other=coalesce((p_payload->>'evidence_other')::boolean,false),
      evidence_other_note=nullif(btrim(p_payload->>'evidence_other_note'),''),
      applicant_name=btrim(p_payload->>'applicant_name'),
      status=case when status='approved' then 'submitted' else status end,
      finalized_at=case when status='approved' then null else finalized_at end,
      finalized_by=case when status='approved' then null else finalized_by end,
      updated_by=auth.uid()
    where id=p_request_id returning * into v_row;
  end if;
  return v_row;
end;
$function$;

CREATE OR REPLACE FUNCTION public.save_academic_document_service_request(p_request_id uuid, p_payload jsonb)
 RETURNS academic_document_service_requests
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'private'
AS $function$
declare
  v_row public.academic_document_service_requests;
  v_student public.students;
  v_enroll public.student_enrollments;
  v_class public.school_classes;
  v_student_id uuid:=nullif(p_payload->>'student_id','')::uuid;
  v_year text:=nullif(p_payload->>'academic_year','');
  v_sem integer:=nullif(p_payload->>'semester','')::integer;
  v_no integer; v_no_year text; v_code text;
  v_student_first text:=btrim(coalesce(p_payload->>'student_first_name',''));
  v_student_last text:=nullif(btrim(coalesce(p_payload->>'student_last_name','')),'');
  v_student_prefix text:=nullif(btrim(coalesce(p_payload->>'student_prefix','')),'');
begin
  if not private.is_active_user() then raise exception 'บัญชีผู้ใช้ไม่มีสิทธิ์ใช้งาน'; end if;

  if p_request_id is null then
    if v_student_id is not null then
      if not (private.can_manage_academic_document_service() or private.can_create_certificate_request_for_period(v_student_id,v_year,v_sem)) then
        raise exception 'ไม่มีสิทธิ์สร้างคำร้องสำหรับนักเรียนรายนี้';
      end if;
      select * into v_student from public.students where id=v_student_id;
      if v_student.id is null then raise exception 'ไม่พบข้อมูลนักเรียน'; end if;
      select * into v_enroll from public.student_enrollments
      where student_id=v_student_id and academic_year=v_year and semester=v_sem and enrollment_status='active'
      order by updated_at desc limit 1;
      if v_enroll.id is not null and not private.is_current_dmc_roster_student(v_student_id,v_year,v_sem) then
        raise exception 'ไม่พบรายชื่อนักเรียนปัจจุบันในทะเบียน DMC รอบล่าสุด';
      end if;
      if v_enroll.class_id is not null then select * into v_class from public.school_classes where id=v_enroll.class_id; end if;
      v_student_prefix:=v_student.prefix; v_student_first:=v_student.first_name; v_student_last:=v_student.last_name;
    elsif not private.can_manage_academic_document_service() then
      raise exception 'การกรอกนักเรียนแบบไม่เชื่อมทะเบียนทำได้เฉพาะนายทะเบียน/ผู้ดูแลระบบ';
    end if;

    if nullif(v_student_first,'') is null then raise exception 'กรุณาระบุชื่อนักเรียน'; end if;

    select request_number_next,request_number_year into v_no,v_no_year
    from public.academic_document_service_settings where id=1 for update;
    if v_no is null or v_no<1 then v_no:=1; end if;
    if nullif(btrim(v_no_year),'') is null then v_no_year:=coalesce(v_year,'2569'); end if;
    v_code:=v_no::text||'/'||v_no_year;
    if exists(select 1 from public.academic_document_service_requests where request_code=v_code) then
      raise exception 'เลขคำร้อง % ถูกใช้งานแล้ว กรุณาตั้งค่าเลขถัดไปใหม่',v_code;
    end if;

    insert into public.academic_document_service_requests(
      request_code,request_serial,request_year,request_date,academic_year,semester,student_id,
      applicant_prefix,applicant_first_name,applicant_last_name,applicant_house_no,applicant_village_no,applicant_village_name,
      applicant_subdistrict,applicant_district,applicant_province,applicant_phone,applicant_email,
      student_prefix,student_first_name,student_last_name,student_name,student_code,class_label,graduation_year,
      doc_transcript,doc_transcript_lost,doc_certificate,doc_certificate_with_grade,doc_other,doc_other_note,purpose_text,
      evidence_student_id_count,evidence_father_id_count,evidence_mother_id_count,evidence_photo_count,evidence_police_report,evidence_other,evidence_other_note,
      created_by,updated_by
    ) values(
      v_code,v_no,v_no_year,coalesce((p_payload->>'request_date')::date,current_date),v_year,v_sem,v_student_id,
      nullif(btrim(p_payload->>'applicant_prefix'),''),nullif(btrim(p_payload->>'applicant_first_name'),''),nullif(btrim(p_payload->>'applicant_last_name'),''),
      nullif(btrim(p_payload->>'applicant_house_no'),''),nullif(btrim(p_payload->>'applicant_village_no'),''),nullif(btrim(p_payload->>'applicant_village_name'),''),
      nullif(btrim(p_payload->>'applicant_subdistrict'),''),nullif(btrim(p_payload->>'applicant_district'),''),nullif(btrim(p_payload->>'applicant_province'),''),
      nullif(btrim(p_payload->>'applicant_phone'),''),nullif(btrim(p_payload->>'applicant_email'),''),
      v_student_prefix,v_student_first,v_student_last,
      concat(coalesce(v_student_prefix,''),v_student_first,case when v_student_last is null then '' else ' '||v_student_last end),
      case when v_student_id is not null then v_student.student_code else nullif(btrim(p_payload->>'student_code'),'') end,
      case when v_student_id is not null and v_class.id is not null then v_class.level_name||'/'||v_class.room_name else nullif(btrim(p_payload->>'class_label'),'') end,
      nullif(btrim(p_payload->>'graduation_year'),''),
      coalesce((p_payload->>'doc_transcript')::boolean,false),coalesce((p_payload->>'doc_transcript_lost')::boolean,false),
      coalesce((p_payload->>'doc_certificate')::boolean,false),coalesce((p_payload->>'doc_certificate_with_grade')::boolean,false),
      coalesce((p_payload->>'doc_other')::boolean,false),nullif(btrim(p_payload->>'doc_other_note'),''),nullif(btrim(p_payload->>'purpose_text'),''),
      greatest(0,coalesce((p_payload->>'evidence_student_id_count')::integer,0)),greatest(0,coalesce((p_payload->>'evidence_father_id_count')::integer,0)),
      greatest(0,coalesce((p_payload->>'evidence_mother_id_count')::integer,0)),greatest(0,coalesce((p_payload->>'evidence_photo_count')::integer,0)),
      coalesce((p_payload->>'evidence_police_report')::boolean,false),coalesce((p_payload->>'evidence_other')::boolean,false),nullif(btrim(p_payload->>'evidence_other_note'),''),
      auth.uid(),auth.uid()
    ) returning * into v_row;

    update public.academic_document_service_settings set request_number_next=v_no+1,updated_by=auth.uid(),updated_at=now() where id=1;
  else
    select * into v_row from public.academic_document_service_requests where id=p_request_id;
    if v_row.id is null then raise exception 'ไม่พบคำร้อง'; end if;
    if not private.can_edit_academic_document_service_request(p_request_id) then raise exception 'ไม่มีสิทธิ์แก้ไขคำร้องนี้'; end if;
    update public.academic_document_service_requests set
      request_date=coalesce((p_payload->>'request_date')::date,request_date),
      applicant_prefix=nullif(btrim(p_payload->>'applicant_prefix'),''),applicant_first_name=nullif(btrim(p_payload->>'applicant_first_name'),''),applicant_last_name=nullif(btrim(p_payload->>'applicant_last_name'),''),
      applicant_house_no=nullif(btrim(p_payload->>'applicant_house_no'),''),applicant_village_no=nullif(btrim(p_payload->>'applicant_village_no'),''),applicant_village_name=nullif(btrim(p_payload->>'applicant_village_name'),''),
      applicant_subdistrict=nullif(btrim(p_payload->>'applicant_subdistrict'),''),applicant_district=nullif(btrim(p_payload->>'applicant_district'),''),applicant_province=nullif(btrim(p_payload->>'applicant_province'),''),
      applicant_phone=nullif(btrim(p_payload->>'applicant_phone'),''),applicant_email=nullif(btrim(p_payload->>'applicant_email'),''),
      student_prefix=coalesce(nullif(btrim(p_payload->>'student_prefix'),''),student_prefix),
      student_first_name=coalesce(nullif(btrim(p_payload->>'student_first_name'),''),student_first_name),
      student_last_name=nullif(btrim(p_payload->>'student_last_name'),''),
      student_name=concat(coalesce(nullif(btrim(p_payload->>'student_prefix'),''),student_prefix,''),coalesce(nullif(btrim(p_payload->>'student_first_name'),''),student_first_name),case when nullif(btrim(p_payload->>'student_last_name'),'') is null then '' else ' '||btrim(p_payload->>'student_last_name') end),
      student_code=coalesce(nullif(btrim(p_payload->>'student_code'),''),student_code),
      class_label=coalesce(nullif(btrim(p_payload->>'class_label'),''),class_label),
      graduation_year=nullif(btrim(p_payload->>'graduation_year'),''),
      doc_transcript=coalesce((p_payload->>'doc_transcript')::boolean,false),
      doc_transcript_lost=coalesce((p_payload->>'doc_transcript_lost')::boolean,false),
      doc_certificate=coalesce((p_payload->>'doc_certificate')::boolean,false),
      doc_certificate_with_grade=coalesce((p_payload->>'doc_certificate_with_grade')::boolean,false),
      doc_other=coalesce((p_payload->>'doc_other')::boolean,false),
      doc_other_note=nullif(btrim(p_payload->>'doc_other_note'),''),
      purpose_text=nullif(btrim(p_payload->>'purpose_text'),''),
      evidence_student_id_count=greatest(0,coalesce((p_payload->>'evidence_student_id_count')::integer,0)),
      evidence_father_id_count=greatest(0,coalesce((p_payload->>'evidence_father_id_count')::integer,0)),
      evidence_mother_id_count=greatest(0,coalesce((p_payload->>'evidence_mother_id_count')::integer,0)),
      evidence_photo_count=greatest(0,coalesce((p_payload->>'evidence_photo_count')::integer,0)),
      evidence_police_report=coalesce((p_payload->>'evidence_police_report')::boolean,false),
      evidence_other=coalesce((p_payload->>'evidence_other')::boolean,false),
      evidence_other_note=nullif(btrim(p_payload->>'evidence_other_note'),''),
      updated_by=auth.uid(),updated_at=now()
    where id=p_request_id returning * into v_row;
  end if;
  return v_row;
end;
$function$;

CREATE OR REPLACE FUNCTION public.save_club_activity_members(p_report_id uuid, p_members jsonb)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'private'
AS $function$
declare
  r public.academic_club_activity_reports;
  x jsonb;
  sid uuid;
  att jsonb;
  cnt integer;
  pct numeric;
  objpass boolean;
  v_enrollment public.student_enrollments;
  v_student public.students;
  v_class public.school_classes;
  kept uuid[] := '{}'::uuid[];
  n integer := 0;
begin
  if not private.can_edit_club_activity_report(p_report_id) then
    raise exception 'ไม่มีสิทธิ์แก้ไขสมาชิกชุมนุม';
  end if;

  select * into r
  from public.academic_club_activity_reports
  where id = p_report_id
  for update;

  if jsonb_typeof(p_members) <> 'array' or jsonb_array_length(p_members) > 300 then
    raise exception 'ข้อมูลสมาชิกไม่ถูกต้องหรือมีมากเกิน 300 คน';
  end if;

  for x in select value from jsonb_array_elements(p_members)
  loop
    sid := (x->>'student_id')::uuid;
    att := coalesce(x->'attendance','[]'::jsonb);
    objpass := coalesce((x->>'objective_pass')::boolean,false);

    if jsonb_typeof(att) <> 'array' or jsonb_array_length(att) <> r.session_count then
      raise exception 'จำนวนช่องเวลาเข้าร่วมของนักเรียนไม่ตรงกับจำนวนครั้ง/ชั่วโมงของกิจกรรม';
    end if;

    if exists(
      select 1
      from jsonb_array_elements(att) y(v)
      where jsonb_typeof(y.v) <> 'boolean'
    ) then
      raise exception 'ข้อมูลเวลาเข้าร่วมต้องเป็น true/false';
    end if;

    select se.*
    into v_enrollment
    from public.student_enrollments se
    where se.student_id = sid
      and se.academic_year = r.academic_year
      and se.semester = r.semester
      and se.enrollment_status = 'active'
      and private.is_current_dmc_roster_student(se.student_id,r.academic_year,r.semester)
    order by se.created_at desc
    limit 1;

    if v_enrollment.id is null then
      raise exception 'พบนักเรียนที่ไม่ได้ลงทะเบียนในปี/ภาคเรียนของกิจกรรม';
    end if;

    select st.* into v_student
    from public.students st
    where st.id = sid;

    select sc.* into v_class
    from public.school_classes sc
    where sc.id = v_enrollment.class_id;

    select count(*) into cnt
    from jsonb_array_elements(att) y(v)
    where y.v = 'true'::jsonb;

    pct := round((cnt::numeric * 100) / r.session_count, 2);

    insert into public.academic_club_activity_members(
      report_id,student_id,class_id,class_label,student_number,student_code,
      prefix,first_name,last_name,student_name,gender,
      attendance,objective_pass,attended_count,attendance_percent,final_result,updated_at
    )
    values(
      r.id,v_student.id,v_class.id,v_class.level_name || '/' || v_class.room_name,
      v_enrollment.student_number,v_student.student_code,v_student.prefix,
      v_student.first_name,v_student.last_name,
      btrim(concat_ws(' ',coalesce(v_student.prefix,'') || coalesce(v_student.first_name,''),v_student.last_name)),
      v_student.gender,att,objpass,cnt,pct,
      case when objpass and pct >= r.attendance_threshold then 'pass' else 'fail' end,
      now()
    )
    on conflict(report_id,student_id) do update set
      class_id = excluded.class_id,
      class_label = excluded.class_label,
      student_number = excluded.student_number,
      student_code = excluded.student_code,
      prefix = excluded.prefix,
      first_name = excluded.first_name,
      last_name = excluded.last_name,
      student_name = excluded.student_name,
      gender = excluded.gender,
      attendance = excluded.attendance,
      objective_pass = excluded.objective_pass,
      attended_count = excluded.attended_count,
      attendance_percent = excluded.attendance_percent,
      final_result = excluded.final_result,
      updated_at = now();

    kept := array_append(kept,sid);
    n := n + 1;
  end loop;

  if array_length(kept,1) is null then
    delete from public.academic_club_activity_members where report_id = r.id;
  else
    delete from public.academic_club_activity_members
    where report_id = r.id and not(student_id = any(kept));
  end if;

  update public.academic_club_activity_reports
  set updated_at = now()
  where id = r.id;

  return n;
end;
$function$;

CREATE OR REPLACE FUNCTION public.save_learner_activity_report(p_report_id uuid, p_payload jsonb)
 RETURNS academic_learner_activity_reports
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'private'
AS $function$
declare
  u uuid:=auth.uid(); c public.school_classes; r public.academic_learner_activity_reports;
  tname text;tpos text;coid uuid;coname text;copos text;
  acts jsonb:=coalesce(p_payload->'activities','[]'::jsonb); a jsonb; ids integer; total integer; m integer; f integer;
  v_mode text;
  assigned_ids uuid[]; selected_ids uuid[]; selected_names text[];
begin
  if not private.is_active_user() or not private.is_teacher_capable_user(u) then raise exception 'กรุณาเข้าสู่ระบบด้วยบัญชีครูที่ปรึกษา'; end if;

  if p_report_id is not null then
    select * into r from public.academic_learner_activity_reports where id=p_report_id for update;
    if r.id is null then raise exception 'ไม่พบรายงานกิจกรรมพัฒนาผู้เรียน'; end if;
    if not private.can_edit_learner_activity_report(r.id) then raise exception 'ไม่มีสิทธิ์แก้ไขรายงานนี้'; end if;
  end if;

  v_mode:=coalesce(nullif(p_payload->>'submission_mode',''),r.submission_mode,'form');
  if v_mode not in ('form','upload') then raise exception 'รูปแบบการส่งงานไม่ถูกต้อง'; end if;

  if v_mode='form' then
    if jsonb_typeof(acts)<>'array' or jsonb_array_length(acts)=0 or jsonb_array_length(acts)>12 then raise exception 'กรุณากำหนดกิจกรรม 1-12 รายการ'; end if;
    select count(*),count(distinct value->>'id') into total,ids from jsonb_array_elements(acts);
    if total<>ids then raise exception 'รหัสกิจกรรมซ้ำ กรุณาบันทึกใหม่'; end if;
    for a in select value from jsonb_array_elements(acts) loop
      if nullif(btrim(a->>'id'),'') is null or nullif(btrim(a->>'name'),'') is null then raise exception 'กรุณาระบุชื่อกิจกรรมให้ครบ'; end if;
      if coalesce((a->>'track_attendance')::boolean,false) then
        if coalesce((a->>'session_count')::integer,0)<1 or coalesce((a->>'session_count')::integer,0)>200 then raise exception 'จำนวนครั้ง/ชั่วโมงต้องอยู่ระหว่าง 1-200'; end if;
        if coalesce(a->>'criteria_type','percent') not in ('percent','count') then raise exception 'รูปแบบเกณฑ์ผ่านไม่ถูกต้อง'; end if;
        if coalesce((a->>'threshold')::numeric,0)<=0 then raise exception 'เกณฑ์ผ่านต้องมากกว่า 0'; end if;
      end if;
      if coalesce(a->>'tracking_unit','ครั้ง') not in ('ครั้ง','ชั่วโมง') then raise exception 'หน่วยกิจกรรมไม่ถูกต้อง'; end if;
      if a ? 'outcomes' and jsonb_typeof(a->'outcomes')<>'array' then raise exception 'ผลการเรียนรู้ต้องเป็นรายการ'; end if;
    end loop;
  else
    acts:='[]'::jsonb;
  end if;

  select * into c from public.school_classes
  where id=coalesce(nullif(p_payload->>'class_id','')::uuid,r.class_id) and is_active=true;
  if c.id is null or not private.is_homeroom_teacher_for_class(u,c.id) then raise exception 'คุณไม่ได้เป็นครูที่ปรึกษาของชั้นเรียนนี้'; end if;
  if c.academic_year<>coalesce(p_payload->>'academic_year',r.academic_year) or c.semester<>coalesce((p_payload->>'semester')::integer,r.semester) then raise exception 'ปีการศึกษา/ภาคเรียนไม่ตรงกับชั้นเรียน'; end if;

  select coalesce(array_agg(h.teacher_id order by h.created_at),'{}'::uuid[])
    into assigned_ids
  from public.homeroom_teachers h join public.profiles p on p.id=h.teacher_id
  where h.class_id=c.id and p.account_status='active' and p.deleted_at is null;
  if cardinality(assigned_ids)=0 then assigned_ids:=array[u]; end if;

  if p_payload ? 'shared_teacher_ids' then
    select coalesce(array_agg(distinct x::uuid),'{}'::uuid[]) into selected_ids
    from jsonb_array_elements_text(p_payload->'shared_teacher_ids') t(x);
  else
    selected_ids:=assigned_ids;
  end if;
  if not (selected_ids @> assigned_ids and assigned_ids @> selected_ids) then
    raise exception 'งานรายชั้นต้องเลือกครูประจำชั้นร่วมให้ครบตามที่ Super Admin กำหนด';
  end if;
  if not (u=any(selected_ids)) then raise exception 'ผู้จัดทำต้องอยู่ในทีมครูประจำชั้นของห้องนี้'; end if;

  select array_agg(coalesce(nullif(btrim(p.full_name),''),p.email,'') order by array_position(selected_ids,p.id))
    into selected_names from public.profiles p where p.id=any(selected_ids);

  select coalesce(nullif(btrim(p.full_name),''),p.email,''),coalesce(nullif(btrim(pr.position_title),''),'ครูที่ปรึกษา')
    into tname,tpos from public.profiles p left join public.personnel_records pr on pr.user_id=p.id where p.id=u;

  select x into coid from unnest(selected_ids) x where x<>u limit 1;
  if coid is not null then
    select coalesce(nullif(btrim(p.full_name),''),p.email,''),coalesce(nullif(btrim(pr.position_title),''),'ครูที่ปรึกษา')
      into coname,copos from public.profiles p left join public.personnel_records pr on pr.user_id=p.id where p.id=coid;
  end if;

  select count(*) filter(where s.gender='ชาย'),count(*) filter(where s.gender='หญิง') into m,f
  from public.student_enrollments e join public.students s on s.id=e.student_id
  where e.class_id=c.id and e.enrollment_status='active'
    and private.is_current_dmc_roster_student(e.student_id,c.academic_year,c.semester);

  if p_report_id is null then
    insert into public.academic_learner_activity_reports(
      academic_year,semester,class_id,class_label,stage_code,teacher_id,teacher_name,teacher_position,
      co_adviser_id,co_adviser_name,co_adviser_position,shared_teacher_ids,shared_teacher_names,submission_mode,
      opening_male,opening_female,joined_male,joined_female,exited_male,exited_female,activities
    ) values(
      c.academic_year,c.semester,c.id,c.level_name||'/'||c.room_name,c.stage_code,u,tname,tpos,
      coid,coname,copos,selected_ids,coalesce(selected_names,'{}'::text[]),v_mode,
      coalesce((p_payload->>'opening_male')::integer,m),coalesce((p_payload->>'opening_female')::integer,f),
      coalesce((p_payload->>'joined_male')::integer,0),coalesce((p_payload->>'joined_female')::integer,0),
      coalesce((p_payload->>'exited_male')::integer,0),coalesce((p_payload->>'exited_female')::integer,0),acts
    ) returning * into r;
    insert into public.academic_learner_activity_students(
      report_id,student_id,student_number,student_code,prefix,first_name,last_name,student_name,gender,enrollment_status,promotion_status,activity_results
    )
    select r.id,s.id,e.student_number,s.student_code,s.prefix,s.first_name,s.last_name,
      btrim(concat_ws(' ',coalesce(s.prefix,'')||coalesce(s.first_name,''),s.last_name)),s.gender,e.enrollment_status,e.promotion_status,'{}'::jsonb
    from public.student_enrollments e join public.students s on s.id=e.student_id
    where e.class_id=c.id and e.enrollment_status='active'
      and private.is_current_dmc_roster_student(e.student_id,c.academic_year,c.semester)
    order by e.student_number,s.first_name,s.last_name;
  else
    update public.academic_learner_activity_reports set
      co_adviser_id=coid,co_adviser_name=coname,co_adviser_position=copos,
      shared_teacher_ids=selected_ids,shared_teacher_names=coalesce(selected_names,'{}'::text[]),submission_mode=v_mode,
      activities=acts,
      opening_male=coalesce((p_payload->>'opening_male')::integer,opening_male),
      opening_female=coalesce((p_payload->>'opening_female')::integer,opening_female),
      joined_male=coalesce((p_payload->>'joined_male')::integer,joined_male),
      joined_female=coalesce((p_payload->>'joined_female')::integer,joined_female),
      exited_male=coalesce((p_payload->>'exited_male')::integer,exited_male),
      exited_female=coalesce((p_payload->>'exited_female')::integer,exited_female),updated_at=now()
    where id=r.id returning * into r;
  end if;
  return r;
end;
$function$;

CREATE OR REPLACE FUNCTION public.save_lesson_plan_usage_report(p_report_id uuid, p_payload jsonb)
 RETURNS academic_lesson_plan_usage_reports
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'private'
AS $function$
declare
  v_user uuid:=auth.uid();
  v_assignment record;
  v_row public.academic_lesson_plan_usage_reports;
  v_teacher_name text;
  v_teacher_position text;
  v_student_count integer:=0;
  v_grade jsonb:=coalesce(p_payload->'grade_counts','{}'::jsonb);
  v_units jsonb:=coalesce(p_payload->'unit_progress','[]'::jsonb);
  v_top jsonb:=coalesce(p_payload->'top_students','[]'::jsonb);
  v_sat jsonb:=coalesce(p_payload->'satisfaction_items','[]'::jsonb);
begin
  if not private.is_active_user() or not private.is_teacher_capable_user(v_user) then
    raise exception 'กรุณาเข้าสู่ระบบด้วยบัญชีครูผู้สอน';
  end if;

  select
    ta.id assignment_id,c.id class_id,s.id subject_id,sg.id subject_group_id,
    c.academic_year,c.semester,c.level_name,c.room_name,
    s.subject_code,s.subject_name,sg.name_th subject_group_name
  into v_assignment
  from public.teaching_assignments ta
  join public.school_classes c on c.id=ta.class_id
  join public.academic_subjects s on s.id=ta.subject_id
  left join public.subject_groups sg on sg.id=s.subject_group_id
  where ta.id=(p_payload->>'assignment_id')::uuid
    and ta.teacher_id=v_user
    and ta.is_active=true and c.is_active=true and s.is_active=true;

  if v_assignment.assignment_id is null then
    raise exception 'ไม่พบรายวิชา/ห้องเรียนที่คุณรับผิดชอบ';
  end if;

  select
    coalesce(nullif(btrim(p.full_name),''),p.email,''),
    coalesce(nullif(btrim(pr.position_title),''),'ครูผู้สอน')
  into v_teacher_name,v_teacher_position
  from public.profiles p
  left join public.personnel_records pr on pr.user_id=p.id
  where p.id=v_user;

  select count(*)::integer into v_student_count
  from public.student_enrollments e
  where e.class_id=v_assignment.class_id and e.enrollment_status='active'
    and private.is_current_dmc_roster_student(e.student_id,v_assignment.academic_year,v_assignment.semester);

  if jsonb_typeof(v_grade)<>'object' then raise exception 'ข้อมูลผลสัมฤทธิ์ไม่ถูกต้อง'; end if;
  if jsonb_typeof(v_units)<>'array' then raise exception 'ข้อมูลคะแนนก่อนเรียน-หลังเรียนไม่ถูกต้อง'; end if;
  if jsonb_typeof(v_top)<>'array' then raise exception 'ข้อมูลนักเรียนคะแนนสูงสุดไม่ถูกต้อง'; end if;
  if jsonb_typeof(v_sat)<>'array' then raise exception 'ข้อมูลความพึงพอใจไม่ถูกต้อง'; end if;

  if p_report_id is null then
    insert into public.academic_lesson_plan_usage_reports(
      academic_year,semester,teacher_id,teacher_name,teacher_position,
      assignment_id,class_id,subject_id,subject_group_id,subject_code,subject_name,subject_group_name,class_label,
      memo_number,memo_date,units_count,plans_per_unit,student_count,objectives_text,supporting_documents_text,
      grade_counts,unit_progress,top_students,satisfaction_items,summary_text,strengths_text,weaknesses_text,
      improvements_text,problems_suggestions_text,status,created_at,updated_at
    ) values (
      v_assignment.academic_year,v_assignment.semester,v_user,v_teacher_name,v_teacher_position,
      v_assignment.assignment_id,v_assignment.class_id,v_assignment.subject_id,v_assignment.subject_group_id,
      v_assignment.subject_code,v_assignment.subject_name,v_assignment.subject_group_name,
      v_assignment.level_name||'/'||v_assignment.room_name,
      nullif(btrim(p_payload->>'memo_number'),''),
      nullif(p_payload->>'memo_date','')::date,
      nullif(p_payload->>'units_count','')::integer,
      nullif(p_payload->>'plans_per_unit','')::integer,
      v_student_count,
      nullif(btrim(p_payload->>'objectives_text'),''),
      nullif(btrim(p_payload->>'supporting_documents_text'),''),
      v_grade,v_units,v_top,v_sat,
      nullif(btrim(p_payload->>'summary_text'),''),
      nullif(btrim(p_payload->>'strengths_text'),''),
      nullif(btrim(p_payload->>'weaknesses_text'),''),
      nullif(btrim(p_payload->>'improvements_text'),''),
      nullif(btrim(p_payload->>'problems_suggestions_text'),''),
      'draft',now(),now()
    ) returning * into v_row;
  else
    select * into v_row
    from public.academic_lesson_plan_usage_reports
    where id=p_report_id
    for update;

    if v_row.id is null then raise exception 'ไม่พบรายงานการใช้แผน'; end if;
    if v_row.teacher_id<>v_user then raise exception 'ไม่มีสิทธิ์แก้ไขรายการนี้'; end if;
    if v_row.status not in ('draft','revision_requested') then
      raise exception 'รายการที่ส่งแล้วไม่สามารถแก้ไขได้';
    end if;

    update public.academic_lesson_plan_usage_reports
    set academic_year=v_assignment.academic_year,
        semester=v_assignment.semester,
        teacher_name=v_teacher_name,
        teacher_position=v_teacher_position,
        assignment_id=v_assignment.assignment_id,
        class_id=v_assignment.class_id,
        subject_id=v_assignment.subject_id,
        subject_group_id=v_assignment.subject_group_id,
        subject_code=v_assignment.subject_code,
        subject_name=v_assignment.subject_name,
        subject_group_name=v_assignment.subject_group_name,
        class_label=v_assignment.level_name||'/'||v_assignment.room_name,
        memo_number=nullif(btrim(p_payload->>'memo_number'),''),
        memo_date=nullif(p_payload->>'memo_date','')::date,
        units_count=nullif(p_payload->>'units_count','')::integer,
        plans_per_unit=nullif(p_payload->>'plans_per_unit','')::integer,
        student_count=v_student_count,
        objectives_text=nullif(btrim(p_payload->>'objectives_text'),''),
        supporting_documents_text=nullif(btrim(p_payload->>'supporting_documents_text'),''),
        grade_counts=v_grade,
        unit_progress=v_units,
        top_students=v_top,
        satisfaction_items=v_sat,
        summary_text=nullif(btrim(p_payload->>'summary_text'),''),
        strengths_text=nullif(btrim(p_payload->>'strengths_text'),''),
        weaknesses_text=nullif(btrim(p_payload->>'weaknesses_text'),''),
        improvements_text=nullif(btrim(p_payload->>'improvements_text'),''),
        problems_suggestions_text=nullif(btrim(p_payload->>'problems_suggestions_text'),''),
        updated_at=now()
    where id=p_report_id
    returning * into v_row;
  end if;

  return v_row;
end;
$function$;
