-- Additional explicit four-method lesson plan approval operations. Original RPC signatures unchanged.
ALTER TABLE public.approval_document_slots ADD COLUMN IF NOT EXISTS signature_method text;
ALTER TABLE public.approval_document_slots DROP CONSTRAINT IF EXISTS approval_document_slots_signature_method_check;
ALTER TABLE public.approval_document_slots ADD CONSTRAINT approval_document_slots_signature_method_check CHECK (signature_method IS NULL OR signature_method IN ('paper','stored','drawn','upload'));

CREATE OR REPLACE FUNCTION public.director_review_lesson_plan_signed(p_lesson_plan_id uuid, p_decision text, p_comment text DEFAULT NULL::text, p_signature_id uuid DEFAULT NULL::uuid, p_method text DEFAULT 'stored')
 RETURNS lesson_plans
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v public.lesson_plans; a public.profiles; target text; old_status text;
begin
  select * into a from public.profiles where id=auth.uid();
  if a.account_status<>'active' or not exists(select 1 from public.approval_executives e where e.user_id=auth.uid() and e.executive_kind in ('director','acting_director') and e.is_active=true) then raise exception 'Only Director can review at this step'; end if;
  if p_decision not in ('approve','reject','revision') then raise exception 'Invalid decision'; end if;
  if p_decision in ('reject','revision') and nullif(btrim(coalesce(p_comment,'')),'') is null then raise exception 'Comment is required'; end if;
  if p_method not in ('paper','stored','drawn','upload') then raise exception 'Invalid signature method'; end if;
  if p_decision='approve' and p_method='paper' and p_signature_id is not null then raise exception 'Paper approval cannot embed an electronic signature'; end if;
  if p_decision='approve' and p_method<>'paper' and p_signature_id is null then raise exception 'Electronic signature is required for approval'; end if;
  if p_decision='approve' and p_method in ('drawn','upload') and not exists (
    select 1 from public.signatures where id=p_signature_id and user_id=auth.uid() and source=p_method
  ) then raise exception 'Signature source must match the selected method'; end if;
  if p_signature_id is not null and not exists(select 1 from public.signatures s where s.id=p_signature_id and s.user_id=auth.uid()) then raise exception 'Invalid signature'; end if;
  select * into v from public.lesson_plans where id=p_lesson_plan_id and status in ('pending_head','pending_director') for update;
  if v.id is null or v.director_decision<>'pending' or not private.approval_slot_available('lesson_plans',v.id,v.approval_version,'director') then raise exception 'Lesson plan is not available for director review'; end if;
  old_status:=v.status;
  if p_decision='approve' then
    perform private.mark_approval_slot('lesson_plans',v.id,v.approval_version,'director','approve',auth.uid(),coalesce(a.full_name,a.email),null,p_comment,p_signature_id,'signatures',(select storage_path from public.signatures where id=p_signature_id),false,null);
    update public.lesson_plans set director_decision='approve',director_reviewer_id=auth.uid(),director_reviewed_at=now(),director_approval_automatic=false,status=case when head_decision='approve' then 'approved' else 'pending_head' end,approved_at=case when head_decision='approve' then now() else null end,updated_at=now() where id=v.id returning * into v;
    insert into public.workflow_actions(lesson_plan_id,actor_id,actor_role,action,from_status,to_status,comment,signature_id,actor_name) values(v.id,auth.uid(),'director','approve_director',old_status,v.status,p_comment,p_signature_id,coalesce(a.full_name,a.email));
    if p_method<>'paper' then
    insert into public.workflow_actions(lesson_plan_id,actor_id,actor_role,action,from_status,to_status,signature_id,actor_name) values(v.id,auth.uid(),'director','sign',v.status,v.status,p_signature_id,coalesce(a.full_name,a.email));
    end if;
  else
    target:=case when p_decision='revision' then 'revision_requested' else 'rejected' end;
    perform private.mark_approval_slot('lesson_plans',v.id,v.approval_version,'director',case when p_decision='revision' then 'revision_requested' else 'reject' end,auth.uid(),coalesce(a.full_name,a.email),null,p_comment,null,null,null,false,null);
    update public.lesson_plans set director_decision=case when p_decision='revision' then 'revision' else 'reject' end,director_reviewer_id=auth.uid(),director_reviewed_at=now(),head_decision='pending',head_reviewer_id=null,head_reviewed_at=null,status=target,approved_at=null,revision_note=case when p_decision='revision' then p_comment else null end,updated_at=now() where id=v.id returning * into v;
  end if;
  IF p_decision='approve' THEN
    UPDATE public.approval_document_slots
      SET signature_method=p_method,signature_id=CASE WHEN p_method='paper' THEN NULL ELSE p_signature_id END,
          signature_bucket=CASE WHEN p_method='paper' THEN NULL ELSE 'signatures' END,
          signature_path=CASE WHEN p_method='paper' THEN NULL ELSE (SELECT storage_path FROM public.signatures WHERE id=p_signature_id) END,
          updated_at=now()
      WHERE system_code='lesson_plans' AND document_id=v.id
        AND document_version=v.approval_version AND slot_code='director';
  END IF;
  return v;
