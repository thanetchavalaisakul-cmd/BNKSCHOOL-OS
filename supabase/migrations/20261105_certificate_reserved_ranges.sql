-- BNK SCHOOL OS / 2026-11-05
-- Atomic, year-scoped certificate-number reservations. This migration DOES NOT
-- create any certificate records or reserve any certificate numbers.
-- Year 2569 is locked until the original historic ledger has been verified/imported.

alter table public.academic_certificate_template_sessions
  add column if not exists reserved_count integer,
  add column if not exists reservation_kind text not null default 'legacy';

alter table public.academic_certificate_template_sessions
  drop constraint if exists academic_certificate_template_reserved_count_valid;
alter table public.academic_certificate_template_sessions
  add constraint academic_certificate_template_reserved_count_valid
  check (
    (reservation_kind = 'legacy' and reserved_count is null)
    or (reservation_kind = 'allocated' and reserved_count between 1 and 500)
  );

create table if not exists public.academic_certificate_series_counters (
  academic_year integer primary key check (academic_year between 2500 and 2700),
  next_serial integer not null check (next_serial between 1 and 1000000),
  updated_at timestamptz not null default now()
);
alter table public.academic_certificate_series_counters enable row level security;
revoke all on public.academic_certificate_series_counters from public, anon, authenticated;

create table if not exists public.academic_certificate_year_controls (
  academic_year integer primary key check (academic_year between 2500 and 2700),
  reservation_enabled boolean not null default false,
  reason text not null default '',
  updated_at timestamptz not null default now()
);
alter table public.academic_certificate_year_controls enable row level security;
revoke all on public.academic_certificate_year_controls from public, anon, authenticated;

-- Existing 2569 certificates have not yet been imported as of 2026-11-05.
-- Never silently restart the numbering at 1/2569. Release ONLY after
-- comparing imported data to the original source and checking duplicates/gaps.
insert into public.academic_certificate_year_controls
  (academic_year, reservation_enabled, reason)
values
  (2569, false, 'รอตรวจและนำเข้าทะเบียนคุมเกียรติบัตรเดิมปี 2569 ก่อนเปิดจองเลข')
on conflict (academic_year) do nothing;

-- Seed from real historical registry rows and prior *allocated* sessions only.
-- Legacy unconsumed template requests are not reservations.
with used_numbers as (
  select academic_year, max(serial_no)+1 as next_serial
  from public.academic_certificate_registry group by academic_year
  union all
  select academic_year, max(next_serial+reserved_count) as next_serial
  from public.academic_certificate_template_sessions
  where reservation_kind='allocated' group by academic_year
)
insert into public.academic_certificate_series_counters(academic_year,next_serial)
select academic_year,max(next_serial) from used_numbers group by academic_year
on conflict(academic_year) do update
set next_serial=greatest(public.academic_certificate_series_counters.next_serial,excluded.next_serial),
    updated_at=now();

create or replace function public.reserve_academic_certificate_template(
  p_year integer, p_quantity integer
) returns jsonb
language plpgsql security definer set search_path=''
as $fn$
declare
  v_next integer;
  v_end integer;
  v_historic integer;
  v_allocated integer;
  v_token uuid;
  v_lock_reason text;
begin
  if not private.is_active_user() then
    raise exception 'NOT_ACTIVE_USER' using errcode='42501';
  end if;
  if p_year is null or p_year not between 2500 and 2700 then
    raise exception 'INVALID_ACADEMIC_YEAR' using errcode='22023';
  end if;
  if p_quantity is null or p_quantity not between 1 and 500 then
    raise exception 'INVALID_RESERVATION_QUANTITY' using errcode='22023';
  end if;

  -- Every writer touching one academic year takes the same transaction lock.
  perform pg_catalog.pg_advisory_xact_lock(84179,p_year);
  select reason into v_lock_reason
  from public.academic_certificate_year_controls
  where academic_year=p_year and reservation_enabled=false;
  if found then
    raise exception 'HISTORICAL_IMPORT_REQUIRED: %',v_lock_reason using errcode='22023';
  end if;

  select coalesce(max(serial_no),0)+1 into v_historic
    from public.academic_certificate_registry where academic_year=p_year;
  select coalesce(max(next_serial+reserved_count),1) into v_allocated
    from public.academic_certificate_template_sessions
    where academic_year=p_year and reservation_kind='allocated';

  insert into public.academic_certificate_series_counters(academic_year,next_serial)
    values (p_year,greatest(v_historic,v_allocated))
    on conflict(academic_year) do nothing;
  select greatest(next_serial,v_historic,v_allocated) into v_next
    from public.academic_certificate_series_counters
    where academic_year=p_year for update;

  v_end:=v_next+p_quantity-1;
  if v_end>999999 then
    raise exception 'CERTIFICATE_NUMBER_LIMIT_REACHED' using errcode='22023';
  end if;

  update public.academic_certificate_series_counters
    set next_serial=v_end+1,updated_at=now() where academic_year=p_year;

  insert into public.academic_certificate_template_sessions
    (academic_year,next_serial,reserved_count,reservation_kind,issued_by)
  values
    (p_year,v_next,p_quantity,'allocated',auth.uid())
  returning token into v_token;

  return pg_catalog.jsonb_build_object(
    'token',v_token,'academic_year',p_year,'next_serial',v_next,
    'last_serial',v_end,'reserved_count',p_quantity,
    'next_available',v_end+1
  );
