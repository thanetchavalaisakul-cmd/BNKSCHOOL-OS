import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const app=readFileSync(new URL("../app.js",import.meta.url),"utf8");
const sql=readFileSync(new URL("../supabase/migrations/20261102_attendance_special_approved_time.sql",import.meta.url),"utf8");

test("special permission is manager-only, pre-checkin, audited and revocable",()=>{
 assert.match(sql,/private\.can_manage_official_attendance\(\)/);
 assert.match(sql,/attendance_date=p_date/);
 assert.match(sql,/ไม่สามารถเปลี่ยนการรับรองย้อนหลังได้/);
 assert.match(sql,/official_attendance_special_permission_audit/);
 assert.match(sql,/action IN \('create','edit','revoke'\)/);
 assert.match(sql,/REVOKE ALL ON TABLE public\.official_attendance_special_permissions/);
 assert.match(sql,/CREATE POLICY official_attendance_special_read/);
});
test("valid check-in is still required and actual time remains unchanged",()=>{
 assert.match(sql,/BEFORE INSERT ON public\.official_attendance_records/);
 assert.match(sql,/NEW\.credited_checkin_time:=v_perm\.credited_time/);
 assert.match(sql,/NEW\.status:='on_time'/);
 assert.doesNotMatch(sql,/NEW\.checkin_at\s*:=/);
 assert.match(app,/officialAttendanceSubmitCheckIn\("gps"/);
 assert.match(app,/officialAttendanceCheckIn/);
});
test("records, daily PDF, personal summaries and month counters are consistently recognized",()=>{
 assert.match(app,/officialAttendanceRecognizedTime\(record\)/);
 assert.match(app,/officialAttendanceRecognizedTime\(x\.record\)/);
 assert.match(app,/officialAttendanceRecognizedTime\(r\)/);
 assert.match(app,/if\(r\.status==="late"\)late\+\+/);
 assert.match(app,/เวลาเข้า \(รับรอง\)/);
 assert.match(app,/officialAttendanceSpecialModal/);
 assert.match(app,/revoke_official_attendance_special_permission/);
 assert.match(app,/save_official_attendance_special_permission/);
});
