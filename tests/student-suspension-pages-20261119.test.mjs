import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const app=read("app.js");
const dialog=read("modules/student-dialogs.js");
const index=read("index.html");

test("suspended roster and letter creation are separate views",()=>{
  assert.match(app,/studentFollowupView:\s*"suspended"/);
  assert.match(app,/function studentFollowupRosterPageHtml\(/);
  assert.match(app,/function studentFollowupNavigationHtml\(/);
  assert.match(app,/data-student-followup-view="suspended"/);
  assert.match(app,/data-student-followup-view="letters"/);
  assert.match(app,/function studentSuspensionFollowupPanel\(/);
});
test("only suspended current-period students are shown for new letters",()=>{
  assert.match(dialog,/state\.studentFollowupSuspendedIds\?\.has\(s\.student_id\)/);
  assert.match(dialog,/const changed=oldCases\.filter/);
  assert.match(dialog,/student-followup-pick-all/);
  assert.match(dialog,/visiblePicks\(\)\.forEach/);
  const source=app.match(/function studentFollowupSuspendedRows\(\)\{[\s\S]*?\n\}/)?.[0];
  assert.ok(source,"suspended selector exists");
  const state={studentFollowupStudents:[{student_id:"a"},{student_id:"b"}],studentFollowupSuspendedIds:new Set(["b"])};
  const selected=new Function("state",source+"; return studentFollowupSuspendedRows();")(state);
  assert.deepEqual(selected,[{student_id:"b"}]);
});
test("suspended exports use shared roster and keep citizen/student codes as text",()=>{
  assert.match(app,/studentFollowupExportSuspendedXlsx/);
  assert.match(app,/studentFollowupExportSuspendedPdf/);
  assert.match(app,/studentFollowupSuspendedExportRows\(\)/);
  assert.match(app,/state\.studentFollowupCitizenIds=new Map/);
  assert.match(app,/\.select\('id,citizen_id'\)/);
  assert.match(app,/cell\.t="s";cell\.v=String\(cell\.v\?\?""\);cell\.z="@"/);
  assert.match(app,/sheet\["!autofilter"\]/);
  assert.match(app,/await ensureOfficialPdfFont\("16pt"\)/);
  assert.match(app,/openPdfPreviewModal\(\{title:"บัญชีรายชื่อนักเรียนแขวนลอย"/);
  assert.match(app,/if\(!canManageStudentMasterUi\(\)\)/);
  assert.match(index,/app\.min\.js\?v=5\.12\.9\.819/);
});
test("suspension remains a marker, existing batches and lifecycle are not changed",()=>{
  const migration=read("supabase/migrations/20261118044257_student_suspension_followup_marker_20261118.sql");
  assert.match(migration,/is_suspended boolean NOT NULL DEFAULT false/);
  assert.match(app,/\.eq\('enrollment_status','active'\)\.eq\('is_suspended',true\)/);
  assert.match(app,/function studentFollowupBuildPdf\(/);
  assert.match(app,/function studentFollowupWorkspaceHtml\(/);
});

test("Garuda in follow-up PDFs is anchored to the physical A4 page, not scaled letter content",()=>{
  const styles=read("styles.css");
  assert.ok(app.includes('class="student-followup-garuda-centered"'),"Garuda has its own page-level class");
  assert.ok(app.includes('<header class="official-transfer-header" aria-hidden="true"></header>'),"original content header is empty");
  assert.ok(styles.includes('.student-followup-pdf-page.academic-transfer-official-document > img.student-followup-garuda-centered{'),"A4 page directly anchors Garuda");
  assert.ok(styles.includes('left:50%!important;'));
  assert.ok(styles.includes('transform:translateX(-50%)!important;'));
  assert.ok(styles.includes('top:16mm!important;'));
  assert.ok(app.includes('pageGaruda.style.width'));
  assert.ok(app.includes('pageGaruda.style.height'));
  assert.ok(index.includes('styles.css?v=5.12.9.66.1.cert2'));
});
