
-- BNK SCHOOL OS: opt-in, person-bound document signatures for leave and substitute teaching.
-- All new signatures are explicit acts of their authenticated owners. No approval rights are changed.
create table if not exists public.workflow_document_signatures (
  id uuid primary key default gen_random_uuid(),
  system_code text not null check (system_code in ('leave_management','substitute_teaching')),
  document_id uuid not null,
  scope_key text not null default 'all',
  slot_code text not null,
  signer_user_id uuid not null references public.profiles(id),
  signature_id uuid references public.signatures(id) on delete restrict,
  method text not null default 'paper' check (method in ('paper','stored','drawn','upload')),
  bucket_id text,
  storage_path text,
  signed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint workflow_document_signature_method_chk check(
    (method='paper' and signature_id is null and signed_at is null and bucket_id is null and storage_path is null)
    or (method<>'paper' and signature_id is not null and signed_at is not null and bucket_id is not null and storage_path is not null)
  ),
  constraint workflow_document_signatures_unique unique(system_code,document_id,scope_key,slot_code,signer_user_id)
);
create index if not exists workflow_document_signatures_signature_idx on public.workflow_document_signatures(signature_id);
create index if not exists workflow_document_signatures_doc_idx on public.workflow_document_signatures(system_code,document_id,scope_key);

create table if not exists public.workflow_document_signature_audit (
  id bigint generated always as identity primary key,
  system_code text not null,
  document_id uuid not null,
  scope_key text not null,
  slot_code text not null,
  actor_user_id uuid not null,
  old_signature_id uuid,
  new_signature_id uuid,
  old_method text,
  new_method text not null,
  created_at timestamptz not null default now()
);

alter table public.workflow_document_signatures enable row level security;
alter table public.workflow_document_signature_audit enable row level security;
revoke all on public.workflow_document_signatures from public, anon, authenticated;
revoke all on public.workflow_document_signature_audit from public, anon, authenticated;
grant select on public.workflow_document_signatures to authenticated;

create or replace function private.can_workflow_document_sign(
  p_system_code text, p_document_id uuid, p_scope_date date, p_slot text
) returns boolean language plpgsql stable security definer set search_path='' as $f$
declare v_leave public.leave_requests; v_sub public.substitute_lessons; v_total integer; v_assigned integer;
begin
  if auth.uid() is null or not private.is_active_user() then return false; end if;
  if p_system_code='leave_management' then
    if p_scope_date is not null then return false; end if;
    select * into v_leave from public.leave_requests where id=p_document_id;
    if v_leave.id is null then return false; end if;
    if p_slot='requester' then
      return v_leave.requester_id=auth.uid() and v_leave.status in ('draft','pending_personnel','pending_director');
    elsif p_slot='personnel_head' then
      return v_leave.personnel_reviewer_id=auth.uid()
        and v_leave.personnel_reviewed_at is not null
        and v_leave.status in ('pending_director','approved')
        and private.is_personnel_head();
    elsif p_slot='director' then
      return v_leave.director_reviewer_id=auth.uid() and v_leave.status='approved'
        and private.is_director_approval_executive(auth.uid());
    end if;
    return false;
  elsif p_system_code='substitute_teaching' then
    if p_slot='substitute_teacher' then
      if p_scope_date is not null then return false; end if;
      select * into v_sub from public.substitute_lessons where id=p_document_id;
      return v_sub.id is not null and v_sub.status='assigned' and v_sub.substitute_teacher_id=auth.uid()
        and exists(select 1 from public.leave_requests l where l.id=v_sub.leave_request_id and l.status in ('pending_personnel','pending_director','approved'));
    end if;
    if p_scope_date is null then return false; end if;
    select * into v_leave from public.leave_requests where id=p_document_id;
    if v_leave.id is null or v_leave.status not in ('pending_personnel','pending_director','approved') then return false; end if;
    select count(*), count(*) filter(where sl.status='assigned')
      into v_total,v_assigned from public.substitute_lessons sl
      where sl.leave_request_id=p_document_id and sl.leave_date=p_scope_date and sl.status<>'cancelled';
    if v_total=0 or v_total<>v_assigned then return false; end if;
    if p_slot='absent_teacher' then return v_leave.requester_id=auth.uid(); end if;
    if p_slot='academic_head' then return private.is_academic_head(); end if;
    if p_slot='stage_head' then
      return exists(select 1 from public.substitute_lessons sl
        join public.stage_heads sh on sh.stage_code=sl.stage_code and sh.academic_year=sl.academic_year::text
        where sl.leave_request_id=p_document_id and sl.leave_date=p_scope_date
          and sl.status='assigned' and sh.teacher_id=auth.uid());
    end if;
    if p_slot='director' then
      return v_leave.status='approved' and private.is_director_approval_executive(auth.uid());
    end if;
    return false;
  end if;
  return false;
