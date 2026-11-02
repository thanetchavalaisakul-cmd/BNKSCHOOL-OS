-- Separate custom "other" budget control counters while retaining four existing department counters.
ALTER TABLE public.budget_control_settings DROP CONSTRAINT IF EXISTS budget_control_settings_department_check;
ALTER TABLE public.budget_control_settings ADD CONSTRAINT budget_control_settings_department_check
 CHECK (department_code IN ('academic','personnel','general','plan_budget','other')
 OR (department_code LIKE 'other:%' AND char_length(department_code) BETWEEN 7 AND 126));
ALTER TABLE public.budget_disbursements
 ADD COLUMN IF NOT EXISTS control_group_key text,
 ADD COLUMN IF NOT EXISTS amendment_count integer NOT NULL DEFAULT 0,
 ADD COLUMN IF NOT EXISTS last_amendment_reason text;
DROP INDEX IF EXISTS public.budget_disbursements_control_unique;
CREATE UNIQUE INDEX budget_disbursements_control_unique
 ON public.budget_disbursements ((coalesce(control_group_key,department_code)),control_year,control_sequence)
 WHERE control_sequence IS NOT NULL;
CREATE OR REPLACE FUNCTION private.normalize_budget_disbursement()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_user public.profiles;
  v_project public.school_projects;
  v_activity public.project_activities;
  v_control public.budget_control_settings;
  v_control_key text;
  v_capacity numeric(12,2);
  v_used numeric(12,2);
  v_item jsonb;
  v_item_description text;
  v_item_amount numeric(12,2);
  v_total numeric(12,2) := 0;
  v_summary text := '';
begin
  select * into v_user from public.profiles where id=auth.uid() and account_status='active' and deleted_at is null;
  if v_user.id is null then raise exception 'Authentication required'; end if;

  select * into v_project from public.school_projects where id=new.project_id for update;
  if v_project.id is null or v_project.status<>'active' then raise exception 'Project is not active'; end if;

  if new.activity_id is not null then
    select * into v_activity from public.project_activities where id=new.activity_id and project_id=v_project.id and status='active';
    if v_activity.id is null then raise exception 'Activity does not belong to this project or is inactive'; end if;
  end if;

  if tg_op='INSERT' then
    if not private.can_create_budget_disbursement(new.project_id,new.activity_id) then raise exception 'Only the owner of this project/activity can create its budget request'; end if;
    new.requester_id:=auth.uid();
    new.requester_name:=coalesce(nullif(btrim(v_user.full_name),''),v_user.email,'ผู้ขอเบิก');
    new.department_code:=v_project.department_code;
    v_control_key:=case when v_project.department_code='other' then 'other:'||btrim(v_project.department_custom) else v_project.department_code end;
    new.control_group_key:=v_control_key;
    select * into v_control from public.budget_control_settings where department_code=v_control_key for update;
    if v_control.department_code is null then raise exception 'Budget control number has not been configured for department %',v_control_key; end if;
    new.control_year:=v_control.control_year;
    new.control_sequence:=v_control.last_number+1;
    new.control_number:=new.control_sequence::text||'/'||new.control_year::text;
    update public.budget_control_settings set last_number=new.control_sequence,updated_at=now() where department_code=v_control.department_code;
    select coalesce(max(b.request_round),0)+1 into new.request_round from public.budget_disbursements b where b.project_id=v_project.id and b.activity_id is not distinct from new.activity_id;
  else
    if old.requester_id<>auth.uid() and not private.is_plan_budget_head() and not private.is_super_admin() then raise exception 'You do not have permission to update this budget request'; end if;
    new.project_id:=old.project_id;
    new.activity_id:=old.activity_id;
    new.request_round:=old.request_round;
    new.requester_id:=old.requester_id;
    new.requester_name:=old.requester_name;
    new.department_code:=old.department_code;
    new.control_group_key:=old.control_group_key;
    new.control_year:=old.control_year;
    new.control_sequence:=old.control_sequence;
    new.control_number:=old.control_number;
  end if;

  if jsonb_typeof(new.line_items) is distinct from 'array' then raise exception 'Budget line_items must be a JSON array'; end if;
  if jsonb_array_length(new.line_items)=0 then
    if nullif(btrim(new.description),'') is null or new.amount<=0 then raise exception 'At least one budget line item is required'; end if;
    new.line_items:=jsonb_build_array(jsonb_build_object('description',btrim(new.description),'amount',new.amount));
  end if;
  for v_item in select value from jsonb_array_elements(new.line_items) loop
    if jsonb_typeof(v_item)<>'object' then raise exception 'Each budget line item must be an object'; end if;
    v_item_description:=nullif(btrim(v_item->>'description'),'');
    if v_item_description is null then raise exception 'Budget line item description is required'; end if;
    begin v_item_amount:=(v_item->>'amount')::numeric(12,2); exception when others then raise exception 'Budget line item amount is invalid'; end;
    if v_item_amount<=0 then raise exception 'Budget line item amount must be greater than zero'; end if;
    v_total:=v_total+v_item_amount;
    if v_summary<>'' then v_summary:=v_summary||E'\n'; end if;
    v_summary:=v_summary||v_item_description||' - '||to_char(v_item_amount,'FM999G999G990D00')||' บาท';
  end loop;
  if v_total<=0 then raise exception 'Disbursement amount must be greater than zero'; end if;
  new.amount:=v_total;
  new.description:=v_summary;

  if new.status='paid' and (tg_op='INSERT' or old.status is distinct from new.status) then
    if not private.is_plan_budget_head() and not private.is_super_admin() then raise exception 'Only Plan and Budget Head or Super Admin can mark a request as paid'; end if;
  end if;
  if new.status in ('document_ready','printed','paid') then
    if new.activity_id is not null then
      v_capacity:=v_activity.budget_amount;
      select coalesce(sum(b.amount),0) into v_used from public.budget_disbursements b where b.activity_id=new.activity_id and b.status in ('document_ready','printed','paid') and (tg_op='INSERT' or b.id<>old.id);
    else
      select v_project.budget_amount-coalesce(sum(a.budget_amount),0) into v_capacity from public.project_activities a where a.project_id=v_project.id and a.status='active';
      select coalesce(sum(b.amount),0) into v_used from public.budget_disbursements b where b.project_id=v_project.id and b.activity_id is null and b.status in ('document_ready','printed','paid') and (tg_op='INSERT' or b.id<>old.id);
    end if;
    v_capacity:=coalesce(v_capacity,v_project.budget_amount);
    if v_used+new.amount>v_capacity then raise exception 'Budget exceeded. Available budget %, already reserved/paid %, requested %',v_capacity,v_used,new.amount; end if;
  end if;
  if new.status='document_ready' and (tg_op='INSERT' or old.status is distinct from new.status) then new.prepared_at:=now(); end if;
  if new.status='printed' and (tg_op='INSERT' or old.status is distinct from new.status) then new.printed_at:=now(); end if;
  if new.status='paid' and (tg_op='INSERT' or old.status is distinct from new.status) then new.paid_at:=now(); end if;
  return new;
