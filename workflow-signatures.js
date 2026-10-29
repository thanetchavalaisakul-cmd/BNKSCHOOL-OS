export function createWorkflowDocumentSignatureFeature(client,{getUser,notify}){
  const escape=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const modeNames={paper:"เซ็นบนกระดาษ",stored:"ใช้ลายเซ็นที่บันทึกไว้",drawn:"วาดลายเซ็นใหม่",upload:"อัปโหลดรูปลายเซ็น"};
  const alert=(title,message="",level="error")=>notify(title,message,level);
  const toDataUrl=blob=>new Promise((resolve,reject)=>{
    const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(reader.error);
    reader.readAsDataURL(blob);
  });
  async function readImage(row){
    if(!row?.storage_path||row.method==="paper")return null;
    const {data,error}=await client.storage.from(row.bucket_id||"signatures").download(row.storage_path);
    if(error||!data){console.warn("Workflow signature image unavailable",error);return null;}
    return toDataUrl(data);
  }
  async function documentImages(systemCode,documentId,scopeDate=null){
    const {data,error}=await client.from("workflow_document_signatures")
      .select("slot_code,signer_user_id,method,bucket_id,storage_path,signed_at")
      .eq("system_code",systemCode).eq("document_id",documentId).eq("scope_key",scopeDate||"all");
    if(error){console.warn("Workflow signatures not accessible",error);return {};}
    const result={};
    await Promise.all((data||[]).filter(r=>r.method!=="paper").map(async row=>{
      const image=await readImage(row);
      if(image){result[row.slot_code]??={image,signer_user_id:row.signer_user_id,signed_at:row.signed_at};}
    }));
    return result;
  }
  async function teacherImages(rows){
    if(!rows?.length)return {};
    const ids=rows.map(r=>r.id);
    const {data,error}=await client.from("workflow_document_signatures")
      .select("document_id,signer_user_id,method,bucket_id,storage_path")
      .eq("system_code","substitute_teaching").eq("slot_code","substitute_teacher")
      .eq("scope_key","all").in("document_id",ids);
    if(error){console.warn("Substitute teacher signatures not accessible",error);return {};}
    const output={};
    await Promise.all((data||[]).map(async item=>{
      const lesson=rows.find(r=>r.id===item.document_id&&r.substitute_teacher_id===item.signer_user_id);
      if(lesson&&item.method!=="paper"){
        const image=await readImage(item);
        if(image)output[lesson.id]=image;
      }
    }));
    return output;
  }
  async function createPersonalSignature(blob,mode,label){
    const mime=mode==="drawn"?"image/png":blob.type;
    if(!["image/png","image/jpeg","image/webp"].includes(mime))throw Error("ไฟล์ต้องเป็น PNG, JPG หรือ WebP");
    if(blob.size>5*1024*1024)throw Error("ไฟล์ต้องมีขนาดไม่เกิน 5 MB");
    const user=getUser();if(!user?.id)throw Error("กรุณาเข้าสู่ระบบก่อน");
    const ext=mime==="image/png"?"png":mime==="image/webp"?"webp":"jpg";
    const path=`${user.id}/${crypto.randomUUID()}.${ext}`;
    const {error:upError}=await client.storage.from("signatures").upload(path,blob,{contentType:mime,upsert:false});
    if(upError)throw upError;
    const {data,error}=await client.from("signatures").insert({
      user_id:user.id,label,bucket_id:"signatures",storage_path:path,source:mode,is_default:false
    }).select("id").single();
    if(error){
      await client.storage.from("signatures").remove([path]);
      throw error;
    }
    return data.id;
  }
  function canvasHandlers(canvas,clear){
    const ctx=canvas.getContext("2d");
    ctx.lineWidth=5;ctx.lineCap="round";ctx.lineJoin="round";ctx.strokeStyle="#0f172a";
    let drawing=false,ink=false;
    const pos=e=>{const b=canvas.getBoundingClientRect();return{x:(e.clientX-b.left)*canvas.width/b.width,y:(e.clientY-b.top)*canvas.height/b.height};};
    canvas.addEventListener("pointerdown",e=>{ink=true;drawing=true;canvas.setPointerCapture(e.pointerId);const p=pos(e);ctx.beginPath();ctx.moveTo(p.x,p.y);});
    canvas.addEventListener("pointermove",e=>{if(!drawing)return;const p=pos(e);ctx.lineTo(p.x,p.y);ctx.stroke();});
    for(const type of ["pointerup","pointercancel","pointerleave"])canvas.addEventListener(type,()=>{drawing=false;});
    clear.addEventListener("click",()=>{ctx.clearRect(0,0,canvas.width,canvas.height);ink=false;});
    return {hasInk:()=>ink,blob:()=>new Promise(resolve=>canvas.toBlob(resolve,"image/png",1))};
  }
  async function open(systemCode,documentId,scopeDate=null,onSaved=null){
    if(!getUser()?.id)return alert("กรุณาเข้าสู่ระบบก่อน");
    const {data:options,error:optionsError}=await client.rpc("get_workflow_signature_options",{
      p_system_code:systemCode,p_document_id:documentId,p_scope_date:scopeDate
    });
    if(optionsError)return alert("ตรวจสอบสิทธิ์ลงนามไม่สำเร็จ",optionsError.message);
    if(!options?.length)return alert("ยังไม่ถึงขั้นตอนลงนามของคุณ","ระบบให้ลงนามได้เฉพาะเจ้าของช่องและสถานะเอกสารที่กำหนด");
    const {data:signatures,error:signatureError}=await client.from("signatures")
      .select("id,label,is_default,source").eq("user_id",getUser().id).order("created_at",{ascending:false});
    if(signatureError)return alert("โหลดลายเซ็นไม่สำเร็จ",signatureError.message);
    const modal=document.createElement("div");modal.className="modal-backdrop";
    const sorted=[...(signatures||[])].sort((a,b)=>Number(b.is_default)-Number(a.is_default));
    modal.innerHTML=`<div class="modal modal-signature">
      <div class="modal-head"><div><h3>ลงลายเซ็นในเอกสาร</h3><p>ใช้เฉพาะลายเซ็นของบัญชีตนเอง · ไม่ใช่การอนุมัติแทนผู้อื่น</p></div>
        <button type="button" class="modal-close" aria-label="ปิด">×</button></div>
      <div class="field"><label>ตำแหน่งที่คุณได้รับสิทธิ์ลงนาม</label>
        <select class="select" id="workflow-sign-slot">${options.map(o=>`<option value="${escape(o.slot_code)}">${escape(o.label)}${o.method!=="paper"?" · ลงนามแล้ว":""}</option>`).join("")}</select></div>
      <div class="signature-mode-tabs" style="flex-wrap:wrap;margin-top:10px">
        ${Object.entries(modeNames).map(([value,title])=>`<button type="button" class="signature-mode ${value==="stored"?"active":""}" data-wf-method="${value}">${escape(title)}</button>`).join("")}
      </div>
      <section data-wf-pane="stored" class="field" style="margin-top:12px"><label>เลือกลายเซ็นของฉัน</label>
        <select class="select" id="wf-saved-sig">${sorted.length?sorted.map(s=>`<option value="${escape(s.id)}">${escape(s.label||"ลายเซ็น")}${s.is_default?" (ค่าเริ่มต้น)":""}</option>`).join(""):'<option value="">ยังไม่มีลายเซ็นที่บันทึกไว้</option>'}</select></section>
      <section data-wf-pane="drawn" class="hidden" style="margin-top:12px">
        <div class="signature-canvas-wrap"><canvas id="wf-sign-canvas" width="900" height="300"></canvas></div>
        <button type="button" class="btn btn-ghost" id="wf-sign-clear">ล้างลายเซ็น</button></section>
      <section data-wf-pane="upload" class="hidden field" style="margin-top:12px">
        <label>อัปโหลดลายเซ็น PNG/JPG/WebP ไม่เกิน 5 MB</label>
        <input class="input" type="file" id="wf-sign-file" accept="image/png,image/jpeg,image/webp"></section>
      <section data-wf-pane="paper" class="hidden" style="margin-top:12px">เว้นช่องให้ลงลายเซ็นบนเอกสารที่พิมพ์ออกมา</section>
      <div class="modal-actions"><button type="button" class="btn btn-ghost modal-cancel">ยกเลิก</button>
        <button type="button" class="btn btn-primary" id="wf-sign-submit">บันทึกวิธีลงนาม</button></div>
    </div>`;
    document.body.appendChild(modal);
    const close=()=>modal.remove();
    modal.querySelector(".modal-close").onclick=close;modal.querySelector(".modal-cancel").onclick=close;
    let method="stored";
    modal.querySelectorAll("[data-wf-method]").forEach(btn=>btn.addEventListener("click",()=>{
      method=btn.dataset.wfMethod;
      modal.querySelectorAll("[data-wf-method]").forEach(b=>b.classList.toggle("active",b===btn));
      modal.querySelectorAll("[data-wf-pane]").forEach(pane=>pane.classList.toggle("hidden",pane.dataset.wfPane!==method));
    }));
    const drawing=canvasHandlers(modal.querySelector("#wf-sign-canvas"),modal.querySelector("#wf-sign-clear"));
    modal.querySelector("#wf-sign-submit").addEventListener("click",async e=>{
      const button=e.currentTarget,slot=modal.querySelector("#workflow-sign-slot").value;
      let id=null;button.disabled=true;button.textContent="กำลังบันทึก...";
      try{
        if(method==="stored"){
          id=modal.querySelector("#wf-saved-sig").value;
          if(!id)throw Error("กรุณาสร้างลายเซ็นหรือเลือกวิธีอื่นก่อน");
        }else if(method==="drawn"){
          if(!drawing.hasInk())throw Error("กรุณาวาดลายเซ็นก่อนบันทึก");
          const blob=await drawing.blob();
          if(!blob)throw Error("บันทึกภาพลายเซ็นไม่สำเร็จ");
          id=await createPersonalSignature(blob,"drawn","ลายเซ็นเอกสาร "+new Date().toLocaleDateString("th-TH"));
        }else if(method==="upload"){
          const file=modal.querySelector("#wf-sign-file").files[0];
          if(!file)throw Error("กรุณาเลือกรูปภาพลายเซ็นก่อน");
          id=await createPersonalSignature(file,"upload","ลายเซ็นเอกสาร "+new Date().toLocaleDateString("th-TH"));
        }
        const {error}=await client.rpc("set_workflow_document_signature",{
          p_system_code:systemCode,p_document_id:documentId,p_scope_date:scopeDate,
          p_slot:slot,p_method:method,p_signature_id:id
        });
        if(error)throw error;
        close();
        alert("บันทึกลายเซ็นแล้ว","สามารถเปิดเอกสารเพื่อตรวจดูและพิมพ์ได้","success");
        if(typeof onSaved==="function")await onSaved();
      }catch(err){alert("ลงนามไม่สำเร็จ",err.message||String(err));}
      finally{button.disabled=false;button.textContent="บันทึกวิธีลงนาม";}
    });
  }
  return {open,documentImages,teacherImages};
}