end
$fn$;

-- Fail closed for cached old versions instead of silently consuming 200
-- numbers that cannot subsequently be imported through the new flow.
create or replace function public.issue_academic_certificate_template(p_year integer)
returns jsonb language plpgsql security definer set search_path=''
as $fn$
begin
  if not private.is_active_user() then
    raise exception 'NOT_ACTIVE_USER' using errcode='42501';
  end if;
  raise exception 'CERTIFICATE_APP_UPDATE_REQUIRED' using errcode='22023';
end
$fn$;

create or replace function public.import_academic_certificate_template(
  p_token uuid,p_rows jsonb
) returns jsonb
language plpgsql security definer set search_path=''
as $fn$
declare
  v_template public.academic_certificate_template_sessions%rowtype;
  v_row jsonb;
  v_num_text text;
  v_num integer;
  v_expected integer;
  v_name text;
  v_grade text;
  v_activity text;
  v_note text;
  v_count integer:=0;
begin
  if not private.is_active_user() then
    raise exception 'NOT_ACTIVE_USER' using errcode='42501';
  end if;
  if p_token is null then
    raise exception 'DOWNLOAD_TEMPLATE_FIRST' using errcode='22023';
  end if;
  select * into v_template from public.academic_certificate_template_sessions
  where token=p_token and issued_by=auth.uid() and consumed_at is null
  for update;
  if not found then
    raise exception 'TEMPLATE_INVALID_OR_USED' using errcode='22023';
  end if;
  if v_template.reservation_kind<>'allocated' or v_template.reserved_count is null then
    raise exception 'LEGACY_TEMPLATE_MUST_REDOWNLOAD' using errcode='22023';
  end if;
  if v_template.issued_at < now()-interval '7 days' then
    raise exception 'TEMPLATE_EXPIRED' using errcode='22023';
  end if;
  if p_rows is null or pg_catalog.jsonb_typeof(p_rows)<>'array' then
    raise exception 'INVALID_BATCH_SIZE' using errcode='22023';
  end if;
  if pg_catalog.jsonb_array_length(p_rows)<>v_template.reserved_count then
    raise exception 'RESERVED_QUANTITY_MISMATCH expected % got %',
      v_template.reserved_count, pg_catalog.jsonb_array_length(p_rows)
      using errcode='22023';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(84179,v_template.academic_year);
  v_expected:=v_template.next_serial;
  for v_row in select value from pg_catalog.jsonb_array_elements(p_rows) loop
    if pg_catalog.jsonb_typeof(v_row)<>'object' then
      raise exception 'INVALID_ROW' using errcode='22023';
    end if;
    v_num_text:=v_row->>'serial_no';
    if v_num_text is null or v_num_text !~ '^[0-9]{1,6}$' then
      raise exception 'INVALID_CERTIFICATE_NUMBER' using errcode='22023';
    end if;
    v_num:=v_num_text::integer;
    if v_num<>v_expected then
      raise exception 'NUMBER_SEQUENCE_INVALID expected % got %',v_expected,v_num
        using errcode='22023';
    end if;
    v_name:=pg_catalog.btrim(coalesce(v_row->>'recipient_name',''));
    v_grade:=pg_catalog.btrim(coalesce(v_row->>'grade_level',''));
    v_activity:=pg_catalog.btrim(coalesce(v_row->>'activity',''));
    v_note:=pg_catalog.btrim(coalesce(v_row->>'note',''));
    if length(v_name) not between 1 and 500
      or length(v_grade) not between 1 and 300
      or length(v_activity) not between 1 and 500
      or length(v_note)>1000 then
      raise exception 'CERTIFICATE_FIELD_REQUIRED_OR_TOO_LONG' using errcode='22023';
    end if;
    insert into public.academic_certificate_registry
      (academic_year,serial_no,recipient_name,grade_level,activity,note,created_by)
    values
      (v_template.academic_year,v_num,v_name,v_grade,v_activity,v_note,auth.uid());
    v_count:=v_count+1;
    v_expected:=v_expected+1;
  end loop;
  update public.academic_certificate_template_sessions
    set consumed_at=now() where token=p_token;

  return pg_catalog.jsonb_build_object(
    'saved',v_count,'academic_year',v_template.academic_year,
    'last_serial',v_expected-1,'next_serial',v_expected
  );
