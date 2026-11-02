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
     <button type="button" class="btn btn-ghost" id="ps-sign-manage">เพิ่ม / จัดการลายเซ็นกลาง</button>
    </div><div class="modal-actions"><button type="button" class="btn btn-ghost" id="ps-sign-cancel">ยกเลิก</button>
    <button type="button" class="btn btn-primary" id="ps-sign-confirm">ยืนยันรับทราบ</button></div></div>§;
  document.body.appendChild(modal);
  let finished=false;
  const done=value=>{if(finished)return;finished=true;modal.remove();resolve(value);};
  const methodEl=modal.querySelector("#ps-sign-method"),sigEl=modal.querySelector("#ps-sign-image");
  const update=()=>{
   const method=methodEl.value,available=signatures.filter(sig=>method==="stored"||sig.source===method);
   modal.querySelector("#ps-sign-image-field").hidden=method==="paper";
   const preferred=prefs.default_signature_id||signatures.find(sig=>sig.is_default)?.id||"";
   sigEl.innerHTML=available.map(sig=>§<option value="¤{escapeHtml(sig.id)}" ¤{sig.id===preferred?"selected":""}>¤{escapeHtml(sig.label||"ลายเซ็น")}</option>§).join("");
   modal.querySelector("#ps-sign-hint").textContent=method==="paper"?"เว้นช่องสำหรับเซ็นบนกระดาษ":
     available.length?"บันทึกผู้ลงนามและวันเวลาที่กดยืนยันจริง":"ยังไม่มีลายเซ็นแบบนี้ กรุณาเพิ่มในระบบลายเซ็นกลาง";
  };
  methodEl.onchange=update;update();
  modal.querySelector("#ps-sign-close").onclick=()=>done(null);
  modal.querySelector("#ps-sign-cancel").onclick=()=>done(null);
  modal.querySelector("#ps-sign-manage").onclick=()=>{
   const mode=methodEl.value==="drawn"?"drawn":"upload";done(null);signatureManagerModal(mode);
  };
  modal.querySelector("#ps-sign-confirm").onclick=()=>{
   const method=methodEl.value;
   if(method!=="paper"&&!sigEl.value){toast("ยังไม่มีลายเซ็น","เพิ่มลายเซ็นกลางหรือเลือกเซ็นบนกระดาษก่อน","error");return;}
   done({method,signatureId:method==="paper"?null:sigEl.value});
  };
 });
}
""")
old="""async function acknowledgePreschoolCover(id,ack,button){
  if(!ack&&!confirm("ยกเลิกการรับทราบใบฝากสอนนี้หรือไม่?"))return;
  buttonLoading(button,true,"กำลังบันทึก...");
  const {error}=await supabase.rpc("acknowledge_preschool_group_cover",{p_cover_id:id,p_acknowledge:ack});buttonLoading(button,false);
  if(error)return toast("บันทึกการรับทราบไม่ได้",error.message,"error");
  toast(ack?"รับทราบใบฝากสอนแล้ว":"ยกเลิกการรับทราบแล้ว","บันทึกสถานะไว้ในระบบแล้ว","success");await renderDashboard();
}"""
new=chooser+"""async function acknowledgePreschoolCover(id,ack,button){
 if(!ack&&!confirm("ยกเลิกการรับทราบใบฝากสอนนี้หรือไม่?"))return;
 const choice=ack?await preschoolCoverChooseSignature():{method:"paper",signatureId:null};
 if(!choice)return;
 buttonLoading(button,true,"กำลังบันทึก...");
 const {error}=await supabase.rpc("acknowledge_preschool_group_cover_signed",{
  p_cover_id:id,p_acknowledge:ack,p_method:choice.method,p_signature_id:choice.signatureId
 });
 buttonLoading(button,false);
 if(error)return toast("บันทึกการรับทราบไม่ได้",error.message,"error");
 toast(ack?"รับทราบพร้อมวิธีลงลายเซ็นแล้ว":"ยกเลิกการรับทราบแล้ว","บันทึกเวลาจริงในระบบ","success");
 await renderDashboard();
}"""
swap(old,new,"acknowledge")
swap(".ps-sign-date{font-size:11pt;color:#444}", """.ps-sign-date{display:block;font-size:10pt;color:#444}
  .ps-sign-image{max-width:39mm;max-height:9mm;object-fit:contain;display:block;margin:auto}
  .ps-sign-note{display:block;font-size:9pt;line-height:1.1;color:#555}""","pdf css")
swap('¤{m.acknowledged_at?§<span class="ps-sign-date">รับทราบในระบบ ¤{thaiDateOnly(m.acknowledged_at.slice(0,10))}</span>§:""}',
'''¤{m.acknowledged_at?§¤{assets.signatureByTeacher?.[m.teacher_id]?.image
 ?§<img class="ps-sign-image" src="¤{escapeHtml(assets.signatureByTeacher[m.teacher_id].image)}" alt="ลายเซ็นผู้รับฝาก">
    <span class="ps-sign-note">¤{assets.signatureByTeacher[m.teacher_id].source_kind==="profile_current"?"ภาพลายเซ็นจากโปรไฟล์ ณ วันที่พิมพ์":"ลงนามอิเล็กทรอนิกส์"}</span>§:""}
 <span class="ps-sign-date">รับทราบในระบบ ¤{thaiDateOnly(m.acknowledged_at.slice(0,10))}</span>§:""}''',"signature cell")
swap('หมายเหตุ: ผู้รับฝากสามารถลงลายมือชื่อบนเอกสารฉบับพิมพ์ได้ ส่วนสถานะ “รับทราบแล้ว” คือการยืนยันในระบบพร้อมวันเวลา ไม่ใช่ลายเซ็นภาพ',
 'หมายเหตุ: “รับทราบแล้ว” บันทึกเวลาเดิม ภาพจากโปรไฟล์ที่เพิ่มภายหลังไม่ใช่การลงนามย้อนหลัง · ช่องผู้บริหารเว้นไว้จนกว่าจะมีหลักฐานการลงนามในเอกสารฉบับนี้',
 "document note")
swap("""  const [schoolLogo,signers]=await Promise.all([schoolLogoDataUrl(),preschoolCoverDocumentSigners(g)]);
  const body=buildPreschoolCoverDocument(g,{schoolLogo,signers}),css=preschoolCoverDocStyles();""",
"""  const [schoolLogo,signers,assetResult]=await Promise.all([
    schoolLogoDataUrl(),preschoolCoverDocumentSigners(g),
    supabase.rpc("get_preschool_cover_signature_assets",{p_cover_id:id})
  ]);
  if(assetResult.error)return toast("เปิด PDF ไม่สำเร็จ",assetResult.error.message,"error");
  const entries=Array.isArray(assetResult.data)?assetResult.data:[];
  const resolved=await Promise.all(entries.map(async ref=>{
    if(!ref.storage_path)return ref;
    const dl=await supabase.storage.from(ref.bucket_id||"signatures").download(ref.storage_path);
    if(dl.error||!dl.data){console.warn("Unable to download preschool signature",dl.error);return ref;}
    return {...ref,image:await blobToDataUrl(dl.data)};
  }));
  const signatureByTeacher=Object.fromEntries(resolved.map(ref=>[ref.teacher_id,ref]));
  const body=buildPreschoolCoverDocument(g,{schoolLogo,signers,signatureByTeacher}),css=preschoolCoverDocStyles();""","preview")
p.write_text(s)
html=Path("index.html");doc=html.read_text()
assert doc.count("app.min.js?v=5.12.9.60")==1
html.write_text(doc.replace("app.min.js?v=5.12.9.60","app.min.js?v=5.12.9.61"))
print("Preschool signatures integrated into acknowledgment and PDF")

