import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";

const app = readFileSync(new URL("../app.js", import.meta.url), "utf8");
const migration = readFileSync(new URL("../supabase/migrations/20261123070000_official_duty_leave_type.sql", import.meta.url), "utf8");

function extractFunction(name) {
  const start = app.search(new RegExp("^function " + name + "\\(", "m"));
  assert.notEqual(start, -1, "missing " + name);
  const next = app.slice(start + 1).search(/^(?:async\s+)?function \w+\(/m);
  return app.slice(start, next < 0 ? app.length : start + 1 + next);
}
const { isOfficialDutyRequest } = runInNewContext(
  extractFunction("isOfficialDutyRequest") + "\n({isOfficialDutyRequest})"
);

test("only official-duty code is classified as duty, and normal leave remains leave", () => {
  assert.equal(isOfficialDutyRequest({leave_type_code:"official_duty"}), true);
  assert.equal(isOfficialDutyRequest({leave_type_code:"sick"}), false);
  assert.equal(isOfficialDutyRequest({leave_type_code:"personal"}), false);
  assert.equal(isOfficialDutyRequest(null), false);
});

test("SQL registers non-quota type without deleting or resetting any past leave", () => {
  assert.match(migration, /INSERT INTO public\.leave_types/);
  assert.match(migration, /'official_duty'/);
  assert.match(migration, /false,\s*8,\s*true/);
  assert.match(migration, /counts_against_quota\s*=\s*false/);
  assert.match(migration, /leave_types_official_duty_no_quota/);
  assert.doesNotMatch(migration, /\bTRUNCATE\b|\bDELETE FROM public\.leave_requests\b/i);
});

test("existing leave modal offers official duty, reason, location, and schedule", () => {
  assert.ok(app.includes('name="leave_type_code"'));
  assert.ok(app.includes('id="leave-official-duty-note"'));
  assert.ok(app.includes("ภารกิจ / การอบรม / เลขคำสั่งที่ได้รับมอบหมาย"));
  assert.ok(app.includes("สถานที่ไปราชการ (ถ้ามี)"));
  assert.ok(app.includes('name="affects_teaching_schedule"'));
  assert.ok(app.includes("ระยะเวลาปฏิบัติราชการ · ไม่หักโควตาวันลา"));
  assert.ok(app.includes('leave_type_code: String(fd.get("leave_type_code"))'));
});

test("leave quota and school/person reports keep official duty out of leave counts", () => {
  assert.ok(app.includes('const countedCodes = new Set(state.leaveTypes.filter(t => t.counts_against_quota)'));
  assert.ok(extractFunction("schoolLeaveSummaryRows").includes("filter(r => !isOfficialDutyRequest(r))"));
  assert.ok(extractFunction("leavePeriodOverviewStats").includes("filter(r => !isOfficialDutyRequest(r))"));
  assert.ok(extractFunction("leaveTypeStatsForUser").includes('type.code !== "official_duty"'));
  assert.ok(extractFunction("leaveIndividualReportSectionHtml").includes('r.status==="approved" && !isOfficialDutyRequest(r)'));
  assert.ok(extractFunction("buildSchoolLeaveReportHtml").includes('t.code !== "official_duty"'));
});

test("official duty remains visible in shared history and has its own approved counter", () => {
  assert.match(extractFunction("leaveOwnDashboardHtml"), /officialApproved/);
  assert.match(extractFunction("leaveOwnDashboardHtml"), /ไปราชการที่อนุมัติ/);
  assert.match(extractFunction("leaveHistoryTable"), /isOfficialDutyRequest\(r\)/);
  assert.match(extractFunction("leaveDetailHtml"), /ระยะเวลาไปราชการ/);
});

test("A4 duty documents have accurate purpose, title, and non-quota label", () => {
  const print = extractFunction("buildLeaveA4Html");
  assert.match(print, /แบบบันทึกการไปราชการ/);
  assert.match(print, /ผู้ไปราชการ/);
  assert.match(print, /ระยะเวลาไปราชการ \(ไม่หักวันลา\)/);
  assert.match(print, /ไม่ใช่การลา และไม่หักโควตาวันลา/);
});

test("requests continue through original signed workflow and substitute scheduler", () => {
  const save = extractFunction("saveLeaveRequest");
  assert.match(save, /submit_leave_request_signed/);
  assert.match(save, /affects_teaching_schedule: Boolean\(fd\.get\("affects_teaching_schedule"\)\)/);
  assert.match(app, /supabase\.from\("substitute_lessons"\)\.select/);
  assert.match(app, /canOpenOwnSubstituteFromLeave/);
  assert.match(app, /substitute_lessons/);
});
