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
