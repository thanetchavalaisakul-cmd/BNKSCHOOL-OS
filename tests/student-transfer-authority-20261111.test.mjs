import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const app = await readFile(new URL("../app.js", import.meta.url), "utf8");
const authority = await readFile(new URL("../supabase/migrations/20261111000245_student_transfer_authority_and_dmc_import_guard.sql", import.meta.url), "utf8");
const dmcGuard = await readFile(new URL("../supabase/migrations/20261111000421_dmc_transfer_out_requires_transfer_workflow.sql", import.meta.url), "utf8");
const dmcImportPolicy = await readFile(new URL("../supabase/migrations/20261111001627_limit_dmc_skip_to_confirmed_transfer_out.sql", import.meta.url), "utf8");
const renumber = await readFile(new URL("../supabase/migrations/20261111002020_fix_student_class_renumber_temp_range.sql", import.meta.url), "utf8");

test("DMC import skips only confirmed transfer-outs and follows DMC for other statuses", () => {
  const start = dmcImportPolicy.indexOf("CREATE OR REPLACE FUNCTION public.import_student_registry");
  const end = dmcImportPolicy.indexOf("$function$;", start);
  const importer = dmcImportPolicy.slice(start, end);
  assert.match(importer, /IF v_existing_status='transferred_out' THEN/);
  assert.doesNotMatch(importer, /v_existing_status IS DISTINCT FROM 'active'/);
  assert.match(importer, /status='active',updated_by=auth\.uid\(\),updated_at=now\(\)/);
  assert.match(importer, /'skipped_transferred_out',v_skipped_transferred_out/);
  assert.match(renumber, /set student_number=2000000000\+ranked\.rn/);
  assert.match(renumber, /set student_number=ranked\.rn/);
  assert.match(app, /master\.status==="transferred_out"/);
  assert.match(app, /blockedTransferredOut/);
  assert.doesNotMatch(app, /master\.status!=="active"/);
  assert.match(app, /skippedTransferredOut\+=Number\(data\?\.skipped_transferred_out\|\|0\)/);
});

test("DMC absence cannot mark a student transferred out", () => {
  assert.match(app, /ไม่พบชื่อใน DMC ไม่ได้แปลว่าย้ายออก/);
  assert.match(app, /function studentImportResolutionOptions\(selected="",locked=false\)/);
  assert.match(app, /locked&&selected==="transferred_out"/);
  assert.doesNotMatch(app, /\["transferred_out","ย้ายสถานศึกษา \/ ย้ายออก"\]/);
  assert.match(authority, /ไม่สามารถยืนยันจากไฟล์ DMC ได้/);
  assert.match(authority, /r\.status='approved' AND r\.roster_processed_at IS NULL/);
  assert.match(dmcGuard, /IF v_code NOT IN \('keep_active','transferred_out','not_continuing'/);
});

test("only the approved transfer workflow can set transferred-out status", () => {
  assert.match(authority, /CREATE OR REPLACE FUNCTION private\.is_authorized_transfer_out/);
  assert.match(authority, /r\.roster_processed_at=statement_timestamp\(\)/);
  assert.match(authority, /CREATE TRIGGER trg_guard_transfer_out_enrollment/);
  assert.match(authority, /CREATE TRIGGER trg_guard_student_transfer_out_status/);
  const start = authority.indexOf("CREATE OR REPLACE FUNCTION public.general_student_roster_finalize_transfer");
  const end = authority.indexOf("$function$;", start);
  const transfer = authority.slice(start, end);
  assert.ok(transfer.indexOf("UPDATE public.academic_transfer_requests") < transfer.indexOf("UPDATE public.student_enrollments x"));
  assert.match(transfer, /v_processed_at:=statement_timestamp\(\)/);
});

test("manual roster removal and promotion cannot substitute for transfer-out", () => {
  const start = app.indexOf("function studentExitEnrollmentModal");
  const end = app.indexOf("\nfunction studentAcademicYearModal", start);
  const exitModal = app.slice(start, end);
  assert.doesNotMatch(exitModal, /value="transferred_out"/);
  assert.match(exitModal, /const status="inactive"/);
  assert.match(exitModal, /ต้องใช้ระบบย้ายสถานศึกษา/);
  assert.doesNotMatch(app, /<option value="transferred_out">ย้ายออก<\/option>/);
  assert.match(authority, /v_item\.decision='transferred_out'/);
});

test("reactivation of a transferred-out master record requires explicit transfer-in", () => {
  assert.match(authority, /s\.status='transferred_out' AND p_entry_type<>'transfer_in'/);
  assert.match(authority, /ต้องดำเนินการรับย้ายเข้าผ่านระบบรับย้ายเข้าเท่านั้น/);
});

test("payment evidence shows transfer-out only after roster processing is complete", () => {
  assert.match(authority, /when tr\.roster_processed_at is not null then 'transferred_out'/);
  assert.doesNotMatch(authority, /when tr\.status in \('approved', 'completed', 'processed'\) then 'transferred_out'/);
});
