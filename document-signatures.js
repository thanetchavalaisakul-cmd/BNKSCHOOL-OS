// Shared leave and substitute document signature support.
export const SCHOOL_SIGNATURE_DAY = '1900-01-01';

const toImageDataUrl = blob => new Promise((resolve,reject)=>{
  const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=()=>reject(r.error);r.readAsDataURL(blob);
});
export async function schoolDocumentSignatureImages(client,kind,docId,date=null){
  const images={};
  // Automatically attach the already-consented default signatures to eligible document slots.
  // The server checks each signer, the completed workflow step, and existing signature preferences.
  const sync=await client.rpc("refresh_school_document_auto_signatures",{p_kind:kind,p_doc:docId,p_day:date});
  if(sync.error)console.warn("automatic document signature sync",sync.error);
  const {data,error}=await client.from("school_document_signatures")
    .select("slot_code,signature_id,method").eq("document_kind",kind)
    .eq("document_id",docId).eq("document_date",date||SCHOOL_SIGNATURE_DAY);
  if(error){console.warn("document signatures",error);return images;}
  await Promise.all((data||[]).filter(s=>s.signature_id&&s.method!=="paper").map(async s=>{
    const {data:signature}=await client.from("signatures")
      .select("bucket_id,storage_path").eq("id",s.signature_id).maybeSingle();
    if(!signature?.storage_path)return;
    const dl=await client.storage.from(signature.bucket_id||"signatures").download(signature.storage_path);
    if(!dl.error&&dl.data) images[s.slot_code]=await toImageDataUrl(dl.data);
  }));
  return images;
}

async function preparePersonalSignature(client,userId,method,blob){
  if(!blob)throw Error("ยังไม่มีลายเซ็น");
  let mime,ext;
  if(method==="drawn"){mime="image/png";ext="png";}
  else{
    mime=blob.type;
    if(!["image/png","image/jpeg","image/webp"].includes(mime))throw Error("รองรับไฟล์ PNG, JPG, WebP");
    ext=mime==="image/png"?"png":mime==="image/webp"?"webp":"jpg";
  }
  if(blob.size>5*1024*1024)throw Error("ลายเซ็นต้องไม่เกิน 5 MB");
  const path=userId+"/"+crypto.randomUUID()+"."+ext;
  const up=await client.storage.from("signatures").upload(path,blob,{contentType:mime,upsert:false});
  if(up.error)throw up.error;
  const ins=await client.from("signatures").insert({
    user_id:userId,label:"ลายเซ็นเอกสาร",bucket_id:"signatures",
    storage_path:path,source:method,is_default:false
  }).select("id").single();
  if(ins.error){
    await client.storage.from("signatures").remove([path]);throw ins.error;
  }
  return {id:ins.data.id,path};
}
async function rollbackPersonalSignature(client,created){
  if(!created)return;
  await client.from("signatures").delete().eq("id",created.id);
  await client.storage.from("signatures").remove([created.path]);
}

