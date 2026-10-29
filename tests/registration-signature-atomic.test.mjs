import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {SIGNATURE_METHODS,signatureMethodButtonsHtml,assertSignatureMethod} from "../signature-standard.js";
const app=readFileSync(new URL("../app.js",import.meta.url),"utf8");
const sql=readFileSync(new URL("../supabase-academic-registration-signature-atomic-20261030.sql",import.meta.url),"utf8");
const parts=Object.fromEntries(["academicDocumentServiceReviewModal","academicCertificateReviewModal","academicTransferReviewModal"].map(name=>{
 const a=app.indexOf("function "+name+"("),b=app.indexOf("\nfunction ",a+10);
 return [name,app.slice(a,b)];
}));

test("three registration documents use one four-method UI including stored signatures",()=>{
 for(const name of Object.keys(parts)){
  const part=parts[name];
  assert.match(part,/signatureMethodButtonsHtml/);
  assert.match(part,/academicRegistrationSavedSignaturePicker/);
  assert.match(part,/review_academic_registration_signed/);
  assert.match(part,/assertSignatureMethod\(method\)/);
 }
 for(const attr of ["data-ds-sign","data-cert-sign","data-transfer-sign-method"]){
  const markup=signatureMethodButtonsHtml(attr);
  for(const method of SIGNATURE_METHODS)assert.match(markup,new RegExp(attr+'="'+method.id+'"'));
 }
 assert.throws(()=>signatureMethodButtonsHtml("onclick"),/Invalid/);
 assert.equal(assertSignatureMethod("paper").online,false);
});

test("review and signing are atomic across all three registration workflows",()=>{
 assert.match(sql,/CREATE OR REPLACE FUNCTION public\.review_academic_registration_signed/);
 for(const x of ["academic_certificate","academic_document_service","academic_transfer"]){
  assert.match(sql,new RegExp("PERFORM public\\.set_"+x+"_review"));
  assert.match(sql,new RegExp("PERFORM public\\.set_"+x+"_signature"));
 }
 assert.match(sql,/ONE transaction/);
 assert.match(sql,/private\.can_review_certificate_request_slot/);
 assert.match(sql,/private\.can_review_transfer_request_slot/);
 assert.match(sql,/private\.can_review_academic_document_service_slot/);
});

test("saved signature must belong to the signer and be a real storage file",()=>{
 assert.match(sql,/s\.id=p_signature_id AND s\.user_id=auth\.uid\(\)/);
 assert.match(sql,/o\.bucket_id=v_master\.bucket_id AND o\.name=v_master\.storage_path/);
 assert.match(sql,/master_signature_id=\$4/);
 assert.match(sql,/academic_registration_master_signature_asset_read/);
 assert.match(sql,/private\.can_view_certificate_request/);
 assert.match(sql,/private\.can_view_transfer_request/);
 assert.match(sql,/private\.can_view_academic_document_service_request/);
});

test("paper choices approve/review while retaining a blank PDF signature field",()=>{
 assert.match(sql,/p_method='paper'/);
 assert.match(sql,/Paper approval must have no electronic signature/);
 assert.match(sql,/method='paper' AND storage_path IS NULL/);
 assert.match(app,/async function academicRegistrationSavedSignaturePicker/);
 for(const name of Object.keys(parts)){
  assert.match(parts[name],/if\(method==="paper"\)/);
  assert.match(parts[name],/p_decision/);
 }
});

test("legacy academic review calls are absent from three modal submit actions",()=>{
 for(const name of Object.keys(parts)){
  const part=parts[name];
  assert.doesNotMatch(part,/rpc\("set_academic_(?:certificate|document_service|transfer)_review"/);
  assert.doesNotMatch(part,/rpc\("set_academic_(?:certificate|document_service|transfer)_signature"/);
 }
 assert.match(app,/signatureMethodButtonsHtml\("data-ds-sign"\)/);
 assert.match(app,/signatureMethodButtonsHtml\("data-cert-sign"\)/);
 assert.match(app,/signatureMethodButtonsHtml\("data-transfer-sign-method"\)/);
});
