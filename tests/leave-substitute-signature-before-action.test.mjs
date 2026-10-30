import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const app=readFileSync(new URL("../app.js",import.meta.url),"utf8")+"\n"+readFileSync(new URL("../modules/dashboard-events.js",import.meta.url),"utf8");
const ui=readFileSync(new URL("../workflow-signing.js",import.meta.url),"utf8");
const sql=readFileSync(new URL("../supabase-leave-substitute-action-signatures-20261029.sql",import.meta.url),"utf8");
const grant=readFileSync(new URL("../supabase-workflow-storage-execute-fix-20261029.sql",import.meta.url),"utf8");

test("all leave transitions require selecting a signature before backend action",()=>{
  assert.match(app,/withWorkflowSignature\(/);
  assert.match(app,/submit_leave_request_signed/);
  assert.match(app,/personnel_review_leave_request_signed/);
  assert.match(app,/director_review_leave_request_signed/);
  assert.doesNotMatch(app,/supabase\.rpc\("submit_leave_request",/);
  assert.doesNotMatch(app,/supabase\.rpc\("personnel_review_leave_request",/);
  assert.doesNotMatch(app,/supabase\.rpc\("director_review_leave_request",/);
});
test("signature choice has all four methods and personal signature verification",()=>{
  for(const m of ["stored","drawn","upload","paper"])assert.ok(ui.includes("signatureOptionsHtml()")&&ui.includes("assertSignatureMethod(selectedMethod"),m);
  assert.match(ui,/get_my_signature_preferences/);
  assert.match(ui,/default_signature_id/);
  assert.match(ui,/onConfirm\(\{method:selectedMethod,signatureId\}\)/);
  assert.match(ui,/user_id:userId/);
});
test("leave transition plus signature writes are atomic and retain existing permissions",()=>{
  for(const fn of ["submit_leave_request_signed","personnel_review_leave_request_signed","director_review_leave_request_signed"])assert.ok(sql.includes("FUNCTION public."+fn));
  assert.match(sql,/v:=public\.submit_leave_request\(p_leave_request_id\)/);
  assert.match(sql,/v:=public\.personnel_review_leave_request\(p_leave_request_id,p_decision,p_comment\)/);
  assert.match(sql,/v:=public\.director_review_leave_request\(p_leave_request_id,p_decision,p_comment\)/);
  assert.match(sql,/PERFORM public\.set_school_document_signature/);
  assert.doesNotMatch(sql,/GRANT EXECUTE .*TO anon;/);
});
test("substitute acceptance comes from assigned teacher not a supervisor account",()=>{
  assert.match(sql,/v\.substitute_teacher_id<>auth\.uid\(\)/);
  assert.match(sql,/v\.status<>'assigned'/);
  assert.match(sql,/v_sig\.source<>p_method/);
  assert.match(sql,/p_method='paper'/);
  assert.match(app,/confirm_substitute_teacher_signed/);
});
test("storage-image policy is executable by signed-in users without giving anonymous access",()=>{
  assert.match(grant,/GRANT EXECUTE ON FUNCTION private\.can_view_workflow_signature_storage\(text\) TO authenticated/);
  assert.match(grant,/REVOKE ALL ON FUNCTION private\.can_view_workflow_signature_storage\(text\) FROM PUBLIC, anon/);
});
