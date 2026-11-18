import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const migration=read("supabase/migrations/20261118111500_student_suspension_followup_marker.sql");
const app=read("app.js");
const roster=read("modules/general-student-roster.js");

test("suspension is an additional flag that does not withdraw or delete students",()=>{
  assert.match(migration,/ADD COLUMN IF NOT EXISTS is_suspended boolean NOT NULL DEFAULT false/);
  assert.match(migration,/WHERE id=p_enrollment_id/);
  assert.doesNotMatch(migration,/DELETE FROM public\.students/i);
  assert.doesNotMatch(migration,/SET enrollment_status\s*=/i);
});
test("only academic admin or assigned homeroom teacher can mark suspension",()=>{
  assert.match(migration,/private\.can_manage_student_master\(\)/);
  assert.match(migration,/public\.homeroom_teachers h/);
  assert.match(migration,/h\.teacher_id = v_actor/);
  assert.match(migration,/private\.is_active_user\(\)/);
  assert.match(migration,/REVOKE ALL ON FUNCTION public\.set_student_enrollment_suspension/);
});
test("suspension changes are audited with student-scoped read security",()=>{
  assert.match(migration,/CREATE TABLE IF NOT EXISTS public\.student_suspension_events/);
  assert.match(migration,/ENABLE ROW LEVEL SECURITY/);
  assert.match(migration,/private\.can_view_student\(student_id\)/);
  assert.match(migration,/AFTER UPDATE OF is_suspended/);
});
test("academic registry and both export formats visibly preserve suspended students",()=>{
  assert.match(app,/studentSuspensionBadge/);
  assert.match(app,/student-only-suspended/);
  assert.match(app,/set_student_enrollment_suspension/);
  assert.match(app,/studentClassListSuspensionSuffix/);
  assert.match(app,/"สถานะติดตาม":e\.is_suspended/);
});
test("academic follow-up sees suspended student queue without automatically issuing letters",()=>{
  assert.match(app,/studentSuspensionFollowupPanel/);
  assert.match(app,/state\.studentFollowupSuspendedIds=new Set/);
  assert.match(app,/studentSuspensionBadge\(state\.studentFollowupSuspendedIds/);
});
test("general roster PDFs and Excel show the shared suspension marker",()=>{
  assert.match(roster,/generalStudentRosterSuspensionOnly/);
  assert.match(roster,/"สถานะติดตาม":r\.is_suspended/);
  assert.match(roster,/id="gsr-suspended-only"/);
});
