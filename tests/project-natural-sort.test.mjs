import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {compareProjectCodes,compareProjectRecords,compareActivityRecords} from "../project-natural-sort.mjs";
test("project codes sort naturally at 9, 10, and 11",()=>{
  assert.deepEqual(["วช.10","วช.2","วช.9","วช.1","วช.11"].sort(compareProjectCodes),["วช.1","วช.2","วช.9","วช.10","วช.11"]);
});
test("nested activity numbers sort 3.9 before 3.15",()=>{
  const codes=["วช.3.15","วช.3.1","วช.3.9","วช.3.10","วช.2.20","วช.10.1"];
  assert.deepEqual(codes.sort(compareProjectCodes),["วช.2.20","วช.3.1","วช.3.9","วช.3.10","วช.3.15","วช.10.1"]);
});
test("newest academic year remains first",()=>{
  const p=[{academic_year:2568,project_no:"วช.1"},{academic_year:2569,project_no:"วช.10"},{academic_year:2569,project_no:"วช.2"}];
  assert.deepEqual(p.sort(compareProjectRecords).map(x=>x.project_no),["วช.2","วช.10","วช.1"]);
});
test("activity rows are not changed, only ordered",()=>{
  const a=[{activity_no:"วช.3.15",budget_amount:15},{activity_no:"วช.3.9",budget_amount:9}];
  assert.deepEqual(a.sort(compareActivityRecords).map(x=>x.budget_amount),[9,15]);
});
test("project and procurement workspaces both use natural sorting",()=>{
  const app=readFileSync(new URL("../app.js",import.meta.url),"utf8");
  for(const [source,sorter] of [
    ["state.schoolProjects","compareProjectRecords"],
    ["state.projectActivities","compareActivityRecords"],
    ["state.procurementProjects","compareProjectRecords"],
    ["state.procurementActivities","compareActivityRecords"]]) {
    assert.ok(app.includes(source+"="),source);
    assert.ok(app.includes(".sort("+sorter+")"),sorter);
  }
  assert.match(app,/import \{ compareProjectRecords, compareActivityRecords \} from "\.\/project-natural-sort\.mjs"/);
});
