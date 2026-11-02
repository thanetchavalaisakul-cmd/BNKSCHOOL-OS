import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const app=readFileSync(new URL("../app.js",import.meta.url),"utf8");
const form=readFileSync(new URL("../modules/academic-forms.js",import.meta.url),"utf8");
const sql=readFileSync(new URL("../supabase/migrations/20261102_certificate_preparer_schoolwide.sql",import.meta.url),"utf8");
const html=readFileSync(new URL("../index.html",import.meta.url),"utf8");
test("preparer privilege requires the assigned account to be active",()=>{
 assert.match(sql,/FUNCTION private\.can_prepare_academic_certificate\(\)/);
 assert.match(sql,/private\.is_active_user\(\)/);
 assert.match(sql,/s\.preparer_user_id=\(SELECT auth\.uid\(\)\)/);
 assert.match(sql,/REVOKE ALL ON FUNCTION private\.can_prepare_academic_certificate\(\) FROM PUBLIC, anon, authenticated/);
});
test("assigned preparer can create schoolwide without broadening teacher student registry rights",()=>{
 assert.match(sql,/FUNCTION private\.can_create_certificate_request_for_period/);
 assert.match(sql,/OR private\.can_prepare_academic_certificate\(\)/);
 assert.match(sql,/private\.can_manage_student_class\(e\.class_id\)/);
 assert.match(sql,/e\.enrollment_status='active'/);
 assert.doesNotMatch(sql,/CREATE OR REPLACE FUNCTION private\.can_manage_academic_certificate\(/);
});
test("former-student certificate handling preserves validation and signatures",()=>{
 assert.match(sql,/new_clause := 'if v_type=''/);
 assert.match(sql,/private\.can_prepare_academic_certificate\(\)\) then'/);
 assert.match(sql,/pg_get_functiondef\('public\.save_academic_certificate_request\(uuid,jsonb\)'::regprocedure\)/);
 assert.match(sql,/Certificate former-student role gate has changed/);
 assert.doesNotMatch(sql,/CREATE OR REPLACE FUNCTION private\.can_review_certificate_request_slot/);
});
test("certificate preparer gets whole-school class dropdown without administrative configuration rights",()=>{
 assert.match(app,/function academicCertificateCanPrepareUi\(\)/);
 assert.match(app,/settings\.preparer_user_id===state\.user\.id/);
 assert.match(form,/manager=academicCertificateCanFinalizeUi\(\)\|\|academicCertificateCanManageUi\(\)\|\|academicCertificateCanPrepareUi\(\)/);
 assert.match(form,/id="academic-certificate-class"/);
 assert.match(form,/academicCertificateStudentPickerOptions\(students,null,e\.currentTarget\.value\)/);
 assert.match(app,/mod\.createAcademicFormsFeature\(\{[^}\n]*academicCertificateCanPrepareUi/);
 assert.match(html,/app\.min\.js\?v=5\.12\.9\.64/);
});
