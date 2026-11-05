import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {calculateElectricityBalance} from '../modules/electricity-arrears.js';

const source=readFileSync(new URL('../app.js',import.meta.url),'utf8');
const migration=readFileSync(new URL('../supabase/migrations/20261105_electricity_safe_delete_void_evidence.sql',import.meta.url),'utf8');

test('four correction controls and secure RPC calls are present',()=>{
  for(const action of ['electricity_delete_meter','electricity_delete_bill','electricity_void_bill','electricity_remove_payment_evidence']){
    assert.match(source,new RegExp(action));
    assert.match(migration,new RegExp('create or replace function public\\.'+action));
  }
  for(const prop of ['data-el-delete-meter','data-el-delete-bill','data-el-void-bill','data-el-remove-slip']){
    assert.match(source,new RegExp(prop));
  }
});
test('all destructive operations require reasons and are recorded in audit',()=>{
  assert.match(migration,/length\(btrim\(coalesce\(p_reason,''\)\)\) < 3/g);
  assert.equal((migration.match(/insert into public\.electricity_action_audit/g)||[]).length,4);
  assert.match(migration,/electricity_action_audit_manager_read/);
  assert.match(source,/name="reason"/);
});
test('teachers cannot cancel or delete paid invoices',()=>{
  assert.match(migration,/if v\.status not in \('reading_submitted','reading_rejected','awaiting_payment'\)/);
  assert.match(migration,/v\.paid_at is not null or v\.receipt_no is not null/);
  assert.match(migration,/v\.payer_user_id=\(select auth\.uid\(\)\) and v\.status in \('reading_submitted','reading_rejected'\)/);
  assert.match(source,/\['payment_submitted','payment_rejected'\]/);
});
test('meter with billing history cannot be erased',()=>{
  assert.match(migration,/if exists\(select 1 from public\.electricity_readings where meter_id=p_meter_id\)/);
  assert.match(source,/มีประวัติบิล · ใช้ปิดใช้งาน/);
});
test('future meter readings block erasing older invoice',()=>{
  assert.match(migration,/np\.billing_month>v_month/g);
  assert.match(migration,/Later meter readings exist/);
});
test('payment slips may only be removed before confirmation',()=>{
  assert.match(migration,/v\.status not in \('payment_submitted','payment_rejected'\)/);
  assert.match(migration,/payment_slip_path=null/);
  assert.match(migration,/status='awaiting_payment'/);
  assert.match(migration,/electricity_can_delete_removed_slip/);
  assert.match(source,/storage\.from\('electricity-evidence'\)\.remove\(\[path\]\)/);
});
test('voided invoice is excluded from carry-forward and is reusable for correction',()=>{
 const periods=[{id:'a',billing_month:'2026-10-01'},{id:'b',billing_month:'2026-11-01'}];
 const b=calculateElectricityBalance(periods,[
  {id:'voided',period_id:'a',status:'voided',amount_due:145},
  {id:'unpaid',period_id:'a',status:'awaiting_payment',amount_due:20}
 ],'b');
 assert.equal(b.totalOutstanding,20);
 assert.match(migration,/status='voided'/);
 assert.match(migration,/NOT IN \('reading_submitted','reading_rejected','voided'\)/);
 assert.match(source,/บันทึกบิลใหม่/);
});
test('monthly manager reports exclude voided bills from financial totals',()=>{
 assert.match(source,/current\.filter\(r=>r\.status!=='voided'\)/);
 assert.match(source,/r\.period_id===p\.id&&r\.status!=='voided'/);
 assert.match(source,/r\.status==='voided'\?'ยกเลิก':r\.amount_due/);
});
test('history makes cancellations auditable without direct public writes',()=>{
 assert.match(source,/electricityAuditHtml/);
 assert.match(migration,/revoke all on public\.electricity_action_audit from public, anon, authenticated/);
 assert.match(migration,/grant select on public\.electricity_action_audit to authenticated/);
 assert.match(migration,/create policy electricity_action_audit_manager_read/);
});
