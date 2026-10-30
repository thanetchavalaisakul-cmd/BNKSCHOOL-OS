import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync,statSync} from "node:fs";
import {execFileSync} from "node:child_process";
const app=readFileSync(new URL("../app.js",import.meta.url),"utf8");
const groups=["academic-report-pdf","academic-dialogs","personnel-dialogs","timetable-dialogs",
 "student-dialogs","dashboard-events","procurement-pdf-templates","procurement-dialogs",
 "academic-forms","school-lunch-dialogs","learning-source-dialogs","exam-dialogs"];
test("each of 12 feature modules is loaded dynamically only when used",()=>{
 for(const name of groups){
  const filename="../modules/"+name+".js";
  const contents=readFileSync(new URL(filename,import.meta.url),"utf8");
  assert.ok(app.includes('import("./modules/'+name+'.js?v=5.12.9.58")'),name);
  assert.match(contents,/export function create[A-Za-z]+Feature\(ctx\)/);
  assert.match(contents,/const \{/);
  assert.doesNotMatch(app,new RegExp('^import .*modules/'+name,'m'));
 }
});
test("main script payload is reduced by modularizing heavy report and dialog code",()=>{
 assert.ok(statSync(new URL("../app.min.js",import.meta.url)).size<2180000);
 assert.match(app,/async function bindDashboardEvents\(\.\.\.args\)/);
 assert.match(app,/await bindDashboardEvents\(\)/);
 assert.match(app,/async function procurementPackDocumentPages\(/);
 assert.match(app,/await loadProcurementPdfTemplatesFeature\(\)/);
});
test("all 12 source modules parse correctly as ECMAScript modules",()=>{
 for(const name of groups)execFileSync(process.execPath,["--check",new URL("../modules/"+name+".js",import.meta.url).pathname],{stdio:"pipe"});
});
test("PDF templates and signing remain part of the independent feature modules",()=>{
 const pdf=readFileSync(new URL("../modules/procurement-pdf-templates.js",import.meta.url),"utf8");
 assert.match(pdf,/function procurementPackDocumentPagesBase\(/);
 assert.match(pdf,/function procurementPackDocumentPagesV44Legacy\(/);
 const docs=readFileSync(new URL("../modules/academic-report-pdf.js",import.meta.url),"utf8");
 for(const x of ["lessonUsagePdfHtml","learnerActivityPdfHtml","clubActivityPdfHtml","postLessonPdfHtml","classroomResearchPdfHtml","learningMediaPdfHtml"])
   assert.ok(docs.includes("async function "+x+"("),x);
});

