import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import "./behavior-hard-delete.test.mjs";

const app = readFileSync(new URL("../app.js", import.meta.url), "utf8");

function functionSnippet(start, next) {
  const begin = app.indexOf(start);
  assert.ok(begin >= 0, `Missing: ${start}`);
  const end = app.indexOf(next, begin + start.length);
  assert.ok(end > begin, `Missing boundary: ${next}`);
  return app.slice(begin, end);
}

test("stage head may add a subject only for their assigned non-preschool stage", () => {
  const source = functionSnippet("function canManageTimetableSubjectForClass(", "\nfunction canManageTimetable()");
  const authorize = new Function("canManageTimetableClassLocal",
    `${source}; return canManageTimetableSubjectForClass;`)(
      row => row.stage_code === "stage1");
  assert.equal(authorize({ stage_code: "stage1" }), true);
  assert.equal(authorize({ stage_code: "stage2" }), false);
  assert.equal(authorize({ stage_code: "early_childhood" }), false);
  assert.equal(authorize(null), false);
});

test("stage head timetable exports cannot include other stages", () => {
  const source = functionSnippet("function timetableStudentExportClassIds()", "\nfunction ");
  const state = { timetableClasses: [
    { id:"allowed", academic_year:"2569", stage_code:"stage1" },
    { id:"foreign", academic_year:"2569", stage_code:"stage2" },
    { id:"previous", academic_year:"2568", stage_code:"stage1" }
  ] };
  const get = new Function("canViewAllTimetables","timetableOwnHomeroomClassIds",
    "timetableOwnStageHeadRows","state",
    `${source}; return timetableStudentExportClassIds;`)(
      () => false, () => [], () => [{ academic_year:"2569",stage_code:"stage1" }], state);
  assert.deepEqual(get(), ["allowed"]);
});

test("only active class offerings appear in subject picker by default", () => {
  const source = functionSnippet("function timetableSubjectInClass(", "\nfunction timetableMasterSubjectPanel(");
  const get = new Function("state", `${source}; return timetableSubjectsOfferedForClass;`)({
    timetableSubjectOfferings: [
      { class_id:"a", subject_id:"x", is_active:true },
      { class_id:"a", subject_id:"y", is_active:false }
    ],
    timetableSubjects: [{id:"x"},{id:"y"}]
  });
  assert.deepEqual(get("a").map(x=>x.id), ["x"]);
  assert.deepEqual(get("a",{includeArchived:true}).map(x=>x.id), ["x","y"]);
});

test("simultaneous bootstrap calls share a single network load", async () => {
  const source = functionSnippet("let bootstrapAppInFlight = null;", "\nfunction renderPending()");
  let calls = 0;
  const load = new Function("bootstrapAppInner", `${source};return bootstrapApp;`)(
    async () => { calls += 1; await Promise.resolve(); return "ok"; });
  const first = load(), second = load();
  assert.equal(first, second);
  assert.equal(await first, "ok");
  assert.equal(calls, 1);
  await load();
  assert.equal(calls, 2);
});

test("token refresh does not reload the app", () => {
  assert.ok(app.includes('["INITIAL_SESSION", "TOKEN_REFRESHED", "USER_UPDATED"].includes(event)'));
});

test("realtime notifications are recipient-scoped and lightweight", () => {
  assert.ok(app.includes("filter: `recipient_id=eq.${state.user.id}`"));
  assert.ok(app.includes("await refreshOwnNotifications();"));
  assert.ok(app.includes('state.timetableSkipNextLoad = true;'));
});

test("master entry respects stage role and timetable navigation skips refetch", () => {
  assert.ok(app.includes('id="new-timetable-subject"'));
  assert.ok(app.includes("function renderTimetableNavigation()"));
  assert.ok(app.includes("renderTimetableNavigation();"));
});

test("room-specific edits do not mutate shared Master or other classrooms", () => {
  const source = functionSnippet("function timetableSubjectInClass(", "\nfunction timetableMasterSubjectPanel(");
  const state = {
    timetableSubjectOfferings: [
      {class_id:"p1-1",subject_id:"science",is_active:true,subject_name_override:"นักวิทยาศาสตร์น้อย"},
      {class_id:"p1-2",subject_id:"science",is_active:true,subject_name_override:null}
    ],
    timetableSubjects:[{id:"science",subject_name:"กิจกรรมนักวิทยาศาสตร์น้อย"}]
  };
  const get = new Function("state", source+"; return {timetableSubjectInClass,timetableSubjectsOfferedForClass};")(state);
  assert.equal(get.timetableSubjectInClass("p1-1","science").subject_name,"นักวิทยาศาสตร์น้อย");
  assert.equal(get.timetableSubjectInClass("p1-2","science").subject_name,"กิจกรรมนักวิทยาศาสตร์น้อย");
  assert.equal(state.timetableSubjects[0].subject_name,"กิจกรรมนักวิทยาศาสตร์น้อย");
  assert.equal(get.timetableSubjectsOfferedForClass("p1-1").length,1);
});

