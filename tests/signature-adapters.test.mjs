import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {SIGNATURE_METHODS,signatureOptionsHtml,assertSignatureMethod} from "../signature-standard.js";
const app=readFileSync(new URL("../app.js",import.meta.url),"utf8");
const workflow=readFileSync(new URL("../workflow-signing.js",import.meta.url),"utf8");
const school=readFileSync(new URL("../document-signatures.js",import.meta.url),"utf8");

test("the same four signature options are available to every shared modal",()=>{
 const html=signatureOptionsHtml();
 for(const method of SIGNATURE_METHODS){
  assert.equal((html.match(new RegExp('value="'+method.id+'"','g'))||[]).length,1);
 }
 assert.match(workflow,/signatureOptionsHtml\(\)/);
 assert.match(school,/signatureOptionsHtml\(\)/);
 assert.match(workflow,/assertSignatureMethod\(selectedMethod/);
 assert.match(school,/assertSignatureMethod\(mode\)/);
});

test("paper is not accepted as online approval, but can be chosen for physical signature",()=>{
 assert.equal(assertSignatureMethod("paper").online,false);
 assert.throws(()=>assertSignatureMethod("paper",{requireOnline:true}),/ไม่ใช่การรับรองออนไลน์/);
 assert.equal(assertSignatureMethod("stored",{requireOnline:true}).online,true);
 assert.equal(assertSignatureMethod("upload",{requireOnline:true}).online,true);
 assert.equal(assertSignatureMethod("drawn",{requireOnline:true}).online,true);
 assert.throws(()=>assertSignatureMethod("bad-method"),/ไม่ถูกต้อง/);
 assert.match(workflow,/requireOnlineApproval=false/);
 assert.match(app,/requireOnlineApproval:decision==="approve"/);
});

test("budget request confirmation validates the freshly selected method",()=>{
 for(const method of ["drawn","upload","stored"])
  assert.match(app,new RegExp('await confirmSigner\\("'+method+'"\\)'));
 assert.match(app,/await confirmSigner\(assignment\.method\)/);
 assert.match(app,/assertSignatureMethod\(mode,\{requireOnline:true\}\)/);
 assert.match(app,/s\.approved_at&&s\.method!=="paper"/);
});

test("six academic signature save functions use the common four-method guard",()=>{
 const names=[
  "postLessonSaveDirectSignature","lessonUsageSaveSignature","learningMediaSaveSignature",
  "classroomResearchSaveSignature","learnerActivitySaveSignature","clubActivitySaveSignature"
 ];
 for(const name of names){
  const line=app.split("\n").find(s=>s.startsWith("async function "+name+"("));
  assert.ok(line,"missing "+name);
  assert.ok(line.includes("{assertSignatureMethod(method);"),"shared guard missing from "+name);
 }
});

test("signature audit remains evidence-based; no system is auto-marked verified",()=>{
 const audit=readFileSync(new URL("../signature-compliance.js",import.meta.url),"utf8");
 assert.match(audit,/review_signature_compliance/);
 assert.match(audit,/get_signature_compliance_overview/);
 assert.doesNotMatch(app,/fully_verified\s*=\s*true/);
});
