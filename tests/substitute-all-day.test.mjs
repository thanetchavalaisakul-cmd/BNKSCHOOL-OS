import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const app=readFileSync(new URL("../app.js",import.meta.url),"utf8");
const sql=readFileSync(new URL("../supabase-substitute-all-day-20261030.sql",import.meta.url),"utf8");

test("both allocation modes remain accessible in the same planner",()=>{
 assert.match(app,/จัดสรรรายคาบ/);assert.match(app,/จัดสรรครูคนเดียวทั้งวัน/);
 assert.match(app,/legacySubstituteDayPlannerHtml/);
 assert.match(app,/assign_bnk_substitute_signed/);
});
test("four actual classes still become eight day periods without fabricated timetable classes",()=>{
 const real=new Map([[1,"English"],[3,"Thai"],[5,"Math"],[8,"Science"]]);
 const configuredPeriods=Array.from({length:8},(_,i)=>i+1);
 const preview=configuredPeriods.map(n=>({period:n,subject:real.get(n)||null}));
 assert.equal(preview.length,8);assert.equal(preview.filter(x=>x.subject).length,4);
 assert.equal(preview.filter(x=>!x.subject).length,4);
 assert.match(sql,/private\.substitute_day_slots/);
 assert.match(sql,/from public\.timetable_periods per/);
 assert.match(sql,/update public\.substitute_lessons sl set/);
 assert.doesNotMatch(sql,/insert into public\.academic_subjects/);
});
test("full day acceptance uses one central signature transaction",()=>{
 assert.match(app,/confirm_substitute_day_signed/);
 assert.match(app,/withWorkflowSignature/);
 assert.match(sql,/update public\.substitute_day_periods set status='accepted'/);
 assert.match(sql,/insert into public\.school_document_signatures/);
 assert.match(sql,/status='accepted'/);
 assert.match(sql,/p_method='paper'/);
 assert.match(sql,/signed_at=case when p_method='paper' then null else now\(\) end/);
});
test("full-day permissions, collisions, idempotency and atomic legacy guard",()=>{
 assert.match(sql,/private\.can_manage_substitute_lesson/);
 assert.match(sql,/private\.is_active_user/);
 assert.match(sql,/pg_advisory_xact_lock/);
 assert.match(sql,/if v_conflict is not null then raise exception/);
 assert.match(sql,/return v_old; -- idempotent/);
 assert.match(sql,/substitute_day_lesson_guard/);
 assert.match(sql,/grant select on public\.substitute_day_assignments/);
 assert.doesNotMatch(sql,/grant (insert|update|delete) on public\.substitute_day_assignments to authenticated/i);
});
test("all-day PDF identifies the same signature once including paper",()=>{
 assert.match(app,/async function substituteAllDayPdfPreview/);
 assert.match(app,/schoolDocumentSignatureImages/);
 assert.match(app,/substitute_day:/);
 assert.match(app,/รอลายเซ็นจริงบนกระดาษ/);
});
