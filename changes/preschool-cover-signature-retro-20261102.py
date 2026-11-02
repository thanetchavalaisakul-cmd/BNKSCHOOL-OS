from pathlib import Path
p=Path("app.js"); s=p.read_text(); Q=chr(96); D=chr(36)
def fmt(x):return x.replace("§",Q).replace("¤",D)
def swap(a,b,what):
 global s
 a=fmt(a);b=fmt(b)
 if s.count(a)!=1:raise RuntimeError(what+" matches "+str(s.count(a)))
 s=s.replace(a,b,1)
chooser=fmt("""async function preschoolCoverChooseSignature(){
 await refreshMySignatureProfile();
 return new Promise(resolve=>{
  const signatures=state.signatures||[],prefs=state.signaturePreferences||{};
  const modal=document.createElement("div");modal.className="modal-backdrop";
  modal.innerHTML=§<div class="modal" style="max-width:520px"><div class="modal-head">
    <div><h3>รับทราบและลงลายเซ็น</h3><p>เลือกวิธีลงลายเซ็นกลางก่อนกดยืนยัน</p></div>
    <button type="button" class="modal-close" id="ps-sign-close">×</button></div>
    <div class="modal-body">
     <div class="field"><label>วิธีลงลายเซ็น</label><select class="select" id="ps-sign-method">¤{signatureOptionsHtml(signatures.length?"stored":"paper")}</select></div>
     <div class="field" id="ps-sign-image-field"><label>ภาพลายเซ็นของคุณ</label><select class="select" id="ps-sign-image"></select></div>
     <p class="helper" id="ps-sign-hint"></p>
     <button type="button" class="btn btn-ghost" id="ps-sign-manage">เพิ่ม / จัดการลายเซ็นกลาึ��q�^