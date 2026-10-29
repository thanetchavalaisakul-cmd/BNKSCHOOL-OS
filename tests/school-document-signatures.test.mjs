import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const app=readFileSync(new URL("../app.js",import.meta.url),"utf8");
const ui=readFileSync(new URL("../document-signatures.js",import.meta.url),"utf8");
const sql=readFileSync(new URL("../supabase-school-document-signatures-20261029.sql",import.meta.url),"utf8");

test("leave and substitute documents offer personalized signing in A4 preview",()=>{
  assert.match(app,/id="leave-a4-sign"/);
  assert.match(app,/id="sub-doc-sign"/);
  assert.match(app,/data-substitute-sign/);
  assert.match(app,/schoolDocumentSignatureImages\(supabase,"leave",request\.id\)/);
  assert.match(app,/schoolDocumentSignatureImages\(supabase,"substitute",leaveRequestId,leaveDate\)/);
  assert.match(app,/docImages\.personnel_head/);
  assert.match(app,/docImages\["substitute:"\+r\.id\]/);
});
test("four signature methods never grant approval rights",()=>{
  for(const method of ["stored","drawn","upload","paper"]){
    assert.ok(ui.includes('value="'+method+'"'),method);
    assert.ok(sql.includes("'"+method+"'"),method);
  }
  assert.match(ui,/rpc\("my_school_document_signing_slots"/);
  assert.match(ui,/rpc\("set_school_document_signature"/);
  assert.doesNotMatch(ui,/director_review_leave_request|mark_approval_slot|submit_leave_request/);
});
test("database requires actual signer and leaves other users' signatures untouched",()=>{
  assert.match(sql,/private\.is_active_user\(\)/);
  assert.match(sql,/s\.user_id=auth\.uid\(\)/);
  assert.match(sql,/signer_user_id=EXCLUDED\.signer_user_id/);
  assert.match(sql,/v_leave\.personnel_reviewer_id=auth\.uid\(\)/);
  assert.match(sql,/v_leave\.director_reviewer_id=auth\.uid\(\)/);
  assert.match(sql,/l\.substitute_teacher_id=auth\.uid\(\)/);
  assert.match(sql,/h\.teacher_id=auth\.uid\(\)/);
  assert.match(sql,/DROP POLICY IF EXISTS signatures_read_school_documents/);
  assert.match(sql,/REVOKE ALL ON public\.school_document_signatures FROM PUBLIC,anon/);
});
test("changes to substitute assignment invalidate previous signature snapshots",()=>{
  assert.match(sql,/invalidate_changed_substitute_document_signatures/);
  assert.match(sql,/OLD\.substitute_teacher_id IS DISTINCT FROM NEW\.substitute_teacher_id/);
  assert.match(sql,/document_kind='substitute'/);
});