end
$fn$;

create or replace function public.get_academic_certificate_reservation_stats(p_year integer)
returns jsonb language plpgsql security definer set search_path=''
as $fn$
declare
  v_next integer;
  v_last_recorded integer;
  v_pending integer;
  v_enabled boolean;
  v_reason text;
begin
  if not private.is_active_user() then
    raise exception 'NOT_ACTIVE_USER' using errcode='42501';
  end if;
  if p_year is null or p_year not between 2500 and 2700 then
    raise exception 'INVALID_ACADEMIC_YEAR' using errcode='22023';
  end if;
  select coalesce(max(serial_no),0) into v_last_recorded
    from public.academic_certificate_registry where academic_year=p_year;
  select greatest(
    coalesce((select next_serial from public.academic_certificate_series_counters
      where academic_year=p_year),1),
    coalesce((select max(next_serial+reserved_count)
      from public.academic_certificate_template_sessions
      where academic_year=p_year and reservation_kind='allocated'),1),
    v_last_recorded+1
  ) into v_next;
  select count(*) into v_pending from public.academic_certificate_template_sessions
    where academic_year=p_year and reservation_kind='allocated' and consumed_at is null;
  select reservation_enabled,reason into v_enabled,v_reason
    from public.academic_certificate_year_controls where academic_year=p_year;
  return pg_catalog.jsonb_build_object(
    'academic_year',p_year,'last_recorded',v_last_recorded,
    'next_available',v_next,'unsubmitted_reservations',v_pending,
    'reservation_enabled',coalesce(v_enabled,true),
    'reservation_reason',coalesce(v_reason,'')
  );
end
$fn$;

create or replace function public.get_academic_certificate_my_reservations(p_year integer)
returns jsonb language plpgsql security definer set search_path=''
as $fn$
declare v_result jsonb;
begin
  if not private.is_active_user() then
    raise exception 'NOT_ACTIVE_USER' using errcode='42501';
  end if;
  if p_year is null or p_year not between 2500 and 2700 then
    raise exception 'INVALID_ACADEMIC_YEAR' using errcode='22023';
  end if;
  select coalesce(pg_catalog.jsonb_agg(pg_catalog.to_jsonb(q)
    order by q.issued_at desc),'[]'::jsonb)
  into v_result
  from (
    select token,next_serial,reserved_count,academic_year,issued_at,
      next_serial+reserved_count-1 as last_serial
    from public.academic_certificate_template_sessions
    where academic_year=p_year and issued_by=auth.uid()
      and reservation_kind='allocated'
      and consumed_at is null and issued_at >= now()-interval '7 days'
    order by issued_at desc
    limit 20
  ) as q;
  return v_result;
end
$fn$;

revoke all on function public.reserve_academic_certificate_template(integer,integer)
  from public,anon,authenticated;
revoke all on function public.issue_academic_certificate_template(integer)
  from public,anon,authenticated;
revoke all on function public.import_academic_certificate_template(uuid,jsonb)
  from public,anon,authenticated;
revoke all on function public.get_academic_certificate_reservation_stats(integer)
  from public,anon,authenticated;
revoke all on function public.get_academic_certificate_my_reservations(integer)
  from public,anon,authenticated;

grant execute on function public.reserve_academic_certificate_template(integer,integer)
  to authenticated;
grant execute on function public.issue_academic_certificate_template(integer)
  to authenticated;
grant execute on function public.import_academic_certificate_template(uuid,jsonb)
  to authenticated;
grant execute on function public.get_academic_certificate_reservation_stats(integer)
  to authenticated;
grant execute on function public.get_academic_certificate_my_reservations(integer)
  to authenticated;
