import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

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
  const source = functionSnippet("function timetableSubjectsOfferedForClass(", "\nfunction ");
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
  assert.ok(app.includes('canManageTimetableSubjectForClass(c)?`<button class="btn btn-primary" id="new-timetable-subject"'));
  assert.ok(app.includes("function renderTimetableNavigation()"));
  assert.ok(app.includes("renderTimetableNavigation();"));
});

test("clicking a timetable subject exposes its edit, copy and safe remove actions", () => {
  const panel = functionSnippet("function timetableMasterSubjectPanel(", "\nfunction ");
  const modal = functionSnippet("function timetableManageSubjectModal(", "\nfunction timetableCopySubjectsModal(");
  assert.match(panel, /data-manage-timetable-subject/);
  assert.match(panel, /copy-timetable-subjects/);
  assert.match(modal, /subject_name/);
  assert.match(modal, /subject_code/);
  assert.match(modal, /subject_group_id/);
  assert.match(modal, /is_active:false/);
  assert.match(modal, /linkedActive\.length>1/);
  assert.doesNotMatch(modal, /\.delete\(\)/);
});

test("copy-room chooser is restricted to the same grade, academic year and semester", () => {
  const source = functionSnippet("function timetableCopySubjectsModal(", "\nfunction bindTimetableSubjectManageEvents(");
  const expression = source.match(/const targets=(timetableFilteredClasses\(\)\.filter\([^;]+\));/);
  assert.ok(expression, "Target-room filter was not found");
  const sourceClass = {id:"p11", academic_year:"2569",semester:2,level_name:"ป.1",stage_code:"stage1"};
  const rooms = [
    sourceClass,
    {id:"p12",academic_year:"2569",semester:2,level_name:"ป.1",stage_code:"stage1"},
    {id:"p13",academic_year:"2569",semester:2,level_name:"ป.1",stage_code:"stage1"},
    {id:"p14",academic_year:"2569",semester:1,level_name:"ป.1",stage_code:"stage1"},
    {id:"p21",academic_year:"2569",semester:2,level_name:"ป.2",stage_code:"stage1"},
    {id:"p11old",academic_year:"2568",semester:2,level_name:"ป.1",stage_code:"stage1"},
    {id:"p15",academic_year:"2569",semester:2,level_name:"ป.1",stage_code:"stage2"}
  ];
  const choose = new Function("source","timetableFilteredClasses","canManageTimetableSubjectForClass",
    "return "+expression[1]);
  const choices = choose(sourceClass,()=>rooms,c=>c.stage_code==="stage1");
  assert.deepEqual(choices.map(x=>x.id),["p12","p13"]);
  assert.match(source,/existing\?\.is_active!==false/);
  assert.match(source,/\.insert\(inserts\)/);
  assert.match(source,/\.update\(\{is_active:true\}\)/);
});

test("new subject actions are wired to both buttons and row title", () => {
  const ui = functionSnippet("function bindTimetableSubjectManageEvents(", "\nfunction teachingAssignmentModal(");
  assert.match(ui,/\[data-manage-timetable-subject\]/);
  assert.match(ui,/\[data-copy-timetable-subject\]/);
  assert.match(ui,/\#copy-timetable-subjects/);
  assert.ok(app.includes("bindTimetableSubjectManageEvents();"));
});
