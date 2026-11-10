import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const migration = await readFile(
  new URL("../supabase/migrations/20261110231406_optimize_payment_evidence_permissions_rls.sql", import.meta.url),
  "utf8"
);

test("payment evidence permission RLS evaluates auth and admin helpers once per statement", () => {
  assert.ok(migration.includes("user_id = (SELECT auth.uid())"));
  assert.ok(migration.includes("OR (SELECT private.is_super_admin())"));
  assert.ok(migration.includes("WITH CHECK ((SELECT private.is_super_admin()))"));
  assert.ok(migration.includes("USING ((SELECT private.is_super_admin()))"));
});
