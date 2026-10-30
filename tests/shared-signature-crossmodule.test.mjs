import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const sql=readFileSync(new URL('../supabase-shared-signature-crossmodule-hotfix-20261030.sql',import.meta.url),'utf8');
const gate=sql.slice(sql.indexOf('CREATE OR REPLACE FUNCTION private.bnk_require_preaction_signature()'),sql.indexOf('CREATE OR REPLACE FUNCTION public.record_bnk_action_signature('));
const auth=sql.slice(sql.indexOf('CREATE OR REPLACE FUNCTION public.record_bnk_action_signature('));
test('central gate dispatches first by table before any substitute-only field access',()=>{
  assert.match(gate,/ELSIF TG_TABLE_NAME='substitute_lessons' THEN\s+--/);
  const branch=gate.indexOf("ELSIF TG_TABLE_NAME='substitute_lessons' THEN");
  const field=gate.indexOf('NEW.substitute_teacher_id');
  assert.ok(field>branch);
  assert.match(gate,/IF v_changed THEN[\s\S]*?ELSIF TG_OP='UPDATE' THEN/);
  assert.match(gate,/IF NEW.substitute_teacher_id IS NOT DISTINCT FROM OLD.substitute_teacher_id THEN RETURN NEW/);
  assert.doesNotMatch(gate,/TG_TABLE_NAME='substitute_lessons' AND NEW.status/);
});
test('enforces all nine existing signed actions plus unchanged signature snapshot workflows',()=>{
  for(const code of ['lesson_plans','academic_certificate_requests','academic_document_service_requests','academic_transfer_requests','personnel_pa_submissions','personnel_pa_reports','personnel_pa_assessments','home_visit_records','budget_disbursements','substitute_lessons'])
    assert.ok(gate.includes("TG_TABLE_NAME='"+code+"'"),code);
  assert.match(gate,/s.method NOT IN\('paper','stored','drawn','upload'\)/);
  assert.match(gate,/NEW.teacher_signature_id_snapshot:=s.signature_id/);
  assert.match(gate,/NEW.evaluator_signature_bucket_snapshot:=s.bucket_id/);
});
test('cannot forge substitute signature without managing its lesson',()=>{
  assert.match(auth,/private.can_manage_substitute_lesson\(r.id\)/);
  assert.match(auth,/private.is_active_user\(\)/);
  assert.match(auth,/v_master.user_id|s.user_id=v_uid/);
  assert.match(auth,/p_method='paper'/);
  assert.match(sql,/revoke all on function public.record_bnk_action_signature/);
});
test('leave deletion can cascade only through associated day assignments and audit rows',()=>{
  assert.match(sql,/foreign key \(day_assignment_id\) references public.substitute_day_assignments\(id\) on delete cascade/i);
  assert.match(sql,/foreign key \(leave_request_id\) references public.leave_requests\(id\) on delete cascade/i);
  assert.doesNotMatch(sql,/truncate |delete from public.leave_requests/i);
});
