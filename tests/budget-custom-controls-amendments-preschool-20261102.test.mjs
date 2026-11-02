import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const app=readFileSync(new URL("../app.js",import.meta.url),"utf8");
const events=readFileSync(new URL("../modules/dashboard-events.js",import.meta.url),"utf8");
const sql=readFileSync(new URL("../supabase/migrations/20261102_budget_custom_controls_and_amendments.sql",import.meta.url),"utf8");
test("custom budget control groups are separately numbered",()=>{
 assert.match(app,/function budgetControlKey\(project\)/);
 assert.match(app,/other:.*department_custom/);
 assert.match(app,/budgetControlSetting\(budgetControlKey\(p\)\)/);
 assert.match(app,/b\.control_group_key\|\|b\.department_code/);
 assert.match(sql,/new\.control_group_key:=v_control_key/);
 assert.match(sql,/coalesce\(control_group_key,department_code\)/);
});
test("approved requests preserve original identities and audit amendments",()=>{
 assert.match(app,/function budgetRequestEditModal\(r\)/);
 assert.match(app,/id="budget-request-edit"/);
 assert.match(events,/budgetRequestEditModal\(r\)/);
 assert.match(app,/\.eq\("updated_at",r\.updated_at\)/);
 assert.match(sql,/new\.control_number:=old\.control_number/);
 assert.match(sql,/CREATE TABLE IF NOT EXISTS public\.budget_disbursement_amendments/);
 assert.match(sql,/old\.status IN \('document_ready','printed','paid'\)/);
 assert.match(sql,/new\.amendment_count:=old\.amendment_count\+1/);
 assert.match(app,/เอกสารฉบับแก้ไข ครั้งที่/);
});
test("preschool substitute cover uses A4 landscape single page design",()=>{
 const a=app.indexOf("function preschoolCoverDocStyles()");
 const b=app.indexOf("// Names come from existing personnel",a);
 assert.ok(a>0&&b>a);
 const css=app.slice(a,b);
 assert.match(css,/@page\{size:A4 landscape;margin:7mm/);
 assert.match(css,/grid-template-columns:repeat\(4,minmax\(0,1fr\)\)/);
 assert.match(app,/A4 แนวนอน · 1 หน้า · TH SarabunIT๙/);
 for(const slot of ["requester","stage_head","academic_head","director"])assert.ok(app.includes('linkedImage("'+slot+'")'));
});
