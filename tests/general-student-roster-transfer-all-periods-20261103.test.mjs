import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const migration = readFileSync(new URL("../supabase/migrations/20261103090000_general_student_roster_transfer_all_periods.sql", import.meta.url), "utf8");
const roster = readFileSync(new URL("../modules/general-student-roster.js", import.meta.url), "utf8");

test("an approved transfer changes the referenced and all already-copied later active terms atomically", () => {
  assert.match(migration, /CREATE OR REPLACE FUNCTION public\.general_student_roster_finalize_transfer\(p_request_id uuid\)/);
  assert.match(migration, /private\.can_manage_general_student_transfers\(\)/);
  assert.match(migration, /r\.roster_processed_at IS NOT NULL/);
  assert.match(migration, /x\.student_id=r\.student_id AND x\.enrollment_status='active'/);
  assert.match(migration, /x\.academic_year>r\.academic_year/);
  assert.match(migration, /x\.academic_year=r\.academic_year AND x\.semester>=r\.semester/);
  assert.match(migration, /UPDATE public\.student_enrollments x[\s\S]*SET enrollment_status='transferred_out'/);
  assert.match(migration, /GET DIAGNOSTICS v_changed = ROW_COUNT;/);
  assert.match(migration, /v_changed<>jsonb_array_length\(v_affected_periods\)/);
});

test("student master and transfer history remain synchronized without deleting historical enrollments", () => {
  assert.match(migration, /UPDATE public\.students[\s\S]*SET status='transferred_out'/);
  assert.match(migration, /SET roster_processed_at=v_processed_at/);
  assert.doesNotMatch(migration, /\bSET\s+finalized_at\s*=/i);
  assert.match(migration, /'affected_periods',v_affected_periods/);
  assert.match(migration, /'previous_student_number',x\.student_number/);
  assert.match(migration, /UPDATE public\.notifications[\s\S]*resolved_at=coalesce/);
  assert.doesNotMatch(migration, /DELETE\s+FROM\s+(public\.)?(students|student_enrollments)/i);
});

test("operational roster and PDF/Excel export default to active learners, with archived status still selectable", () => {
  assert.match(roster, /if\(!state\.generalStudentRosterDefaultStatusSet\)/);
  assert.match(roster, /state\.generalStudentRosterStatus="active"/);
  assert.match(roster, /if\(state\.generalStudentRosterStatus!=="all"&&r\.enrollment_status!==state\.generalStudentRosterStatus\)return false/);
  assert.match(roster, /<option value="all">ทุกสถานะ<\/option>/);
  assert.match(roster, /<option value="transferred_out"/);
  assert.match(roster, /function exportRows\(\)\{\s*return filteredRows\(\)/);
  assert.match(roster, /async function exportPdf\(\)[\s\S]*const rows=filteredRows\(\)/);
  assert.match(roster, /นักเรียนกำลังศึกษา/);
  assert.match(roster, /ทะเบียนภาคเรียนนี้/);
});

test("academic registry current student list excludes transferred learners in source and compiled bundle", () => {
  const app = readFileSync(new URL("../app.js", import.meta.url), "utf8");
  const min = readFileSync(new URL("../app.min.js", import.meta.url), "utf8");
  const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  assert.match(app, /function studentVisibleEnrollments\(\)[\s\S]*?studentRegistryEnrollments\.filter\(e=>e\.enrollment_status==="active"&&String\(e\.academic_year\)/);
  assert.match(min, /studentRegistryEnrollments\.filter\(r=>r\.enrollment_status==="active"&&String\(r\.academic_year\)/);
  assert.match(app, /import\("\.\/modules\/general-student-roster\.js\?v=20261110\.1"\)/);
  assert.match(min, /import\("\.\/modules\/general-student-roster\.js\?v=20261110\.1"\)/);
  assert.match(html, /app\.min\.js\?v=5\.12\.9\.\d+/);
});
