# Incident — BNK SCHOOL OS signature images blank across PDF modules (2 November 2026)

## Confirmed cause
The policy `bnk_preschool_acknowledged_signatures_read` on `storage.objects` used the function `private.can_read_preschool_cover_signature_storage(text,text)`. The function was `SECURITY DEFINER`, but `EXECUTE` had been revoked from `authenticated` during a previous preschool-signature migration. The Storage service reported **Postgres 42501 / AccessDenied**: `permission denied for function can_read_preschool_cover_signature_storage` on **both** `/object/info/signatures/...` and `/object/info/budget-signatures/...` accesses. Storage logs contained 68 matching failures within the observed period.

## Verification before fix
58 saved signature rows, 58 corresponding storage objects (none missing). Leave/substitute school-document signature references: 40 persisted images and 40 matching storage objects. The files were intact.

## Production fix
Applied database migration `bnk_restore_signatures_storage_rls_authenticated_execution_20261102`. Grant `EXECUTE` on the policy helper to `authenticated` only; `anon` and `PUBLIC` remain denied. The helper's existing internal checks remain unchanged.

## Verification after fix
- `has_function_privilege(authenticated, ..., EXECUTE)` = TRUE.
- `has_function_privilege(anon, ..., EXECUTE)` = FALSE.
- With the SQL role switched to `authenticated` and a legitimate signer's user ID in the JWT claim, `SELECT` from `storage.objects` returned 1 for the signer's own `signatures` asset.
- Similar authenticated-role checks returned 1 for a signed `budget-signatures` asset and an approved substitute's `signatures` asset.
- No signature tables or existing approval/acknowledgement timestamps were modified.

## Remaining acceptance check
Use a real user session to open previously signed PDF in preschool, substitute and budget systems. Backend access tests show storage policy no longer raises the global 42501 but cannot alone prove every PDF renderer embeds the image correctly.

## Prevent recurrence
Never create a policy expression invoking a function without verifying executable permissions for every role targeted by the policy. A policy that throws an ACL error can disrupt unrelated buckets despite seemingly restrictive `bucket_id` predicates.
