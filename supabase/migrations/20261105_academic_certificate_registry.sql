-- Applied to BNK School OS Supabase on 2026-11-05.
-- All students, teachers and activities use the same five-column ledger; only active users can read/import.
create table if not exists public.academic_certificate_registry (
  id uuid primary key default gen_random_uuid(),
  academic_year integer not null check (academic_year between 2500 and 2700),
  serial_no integer not null check (serial_no between 1 and 999999),
  recipient_name text not null check (length(btrim(recipient_name)) between 1 and 500),
  grade_level text not null check (length(btrim(grade_level)) between 1 and 300),
  activity text not null check (length(btrim(activity)) between 1 and 500),
  note text not null default '' check (length(note) <= 1000),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  constraint academic_certificate_registry_year_serial_key unique(academic_year,serial_no)
);
create index if not exists academic_certificate_registry_year_idx on public.academic_certificate_registry (academic_year,serial_no);
create table if not exists public.academic_certificate_template_sessions (
  token uuid primary key default gen_random_uuid(),
  academic_year integer not null check (academic_year between 2500 and 2700),
  next_serial integer not null check (next_serial between 1 and 1000000),
  issued_by uuid not null references auth.users(id),
  issued_at timestamptz not null default now(),
  consumed_at timestamptz
);
create index if not exists academic_certificate_template_sessions_user_idx on public.academic_certificate_template_sessions (issued_by,issued_at desc);
alter table public.academic_certificate_registry enable row level security;
alter table public.academic_certificate_template_sessions enable row level security;
revoke all on table public.academic_certificate_registry from anon,authenticated;
revoke all on table public.academic_certificate_template_sessions from anon,authenticated;
grant select on public.academic_certificate_registry to authenticated;
drop policy if exists academic_certificate_registry_read on public.academic_certificate_registry;
create policy academic_certificate_registry_read on public.academic_certificate_registry
  for select to authenticated using ((select private.is_active_user()));

create or replace function public.issue_academic_certificate_template(p_year integer)
returns jsonb language plpgsql security definer set search_path = ''
as $f$
declare v_next integer; v_token uuid;
begin
 if not private.is_active_user() then raise exception 'NOT_ACTIVE_USER' using errcode='42501'; end if;
 if p_year is null or p_year not between 2500 and 2700 then raise exception 'INVALID_ACADEMIC_YEAR' using errcode='22023'; end if;
 perform pg_catalog.pg_advisory_xact_lock(84179,p_year);
 select coalesce(max(serial_no),0)+1 into v_next from public.academic_certificate_registry where academic_year=p_year;
 insert into public.academic_certificate_template_sessions(academic_year,next_serial,issued_by)
 values (p_year,v_next,auth.uid()) returning token into v_token;
 return jsonb_build_object('token',v_token,'academic_year',p_year,'next_serial',v_next);
end;
$f$;

create or replace function public.import_academic_certificate_template(p_token uuid,p_rows jsonb)
returns jsonb language plpgsql security definer set search_path = ''
as $f$
declare
 v_template public.academic_certificate_template_sessions%rowtype;
 v_next integer; v_row jsonb; v_num_text text; v_num integer;
 v_name text;v_grade text;v_activity text;v_note text;v_count integer:=0;
begin
 if not private.is_active_user() then raise exception 'NOT_ACTIVE_USER' using errcode='42501'; end if;
 if p_token is null then raise exception 'DOWNLOAD_TEMPLATE_FIRST' using errcode='22023'; end if;
 select * into v_template from public.academic_certificate_template_sessions
  where token=p_token and issued_by=auth.uid() and consumed_at is null for update;
 if not found then raise exception 'TEMPLATE_INVALID_OR_USED' using errcode='22023'; end if;
 if v_template.issued_at<now()-interval '7 days' then raise exception 'TEMPLATE_EXPIRED' using errcode='22023'; end if;
 if p_rows is null or jsonb_typeof(p_rows)<>'array' or jsonb_array_length(p_rows) not between 1 and 500 then
  raise exception 'INVALID_BATCH_SIZE' using errcode='22023';end if;
 perform pg_catalog.pg_advisory_xact_lock(84179,v_template.academic_year);
 select coalesce(max(serial_no),0)+1 into v_next from public.academic_certificate_registry where academic_year=v_template.academic_year;
 if v_next<>v_template.next_serial then raise exception 'STALE_TEMPLATE' using errcode='22023'; end if;
 for v_row in select value from jsonb_array_elements(p_rows) loop
  if jsonb_typeof(v_row)<>'object' then raise exception 'INVALID_ROW' using errcode='22023'; end if;
  v_num_text:=v_row->>'serial_no';
  if v_num_text is null or v_num_text !~ '^[0-9]{1,6}$' then raise exception 'INVALID_CERTIFICATE_NUMBER' using errcode='22023'; end if;
  v_num:=v_num_text::integer;
  if v_num<>v_next then raise exception 'NUMBER_SEQUENCE_INVALID expected % got %',v_next,v_num using errcode='22023'; end if;
  v_name:=btrim(coalesce(v_row->>'recipient_name',''));v_grade:=btrim(coalesce(v_row->>'grade_level',''));
  v_activity:=btrim(coalesce(v_row->>'activity',''));v_note:=btrim(coalesce(v_row->>'note',''));
  if length(v_name) not between 1 and 500 or length(v_grade) not between 1 and 300 or
     length(v_activity) not between 1 and 500 or length(v_note)>1000 then
    raise exception 'CERTIFICATE_FIELD_REQUIRED_OR_TOO_LONG' using errcode='22023';
  end if;
  insert into public.academic_certificate_registry
    (academic_year,serial_no,recipient_name,grade_level,activity,note,created_by)
  values (v_template.academic_year,v_num,v_name,v_grade,v_activity,v_note,auth.uid());
  v_next:=v_next+1;v_count:=v_count+1;
 end loop;
 update public.academic_certificate_template_sessions set consumed_at=now() where token=p_token;
 return jsonb_build_object('saved',v_count,'academic_year',v_template.academic_year,'last_serial',v_next-1,'next_serial',v_next);
end;
$f$;
revoke all on function public.issue_academic_certificate_template(integer) from public,anon,authenticated;
revoke all on function public.import_academic_certificate_template(uuid,jsonb) from public,anon,authenticated;
grant execute on function public.issue_academic_certificate_template(integer) to authenticated;
grant execute on function public.import_academic_certificate_template(uuid,jsonb) to authenticated;

insert into public.modules(department_id,code,name_th,name_en,route,sort_order,is_active)
select d.id,'academic_certificate_registry','ระบบเลขคุมเกียรติบัตรประจำปีการศึกษา',
'Academic Certificate Number Registry','/academic/certificate-registry',12,true
from public.departments d where d.code='academic'
and not exists(select 1 from public.modules m where m.code='academic_certificate_registry');
