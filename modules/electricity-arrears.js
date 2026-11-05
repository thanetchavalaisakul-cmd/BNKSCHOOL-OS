/** Pure carry-forward balance; old invoices are not modified or duplicated. */
const UNSETTLED = new Set(['awaiting_payment', 'payment_rejected', 'payment_submitted']);
const BILLED = new Set(['awaiting_payment', 'payment_rejected', 'payment_submitted', 'paid']);
function toBaht(value) { const n=Number(value); return Number.isFinite(n)&&n>0?n:0; }
function totalBaht(rows) { return Math.round(rows.reduce((sum,r)=>sum+toBaht(r.amount_due),0)*100)/100; }

/** Derive the balances only from rows visible under Supabase RLS. */
export function calculateElectricityBalance(periods, readings, selectedPeriodId) {
  const monthsById=new Map((periods||[]).map(p=>[p.id,String(p.billing_month||'').slice(0,10)]));
  const selectedMonth=monthsById.get(selectedPeriodId)||null;
  const previousRows=[],currentRows=[],allCurrentInvoices=[];
  if(selectedMonth) for(const reading of readings||[]) {
    const month=monthsById.get(reading.period_id);
    if(!month||month>selectedMonth||!BILLED.has(reading.status)) continue;
    const row={...reading,billing_month:month};
    if(month===selectedMonth) {
      allCurrentInvoices.push(row);
      if(UNSETTLED.has(reading.status))currentRows.push(row);
    } else if(UNSETTLED.has(reading.status)) previousRows.push(row);
  }
  previousRows.sort((a,b)=>a.billing_month.localeCompare(b.billing_month)||String(a.house_label_snapshot||'').localeCompare(String(b.house_label_snapshot||'')));
  const priorOutstanding=totalBaht(previousRows),currentOutstanding=totalBaht(currentRows);
  return {selectedMonth,previousRows,currentRows,priorOutstanding,currentOutstanding,
    currentBilled:totalBaht(allCurrentInvoices),
    totalOutstanding:Math.round((priorOutstanding+currentOutstanding)*100)/100,
    waitingForConfirmation:totalBaht([...previousRows,...currentRows].filter(r=>r.status==='payment_submitted')),
    currentIssuedCount:allCurrentInvoices.length};
}

/** Show previous-month payments as independent, actionable invoices. */
export function renderElectricityCarryoverHtml({period,balance,isManager,formatMonth,formatMoney,escapeHtml,renderStatus,renderActions}) {
  if(!period||!balance)return '';
  const {previousRows,priorOutstanding,currentBilled,currentOutstanding,totalOutstanding,currentIssuedCount,waitingForConfirmation}=balance;
  const previousDetails=previousRows.length?`<div class="el-list">${previousRows.map(r=>`
    <article class="el-person-card">
      <div class="el-person-icon">⏳</div>
      <div class="el-person-info">
        <strong>ค้างชำระ ${formatMonth(r.billing_month)} · ${escapeHtml(r.house_label_snapshot||r.meter_code_snapshot||'มิเตอร์')}</strong>
        ${isManager?`<span>ผู้รับผิดชอบ: ${escapeHtml(r.payer_name_snapshot||'ไม่ระบุชื่อ')}</span>`:'<span>กรุณาตรวจสอบยอดค้างของเดือนก่อน</span>'}
        ${r.status==='payment_submitted'?'<small class="el-note">ส่งสลิปแล้ว · รอเจ้าหน้าที่ตรวจรับเงิน ไม่ต้องโอนซ้ำ</small>':''}
      </div>
      <div class="el-person-amount"><strong>${formatMoney(r.amount_due)} บาท</strong>${renderStatus(r.status)}</div>
      <div class="el-card-actions">${renderActions(r)}</div>
    </article>`).join('')}</div>`:'<p class="helper">ไม่มียอดค้างชำระจากเดือนก่อน</p>';
  const currentNote=currentIssuedCount===0
    ?`เปิดรอบ ${formatMonth(period.billing_month)} แล้ว แต่ยังไม่มีบิลที่ตรวจเลขมิเตอร์เสร็จ ไม่ใช่ยอดค้างชำระ`
    :`ออกยอดแล้ว ${formatMoney(currentBilled)} บาท · ยังไม่ยืนยันชำระ ${formatMoney(currentOutstanding)} บาท`;
  return `<section class="panel el-carryover-summary" aria-label="สรุปยอดค่าไฟฟ้าคงค้าง">
    <div class="el-section-head"><div><h3>สรุปยอดค้างชำระและยอดเดือนปัจจุบัน</h3><p>แยกบิลรายเดือน · ยอดที่เคยชำระแล้วจะไม่ถูกนำมาคิดซ้ำ</p></div></div>
    <section class="el-stats">
      <div class="el-stat"><span>ยอดค้างชำระก่อนหน้า</span><strong>${formatMoney(priorOutstanding)}</strong><small>บาท · ก่อน ${formatMonth(period.billing_month)}</small></div>
      <div class="el-stat"><span>ยอดค่าไฟ ${formatMonth(period.billing_month)}</span><strong>${currentIssuedCount?formatMoney(currentBilled):'รอออกยอด'}</strong><small>${currentIssuedCount?`บาท · คงค้าง ${formatMoney(currentOutstanding)} บาท`:'ยังไม่ถึงขั้นตอนชำระเดือนนี้'}</small></div>
      <div class="el-stat"><span>ยอดค้างชำระรวม</span><strong>${formatMoney(totalOutstanding)}</strong><small>บาท · เฉพาะรายการที่ยังไม่ยืนยันรับเงิน</small></div>
    </section>
    <p class="helper">${currentNote}${waitingForConfirmation?` · อยู่ระหว่างตรวจสลิป ${formatMoney(waitingForConfirmation)} บาท (ไม่ต้องโอนซ้ำ)`:''}</p>
    <div class="el-section-head"><div><h3>รายการค้างชำระก่อนหน้า</h3><p>${previousRows.some(r=>r.status==='awaiting_payment'||r.status==='payment_rejected')?'หากยังไม่ชำระเดือนก่อน สามารถแนบสลิปของบิลเดือนนั้นได้โดยตรง':previousRows.length?'รายการที่ส่งสลิปแล้วอยู่ระหว่างตรวจรับเงิน ไม่จำเป็นต้องชำระซ้ำ':'ไม่มีรายการค้างชำระก่อนหน้า'}</p></div></div>
    ${previousDetails}
  </section>`;
}
