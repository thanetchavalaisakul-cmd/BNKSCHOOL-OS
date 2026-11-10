import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {runInNewContext} from "node:vm";

const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const app=read("app.js"),feature=read("modules/semester-lesson-plan-channels.js");
const sql=read("supabase/migrations/20261106140000_semester_plan_global_period_drive_only.sql");
const html=read("index.html"),vercel=JSON.parse(read("vercel.json"));
const moduleCode=read("modules/bnk-client-version.js");

function mockFormModal(type="semester",plan=null,academicPeriod={academicYear:2569,semester:2}){
  const from=app.indexOf("function lessonPlanModal("),to=app.indexOf("\nfunction normalizeGoogleDriveUrl(",from);
  assert.ok(from>0&&to>from);
  const modal={
    dataset:{},innerHTML:"",
    querySelector(){return{addEventListener(){},classList:{toggle(){}}};},
    querySelectorAll(){return[];},addEventListener(){},
    remove(){}
  };
  const context={
    document:{createElement(){return modal},body:{appendChild(){}}},
    state:{lessonPlanMode:type,lessonDetail:null},
    currentAcademicPeriod:()=>academicPeriod,
    lessonPlanTypeLabel:()=>type==="semester"?"แผนรายภาคเรียน":"แผนรายสัปดาห์",
    escapeHtml:x=>String(x??""),
    saveLessonPlanFromModal(){},
    FormData
  };
  runInNewContext(app.slice(from,to)+"\nlessonPlanModal(thePlan,theType);",{...context,thePlan:plan,theType:type});
  return modal;
}

test("new term-2 semester modal inherits global 2569/2 and starts with Drive, not PDF",()=>{
  const m=mockFormModal();
  assert.equal(m.dataset.attachmentMethod,"google_drive");
  assert.match(m.innerHTML,/name="academic_year" value="2569"/);
  assert.match(m.innerHTML,/name="semester" value="2"/);
  assert.match(m.innerHTML,/data-semester-plan-existing="0"/);
  assert.doesNotMatch(m.innerHTML,/<select[^>]+name="semester"/);
  assert.match(m.innerHTML,/id="attachment-pdf-pane" class="attachment-pane hidden"/);
  assert.match(m.innerHTML,/id="attachment-drive-pane" class="attachment-pane "/);
  assert.match(m.innerHTML,/data-attachment-method="pdf" hidden disabled/);
  assert.match(m.innerHTML,/อ้างอิงปีการศึกษาและภาคเรียนจากระบบหลัก/);
});

test("historical semester records retain their original period; weekly form keeps old controls",()=>{
  const old=mockFormModal("semester",{id:"older",plan_type:"semester",academic_year:"2569",semester:1});
  assert.match(old.innerHTML,/name="semester" value="1"/);
  assert.match(old.innerHTML,/data-semester-plan-existing="1"/);
  assert.doesNotMatch(old.innerHTML,/<select[^>]+name="semester"/);
  const weekly=mockFormModal("weekly");
  assert.match(weekly.innerHTML,/<select[^>]+name="semester"/);
  assert.equal(weekly.dataset.attachmentMethod,"pdf");
});

test("server-side SQL rejects new semester plans outside central period and term-2 PDF",()=>{
  assert.match(sql,/WHEN p_semester=2 THEN 'drive_only'/);
  assert.match(sql,/trg_semester_plan_current_period/);
  assert.match(sql,/NEW.academic_year IS DISTINCT FROM v_year/);
  assert.match(sql,/trg_semester_plan_drive_only_setting_guard/);
  assert.match(sql,/IF NEW.semester=2 AND NEW.submission_mode<>'drive_only'/);
  assert.doesNotMatch(sql,/DELETE FROM public.lesson_plan_files/);
  assert.doesNotMatch(sql,/DELETE FROM public.lesson_plans/);
  assert.match(app,/if\(semesterPlan&&!existing\)/);
  assert.match(app,/effectiveSubmissionMode=semesterPlan&&Number\(fd.get\("semester"\)\)===2\?"drive_only"/);
});

test("live tabs reconcile the central period and refresh only when safe",()=>{
  assert.match(feature,/supabase.from\("academic_terms"\)/);
  assert.match(feature,/state.academicTerms=\[\.\.\.old,\{\.\.\.data,is_current:true\}\]/);
  assert.match(feature,/document.querySelector\?\.\(".modal-backdrop"\)/);
  assert.match(feature,/await renderDashboard\(\)/);
  assert.match(feature,/60000/);
  assert.match(feature,/Number\(semester\)===2/);
});

test("HTML and JS are revalidated; new builds notify users before reload",()=>{
  assert.match(html,/meta name="bnk-release"/);
  assert.match(html,/app\.min\.js\?v=5\.12\.9\.\d+/);
  assert.match(html,/bnk-client-version\.js\?v=20261106\.1/);
  assert.ok(vercel.headers.some(h=>h.source==="/"&&h.headers.some(x=>x.key==="Cache-Control"&&x.value.includes("no-store"))));
  assert.match(moduleCode,/cache:"no-store"/);
  assert.match(moduleCode,/noticeShown=true/);
  assert.match(moduleCode,/window.location.reload\(\)/);
});
