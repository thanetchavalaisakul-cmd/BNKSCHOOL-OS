-- BNK SCHOOL OS v5.12.9.51: atomic whole-day signature fan-out for legacy per-period enforcement.
-- The user selects and verifies one signature; one RPC transaction links it to each actual lesson.
-- Existing leave, per-period assignment, permission, and central signature checks remain unchanged.
create or replace function public.assign_substitute_day_signed(
 p_leave_request_id uuid,p_leave_date date,p_teacher_id uuid,p_method text,p_signature_id uuid default null,p_note text default null
) returns public.substitute_day_assignments
language plpgsql security definer set search_path='' as $fn$
declare v_lesson public.substitute_lessons; v_leave public.leave_requests; v_actor public.profiles;
 v_teacher public.profiles; v_old public.substitute_day_assignments; v_row public.substitute_day_assignments;
 v_period_count integer;
begin
 perform pg_advisory_xact_lock(hashtextextended('substitute-leave:'||p_leave_request_id::text||':'||p_leave_date::text,0));
 perform pg_advisory_xact_lock(hashtextextended('substitute-teacher:'||p_teacher_id::text||':'||p_leave_date::text,0));
 select * into v_leave from public.leave_requests where id=p_leave_request_id for update;
 if v_leave.id is null or p_leave_date not between v_leave.start_date and v_leave.end_date
   or v_leave.status not in ('pending_personnel','pending_director','approved')
 then raise exception 'Leave request is not active on this date'; end if;
 select * into v_lesson from public.substitute_lessons
 where leave_request_id=p_leave_request_id and leave_date=p_leave_date and status<>'cancelled' limit 1 for update;
 if v_lesson.id is null or not private.can_manage_substitute_lesson(v_lesson.id) then
  raise exception 'Not authorized to assign this day' using errcode='42501'; end if;
 select * into v_actor from public.profiles where id=auth.uid() and account_status='active' and deleted_at is null;
 select * into v_teacher from public.profiles where id=p_teacher_id and account_status='active' and deleted_at is null and role in('teacher','department_head');
 if v_actor.id is null or v_teacher.id is null then raise exception 'Teacher account is unavailable'; end if;
 -- Day-level timetable, other substitutes and leave notices are informative, not blockers.
 if p_teacher_id=v_leave.requester_id then
   raise exception 'Absent teacher cannot substitute for themself' using errcode='22023'; end if;
 select count(*) into v_period_count from private.substitute_day_slots(p_leave_request_id,p_leave_date);
 if v_period_count=0 then raise exception 'No published periods configured for this date'; end if;
 -- Existing regular periods cannot be owned by another substitute without a formal reassignment.
 if exists(select 1 from public.substitute_lessons sl
    where sl.leave_request_id=p_leave_request_id and sl.leave_date=p_leave_date and sl.status='assigned'
    and sl.substitute_teacher_id<>p_teacher_id
    and (not exists(select 1 from public.substitute_day_assignments d
      where d.leave_request_id=p_leave_request_id and d.leave_date=p_leave_date and d.status<>'cancelled')))
 then raise exception 'Existing per-period assignments must be cleared before switching to whole-day mode'; end if;
 -- Reuse the central action-signature verifier, once for the entire batch.
 perform public.record_bnk_action_signature('substitute_teaching',v_lesson.id,'assign',p_method,p_signature_id);
 select * into v_old from public.substitute_day_assignments where leave_request_id=p_leave_request_id and leave_date=p_leave_date for update;
 if v_old.id is not null and v_old.status<>'cancelled' and v_old.substitute_teacher_id=p_teacher_id then
  return v_old; -- idempotent: no extra notices or history
 end if;
 -- One explicit signature choice is validated above against the first real lesson.
 -- Materialize that same verified action on EACH actual lesson before the
 -- central per-row signed-action trigger evaluates the batch UPDATE.
 -- This is one RPC transaction (not a second teacher signature action).
 insert into public.bnk_action_signatures(
   system_code,document_id,action_code,actor_user_id,
   method,signature_id,bucket_id,storage_path,selected_at
 )
 select chosen.system_code,lesson.id,chosen.action_code,chosen.actor_user_id,
   chosen.method,chosen.signature_id,chosen.bucket_id,chosen.storage_path,chosen.selected_at
 from public.substitute_lessons lesson
 cross join public.bnk_action_signatures chosen
 where lesson.leave_request_id=p_leave_request_id
   and lesson.leave_date=p_leave_date
   and lesson.status<>'cancelled'
   and chosen.system_code='substitute_teaching'
   and chosen.action_code='assign'
   and chosen.document_id=v_lesson.id
   and chosen.actor_user_id=auth.uid()
   and chosen.method in ('paper','stored','drawn','upload')
 on conflict(system_code,document_id,action_code,actor_user_id)
 do update set method=excluded.method,signature_id=excluded.signature_id,
   bucket_id=excluded.bucket_id,storage_path=excluded.storage_path,
   selected_at=excluded.selected_at;
 insert into public.substitute_day_assignments(
   leave_request_id,leave_date,academic_year,semester,absent_teacher_id,substitute_teacher_id,
   substitute_teacher_name,assigned_by,assigned_by_name,assigned_at,status,note
 ) values(p_leave_request_id,p_leave_date,v_leave.academic_year,v_leave.semester,v_leave.requester_id,p_teacher_id,
   coalesce(v_teacher.full_name,v_teacher.email,'ครูผู้สอน'),auth.uid(),coalesce(v_actor.full_name,v_actor.email,'ผู้จัดสอนแทน'),
   now(),'assigned',nullif(btrim(coalesce(p_note,'')),''))
 on conflict(leave_request_id,leave_date) do update set
  substitute_teacher_id=excluded.substitute_teacher_id,
  substitute_teacher_name=excluded.substitute_teacher_name,assigned_by=excluded.assigned_by,
  assigned_by_name=excluded.assigned_by_name,assigned_at=now(),status='assigned',
  accepted_by=null,accepted_at=null,signature_method=null,signature_id=null,signed_at=null,
  note=excluded.note,updated_at=now()
 returning * into v_row;
 delete from public.substitute_day_periods where day_assignment_id=v_row.id;
 insert into public.substitute_day_periods(day_assignment_id,period_no,start_time,end_time,class_label,subject_name,status)
 select v_row.id,s.period_no,s.start_time,s.end_time,s.class_label,s.subject_name,'assigned'
 from private.substitute_day_slots(p_leave_request_id,p_leave_date) s;
 -- The legacy per-period RPCs are fenced off while an all-day batch is active.
 perform set_config('bnk.substitute_day_batch',v_row.id::text,true);
 -- Actual subject periods retain their real timetable metadata. No fake subject is created.
 update public.substitute_lessons sl set
  substitute_teacher_id=p_teacher_id,substitute_teacher_name=v_row.substitute_teacher_name,
  assigned_by=auth.uid(),assigned_by_name=v_row.assigned_by_name,assigned_at=now(),
  status='assigned',note='จัดสอนแทนทั้งวัน',updated_at=now()
 where sl.leave_request_id=p_leave_request_id and sl.leave_date=p_leave_date and sl.status<>'cancelled';
 delete from public.school_document_signatures sig where sig.document_kind='substitute' and sig.document_id=p_leave_request_id
  and sig.document_date=p_leave_date and
    (sig.slot_code='substitute_day:'||v_row.id::text
      or sig.slot_code in(select 'substitute:'||sl.id::text from public.substitute_lessons sl
         where sl.leave_request_id=p_leave_request_id and sl.leave_date=p_leave_date));
 insert into public.substitute_day_audit(day_assignment_id,actor_id,action,previous_teacher_id,new_teacher_id,note)
 values(v_row.id,auth.uid(),case when v_old.id is null or v_old.status='cancelled' then 'assign' else 'reassign' end,
   v_old.substitute_teacher_id,p_teacher_id,p_note);
 if v_old.id is not null and v_old.status<>'cancelled' and v_old.substitute_teacher_id<>p_teacher_id then
  insert into public.notifications(recipient_id,type,title,message,entity_type,entity_id,action_url)
  values(v_old.substitute_teacher_id,'substitute_reassigned','เปลี่ยนครูสอนแทนทั้งวัน',
  'งานสอนแทนทั้งวันวันที่ '||to_char(p_leave_date,'DD/MM/YYYY')||' ถูกมอบหมายให้ครูท่านอื่น',
  'substitute_batch',p_leave_request_id,'/academic/substitute-teaching');
 end if;
 insert into public.notifications(recipient_id,type,title,message,entity_type,entity_id,action_url)
 values(p_teacher_id,'substitute_assigned','ได้รับมอบหมายสอนแทนทั้งวัน',
 'วันที่ '||to_char(p_leave_date,'DD/MM/YYYY')||' ครบ '||v_period_count::text||' คาบ แทน '||v_leave.requester_name,
 'substitute_batch',p_leave_request_id,'/academic/substitute-teaching');
 return v_row;
end;
$fn$;


revoke all on function public.get_substitute_day_candidates(uuid,date) from public,anon;
revoke all on function public.assign_substitute_day_signed(uuid,date,uuid,text,uuid,text) from public,anon;
grant execute on function public.get_substitute_day_candidates(uuid,date) to authenticated;
grant execute on function public.assign_substitute_day_signed(uuid,date,uuid,text,uuid,text) to authenticated;

revoke all on function public.assign_substitute_day_signed(uuid,date,uuid,text,uuid,text) from public,anon;
grant execute on function public.assign_substitute_day_signed(uuid,date,uuid,text,uuid,text) to authenticated;
