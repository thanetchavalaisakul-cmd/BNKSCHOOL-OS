import {SIGNATURE_CHECKS,signatureAuditProgress} from "./signature-standard.js?v=1";

/** Shared admin audit interface. Does not alter document routes or approve documents. */
export function createSignatureComplianceFeature({client,toast,render,escapeHtml,buttonLoading}){
 let rows=[];
 async function load(){
   const {data,error}=await client.rpc("get_signature_compliance_overview");
   if(error){console.warn("Signature compliance audit unavailable",error.message);rows=[];return;}
   rows=Array.isArray(data)?data:[];
 }
 function html(){
  const verified=rows.filter(r=>signatureAuditProgress(r).verified).length;
  return `<section class="panel" id="signature-compliance-panel">
  <div class="panel-head"><div class="panel-title-wrap"><h3>ตรวจมาตรฐานลายเซ็นกลาง · 4 ข้อ</h3>
  <p>ทุกระบบที่ลงทะเบียนในอนาคตเข้าทะเบียนตรวจอัตโนมัติ ไม่ถือว่าผ่านจนมีหลักฐานทดสอบครบทั้ง 4 ข้อ</p>
  </div><span class="pill ${verified===rows.length&&rows.length?"active":"pending"}">ผ่าน ${verified} / ${rows.length} ระบบ</span></div>
  <p class="helper">วิธีเซ็น 4 แบบ · เลือกก่อนอนุมัติ · บันทึกตัวตนและเวลา · แสดงใน PDF ถูกต้อง</p>
  <div class="table-wrap"><table class="table"><thead><tr><th>ระบบ / เส้นทาง</th><th>วิธี 4 แบบ</th><th>ก่อนอนุมัติ</th><th>ผู้เซ็น/เวลา</th><th>PDF</th><th>ผลตรวจ</th><th></th></tr></thead>
  <tbody>${rows.map(r=>{const score=signatureAuditProgress(r);return `<tr><td><strong>${escapeHtml(r.system_name_th)}</strong><br><small>${escapeHtml(r.module_code||"—")} · ${r.routing_mode==="parallel"?"คู่ขนาน":"ตามลำดับ"}</small></td>
  ${SIGNATURE_CHECKS.map(c=>`<td style="text-align:center">${r[c.key]?"✓":"—"}</td>`).join("")}
  <td><span class="pill ${score.verified?"active":"pending"}">${score.passed}/4 ${score.verified?"ตรวจครบ":"รอตรวจ"}</span></td>
  <td><button class="btn btn-secondary" data-compliance-review="${escapeHtml(r.system_code)}">ตรวจหลักฐาน</button></td></tr>`}).join("")}</tbody></table>
  </div><p class="helper">เครื่องหมาย — หมายถึงยังไม่มีการยืนยันผลทดสอบ ไม่ได้หมายความว่าระบบไม่มีลายเซ็น</p></section>`;
 }
 function reviewModal(code){
  const row=rows.find(r=>r.system_code===code);if(!row)return;
  const m=document.createElement("div");m.className="modal-backdrop";
  m.innerHTML=`<div class="modal modal-wide"><div class="modal-head"><div><h3>ตรวจลายเซ็น · ${escapeHtml(row.system_name_th)}</h3>
  <p>ทำเครื่องหมายเฉพาะข้อที่ได้ทดสอบจริงแล้ว บันทึกเหตุผล/หลักฐานเพื่ออ้างอิงย้อนหลัง</p></div><button class="modal-close">×</button></div>
  <form id="compliance-check-form">
  ${SIGNATURE_CHECKS.map(c=>`<label class="field" style="display:flex;align-items:center;gap:12px;padding:10px 0">
  <input type="checkbox" name="${c.key}" ${row[c.key]?"checked":""}/><span>${escapeHtml(c.label)}</span></label>`).join("")}
  <div class="field"><label>หลักฐานผลทดสอบ</label><textarea name="notes" class="input" rows="4" maxlength="3000" required
  placeholder="บันทึกบัญชีทดสอบ เลขเอกสาร รายละเอียดการอนุมัติ และผลตรวจ PDF">${escapeHtml(row.verification_notes||"")}</textarea>
  <small>ขั้นต่ำ 12 ตัวอักษร · มีประวัติผู้บันทึกและเวลาทุกรอบ</small></div>
  <div class="modal-actions"><button type="button" class="btn btn-ghost modal-cancel">ยกเลิก</button><button type="submit" class="btn btn-primary">บันทึกผลตรวจ</button></div>
  </form></div>`;
  document.body.appendChild(m);const close=()=>m.remove();
  m.querySelector(".modal-close").onclick=close;m.querySelector(".modal-cancel").onclick=close;
  m.querySelector("#compliance-check-form").onsubmit=async ev=>{
   ev.preventDefault();const form=ev.currentTarget,d=new FormData(form),btn=form.querySelector('button[type="submit"]');
   const params={p_system_code:code,p_four_methods:d.has("four_methods_verified"),
    p_before_action:d.has("before_action_verified"),p_identity_timestamp:d.has("identity_timestamp_verified"),
    p_pdf:d.has("pdf_verified"),p_notes:String(d.get("notes")||"").trim()};
   if(params.p_notes.length<12)return toast("ระบุหลักฐานไม่ครบ","ต้องระบุผลทดสอบอย่างน้อย 12 ตัวอักษร","error");
   buttonLoading(btn,true,"กำลังบันทึก...");
   try{
     const {error}=await client.rpc("review_signature_compliance",params);
     if(error)throw error;
     close();toast("บันทึกการตรวจสอบแล้ว","ข้อมูลจะถูกเก็บในประวัติการตรวจ","success");
     await render();
   }catch(err){toast("บันทึกไม่สำเร็จ",err.message||String(err),"error")}
   finally{buttonLoading(btn,false)}
  };
 }
 function bind(){document.querySelectorAll("[data-compliance-review]").forEach(btn=>btn.addEventListener("click",()=>reviewModal(btn.dataset.complianceReview)));}
 return {load,html,bind};
}
