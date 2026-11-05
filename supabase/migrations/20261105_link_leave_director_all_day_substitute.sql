-- Inherit the exact director approval signature from an approved leave into the
-- existing single-teacher-all-day substitute document. Never approve a leave here.
-- The per-period document flow is intentionally unchanged.
create or replace function public.link_leave_director_signature_to_substitute_day(p_day_assignment_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_day public.substitute_day_assignments%rowtype;
  v_leave public.leave_requests%rowtype;
  v_source public.school_document_signatures%rowtype;
  v_signer uuid;
  v_method text;
  v_signature uuid;
  v_signed_at timestamptz;
  v_name text;
  v_rows integer:=0;
begin
  if not (select private.is_active_user()) then
    raise exception 'Authentication required' using errcode='42501';
  end if;
  select * into v_day from public.substitute_day_assignments
    where id=p_day_assignment_id;
  if v_day.id is null or v_day.status='cancelled' then
    raise exception 'Active whole-day assignment not found';
  end if;
  if not exists(
    select 1 from public.substitute_lessons sl
    where sl.leave_request_id=v_day.leave_request_id
      and sl.leave_date=v_day.leave_date and sl.status<>'cancelled'
      and private.can_view_substitute_lesson(sl.id)
  ) then
    raise exception 'Not authorized to view substitute document' using errcode='42501';
  end if;
  select * into v_leave from public.leave_requests where id=v_day.leave_request_id;
  if v_leave.id is null or v_leave.status<>'approved'
    or v_leave.director_reviewed_at is null then
    return jsonb_build_object('linked',false,'reason','leave_not_approved');
  end if;

  -- The signature slot on the approved leave takes precedence over defaults.
  -- A paper slot must stay blank even if a separate stored signature exists.
  select * into v_source from public.school_document_signatures
  where document_kind='leave' and document_id=v_leave.id
    and document_date=date '1900-01-01' and slot_code='director';
  if v_source.id is not null then
    v_signer:=v_source.signer_user_id;
    v_method:=v_source.method;
    v_signature:=v_source.signature_id;
    v_signed_at:=v_source.signed_at;
  elsif v_leave.director_signature_id is not null then
    v_signer:=coalesce(v_leave.director_reviewer_id,
      (select s.user_id from public.signatures s where s.id=v_leave.director_signature_id));
    v_method:='stored';
    v_signature:=v_leave.director_signature_id;
    v_signed_at:=v_leave.director_reviewed_at;
  else
    return jsonb_build_object('linked',false,'reason','approved_without_signature');
  end if;

  if v_signer is null then
    return jsonb_build_object('linked',false,'reason','signer_missing');
  end if;
  if v_method='paper' then
    v_signature:=null;
    v_signed_at:=null;
  elsif v_signature is null or v_signed_at is null then
    return jsonb_build_object('linked',false,'reason','signature_incomplete');
  end if;

  -- This is an inherited snapshot, not a second director approval/signing.
  insert into public.school_document_signatures(
    document_kind,document_id,document_date,slot_code,
    signer_user_id,method,signature_id,signed_at,automatic
  ) values(
    'substitute',v_day.leave_request_id,v_day.leave_date,'director',
    v_signer,v_method,v_signature,v_signed_at,true
  )
  on conflict(document_kind,document_id,document_date,slot_code)
  do update set
    signer_user_id=excluded.signer_user_id,
    method=excluded.method,
    signature_id=excluded.signature_id,
    signed_at=excluded.signed_at,
    automatic=true,
    updated_at=now()
  where (
    public.school_document_signatures.signer_user_id,
    public.school_document_signatures.method,
    public.school_document_signatures.signature_id,
    public.school_document_signatures.signed_at,
    public.school_document_signatures.automatic
  ) is distinct from (
    excluded.signer_user_id,excluded.method,excluded.signature_id,
    excluded.signed_at,true
  );
  get diagnostics v_rows=row_count;
  select coalesce(nullif(p.full_name,''),p.email)
   into v_name from public.profiles p where p.id=v_signer;
  return jsonb_build_object(
    'linked',true,'method',v_method,'signer_name',v_name,
    'changed',v_rows>0
  );
end;
$function$;

revoke all on function public.link_leave_director_signature_to_substitute_day(uuid) from public, anon;
grant execute on function public.link_leave_director_signature_to_substitute_day(uuid) to authenticated;

-- Existing all-day documents: fix missing director slots from their actual
-- already-approved leave (do not create any new approval or touch per-period docs).
insert into public.school_document_signatures(
  document_kind,document_id,document_date,slot_code,
  signer_user_id,method,signature_id,signed_at,automatic
)
select
  'substitute',d.leave_request_id,d.leave_date,'director',
  s.signer_user_id,s.method,s.signature_id,s.signed_at,true
from public.substitute_day_assignments d
join public.leave_requests l on l.id=d.leave_request_id
join public.school_document_signatures s on
  s.document_kind='leave' and s.document_id=l.id
  and s.document_date=date '1900-01-01' and s.slot_code='director'
where d.status<>'cancelled' and l.status='approved'
  and l.director_reviewed_at is not null
on conflict(document_kind,document_id,document_date,slot_code) do update set
  signer_user_id=excluded.signer_user_id,
  method=excluded.method,
  signature_id=excluded.signature_id,
  signed_at=excluded.signed_at,
  automatic=true,
  updated_at=now()
where (
  public.school_document_signatures.signer_user_id,
  public.school_document_signatures.method,
  public.school_document_signatures.signature_id,
  public.school_document_signatures.signed_at,
  public.school_document_signatures.automatic
) is distinct from (
  excluded.signer_user_id,excluded.method,excluded.signature_id,
  excluded.signed_at,true
);
