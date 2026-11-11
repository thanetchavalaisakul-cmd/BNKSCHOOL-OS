import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const migration = readFileSync(new URL("../supabase/migrations/20261111022654_current_dmc_roster_only_across_modules.sql", import.meta.url), "utf8");
const payment = readFileSync(new URL("../modules/payment-evidence-documents.js", import.meta.url), "utf8");
const general = readFileSync(new URL("../modules/general-student-roster.js", import.meta.url), "utf8");

test("central DMC eligibility requires active master and exact active enrollment, and hides unresolved latest-file misses", () => {
  assert.match(migration, /CREATE OR REPLACE FUNCTION private\.is_current_dmc_roster_student/);
  assert.match(migration, /s\.status='active'/);
  assert.match(migration, /e\.enrollment_status='active'/);
  assert.match(migration, /issue_type='missing_from_file'/);
  assert.match(migration, /resolution_code IS NULL/);
  assert.match(migration, /ORDER BY rs\.created_at DESC,rs\.id DESC/);
});

test("all operational student-list RPCs use the shared DMC eligibility rule", () => {
  const names = [
    "payment_evidence_roster",
    "behavior_roster",
    "edufee_roster",
    "get_student_class_roster",
    "general_student_roster_list",
    "get_club_activity_student_candidates",
    "get_transfer_request_student_options",
    "get_academic_document_service_student_options",
    "get_certificate_request_student_options",
    "get_student_followup_student_options",
  ];
  for (const name of names) {
    const start = migration.indexOf(`CREATE OR REPLACE FUNCTION public.${name}`);
    assert.notEqual(start, -1, `missing migration function: ${name}`);
    const end = migration.indexOf("$function$;", start);
    assert.notEqual(end, -1, `missing function end: ${name}`);
    assert.match(migration.slice(start, end), /private\.is_current_dmc_roster_student/);
  }
});

test("payment evidence uses the exact selected period and never adds historical ghost rows to the editor", () => {
  assert.match(migration, /e\.semester=p_semester/);
  assert.match(migration, /e\.class_id=p_class_id/);
  assert.doesNotMatch(migration, /p_semester=2[\s\S]*?e\.semester=1/);
  assert.doesNotMatch(payment, /isHistorical:\s*true/);
  assert.match(payment, /ชุดที่ 1 · เลือกทั้งหมดตามรายชื่อล่าสุด/);
  assert.doesNotMatch(payment, /ชุดที่ 1 · เลือกทั้งหมดรวมเด็กผี/);
});

test("general roster has no status selector that can reveal transferred or inactive records", () => {
  assert.doesNotMatch(general, /id="gsr-status"/);
  assert.doesNotMatch(general, /state\.generalStudentRosterStatus!==/);
  assert.match(general, /current DMC-verified student list/);
});
