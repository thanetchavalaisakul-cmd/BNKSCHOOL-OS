// Shared contract for all present and future BNK School OS signature-bearing modules.
// A module is compliant only after all four capabilities have evidence-based verification.
// Paper is a permitted method, but it is NOT an online approval.
export const SIGNATURE_METHODS=Object.freeze([
  {id:"paper",label:"เซ็นบนกระดาษ",online:false},
  {id:"drawn",label:"เซ็นสดในระบบ",online:true},
  {id:"upload",label:"อัปโหลดรูปภาพ",online:true},
  {id:"stored",label:"ใช้ลายเซ็นที่บันทึกไว้",online:true}
]);
export const SIGNATURE_CHECKS=Object.freeze([
  {key:"four_methods_verified",label:"เลือกวิธีลงลายเซ็นครบ 4 แบบ"},
  {key:"before_action_verified",label:"เลือกก่อนกดรับรอง/อนุมัติ"},
  {key:"identity_timestamp_verified",label:"บันทึกผู้ลงนามและวันเวลา"},
  {key:"pdf_verified",label:"แสดงลายเซ็นใน PDF ถูกต้อง"}
]);
export function signatureAuditProgress(row={}){
 const passed=SIGNATURE_CHECKS.filter(x=>row[x.key]===true).length;
 return {passed,total:SIGNATURE_CHECKS.length,verified:passed===SIGNATURE_CHECKS.length};
}
export function requiresOnlineSignatureConfirmation(method){
 return method!=="paper" && SIGNATURE_METHODS.some(m=>m.id===method&&m.online);
}
export function canEmbedConfirmedSignature({method,signedAt,confirmedAt,documentId,approvedDocumentId}={}){
 return requiresOnlineSignatureConfirmation(method)&&Boolean(signedAt&&confirmedAt&&documentId&&approvedDocumentId&&documentId===approvedDocumentId);
}
export function verifySignatureAction({actorId,assignedUserId,method,documentId,signatureDocumentId,confirmedAt}={}){
 if(!actorId||!assignedUserId||actorId!==assignedUserId)throw new Error("ผู้ลงนามต้องเป็นเจ้าของบัญชีที่ได้รับมอบหมาย");
 if(!SIGNATURE_METHODS.some(x=>x.id===method))throw new Error("วิธีลงลายเซ็นไม่ถูกต้อง");
 if(!documentId||documentId!==signatureDocumentId)throw new Error("ลายเซ็นต้องผูกกับเอกสารฉบับเดียวกัน");
 if(method!=="paper"&&!confirmedAt)throw new Error("ต้องกดยืนยันก่อนใช้ลายเซ็นออนไลน์");
 return {method,onlineApproved:method!=="paper"&&Boolean(confirmedAt)};
}

/** Shared guard used by each legacy adapter and future signature-enabled system. */
export function assertSignatureMethod(method,{requireOnline=false}={}){
  const choice=SIGNATURE_METHODS.find(m=>m.id===method);
  if(!choice)throw new Error("วิธีลงลายเซ็นไม่ถูกต้อง");
  if(requireOnline&&!choice.online)throw new Error("การเซ็นบนกระดาษยังไม่ใช่การรับรองออนไลน์ กรุณาเลือกลายเซ็นอิเล็กทรอนิกส์หรือรอดำเนินการบนกระดาษจริง");
  return choice;
}
/** Four options from the central registry, rather than independently authored per form. */
export function signatureOptionsHtml(selected="stored"){
  return [...SIGNATURE_METHODS].sort((a,b)=>["stored","drawn","upload","paper"].indexOf(a.id)-["stored","drawn","upload","paper"].indexOf(b.id))
    .map(method=>`<option value="${method.id}"${method.id===selected?" selected":""}>${method.label}</option>`).join("");
}

/** Central four-method button picker for document-specific approval modals. */
export function signatureMethodButtonsHtml(attribute){
  if(!/^data-[a-z][a-z-]*$/.test(attribute))throw new Error("Invalid signature method attribute");
  const order=["stored","drawn","upload","paper"];
  const hints={stored:"ใช้ลายเซ็นของบัญชีคุณ",drawn:"เมาส์ / นิ้ว / ปากกา",upload:"PNG / JPG / WebP",paper:"อนุมัติได้ · PDF เว้นช่องเซ็นจริง"};
  return order.map(id=>{
    const method=SIGNATURE_METHODS.find(m=>m.id===id);
    return `<button type="button" class="signature-mode-option" ${attribute}="${method.id}"><strong>${method.label}</strong><span>${hints[method.id]}</span></button>`;
  }).join("");
}
