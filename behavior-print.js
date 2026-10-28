
/* BNK SCHOOL OS: official A4 output for the Student Behavior submodule.
   All printed content is separate from dashboard controls and uses the system-pinned TH Sarabun IT๙ font. */
const thaiDigits=s=>String(s??"").replace(/[0-9]/g,d=>"๐๑๒๓๔๕๖๗๘๙"[Number(d)]);
const escapeText=s=>String(s??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");
const td=s=>escapeText(thaiDigits(s));
const thaiDate=s=>{
  if(!s)return "—";
  const d=new Date(/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(s)?s+"T12:00:00+07:00":s);
  if(Number.isNaN(d.getTime()))return thaiDigits(s);
  return thaiDigits(new Intl.DateTimeFormat("th-TH",{day:"numeric",month:"long",year:"numeric",timeZone:"Asia/Bangkok"}).format(d));
};
const thaiTime=s=>s?thaiDigits(new Date(s).toLocaleString("th-TH",{timeZone:"Asia/Bangkok",dateStyle:"medium",timeStyle:"short"})):"—";
const className=s=>s?.class_name||"ไม่ระบุห้อง";
const fullPerson=s=>s?.full_name||"—";
const printStyle=fontCss=>`
${fontCss}
@page{size:A4 portrait;margin:18mm 16mm 16mm 20mm;}
html,body{margin:0;padding:0;background:#fff;color:#111;font-family:"TH SarabunIT๙","THSarabunIT๙",serif!important;font-size:16pt;line-height:1.22}
*,*:before,*:after{box-sizing:border-box}
body{padding:0;overflow:visible}
.doc{width:auto;max-width:100%;margin:0;padding:0}
.doc,.doc *{font-family:"TH SarabunIT๙","THSarabunIT๙",serif!important}
.print-actions{position:sticky;top:0;z-index:5;background:#f2f7f4;padding:10px 16px;display:flex;gap:10px;align-items:center;justify-content:space-between;font:14px system-ui,sans-serif!important;border-bottom:1px solid #dde6df}
.print-actions button{border:0;border-radius:8px;padding:10px 16px;background:#0d7456;color:#fff;font:600 14px system-ui,sans-serif!important;cursor:pointer}
.print-actions span{font:13px system-ui,sans-serif!important;color:#315443}
@media screen {.doc{max-width:210mm;margin:12mm auto 20mm;padding:18mm 16mm 16mm 20mm;background:white;min-height:297mm;box-shadow:0 4px 22px #00000016;}body{background:#f1f4f3}}
@media print {html,body{background:#fff!important;overflow:visible!important} .doc{box-shadow:none!important;min-height:0!important;margin:0!important;padding:0!important;max-width:none!important}.print-actions{display:none!important}}
.doc-head{display:grid;grid-template-columns:19mm 1fr 19mm;gap:2mm;align-items:center;text-align:center;padding:0 0 3mm;border-bottom:.4mm solid #222;margin-bottom:4mm;break-inside:avoid}
.doc-head img{width:18mm;height:18mm;object-fit:contain}
.doc-head h1{margin:0;font-size:20pt;line-height:1.08;font-weight:700}
.doc-head h2{margin:1mm 0 0;font-size:17pt;font-weight:700}
.doc-head p{margin:.5mm 0 0;font-size:14pt}
.doc-title{text-align:center;font-weight:700;font-size:19pt;margin:4mm 0 1.5mm;break-after:avoid}
.doc-subtitle{text-align:center;font-size:14pt;margin:0 0 4mm}
.doc-line{margin:1.6mm 0;line-height:1.3;overflow-wrap:anywhere;word-break:normal;orphans:3;widows:3}
.doc-block{margin:0 0 3mm;break-inside:auto}
.doc-block h3,.doc-section h3{font-size:17pt;font-weight:700;margin:4mm 0 2mm;break-after:avoid}
.doc-section{margin-top:3mm}
.doc-content{white-space:pre-wrap;overflow-wrap:anywhere;line-height:1.3;orphans:3;widows:3}
.doc-row{display:grid;grid-template-columns:1fr 1fr;gap:1mm 7mm}
.doc-key{font-weight:700}
.doc-muted{font-size:14pt;color:#444}
.doc-underlined{border-bottom:1px dotted #8c8c8c}
.doc-signatures{display:grid;grid-template-columns:1fr 1fr;gap:7mm 10mm;margin-top:4mm}
.doc-sign{display:flex;flex-direction:column;align-items:center;text-align:center;min-height:28mm;break-inside:avoid;page-break-inside:avoid}
.doc-sign img{width:auto;max-width:47mm;height:auto;max-height:16mm;object-fit:contain}
.doc-sign .sign-space{height:17mm;display:flex;align-items:flex-end;justify-content:center}
.doc-sign p{margin:.3mm 0;line-height:1.14}
.doc-sign small{font-size:13pt}
.doc-evidence{display:grid;grid-template-columns:1fr 1fr;gap:4mm}
.doc-evidence-item{break-inside:avoid;page-break-inside:avoid}
.doc-evidence-item img{display:block;max-width:100%;max-height:75mm;width:auto;height:auto;object-fit:contain;margin:1mm auto}
.doc-evidence-item p{font-size:14pt;margin:1mm 0}
.doc-table{border-collapse:collapse;width:100%;table-layout:fixed;font-size:14.5pt;line-height:1.15}
.doc-table thead{display:table-header-group}
.doc-table th,.doc-table td{padding:1.3mm 1.5mm;border-bottom:.2mm solid #bbb;vertical-align:top;text-align:left;overflow-wrap:anywhere}
.doc-table th{border-top:.3mm solid #333;border-bottom:.3mm solid #333;font-weight:700}
.doc-table tr{break-inside:avoid;page-break-inside:avoid}
.doc-table .num{text-align:right}
.doc-summary{display:grid;grid-template-columns:repeat(3,1fr);gap:5mm;margin:4mm 0 5mm}
.doc-summary>div{border-bottom:1px solid #aaa;padding:1mm 0}
.doc-summary b{font-size:18pt;display:block}
.doc-footer{border-top:.2mm solid #aaa;margin-top:8mm;padding-top:2mm;font-size:12pt;color:#555;break-inside:avoid}
.doc-keep{break-inside:avoid;page-break-inside:avoid}
@media(max-width:650px){.doc-row{grid-template-columns:1fr}.doc-evidence{grid-template-columns:1fr}.doc-signatures{grid-template-columns:1fr 1fr}}
`;
const header=(schoolName,subtitle)=>`<header class="doc-head"><img src="./school-logo.png" alt="ตราโรงเรียน"/><div><h1>${td(schoolName||"โรงเรียน")}</h1><h2>กลุ่มงานบริหารทั่วไป</h2><p>ระบบคะแนนพฤติกรรมนักเรียน</p></div><span></span></header><div class="doc-title">${td(subtitle)}</div>`;
const eventName=kind=>kind==="addition"?"ใบบันทึกการเพิ่มคะแนนความประพฤติ":"ใบบันทึกการหักคะแนนความประพฤติ";
const section=(heading,body)=>`<section class="doc-section"><h3>${heading}</h3>${body}</section>`;
const line=(k,v)=>`<p class="doc-line"><span class="doc-key">${k}</span> ${td(v)}</p>`;
function caseDocument(data){
 const {event:x,student:s,signatures=[],evidence=[],schoolName,period,score}=data;
 const outcomes=(x.outcomes||[]).filter(Boolean).map((x,i)=>`<p class="doc-line">${td(i+1)}. ${td(x)}</p>`).join("")||"<p class=\"doc-line\">ไม่ระบุ</p>";
 const signNames={student:"นักเรียน",guardian:"ผู้ปกครอง",homeroom:"ครูประจำชั้น",student_affairs:"งานกิจการนักเรียน",witness:"ผู้รับรอง"};
 const roles=x.kind==="deduction"?["student","guardian","homeroom","student_affairs"]:["student","witness","student_affairs"];
 const sigHtml=roles.map(role=>{const v=signatures.find(z=>z.signer_role===role);return `<div class="doc-sign"><div class="sign-space">${v?.signature_png?`<img src="${escapeText(v.signature_png)}" alt="ลายมือชื่อ"/>`:""}</div><p>ลงชื่อ.............................................................</p><p>(${td(v?.signer_name||"..................................................")})</p><p>${td(signNames[role])}</p>${v?`<small>ลงนาม ${thaiTime(v.signed_at)}</small>`:"<small>ยังไม่ได้ลงนาม</small>"}</div>`}).join("");
 const proofs=evidence.map((f,i)=>`<div class="doc-evidence-item"><p>${td(i+1)}. ${td(f.file_name)}</p>${f.previewUrl?`<img src="${escapeText(f.previewUrl)}" alt="ภาพประกอบ ${td(i+1)}"/>`:""}</div>`).join("");
 return header(schoolName,eventName(x.kind))+
 `<p class="doc-subtitle">ปีการศึกษา ${td(period.year)} ภาคเรียนที่ ${td(period.semester)} · เลขอ้างอิง ${td(String(x.id).slice(0,8).toUpperCase())}</p>`+
 section("๑. ข้อมูลนักเรียน",
  `<div class="doc-row">${line("ชื่อ–นามสกุล",fullPerson(s))}${line("ชั้น / ห้อง",className(s))}${line("เลขประจำตัวนักเรียน",s?.student_code||"—")}${line("ผู้ปกครอง",s?.guardian_name||"—")}</div>`)+
 section("๒. รายละเอียดเหตุการณ์",
  `<div class="doc-row">${line("วันที่เกิดเหตุ",thaiDate(x.occurred_on))}${line("สถานที่",x.location||"—")}</div><p class="doc-line"><strong>เรื่องที่บันทึก</strong></p><div class="doc-content">${td(x.description||"")}</div>`)+
 section("๓. ผลการพิจารณา",outcomes)+
 section("๔. คะแนนความประพฤติ",
  `<div class="doc-row">${line(x.kind==="addition"?"คะแนนที่เพิ่ม":"คะแนนที่หัก",Math.abs(x.score_delta)+" คะแนน")}${line("คะแนนคงเหลือ ณ วันออกเอกสาร",score+" คะแนน")}</div>`+
  (x.note?`<p class="doc-line"><span class="doc-key">หมายเหตุ:</span> <span class="doc-content">${td(x.note)}</span></p>`:"")+
  line("สถานะการแจ้งผู้ปกครอง",({pending:"รอแจ้ง",notified:"แจ้งแล้ว",appointment:"นัดหมายแล้ว",acknowledged:"รับทราบแล้ว",not_required:"ไม่กำหนด"}[x.parent_status]||"—")))+
 section("๕. ลายมือชื่อรับรอง",`<div class="doc-signatures">${sigHtml}</div>`)+
 (evidence.length?section("๖. หลักฐานประกอบ",`<div class="doc-evidence">${proofs}</div>`):"")+
 `<div class="doc-footer">ออกเอกสาร ณ วันที่ ${thaiDate(new Date().toISOString())} · พิมพ์จากระบบ BNK SCHOOL OS · กรุณาตรวจสอบความครบถ้วนของลายมือชื่อก่อนนำไปใช้เป็นหลักฐาน</div>`;
}
function summaryDocument(data){
 const {schoolName,scopeName,students=[],events=[],settings,period}=data;
 const classIds=new Set(students.map(s=>s.student_id));
 const valid=events.filter(x=>classIds.has(x.student_id)&&x.event_status!=="void");
 const scoreBy=new Map(students.map(s=>[s.student_id,Number(settings.starting_score)+valid.filter(x=>x.student_id===s.student_id).reduce((a,x)=>a+Number(x.score_delta),0)]));
 const list=students.slice().sort((a,b)=>String(a.class_name||"").localeCompare(String(b.class_name||""),"th")||Number(a.student_number||0)-Number(b.student_number||0));
 const avg=list.length?(list.reduce((n,s)=>n+scoreBy.get(s.student_id),0)/list.length).toFixed(1):"0";
 const lines=list.map((s,i)=>`<tr><td>${td(i+1)}</td><td>${td(s.full_name)}</td><td>${td(s.class_name)}</td><td class="num">${td(scoreBy.get(s.student_id))}</td></tr>`).join("");
 return header(schoolName,"รายงานสรุปคะแนนพฤติกรรมนักเรียน")+
 `<p class="doc-subtitle">${td(scopeName)} · ปีการศึกษา ${td(period.year)} ภาคเรียนที่ ${td(period.semester)}</p>`+
 `<div class="doc-summary"><div>จำนวนนักเรียน<b>${td(list.length)} คน</b></div><div>คะแนนเฉลี่ย<b>${td(avg)} คะแนน</b></div><div>รายการพฤติกรรม<b>${td(valid.length)} รายการ</b></div></div>`+
 `<h3 class="doc-keep">บัญชีสรุปคะแนน</h3><table class="doc-table"><thead><tr><th style="width:10%">ลำดับ</th><th style="width:48%">ชื่อ–นามสกุล</th><th style="width:24%">ชั้น/ห้อง</th><th style="width:18%">คะแนน</th></tr></thead><tbody>${lines||'<tr><td colspan="4">ไม่มีข้อมูลนักเรียน</td></tr>'}</tbody></table>`+
 `<div class="doc-footer">ออกเอกสาร ณ วันที่ ${thaiDate(new Date().toISOString())} · พิมพ์จาก BNK SCHOOL OS</div>`;
}
export async function printBehaviorDocument({type,data,fontsCss,ensureFont,toast,popup=null}){
 const win=popup||window.open("","_blank");
 if(!win){toast?.("ไม่สามารถเปิดหน้าพิมพ์","กรุณาอนุญาตหน้าต่างป๊อปอัป แล้วลองใหม่อีกครั้ง","error");return false;}
 try{
  win.document.open();
  win.document.write(`<!doctype html><html lang="th"><head><meta charset="utf-8"><title>BNK SCHOOL OS · เอกสารราชการ</title><base href="${escapeText(location.origin+"/")}"><style>${printStyle(fontsCss)}</style></head><body><div class="print-actions"><span>เอกสารราชการ · A4 · TH Sarabun IT๙ · เลขไทย</span><button type="button" onclick="window.print()">พิมพ์ / บันทึกเป็น PDF</button></div><main class="doc">${type==="case"?caseDocument(data):summaryDocument(data)}</main></body></html>`);
  win.document.close();
  await ensureFont("16pt",win.document);
  await Promise.all(Array.from(win.document.images).map(img=>img.decode().catch(()=>null)));
  win.focus();
  // Leave the print button visible for iPad and browsers that block delayed automatic print dialogs.
  return true;
 }catch(err){
  const msg=err?.message||String(err);
  win.document.body.innerHTML='<div style="padding:24px;font-family:system-ui">ไม่สามารถเตรียมเอกสารได้: '+escapeText(msg)+'</div>';
  toast?.("สร้างเอกสารไม่สำเร็จ",msg,"error");
  return false;
 }
}