end $f$;

create or replace function private.can_view_workflow_document_signature(
  p_system_code text, p_document_id uuid, p_scope_key text, p_slot text
) returns boolean language plpgsql stable security definer set search_path='' as $f$
begin
  if not private.is_active_user() then return false; end if;
  if p_system_code='leave_management' then
    return p_scope_key='all' and private.can_view_leave_request(p_document_id);
  elsif p_system_code='substitute_teaching' then
    if p_slot='substitute_teacher' and p_scope_key='all' then
      return private.can_view_substitute_lesson(p_document_id);
    elsif p_scope_key<>'all' then
      return exists(select 1 from public.substitute_lessons sl
        where sl.leave_request_id=p_document_id
          and sl.leave_date::text=p_scope_key
          and private.can_view_substitute_lesson(sl.id));
    end if;
  end if;
  return false;
end $f$;

create policy workflow_document_signatures_read_authorized
 on public.workflow_document_signatures for select to authenticated
 using (private.can_view_workflow_document_signature(system_code,document_id,scope_key,slot_code));

create or replace function public.get_workflow_signature_options(
  p_system_code text, p_document_id uuid, p_scope_date date default null
) returns table(slot_code text,label text,method text)
 language sql stable security definer set search_path='' as $f$
  select v.slot_code,v.label,
    coalesce((select s.method from public.workflow_document_signatures s
      where s.system_code=p_system_code and s.document_id=p_document_id
        and s.scope_key=coalesce(p_scope_date::text,'all')
        and s.slot_code=v.slot_code and s.signer_user_id=auth.uid()),'paper')::text
  from (values
    ('leave_management','requester','ผู้ลา'),
    ('leave_management','personnel_head','หัวหน้ากลุ่มงานบริหารงานบุคคล'),
    ('leave_management','director','ผู้อำนวยการ'),
    ('substitute_teaching','absent_teacher','ผู้ยื่นคำขอลา / ผู้จัดสอนแทน'),
    ('substitute_teaching','academic_head','หัวหน้ากลุ่มงานบริหารงานวิชาการ'),
    ('substitute_teaching','stage_head','หัวหน้าช่วงชั้น'),
    ('substitute_teaching','director','ผู้อำนวยการ'),
    ('substitute_teaching','substitute_teacher','ครูผู้สอนแทน')
  ) as v(system_code,slot_code,label)
  where v.system_code=p_system_code
    and private.can_workflow_document_sign(p_system_code,p_document_id,p_scope_date,v.slot_code);
$f$;

create or replace function public.set_workflow_document_signature(
  p_system_code text, p_document_id uuid, p_scope_date date, p_slot text,
  p_method text, p_signature_id uuid default null
) returns void language plpgsql security definer set search_path='' as $f$
declare v_sig public.signatures; v_old public.workflow_document_signatures; v_scope text;
begin
  if not private.can_workflow_document_sign(p_system_code,p_document_id,p_scope_date,p_slot)
  then raise exception 'You are not authorized to sign this document and role' using errcode='42501'; end if;
  if p_method not in ('paper','stored','drawn','upload') then
    raise exception 'Invalid signing method';
  end if;
  v_scope:=coalesce(p_scope_date::text,'all');
  if p_method<>'paper' then
    if p_signature_id is null then raise exception 'Please choose your own signature'; end if;
    select * into v_sig from public.signatures where id=p_signature_id and user_id=auth.uid();
    if v_sig.id is null or v_sig.bucket_id<>'signatures' or v_sig.storage_path is null then
      raise exception 'Selected signature does not belong to this account';
    end if;
    if p_method='drawn' and v_sig.source<>'drawn' then raise exception 'Drawn signature required'; end if;
    if p_method='upload' and v_sig.source<>'upload' then raise exception 'Uploaded signature required'; end if;
  else
    if p_signature_id is not null then raise exception 'Paper signature cannot attach a digital image'; end if;
  end if;
  select * into v_old from public.workflow_document_signatures
    where system_code=p_system_code and document_id=p_document_id
      and scope_key=v_scope and slot_code=p_slot and signer_user_id=auth.uid() for update;

  insert into public.workflow_document_signatures(
    system_code,document_id,scope_key,slot_code,signer_user_id,
    signature_id,method,bucket_id,storage_path,signed_at,updated_at
  ) values (
    p_system_code,p_document_id,v_scope,p_slot,auth.uid(),
    case when p_method='paper' then null else v_sig.id end,p_method,
    case when p_method='paper' then null else v_sig.bucket_id end,
    case when p_method='paper' then null else v_sig.storage_path end,
    case when p_method='paper' then null else now() end,now()
  ) on conflict (system_code,document_id,scope_key,slot_code,signer_user_id)
  do update set signature_id=excluded.signature_id,method=excluded.method,
    bucket_id=excluded.bucket_id,storage_path=excluded.storage_path,
    signed_at=excluded.signed_at,updated_at=now();

  insert into public.workflow_document_signature_audit(
    system_code,document_id,scope_key,slot_code,actor_user_id,
    old_signature_id,new_signature_id,old_method,new_method
  ) values(p_system_code,p_document_id,v_scope,p_slot,auth.uid(),
    v_old.signature_id,case when p_method='paper' then null else v_sig.id end,
    v_old.method,p_method);
