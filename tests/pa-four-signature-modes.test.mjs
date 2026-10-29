import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const app=readFileSync(new URL("../app.js",import.meta.url),"utf8");
const sql=readFileSync(new URL("../supabase-pa-evaluator-four-method-20261030.sql",import.meta.url),"utf8");
const a=app.indexOf("function personnelPaEvaluatorProfileModal(");
const ui=app.slice(a,app.indexOf("\nfunction ",a+30));
test("PA evaluator has four signature method choices prior to saving",()=>{
 for(const mode of ["draw","upload","stored","paper"])
  assert.match(ui,new RegExp('data-pa-signature-mode="'+mode+'"'));
 assert.match(ui,/save_my_personnel_pa_evaluator_profile_signed/);
 assert.match(ui,/window\.confirm\("ยืนยันเลือกเซ็น PA2 บนกระดาษ/);
});
test("paper PA assessment records evaluator and timestamp while PDF signature stays blank",()=>{
 assert.match(sql,/signature_method=p_method/);
 assert.match(sql,/p_method='paper'/);
 assert.match(sql,/new\.evaluator_signature_method_snapshot/);
 assert.match(sql,/COALESCE\(v_account\.signature_method,'upload'\)<>'paper'/);
 assert.match(sql,/Paper selection cannot contain a digital signature/);
});
test("PA saved signatures are owned by evaluator and submitted assessments keep immutable image snapshot",()=>{
 assert.match(sql,/s\.id=p_signature_id AND s\.user_id=v_uid/);
 assert.match(sql,/pa_evaluator_saved_signature_view/);
 assert.match(sql,/a\.status='submitted'/);
 assert.match(sql,/NOT EXISTS\(SELECT 1 FROM public\.personnel_pa_assessments/);
});
