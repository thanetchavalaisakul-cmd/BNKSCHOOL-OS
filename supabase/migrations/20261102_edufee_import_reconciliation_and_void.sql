CREATE OR REPLACE FUNCTION public.edufee_record_payment(p_student uuid, p_class uuid, p_year text, p_semester integer, p_category text, p_amount numeric, p_paid_on date, p_payer text, p_note text, p_request uuid)
 RETURNS edufee_payments
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_rate numeric(10,2);v_enabled boolean;v_paid numeric(10,2);
v_row public.edufee_payments%ROWTYPE;v_cycle text;v_rate_sem int;
BEGIN
 IF auth.uid() IS NULL OR NOT public.edufee_can_collect(p_class) THEN
  RAISE EXCEPTION 'Not authorized to receive payments for this class'; END IF;
 IF p_category NOT IN ('tuition','deposit','water') OR p_semester NOT IN (1,2)
    OR p_request IS NULL OR p_amount IS NULL OR p_amount<=0 THEN
  RAISE EXCEPTION 'Invalid payment details'; END IF;
 IF p_paid_on IS NULL OR p_paid_on>current_date THEN RAISE EXCEPTION 'Payment date cannot be in the future'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.student_enrollments e WHERE e.student_id=p_student
  AND e.class_id=p_class AND e.academic_year=p_year AND e.semester=p_semester AND e.enrollment_status='active')
 THEN RAISE EXCEPTION 'Student not enrolled in selected class and term'; END IF;
 SELECT cycle INTO v_cycle FROM public.edufee_cycles WHERE academic_year=p_year AND category=p_category;
 v_cycle:=coalesce(v_cycle,CASE WHEN p_category='tuition' THEN 'semester' ELSE 'annual' END);
 v_rate_sem:=CASE WHEN v_cycle='annual' THEN 0 ELSE p_semester END;
 SELECT w.enabled INTO v_enabled FROM public.edufee_windows w
 WHERE w.academic_year=p_year AND w.semester=p_semester AND w.category=p_category;
 IF NOT coalesce(v_enabled,false) THEN RAISE EXCEPTION 'Fee category is not enabled for this term'; END IF;
 SELECT r.amount INTO v_rate FROM public.edufee_rates r
 WHERE r.academic_year=p_year AND r.semester=v_rate_sem AND r.category=p_category;
 IF coalesce(v_rate,0)<=0 THEN RAISE EXCEPTION 'Configure a positive fee amount before receiving payments'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(
  p_student::text||'/'||p_year||'/'||p_category||'/'||
  (CASE WHEN v_cycle='annual' THEN 'year' ELSE p_semester::text END),0));
 SELECT * INTO v_row FROM public.edufee_payments WHERE request_id=p_request;
 IF FOUND THEN
  IF v_row.student_id=p_student AND v_row.academic_year=p_year AND v_row.semester=p_semester
   AND v_row.category=p_category AND v_row.amount=p_amount AND v_row.voided_at IS NULL
   THEN RETURN v_row; END IF;
  RAISE EXCEPTION 'Duplicate payment request identifier'; END IF;
 SELECT coalesce(sum(t.amount),0) INTO v_paid FROM public.edufee_payments t
 WHERE t.student_id=p_student AND t.academic_year=p_year AND t.category=p_category
 AND (v_cycle='annual' OR t.semester=p_semester) AND t.voided_at IS NULL;
 -- Totals imported from the original Google Sheet have no invented receipt date.
 -- Count them toward the existing charge to prevent double collection.
 IF p_year='2569' THEN
  v_paid:=v_paid+
   coalesce((select sum(case
    when p_category='tuition' and p_semester=1 then r.source_paid_term1
    when p_category='water' then r.source_paid_water
    else 0 end)
    from public.edufee_import_rows r
    where r.student_id=p_student and r.academic_year=p_year and r.review_status='ready'),0)
   +coalesce((select sum(l.amount)
    from public.edufee_import_receipts l join public.edufee_import_rows r on r.id=l.import_row_id
    where r.student_id=p_student and r.academic_year=p_year and r.review_status='ready'
     and l.category=p_category and (v_cycle='annual' or l.semester=p_semester)
     and l.voided_at is null),0);
 END IF;
 IF p_amount>v_rate-v_paid THEN
  RAISE EXCEPTION 'Payment exceeds outstanding balance (remaining %)',v_rate-v_paid; END IF;
 INSERT INTO public.edufee_payments
 (request_id,student_id,class_id,academic_year,semester,category,amount,paid_on,payer_name,note,recorded_by)
 VALUES(p_request,p_student,p_class,p_year,p_semester,p_category,p_amount,p_paid_on,
  nullif(btrim(p_payer),''),nullif(btrim(p_note),''),auth.uid())
 RETURNING * INTO v_row;
 INSERT INTO public.edufee_audit(payment_id,actor_id,action,note)
 VALUES(v_row.id,auth.uid(),'recorded','Recorded payment');
 RETURN v_row;
END $function$;
CREATE OR REPLACE FUNCTION public.edufee_record_import_receipt(p_row_id uuid, p_semester smallint, p_category text, p_amount numeric, p_paid_on date, p_payer text, p_note text, p_request uuid)
 RETURNS edufee_import_receipts
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_source public.edufee_import_rows%rowtype;
 v_result public.edufee_import_receipts%rowtype;
 v_due numeric;v_old_paid numeric;v_more numeric;v_native numeric;
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
 if v_source.student_id is not null then
  select coalesce(sum(p.amount),0) into v_native from public.edufee_payments p
   where p.student_id=v_source.student_id and p.academic_year=v_source.academic_year
     and p.category=p_category and (p_category='water' or p.semester=p_semester)
     and p.voided_at is null;
 else v_native:=0;
 end if;
 if p_amount>greatest(0,v_due-v_old_paid-v_more-v_native) then
  raise exception 'Payment exceeds imported outstanding balance';end if;
 insert into public.edufee_import_receipts(request_id,import_row_id,category,semester,amount,paid_on,payer_name,note,recorded_by)
 values(p_request,p_row_id,p_category,p_semester,p_amount,p_paid_on,nullif(btrim(p_payer),''),nullif(btrim(p_note),''),(select auth.uid()))
 returning * into v_result;
 return v_result;
end $function$


create or replace function public.edufee_void_import_receipt(
 p_id uuid,p_reason text
) returns boolean
language plpgsql security definer set search_path to '' as $fn$
declare v_p public.edufee_import_receipts%rowtype;
begin
 if not public.edufee_is_manager() then raise exception 'Only finance managers can void imported-history receipts';end if;
 if p_id is null or char_length(btrim(coalesce(p_reason,'')))<8 then
  raise exception 'Provide a reason of at least 8 characters';end if;
 select * into v_p from public.edufee_import_receipts where id=p_id for update;
 if not found or v_p.voided_at is not null then raise exception 'The receipt was not found or has already been voided';end if;
 update public.edufee_import_receipts
 set voided_at=clock_timestamp(),voided_by=(select auth.uid()),void_reason=btrim(p_reason)
 where id=p_id;
 return true;
end $fn$;
revoke all on function public.edufee_void_import_receipt(uuid,text) from public,anon,authenticated;
grant execute on function public.edufee_void_import_receipt(uuid,text) to authenticated;