end $f$;

create or replace function private.can_view_workflow_signature_storage(p_path text)
 returns boolean language sql stable security definer set search_path='' as $f$
  select private.is_active_user() and exists(
    select 1 from public.workflow_document_signatures w
    where w.bucket_id='signatures' and w.storage_path=p_path and w.signature_id is not null
      and private.can_view_workflow_document_signature(w.system_code,w.document_id,w.scope_key,w.slot_code)
  );
$f$;

create policy workflow_document_signed_assets_read on storage.objects
  for select to authenticated using (
    bucket_id='signatures' and private.can_view_workflow_signature_storage(name)
  );

-- Keep signed assets immutable under existing delete rules until their document reference is cleared.
create or replace function private.signature_in_use(p_signature_id uuid)
 returns boolean language sql stable security definer set search_path='' as $f$
 select exists(select 1 from public.workflow_actions wa where wa.signature_id=p_signature_id)
 or exists(select 1 from public.home_visit_signatures hs where hs.signature_id=p_signature_id)
 or exists(select 1 from public.academic_post_lesson_reports r where r.teacher_signature_id=p_signature_id or r.reviewer_signature_id=p_signature_id)
 or exists(select 1 from public.approval_auto_policies ap where ap.signature_id=p_signature_id and ap.enabled=true)
 or exists(select 1 from public.approval_document_slots ds where ds.signature_id=p_signature_id)
 or exists(select 1 from public.leave_requests lr where lr.director_signature_id=p_signature_id)
 or exists(select 1 from public.academic_post_lesson_signatures s where s.master_signature_id=p_signature_id)
 or exists(select 1 from public.academic_lesson_plan_usage_signatures s where s.master_signature_id=p_signature_id)
 or exists(select 1 from public.academic_learning_media_signatures s where s.master_signature_id=p_signature_id)
 or exists(select 1 from public.academic_classroom_research_signatures s where s.master_signature_id=p_signature_id)
 or exists(select 1 from public.academic_learner_activity_signatures s where s.master_signature_id=p_signature_id)
 or exists(select 1 from public.academic_shared_team_signatures s where s.master_signature_id=p_signature_id)
 or exists(select 1 from public.academic_transfer_request_signatures s where s.master_signature_id=p_signature_id)
 or exists(select 1 from public.academic_certificate_request_signatures s where s.master_signature_id=p_signature_id)
 or exists(select 1 from public.academic_document_service_signatures s where s.master_signature_id=p_signature_id)
 or exists(select 1 from public.official_attendance_records a where a.signature_id=p_signature_id)
 or exists(select 1 from public.student_followup_batches b where b.director_signature_id=p_signature_id)
 or exists(select 1 from public.personnel_pa_submissions s where s.teacher_signature_id_snapshot=p_signature_id)
 or exists(select 1 from public.personnel_pa_reports r where r.teacher_signature_id_snapshot=p_signature_id)
 or exists(select 1 from public.workflow_document_signatures w where w.signature_id=p_signature_id);
$f$;

revoke execute on function public.get_workflow_signature_options(text,uuid,date) from public,anon;
revoke execute on function public.set_workflow_document_signature(text,uuid,date,text,text,uuid) from public,anon;
grant execute on function public.get_workflow_signature_options(text,uuid,date) to authenticated;
grant execute on function public.set_workflow_document_signature(text,uuid,date,text,text,uuid) to authenticated;
revoke execute on function private.can_workflow_document_sign(text,uuid,date,text) from public,anon;
revoke execute on function private.can_view_workflow_document_signature(text,uuid,text,text) from public,anon;
revoke execute on function private.can_view_workflow_signature_storage(text) from public,anon;
