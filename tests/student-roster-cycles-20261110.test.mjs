import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const app = await readFile(new URL("../app.js", import.meta.url), "utf8");
const roster = await readFile(new URL("../modules/general-student-roster.js", import.meta.url), "utf8");
const lifecycle = await readFile(new URL("../supabase/migrations/20261110153548_student_roster_cycles_and_lifecycle.sql", import.meta.url), "utf8");
const guards = await readFile(new URL("../supabase/migrations/20261110154108_student_roster_status_guard_and_idempotency.sql", import.meta.url), "utf8");

test("annual roster cycles are fixed to June 10 and November 10 in Buddhist academic years", () => {
  assert.match(lifecycle, /make_date\(v_year::integer-543,6,10\)/);
  assert.match(lifecycle, /make_date\(v_year::integer-543,11,10\)/);
  assert.match(lifecycle, /timezone\('Asia\/Bangkok',clock_timestamp\(\)\)::date/);
  assert.match(app, /student_roster_cycle_overview/);
  assert.match(app, /10 มิถุนายน/);
  assert.match(app, /10 พฤศจิกายน/);
});

test("verified exits close every active enrollment from the verified term forward, not historical terms", () => {
  assert.match(lifecycle, /close_student_enrollments_from_period/);
  assert.match(lifecycle, /e\.academic_year>p_academic_year/);
  assert.match(lifecycle, /e\.semester>=p_semester/);
  assert.match(lifecycle, /UPDATE public\.students SET status=v_status/);
  assert.match(lifecycle, /student_exit_verified/);
  assert.doesNotMatch(lifecycle, /DELETE\s+FROM\s+public\.students/i);
});

test("master status changes close current and future active enrollments while preserving past periods", () => {
  assert.match(guards, /AFTER UPDATE OF status ON public\.students/);
  assert.match(guards, /e\.academic_year>v_year/);
  assert.match(guards, /e\.semester>=v_semester/);
  assert.match(guards, /CREATE TRIGGER trg_guard_active_student_enrollment/);
  assert.match(guards, /NEW\.enrollment_status='active'/);
  assert.match(guards, /s\.status='active'/);
});

test("receiving a returning student reuses the existing master ID and reactivates the same term enrollment", () => {
  assert.match(lifecycle, /WHERE citizen_id=btrim\(p_citizen_id\)/);
  assert.match(lifecycle, /reused_master_record/);
  assert.match(lifecycle, /UPDATE public\.student_enrollments SET class_id=c\.id/);
  assert.match(lifecycle, /enrollment_status='active',exit_reason=NULL/);
  assert.match(lifecycle, /v_event_type:=CASE WHEN v_reactivated THEN 'transfer_in'/);
});

test("cycle dashboard displays status and import reconciliation progress", () => {
  assert.match(app, /studentRegistryRosterCycles/);
  assert.match(app, /cycleStatusLabel/);
  assert.match(app, /student-review-status/);
  assert.match(app, /pending_count/);
});

test("verified reconciliation rows are locked and not submitted a second time", () => {
  assert.match(app, /review-resolution" \$\{x\.resolved_at\?"disabled":""\}/);
  assert.match(app, /review-note" value=.*x\.resolved_at\?"disabled":""/);
  assert.match(app, /locked:!!tr\.querySelector\("\.review-resolution"\)\?\.disabled/);
  assert.match(guards, /Repeated submissions of the same reviewed row are safe/);
});

test("verified exit history is visible in the general student roster event history", () => {
  assert.match(roster, /student_exit_verified:"ยืนยันพ้นสภาพ"/);
  assert.match(roster, /resolution_note\|\|r\.details\?\.resolution_code/);
});

const access = await readFile(new URL("../supabase/migrations/20261110230030_scope_student_data_rpc_access.sql", import.meta.url), "utf8");

test("class roster RPC applies the central per-student visibility rule", () => {
  assert.match(access, /private\\.can_view_student\\(s\\.id\\)/);
  assert.match(access, /CREATE OR REPLACE FUNCTION public\\.get_student_class_roster/);
});

test("follow-up student picker and case creation use caller RLS and per-student visibility", () => {
  assert.match(access, /get_student_followup_student_options[\\s\\S]*?SECURITY INVOKER/);
  assert.match(access, /add_student_followup_cases[\\s\\S]*?SECURITY INVOKER/);
  assert.match(access, /private\\.can_view_student\\(s\\.id\\)/);
  assert.match(access, /ไม่มีสิทธิ์เข้าถึงข้อมูลรายบุคคล/);
});

test("follow-up case read, insert, update and delete policies enforce student visibility", () => {
  assert.equal((access.match(/private\\.can_view_student\\(student_id\\)/g) || []).length, 5);
  assert.match(access, /mark_student_followup_case_followed[\\s\\S]*?private\\.can_view_student\\(v_case\\.student_id\\)/);
});
