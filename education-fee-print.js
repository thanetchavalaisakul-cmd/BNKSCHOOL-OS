
const esc=v=>String(v??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");
const th=v=>esc(String(v??"").replace(/[0-9]/g,x=>"๐๑๒๓๔๕๖๗๘๙"[+x]));
const money=v=>th(Number(v||0).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2}));
const date=v=>v?th(new Intl.DateTimeFormat("th-TH",{day:"numeric",month:"long",year:"numeric",timeZone:"Asia/Bangkok"}).format(new Date(/^\d{4}-\d{2}-\d{2}$/.test(v)?v+"T12:00:00+07:00":v))):"—";
const labels={tuition:"ค่าบำรุงการศึกษา",deposit:"ค่าประกัน",water:"ค่าน้ำ"};
function documentCss(fontCss){return `${fontCss}
@page{size:A4 portrait;margin:19mm 16mm 18mm 20mm}
*,*::before,*::after{box-sizing:border-box}
html,body{margin:0;padding:0;background:#fff;color:#181818;font-family:"TH SarabunIT๙","THSarabunIT๙",serif;font-size:16pt;line-height:1.24}
.paper,.paper *{font-family:"TH SarabunIT๙","THSarabunIT๙",serif!important}
.paper{max-width:100%;margin:0;padding:0;overflow:visible}
h1{font-size:21pt;margin:0 0 1mm}h2{font-size:18pt;margin:2mm 0 3mm}h3{font-size:17pt;margin:4mm 0 2mm;break-after:avoid}
p{margin:1mm 0}header{text-align:center;border-bottom:1px solid #333;margin-bottom:5mm;padding-bottom:4mm;break-inside:avoid}
header img{width:18mm;height:18mm;object-fit:contain;display:block;margin:0 auto 2mm}
.subhead{text-align:center;margin:3mm 0 5mm}
.meta{display:grid;grid-template-columns:1fr 1fr;gap:2mm 7mm;margin:4mm 0;break-inside:avoid}
.meta p{margin:1mm 0}table{width:100%;border-collapse:collapse;table-layout:fixed;font-size:15pt;line-height:1.17;margin:3mm 0}
thead{display:table-header-group}tfoot{display:table-footer-group}
td,th{padding:1.6mm 1.5mm;border-bottom:1px solid #aaa;text-align:left;vertical-align:top;overflow-wrap:anywhere}
th{border-top:1px solid #333;border-bottom:1px solid #333;font-weight:700}
tr{break-inside:avoid;page-break-inside:avoid}
.num{text-align:right;white-space:nowrap}
.total{font-weight:700;border-top:1px solid #444}
.sign{margin-top:16mm;width:80mm;margin-left:auto;text-align:center;break-inside:avoid}
.sign p{margin:2mm 0}.footer{margin-top:9mm;padding-top:2mm;border-top:1px solid #bbb;font-size:12pt;break-inside:avoid;color:#555}
.notice{margin:4mm 0;color:#444;font-size:14pt}
.actions{font-family:system-ui,sans-serif!important;position:sticky;top:0;padding:12px;background:#ecf5ef;display:flex;justify-content:space-between;align-items:center;z-index:3}
.actions span{font:13px system-ui,sans-serif!important}.actions button{font:600 14px system-ui,sans-serif!important;padding:10px 18px;background:#0d7456;color:white;border:0;border-radius:7px}
@media screen{body{background:#e9eeea}.paper{width:210mm;min-height:297mm;margin:12mm auto 18mm;background:white;box-shadow:0 5px 20px #0002;padding:19mm 16mm 18mm 20mm}}
@media print{.actions{display:none!important}body{background:white!important}.paper{width:auto;min-height:0;margin:0!important;padding:0!important;box-shadow:none!important}html,body{overflow:visible!important}}
`}
function heading(name,caption){return `<header><img src="./school-logo.png" alt="ตราโรงเรียน"><h1>${th(name||"โรงเรียน")}</h1><p>กลุ่มงานบริหารแผนและงบประมาณ</p><h2>${caption}</h2></header>`}
function receipt(d){
 const p=d.payment,s=d.student;
 return heading(d.schoolName,"ใบรับเงินค่าบำรุงการศึกษาและรายการที่เกี่ยวข้อง")+
 `<p class="subhead">เลขอ้างอิงรายการรับเงิน ${th(p.sequence_no)} · ปีการศึกษา ${th(p.academic_year)} ภาคเรียนที่ ${th(p.semester)}</p>
 <div class="meta"><p><strong>วันที่รับเงิน:</strong> ${date(p.paid_on)}</p><p><strong>วันที่บันทึกในระบบ:</strong> ${date(p.recorded_at)}</p>
 <p><strong>นักเรียน:</strong> ${th(s.full_name)}</p><p><strong>เลขประจำตัว:</strong> ${th(s.student_code||"—")}</p>
 <p><strong>ชั้นเรียน:</strong> ${th(s.class_name)}</p><p><strong>ผู้ชำระเงิน:</strong> ${th(p.payer_name||s.guardian_name||"—")}</p></div>
 <table><thead><tr><th style="width:70%">รายการ</th><th class="num" style="width:30%">จำนวนเงิน (บาท)</th></tr></thead>
 <tbody><tr><td>${labels[p.category]||th(p.category)}${p.category==="tuition"?" ภาคเรียนที่ "+th(p.semester):" ปีการศึกษา "+th(p.academic_year)}</td><td class="num">${money(p.amount)}</td></tr>
 <tr class="total"><td>รวมเงินที่รับ</td><td class="num">${money(p.amount)}</td></tr></tbody></table>
 <p class="notice">หมายเหตุ: ${th(p.note||"—")} ${p.voided_at?"· รายการนี้ถูกยกเลิกแล้ว":""}</p>
 <div class="sign"><p>ลงชื่อ...........................................................</p><p>(${th(d.collectorName||"........................................")})</p><p>ผู้รับเงิน / ผู้บันทึกรายการ</p></div>
 <div class="footer">เอกสารนี้เป็นหลักฐานบันทึกการรับเงินในระบบโรงเรียน ไม่ใช่ใบเสร็จรับเงินที่มีเลขเล่ม/เลขที่ตามระเบียบการเงิน เว้นแต่โรงเรียนรับรองตามขั้นตอนที่กำหนด</div>`;
}
function summary(d){
 const rows=d.rows||[],overall=rows.reduce((a,s)=>a+s.due,0),paid=rows.reduce((a,s)=>a+s.paid,0);
 return heading(d.schoolName,"รายงานสรุปการจัดเก็บค่าบำรุงการศึกษา")+
 `<p class="subhead">ปีการศึกษา ${th(d.year)} ภาคเรียนที่ ${th(d.semester)} · ${th(d.scope)}</p>
 <div class="meta"><p><strong>นักเรียน:</strong> ${th(rows.length)} คน</p><p><strong>จำนวนเงินที่ต้องจัดเก็บ:</strong> ${money(overall)} บาท</p>
 <p><strong>ชำระแล้ว:</strong> ${money(paid)} บาท</p><p><strong>คงค้าง:</strong> ${money(Math.max(0,overall-paid))} บาท</p></div>
 <table><thead><tr><th style="width:9%">ที่</th><th style="width:37%">ชื่อ–นามสกุล</th><th style="width:14%">ชั้น</th><th class="num" style="width:14%">ต้องชำระ</th><th class="num" style="width:13%">ชำระแล้ว</th><th class="num" style="width:13%">ค้าง</th></tr></thead>
 <tbody>${rows.map((r,i)=>`<tr><td>${th(i+1)}</td><td>${th(r.student.full_name)}</td><td>${th(r.student.class_name)}</td><td class="num">${money(r.due)}</td><td class="num">${money(r.paid)}</td><td class="num">${money(r.balance)}</td></tr>`).join("")}
 <tr class="total"><td colspan="3">รวม</td><td class="num">${money(overall)}</td><td class="num">${money(paid)}</td><td class="num">${money(Math.max(0,overall-paid))}</td></tr></tbody></table>
 <div class="footer">จัดทำจากระบบ BNK SCHOOL OS ณ ${date(new Date().toISOString())} · จำนวนเงินคำนวณจากอัตราและรายการรับเงินที่บันทึกจริง</div>`;
}
export async function educationPrint({type,data,fontsCss,ensureFont,toast,openedWindow}){
 const win=openedWindow||window.open("","_blank");
 if(!win){toast("เปิดหน้าต่างไม่ได้","อนุญาตป๊อปอัปแล้วลองใหม่","error");return false}
 try{
  win.document.open();win.document.write(`<!doctype html><html lang="th"><head><meta charset="utf-8"><base href="${location.origin}/"><title>BNK SCHOOL OS · รายงานรับเงิน</title><style>${documentCss(fontsCss)}</style></head><body><div class="actions"><span>A4 · TH Sarabun IT๙ · เลขไทย</span><button onclick="window.print()">พิมพ์ / บันทึก PDF</button></div><main class="paper">${type==="receipt"?receipt(data):summary(data)}</main></body></html>`);
  win.document.close();await ensureFont("16pt",win.document);
  await Promise.all(Array.from(win.document.images).map(img=>img.decode().catch(()=>null)));
  win.focus();return true;
 }catch(e){win.document.body.textContent="สร้างเอกสารไม่สำเร็จ: "+e.message;toast("สร้าง PDF ไม่สำเร็จ",e.message,"error");return false}
}
