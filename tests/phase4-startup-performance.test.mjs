import assert from "node:assert/strict";
import {readFileSync,statSync} from "node:fs";
import test from "node:test";
const app=readFileSync(new URL("../app.js",import.meta.url),"utf8");
const html=readFileSync(new URL("../index.html",import.meta.url),"utf8");
test("Excel library is not loaded at startup; student export, template, import load it as needed",()=>{
  assert.doesNotMatch(app,/^import \* as XLSX/m);
  assert.match(app,/xlsxModulePromise\?\?=import\("https:\/\/esm\.sh\/xlsx@0\.18\.5"\)/);
  assert.match(app,/async function xlsxDownloadFromRows\([^)]*\)\{try\{await ensureXlsx\(\)/);
  assert.match(app,/async function studentTemplateDownload\(\)\{\s*try\{await ensureXlsx\(\)/);
  assert.match(app,/await ensureXlsx\(\);const ab=await file\.arrayBuffer\(\),book=XLSX\.read\(/);
});
test("procurement static master only fetched on procurement navigation, awaited before use",()=>{
  assert.doesNotMatch(app,/^import \{ PROCUREMENT_EXCEL_MASTER_TEXT \}/m);
  assert.match(app,/procurementExcelMasterPromise\?\?=import\("\.\/procurement-excel-master-text\.js\?v=5\.12\.6"\)/);
  const begin=app.indexOf("async function loadProcurementWorkspace(){");
  const end=app.indexOf("function procurementWorkspaceHtml",begin);
  assert.ok(begin>=0&&end>begin);
  const fn=app.slice(begin,end);
  assert.match(fn,/if\(!procurementCanAccessDocuments\(\)\)/);
  assert.match(fn,/const masterPromise=ensureProcurementExcelMaster\(\)/);
  assert.match(fn,/const masterLoaded=await masterPromise;/);
  assert.match(fn,/if\(!masterLoaded\)masterErrors\.push\(/);
});
test("image file is shared and original large base64 is absent from app code",()=>{
  assert.match(app,/const ACADEMIC_REG_GARUDA_DATA_URL = new URL\("\.\/garuda-official\.png", import\.meta\.url\)\.href;/);
  assert.doesNotMatch(app,/const ACADEMIC_REG_GARUDA_DATA_URL = "data:image\/png;base64/);
  assert.ok(statSync(new URL("../garuda-official.png",import.meta.url)).size>20000);
});
test("versioned application entry is refreshed and core student and timetable optimizations retained",()=>{
  assert.match(html,/app\.js\?v=5\.12\.9\.27/);
  assert.match(app,/paginateRows\(rows,state\.studentRegistryPage,50\)/);
  assert.match(app,/TIMETABLE_REENTRY_CACHE_MS=60000/);
  assert.match(app,/async function html2canvas\(\.\.\.args\)/);
});
