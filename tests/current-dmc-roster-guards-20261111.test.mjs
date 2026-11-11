import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const migration = readFileSync(
  new URL("../supabase/migrations/20261111025407_current_dmc_roster_guards_all_remaining_modules.sql", import.meta.url),
  "utf8",
);

const guardedFunctions = [
  "get_classroom_research_assignment_options",
  "get_learning_media_assignment_options",
  "get_lesson_plan_usage_assignment_options",
  "get_learner_activity_class_options",
  "get_my_homeroom_context",
  "initialize_academic_exam_attempts",
  "edufee_record_payment",
  "edufee_set_deposit_choice",
  "add_student_followup_cases",
  "copy_student_registry_semester",
  "apply_student_promotion_batch",
  "save_academic_transfer_request",
  "save_academic_certificate_request",
  "save_academic_document_service_request",
  "save_club_activity_members",
  "save_learner_activity_report",
  "save_lesson_plan_usage_report",
];

test("all remaining operational counts and write paths enforce current DMC eligibility", () => {
  for (const name of guardedFunctions) {
    const start = migration.indexOf(`CREATE OR REPLACE FUNCTION public.${name}`);
    assert.notEqual(start, -1, `missing DMC guard migration for ${name}`);
    const end = migration.indexOf("$function$;", start);
    assert.notEqual(end, -1, `unterminated SQL function ${name}`);
    assert.match(
      migration.slice(start, end),
      /private\.is_current_dmc_roster_student/,
      `${name} must use the central DMC eligibility rule`,
    );
  }
});

test("former-student certificate requests and historical service records remain supported", () => {
  assert.match(migration, /v_type='former'/);
  assert.match(migration, /v_enroll\.id is not null and not private\.is_current_dmc_roster_student/);
});
