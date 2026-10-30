import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const app=readFileSync(new URL("../app.js",import.meta.url),"utf8");
const sql=readFileSync(new URL("../supabase-budget-activity-owner-inspector-20261030.sql",import.meta.url),"utf8");
test("the budget inspector picker includes the actual activity owner who requested funds",()=>{
 assert.match(app,/function budgetRequesterCanInspect\(r\)/);
 assert.match(app,/r\.activity_id&&a\.owner_id===r\.requester_id/);
 assert.match(app,/x\.user_id!==r\.requester_id\|\|budgetRequesterCanInspect\(r\)/);
});
test("other budget requesters remain blocked, including project-only requests",()=>{
 assert.match(app,/if\(inspectors\.includes\(r\.requester_id\)&&!budgetRequesterCanInspect\(r\)\)/);
 assert.match(sql,/where a\.id=v_b\.activity_id and a\.owner_id=v_b\.requester_id/);
 assert.match(sql,/v_dir\.user_id=v_b\.requester_id\s+and not coalesce\(v_requester_is_activity_owner,false\)/);
 assert.match(sql,/and not coalesce\(v_requester_is_activity_owner,false\) then/);
});
test("all three committee members must be different and PA evaluators remain excluded",()=>{
 assert.match(app,/new Set\(inspectors\)\.size!==inspectors\.length/);
 assert.match(sql,/v_inspector_count<>v_inspector_distinct/);
 assert.match(sql,/v_dir\.role='pa_evaluator'/);
 assert.match(app,/x\.role!=="pa_evaluator"/);
});
test("signer and approval workflows remain unchanged",()=>{
 assert.match(sql,/v_b\.requester_id<>auth\.uid\(\) and not private\.is_super_admin\(\)/);
 assert.match(sql,/v_slot='director'/);
 assert.match(sql,/v_slot='plan_budget'/);
 assert.match(sql,/method=case/);
 assert.match(app,/set_budget_signer_assignments/);
 assert.match(app,/กรรมการตรวจรับ 1 ใน 3 คนได้/);
});
