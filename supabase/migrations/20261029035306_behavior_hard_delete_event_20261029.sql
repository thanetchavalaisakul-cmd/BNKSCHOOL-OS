-- Add a separate, irreversible admin action without changing the existing void workflow.
-- Physical evidence must be deleted with Supabase Storage API before this RPC runs.
create or replace function public.behavior_hard_delete_event(p_event_id uuid)
returns boolean
language plpgsql
security definer
set search_path to ''
as $function$
begin
  if auth.uid() is null or not public.behavior_is_super_admin() then
    raise exception 'BEHAVIOR_HARD_DELETE_NOT_ALLOWED' using errcode = '42501';
  end if;

  perform 1 from public.behavior_events where id = p_event_id for update;
  if not found then
    raise exception 'BEHAVIOR_EVENT_NOT_FOUND' using errcode = 'P0002';
  end if;

  -- Avoid orphaned binary files; the UI must first remove them through Storage API.
  if exists (
    select 1 from public.behavior_evidence e
    join storage.objects o
      on o.bucket_id = 'behavior-evidence' and o.name = e.storage_path
    where e.event_id = p_event_id
  ) then
    raise exception 'BEHAVIOR_EVIDENCE_FILES_MUST_BE_REMOVED_FIRST';
  end if;

  delete from public.behavior_case_audit where event_id = p_event_id;
  delete from public.notifications
    where entity_type = 'behavior_event' and entity_id = p_event_id;
  -- Foreign-key cascades remove linked signatures and evidence metadata.
  delete from public.behavior_events where id = p_event_id;

  return true;
end;
$function$;

revoke all on function public.behavior_hard_delete_event(uuid) from public, anon;
grant execute on function public.behavior_hard_delete_event(uuid) to authenticated;

drop policy if exists behavior_storage_delete_super_admin on storage.objects;
create policy behavior_storage_delete_super_admin on storage.objects
  for delete to authenticated
  using (bucket_id = 'behavior-evidence'
    and (select public.behavior_is_super_admin()));
