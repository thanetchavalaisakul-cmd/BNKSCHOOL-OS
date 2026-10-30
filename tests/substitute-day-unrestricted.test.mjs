import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const app=readFileSync(new URL("../app.js",import.meta.url),"utf8")+"\n"+readFileSync(new URL("../modules/dashboard-events.js",import.meta.url),"utf8");
const sql=readFileSync(new URL("../supabase-substitute-day-unrestricted-20261030.sql",import.meta.url),"utf8");
const legacy=readFileSync(new URL("../supabase-substitute-all-day-20261030.sql",import.meta.url),"utf8");
test("day selector enables busy teachers but disables absent teacher",()=>{
 assert.match(sql,/\(p\.id<>v_row\.absent_teacher_id\) as available,conf\.reason/);
 assert.match(app,/c\.conflict_reason\?' · '\+escapeHtml\(c\.conflict_reason\)/);
 assert.match(app,/!c\.available\?'disabled'/);
 assert.match(app,/เลือกครูผู้รับผิดชอบทั้งวัน/);
 assert.doesNotMatch(app,/เลือกครูที่ไม่มีภาระชนทั้งวัน/);
});
test("day RPC no longer blocks timetable collisions, leave, or another substitute",()=>{
 assert.doesNotMatch(sql,/if v_conflict is not null then raise exception/);
 assert.match(sql,/p_teacher_id=v_leave\.requester_id/);
 assert.match(sql,/private\.can_manage_substitute_lesson/);
 assert.match(sql,/v_teacher\.id is null/);
 assert.match(sql,/record_bnk_action_signature/);
 assert.match(sql,/substitute_day_slots/);
});
test("warnings remain informational and all-day acceptance remains atomic",()=>{
 for(const t of ["ครูมีคำขอลาในวันเดียวกัน","มีคาบสอนประจำชนกับช่วงเวลาทั้งวัน","มีงานสอนแทนอื่นชนกับช่วงเวลาทั้งวัน","ได้รับมอบหมายทั้งวันให้ใบลาอื่นแล้ว"])
  assert.ok(sql.includes(t),t);
 assert.match(app,/โรงเรียนจัดภาระหน้าที่ภายในเอง/);
 assert.match(app,/confirm_substitute_day_signed/);
 assert.match(legacy,/update public\.substitute_day_periods set status='accepted'/);
});
test("original per-period and four signature options are preserved",()=>{
 assert.match(app,/assign_bnk_substitute_signed/);
 assert.match(app,/get_substitute_candidates/);
 assert.match(app,/confirm_substitute_teacher_signed/);
 assert.match(sql,/grant execute on function public\.assign_substitute_day_signed/);
 assert.doesNotMatch(sql,/create or replace function public\.get_substitute_candidates\(/);
 assert.doesNotMatch(sql,/create or replace function public\.assign_substitute_teacher\(/);
});
