-- 2026-11-02: restore Storage RLS helper executable by authenticated users.
-- Hotfix applied to production as bnk_restore_signatures_storage_rls_authenticated_execution_20261102.
--
-- INCIDENT: storage.objects policy bnk_preschool_acknowledged_signatures_read
-- called a SECURITY DEFINER helper but helper EXECUTE was revoked from authenticated.
-- This caused Postgres 42501 on any storage.objects read, even requests for
-- budget-signatures bucket, owing to RLS policy evaluation.
-- Storage logs confirmed 68 failures with:
--   permission denied for function can_read_preschool_cover_signature_storage
--
-- SECURITY: no privilege to read unrelated images is granted here.
-- The helper validates active logged-in user, document-view scope,
-- acknowledged staff membership and matching specific storage path.
GRANT EXECUTE ON FUNCTION private.can_read_preschool_cover_signature_storage(text,text)
  TO authenticated;
REVOKE EXECUTE ON FUNCTION private.can_read_preschool_cover_signature_storage(text,text)
  FROM anon,PUBLIC;
