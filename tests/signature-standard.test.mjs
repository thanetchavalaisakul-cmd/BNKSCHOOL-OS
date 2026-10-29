import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {SIGNATURE_METHODS,SIGNATURE_CHECKS,signatureAuditProgress,requiresOnlineSignatureConfirmation,canEmbedConfirmedSignature,verifySignatureAction} from "../signature-standard.js";

const app=readFileSync(new URL("../app.js",import.meta.url),"utf8");
const policy=readFileSync(new URL("../supabase-signature-compliance-20261030.sql",import.meta.url),"utf8");
const feature=readFileSync(new URL("../signature-compliance.js",import.meta.url),"utf8");

test("four modes are part of one reusable contract; paper is not online approval",()=>{
 assert.deepEqual(SIGNATURE_METHODS.map(x=>x.id),["paper","drawn","upload","stored"]);
 assert.equal(requiresOnlineSignatureConfirmation("paper"),false);
 for(const method of ["drawn","upload","stored"])assert.equal(requiresOnlineSignatureConfirmation(method),true);
 assert.equal(requiresOnlineSignatureConfirmation("bad"),false);
});

test("four independent verification gates only pass when all have test evidence",()=>{
 assert.equal(SIGNATURE_CHECKS.length,4);
 const partial={four_methods_verified:true,before_action_verified:true,identity_timestamp_verified:true};
 assert.deepEqual(signatureAuditProgress(partial),{passed:3,total:4,verified:false});
 assert.equal(signatureAuditProgress({...partial,pdf_verified:true}).verified,true);
 assert.equal(signatureAuditProgress({}).verified,false);
});

test("no signature may appear in PDF before approval of exactly its document",()=>{
 const doc={method:"stored",signedAt:"2026-10-30",confirmedAt:"2026-10-30",documentId:"d1",approvedDocumentId:"d1"};
 assert.equal(canEmbedConfirmedSignature(doc),true);
 assert.equal(canEmbedConfirmedSignature({...doc,method:"paper"}),false);
 assert.equal(canEmbedConfirmedSignature({...doc,confirmedAt:null}),false);
 assert.equal(canEmbedConfirmedSignature({...doc,approvedDocumentId:"other"}),false);
});

test("only the assigned signer can approve; paper never implies online approved",()=>{
 assert.throws(()=>verifySignatureAction({actorId:"u1",assignedUserId:"u2",method:"stored",documentId:"a",signatureDocumentId:"a",confirmedAt:"now"}));
 assert.throws(()=>verifySignatureAction({actorId:"u1",assignedUserId:"u1",method:"stored",documentId:"a",signatureDocumentId:"b",confirmedAt:"now"}));
 assert.throws(()=>verifySignatureAction({actorId:"u1",assignedUserId:"u1",method:"stored",documentId:"a",signatureDocumentId:"a",confirmedAt:null}));
 assert.equal(verifySignatureAction({actorId:"u1",assignedUserId:"u1",method:"paper",documentId:"a",signatureDocumentId:"a"}).onlineApproved,false);
});

test("the central admin dashboard is connected, without changing existing approval workflows",()=>{
 assert.match(app,/createSignatureComplianceFeature/);
 assert.match(app,/signatureComplianceFeature\.html\(\)/);
 assert.match(app,/signatureComplianceFeature\.bind\(\)/);
 assert.match(app,/signatureComplianceFeature\.load\(\)/);
 assert.match(feature,/get_signature_compliance_overview/);
 assert.match(feature,/review_signature_compliance/);
 assert.match(feature,/ไม่มีหลักฐาน|ตรวจหลักฐาน|ทดสอบ/);
 assert.match(policy,/AFTER INSERT ON public\.approval_system_registry/);
 assert.match(policy,/private\.is_super_admin\(\)/);
 assert.match(policy,/signature_compliance_audit/);
 assert.doesNotMatch(policy,/UPDATE public\.budget_disbursements|UPDATE public\.leave_requests/);
});
