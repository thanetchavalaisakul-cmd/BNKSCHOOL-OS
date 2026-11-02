-- Import of original historical fee balances from the school's Google Sheet.
-- Never fabricate receipt dates: source paid columns are imported totals, NOT receipts.
-- Fiscal/academic 2569 semester 2 is protected by hard constraint.
create table if not exists public.edufee_import_rows (
 id uuid primary key default gen_random_uuid(),
 source_spreadsheet_id text not null,
 source_tab text not null,
 source_row integer not null check (source_row between 1 and 100000),
 academic_year text not null check (academic_year in ('2568','2569')),
 class_name text not null,
 student_code text,
 full_name text not null,
 student_id uuid references public.students(id) on delete set null,
 expected_term1 numeric(12,2) not null default 0 check (expected_term1>=0),
 expected_term2 numeric(12,2) not null default 0 check (expected_term2>=0),
 expected_water numeric(12,2) not null default 0 check (expected_water>=0),
 source_paid_term1 numeric(12,2) not null default 0 check (source_paid_term1>=0),
 source_paid_term2 numeric(12,2) not null default 0 check (source_paid_term2>=0),
 source_paid_water numeric(12,2) not null default 0 check (source_paid_water>=0),
 source_note text,
 review_status text not null default 'review' check (review_status in ('ready','review','excluded')),
 review_note text,
 imported_by uuid references public.profiles(id),
 imported_at timestamptz not null default clock_timestamp(),
 unique(source_spreadsheet_id,source_tab,source_row),
 constraint edufee_no_2569_sem2_import check (
  academic_year<>'2569' or (expected_term2=0 and source_paid_term2=0)
 )
);
create index if not exists edufee_import_rows_period_idx on public.edufee_import_rows(academic_year,class_name,review_status);
create index if not exists edufee_import_rows_student_idx on public.edufee_import_rows(student_id,academic_year);
alter table public.edufee_import_rows enable row level security;
revoke all on public.edufee_import_rows from public,anon,authenticated;
grant select on public.edufee_import_rows to authenticated;
create policy edufee_import_read on public.edufee_import_rows for select to authenticated
 using (public.edufee_is_manager() or public.edufee_is_leader());

create table if not exists public.edufee_import_receipts (
 id uuid primary key default gen_random_uuid(),
 request_id uuid not null unique,
 import_row_id uuid not null references public.edufee_import_rows(id) on delete restrict,
 category text not null check (category in ('tuition','water')),
 semester smallint not null check (semester in (1,2)),
 amount numeric(12,2) not null check(amount>0),
 paid_on date not null,
 payer_name text,
 note text,
 recorded_by uuid not null references public.profiles(id),
 recorded_at timestamptz not null default clock_timestamp(),
 voided_at timestamptz,
 voided_by uuid references public.profiles(id),
 void_reason text,
 constraint edufee_import_water_sem1 check (category<>'water' or semester=1)
);
create index if not exists edufee_import_receipts_row_idx on public.edufee_import_receipts(import_row_id);
alter table public.edufee_import_receipts enable row level security;
revoke all on public.edufee_import_receipts from public,anon,authenticated;
grant select on public.edufee_import_receipts to authenticated;
create policy edufee_import_receipt_read on public.edufee_import_receipts for select to authenticated
 using (public.edufee_is_manager() or public.edufee_is_leader());

create or replace function public.edufee_record_import_receipt(
 p_row_id uuid,p_semester smallint,p_category text,p_amount numeric,p_paid_on date,
 p_payer text,p_note text,p_request uuid
) returns public.edufee_import_receipts
language plpgsql security definer set search_path to '' as $fn$
declare v_source public.edufee_import_rows%rowtype;
 v_result public.edufee_import_receipts%rowtype;
 v_due numeric;v_old_paid numeric;v_more numeric;
begin
 if not public.edufee_is_manager() then raise exception 'Only finance managers can collect imported historical balances';end if;
 if p_row_id is null or p_request is null or p_amount is null or p_amount<=0 then
  raise exception 'Invalid payment request'; end if;
 if p_paid_on is null or p_paid_on> (clock_timestamp() at time zone 'Asia/Bangkok')::date then
  raise exception 'Payment date must not be in the future';end if;
 select * into v_source from public.edufee_import_rows where id=p_row_id for update;
 if not found then raise exception 'Imported fee record not found';end if;
 if v_source.review_status<>'ready' then raise exception 'The original import must be verified before receiving a payment';end if;
 if (p_category,p_semester) not in (('tuition',1),('tuition',2),('water',1)) or
  (v_source.academic_year='2569' and p_semester=2) then raise exception 'Invalid period for imported payment';end if;
 select * into v_result from public.edufee_import_receipts where request_id=p_request;
 if found then
  if v_result.import_row_id=p_row_id and v_result.semester=p_semester and
     v_result.category=p_category and v_result.amount=p_amount and v_result.voided_at is null then
   return v_result;
  end if;
  raise exception 'Duplicate payment request identifier';
 end if;
 if p_category='water' then v_due:=v_source.expected_water;v_old_paid:=v_source.source_paid_water;
 elsif p_semester=1 then v_due:=v_source.expected_term1;v_old_paid:=v_source.source_paid_term1;
 else v_due:=v_source.expected_term2;v_old_paid:=v_source.source_paid_term2;
 end if;
 select coalesce(sum(amount),0) into v_more from public.edufee_import_receipts
  where import_row_id=p_row_id and category=p_category and semester=p_semester and voided_at is null;
 if p_amount>greatest(0,v_due-v_old_paid-v_more) then
  raise exception 'Payment exceeds imported outstanding balance';end if;
 insert into public.edufee_import_receipts(request_id,import_row_id,category,semester,amount,paid_on,payer_name,note,recorded_by)
 values(p_request,p_row_id,p_category,p_semester,p_amount,p_paid_on,nullif(btrim(p_payer),''),nullif(btrim(p_note),''),(select auth.uid()))
 returning * into v_result;
 return v_result;
end $fn$;
revoke all on function public.edufee_record_import_receipt(uuid,smallint,text,numeric,date,text,text,uuid) from public,anon,authenticated;
grant execute on function public.edufee_record_import_receipt(uuid,smallint,text,numeric,date,text,text,uuid) to authenticated;
