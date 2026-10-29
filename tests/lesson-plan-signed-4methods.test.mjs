import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {signatureOptionsHtml,SIGNATURE_METHODS} from "../signature-standard.js";
const app=readFileSync(new URL("../app.js",import.meta.url),"utf8");
const sql=readFileSync(new URL("../supabase-lesson-plan-signed-20261030.sql",import.meta.url),"utf8");
const start=app.indexOf("function reviewModal(role)");
const end=app.indexOf("\nfunction ",start+14);
const ui=app.slice(start,end);
test("lesson plan review presents all four signature modes before approval",()=>{
 const html=signatureOptionsHtml("stored");
 for(const option of SIGNATURE_METHODS)assert.match(html,new RegExp('value="'+option.id+'"'));
 assert.match(ui,/id="review-method"/);
 assert.match(ui,/modeSelect\.addEventListener\("change",filterSignatures\)/);
 assert.match(ui,/const method=d==="approve"\?modeSelect\.value:"paper"/);
});
test("lesson plan signatures have source/identity checks and retain approval role guards",()=>{
 for(const f of ["head_review_lesson_plan_signed","director_review_lesson_plan_signed"]){
  assert.match(sql,new RegExp('FUNCTION public\\.'+f));
  assert.match(ui,new RegExp('"'+f+'"'));
 }
 assert.match(sql,/p_method='paper' and p_signature_id is not null/);
 assert.match(sql,/p_method<>'paper' and p_signature_id is null/);
 assert.match(sql,/s\.user_id=auth\.uid\(\)/);
 assert.match(sql,/private\.approval_slot_available/);
 assert.match(sql,/signature_method=p_method/);
 assert.match(sql,/CASE WHEN p_method='paper' THEN NULL ELSE p_signature_id END/);
});
test("lesson plan paper approval records a decision without pretending to create digital signature image",()=>{
 assert.match(sql,/approval_document_slots_signature_method_check/);
 assert.match(ui,/const signatureId=d==="approve"&&method!=="paper"/);
 assert.match(sql,/p_method<>'paper' then/);
});
