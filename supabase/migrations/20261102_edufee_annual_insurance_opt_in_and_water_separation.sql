-- BNK School OS: annual insurance consent and term separation
-- Annual water is never a second-semester tuition payment.
-- Existing historical receipts and original sheet rows are intentionally untouched.
create table if not exists public.edufee_deposit_choices (
  student_id uuid not null references public.students(id) on delete cascade,
  academic_year text not null check (academic_year ~ '^[0-9]{4}$'),
  opted_in boolean not null,
  updated_by uuid references public.profiles(id),
  updated_at timestamptz not null default clock_timestamp(),
  primary key (student_id, academic_year)
);
create index if not exists edufee_deposit_choices_year_idx on public.edufee_deposit_choices (academic_year);
alter table public.edufee_deposit_choices enable row level security;
revoke all on public.edufee_deposit_choices from public, anon, authenticated;
grant select on public.edufee_deposit_choices to authenticated;
drop policy if exists edufee_deposit_choices_read on public.edufee_deposit_choices;
create policy edufee_deposit_choices_read on public.edufee_deposit_choices
 for select to authenticated using (
  public.edufee_is_manager() or public.edufee_is_leader() or
  exists (select 1 from public.student_enrollments en
          where en.student_id=edufee_deposit_choices.student_id
          and en.academic_year=edufee_deposit_choices.academic_year
          and en.enrollment_status='active' and public.edufee_can_collect(en.class_id))
 );

create table if not exists public.edufee_deposit_choice_audit (
  id bigint generated always as identity primary key,
  student_id uuid not null,
  academic_year text not null,
  previous_choice boolean,
  next_choice boolean not null,
  actor_id uuid not null,
  changed_at timestamptz not null default clock_timestamp()
);
create index if not exists edufee_deposit_choice_audit_student on public.edufee_deposit_choice_audit(student_id,academic_year);
alter table public.edufee_deposit_choice_audit enable row level security;
revoke all on public.edufee_deposit_choice_audit from public,anon,authenticated;
grant select on public.edufee_deposit_choice_audit to authenticated;
drop policy if exists edufee_deposit_choice_audit_read on public.edufee_deposit_choice_audit;
create policy edufee_deposit_choice_audit_read on public.edufee_deposit_choice_audit
 for select to authenticated using (public.edufee_is_manager());

create or replace function public.edufee_set_deposit_choice(p_student uuid,p_year text,p_opted_in boolean)
returns boolean language plpgsql security definer set search_path = '' as $fn$
declare v_actor uuid := (select auth.uid()); v_prior boolean; v_eligible boolean;
begin
 if v_actor is null or p_student is null or p_year !~ '^[0-9]{4}$' or p_opted_in is null then
  raise exception 'Invalid insurance selection'; end if;
 select exists(
  select 1 from public.student_enrollments en
  where en.student_id=p_student and en.academic_year=p_year and en.enrollment_status='active'
    and (public.edufee_is_manager() or public.edufee_can_collect(en.class_id))
 ) into v_eligible;
 if not v_eligible then raise exception 'No permission to change insurance for this student and year'; end if;
 perform pg_advisory_xact_lock(hashtextextended('deposit-choice/'||p_student::text||'/'||p_year,0));
 if not p_opted_in and exists(
    select 1 from public.edufee_payments p
    where p.student_id=p_student and p.academic_year=p_year
     and p.category='deposit' and p.voided_at is null
 ) then raise exception 'Cannot remove insurance while an active insurance payment exists'; end if;
 select opted_in into v_prior from public.edufee_deposit_choices
 where student_id=p_student and academic_year=p_year for update;
 if found and v_prior=p_opted_in then return true; end if;
 insert into public.edufee_deposit_choices(student_id,academic_year,opted_in,updated_by)
 values (p_student,p_year,p_opted_in,v_actor)
 on conflict(student_id,academic_year) do update
 set opted_in=excluded.opted_in, updated_by=excluded.updated_by, updated_at=clock_timestamp();
 insert into public.edufee_deposit_choice_audit
 (student_id,academic_year,previous_choice,next_choice,actor_id)
 values (p_student,p_year,v_prior,p_opted_in,v_actor);
 return true;
end $fn$;
revoke all on function public.edufee_set_deposit_choice(uuid,text,boolean) from public,anon,authenticated;
grant execute on function public.edufee_set_deposit_choice(uuid,text,boolean) to authenticated;

-- Server side consent verification: must not rely on UI checkbox alone.
create or replace function public.edufee_enforce_deposit_choice()
returns trigger language plpgsql set search_path='' as $fn$
begin
 if new.category='deposit' and not exists(
   select 1 from public.edufee_deposit_choices d
   where d.student_id=new.student_id and d.academic_year=new.academic_year and d.opted_in
 ) then raise exception 'Insurance must be explicitly selected for this student and academic year'; end if;
 return new;
end $fn$;
drop trigger if exists edufee_deposit_choice_guard on public.edufee_payments;
create trigger edufee_deposit_choice_guard before insert or update of category,student_id,academic_year
 on public.edufee_payments for each row execute function public.edufee_enforce_deposit_choice();

-- Water and insurance are annual by definition; fee-plan settings cannot change to per-term.
create or replace function public.edufee_enforce_annual_fee_cycles()
returns trigger language plpgsql set search_path='' as $fn$
begin
 if new.category in ('water','deposit') and new.cycle<>'annual'
  then raise exception 'Water and insurance must be annual charges'; end if;
 return new;
end $fn$;
drop trigger if exists edufee_annual_cycles_guard on public.edufee_cycles;
create trigger edufee_annual_cycles_guard before insert or update of cycle,category
 on public.edufee_cycles for each row execute function public.edufee_enforce_annual_fee_cycles();

-- IMPORTANT: Do not open the optional insurance collection window until the new
-- opt-in-aware frontend has been deployed and verified. 2569/2 remains untouched.
