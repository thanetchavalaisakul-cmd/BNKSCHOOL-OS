import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const app=readFileSync(new URL("../app.js",import.meta.url),"utf8");
const index=readFileSync(new URL("../index.html",import.meta.url),"utf8");
test("PDF generation packages are loaded on demand, not during initial page load",()=>{
 assert.doesNotMatch(app,/^import html2canvas from /m);
 assert.doesNotMatch(app,/^import \{ jsPDF \} from /m);
 assert.doesNotMatch(app,/^import \{ PDFDocument \} from /m);
 assert.match(app,/canvasModulePromise\?\?=import\("https:\/\/esm\.sh\/html2canvas@1\.4\.1"\)/);
 assert.match(app,/jsPdfModulePromise\?\?=import\("https:\/\/esm\.sh\/jspdf@2\.5\.2"\)/);
 assert.match(app,/pdfDocumentModulePromise\?\?=import\("https:\/\/esm\.sh\/pdf-lib@1\.17\.1"\)/);
 assert.doesNotMatch(app,/new jsPDF\(/);
 assert.match(app,/new \(await loadJsPDF\(\)\)\(/);
});
test("student roster renders only the selected 50 rows while keeping totals",()=>{
 const students=app.slice(app.indexOf("function studentRegistryStudentsHtml(){"),app.indexOf("function studentClassListHtml()"));
 assert.match(students,/paginateRows\(rows,state\.studentRegistryPage,50\)/);
 assert.match(students,/\$\{pageInfo\.rows\.map\(e=>/);
 assert.match(students,/\$\{rows\.length\} รายการ/);
 assert.match(students,/data-student-page=/);
 assert.match(app,/state\.studentRegistrySkipBaseOnce=true;\s*renderDashboard\(\)/);
 assert.match(index,/app\.js\?v=5\.12\.9\.26/);
});
test("previous/export logic still uses full filtered student roster",()=>{
 assert.match(app,/function studentVisibleEnrollments\(\)/);
 assert.match(app,/function studentRowsForExport\(\)\{const rows=studentVisibleEnrollments\(\)/);
 assert.match(app,/async function studentRegistryPdf\(\)\{if\(!canManageStudentMasterUi\(\)\)return;const rows=studentVisibleEnrollments\(\)/);
});
