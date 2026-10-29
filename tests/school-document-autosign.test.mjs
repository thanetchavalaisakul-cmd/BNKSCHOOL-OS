import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const app=readFileSync(new URL("../app.js",import.meta.url),"utf8");
const client=readFileSync(new URL("../document-signatures.js",import.meta.url),"utf8");
const autosign=readFileSync(new URL("../supabase-school-document-autosign-20261029.sql",import.meta.url),"utf8");

test("auto-sign preferences are consumed before each existing leave/substitute PDF preview",()=>{
 assert.match(client,/rpc\("refresh_school_document_auto_signatures"/);
 assert.match(client,/p_kind:kind,p_doc:docId,p_day:date/);
 assert.match(app,/schoolDocumentSignatureImages\(supabase,"leave",request\.id(?:,null,toast)?\)/);
 assert.match(app,/schoolDocumentSignatureImages\(supabase,"substitute",leaveRequestId,leaveDate(?:,toast)?\)/);
});
test("auto-bind uses only explicit personal opted-in profile and server-controlled signature",()=>{
 assert.match(autosign,/private\.personal_auto_sign_for_system\(c\.uid,v_system\)/);
 assert.match(autosign,/private\.personal_auto_sign_for_system\(c\.uid,v_system\)/);
 assert.match(autosign,/private\.signature_preference_default_id\(c\.uid\)/);
 assert.match(autosign,/WHERE c\.uid IS NOT NULL/);
 assert.match(autosign,/ON CONFLICT\(document_kind,document_id,document_date,slot_code\) DO NOTHING/);
 assert.match(autosign,/private\.can_view_school_document_signatures\(p_kind,p_doc,v_day\)/);
});
test("autosign does not approve leave or substitute documents",()=>{
 assert.doesNotMatch(autosign,/mark_approval_slot|director_review_leave_request|approve_director|update public\.leave_requests/);
 assert.match(autosign,/v_leave\.personnel_reviewed_at IS NOT NULL/);
 assert.match(autosign,/v_leave\.director_reviewed_at IS NOT NULL/);
 assert.match(autosign,/l\.status<>'assigned'/);
 assert.match(autosign,/ADD COLUMN IF NOT EXISTS automatic boolean NOT NULL DEFAULT false/);
});
test("signing controls are available without printing PDF first",()=>{
 assert.match(app,/id="leave-sign-now"/);
 assert.match(app,/id="sign-substitute-day"/);
 assert.match(app,/id="leave-a4-sign"/);
 assert.match(app,/id="sub-doc-sign"/);
});
