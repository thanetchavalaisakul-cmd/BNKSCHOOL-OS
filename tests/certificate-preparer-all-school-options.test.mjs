import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const migration=readFileSync(new URL("../supabase/migrations/20261102_certificate_preparer_options_all_students.sql",import.meta.url),"utf8");
test("designated certificate preparer receives students beyond current homeroom and current semester",()=>{
 assert.match(migration,/get_certificate_request_student_options\(text,integer\)/);
 assert.match(migration,/or private\.can_prepare_academic_certificate\(\)/);
 assert.match(migration,/or s\.id in\(select student_id from current_scope\)/);
 assert.match(migration,/Certificate options permission clause changed/);
 assert.doesNotMatch(migration,/CREATE OR REPLACE FUNCTION public\.get_transfer_request_student_options/);
});
