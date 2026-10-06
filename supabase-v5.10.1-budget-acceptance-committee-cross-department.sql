-- BNK School OS v5.10.1
-- Budget acceptance committee: allow inspectors from any department.
-- Keeps requester conflict guard, duplicate guard, PA-only account exclusion,
-- and snapshots the selected staff member's department at assignment time.

begin;

alter table public.budget_disbursement_signers
  add column if not exists signer_department_code text,
  add column if not exists signer_department_name text;

create or replace function public.set_budget_signer_assignments(
  p_disbursement_id uuid,
  p_assignments jsonb
)
returns void
language plpgsql
security definer
set search_path=''
as $$
declare
  v_b public.budget_disbursements;
  v_p public.school_projects;
  v_slot text;
  v_user_text text;
  v_user_id uuid;
  v_dir public.personnel_public_directory;
  v_old_user uuid;
  v_target text;
  v_inspector_count integer;
  v_inspector_distinct integer;
  v_department_name text;
begin
  if auth.uid() is null or not private.is_active_user() then raise exception 'Authentication required'; end if;
  select * into v_b from public.budget_disbursements where id=p_disbursement_id;
  if v_b.id is null then raise exception 'Budget request not found'; end if;
  if v_b.requester_id<>auth.uid() and not private.is_super_admin() then raise exception 'Only requester or Super Admin can select document signers'; end if;
  select * into v_p from public.school_projects where id=v_b.project_id;
  v_target:=coalesce((select activity_no||' '||activity_name from public.project_activities where id=v_b.activity_id),v_p.project_no||' '||v_p.project_name);

  for v_slot,v_user_text in select key,value #>> '{}' from jsonb_each(p_assignments) loop
    if v_slot not in ('department_head','plan_budget','director','inspector1','inspector2','inspector3') then raise exception 'Invalid signer slot %',v_slot; end if;
    if v_user_text is null or btrim(v_user_text)='' then
      delete from public.budget_disbursement_signers where disbursement_id=v_b.id and slot=v_slot;
      continue;
    end if;
    begin v_user_id:=v_user_text::uuid; exception when others then raise exception 'Invalid signer user'; end;
    select * into v_dir from public.personnel_public_directory where user_id=v_user_id;
    if v_dir.user_id is null then raise exception 'Selected signer is not an active staff member'; end if;
    if v_dir.role='pa_evaluator' then raise exception 'Dedicated PA evaluator accounts cannot be selected for budget documents'; end if;
    if v_slot='department_head' and not (v_dir.role='department_head' and v_dir.department_code=v_b.department_code) then raise exception 'Department Head must belong to the same department as the budget request'; end if;
    if v_slot='plan_budget' and not (v_dir.role='department_head' and v_dir.department_code='plan_budget') then raise exception 'Plan and Budget signer must be Plan and Budget Head'; end if;
    if v_slot='director' and v_dir.role not in ('director','super_admin') then raise exception 'Director signer must be Director or Super Admin'; end if;
    if v_slot like 'inspector%' and v_dir.user_id=v_b.requester_id then raise exception 'Requester cannot be an acceptance committee member for their own request'; end if;

    select name_th into v_department_name from public.departments where code=v_dir.department_code limit 1;
    v_department_name:=coalesce(v_department_name,v_dir.department_code);
    select user_id into v_old_user from public.budget_disbursement_signers where disbursement_id=v_b.id and slot=v_slot;

    insert into public.budget_disbursement_signers(
      disbursement_id,slot,user_id,signer_name,signer_position,
      signer_department_code,signer_department_name,
      method,signature_id,bucket_id,storage_path,
      assigned_by,assigned_at,signed_at,updated_at
    ) values(
      v_b.id,v_slot,v_dir.user_id,v_dir.full_name,
      case when v_slot='department_head' then 'หัวหน้ากลุ่มงาน'||coalesce((select name_th from public.departments where code=v_b.department_code),'')
           when v_slot='plan_budget' then 'หัวหน้ากลุ่มงานบริหารแผนและงบประมาณ'
           when v_slot='director' then 'ผู้อำนวยการโรงเรียน'
           when v_slot like 'inspector%' then coalesce(v_dir.position_title,'กรรมการตรวจรับ')
           else coalesce(v_dir.position_title,'ผู้ลงนาม') end,
      v_dir.department_code,v_department_name,
      'paper',null,null,null,auth.uid(),now(),null,now()
    )
    on conflict(disbursement_id,slot) do update set
      user_id=excluded.user_id,
      signer_name=excluded.signer_name,
      signer_position=excluded.signer_position,
      signer_department_code=excluded.signer_department_code,
      signer_department_name=excluded.signer_department_name,
      method=case when public.budget_disbursement_signers.user_id is distinct from excluded.user_id then 'paper' else public.budget_disbursement_signers.method end,
      signature_id=case when public.budget_disbursement_signers.user_id is distinct from excluded.user_id then null else public.budget_disbursement_signers.signature_id end,
      bucket_id=case when public.budget_disbursement_signers.user_id is distinct from excluded.user_id then null else public.budget_disbursement_signers.bucket_id end,
      storage_path=case when public.budget_disbursement_signers.user_id is distinct from excluded.user_id then null else public.budget_disbursement_signers.storage_path end,
      signed_at=case when public.budget_disbursement_signers.user_id is distinct from excluded.user_id then null else public.budget_disbursement_signers.signed_at end,
      assigned_by=auth.uid(),assigned_at=now(),updated_at=now();

    if v_slot like 'inspector%' and v_old_user is distinct from v_user_id then
      insert into public.notifications(recipient_id,type,title,message,entity_type,entity_id,action_url)
      values(v_user_id,'budget_acceptance_committee','ได้รับเลือกเป็นคณะกรรมการตรวจรับ',
        v_b.requester_name||' ขอเบิก '||v_target||' เลขคุม '||coalesce(v_b.control_number,'-')||' จำนวน '||to_char(v_b.amount,'FM999G999G990D00')||' บาท และเลือกคุณเป็นคณะกรรมการตรวจรับ',
        'budget_disbursement',v_b.id,'/plan-budget/projects');
    end if;
  end loop;

  select count(*),count(distinct user_id) into v_inspector_count,v_inspector_distinct
  from public.budget_disbursement_signers
  where disbursement_id=v_b.id and slot in ('inspector1','inspector2','inspector3') and user_id is not null;
  if v_inspector_count<>v_inspector_distinct then raise exception 'Acceptance committee members must be different people'; end if;
  if exists(
    select 1 from public.budget_disbursement_signers s
    where s.disbursement_id=v_b.id and s.slot in ('inspector1','inspector2','inspector3') and s.user_id=v_b.requester_id
  ) then raise exception 'Requester cannot be an acceptance committee member for their own request'; end if;
end;
$$;

revoke all on function public.set_budget_signer_assignments(uuid,jsonb) from public,anon;
grant execute on function public.set_budget_signer_assignments(uuid,jsonb) to authenticated,service_role;

comment on column public.budget_disbursement_signers.signer_department_code is 'Department code snapshot at assignment time; inspectors may be from any department.';
comment on column public.budget_disbursement_signers.signer_department_name is 'Department name snapshot at assignment time for document/audit display.';

notify pgrst,'reload schema';
commit;
