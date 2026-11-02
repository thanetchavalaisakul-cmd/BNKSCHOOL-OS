import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const app=readFileSync(new URL("../app.js",import.meta.url),"utf8");
const sql=readFileSync(new URL("../supabase/migrations/20261102_registration_pending_visibility.sql",import.meta.url),"utf8");
test("approved school staff can view requests without bypassing the signature sequence",()=>{
 for(const field of ["finance_user_id","preparer_user_id","registrar_user_id","assessment_user_id","director_user_id"])assert.ok(sql.includes(field));
 for(const code of ["academic_transfer","academic_certificate","academic_document_service"])assert.ok(sql.includes("'"+code+"'"));
 for(const f of ["can_view_transfer_request","can_view_certificate_request","can_view_academic_document_service_request"])assert.ok(sql.includes(f));
 assert.ok(sql.includes("private.can_view_registration_assigned_workflow("));
 assert.ok(sql.includes("submitted"));
 assert.ok(sql.includes("rejected"));
 assert.ok(!sql.includes("CREATE OR REPLACE FUNCTION private.can_review_"));
});
test("assigned reviewers see submitted requests from other terms in all 3 registration sections",()=>{
 for(const [list,method] of [["academicTransferRequests","academicTransferCanReviewSlotUi"],["academicCertificateRequests","academicCertificateCanReviewSlotUi"],["academicDocumentServiceRequests","academicDocumentServiceCanReviewSlotUi"]]){
   const start=app.indexOf("(state."+list+"||[]).filter(");
   assert.ok(start>0,list);
   const filter=app.slice(start,start+350);
   assert.ok(filter.includes("r.status==='submitted'"),list);
   assert.ok(filter.includes(method+"(slot)"),list);
 }
});
test("review cards show why a draft or out-of-turn request cannot yet be signed",()=>{
 assert.equal(app.split("รอการตรวจอนุมัติขั้นก่อนหน้า").length-1,3);
 assert.equal(app.split("ยังไม่ยื่นคำร้อง").length-1>=3,true);
 for(const attr of ["data-academic-transfer-review","data-academic-certificate-review","data-document-service-review"])assert.ok(app.includes(attr),attr);
});
test("previous approval RPC and signature workflow is not widened",()=>{
 assert.ok(app.includes("academicCertificateReviewModal("));
 assert.ok(app.includes("academicTransferReviewModal("));
 assert.ok(app.includes("academicDocumentServiceReviewModal("));
 assert.ok(!sql.includes("CREATE OR REPLACE FUNCTION private.can_review_certificate_request_slot"));
 assert.ok(!sql.includes("CREATE OR REPLACE FUNCTION public.review_academic_registration_signed"));
});
