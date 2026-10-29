// Choose and bind a personal signature BEFORE a workflow transition occurs.
// The database RPC atomically commits the action and its signature.
export async function withWorkflowSignature({client,userId,title,notify,onConfirm}) {
  const {data:signatures,error:loadError}=await client.from("signatures")
    .select("id,label,is_default,storage_path,source").eq("user_id",userId)
    .order("created_at",{ascending:false});
  if(loadError){notify("อ่านลายเซ็นไม่สำเร็จ",loadError.message,"error");return;}
  const {data:prefs}=await client.rpc("get_my_signature_preferences");
  const config=Array.isArray(prefs)?prefs[0]:prefs||{};
  const preferredId=config.default_signature_id||signatures?.find(x=>x.is_default)?.id||signatures?.[0]?.id||"";
  const h=x=>String(x??"").replace(/[&<>"']/g,k=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[k]));
  const modal=document.createElement("div");
  modal.className="modal-backdrop";
  modal.innerHTML=`<div class="modal modal-signature" style="max-width:670px">
    <div class="modal-head"><div><h3>${h(title||"ยืนยันการลงนาม")}</h3><p>กรุณาเลือกวิธีลงลายเซ็นก่อนยืนยัน ระบบจะบันทึกพร้อมกับการดำเนินการ</p></div><button class="modal-close" type="button">×</button></div>
    <div class="field"><label>วิธีลงลายเซ็น</label><select class="select" id="workflow-sign-method">
      <option value="stored">ใช้ลายเซ็นที่บันทึกไว้ในบัญชี</option>
      <option value="drawn">เซ็นสดบนหน้าจอ</option>
      <option value="upload">อัปโหลดรูปลายเซ็น</option>
      <option value="paper">เว้นช่องให้เซ็นบนกระดาษ</option>
    </select></div>
    <div class="field" id="wf-stored"><label>เลือกลายเซ็นของฉัน</label><select class="select" id="wf-signature">
      <option value="">เลือกลายเซ็น</option>
      ${(signatures||[]).map(x=>`<option value="${h(x.id)}" ${x.id===preferredId?"selected":""}>${h(x.label||"ลายเซ็น")}</option>`).join("")}
    </select><small>หากเปิด Auto Sign ไว้ ระบบเลือกลายเซ็นหลักให้อัตโนมัติ แต่ยังต้องกดยืนยันขั้นตอนนี้</small></div>
    <div class="field hidden" id="wf-drawn"><label>เซ็นด้วยนิ้ว เมาส์ หรือปากกา</label>
      <div class="signature-canvas-wrap"><canvas id="wf-canvas" width="900" height="300" style="width:100%;touch-action:none"></canvas></div>
      <button class="btn btn-ghost" type="button" id="wf-clear">ล้างลายเซ็น</button></div>
    <div class="field hidden" id="wf-upload"><label>ไฟล์ PNG, JPG, WebP ขนาดไม่เกิน 5 MB</label><input class="input" type="file" id="wf-file" accept="image/png,image/jpeg,image/webp"></div>
    <div class="field hidden" id="wf-paper"><small>เลือกเซ็นบนกระดาษได้ แต่จะไม่มีภาพลายเซ็นในเอกสาร PDF</small></div>
    <div class="modal-actions"><button class="btn btn-ghost modal-cancel" type="button">ยกเลิก</button>
      <button class="btn btn-primary" id="wf-confirm" type="button">ยืนยันและดำเนินการ</button></div>
  </div>`;
  document.body.appendChild(modal);
  const close=()=>modal.remove();
  modal.querySelector(".modal-close").onclick=close;
  modal.querySelector(".modal-cancel").onclick=close;
  const method=modal.querySelector("#workflow-sign-method");
  method.value=config.preferred_method==="paper"?"paper":"stored";
  const refresh=()=>{for(const id of ["stored","drawn","upload","paper"])
    modal.querySelector("#wf-"+id).classList.toggle("hidden",method.value!==id);};
  method.onchange=refresh;refresh();
  const canvas=modal.querySelector("#wf-canvas"),ctx=canvas.getContext("2d");
  ctx.lineWidth=5;ctx.lineCap="round";ctx.lineJoin="round";ctx.strokeStyle="#0f172a";
  let drawing=false,ink=false;
  const point=e=>{const b=canvas.getBoundingClientRect();return{x:(e.clientX-b.left)*canvas.width/b.width,y:(e.clientY-b.top)*canvas.height/b.height};};
  canvas.onpointerdown=e=>{drawing=true;ink=true;canvas.setPointerCapture(e.pointerId);const p=point(e);ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(p.x+.05,p.y+.05);ctx.stroke();};
  canvas.onpointermove=e=>{if(drawing){const p=point(e);ctx.lineTo(p.x,p.y);ctx.stroke();}};
  canvas.onpointerup=canvas.onpointercancel=()=>{drawing=false;};
  modal.querySelector("#wf-clear").onclick=()=>{ctx.clearRect(0,0,canvas.width,canvas.height);ink=false;};
  modal.querySelector("#wf-confirm").onclick=async e=>{
    const button=e.currentTarget,selectedMethod=method.value;
    let signatureId=null,createdPath=null,createdId=null;
    button.disabled=true;button.textContent="กำลังดำเนินการ...";
    try{
      if(selectedMethod==="stored"){
        signatureId=modal.querySelector("#wf-signature").value;
        if(!signatureId)throw Error("กรุณาเลือกลายเซ็น หรือเลือกเซ็นสด/อัปโหลด/กระดาษ");
      }else if(selectedMethod==="drawn"||selectedMethod==="upload"){
        let file,ext,mime;
        if(selectedMethod==="drawn"){
          if(!ink)throw Error("กรุณาวาดลายเซ็นก่อนบันทึก");
          file=await new Promise(resolve=>canvas.toBlob(resolve,"image/png"));
          mime="image/png";ext="png";
        }else{
          file=modal.querySelector("#wf-file").files?.[0];
          if(!file)throw Error("กรุณาเลือกภาพลายเซ็น");
          mime=file.type;ext=mime==="image/png"?"png":mime==="image/webp"?"webp":"jpg";
        }
        if(!file||!["image/png","image/jpeg","image/webp"].includes(mime)||file.size>5*1024*1024)throw Error("ลายเซ็นต้องเป็น PNG, JPG หรือ WebP ขนาดไม่เกิน 5 MB");
        createdPath=userId+"/"+crypto.randomUUID()+"."+ext;
        const up=await client.storage.from("signatures").upload(createdPath,file,{contentType:mime,upsert:false});
        if(up.error)throw up.error;
        const save=await client.from("signatures").insert({
          user_id:userId,label:"ลายเซ็นยืนยันงาน",bucket_id:"signatures",
          storage_path:createdPath,source:selectedMethod,is_default:false
        }).select("id").single();
        if(save.error)throw save.error;
        signatureId=save.data.id;createdId=signatureId;
      }
      await onConfirm({method:selectedMethod,signatureId});
      close();
    }catch(error){
      if(createdId)await client.from("signatures").delete().eq("id",createdId);
      if(createdPath)await client.storage.from("signatures").remove([createdPath]);
      notify("บันทึกไม่สำเร็จ",error.message||String(error),"error");
    }finally{button.disabled=false;button.textContent="ยืนยันและดำเนินการ";}
  };
}
