import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const app=readFileSync(new URL("../app.js",import.meta.url),"utf8");
const sql=readFileSync(new URL("../supabase-budget-parallel-signers-20261029.sql",import.meta.url),"utf8");
const modal=app.slice(app.indexOf("function budgetSignerActionModal(r,slot)"),app.indexOf("function projectPdfStyles()",app.indexOf("function budgetSignerActionModal(r,slot)")));

test("eight signers remain independent and online approval has a separate timestamp",()=>{
 for(const slot of ["requester","department_head","plan_budget","plan_staff","inspector1","inspector2","inspector3","director"]){
   assert.match(app,new RegExp(''+slot));
 }
 assert.match(app,/approved_at/);
 assert.match(sql,/ADD COLUMN IF NOT EXISTS approved_at/);
 assert.match(sql,/FOR UPDATE/);
 assert.match(sql,/v_signer\.user_id IS DISTINCT FROM auth\.uid\(\)/);
 assert.match(sql,/count\(\*\).*?FROM public\.budget_disbursement_signers/s);
 assert.match(sql,/\)=8 THEN/);
});

test("signature options require own explicit acknowledgement and protect inspection",()=>{
 for(const method of ["paper","drawn","upload","stored"])assert.match(modal,new RegExp('data-budget-sign-method="'+method+'"'));
 assert.match(modal,/confirm_budget_signer/);
 assert.match(modal,/ensureInspected/);
 assert.match(modal,/budget-inspection-confirmed/);
 assert.match(modal,/await confirmSigner\("stored"\)/);
 assert.match(modal,/ยืนยันรับรองด้วยลายเซ็นเดิม/);
 assert.match(sql,/p_inspection_confirmed IS DISTINCT FROM TRUE/);
 assert.match(sql,/v_signer\.method NOT IN \('drawn','upload','stored'\)/);
 assert.match(sql,/approved_at := NULL/);
});

test("parallel inbox and alerts expose pending requests without touching procurement",()=>{
 assert.match(app,/function budgetSignerInboxHtml/);
 assert.match(app,/budgetSignerInboxHtml\(\)\+projectMineHtml\(\)/);
 assert.match(app,/ดำเนินการรับรองแล้ว/);
 assert.match(sql,/budget_signer_assignment_notice/);
 assert.match(sql,/budget_signer_ready_notice/);
 assert.match(sql,/budget_signatures_complete/);
 assert.doesNotMatch(sql,/UPDATE public\.procurement_document_cases/);
 assert.match(app,/autoDirector&&assignments\.some\(s=>s\.slot==="director"&&s\.approved_at&&s\.method!=="paper"\)/);
});
