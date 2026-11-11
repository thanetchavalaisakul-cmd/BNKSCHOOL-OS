import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const app = readFileSync(new URL("../app.js", import.meta.url), "utf8");
const migration = readFileSync(new URL("../supabase/migrations/20261111114000_office_admin_two_modules.sql", import.meta.url), "utf8");

test("office admin has a distinct display role and only two visible modules", () => {
  assert.ok(app.includes('office_admin: "ธุรการ"'));
  assert.ok(app.includes('allowedOfficeModules = ["leave_management","housing_electricity"]'));
  assert.ok(app.includes('state.modules = state.modules.filter(m=>allowedOfficeModules.includes(m.code))'));
  assert.ok(app.includes('office-admin-sidebar'));
  assert.ok(app.includes('!["module:leave_management","module:housing_electricity"].includes(state.currentView)'));
  assert.ok(app.includes('state.leaveView = "all"'));
});

test("office admin is included in both staff rosters and can see the leave overview", () => {
  assert.ok(app.includes('.in("role", ["teacher","department_head","director","office_admin"])'));
  assert.ok(app.includes('state.profile?.role === "super_admin" || isOfficeAdminUser()'));
  assert.ok(app.includes('function isOfficeAdminUser()'));
  assert.ok(app.includes('personnel_public_directory'));
});

test("office admin receives electricity manager UI but no general signature or approval workspace", () => {
  assert.ok(app.includes('function electricityManagerUi(){return isSuperAdminUser()||isOfficeAdminUser()||state.electricitySettings?.manager_user_id===state.user?.id;}'));
  assert.ok(app.includes('if(isOfficeAdminUser()) {\n    state.personnelOwnRecord = null;'));
  assert.ok(app.includes('state.approvalControlCenter = null;'));
  assert.ok(app.includes('state.signaturePreferences = null;'));
});

test("office admin can sign up without selecting a department or subject group", () => {
  assert.ok(app.includes('value="none">ไม่สังกัดฝ่าย (ธุรการ)'));
  assert.ok(app.includes('value="none">ไม่ระบุกลุ่มสาระ (ธุรการ)'));
  assert.ok(app.includes('requested_department_code: requestedDepartmentCode && requestedDepartmentCode !== "none" ? requestedDepartmentCode : null'));
  assert.ok(app.includes('subject_group_code: subjectGroupCode && subjectGroupCode !== "none" ? subjectGroupCode : null'));
});

test("Super Admin can approve the dedicated office admin role", () => {
  assert.ok(app.includes('Office Admin — ธุรการ (ระบบวันลา + ค่าไฟฟ้าเท่านั้น)'));
  assert.ok(migration.includes("'office_admin'::text"));
  assert.ok(migration.includes("p_role NOT IN ('teacher','department_head','director','office_admin')"));
});

test("database access is limited to leave and housing electricity for office admin", () => {
  assert.ok(migration.includes("private.current_role() = 'office_admin'"));
  assert.ok(migration.includes("private.current_role() IN ('director','super_admin','office_admin')"));
  assert.ok(migration.includes("code IN ('leave_management','housing_electricity')"));
  assert.ok(migration.includes("CREATE POLICY office_admin_module_scope ON public.%I AS RESTRICTIVE"));
  assert.ok(migration.includes("CREATE POLICY profiles_read_scope"));
  assert.ok(migration.includes("CREATE POLICY leave_requests_read_scope"));
  assert.ok(migration.includes("AND NEW.role <> 'office_admin'"));
});
