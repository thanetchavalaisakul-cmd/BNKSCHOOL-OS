import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const app=readFileSync(new URL("../app.js",import.meta.url),"utf8");
const start=app.indexOf("function leaveA4Styles("),end=app.indexOf("function buildLeaveA4Html(",start);
const css=app.slice(start,end);
test("Leave A4 document preserves page geometry and 3-column signers when printing",()=>{
 assert.match(css,/@page\{size:A4 portrait;margin:7mm;\}/);
 assert.match(css,/@media print\{/);
 assert.match(css,/\.leave-print-grid\{grid-template-columns:repeat\(2,minmax\(0,1fr\)\)!important;\}/);
 assert.match(css,/\.leave-print-signatures\{grid-template-columns:repeat\(3,minmax\(0,1fr\)\)!important;\}/);
 assert.doesNotMatch(css,/@media\(max-width:700px\)/);
});
test("Leave form workflow and its PDF data fields are preserved",()=>{
 for(const x of ['function leaveRequestModal(request = null)','function saveLeaveRequest(modal,existing,submitAfter,button)','function buildLeaveA4Html(request,assets={})','function printLeaveA4(request,assets)']) assert.ok(app.includes(x),x);
 assert.match(app,/submit_leave_request_signed/);
});
