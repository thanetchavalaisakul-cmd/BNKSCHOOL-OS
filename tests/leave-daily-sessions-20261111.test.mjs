import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";

const app = readFileSync(new URL("../app.js", import.meta.url), "utf8");
const migration = readFileSync(new URL("../supabase/migrations/20261111070045_leave_daily_sessions_20261111.sql", import.meta.url), "utf8");

function extractFunction(name) {
  const start = app.indexOf("function " + name + "(");
  assert.notEqual(start, -1, "missing " + name);
  const next = app.indexOf("\nfunction ", start + 1);
  return app.slice(start, next < 0 ? app.length : next);
}

const helpers = runInNewContext(
  ["leaveDateIsWeekend","leaveSessionLabel","leaveWorkingDates","leaveDailyWorkingDays","leaveDailySessionEntries","leaveDailyScheduleLabel"].map(extractFunction).join("\n") +
  "\n({leaveWorkingDates,leaveDailyWorkingDays,leaveDailyScheduleLabel})",
  { Date, thaiDateOnly: value => String(value ?? "") }
);

test("Friday afternoon through Monday full day deducts 1.5 working days", () => {
  const sessions = {"2026-11-13":"afternoon","2026-11-16":"full_day"};
  assert.equal(helpers.leaveDailyWorkingDays("2026-11-13","2026-11-16",[],sessions),1.5);
});

test("Monday afternoon plus full Tuesday and Wednesday deducts 2.5 days", () => {
  const sessions = {"2026-11-16":"afternoon","2026-11-17":"full_day","2026-11-18":"full_day"};
  assert.equal(helpers.leaveDailyWorkingDays("2026-11-16","2026-11-18",[],sessions),2.5);
});

test("morning and afternoon can be selected independently for each date", () => {
  const sessions = {"2026-11-16":"morning","2026-11-17":"afternoon","2026-11-18":"full_day"};
  assert.equal(helpers.leaveDailyWorkingDays("2026-11-16","2026-11-18",[],sessions),2);
});

test("weekends remain excluded unless the school explicitly marks them as open", () => {
  assert.deepEqual(Array.from(helpers.leaveWorkingDates("2026-11-13","2026-11-16")),["2026-11-13","2026-11-16"]);
  assert.deepEqual(Array.from(helpers.leaveWorkingDates("2026-11-13","2026-11-16",["2026-11-14"])),["2026-11-13","2026-11-14","2026-11-16"]);
  const sessions={"2026-11-13":"full_day","2026-11-14":"morning","2026-11-16":"full_day"};
  assert.equal(helpers.leaveDailyWorkingDays("2026-11-13","2026-11-16",["2026-11-14"],sessions),2.5);
});

test("legacy requests without a daily map continue to use the previous session for every working date", () => {
  assert.equal(helpers.leaveDailyWorkingDays("2026-11-13","2026-11-16",[],{},"afternoon"),1);
});

test("legacy request summary falls back to its original leave session", () => {
  assert.equal(helpers.leaveDailyScheduleLabel({leave_session:"afternoon"}),"ครึ่งวันบ่าย");
});

test("mixed daily sessions are clearly summarized by date for reviewers and documents", () => {
  const label=helpers.leaveDailyScheduleLabel({
    start_date:"2026-11-16",
    end_date:"2026-11-18",
    leave_session:"full_day",
    daily_leave_sessions:{"2026-11-16":"afternoon","2026-11-17":"full_day","2026-11-18":"full_day"}
  });
  assert.match(label,/แยกรายวัน/);
  assert.match(label,/2026-11-16 ครึ่งวันบ่าย/);
  assert.match(label,/2026-11-17 เต็มวัน/);
});

test("leave form stores a per-date session map and still preserves the legacy fallback field", () => {
  assert.ok(app.includes('name="daily_leave_sessions"'));
  assert.ok(app.includes('data-leave-day-session='));
  assert.ok(app.includes("daily_leave_sessions: normalizedDailyLeaveSessions"));
  assert.ok(app.includes("leave_session: session"));
  assert.ok(app.includes("leaveDailyScheduleLabel(request)"));
});

test("database recalculates quota and applies each date's session to substitute and preschool workflows", () => {
  assert.ok(migration.includes("ADD COLUMN IF NOT EXISTS daily_leave_sessions jsonb"));
  assert.ok(migration.includes("private.leave_session_for_date"));
  assert.ok(migration.includes("NEW.daily_leave_sessions"));
  assert.ok(migration.includes("gs.leave_session='morning'"));
  assert.ok(migration.includes("gs.leave_session='afternoon'"));
  assert.ok(migration.includes("OLD.daily_leave_sessions IS DISTINCT FROM NEW.daily_leave_sessions"));
  assert.ok(migration.includes("leave_session=excluded.leave_session"));
  assert.match(migration,/daily_leave_sessions\s+ON public\.leave_requests/);
  assert.ok(!/UPDATE\s+public\.leave_requests\s+SET/i.test(migration));
});
