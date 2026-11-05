import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {calculateElectricityBalance,renderElectricityCarryoverHtml} from '../modules/electricity-arrears.js';

const periods=[
  {id:'oct',billing_month:'2026-10-01',status:'open'},
  {id:'nov',billing_month:'2026-11-01',status:'open'},
  {id:'dec',billing_month:'2026-12-01',status:'open'}
];
const bill=(id,period_id,status,amount_due)=>({id,period_id,status,amount_due,meter_id:'meter-1',house_label_snapshot:'House 1'});

test('open November without a collected bill still shows October overdue',()=>{
  const b=calculateElectricityBalance(periods,[bill('oct1','oct','awaiting_payment',145)],'nov');
  assert.equal(b.priorOutstanding,145);
  assert.equal(b.currentOutstanding,0);
  assert.equal(b.currentIssuedCount,0);
  assert.equal(b.totalOutstanding,145);
});
test('old and current outstanding balances remain separate',()=>{
  const readings=[bill('oct1','oct','awaiting_payment',145),bill('nov1','nov','awaiting_payment',200)];
  const b=calculateElectricityBalance(periods,readings,'nov');
  assert.deepEqual([b.priorOutstanding,b.currentOutstanding,b.totalOutstanding],[145,200,345]);
  assert.equal(readings[0].billing_month,undefined);
});
test('payment confirmation removes old balance but retains invoice history',()=>{
  const reading=bill('oct1','oct','paid',145);
  const b=calculateElectricityBalance(periods,[reading,bill('nov1','nov','awaiting_payment',200)],'nov');
  assert.equal(b.priorOutstanding,0);assert.equal(b.totalOutstanding,200);
  assert.equal(reading.status,'paid');
});
test('submitted slips require approval and should not offer another payment',()=>{
  const b=calculateElectricityBalance(periods,[bill('oct1','oct','payment_submitted',145)],'nov');
  assert.equal(b.totalOutstanding,145);assert.equal(b.waitingForConfirmation,145);
  const html=renderElectricityCarryoverHtml({period:periods[1],balance:b,isManager:false,
    formatMonth:x=>x,formatMoney:x=>Number(x).toFixed(2),escapeHtml:x=>x,
    renderStatus:()=>'',renderActions:r=>r.status==='payment_submitted'?'ดูสลิป':'แนบสลิป'});
  assert.match(html,/ไม่ต้องโอนซ้ำ/);assert.doesNotMatch(html,/แนบสลิป/);
});
test('unreviewed or rejected readings are not yet payable',()=>{
  const b=calculateElectricityBalance(periods,[bill('oct1','oct','reading_submitted',145),bill('nov1','nov','reading_rejected',200)],'nov');
  assert.equal(b.totalOutstanding,0);assert.equal(b.currentIssuedCount,0);
});
test('past period never includes future bills',()=>{
  const b=calculateElectricityBalance(periods,[bill('oct1','oct','awaiting_payment',145),bill('nov1','nov','awaiting_payment',200)],'oct');
  assert.equal(b.priorOutstanding,0);assert.equal(b.currentOutstanding,145);
});
test('multiple earlier months accumulate and paid invoices are excluded',()=>{
  const b=calculateElectricityBalance(periods,[
    bill('oct1','oct','awaiting_payment',145),bill('nov1','nov','payment_rejected',200),bill('nov2','nov','paid',300)
  ],'dec');
  assert.equal(b.priorOutstanding,345);assert.equal(b.totalOutstanding,345);
});
test('rendered teacher notice links back to original October payment',()=>{
  const b=calculateElectricityBalance(periods,[bill('oct1','oct','awaiting_payment',145)],'nov');
  const html=renderElectricityCarryoverHtml({period:periods[1],balance:b,isManager:false,
    formatMonth:x=>x,formatMoney:x=>Number(x).toFixed(2),escapeHtml:x=>x,
    renderStatus:()=>'',renderActions:r=>'<button data-el-slip="'+r.id+'">จ่าย</button>'});
  assert.match(html,/รอออกยอด/);assert.match(html,/data-el-slip="oct1"/);
  assert.match(html,/ยอดค้างชำระก่อนหน้า/);assert.match(html,/145.00/);
});
test('electricity app integrates notice into current workspace and existing button handlers',()=>{
  const app=readFileSync(new URL('../app.js',import.meta.url),'utf8');
  assert.match(app,/import \{calculateElectricityBalance,renderElectricityCarryoverHtml\} from/);
  assert.match(app,/\$\{cards\}\$\{electricityCarryover\}\$\{bankBox\}/);
  assert.match(app,/data-el-slip/);
});
