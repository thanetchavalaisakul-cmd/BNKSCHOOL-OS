import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {runInNewContext} from "node:vm";

const app=readFileSync(new URL("../app.js",import.meta.url),"utf8");
const original=readFileSync(new URL("../supabase/migrations/20261112012441_special_school_open_days_leave_substitute_20261112.sql",import.meta.url),"utf8");
const migration=readFileSync(new URL("../supabase/migrations/20261112150000_independent_special_school_open_days.sql",import.meta.url),"utf8");
const dashboard=readFileSync(new URL("../modules/dashboard-events.js",import.meta.url),"utf8");

function extractFunction(source,name){
  const start=source.indexOf("function "+name+"(");
  assert.notEqual(start,-1,"missing "+name);
  const next=source.indexOf("\nfunction ",start+1);
  return source.slice(start,next<0?source.length:next);
}

test("selected term and weekend determine operational special open dates",()=>{
  const isWeekend=value=>{
    const d=new Date(String(value).slice(0,10)+"T12:00:00Z");
    return d.getUTCDay()===0||d.getUTCDay()===6;
  };
  const state={leaveSpecialSchoolDates:[
    {event_date:"2026-11-21",academic_year:2569,semester:2,title:"วันสอนชดเชย"},
    {event_date:"2026-11-28",academic_year:2569,semester:1,title:"คนละเทอม"},
    {event_date:"2026-12-05",academic_year:2569,semester:2,title:"วันเปิดเรียนพิเศษ"}
  ]};
  const fn=runInNewContext("("+extractFunction(app,"leaveSpecialWeekendDates")+")",{state,leaveDateIsWeekend:isWeekend});
  assert.deepEqual(Array.from(fn("2026-11-20","2026-11-30",2569,2)),["2026-11-21"]);
  assert.deepEqual(Array.from(fn("2026-11-20","2026-12-10",2569,2)),["2026-11-21","2026-12-05"]);
  assert.deepEqual(Array.from(fn("2026-11-20","2026-12-10",2569,1)),["2026-11-28"]);
});

test("leave uses standalone school-open day table, never academic calendar status",()=>{
  const leaveLoader=app.slice(app.indexOf("async function loadLeaveWorkspace()"),app.indexOf("async function",app.indexOf("async function loadLeaveWorkspace()")+5));
  assert.match(leaveLoader,/from\("school_special_open_days"\)/);
  assert.doesNotMatch(leaveLoader,/from\("academic_calendars"\)/);
  assert.doesNotMatch(leaveLoader,/from\("academic_calendar_day_overrides"\)/);
  assert.ok(app.includes("manual_weekend_working_dates: weekendWorkingDates"));
  assert.ok(app.includes("state.leaveSpecialSchoolDates = specialDaysRes.error"));
  assert.ok(app.includes("รวมวันเปิดเรียนกรณีพิเศษที่ผู้ดูแลกำหนด"));
});

test("admin special days works without creating an academic calendar",()=>{
  const special=app.slice(app.indexOf("function academicCalendarSpecialOpenDaysWorkspaceHtml(module)"),app.indexOf("function academicCalendarWorkspaceHtml(module)"));
  const editor=app.slice(app.indexOf("function academicCalendarOverrideModal(kind,existing=null)"),app.indexOf("function academicCalendarActivityModal("));
  assert.match(special,/if\(!isSuperAdminUser\(\)\)return/);
  assert.match(special,/schoolSpecialOpenDays/);
  assert.doesNotMatch(special,/academicCalendarCurrent\(\)/);
  assert.match(special,/id="academic-calendar-add-special"/);
  assert.match(editor,/school_special_open_days/);
  assert.ok(dashboard.includes('type==="special"?state.schoolSpecialOpenDays:state.academicCalendarOverrides'));
  assert.ok(app.includes('data-academic-calendar-special-open="true"'));
  const hundred=app.slice(app.indexOf("function academicCalendarWorkspaceHtml(module)"),app.indexOf("function academicSupervisionWorkspaceHtml("));
  assert.doesNotMatch(hundred,/id="academic-calendar-add-special"/);
});

test("migrates legacy published days to a distinct RLS table with admin-only writes",()=>{
  assert.ok(migration.includes("CREATE TABLE IF NOT EXISTS public.school_special_open_days"));
  assert.ok(migration.includes("ON CONFLICT (academic_year,semester,event_date) DO NOTHING"));
  assert.ok(migration.includes("ALTER TABLE public.school_special_open_days ENABLE ROW LEVEL SECURITY"));
  assert.ok(migration.includes("private.is_super_admin()"));
  assert.ok(migration.includes("CREATE POLICY school_special_open_admin_insert"));
  assert.ok(migration.includes("CREATE POLICY school_special_open_admin_update"));
  assert.ok(migration.includes("CREATE POLICY school_special_open_admin_delete"));
  assert.ok(migration.includes("legacy_override_id"));
});

test("leave and substitute mappings now query standalone dates, not published academic calendars",()=>{
  assert.ok(original.includes("private.school_timetable_weekday"));
  assert.ok(original.includes("te.weekday=gs.timetable_weekday"));
  assert.match(migration,/CREATE OR REPLACE FUNCTION private\.school_special_open_weekend_dates/);
  assert.match(migration,/CREATE OR REPLACE FUNCTION private\.school_timetable_weekday/);
  const src=migration.slice(migration.indexOf("CREATE OR REPLACE FUNCTION private.school_special_open_weekend_dates"),migration.indexOf("CREATE OR REPLACE FUNCTION private.refresh_leave_requests_for_school_open_day"));
  assert.ok(src.includes("FROM public.school_special_open_days"));
  assert.ok(!src.includes("FROM public.academic_calendars"));
});

test("academic calendar edits have no leave trigger or guard dependencies",()=>{
  for(const trigger of [
    "academic_calendar_day_overrides_10_special_guard",
    "academic_calendar_day_overrides_zz_refresh_leave",
    "academic_calendars_10_guard_special_leave",
    "academic_calendars_zz_refresh_special_leave"
  ])assert.ok(migration.includes("DROP TRIGGER IF EXISTS "+trigger));
  assert.ok(migration.includes("private.guard_school_special_open_day_change"));
  assert.ok(migration.includes("private.refresh_leave_requests_for_school_open_day"));
});
