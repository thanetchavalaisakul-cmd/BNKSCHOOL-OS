-- Guard stage before saving any electronic or paper budget signature.
-- Never finalize a draft automatically: requester must explicitly prepare the document.
CREATE OR REPLACE FUNCTION public.set_budget_signature(p_disbursement_id uuid, p_slot text, p_method text, p_signature_id uuid DEFAULT NULL::uuid, p_storage_path text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_s public.budget_disbursement_signers;
begin
  if auth.uid() is null or not private.is_active_user() then raise exception 'Authentication required'; end if;
  select * into v_s from public.budget_disbursement_signers where disbursement_id=p_disbursement_id and slot=p_slot;
  if v_s.id is null or v_s.user_id<>auth.uid() then raise exception 'You are not the selected signer for this slot'; end if;
  if not exists (select 1 from public.budget_disbursements b where b.id=p_disbursement_id and b.status in ('document_ready','printed')) then
    raise exception 'Budget request is not ready for signing';
  end if;
  if p_method not in ('paper','drawn','upload','stored') then raise exception 'Invalid signature method'; end if;
  if p_method='paper' then
    update public.budget_disbursement_signers set method='paper',signature_id=null,bucket_id=null,storage_path=null,signed_at=null,updated_at=now() where id=v_s.id;
    return;
  end if;
  if p_storage_path is null or split_part(p_storage_path,'/',1)<>p_disbursement_id::text or split_part(p_storage_path,'/',2)<>p_slot then raise exception 'Signature file path is invalid'; end if;
  if p_method='stored' and not exists(select 1 from public.signatures s where s.id=p_signature_id and s.user_id=auth.uid()) then raise exception 'Stored signature must belong to signed-in user'; end if;
  update public.budget_disbursement_signers set method=p_method,signature_id=case when p_method='stored' then p_signature_id else null end,bucket_id='budget-signatures',storage_path=p_storage_path,signed_at=now(),updated_at=now() where id=v_s.id;
end;
$function$

REVOKE ALL ON FUNCTION public.set_budget_signature(uuid,text,text,uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_budget_signature(uuid,text,text,uuid,text) TO authenticated;
