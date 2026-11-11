import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";

const app = readFileSync(new URL("../app.js", import.meta.url), "utf8");
const migration = readFileSync(new URL("../supabase/migrations/20261111033219_leave_half_day_weekday_quota_and_substitute.sql", import.meta.url), "utf8");

function extractFunction(name) {
  const start = app.indexOf("function " + name + "(");
  assert.notEqual(start, -1, "missing " + name);
  const next = app.indexOf("\nfunction ", start + 1);
  return app.slice(start, next < 0 ? app.length : next);
}

const helpers = runInNewContext(
  ["leaveWorkingDayCount", "leaveWorkingDays", "leaveSessionLabel", "formatLeaveDays"].map(extractFunction).join("\n") +
  "\n({leaveWorkingDayCount,leaveWorkingDays,leaveSessionLabel,formatLeaveDays})"
);

test("full-day leave counts weekdays only, including Friday through Monday as two days", () => {
  assert.equal(helpers.leaveWorkingDayCount("2026-11-09", "2026-11-13"), 5);
  assert.equal(helpers.leaveWorkingDays("2026-11-13", "2026-11-16", "full_day"), 2);
});

test("half-day leave deducts half a day for each working day in the selected range", () => {
  assert.equal(helpers.leaveWorkingDays("2026-11-11", "2026-11-11", "morning"), 0.5);
  assert.equal(helpers.leaveWorkingDays("2026-11-11", "2026-11-11", "afternoon"), 0.5);
  assert.equal(helpers.leaveWorkingDays("2026-11-13", "2026-11-16", "morning"), 1);
  assert.equal(helpers.leaveWorkingDays("2026-11-13", "2026-11-16", "afternoon"), 1);
});

test("weekends, invalid dates, and reversed ranges do not add leave days", () => {
  assert.equal(helpers.leaveWorkingDays("2026-11-14", "2026-11-15", "full_day"), 0);
  assert.equal(helpers.leaveWorkingDays("2026-02-30", "2026-03-02", "full_day"), 0);
  assert.equal(helpers.leaveWorkingDays("2026-11-16", "2026-11-13", "full_day"), 0);
});

test("leave session labels and fractional day formatting are stable", () => {
  assert.equal(helpers.leaveSessionLabel("morning"), "ครึ่งวันเช้า");
  assert.equal(helpers.leaveSessionLabel("afternoon"), "ครึ่งวันบ่าย");
  assert.equal(helpers.leaveSessionLabel("full_day"), "เต็มวัน");
  assert.equal(helpers.formatLeaveDays(0.5), "0.5");
  assert.equal(helpers.formatLeaveDays(2), "2");
});

test("leave form persists the selected session and refreshes the day preview", () => {
  assert.ok(app.includes('name="leave_session"'));
  assert.ok(app.includes('#leave-session").addEventListener("change",refresh)'));
  assert.ok(app.includes("leave_session: session"));
  assert.ok(app.includes("leave_days: days"));
  assert.ok(!app.includes("inclusiveLeaveDays"));
});

test("quota continues to count one request while summing fractional leave_days", () => {
  assert.ok(app.includes("const usedTimes = approved.length;"));
  assert.ok(app.includes("const usedDays = approved.reduce((sum,r) => sum + Number(r.leave_days || 0), 0);"));
});

test("database enforces weekday-only fractional leave and filters substitute periods", () => {
  assert.ok(migration.includes("leave_requests_zz_apply_working_day_total"));
  assert.ok(migration.includes("private.leave_working_day_total"));
  assert.ok(migration.includes("v_leave.leave_session='morning'"));
  assert.ok(migration.includes("v_leave.leave_session='afternoon'"));
  assert.ok(migration.includes("lr.leave_session='morning'"));
  assert.ok(migration.includes("preschool_group_covers_leave_session_check"));
  assert.ok(!/UPDATE\s+public\.leave_requests\s+SET/i.test(migration));
});
