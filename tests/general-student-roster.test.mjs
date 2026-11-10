import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");
const app = read("app.js");
const min = read("app.min.js");
const feature = read("modules/general-student-roster.js");
const migration = read("supabase/migrations/20261103070000_general_student_roster_management.sql");
const transferMigration = read("supabase/migrations/20261103071000_general_student_roster_transfer_processing.sql");
const index = read("index.html");

test("general roster is registered under General Administration and loaded as a lazy feature", () => {
  assert.match(migration, /'general_student_roster','ระบบจัดการรายชื่อนักเรียน'/);
  assert.match(app, /import\("\.\/modules\/general-student-roster\.js\?v=20261110\.1"\)/);
  assert.match(min, /import\("\.\/modules\/general-student-roster\.js\?v=20261110\.1"\)/);
  assert.match(app, /code === "general_student_roster"/);
  assert.match(min, /e==="general_student_roster"/);
  assert.match(index, /styles\.css\?v=5\.12\.9\.66/);
  assert.match(index, /app\.min\.js\?v=5\.12\.9\.\d+/);
});

test("roster access is explicitly assigned per user and restricted by database policies", () => {
  assert.match(migration, /general_student_roster_permissions/);
  assert.match(migration, /private\.can_access_general_student_roster/);
  assert.match(migration, /private\.can_manage_general_student_transfers/);
  assert.match(migration, /private\.can_add_general_students/);
  assert.match(migration, /private\.can_export_general_student_roster/);
  assert.match(migration, /private\.is_super_admin\(\) OR user_id=\(SELECT auth\.uid\(\)\)/);
  assert.match(app, /generalStudentRosterPermissionRes/);
  assert.match(min, /general_student_roster_permissions/);
});

test("roster RPC returns only operational roster fields and does not expose citizen or guardian data", () => {
  const start = migration.indexOf("CREATE OR REPLACE FUNCTION public.general_student_roster_list");
  const end = migration.indexOf("$function$;", start);
  const body = migration.slice(start, end);
  assert.match(body, /student_code text/);
  assert.match(body, /first_name text/);
  assert.match(body, /class_label text/);
  assert.doesNotMatch(body, /citizen_id|guardian_name|father_name|mother_name|contact_phone/);
  assert.match(feature, /ไม่แสดงเลขประชาชนและข้อมูลผู้ปกครอง/);
});

test("approved transfer workflow uses separate roster processing timestamp and preserves academic finalized_at", () => {
  assert.match(transferMigration, /ADD COLUMN IF NOT EXISTS roster_processed_at/);
  assert.match(transferMigration, /WHERE r\.status='approved' AND r\.roster_processed_at IS NULL/);
  assert.match(transferMigration, /SET roster_processed_at=clock_timestamp\(\),roster_processed_by=auth\.uid\(\)/);
  assert.doesNotMatch(transferMigration, /\bSET\s+finalized_at\s*=/i);
  assert.match(feature, /general_student_roster_transfer_queue/);
  assert.match(feature, /general_student_roster_finalize_transfer/);
  assert.match(feature, /has_active_enrollment/);
});

test("transfer-out notification routes recipients to the new queue and refreshes from realtime changes", () => {
  assert.match(migration, /general_student_transfer_action/);
  assert.match(migration, /general-student-transfer:/);
  assert.match(app, /data-notification-general-roster/);
  assert.match(min, /data-notification-general-roster/);
  assert.match(app, /table: "academic_transfer_requests".*module:general_student_roster/s);
  assert.match(min, /table:"academic_transfer_requests".*module:general_student_roster/s);
});

test("new student and transfer-in records are written to the same student and enrollment master", () => {
  assert.match(migration, /public\.general_student_roster_create_student/);
  assert.match(migration, /INSERT INTO public\.students/);
  assert.match(migration, /INSERT INTO public\.student_enrollments/);
  assert.match(migration, /p_entry_type text DEFAULT 'transfer_in'/);
  assert.match(migration, /'student_added','transfer_in','transfer_out'/);
  assert.match(feature, /p_entry_type:String\(fd\.get\("entry_type"\)\)/);
  assert.match(feature, /p_source_school/);
});

test("PDF, Excel export and individual permission controls are wired", () => {
  assert.match(feature, /studentPdfBase\(/);
  assert.match(feature, /xlsxDownloadFromRows\(/);
  assert.match(feature, /data-gsr-save-permission/);
  assert.match(feature, /can_manage_transfers/);
  assert.match(feature, /can_add_students/);
  assert.match(feature, /can_export/);
});

test("student history is append-only from the feature and transfer-out never deletes historical enrollments", () => {
  assert.match(migration, /general_student_roster_events/);
  assert.match(migration, /ON DELETE RESTRICT/);
  assert.match(migration, /event_type,student_id,enrollment_id,transfer_request_id/);
  assert.match(transferMigration, /UPDATE public\.student_enrollments/);
  assert.doesNotMatch(transferMigration, /DELETE FROM public\.student_enrollments/);
  assert.doesNotMatch(transferMigration, /DELETE FROM public\.students/);
});
