-- BNK SCHOOL OS: permanently remove a payment-evidence file/record.
-- Reuses the shared secure-delete flow: super admins confirm, other authorized
-- accounts must re-enter their password and call this RPC with the fresh session.
-- Keep only a minimal audit record, not student identities or financial document items.
--
-- Important: signature image objects belong to the reusable central signature
-- store; never delete shared storage.objects or public.signatures here.

create or replace function public.payment_evidence_delete_document(p_document_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_document public.payment_evidence_documents%rowtype;
  v_is_super_admin boolean;
  v_actor_name text;
begin
  if auth.uid() is null or not private.is_active_user() then
    raise exception 'กรุณาเข้าสู่ระบบด้วยบัญชีที่ได้รับอนุญาต';
  end if;
  if p_document_id is null then
    raise exception 'กรุณาเลือกเอกสารที่ต้องการลบ';
  end if;

  select d.* into v_document
  from public.payment_evidence_documents d
  where d.id = p_document_id
  for update;

  if not found then
    raise exception 'ไม่พบเอกสารนี้ เอกสารอาจถูกลบไปแล้ว';
  end if;

  v_is_super_admin := private.is_super_admin();

  -- Only super admin, the creator, or the assigned finance office may delete.
  -- Other teachers and director-only accounts cannot erase someone else's file.
  if not (
    v_is_super_admin
    or v_document.created_by = auth.uid()
    or private.is_payment_evidence_finance()
  ) then
    raise exception 'ไม่มีสิทธิ์ลบเอกสารของผู้อื่น';
  end if;

  -- A new password sign-in has an authenticated AMR timestamp. Do not accept a
  -- client-supplied "verified" boolean: a raw REST call must obey this check.
  if not v_is_super_admin
     and not coalesce(private.has_recent_password_auth(90), false) then
    raise exception 'กรุณายืนยันรหัสผ่านอีกครั้งก่อนลบเอกสาร';
  end if;

  select coalesce(nullif(pd.full_name, ''), nullif(pr.full_name, ''), 'ผู้ใช้งาน')
    into v_actor_name
  from public.profiles pr
  left join public.personnel_public_directory pd on pd.user_id = pr.id
  where pr.id = auth.uid();

  -- The irreversible removal is auditable without retaining student PII.
  insert into public.deletion_audit_log (
    entity_type, entity_id, deleted_by, deleted_by_name, deleted_by_role, old_data
  ) values (
    'payment_evidence_document',
    v_document.id,
    auth.uid(),
    coalesce(v_actor_name, 'ผู้ใช้งาน'),
    private.current_role(),
    jsonb_build_object(
      'academic_year', v_document.academic_year,
      'semester', v_document.semester,
      'class_label', v_document.class_label_snapshot,
      'document_type', v_document.document_type,
      'status', v_document.status,
      'student_count', v_document.student_count,
      'total_amount', v_document.total_amount
    )
  );

  -- Central action-signature selections are separate from the document FK.
  -- Remove only selections for THIS file; retain reusable signature assets.
  delete from public.bnk_action_signatures a
  where a.system_code = 'payment_evidence'
    and a.document_id = v_document.id;

  -- Item rows, document-specific signers, and document audit rows cascade.
  delete from public.payment_evidence_documents d
  where d.id = v_document.id;

  if not found then
    raise exception 'ไม่สามารถลบเอกสารได้';
  end if;

  return true;
end;
$$;

revoke all on function public.payment_evidence_delete_document(uuid) from public, anon;
grant execute on function public.payment_evidence_delete_document(uuid) to authenticated;
revoke delete on public.payment_evidence_documents from authenticated, anon;
revoke delete on public.payment_evidence_items from authenticated, anon;
revoke delete on public.payment_evidence_signers from authenticated, anon;
revoke delete on public.payment_evidence_audit from authenticated, anon;
