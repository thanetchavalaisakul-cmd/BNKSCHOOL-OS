-- BNK SCHOOL OS: Payment Evidence Documents
-- Additive module under Planning & Budget. This migration is intentionally non-destructive.

create table if not exists public.payment_evidence_permissions (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  is_active boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.payment_evidence_documents (
  id uuid primary key default gen_random_uuid(),
  academic_year text not null,
  semester integer not null check (semester in (1, 2)),
  class_id uuid not null references public.school_classes(id) on delete restrict,
  class_label_snapshot text not null,
  stage_code_snapshot text not null,
  level_name_snapshot text not null,
  document_type text not null check (document_type in (
    'learning_equipment',
    'student_uniform',
    'basic_learning_support',
    'additional_uniform'
  )),
  selection_mode text not null default 'all' check (selection_mode in ('all', 'selected')),
  student_count integer not null default 0 check (student_count >= 0),
  total_amount numeric(12,2) not null default 0 check (total_amount >= 0),
  status text not null default 'draft' check (status in (
    'draft', 'submitted', 'returned', 'paid', 'completed', 'cancelled'
  )),
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_by_name text not null,
  updated_by uuid references public.profiles(id) on delete set null,
  return_note text,
  notes text,
  submitted_at timestamptz,
  paid_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.payment_evidence_items (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.payment_evidence_documents(id) on delete cascade,
  student_id uuid references public.students(id) on delete set null,
  enrollment_id uuid references public.student_enrollments(id) on delete set null,
  student_snapshot jsonb not null default '{}'::jsonb,
  amount numeric(12,2) not null default 0 check (amount >= 0),
  received_date date,
  note text,
  row_order integer not null default 1 check (row_order > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (document_id, student_id)
);

create table if not exists public.payment_evidence_signers (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.payment_evidence_documents(id) on delete cascade,
  slot_code text not null check (slot_code in ('teacher', 'finance', 'director')),
  signer_user_id uuid not null references public.profiles(id) on delete restrict,
  signer_name text not null,
  signer_position text not null,
  method text not null check (method in ('stored', 'drawn', 'upload', 'paper')),
  signature_id uuid references public.signatures(id) on delete set null,
  bucket_id text,
  storage_path text,
  signed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (document_id, slot_code),
  check (
    (method = 'paper' and signature_id is null and storage_path is null)
    or (method <> 'paper' and signature_id is not null and storage_path is not null)
  )
);

create table if not exists public.payment_evidence_audit (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.payment_evidence_documents(id) on delete cascade,
  actor_user_id uuid references public.profiles(id) on delete set null,
  actor_name text not null default 'ผู้ใช้งาน',
  action text not null,
  from_status text,
  to_status text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists payment_evidence_documents_period_idx
  on public.payment_evidence_documents (academic_year, semester, created_at desc);
create index if not exists payment_evidence_documents_class_status_idx
  on public.payment_evidence_documents (class_id, status, created_at desc);
create index if not exists payment_evidence_items_document_order_idx
  on public.payment_evidence_items (document_id, row_order);
create index if not exists payment_evidence_signers_document_idx
  on public.payment_evidence_signers (document_id, slot_code);
create index if not exists payment_evidence_audit_document_idx
  on public.payment_evidence_audit (document_id, created_at desc);
create index if not exists payment_evidence_permissions_active_idx
  on public.payment_evidence_permissions (is_active, user_id);

alter table public.payment_evidence_permissions enable row level security;
alter table public.payment_evidence_documents enable row level security;
alter table public.payment_evidence_items enable row level security;
alter table public.payment_evidence_signers enable row level security;
alter table public.payment_evidence_audit enable row level security;

create or replace function private.is_payment_evidence_finance()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_active_user()
     and exists (
       select 1
       from public.payment_evidence_permissions p
       where p.user_id = auth.uid()
         and p.is_active = true
     );
$$;

create or replace function private.can_access_payment_evidence_class(p_class_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_active_user()
     and (
       private.is_super_admin()
       or private.is_payment_evidence_finance()
       or private.current_role() in ('director', 'acting_director')
       or private.is_homeroom_teacher_for_class(auth.uid(), p_class_id)
     );
$$;

create or replace function private.can_view_payment_evidence_document(p_document_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_active_user()
     and exists (
       select 1
       from public.payment_evidence_documents d
       where d.id = p_document_id
         and (
           private.is_super_admin()
           or private.is_payment_evidence_finance()
           or private.current_role() in ('director', 'acting_director')
           or d.created_by = auth.uid()
           or private.is_homeroom_teacher_for_class(auth.uid(), d.class_id)
         )
     );
$$;

create or replace function private.can_edit_payment_evidence_document(p_document_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_active_user()
     and exists (
       select 1
       from public.payment_evidence_documents d
       where d.id = p_document_id
         and (
           private.is_super_admin()
           or (
             private.is_payment_evidence_finance()
             and d.status in ('draft', 'submitted', 'returned')
           )
           or (
             d.created_by = auth.uid()
             and d.status in ('draft', 'returned')
             and private.is_homeroom_teacher_for_class(auth.uid(), d.class_id)
           )
         )
     );
$$;

create or replace function private.can_sign_payment_evidence_document(p_document_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_active_user()
     and private.current_role() in ('director', 'acting_director')
     and exists (
       select 1
       from public.payment_evidence_documents d
       where d.id = p_document_id
         and d.status = 'paid'
     );
$$;

revoke all on function private.is_payment_evidence_finance() from public, anon;
revoke all on function private.can_access_payment_evidence_class(uuid) from public, anon;
revoke all on function private.can_view_payment_evidence_document(uuid) from public, anon;
revoke all on function private.can_edit_payment_evidence_document(uuid) from public, anon;
revoke all on function private.can_sign_payment_evidence_document(uuid) from public, anon;
grant usage on schema private to authenticated;
grant execute on function private.is_payment_evidence_finance() to authenticated;
grant execute on function private.can_access_payment_evidence_class(uuid) to authenticated;
grant execute on function private.can_view_payment_evidence_document(uuid) to authenticated;
grant execute on function private.can_edit_payment_evidence_document(uuid) to authenticated;
grant execute on function private.can_sign_payment_evidence_document(uuid) to authenticated;

drop policy if exists payment_evidence_permissions_select on public.payment_evidence_permissions;
create policy payment_evidence_permissions_select
  on public.payment_evidence_permissions
  for select to authenticated
  using (user_id = auth.uid() or private.is_super_admin());

drop policy if exists payment_evidence_permissions_insert on public.payment_evidence_permissions;
create policy payment_evidence_permissions_insert
  on public.payment_evidence_permissions
  for insert to authenticated
  with check (private.is_super_admin());

drop policy if exists payment_evidence_permissions_update on public.payment_evidence_permissions;
create policy payment_evidence_permissions_update
  on public.payment_evidence_permissions
  for update to authenticated
  using (private.is_super_admin())
  with check (private.is_super_admin());

drop policy if exists payment_evidence_documents_select on public.payment_evidence_documents;
create policy payment_evidence_documents_select
  on public.payment_evidence_documents
  for select to authenticated
  using (private.can_view_payment_evidence_document(id));

drop policy if exists payment_evidence_items_select on public.payment_evidence_items;
create policy payment_evidence_items_select
  on public.payment_evidence_items
  for select to authenticated
  using (private.can_view_payment_evidence_document(document_id));

drop policy if exists payment_evidence_signers_select on public.payment_evidence_signers;
create policy payment_evidence_signers_select
  on public.payment_evidence_signers
  for select to authenticated
  using (private.can_view_payment_evidence_document(document_id));

drop policy if exists payment_evidence_audit_select on public.payment_evidence_audit;
create policy payment_evidence_audit_select
  on public.payment_evidence_audit
  for select to authenticated
  using (private.can_view_payment_evidence_document(document_id));

grant select, insert, update on public.payment_evidence_permissions to authenticated;
grant select on public.payment_evidence_documents to authenticated;
grant select on public.payment_evidence_items to authenticated;
grant select on public.payment_evidence_signers to authenticated;
grant select on public.payment_evidence_audit to authenticated;

create or replace function private.set_payment_evidence_updated_at()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists payment_evidence_permissions_updated_at on public.payment_evidence_permissions;
create trigger payment_evidence_permissions_updated_at
before update on public.payment_evidence_permissions
for each row execute function private.set_payment_evidence_updated_at();

drop trigger if exists payment_evidence_documents_updated_at on public.payment_evidence_documents;
create trigger payment_evidence_documents_updated_at
before update on public.payment_evidence_documents
for each row execute function private.set_payment_evidence_updated_at();

drop trigger if exists payment_evidence_items_updated_at on public.payment_evidence_items;
create trigger payment_evidence_items_updated_at
before update on public.payment_evidence_items
for each row execute function private.set_payment_evidence_updated_at();

drop trigger if exists payment_evidence_signers_updated_at on public.payment_evidence_signers;
create trigger payment_evidence_signers_updated_at
before update on public.payment_evidence_signers
for each row execute function private.set_payment_evidence_updated_at();

create or replace function private.audit_payment_evidence_document()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_name text;
  v_action text;
  v_from_status text;
  v_to_status text;
begin
  select coalesce(nullif(pr.full_name, ''), nullif(pd.full_name, ''), 'ผู้ใช้งาน')
    into v_actor_name
  from public.profiles pr
  left join public.personnel_public_directory pd on pd.user_id = pr.id
  where pr.id = auth.uid();

  v_actor_name := coalesce(v_actor_name, 'ผู้ใช้งาน');

  if tg_op = 'INSERT' then
    v_action := 'created';
    v_from_status := null;
    v_to_status := new.status;
  else
    v_from_status := old.status;
    v_to_status := new.status;
    if new.status is distinct from old.status then
      v_action := 'status_changed';
    else
      v_action := 'updated';
    end if;
  end if;

  insert into public.payment_evidence_audit (
    document_id, actor_user_id, actor_name, action, from_status, to_status, details
  ) values (
    new.id,
    auth.uid(),
    v_actor_name,
    v_action,
    v_from_status,
    v_to_status,
    jsonb_build_object(
      'document_type', new.document_type,
      'selection_mode', new.selection_mode,
      'student_count', new.student_count,
      'total_amount', new.total_amount,
      'return_note', new.return_note
    )
  );

  return new;
end;
$$;

drop trigger if exists payment_evidence_document_audit on public.payment_evidence_documents;
create trigger payment_evidence_document_audit
after insert or update on public.payment_evidence_documents
for each row execute function private.audit_payment_evidence_document();

create or replace function private.guard_payment_evidence_status_transition()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_action_code text;
  v_signature_exists boolean;
begin
  if new.status is not distinct from old.status then
    return new;
  end if;

  if new.status = 'submitted' then
    v_action_code := 'teacher_submit';
    if old.status not in ('draft', 'returned')
       or not exists (
         select 1 from public.bnk_action_signatures s
         where s.system_code = 'payment_evidence'
           and s.document_id = old.id
           and s.action_code = v_action_code
           and s.actor_user_id = auth.uid()
       ) then
      raise exception 'ต้องลงนามยืนยันโดยครูประจำชั้นก่อนส่งเอกสาร';
    end if;
  elsif new.status = 'paid' then
    v_action_code := 'finance_pay';
    if old.status <> 'submitted'
       or not (private.is_payment_evidence_finance() or private.is_super_admin())
       or not exists (
         select 1 from public.bnk_action_signatures s
         where s.system_code = 'payment_evidence'
           and s.document_id = old.id
           and s.action_code = v_action_code
           and s.actor_user_id = auth.uid()
       ) then
      raise exception 'ต้องเป็นเจ้าหน้าที่การเงินและลงนามก่อนยืนยันการจ่ายเงิน';
    end if;
  elsif new.status = 'completed' then
    v_action_code := 'director_sign';
    if old.status <> 'paid'
       or private.current_role() not in ('director', 'acting_director')
       or not exists (
         select 1 from public.bnk_action_signatures s
         where s.system_code = 'payment_evidence'
           and s.document_id = old.id
           and s.action_code = v_action_code
           and s.actor_user_id = auth.uid()
       ) then
      raise exception 'ต้องลงนามโดยผู้อำนวยการก่อนปิดเอกสาร';
    end if;
  elsif new.status = 'returned' then
    if old.status <> 'submitted'
       or not (private.is_payment_evidence_finance() or private.is_super_admin())
       or length(btrim(coalesce(new.return_note, ''))) < 3 then
      raise exception 'การส่งกลับต้องเป็นเจ้าหน้าที่การเงินและระบุเหตุผล';
    end if;
  elsif new.status = 'cancelled' then
    if not private.is_super_admin() then
      raise exception 'เฉพาะผู้ดูแลระบบเท่านั้นที่ยกเลิกเอกสารได้';
    end if;
  else
    raise exception 'ไม่อนุญาตให้เปลี่ยนสถานะเอกสารเป็น %', new.status;
  end if;

  return new;
end;
$$;

drop trigger if exists payment_evidence_status_guard on public.payment_evidence_documents;
create trigger payment_evidence_status_guard
before update of status on public.payment_evidence_documents
for each row execute function private.guard_payment_evidence_status_transition();

create or replace function public.payment_evidence_roster(
  p_academic_year text,
  p_semester integer,
  p_class_id uuid
)
returns table (
  student_id uuid,
  enrollment_id uuid,
  student_code text,
  citizen_id text,
  prefix text,
  first_name text,
  last_name text,
  student_number integer,
  stage_code text,
  level_name text,
  room_name text,
  class_label text,
  enrollment_status text,
  exit_reason text,
  source_semester integer,
  roster_status text,
  transfer_request_status text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
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
      r.status
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
      when tr.status in ('approved', 'completed', 'processed') then 'transferred_out'
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
$$;

create or replace function public.payment_evidence_save_document(
  p_document_id uuid,
  p_academic_year text,
  p_semester integer,
  p_class_id uuid,
  p_document_type text,
  p_selection_mode text,
  p_items jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_document_id uuid;
  v_class record;
  v_existing_document record;
  v_item record;
  v_existing_item record;
  v_roster record;
  v_snapshot jsonb;
  v_enrollment_id uuid;
  v_keep_ids uuid[] := array[]::uuid[];
  v_roster_ids uuid[];
  v_student_count integer := 0;
  v_total_amount numeric(12,2) := 0;
  v_actor_name text;
  v_index integer := 0;
begin
  if not private.is_active_user() then
    raise exception 'กรุณาเข้าสู่ระบบก่อนบันทึกเอกสาร';
  end if;
  if p_academic_year is null or p_semester not in (1, 2) then
    raise exception 'ปีการศึกษาหรือภาคเรียนไม่ถูกต้อง';
  end if;
  if p_document_type is null or p_document_type not in (
    'learning_equipment', 'student_uniform', 'basic_learning_support', 'additional_uniform'
  ) then
    raise exception 'ประเภทเงินไม่ถูกต้อง';
  end if;
  if p_selection_mode is null or p_selection_mode not in ('all', 'selected') then
    raise exception 'รูปแบบการเลือกรายชื่อไม่ถูกต้อง';
  end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array'
     or jsonb_array_length(p_items) < 1
     or jsonb_array_length(p_items) > 500 then
    raise exception 'ต้องเลือกรายชื่อนักเรียนอย่างน้อย 1 คนและไม่เกิน 500 คน';
  end if;

  if p_document_id is null then
    if not (private.is_super_admin() or private.is_homeroom_teacher_for_class(auth.uid(), p_class_id)) then
      raise exception 'เฉพาะครูประจำชั้นของห้องหรือผู้ดูแลระบบเท่านั้นที่สร้างเอกสารได้';
    end if;

    select c.*
      into v_class
    from public.school_classes c
    where c.id = p_class_id
      and c.academic_year = p_academic_year
      and c.semester = p_semester
      and c.is_active = true;

    if not found then
      raise exception 'ไม่พบห้องเรียนที่เลือก';
    end if;

    select coalesce(nullif(pr.full_name, ''), nullif(pd.full_name, ''), 'ผู้จัดทำ')
      into v_actor_name
    from public.profiles pr
    left join public.personnel_public_directory pd on pd.user_id = pr.id
    where pr.id = auth.uid();

    insert into public.payment_evidence_documents (
      academic_year, semester, class_id, class_label_snapshot,
      stage_code_snapshot, level_name_snapshot, document_type, selection_mode,
      created_by, created_by_name, updated_by
    ) values (
      p_academic_year, p_semester, p_class_id,
      v_class.level_name || '/' || v_class.room_name,
      v_class.stage_code, v_class.level_name, p_document_type, p_selection_mode,
      auth.uid(), coalesce(v_actor_name, 'ผู้จัดทำ'), auth.uid()
    )
    returning id into v_document_id;
  else
    if not private.can_edit_payment_evidence_document(p_document_id) then
      raise exception 'ไม่มีสิทธิ์แก้ไขเอกสารนี้หรือเอกสารอยู่ในสถานะล็อก';
    end if;

    select d.*
      into v_existing_document
    from public.payment_evidence_documents d
    where d.id = p_document_id
    for update;

    if not found then
      raise exception 'ไม่พบเอกสารที่ต้องการแก้ไข';
    end if;
    if v_existing_document.academic_year <> p_academic_year
       or v_existing_document.semester <> p_semester
       or v_existing_document.class_id <> p_class_id then
      raise exception 'ไม่อนุญาตให้เปลี่ยนห้องเรียนหรือภาคเรียนของเอกสารเดิม';
    end if;

    v_document_id := p_document_id;
    update public.payment_evidence_documents
    set document_type = p_document_type,
        selection_mode = p_selection_mode,
        updated_by = auth.uid(),
        updated_at = now()
    where id = v_document_id;
  end if;

  select array_agg(r.student_id)
    into v_roster_ids
  from public.payment_evidence_roster(p_academic_year, p_semester, p_class_id) r;

  for v_item in
    select *
    from jsonb_to_recordset(p_items) as x(
      student_id uuid,
      amount numeric,
      received_date date,
      note text,
      row_order integer
    )
  loop
    v_index := v_index + 1;

    if v_item.student_id is null then
      raise exception 'พบรายการที่ไม่มีรหัสนักเรียน';
    end if;
    if v_item.amount is not null and v_item.amount < 0 then
      raise exception 'จำนวนเงินต้องไม่ติดลบ';
    end if;
    if v_item.row_order is not null and v_item.row_order < 1 then
      raise exception 'ลำดับรายชื่อต้องเริ่มจาก 1';
    end if;
    if length(coalesce(v_item.note, '')) > 500 then
      raise exception 'หมายเหตุยาวเกิน 500 ตัวอักษร';
    end if;
    if v_item.student_id = any(v_keep_ids) then
      raise exception 'มีรายชื่อนักเรียนซ้ำในเอกสาร';
    end if;

    select i.*
      into v_existing_item
    from public.payment_evidence_items i
    where i.document_id = v_document_id
      and i.student_id = v_item.student_id;

    if found then
      v_snapshot := v_existing_item.student_snapshot;
      v_enrollment_id := v_existing_item.enrollment_id;
    else
      select r.*
        into v_roster
      from public.payment_evidence_roster(p_academic_year, p_semester, p_class_id) r
      where r.student_id = v_item.student_id;

      if not found then
        raise exception 'รายชื่อนักเรียนบางคนไม่ได้อยู่ในบัญชีรายชื่อของห้องนี้';
      end if;

      v_enrollment_id := v_roster.enrollment_id;
      v_snapshot := jsonb_build_object(
        'student_id', v_roster.student_id,
        'student_code', v_roster.student_code,
        'citizen_id', v_roster.citizen_id,
        'prefix', v_roster.prefix,
        'first_name', v_roster.first_name,
        'last_name', v_roster.last_name,
        'full_name', concat_ws(' ', nullif(v_roster.prefix, ''), nullif(v_roster.first_name, ''), nullif(v_roster.last_name, '')),
        'student_number', v_roster.student_number,
        'class_label', v_roster.class_label,
        'stage_code', v_roster.stage_code,
        'level_name', v_roster.level_name,
        'roster_status', v_roster.roster_status,
        'transfer_request_status', v_roster.transfer_request_status,
        'source_semester', v_roster.source_semester
      );
    end if;

    insert into public.payment_evidence_items (
      document_id, student_id, enrollment_id, student_snapshot,
      amount, received_date, note, row_order
    ) values (
      v_document_id, v_item.student_id, v_enrollment_id, v_snapshot,
      coalesce(v_item.amount, 0), v_item.received_date,
      nullif(btrim(coalesce(v_item.note, '')), ''),
      coalesce(v_item.row_order, v_index)
    )
    on conflict (document_id, student_id) do update
      set amount = excluded.amount,
          received_date = excluded.received_date,
          note = excluded.note,
          row_order = excluded.row_order,
          updated_at = now();

    v_keep_ids := array_append(v_keep_ids, v_item.student_id);
  end loop;

  if p_selection_mode = 'all'
     and exists (
       select 1
       from unnest(coalesce(v_roster_ids, array[]::uuid[])) as r(student_id)
       where not (r.student_id = any(v_keep_ids))
     ) then
    raise exception 'ชุดที่ 1 ต้องเลือกรายชื่อนักเรียนทุกคนในห้อง รวมถึงรายชื่อที่ยังไม่อัปเดต';
  end if;

  delete from public.payment_evidence_items i
  where i.document_id = v_document_id
    and i.student_id is not null
    and not (i.student_id = any(v_keep_ids));

  select count(*)::integer, coalesce(sum(i.amount), 0)::numeric(12,2)
    into v_student_count, v_total_amount
  from public.payment_evidence_items i
  where i.document_id = v_document_id;

  update public.payment_evidence_documents
  set student_count = v_student_count,
      total_amount = v_total_amount,
      updated_by = auth.uid(),
      updated_at = now()
  where id = v_document_id;

  select coalesce(nullif(pr.full_name, ''), nullif(pd.full_name, ''), 'ผู้ใช้งาน')
    into v_actor_name
  from public.profiles pr
  left join public.personnel_public_directory pd on pd.user_id = pr.id
  where pr.id = auth.uid();

  insert into public.payment_evidence_audit (
    document_id, actor_user_id, actor_name, action, details
  ) values (
    v_document_id,
    auth.uid(),
    coalesce(v_actor_name, 'ผู้ใช้งาน'),
    'items_saved',
    jsonb_build_object('student_count', v_student_count, 'total_amount', v_total_amount)
  );

  return v_document_id;
end;
$$;

create or replace function public.payment_evidence_sign_document(
  p_document_id uuid,
  p_slot_code text,
  p_method text,
  p_signature_id uuid default null
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_document public.payment_evidence_documents%rowtype;
  v_action_code text;
  v_next_status text;
  v_signature record;
  v_bucket_id text;
  v_storage_path text;
  v_signer_name text;
  v_signer_position text;
  v_role text;
begin
  if not private.is_active_user() then
    raise exception 'กรุณาเข้าสู่ระบบก่อนลงนาม';
  end if;

  select d.*
    into v_document
  from public.payment_evidence_documents d
  where d.id = p_document_id
  for update;

  if not found then
    raise exception 'ไม่พบเอกสารที่ต้องการลงนาม';
  end if;

  v_role := private.current_role();

  if p_slot_code = 'teacher' then
    v_action_code := 'teacher_submit';
    v_next_status := 'submitted';
    if v_document.status not in ('draft', 'returned')
       or not (
         private.is_super_admin()
         or (
           v_document.created_by = auth.uid()
           and private.is_homeroom_teacher_for_class(auth.uid(), v_document.class_id)
         )
       ) then
      raise exception 'เฉพาะครูประจำชั้นผู้จัดทำเท่านั้นที่ยืนยันเอกสารได้';
    end if;
  elsif p_slot_code = 'finance' then
    v_action_code := 'finance_pay';
    v_next_status := 'paid';
    if v_document.status <> 'submitted'
       or not (private.is_payment_evidence_finance() or private.is_super_admin()) then
      raise exception 'เฉพาะเจ้าหน้าที่การเงินเท่านั้นที่ยืนยันการจ่ายเงินได้';
    end if;
  elsif p_slot_code = 'director' then
    v_action_code := 'director_sign';
    v_next_status := 'completed';
    if v_document.status <> 'paid'
       or v_role not in ('director', 'acting_director') then
      raise exception 'เฉพาะผู้อำนวยการหรือผู้รักษาการเท่านั้นที่ลงนามปิดเอกสารได้';
    end if;
  else
    raise exception 'ตำแหน่งผู้ลงนามไม่ถูกต้อง';
  end if;

  if p_method not in ('stored', 'drawn', 'upload', 'paper') then
    raise exception 'วิธีลงนามไม่ถูกต้อง';
  end if;

  if p_method = 'paper' then
    if p_signature_id is not null then
      raise exception 'การลงนามบนกระดาษไม่ต้องระบุไฟล์ลายเซ็น';
    end if;
    v_bucket_id := null;
    v_storage_path := null;
  else
    if p_signature_id is null then
      raise exception 'กรุณาเลือกลายเซ็นที่ต้องการใช้';
    end if;

    select s.*
      into v_signature
    from public.signatures s
    where s.id = p_signature_id
      and s.user_id = auth.uid();

    if not found then
      raise exception 'ไม่พบลายเซ็นของบัญชีผู้ใช้นี้';
    end if;

    if not exists (
      select 1
      from storage.objects o
      where o.bucket_id = v_signature.bucket_id
        and o.name = v_signature.storage_path
    ) then
      raise exception 'ไม่พบไฟล์ลายเซ็นในพื้นที่จัดเก็บ';
    end if;

    v_bucket_id := v_signature.bucket_id;
    v_storage_path := v_signature.storage_path;
  end if;

  insert into public.bnk_action_signatures (
    system_code, document_id, action_code, actor_user_id,
    method, signature_id, bucket_id, storage_path, selected_at
  ) values (
    'payment_evidence', p_document_id, v_action_code, auth.uid(),
    p_method, p_signature_id, v_bucket_id, v_storage_path, now()
  )
  on conflict (system_code, document_id, action_code, actor_user_id)
  do update set
    method = excluded.method,
    signature_id = excluded.signature_id,
    bucket_id = excluded.bucket_id,
    storage_path = excluded.storage_path,
    selected_at = excluded.selected_at;

  select
    coalesce(nullif(pd.full_name, ''), nullif(pr.full_name, ''), 'ผู้ลงนาม'),
    pd.position_title
    into v_signer_name, v_signer_position
  from public.profiles pr
  left join public.personnel_public_directory pd on pd.user_id = pr.id
  where pr.id = auth.uid();

  v_signer_name := coalesce(v_signer_name, 'ผู้ลงนาม');
  v_signer_position := case
    when p_slot_code = 'teacher' then 'ครูประจำชั้น'
    when p_slot_code = 'finance' then 'เจ้าหน้าที่การเงิน'
    else 'ผู้อำนวยการโรงเรียนบ้านหนองเขียว'
  end;

  insert into public.payment_evidence_signers (
    document_id, slot_code, signer_user_id, signer_name, signer_position,
    method, signature_id, bucket_id, storage_path, signed_at
  ) values (
    p_document_id, p_slot_code, auth.uid(), v_signer_name, v_signer_position,
    p_method, p_signature_id, v_bucket_id, v_storage_path, now()
  )
  on conflict (document_id, slot_code)
  do update set
    signer_user_id = excluded.signer_user_id,
    signer_name = excluded.signer_name,
    signer_position = excluded.signer_position,
    method = excluded.method,
    signature_id = excluded.signature_id,
    bucket_id = excluded.bucket_id,
    storage_path = excluded.storage_path,
    signed_at = excluded.signed_at,
    updated_at = now();

  update public.payment_evidence_documents
  set status = v_next_status,
      submitted_at = case when p_slot_code = 'teacher' then now() else submitted_at end,
      paid_at = case when p_slot_code = 'finance' then now() else paid_at end,
      completed_at = case when p_slot_code = 'director' then now() else completed_at end,
      return_note = case when p_slot_code = 'teacher' then null else return_note end,
      updated_by = auth.uid(),
      updated_at = now()
  where id = p_document_id;

  return v_next_status;
end;
$$;

create or replace function public.payment_evidence_return_document(
  p_document_id uuid,
  p_note text
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_document public.payment_evidence_documents%rowtype;
begin
  if not private.is_active_user()
     or not (private.is_payment_evidence_finance() or private.is_super_admin()) then
    raise exception 'เฉพาะเจ้าหน้าที่การเงินเท่านั้นที่ส่งเอกสารกลับได้';
  end if;
  if length(btrim(coalesce(p_note, ''))) < 3 then
    raise exception 'กรุณาระบุเหตุผลที่ส่งกลับอย่างน้อย 3 ตัวอักษร';
  end if;

  select d.*
    into v_document
  from public.payment_evidence_documents d
  where d.id = p_document_id
  for update;

  if not found or v_document.status <> 'submitted' then
    raise exception 'เอกสารนี้ไม่ได้อยู่ในสถานะรอตรวจสอบ';
  end if;

  update public.payment_evidence_documents
  set status = 'returned',
      return_note = btrim(p_note),
      updated_by = auth.uid(),
      updated_at = now()
  where id = p_document_id;

  return 'returned';
end;
$$;

revoke all on function public.payment_evidence_roster(text, integer, uuid) from public, anon;
revoke all on function public.payment_evidence_save_document(uuid, text, integer, uuid, text, text, jsonb) from public, anon;
revoke all on function public.payment_evidence_sign_document(uuid, text, text, uuid) from public, anon;
revoke all on function public.payment_evidence_return_document(uuid, text) from public, anon;
grant execute on function public.payment_evidence_roster(text, integer, uuid) to authenticated;
grant execute on function public.payment_evidence_save_document(uuid, text, integer, uuid, text, text, jsonb) to authenticated;
grant execute on function public.payment_evidence_sign_document(uuid, text, text, uuid) to authenticated;
grant execute on function public.payment_evidence_return_document(uuid, text) to authenticated;

insert into public.approval_system_registry (
  system_code, system_name_th, module_code, routing_mode, routing_locked,
  supports_auto_sign, supports_auto_approve, executive_kinds, slot_order,
  is_active, scope_mode, supports_shared_ownership, supports_dual_submission
)
values (
  'payment_evidence',
  'หลักฐานการจ่ายเงิน',
  'payment_evidence_documents',
  'sequential',
  true,
  false,
  false,
  '["director", "acting_director"]'::jsonb,
  '["teacher", "finance", "director"]'::jsonb,
  true,
  'personal',
  false,
  false
)
on conflict (system_code) do nothing;

insert into public.signature_compliance_registry (system_code, verification_notes)
values (
  'payment_evidence',
  'รอทดสอบการลงนามทั้ง 4 วิธีและตรวจสอบ PDF ก่อนเปิดใช้งานจริง'
)
on conflict (system_code) do nothing;

insert into public.modules (
  department_id, code, name_th, name_en, route, sort_order, is_active
)
select
  d.id,
  'payment_evidence_documents',
  'ระบบหลักฐานการจ่ายเงิน',
  'Payment Evidence Documents',
  '/plan-budget/payment-evidence',
  22,
  true
from public.departments d
where d.code = 'plan_budget'
  and not exists (
    select 1 from public.modules m where m.code = 'payment_evidence_documents'
  );
