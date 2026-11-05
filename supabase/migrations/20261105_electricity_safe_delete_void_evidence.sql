-- BNK School OS: reversible and auditable corrections for housing electricity (2026-11-05).
-- No existing invoices, readings, payments or storage objects are altered by this migration.
create table if not exists public.electricity_action_audit (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null check (entity_type in ('meter','bill','payment_evidence')),
  entity_id uuid not null,
  action text not null check (action in ('delete_meter','delete_bill','void_bill','payment_evidence_removed')),
  actor_id uuid references public.profiles(id),
  reason text not null,
  snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists electricity_action_audit_entity_idx
 on public.electricity_action_audit(entity_type,entity_id,created_at desc);
alter table public.electricity_action_audit enable row level security;
revoke all on public.electricity_action_audit from public, anon, authenticated;
grant select on public.electricity_action_audit to authenticated;
drop policy if exists electricity_action_audit_manager_read on public.electricity_action_audit;
create policy electricity_action_audit_manager_read on public.electricity_action_audit
 for select to authenticated using ((select private.electricity_is_manager()));

-- Keep voided bills as an immutable, visible history, excluded from amounts due.
alter table public.electricity_readings drop constraint if exists electricity_readings_status_check;
alter table public.electricity_readings add constraint electricity_readings_status_check
 check(status in ('reading_submitted','reading_rejected','awaiting_payment','payment_submitted','payment_rejected','paid','voided'));

create or replace function public.electricity_delete_meter(p_meter_id uuid, p_reason text)
 returns void language plpgsql security definer set search_path = ''
as $fn$
declare v public.electricity_meters%rowtype;
begin
 if not (select private.electricity_is_manager()) then raise exception 'Not authorized to delete a meter'; end if;
 if length(btrim(coalesce(p_reason,''))) < 3 then raise exception 'Reason required'; end if;
 select * into v from public.electricity_meters where id=p_meter_id for update;
 if not found then raise exception 'Meter not found'; end if;
 if exists(select 1 from public.electricity_readings where meter_id=p_meter_id) then
   raise exception 'Meter has billing history: deactivate it instead of deleting';
 end if;
 insert into public.electricity_action_audit(entity_type,entity_id,action,actor_id,reason,snapshot)
 values('meter',v.id,'delete_meter',(select auth.uid()),left(btrim(p_reason),1000),to_jsonb(v));
 delete from public.electricity_meters where id=v.id;
end;$fn$;

create or replace function public.electricity_delete_bill(p_reading_id uuid, p_reason text)
 returns void language plpgsql security definer set search_path = ''
as $fn$
declare v public.electricity_readings%rowtype; v_month date; v_events jsonb;
begin
 if not (select private.is_active_user()) then raise exception 'Not authorized'; end if;
 if length(btrim(coalesce(p_reason,''))) < 3 then raise exception 'Reason required'; end if;
 select * into v from public.electricity_readings where id=p_reading_id for update;
 if not found then raise exception 'Bill not found'; end if;
 if not ((select private.electricity_is_manager()) or
   (v.payer_user_id=(select auth.uid()) and v.status in ('reading_submitted','reading_rejected'))) then
   raise exception 'Only the manager can delete an approved invoice'; end if;
 if v.status not in ('reading_submitted','reading_rejected','awaiting_payment') or
  v.payment_slip_path is not null or v.paid_at is not null or v.receipt_no is not null then
   raise exception 'Bills with payment evidence or receipts cannot be deleted; use cancellation instead'; end if;
 if exists(select 1 from public.electricity_events where reading_id=v.id
    and event_type like 'payment_%') then
    raise exception 'Payment was previously processed; use cancellation to preserve history'; end if;
 select billing_month into v_month from public.electricity_periods where id=v.period_id;
 if exists(select 1 from public.electricity_readings newer
   join public.electricity_periods np on np.id=newer.period_id
   where newer.meter_id=v.meter_id and np.billing_month>v_month) then
   raise exception 'Later meter readings exist; cannot delete earlier invoice'; end if;
 select coalesce(jsonb_agg(to_jsonb(e) order by e.id),'[]'::jsonb)
   into v_events from public.electricity_events e where e.reading_id=v.id;
 insert into public.electricity_action_audit(entity_type,entity_id,action,actor_id,reason,snapshot)
 values('bill',v.id,'delete_bill',(select auth.uid()),left(btrim(p_reason),1000),
 jsonb_build_object('reading',to_jsonb(v),'events',v_events));
 delete from public.electricity_events where reading_id=v.id;
 delete from public.electricity_readings where id=v.id;
end;$fn$;

create or replace function public.electricity_void_bill(p_reading_id uuid, p_reason text)
 returns void language plpgsql security definer set search_path = ''
as $fn$
declare v public.electricity_readings%rowtype; v_month date;
begin
 if not (select private.electricity_is_manager()) then raise exception 'Only the electricity manager may void bills'; end if;
 if length(btrim(coalesce(p_reason,''))) < 3 then raise exception 'Reason required'; end if;
 select * into v from public.electricity_readings where id=p_reading_id for update;
 if not found then raise exception 'Bill not found'; end if;
 if v.status not in ('reading_submitted','reading_rejected','awaiting_payment','payment_rejected') or
  v.paid_at is not null or v.receipt_no is not null then
   raise exception 'Paid or payment-pending bills cannot be cancelled'; end if;
 select billing_month into v_month from public.electricity_periods where id=v.period_id;
 if exists(select 1 from public.electricity_readings newer
  join public.electricity_periods np on np.id=newer.period_id
  where newer.meter_id=v.meter_id and np.billing_month>v_month and newer.status<>'voided') then
   raise exception 'Later active bills depend on this reading; review them first'; end if;
 insert into public.electricity_action_audit(entity_type,entity_id,action,actor_id,reason,snapshot)
 values('bill',v.id,'void_bill',(select auth.uid()),left(btrim(p_reason),1000),jsonb_build_object('reading',to_jsonb(v)));
 update public.electricity_readings set status='voided',review_note=left(btrim(p_reason),1000),updated_at=now() where id=v.id;
 perform private.electricity_log(v.id,'bill_voided',p_reason);
end;$fn$;

create or replace function public.electricity_remove_payment_evidence(p_reading_id uuid, p_reason text)
 returns text language plpgsql security definer set search_path = ''
as $fn$
declare v public.electricity_readings%rowtype;
begin
 if not (select private.is_active_user()) then raise exception 'Not authorized'; end if;
 if length(btrim(coalesce(p_reason,''))) < 3 then raise exception 'Reason required'; end if;
 select * into v from public.electricity_readings where id=p_reading_id for update;
 if not found then raise exception 'Bill not found'; end if;
 if not ((select private.electricity_is_manager()) or v.payer_user_id=(select auth.uid())) then
   raise exception 'Not your payment evidence'; end if;
 if v.status not in ('payment_submitted','payment_rejected') or v.payment_slip_path is null
 or v.paid_at is not null or v.receipt_no is not null then
   raise exception 'Only unconfirmed payment evidence may be removed'; end if;
 insert into public.electricity_action_audit(entity_type,entity_id,action,actor_id,reason,snapshot)
 values('payment_evidence',v.id,'payment_evidence_removed',(select auth.uid()),
 left(btrim(p_reason),1000),jsonb_build_object('reading',to_jsonb(v)));
 update public.electricity_readings set status='awaiting_payment',payment_slip_path=null,
  payment_reviewed_by=null,payment_reviewed_at=null,review_note='',updated_at=now()
 where id=v.id;
 perform private.electricity_log(v.id,'payment_evidence_removed',p_reason);
 return v.payment_slip_path;
end;$fn$;

-- Only the actor removing a slip or the electricity manager may remove the archived object.
-- Never allow removal of still-linked (not unlinked) payment proof.
create or replace function private.electricity_can_delete_removed_slip(p_path text)
 returns boolean language sql stable security definer set search_path = ''
as $fn$
 select (select private.is_active_user())
   and position('/slip/' in p_path)>0
   and exists (
     select 1 from public.electricity_action_audit a
     where a.action='payment_evidence_removed'
      and a.snapshot->'reading'->>'payment_slip_path'=p_path
      and (a.actor_id=(select auth.uid()) or (select private.electricity_is_manager()))
   )
   and not exists (
     select 1 from public.electricity_readings r
     where r.payment_slip_path=p_path
   );
$fn$;
revoke all on function private.electricity_can_delete_removed_slip(text) from public, anon;
grant execute on function private.electricity_can_delete_removed_slip(text) to authenticated;

drop policy if exists electricity_removed_evidence_read on storage.objects;
create policy electricity_removed_evidence_read on storage.objects
 for select to authenticated
 using (bucket_id='electricity-evidence' and (select private.electricity_can_delete_removed_slip(name)));
drop policy if exists electricity_removed_evidence_delete on storage.objects;
create policy electricity_removed_evidence_delete on storage.objects
 for delete to authenticated
 using (bucket_id='electricity-evidence' and (select private.electricity_can_delete_removed_slip(name)));

revoke all on function public.electricity_delete_meter(uuid,text) from public, anon;
revoke all on function public.electricity_delete_bill(uuid,text) from public, anon;
revoke all on function public.electricity_void_bill(uuid,text) from public, anon;
revoke all on function public.electricity_remove_payment_evidence(uuid,text) from public, anon;
grant execute on function public.electricity_delete_meter(uuid,text) to authenticated;
grant execute on function public.electricity_delete_bill(uuid,text) to authenticated;
grant execute on function public.electricity_void_bill(uuid,text) to authenticated;
grant execute on function public.electricity_remove_payment_evidence(uuid,text) to authenticated;

-- A manager can reissue a voided bill for the same month; the old version stays in the audit.
CREATE OR REPLACE FUNCTION public.electricity_submit_reading(p_meter_id uuid, p_period_id uuid, p_current numeric, p_photo_path text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE v_meter public.electricity_meters%ROWTYPE;v_period public.electricity_periods%ROWTYPE;
 v_prev numeric(12,2);v_new numeric(12,2);v_id uuid;v_status text;v_payer_name text;
BEGIN
 IF NOT (SELECT private.is_active_user()) THEN RAISE EXCEPTION 'Not authorized'; END IF;
 SELECT * INTO v_meter FROM public.electricity_meters WHERE id=p_meter_id FOR UPDATE;
 IF NOT FOUND OR NOT v_meter.is_active THEN RAISE EXCEPTION 'Meter not active'; END IF;
 IF NOT ((SELECT private.electricity_is_manager()) OR v_meter.occupant_user_id=(SELECT auth.uid())) THEN RAISE EXCEPTION 'Not your meter'; END IF;
 SELECT * INTO v_period FROM public.electricity_periods WHERE id=p_period_id;
 IF NOT FOUND OR v_period.status<>'open' THEN RAISE EXCEPTION 'Billing month is not open'; END IF;
 PERFORM private.electricity_check_uploaded(p_photo_path);
 -- Lock all readings for a meter to serialize monthly submissions.
 SELECT r.current_reading INTO v_prev FROM public.electricity_readings r
 JOIN public.electricity_periods p ON p.id=r.period_id
 WHERE r.meter_id=p_meter_id AND p.billing_month<v_period.billing_month
 AND r.status IN ('awaiting_payment','payment_submitted','payment_rejected','paid')
 ORDER BY p.billing_month DESC LIMIT 1;
 v_prev:=coalesce(v_prev,v_meter.opening_reading);
 IF EXISTS(SELECT 1 FROM public.electricity_readings r JOIN public.electricity_periods p ON p.id=r.period_id
 WHERE r.meter_id=p_meter_id AND p.billing_month<v_period.billing_month
 AND r.status='reading_submitted') THEN RAISE EXCEPTION 'An earlier reading is pending verification'; END IF;
 IF EXISTS(SELECT 1 FROM public.electricity_readings r JOIN public.electricity_periods p ON p.id=r.period_id
 WHERE r.meter_id=p_meter_id AND p.billing_month>v_period.billing_month
 AND r.status IN ('awaiting_payment','payment_submitted','payment_rejected','paid'))
 THEN RAISE EXCEPTION 'Later verified readings already exist'; END IF;
 IF p_current IS NULL OR p_current<v_prev OR p_current>9999999999.99 OR p_current-v_prev>1000000 THEN
 RAISE EXCEPTION 'Meter reading must be >= previous reading, and use cannot exceed 1,000,000 units'; END IF;
 v_new:=round(p_current,2);
 SELECT status INTO v_status FROM public.electricity_readings WHERE meter_id=p_meter_id AND period_id=p_period_id FOR UPDATE;
 IF v_status IS NOT NULL AND v_status NOT IN ('reading_submitted','reading_rejected','voided') THEN
 RAISE EXCEPTION 'Reading already approved; cannot change'; END IF;
 SELECT coalesce(nullif(full_name,''),email,'บุคลากร') INTO v_payer_name FROM public.profiles WHERE id=v_meter.occupant_user_id;
 INSERT INTO public.electricity_readings(meter_id,period_id,payer_user_id,payer_name_snapshot,
 house_label_snapshot,meter_code_snapshot,previous_reading,current_reading,used_units,unit_rate,amount_due,meter_photo_path,
 status,created_by)
 VALUES(v_meter.id,v_period.id,v_meter.occupant_user_id,coalesce(v_payer_name,nullif(v_meter.occupant_name,''),'ผู้พักอาศัย'),
 v_meter.house_label,v_meter.meter_code,v_prev,v_new,v_new-v_prev,v_period.unit_rate,
 round((v_new-v_prev)*v_period.unit_rate,2),p_photo_path,'reading_submitted',(SELECT auth.uid()))
 ON CONFLICT(meter_id,period_id) DO UPDATE SET previous_reading=excluded.previous_reading,
 current_reading=excluded.current_reading,used_units=excluded.used_units,unit_rate=excluded.unit_rate,
 amount_due=excluded.amount_due,meter_photo_path=excluded.meter_photo_path,status='reading_submitted',
 payment_slip_path=NULL,payment_reviewed_by=NULL,payment_reviewed_at=NULL,paid_at=NULL,receipt_no=NULL,receipt_issued_at=NULL,
 reading_reviewed_at=NULL,reading_reviewed_by=NULL,review_note='',updated_at=now()
 RETURNING id INTO v_id;
 PERFORM private.electricity_log(v_id,'reading_submitted','');
 RETURN v_id;
END;$function$
;