const escapeDocText = v => String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
export async function showSchoolDocumentSignatureModal({client,kind,docId,date=null,userId,notify,onSaved}){
  const choices=await client.rpc("my_school_document_signing_slots",{p_kind:kind,p_doc:docId,p_day:date});
  if(choices.error){notify("เปิดการลงนามไม่สำเร็จ",choices.error.message,"error");return;}
  if(!choices.data?.length){notify("ยังไม่สามารถลงนามได้","ไม่มีสิทธิ์หรือยังไม่ถึงขั้นตอนลงนาม","error");return;}
  const signatures=await client.from("signatures").select("id,label,is_default").eq("user_id",userId).order("created_at",{ascending:false});
  if(signatures.error){notify("โหลดลายเซ็นไม่สำเร็จ",signatures.error.message,"error");return;}
  const mine=signatures.data||[],first=mine.find(x=>x.is_default)?.id||mine[0]?.id||"";
  const m=document.createElement("div");m.className="modal-backdrop";
  m.innerHTML=`<div class="modal modal-signature" style="max-width:660px">
    <div class="modal-head"><div><h3>ลงลายเซ็นในเอกสาร</h3><p>ระบบตรวจสอบผู้ลงนามตามบัญชีที่เข้าสู่ระบบ</p></div><button type="button" class="modal-close">×</button></div>
    <div class="field"><label>ช่องลงนามของคุณ</label><select class="select" id="ds-slot">${choices.data.map(x=>`<option value="${escapeDocText(x.slot_code)}">${escapeDocText(x.slot_label)}</option>`).join("")}</select></div>
    <div class="field"><label>รูปแบบการลงนาม</label><select class="select" id="ds-method">
      <option value="stored">ใช้ลายเซ็นที่บันทึกไว้</option>
      <option value="drawn">เซ็นสดบนหน้าจอ</option>
      <option value="upload">อัปโหลดภาพลายเซ็น</option>
      <option value="paper">เว้นช่องสำหรับเซ็นบนกระดาษ</option>
    </select></div>
    <div class="field" id="ds-stored"><label>ลายเซ็นที่บันทึกไว้</label><select class="select" id="ds-signature"><option value="">เลือกลายเซ็น</option>${mine.map(x=>`<option value="${escapeDocText(x.id)}" ${x.id===first?"selected":""}>${escapeDocText(x.label||"ลายเซ็น")}</option>`).join("")}</select></div>
    <div class="field hidden" id="ds-drawn"><label>ใช้เมาส์ นิ้ว หรือปากกาเซ็นได้</label><div class="signature-canvas-wrap"><canvas id="ds-canvas" width="900" height="300" style="width:100%;touch-action:none"></canvas></div><button type="button" class="btn btn-ghost" id="ds-clear">ล้างลายเซ็น</button></div>
    <div class="field hidden" id="ds-upload"><label>ภาพ PNG, JPG หรือ WebP (ไม่เกิน 5 MB)</label><input class="input" type="file" id="ds-file" accept="image/png,image/jpeg,image/webp"></div>
    <div class="field hidden" id="ds-paper"><small>เว้นช่องลงนามบนเอกสารกระดาษ โดยไม่ถือว่าอนุมัติเอกสารอัตโนมัติ</small></div>
    <div class="modal-actions"><button class="btn btn-ghost modal-cancel" type="button">ยกเลิก</button><button class="btn btn-primary" id="ds-save" type="button">บันทึกวิธีลงนาม</button></div>
  </div>`;
  document.body.appendChild(m);
  const close=()=>m.remove();
  m.querySelector(".modal-close").onclick=close;
  m.querySelector(".modal-cancel").onclick=close;
  const method=m.querySelector("#ds-method"),canvas=m.querySelector("#ds-canvas"),ctx=canvas.getContext("2d");
  ctx.lineWidth=5;ctx.lineCap="round";ctx.lineJoin="round";ctx.strokeStyle="#0f172a";
  let drawing=false,ink=false;
  const point=e=>{const r=canvas.getBoundingClientRect();return {x:(e.clientX-r.left)*canvas.width/r.width,y:(e.clientY-r.top)*canvas.height/r.height};};
  canvas.onpointerdown=e=>{drawing=true;ink=true;canvas.setPointerCapture(e.pointerId);const p=point(e);ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(p.x+0.05,p.y+0.05);ctx.stroke();};
  canvas.onpointermove=e=>{if(drawing){const p=point(e);ctx.lineTo(p.x,p.y);ctx.stroke();}};
  canvas.onpointerup=canvas.onpointercancel=()=>{drawing=false;};
  m.querySelector("#ds-clear").onclick=()=>{ctx.clearRect(0,0,canvas.width,canvas.height);ink=false;};
  const refresh=()=>{for(const name of ["stored","drawn","upload","paper"])m.querySelector("#ds-"+name).classList.toggle("hidden",method.value!==name);};
  method.onchange=refresh;refresh();
  m.querySelector("#ds-save").onclick=async e=>{
    const btn=e.currentTarget,mode=method.value,slot=m.querySelector("#ds-slot").value;
    let signatureId=null,created=null;
    btn.disabled=true;btn.textContent="กำลังบันทึก...";
    try{
      if(mode==="stored"){
        signatureId=m.querySelector("#ds-signature").value;
        if(!signatureId)throw Error("กรุณาเลือกลายเซ็นจากบัญชีของคุณ");
      }else if(mode==="drawn"){
        if(!ink)throw Error("กรุณาวาดลายเซ็นก่อนบันทึก");
        const blob=await new Promise(resolve=>canvas.toBlob(resolve,"image/png",1));
        created=await preparePersonalSignature(client,userId,"drawn",blob);
        signatureId=created.id;
      }else if(mode==="upload"){
        const file=m.querySelector("#ds-file").files?.[0];
        if(!file)throw Error("กรุณาเลือกรูปภาพลายเซ็น");
        created=await preparePersonalSignature(client,userId,"upload",file);
        signatureId=created.id;
      }
      const {error:saveError}=await client.rpc("set_school_document_signature",{
        p_kind:kind,p_doc:docId,p_day:date,p_slot:slot,p_method:mode,p_signature:signatureId
      });
      if(saveError)throw saveError;
      created=null;
      close();
      notify("บันทึกลายเซ็นแล้ว","เปิดดูหรือพิมพ์เอกสารใหม่เพื่อแสดงลายเซ็นล่าสุด","success");
      if(onSaved)await onSaved();
    }catch(err){
      if(created)await rollbackPersonalSignature(client,created);
      notify("ลงลายเซ็นไม่สำเร็จ",err?.message||String(err),"error");
    }finally{
      btn.disabled=false;btn.textContent="บันทึกวิธีลงนาม";
    }
  };
}
