import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const app=readFileSync(new URL("../app.js",import.meta.url),"utf8");
const events=readFileSync(new URL("../modules/dashboard-events.js",import.meta.url),"utf8");
const db=readFileSync(new URL("../supabase/migrations/20261102_preschool_leave_linked_signatures.sql",import.meta.url),"utf8");
test("approved leave is sole approval source for preschool substitute cover",()=>{
 assert.match(db,/l\.status='approved'/);
 assert.match(db,/d\.document_kind='leave'/);
 assert.match(db,/d\.slot_code IN \('requester','director'\)/);
 assert.match(db,/l\.director_reviewed_at IS NOT NULL/);
 assert.doesNotMatch(db,/CREATE OR REPLACE FUNCTION public\.director_review_leave_request/);
 assert.doesNotMatch(app,/data-preschool-director-approve/);
});
test("PDF reuses leave requester and director signed images without new approval",()=>{
 assert.match(app,/get_preschool_cover_linked_signatures/);
 assert.match(app,/linkedImage\("requester"\)/);
 assert.match(app,/linkedImage\("director"\)/);
 assert.match(app,/อ้างอิงการอนุมัติการลา ไม่ต้องอนุมัติสอนแทนซ้ำ/);
 assert.match(app,/class="ps-doc-signed-image"/);
 assert.match(app,/signatureByTeacher/);
});
test("stage and academic heads acknowledge with selected central signature, without reapproving leave",()=>{
 assert.match(db,/ELSIF p_kind='preschool' THEN/);
 for(const slot of ["stage_head","academic_head"])assert.match(db,new RegExp("'"+slot+"'::text"));
 assert.match(app,/preschoolCoverChooseSignature\("รับทราบและลงนามในใบฝากดูแล"\)/);
 assert.match(app,/supabase\.rpc\("set_school_document_signature"/);
 assert.match(app,/p_kind:"preschool"/);
 assert.match(app,/data-preschool-endorse/);
 assert.match(events,/preschoolCoverEndorse\(btn\.dataset\.preschoolEndorse,btn\.dataset\.endorseSlot,btn\)/);
});
test("PDF pulls only proven original approval and independently signed acknowledgement assets",()=>{
 assert.match(db,/get_preschool_cover_linked_signatures\(p_cover_id uuid\)/);
 assert.match(db,/d\.method<>'paper'/);
 assert.match(db,/d\.signed_at IS NOT NULL/);
 assert.match(db,/private\.can_view_preschool_cover_document\(g\.id\)/);
 assert.match(db,/REVOKE ALL ON FUNCTION private\.can_read_preschool_cover_linked_signature_storage\(text,text\)/);
 assert.match(db,/GRANT EXECUTE ON FUNCTION private\.can_read_preschool_cover_linked_signature_storage\(text,text\)/);
 assert.match(db,/CREATE POLICY bnk_preschool_cover_linked_leave_signatures_select/);
});

