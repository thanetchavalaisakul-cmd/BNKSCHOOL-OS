import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const app=readFileSync(new URL("../app.js",import.meta.url),"utf8");
const budgetStyles=app.slice(app.indexOf("function budgetPdfStyles()"),app.indexOf("function docSign(",app.indexOf("function budgetPdfStyles()")));
const budgetPdf=app.slice(app.indexOf("async function budgetRequestPdfPreview(r)"),app.indexOf("function openPrintPreview(",app.indexOf("async function budgetRequestPdfPreview(r)")));

test("planning staff has its own field in the existing single signer modal",()=>{
 assert.match(app,/id="configure-budget-signers">เลือกผู้ลงนาม \/ กรรมการ/);
 assert.doesNotMatch(app,/id="choose-plan-budget-signer"/);
 assert.match(app,/name="plan_budget"/);
 assert.match(app,/name="plan_staff"/);
 assert.match(app,/plan_budget:"หัวหน้ากลุ่มงานบริหารแผนและงบประมาณ"/);
 assert.match(app,/plan_staff:"ฝ่ายแผนงาน"/);
 assert.match(app,/if\(slot==="plan_staff"\)return people\.filter\(x=>x\.role!=="pa_evaluator"\)/);
 assert.match(app,/\["department_head","plan_budget","plan_staff","director","inspector1"/);
 assert.match(app,/set_budget_signer_assignments/);
});

test("budget request A4 uses compact, flowable layout without touching procurement print templates",()=>{
 assert.match(budgetStyles,/@page\{size:A4 portrait;margin:8mm 9mm\}/);
 assert.match(budgetStyles,/\.a4-document\{width:192mm;min-height:0/);
 assert.match(budgetStyles,/\.budget-doc-sign-space\{height:7mm\}/);
 assert.match(budgetStyles,/\.budget-doc-sign\{min-height:0/);
 assert.match(budgetStyles,/\.budget-line-pdf-table thead\{display:table-header-group\}/);
 assert.match(budgetStyles,/\.budget-line-pdf-table tr\{break-inside:avoid/);
 assert.match(budgetStyles,/\.budget-doc-inspectors\{gap:2mm/);
 assert.doesNotMatch(budgetStyles,/page-break-after:always/);
 assert.match(budgetStyles,/\.budget-doc-director\{width:50%;margin:2mm auto 0/);
 const sig=(slot)=>budgetPdf.slice(budgetPdf.indexOf("const body=")).indexOf("sigMap."+slot);
 assert.ok(sig("plan_budget")<sig("plan_staff"));
 assert.ok(sig("plan_staff")<sig("inspector1"));
 assert.ok(sig("inspector3")<sig("director"));
 assert.match(budgetPdf,/<div class="budget-doc-director">/);
 for(const slot of ["requester","department_head","plan_budget","plan_staff","inspector1","inspector2","inspector3","director"]){
   assert.ok(budgetPdf.includes("sigMap."+slot),"Missing PDF signature: "+slot);
 }
});