end;
$function$


CREATE TABLE IF NOT EXISTS public.budget_disbursement_amendments (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  disbursement_id uuid NOT NULL REFERENCES public.budget_disbursements(id) ON DELETE CASCADE,
  amendment_no integer NOT NULL,
  changed_by uuid NOT NULL REFERENCES public.profiles(id),
  changed_at timestamptz NOT NULL DEFAULT now(),
  reason text,
  was_approved boolean NOT NULL DEFAULT false,
  before_data jsonb NOT NULL,
  after_data jsonb NOT NULL,
  UNIQUE(disbursement_id,amendment_no)
);
ALTER TABLE public.budget_disbursement_amendments ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.budget_disbursement_amendments FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.budget_disbursement_amendments TO authenticated;
CREATE POLICY budget_amendments_read ON public.budget_disbursement_amendments
  FOR SELECT TO authenticated USING (private.can_view_budget_disbursement(disbursement_id));

CREATE OR REPLACE FUNCTION private.audit_budget_disbursement_amendment()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $audit$
BEGIN
 IF new.amendment_count>old.amendment_count THEN
   INSERT INTO public.budget_disbursement_amendments(disbursement_id,amendment_no,changed_by,reason,was_approved,before_data,after_data)
   VALUES (new.id,new.amendment_count,auth.uid(),nullif(btrim(new.last_amendment_reason),''),
           old.status IN ('document_ready','printed','paid'),
           jsonb_build_object('request_date',old.request_date,'academic_year',old.academic_year,
             'semester',old.semester,'line_items',old.line_items,'amount',old.amount,'notes',old.notes,'status',old.status),
           jsonb_build_object('request_date',new.request_date,'academic_year',new.academic_year,
             'semester',new.semester,'line_items',new.line_items,'amount',new.amount,'notes',new.notes,'status',new.status));
 END IF;
 RETURN NEW;
END $audit$;
REVOKE ALL ON FUNCTION private.audit_budget_disbursement_amendment() FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION private.validate_budget_disbursement_amendment()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $amend$
BEGIN
 IF new.line_items IS DISTINCT FROM old.line_items OR new.request_date IS DISTINCT FROM old.request_date
    OR new.academic_year IS DISTINCT FROM old.academic_year OR new.semester IS DISTINCT FROM old.semester
    OR new.notes IS DISTINCT FROM old.notes THEN
   IF old.status IN ('document_ready','printed','paid') AND length(btrim(coalesce(new.last_amendment_reason,'')))<5 THEN
      RAISE EXCEPTION 'Please specify a reason of at least five characters for amendments to approved budget requests';
   END IF;
   IF old.status='paid' AND NOT private.is_plan_budget_head() AND NOT private.is_super_admin() THEN
      RAISE EXCEPTION 'Paid budget requests can only be amended by Plan and Budget Head or Super Admin';
   END IF;
   new.amendment_count:=old.amendment_count+1;
 ELSE
   new.amendment_count:=old.amendment_count;
   new.last_amendment_reason:=old.last_amendment_reason;
 END IF;
 RETURN new;
END $amend$;
REVOKE ALL ON FUNCTION private.validate_budget_disbursement_amendment() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER zz_budget_disbursement_amend_guard BEFORE UPDATE ON public.budget_disbursements
 FOR EACH ROW EXECUTE FUNCTION private.validate_budget_disbursement_amendment();
CREATE TRIGGER zz_budget_disbursement_amend_audit AFTER UPDATE ON public.budget_disbursements
 FOR EACH ROW EXECUTE FUNCTION private.audit_budget_disbursement_amendment();
