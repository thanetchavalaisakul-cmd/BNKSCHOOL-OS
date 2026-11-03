import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const migration=readFileSync(new URL("../supabase/migrations/20261103093000_semester_plan_submission_channels.sql",import.meta.url),"utf8");
const feature=readFileSync(new URL("../modules/semester-lesson-plan-channels.js",import.meta.url),"utf8");
const app=readFileSync(new URL("../app.js",import.meta.url),"utf8");
const min=readFileSync(new URL("../app.min.js",import.meta.url),"utf8");
const html=readFileSync(new URL("../index.html",import.meta.url),"utf8");

test("per-term submission policy supports PDF only, Drive only, both with backwards-compatible default",()=>{
  assert.match(migration,/CREATE TABLE IF NOT EXISTS public\.semester_lesson_plan_submission_settings/);
  assert.match(migration,/PRIMARY KEY \(academic_year,semester\)/);
  assert.match(migration,/submission_mode IN \('both','pdf_only','drive_only'\)/);
  assert.match(migration,/COALESCE\(\([\s\S]*?'both'::text\)/);
  assert.match(migration,/ALTER TABLE public\.semester_lesson_plan_submission_settings ENABLE ROW LEVEL SECURITY/);
  assert.match(feature,/getMode\(year,semester,force=false\)/);
  assert.match(feature,/submission_mode:mode/);
});

test("only the academic head and super admin can configure lesson-plan submission channels",()=>{
  assert.match(migration,/private\.is_super_admin\(\) OR private\.is_academic_head\(\)/);
  assert.match(migration,/GRANT SELECT,INSERT,UPDATE/);
  assert.match(migration,/REVOKE DELETE/);
  assert.match(feature,/state\.profile\?\.role==="super_admin"/);
  assert.match(feature,/state\.profile\?\.role==="department_head"/);
  assert.match(feature,/department_id===academicDept\(\)/);
});

test("database prevents forbidden new attachment formats and enforces permitted format at submit",()=>{
  assert.match(migration,/BEFORE INSERT OR UPDATE OF attachment_type,external_url,lesson_plan_id ON public\.lesson_plan_files/);
  assert.match(migration,/BEFORE UPDATE OF status ON public\.lesson_plans/);
  assert.match(migration,/NEW\.plan_type='semester'/);
  assert.match(migration,/OLD\.status IN \('draft','revision_requested'\)/);
  assert.match(migration,/f\.lesson_plan_id=NEW\.id/);
  assert.match(migration,/v_mode='drive_only' AND f\.attachment_type='google_drive'/);
  assert.match(migration,/v_mode='pdf_only' AND coalesce\(f\.attachment_type,'pdf'\)='pdf'/);
  assert.doesNotMatch(migration,/DELETE FROM public\.lesson_plan_files/);
  assert.doesNotMatch(migration,/DELETE FROM public\.lesson_plans/);
});

test("new settings appear for authorized users and constrain the existing modal without replacing weekly plans",()=>{
  assert.match(feature,/state\.lessonPlanMode!=="semester"/);
  assert.match(feature,/semester-channel-settings-button/);
  assert.match(feature,/findSemesterForm\(root=document\)/);
  assert.match(feature,/state\.lessonPlanMode==="semester"/);
  assert.doesNotMatch(feature,/#lesson-form\[data-plan-type="semester"\]/);
  assert.match(feature,/const pdfAllowed=mode!=="drive_only",driveAllowed=mode!=="pdf_only"/);
  assert.match(feature,/btn\.hidden=!allowed;btn\.disabled=!allowed/);
  assert.match(feature,/form\.dataset\.semesterChannelReady/);
  assert.match(feature,/Google Drive Link เท่านั้น/);
  assert.match(feature,/PDF เท่านั้น/);
  assert.match(feature,/เปิดทั้งสองช่องทาง/);
  assert.match(feature,/onConflict:"academic_year,semester"/);
});

test("the installed feature is loaded by source and deployed minified entry with new cache key",()=>{
  assert.match(app,/modules\/semester-lesson-plan-channels\.js\?v=20261103\.3/);
  assert.match(min,/modules\/semester-lesson-plan-channels\.js\?v=20261103\.3/);
  assert.match(app,/installSemesterLessonChannelControls\(\{state,supabase\}\)/);
  assert.match(min,/installSemesterLessonChannelControls:e/);
  assert.match(html,/app\.min\.js\?v=5\.12\.9\.787/);
});

test("authorized managers get a visible button from the semester hero renderer",()=>{
  assert.match(app,/academicHead \|\| role === "super_admin"/);
  assert.match(app,/id="semester-channel-settings-button"/);
  assert.match(min,/s\.lessonPlanMode==="semester"/);
  assert.match(min,/id="semester-channel-settings-button"/);
  assert.match(app,/document\.addEventListener\("click",async event=>/);
  assert.match(app,/controller\.openSettings\(\)/);
  assert.match(app,/window\.alert\("เปิดการตั้งค่าการส่งแผนไม่สำเร็จ:/);
  assert.match(min,/กำลังเปิดการตั้งค่า/);
  assert.match(feature,/activeSemesterChannelController=controller/);
  assert.match(feature,/return controller/);
});


test("the settings button uses a real direct click path, with visible failure feedback",()=>{
  assert.match(app,/const button=event\.target\.closest\?\.\("#semester-channel-settings-button"\)/);
  assert.match(app,/await import\("\.\/modules\/semester-lesson-plan-channels\.js\?v=20261103\.3"\)/);
  assert.match(app,/button\.textContent="กำลังเปิดการตั้งค่า\.\.\."/);
  assert.match(app,/window\.alert\("เปิดการตั้งค่าการส่งแผนไม่สำเร็จ:/);
  assert.match(min,/เปิดการตั้งค่าการส่งแผนไม่สำเร็จ/);
  assert.doesNotMatch(feature,/document\.addEventListener\("click",event=>/);
});
