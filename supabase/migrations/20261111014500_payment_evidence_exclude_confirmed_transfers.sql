-- Exclude confirmed transfer-outs from new payment-evidence roster selections.
-- Existing document items are preserved by payment_evidence_save_document through
-- their stored snapshots, so historical receipts remain intact.
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
  -- Confirmed transfer-outs are not candidates for new current-period documents.
  -- Existing document items are preserved separately through their stored snapshots.
  where s.status is distinct from 'transferred_out'
    and c.enrollment_status is distinct from 'transferred_out'
    and tr.roster_processed_at is null
  order by c.student_number, s.first_name, s.last_name;
end;
$function$


COMMENT ON FUNCTION public.payment_evidence_roster(text, integer, uuid)
IS 'Returns current payment-evidence candidates, excluding confirmed transfer-outs while preserving pending and ghost records.';
