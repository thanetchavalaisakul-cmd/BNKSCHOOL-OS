import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

const source = readFileSync(new URL('../app.js', import.meta.url), 'utf8');
const reportFunction = source.split('\n').find(line => line.startsWith('function electricityReportPdf()'));
assert.ok(reportFunction, 'electricity PDF report function is present');

function renderReport(readings) {
  const period = {id:'period-1',billing_month:'2026-11-01',unit_rate:4.25};
  const meters = ['meter-1','meter-2','meter-3'].map((id,i)=>({id,house_label:'บ้าน '+(i+1),is_active:true}));
  let html = '',styles = '';
  runInNewContext(reportFunction + '\nelectricityReportPdf();', {
    state:{electricityReadings:readings,electricityMeters:meters},
    electricityManagerUi:()=>true,
    electricityPeriod:()=>period,
    electricityMyName:m=>m.house_label,
    electricityMonthLabel:()=> 'พฤศจิกายน 2569',
    thaiDateCompact:value=>value==='2026-11-05T10:00:00+07:00'?'5 พ.ย. 2569':'UNEXPECTED_DATE',
    schoolName:()=> 'โรงเรียนบ้านหนองเขียว',
    money:n=>Number(n).toFixed(2),
    escapeHtml:s=>String(s??''),
    ELECTRICITY_STATUS:{paid:'ชำระแล้ว',awaiting_payment:'ยังไม่ชำระ',payment_submitted:'รอตรวจรับเงิน'},
    toast:()=>{throw new Error('Unexpected toast');},
    openPrintPreview:(body,css)=>{html=body;styles=css;}
  });
  return {html,styles};
}

test('monthly electricity PDF shows stored paid date only for confirmed payment',()=>{
  const {html,styles}=renderReport([
    {id:'r1',period_id:'period-1',meter_id:'meter-1',status:'paid',paid_at:'2026-11-05T10:00:00+07:00',amount_due:120,used_units:30,payer_name_snapshot:'ครู ก'},
    {id:'r2',period_id:'period-1',meter_id:'meter-2',status:'awaiting_payment',paid_at:'2026-11-05T10:00:00+07:00',amount_due:80,used_units:20,payer_name_snapshot:'ครู ข'},
    {id:'r3',period_id:'period-1',meter_id:'meter-3',status:'paid',paid_at:null,amount_due:40,used_units:10,payer_name_snapshot:'ครู ค'}
  ]);
  assert.match(html,/<th>สถานะ<\/th><th>วันที่ชำระ<\/th>/);
  assert.match(html,/<td>ชำระแล้ว<\/td><td>5 พ\.ย\. 2569<\/td>/);
  assert.match(html,/<td>ยังไม่ชำระ<\/td><td>—<\/td>/);
  assert.match(html,/<td>ชำระแล้ว<\/td><td>—<\/td>/);
  assert.doesNotMatch(html,/UNEXPECTED_DATE/);
  assert.match(html,/รับชำระ 160\.00 บาท/);
  assert.match(html,/เรียกเก็บ 240\.00 บาท/);
  assert.match(html,/<th>240\.00<\/th><th><\/th><th><\/th>/);
  assert.match(html,/<th>160\.00<\/th><th><\/th><th><\/th>/);
  assert.match(styles,/white-space:nowrap/);
});

test('no reading leaves payment date blank, never the PDF export date',()=>{
  const {html}=renderReport([]);
  assert.match(html,/ยังไม่ส่งมิเตอร์<\/td><td>—<\/td>/);
  assert.doesNotMatch(html,/\bUNEXPECTED_DATE\b/);
});
