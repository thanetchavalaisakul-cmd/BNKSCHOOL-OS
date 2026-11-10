-- BNK School OS: names printed on payment evidence forms (wet ink signatures only).
-- Do not grant financial workflow permissions when selecting a printed payer.
create table if not exists public.payment_evidence_print_settings (
  id smallint primary key default 1 check (id = 1),
  finance_user_id uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);

alter table public.payment_evidence_print_settings enable row level security;
drop policy if exists payment_evidence_print_settings_read on public.payment_evidence_print_settings;
create policy payment_evidence_print_settings_read
  on public.payment_evidence_print_settings
  for select to authenticated
  using (private.is_active_user());

-- Setting changes occur only via the privileged, role-checked RPC below.
revoke all on public.payment_evidence_print_settings from public, anon, authenticated;
grant select on public.payment_evidence_print_settings to authenticated;

insert into public.payment_evidence_print_settings (id)
values (1)
on conflict (id) do nothing;

create or replace function public.payment_evidence_set_print_finance(p_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or not private.is_active_user() or not private.is_super_admin() then
    raise exception 'เฉพาะแอดมินหลักเท่านั้นที่กำหนดชื่อเจ้าหน้าที่การเงินในเอกสารได้';
  end if;

  if p_user_id is not null and not exists (
    select 1
    from public.profiles p
    where p.id = p_user_id
      and p.account_status = 'active'
      and p.deleted_at is null
  ) then
    raise exception 'ไม่พบบุคลากรที่ใช้งานได้ กรุณาเลือกชื่อใหม่';
  end if;

  insert into public.payment_evidence_print_settings
    (id, finance_user_id, updated_by, updated_at)
  values (1, p_user_id, auth.uid(), now())
  on conflict (id) do update
  set finance_user_id = excluded.finance_user_id,
      updated_by = excluded.updated_by,
      updated_at = excluded.updated_at;

  return true;
end;
$$;

-- Only names and positions are returned; central signature files are never exposed.
-- Resolve the official director from the existing certificate/registration settings.
create or replace function public.payment_evidence_print_signer_names(p_document_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_document public.payment_evidence_documents%rowtype;
  v_finance text;
  v_teacher text;
  v_director text;
begin
  if auth.uid() is null or not private.is_active_user()
     or not private.can_view_payment_evidence_document(p_document_id) then
    raise exception 'ไม่มีสิทธิ์ดูชื่อผู้ลงนามในเอกสารนี้';
  end if;

  select d.* into v_document
  from public.payment_evidence_documents d
  where d.id = p_document_id;

  if not found then
    raise exception 'ไม่พบเอกสารหลักฐานการจ่ายเงิน';
  end if;

  select coalesce(nullif(btrim(pd.full_name), ''), nullif(btrim(p.full_name), ''))
    into v_finance
  from public.payment_evidence_print_settings s
  join public.profiles p on p.id = s.finance_user_id
    and p.account_status = 'active' and p.deleted_at is null
  left join public.personnel_public_directory pd on pd.user_id = p.id
  where s.id = 1;

  -- If several teachers share a class, prefer the document creator when assigned.
  select coalesce(nullif(btrim(pd.full_name), ''), nullif(btrim(p.full_name), ''))
    into v_teacher
  from public.homeroom_teachers h
  join public.profiles p on p.id = h.teacher_id
    and p.account_status = 'active' and p.deleted_at is null
  left join public.personnel_public_directory pd on pd.user_id = p.id
  where h.class_id = v_document.class_id
  order by (h.teacher_id = v_document.created_by) desc, h.created_at asc, h.id asc
  limit 1;

  select coalesce(nullif(btrim(pd.full_name), ''), nullif(btrim(p.full_name), ''))
    into v_director
  from public.profiles p
  left join public.personnel_public_directory pd on pd.user_id = p.id
  where p.id = coalesce(
      (select c.director_user_id from public.academic_certificate_settings c where c.id = 1),
      (select r.director_user_id from public.academic_registration_settings r where r.id = 1)
    )
    and p.account_status = 'active'
    and p.deleted_at is null
  limit 1;

  return jsonb_build_object(
    'finance', coalesce(v_finance, ''),
    'teacher', coalesce(v_teacher, ''),
    'director', coalesce(v_director, '')
  );
end;
$$;

revoke all on function public.payment_evidence_set_print_finance(uuid) from public, anon;
revoke all on function public.payment_evidence_print_signer_names(uuid) from public, anon;
grant execute on function public.payment_evidence_set_print_finance(uuid) to authenticated;
grant execute on function public.payment_evidence_print_signer_names(uuid) to authenticated;
