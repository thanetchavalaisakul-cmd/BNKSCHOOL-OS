-- Source row identity risk: 2569 contains legacy sheet rows with a student code
-- matching the current register but an unverified (or different) spelling/name.
-- Never transfer the source payment to a different person based solely on the code.
create or replace function public.edufee_block_unreconciled_native_collection()
returns trigger language plpgsql set search_path='' as $fn$
begin
 if new.academic_year='2569'
   and ((new.category='tuition' and new.semester=1) or new.category='water')
   and exists(
     select 1 from public.students s
     join public.edufee_import_rows r
       on r.academic_year=new.academic_year and r.student_code=s.student_code
     where s.id=new.student_id and r.student_id is null and r.review_status='ready'
   )
 then
  raise exception 'This student code has an unmatched historical sheet record. Verify the student identity before receiving the first-term or annual water payment';
 end if;
 return new;
end $fn$;
drop trigger if exists edufee_unreconciled_native_guard on public.edufee_payments;
create trigger edufee_unreconciled_native_guard before insert or update of student_id,academic_year,semester,category
 on public.edufee_payments for each row execute function public.edufee_block_unreconciled_native_collection();

-- 2568 old graduates may receive direct historical receipts, but 2569 unmatched
-- rows must be reconciled with the current student register first.
create or replace function public.edufee_block_unreconciled_import_collection()
returns trigger language plpgsql set search_path='' as $fn$
begin
 if exists(
    select 1 from public.edufee_import_rows r where r.id=new.import_row_id
      and r.academic_year='2569' and r.student_id is null
 ) then
  raise exception 'Verify the 2569 student identity before receiving a historical balance';
 end if;
 return new;
end $fn$;
drop trigger if exists edufee_unreconciled_import_guard on public.edufee_import_receipts;
create trigger edufee_unreconciled_import_guard before insert or update of import_row_id
 on public.edufee_import_receipts for each row execute function public.edufee_block_unreconciled_import_collection();
