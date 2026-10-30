import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const app=readFileSync(new URL("../app.js",import.meta.url),"utf8");
const foundation=readFileSync(new URL("../supabase-bnk-signed-action-foundation-20261030.sql",import.meta.url),"utf8");
const guard=readFileSync(new URL("../supabase-bnk-signed-action-enforcement-20261030.sql",import.meta.url),"utf8");
test("four-method explicit signatures precede lesson plan and all registration submissions",()=>{
 for(const code of ["lesson_plans","academic_certificate","academic_document_service","academic_transfer"])
  assert.match(app,new RegExp('p_system_code:"'+code+'"'));
 assert.match(app,/submit_bnk_document_signed/);
 assert.doesNotMatch(app,/supabase\.rpc\("submit_lesson_plan",/);
 assert.doesNotMatch(app,/supabase\.rpc\("submit_academic_transfer_request",/);
 assert.doesNotMatch(app,/supabase\.rpc\("submit_academic_certificate_request",/);
 assert.doesNotMatch(app,/supabase\.rpc\("submit_academic_document_service_request",/);
});
test("PA workflow, home visits, budget, substitute use signed action gate",()=>{
 for(const action of ["pa_start","pa_end","pa_assess","complete","document_ready"])
  assert.ok(app.includes('"'+action+'"'),action);
 assert.match(app,/record_bnk_action_signature/);
 assert.match(app,/assign_bnk_substitute_signed/);
 assert.match(foundation,/p_action_code=\x27assign\x27/);
 assert.match(app,/personnelPa2EvaluatorProfileComplete.*signature_method==="paper"/);
});
test("timetable own Auto Sign, no approval requirement",()=>{
 assert.match(app,/bnkOwnTimetableSignatureAsset/);
 assert.match(app,/teacherId===state\.user\?\.id\?assets\.teacherSignature\?\.image:null/);
 assert.match(app,/prefs\?\.auto_sign_enabled/);
});
test("DB enforces signed transitions at origin, records paper separately",()=>{
 assert.match(foundation,/CREATE OR REPLACE FUNCTION public\.record_bnk_action_signature/);
 assert.match(guard,/CREATE OR REPLACE FUNCTION private\.bnk_require_preaction_signature/);
 for(const tab of ["lesson_plans","academic_transfer_requests","personnel_pa_assessments","budget_disbursements","home_visit_records","substitute_lessons"])
  assert.ok(guard.includes("'"+tab+"'"),tab);
 assert.match(guard,/approved_at=now\(\)/);
 assert.match(guard,/signed_at=CASE WHEN sig\.method='paper' THEN NULL/);
});
