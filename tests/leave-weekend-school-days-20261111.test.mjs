import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";

const app = readFileSync(new URL("../app.js", import.meta.url), "utf8");
const migration = readFileSync(new URL("../supabase/migrations/20261111100000_leave_school_open_weekend_dates.sql", import.meta.url), "utf8");

function extractFunction(name) {
  const start = app.indexOf("function " + name + "(");
  assert.notEqual(start, -1, "missing " + name);
  const next = app.indexOf("\nfunction ", start + 1);
  return app.slice(start, next < 0 ? app.length : next);
}

const helpers = runInNewContext(
  ["leaveDateIsWeekend", "leaveWorkingDayCount", "leaveWorkingDays"].map(extractFunction).join("\n") +
  "\n({leaveDateIsWeekend,leaveWorkingDayCount,leaveWorkingDays})"
);

test("ordinary weekends remain excluded unless explicitly selected as school-open dates", () => {
  assert.equal(helpers.leaveWorkingDayCount("2026-11-14", "2026-11-15"), 0);
  assert.equal(helpers.leaveWorkingDayCount("2026-11-14", "2026-11-15", ["2026-11-14"]), 1);
  assert.equal(helpers.leaveWorkingDayCount("2026-11-14", "2026-11-15", ["2026-11-15"]), 1);
});

test("Friday through Monday counts only weekdays plus the selected weekend dates", () => {
  assert.equal(helpers.leaveWorkingDayCount("2026-11-13", "2026-11-16"), 2);
  assert.equal(helpers.leaveWorkingDayCount("2026-11-13", "2026-11-16", ["2026-11-14"]), 3);
  assert.equal(helpers.leaveWorkingDayCount("2026-11-13", "2026-11-16", ["2026-11-14", "2026-11-15"]), 4);
});

test("half-day leave applies the 0.5 factor to selected school-open weekend days", () => {
  assert.equal(helpers.leaveWorkingDays("2026-11-14", "2026-11-14", "morning", ["2026-11-14"]), 0.5);
  assert.equal(helpers.leaveWorkingDays("2026-11-14", "2026-11-14", "afternoon", ["2026-11-14"]), 0.5);
  assert.equal(helpers.leaveWorkingDays("2026-11-13", "2026-11-16", "full_day", ["2026-11-14"]), 3);
  assert.equal(helpers.leaveWorkingDays("2026-11-13", "2026-11-16", "afternoon", ["2026-11-14"]), 1.5);
});

test("only valid Saturday/Sunday dates are treated as school-open weekends by the UI helper", () => {
  assert.equal(helpers.leaveDateIsWeekend("2026-11-14"), true);
  assert.equal(helpers.leaveDateIsWeekend("2026-11-15"), true);
  assert.equal(helpers.leaveDateIsWeekend("2026-11-16"), false);
  assert.equal(helpers.leaveDateIsWeekend("2026-02-30"), false);
  assert.equal(helpers.leaveWorkingDayCount("2026-11-14", "2026-11-15", ["2026-11-16"]), 0);
});

test("leave form exposes the exact school-open weekend option and persists selected dates", () => {
  assert.ok(app.includes("ลาในวันหยุดที่โรงเรียนเปิดเรียน"));
  assert.ok(app.includes('name="weekend_working_enabled"'));
  assert.ok(app.includes('name="weekend_working_dates"'));
  assert.ok(app.includes("weekend_working_dates: weekendWorkingDates"));
  assert.ok(app.includes("selectedWeekendDates.push(value)"));
  assert.ok(app.includes("กรุณาเลือกวันที่โรงเรียนเปิดเรียน"));
});

test("database enforces selected weekend dates and includes them in substitute and preschool coverage", () => {
  assert.ok(migration.includes("ADD COLUMN IF NOT EXISTS weekend_working_dates date[]"));
  assert.ok(migration.includes("private.leave_working_day_total(p_start,p_end,p_session,NEW.weekend_working_dates)"));
  assert.ok(migration.includes("extract(isodow FROM selected_date) NOT IN (6,7)"));
  assert.ok(migration.includes("old.weekend_working_dates is distinct from new.weekend_working_dates"));
  assert.ok(migration.includes("day_at::date=any(coalesce(v_leave.weekend_working_dates,'{}'::date[]))"));
  assert.ok(migration.includes("d::date=any(coalesce(v_leave.weekend_working_dates,'{}'::date[]))"));
  assert.ok(migration.includes("p_leave_date=any(coalesce(lr.weekend_working_dates,'{}'::date[]))"));
  assert.ok(migration.includes("weekend_working_dates\nON public.leave_requests"));
});
