-- Existing workflow-document storage SELECT policy must be executable by active signed-in users.
-- The function checks per-document visibility and returns only a boolean.
REVOKE ALL ON FUNCTION private.can_view_workflow_signature_storage(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.can_view_workflow_signature_storage(text) TO authenticated;