end;
$function$;

REVOKE ALL ON FUNCTION public.director_review_lesson_plan_signed(uuid,text,text,uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.director_review_lesson_plan_signed(uuid,text,text,uuid,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.head_review_lesson_plan_signed(p_lesson_plan_id uuid, p_decision text, p_comment text DEFAULT NULL::text, p_signature_id uuid DEFAULT NULL::uuid, p_method text DEFAULT 'stored')
 RETURNS lesson_plans
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v public.lesson_plans; a public.profiles; target text; old_status text;
begin
  select * into a from public.profiles where id=auth.uid();
  if a.account_status<>'active' or a.deleted_at is not null or a.role<>'department_head' or not private.is_department_head_of('academic') then raise exception 'Only the active Academic Department Head can review lesson plans at this step'; end if;
  if p_decision not in ('approve','revision','reject') then raise exception 'Invalid decision'; end if;
  if p_decision in ('revision','reject') and nullif(btrim(coalesce(p_comment,'')),'') is null then raise exception 'Comment is required'; end if;
  if p_method not in ('paper','stored','drawn','upload') then raise exception 'Invalid signature method'; end if;
  if p_decision='approve' and p_method='paper' and p_signature_id is not null then raise exception 'Paper approval cannot embed an electronic signature'; end if;
  if p_decision='approve' and p_method<>'paper' and p_signature_id is null then raise exception 'Electronic signature is required for approval'; end if;
  if p_decision='approve' and p_method in ('drawn','upload') and not exists (
    select 1 from public.signatures where id=p_signature_id and user_id=auth.uid() and source=p_method
  ) then raise exception 'Signature source must match the selected method'; end if;
  if p_signature_id is not null and not exists(select 1 from public.signatures s where s.id=p_signature_id and s.user_id=auth.uid()) then raise exception 'Invalid signature'; end if;
  select * into v from public.lesson_plans where id=p_lesson_plan_id and status in ('pending_head','pending_director') for update;
  if v.id is null or v.head_decision<>'pending' or not private.approval_slot_available('lesson_plans',v.id,v.approval_version,'academic_head') then raise exception 'Lesson plan is not available for Academic Department Head review'; end if;
  old_status:=v.status;
  if p_decision='approve' then
    perform private.mark_approval_slot('lesson_plans',v.id,v.approval_version,'academic_head','approve',auth.uid(),coalesce(a.full_name,a.email),null,p_comment,p_signature_id,'signatures',(select storage_path from public.signatures where id=p_signature_id),false,null);
    update public.lesson_plans set head_decision='approve',head_reviewer_id=auth.uid(),head_reviewed_at=now(),status=case when director_decision='approve' then 'approved' else 'pending_director' end,approved_at=case when director_decision='approve' then now() else null end,updated_at=now() where id=v.id returning * into v;
    insert into public.workflow_actions(lesson_plan_id,actor_id,actor_role,action,from_status,to_status,comment,signature_id,actor_name) values(v.id,auth.uid(),'department_head','approve_head',old_status,v.status,p_comment,p_signature_id,coalesce(a.full_name,a.email));
    perform private.auto_director_lesson_plan(v.id);
    select * into v from public.lesson_plans where id=v.id;
  else
    target:=case when p_decision='revision' then 'revision_requested' else 'rejected' end;
    perform private.mark_approval_slot('lesson_plans',v.id,v.approval_version,'academic_head',case when p_decision='revision' then 'revision_requested' else 'reject' end,auth.uid(),coalesce(a.full_name,a.email),null,p_comment,null,null,null,false,null);
    update public.lesson_plans set head_decision=case when p_decision='revision' then 'revision' else 'reject' end,head_reviewer_id=auth.uid(),head_reviewed_at=now(),director_decision='pending',director_reviewer_id=null,director_reviewed_at=null,director_approval_automatic=false,status=target,approved_at=null,revision_note=case when p_decision='revision' then p_comment else null end,updated_at=now() where id=v.id returning * into v;
  end if;
  IF p_decision='approve' THEN
    UPDATE public.approval_document_slots
      SET signature_method=p_method,signature_id=CASE WHEN p_method='paper' THEN NULL ELSE p_signature_id END,
          signature_bucket=CASE WHEN p_method='paper' THEN NULL ELSE 'signatures' END,
          signature_path=CASE WHEN p_method='paper' THEN NULL ELSE (SELECT storage_path FROM public.signatures WHERE id=p_signature_id) END,
          updated_at=now()
      WHERE system_code='lesson_plans' AND document_id=v.id
        AND document_version=v.approval_version AND slot_code='academic_head';
  END IF;
  return v;
end;
$function$;

REVOKE ALL ON FUNCTION public.head_review_lesson_plan_signed(uuid,text,text,uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.head_review_lesson_plan_signed(uuid,text,text,uuid,text) TO authenticated;
