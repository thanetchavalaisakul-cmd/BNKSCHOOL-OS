-- Evaluate stable identity and admin helpers once per RLS statement.
-- This preserves the same permission rules while avoiding per-row auth lookups.

DROP POLICY IF EXISTS payment_evidence_permissions_select ON public.payment_evidence_permissions;
CREATE POLICY payment_evidence_permissions_select
ON public.payment_evidence_permissions
FOR SELECT TO authenticated
USING (
  user_id = (SELECT auth.uid())
  OR (SELECT private.is_super_admin())
);

DROP POLICY IF EXISTS payment_evidence_permissions_insert ON public.payment_evidence_permissions;
CREATE POLICY payment_evidence_permissions_insert
ON public.payment_evidence_permissions
FOR INSERT TO authenticated
WITH CHECK ((SELECT private.is_super_admin()));

DROP POLICY IF EXISTS payment_evidence_permissions_update ON public.payment_evidence_permissions;
CREATE POLICY payment_evidence_permissions_update
ON public.payment_evidence_permissions
FOR UPDATE TO authenticated
USING ((SELECT private.is_super_admin()))
WITH CHECK ((SELECT private.is_super_admin()));
