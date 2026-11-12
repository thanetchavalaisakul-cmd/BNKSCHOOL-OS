import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";

const app = readFileSync(new URL("../app.js", import.meta.url), "utf8");
const migration = readFileSync(new URL("../supabase/migrations/20261112100000_special_school_open_days_leave_substitute.sql", import.meta.url), "utf8");
const dashboardEvents = readFileSync(new URL("../modules/dashboard-events.js", import.meta.url), "utf8");

function extractFunction(source, name) {
  const start = source.indexOf("function " + name + "(");
  assert.notEqual(start, -1, "missing " + name);
  const next = source.indexOf("\nfunction ", start + 1);
  return source.slice(start, next < 0 ? source.length : next);
}

test("published special weekend dates are included automatically for the selected academic period", () => {
  const isWeekend = value => {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || "").slice(0,10));
    if (!match) return false;
    const date = new Date(Date.UTC(Number(match[1]),Number(match[2])-1,Number(match[3])));
    if (date.getUTCFullYear()!==Number(match[1]) || date.getUTCMonth()!==Number(match[2])-1 || date.getUTCDate()!==Number(match[3])) return false;
    return date.getUTCDay()===0 || date.getUTCDay()===6;
  };
  const state = { leaveSpecialSchoolDates: [
    {event_date:"2026-11-21",academic_year:2569,semester:2,title:"วันเปิดเรียนชดเชย"},
    {event_date:"2026-11-28",academic_year:2569,semester:1,title:"คนละภาคเรียน"},
    {event_date:"2026-12-05",academic_year:2569,semester:2,title:"วันเปิดเรียนพิเศษ"}
  ]};
  const fn = runInNewContext("(" + extractFunction(app,"leaveSpecialWeekendDates") + ")", {state,leaveDateIsWeekend:isWeekend});
  assert.deepEqual(Array.from(fn("2026-11-20","2026-11-30",2569,2)),["2026-11-21"]);
  assert.deepEqual(Array.from(fn("2026-11-20","2026-12-10",2569,2)),["2026-11-21","2026-12-05"]);
  assert.deepEqual(Array.from(fn("2026-11-20","2026-12-10",2569,1)),["2026-11-28"]);
});

test("leave form preserves manual weekend choices separately and adds calendar days to the preview", () => {
  assert.ok(app.includes("leaveSpecialWeekendDates(start,end,Number(fd.get(\"academic_year\")),Number(fd.get(\"semester\")))"));
  assert.ok(app.includes("manual_weekend_working_dates: weekendWorkingDates"));
  assert.ok(app.includes("วันเปิดเรียนกรณีพิเศษที่ผู้ดูแลกำหนดในปฏิทินจะถูกนับให้อัตโนมัติ"));
  assert.ok(app.includes("รวมวันเปิดเรียนกรณีพิเศษจากปฏิทินแล้ว"));
  assert.ok(app.includes("state.leaveSpecialSchoolDates = specialOverridesRes.error"));
});

test("the administrator receives a dedicated special school-open-days menu and workspace", () => {
  assert.ok(app.includes('data-academic-calendar-special-open="true"'));
  assert.ok(app.includes("function academicCalendarSpecialOpenDaysWorkspaceHtml(module)"));
  assert.ok(app.includes('if(!isSuperAdminUser())return'));
  assert.ok(app.includes('return "วันเปิดเรียนกรณีพิเศษ"'));
  assert.ok(dashboardEvents.includes('el.dataset.academicCalendarSpecialOpen==="true"?"special":"hundred"'));
});

test("calendar editor records the timetable weekday for makeup and special-opening dates", () => {
  assert.ok(app.includes('name="timetable_weekday"'));
  assert.ok(app.includes("timetable_weekday:timetableWeekday"));
  assert.ok(app.includes("weekdayFromDate(makeup)"));
  assert.ok(app.includes("ใช้ตารางเรียนของวัน"));
});

test("database keeps manual dates distinct while deriving effective special school-open dates", () => {
  assert.ok(migration.includes("ADD COLUMN IF NOT EXISTS manual_weekend_working_dates date[]"));
  assert.ok(migration.includes("private.school_special_open_weekend_dates"));
  assert.ok(migration.includes("NEW.weekend_working_dates := v_effective_weekend_dates"));
  assert.ok(migration.includes("private.school_timetable_weekday"));
  assert.ok(migration.includes("UPDATE public.leave_requests lr"));
});

test("substitute lessons, candidate conflicts and whole-day previews use the mapped timetable weekday", () => {
  assert.ok(migration.includes("te.weekday=gs.timetable_weekday"));
  assert.match(migration,/private\.school_timetable_weekday\(\s*p_leave_date,lr\.academic_year,lr\.semester\s*\)/);
  assert.ok(migration.includes("Could not patch get_substitute_candidates weekday mapping"));
  assert.ok(migration.includes("Could not patch assign_substitute_teacher weekday mapping"));
  assert.ok(migration.includes("Could not patch get_substitute_day_candidates weekday mapping"));
});

test("calendar changes refresh affected leave requests and protect active leave schedules", () => {
  assert.ok(migration.includes("private.refresh_leave_requests_for_special_calendar_day"));
  assert.ok(migration.includes("academic_calendar_day_overrides_zz_refresh_leave"));
  assert.ok(migration.includes("academic_calendars_zz_refresh_special_leave"));
  assert.ok(migration.includes("This special school day is used by an active leave request"));
  assert.ok(migration.includes("This published calendar has special school days used by active leave requests"));
});
