import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const app = readFileSync(new URL("../app.js", import.meta.url), "utf8");
const roleMigration = readFileSync(new URL("../supabase/migrations/20261111114000_office_admin_two_modules.sql", import.meta.url), "utf8");
const personalMigration = readFileSync(new URL("../supabase/migrations/20261111181000_office_admin_personal_scope.sql", import.meta.url), "utf8");

test("office admin sees only the two assigned modules and starts on personal leave history", () => {
  assert.ok(app.includes('office_admin: "ธุรการ"'));
  assert.ok(app.includes('allowedOfficeModules = ["leave_management","housing_electricity"]'));
  assert.ok(app.includes('state.modules = state.modules.filter(m=>allowedOfficeModules.includes(m.code))'));
  assert.ok(app.includes('office-admin-sidebar'));
  assert.ok(app.includes('state.leaveView = "mine"'));
  assert.ok(app.includes('return isPersonnelHeadUser() || canFinalReviewLeave() || state.profile?.role === "super_admin";'));
  assert.ok(!app.includes('return isPersonnelHeadUser() || canFinalReviewLeave() || state.profile?.role === "super_admin" || isOfficeAdminUser();'));
});

test("office admin can submit and track only their own leave requests", () => {
  assert.ok(personalMigration.includes("v_profile.role not in ('teacher','department_head','director','super_admin','office_admin')"));
  assert.ok(personalMigration.includes("v_actor.role not in ('teacher','department_head','director','super_admin','office_admin')"));
  assert.ok(personalMigration.includes('r.requester_id = auth.uid()'));
  assert.ok(personalMigration.includes('OR private."current_role"() IN (\'director\',\'super_admin\')'));
  assert.ok(!personalMigration.includes('OR private."current_role"() IN (\'director\',\'super_admin\',\'office_admin\')'));
  assert.ok(!personalMigration.includes('OR ((SELECT private."current_role"()) = \'office_admin\''));
});

test("office admin is never treated as electricity manager", () => {
  assert.ok(app.includes('function electricityManagerUi(){return isSuperAdminUser()||(!isOfficeAdminUser()&&state.electricitySettings?.manager_user_id===state.user?.id);}'));
  assert.ok(app.includes("filter(p=>p.role!=='office_admin')"));
  assert.ok(personalMigration.includes('coalesce(private."current_role"(), \'\') <> \'office_admin\''));
  assert.ok(!personalMigration.includes('private."current_role"() = \'office_admin\''));
  assert.ok(app.includes('const defaultAffects = r.id ? Boolean(r.affects_teaching_schedule) : !["director","super_admin","office_admin"].includes(state.profile.role);'));
});

test("electricity history and evidence are visible to the assigned meter occupant only", () => {
  assert.ok(personalMigration.includes('m.occupant_user_id = (SELECT auth.uid())'));
  assert.ok(personalMigration.includes('CREATE POLICY electricity_readings_read'));
  assert.ok(personalMigration.includes('private.electricity_can_view_reading(id)'));
  assert.ok(personalMigration.includes('private.electricity_can_view_file(p_path)'));
  assert.ok(personalMigration.includes('r.payer_user_id = (SELECT auth.uid())'));
});

test("office admin signup and Super Admin approval remain available", () => {
  assert.ok(app.includes('value="none">ไม่สังกัดฝ่าย (ธุรการ)'));
  assert.ok(app.includes('value="none">ไม่ระบุกลุ่มสาระ (ธุรการ)'));
  assert.ok(app.includes('requested_department_code: requestedDepartmentCode && requestedDepartmentCode !== "none" ? requestedDepartmentCode : null'));
  assert.ok(app.includes('subject_group_code: subjectGroupCode && subjectGroupCode !== "none" ? subjectGroupCode : null'));
  assert.ok(app.includes('Office Admin — ธุรการ (ยื่นลาและใช้ค่าไฟฟ้าส่วนตัว)'));
  assert.ok(roleMigration.includes("'office_admin'::text"));
  assert.ok(roleMigration.includes("p_role NOT IN ('teacher','department_head','director','office_admin')"));
});

test("office admin does not receive general signature or approval workspace", () => {
  assert.ok(app.includes('if(isOfficeAdminUser()) {\n    state.personnelOwnRecord = null;'));
  assert.ok(app.includes('state.approvalControlCenter = null;'));
  assert.ok(app.includes('state.signaturePreferences = null;'));
});
