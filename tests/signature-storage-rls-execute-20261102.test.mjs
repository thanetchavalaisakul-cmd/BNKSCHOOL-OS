import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const sql=readFileSync(new URL("../supabase/migrations/20261102_restore_signature_storage_policy_execute.sql",import.meta.url),"utf8");
const policy=readFileSync(new URL("../supabase/migrations/20261102_preschool_cover_signatures_central.sql",import.meta.url),"utf8");
test("Storage RLS helper is executable by authenticated role without permitting anonymous use",()=>{
 assert.match(sql,/GRANT EXECUTE ON FUNCTION private\.can_read_preschool_cover_signature_storage\(text,text\)\s+TO authenticated/);
 assert.match(sql,/REVOKE EXECUTE ON FUNCTION private\.can_read_preschool_cover_signature_storage\(text,text\)\s+FROM anon,PUBLIC/);
 assert.match(policy,/private\.can_read_preschool_cover_signature_storage\(bucket_id,name\)/);
});
test("document-level membership check remains enforced for saved signature reads",()=>{
 assert.match(policy,/private\.can_read_preschool_cover_signature\(g\.id\)/);
 assert.match(policy,/m\.acknowledged_at IS NOT NULL/);
 assert.doesNotMatch(sql,/GRANT .* ON TABLE storage\.objects/i);
});
