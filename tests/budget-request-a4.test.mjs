import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const app=readFileSync(new URL("../app.js",import.meta.url),"utf8");
const budgetStyles=app.slice(app.indexOf("function budgetPdfStyles()"),app.indexOf("function docSign(",app.indexOf("function budgetPdfStyles()")));
const budgetPdf=app.slice(app.indexOf("async function budgetRequestPdfPreview(r)"),app.indexOf("function openPrintPreview(",app.indexOf("async function budgetRequestPdfPreview(r)")));

test("plan and budget head can be selected from a dedicated button without changing other approvers",()=>{
 assert.match(app,/id="choose-plan-budget-signer">เลือกชื่อฝ่ายแผนงาน/);
 assert.match(app,/budgetSignersModal\(r,"plan_budget"\)/);
 assert.match(app,/select\[name="plan_budget"\]/);
 assert.match(app,/name="plan_budget"/);
 assert.match(app,/assignments\[k\]=d\.get\(k\)\|\|null/);
 assert.match(app,/budgetPeopleForSlot\(r,"plan_budget"\)/);
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
 for(const slot of ["requester","department_head","plan_budget","director","inspector1","inspector2","inspector3"]){
   assert.ok(budgetPdf.includes("sigMap."+slot),"Missing PDF signature: "+slot);
 }
});