test("subject editing and copying are restricted to controlled classrooms and avoid overwriting duplicates",()=>{
  assert.ok(app.includes("function timetableEditSubjectModal("));
  assert.ok(app.includes("function timetableCopySubjectsModal("));
  assert.ok(app.includes('c.level_name===source.level_name'));
  assert.ok(app.includes('c.academic_year===source.academic_year'));
  assert.ok(app.includes('Number(c.semester)===Number(source.semester)'));
  assert.ok(app.includes("canManageTimetableSubjectForClass(c)"));
  assert.ok(app.includes('ignoreDuplicates:true'));
  assert.ok(app.includes('subject_name_override:'));
  assert.ok(app.includes("data-edit-timetable-subject"));
  assert.ok(app.includes("data-copy-timetable-subject"));
});

test("electricity meter picker reads the active personnel directory instead of role-scoped profiles", () => {
  const source = functionSnippet("async function loadElectricityWorkspace(){", "\nfunction electricityStatusBadge(");
  assert.ok(source.includes("supabase.from('personnel_public_directory').select('user_id,full_name,role')"));
  assert.ok(source.includes("map(p=>({id:p.user_id,full_name:p.full_name,role:p.role}))"));
  assert.ok(!source.includes("supabase.from('profiles')"), "Manager picker must not use role-scoped profiles");
});

test("PA evaluator accounts remain PA-only and are hidden from shared staff lists", () => {
  assert.ok(app.includes('state.modules = state.modules.filter(m=>m.code === "personnel_pa")'));
  assert.ok(app.includes('state.pendingUsers = (data || []).filter(u => u.role !== "pa_evaluator");'));
  assert.ok(app.includes('.neq("role","pa_evaluator").order("full_name")'));
  assert.ok(app.includes('state.publicPersonnelDirectory = publicRes.error ? [] : (publicRes.data || []).filter(p => p.role !== "pa_evaluator");'));
  assert.ok(app.includes('.neq("role","super_admin").neq("role","pa_evaluator")'));
  assert.ok(app.includes(".filter(p=>p.role!=='pa_evaluator').map(p=>({id:p.user_id,full_name:p.full_name,role:p.role}))"));
  assert.ok(app.includes('function personnelPaIsEvaluatorUi(){return state.profile?.role==="pa_evaluator";}'));
});

test("director dashboard exposes approval workflows only to configured executives", () => {
  const source = functionSnippet("function directorApprovalShortcutsHtml(){", "\nfunction dashboardTaskQueue(metrics){");
  const state = {
    profile: {role:"director"},
    approvalControlCenter: {can_access:true},
    modules: [{code:"leave_management"}, {code:"lesson_plans"}, {code:"academic_registration"}]
  };
  const render = new Function("state","dashboardModuleIcon","escapeHtml", `${source}; return directorApprovalShortcutsHtml;`)(
    state, code => code, text => String(text)
  );
  const html = render();
  assert.match(html, /ทางลัดงานอนุมัติของผู้อำนวยการ/);
  assert.match(html, /data-view="module:leave_management"/);
  assert.match(html, /data-view="module:lesson_plans"/);
  assert.match(html, /data-view="module:academic_registration"/);
  assert.match(html, /data-view="approval_center"/);
  assert.ok(!html.includes('data-view="module:project_management"'), "Only available modules are offered");
  state.profile.role = "teacher";
  assert.equal(render(), "", "Teachers must not get director shortcuts");
  state.profile.role = "pa_evaluator";
  assert.equal(render(), "", "PA evaluators must not get director shortcuts");
  state.profile.role = "director";
  state.approvalControlCenter.can_access = false;
  assert.equal(render(), "", "Inactive central executive must not get shortcuts");
});

test("director approval shortcuts appear in dashboard without changing approval decisions", () => {
  const source = functionSnippet("function homeView(metrics) {", "\nfunction notificationList(");
  assert.match(source, /directorApprovalShortcutsHtml\(\)/);
  assert.match(app, /การอนุมัติต้องพิจารณาในแต่ละระบบ/);
});