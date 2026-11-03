// Semester lesson-plan submission channels. Installed independently so that weekly
// lesson plans, old attachments, signature workflows and approvals stay unchanged.
let activeSemesterChannelController=null;
export function installSemesterLessonChannelControls({state,supabase}){
  if(activeSemesterChannelController)return activeSemesterChannelController;

  const table="semester_lesson_plan_submission_settings";
  const cache=new Map();
  const labels={both:"รับทั้ง PDF และ Google Drive",pdf_only:"รับเฉพาะ PDF",drive_only:"รับเฉพาะ Google Drive"};
  const academicDept=()=>state.departments?.find(d=>d.code==="academic")?.id;
  const canManage=()=>state.profile?.role==="super_admin"||
    (state.profile?.role==="department_head"&&
      !!academicDept()&&state.profile.department_id===academicDept());
  const key=(year,semester)=>String(year).trim()+"/"+String(semester);
  const isValidPeriod=(year,semester)=>/^\d{4}$/.test(String(year).trim())&&[1,2,3].includes(Number(semester));
  const esc=value=>String(value??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
  const message=(value,modal)=>{
    const area=modal?.querySelector(".semester-channel-feedback");
    if(area){area.textContent=value;area.hidden=false;}
    else window.alert(value);
  };

  async function getMode(year,semester,force=false){
    if(!isValidPeriod(year,semester))throw new Error("กรุณาระบุปีการศึกษาและภาคเรียนที่ถูกต้อง");
    const k=key(year,semester);
    if(!force&&cache.has(k))return cache.get(k);
    const {data,error}=await supabase.from(table).select("submission_mode")
      .eq("academic_year",String(year).trim()).eq("semester",Number(semester)).maybeSingle();
    if(error)throw error;
    const mode=["both","pdf_only","drive_only"].includes(data?.submission_mode)?data.submission_mode:"both";
    cache.set(k,mode);
    return mode;
  }

  // The legacy lesson-plan modal has no data-plan-type marker in some builds.
  // Use the active lesson-plan workspace as fallback, never applying semester
  // restrictions to a weekly-plan form.
  function findSemesterForm(root=document){
    const form=root?.querySelector?.("#lesson-form");
    if(!form)return null;
    const explicitType=form.dataset?.planType;
    if(explicitType)return explicitType==="semester"?form:null;
    return state.lessonPlanMode==="semester"?form:null;
  }

  function periodDefault(){
    const term=(state.academicTerms||[]).find(t=>t.is_current)||
      (state.academicTerms||[]).find(t=>String(t.academic_year)==="2569")||null;
    const year=String(term?.academic_year||state.lessonPlans?.find(p=>p.plan_type==="semester")?.academic_year||new Date().getFullYear()+543);
    return {year,semester:Number(term?.semester||1)};
  }

  function stylesheet(){
    if(document.getElementById("semester-channel-style"))return;
    const style=document.createElement("style");
    style.id="semester-channel-style";
    style.textContent=`
      .semester-channel-modal{max-width:610px;width:min(94vw,610px);padding:24px}
      .semester-channel-modal h3{margin:0;font-size:22px}
      .semester-channel-modal p{color:#64748b;margin:7px 0 16px;line-height:1.6}
      .semester-channel-grid{display:grid;grid-template-columns:1fr 130px;gap:12px;margin-bottom:16px}
      .semester-channel-grid label{font-weight:650;font-size:13px}
      .semester-channel-grid .input,.semester-channel-grid .select{width:100%;margin-top:5px}
      .semester-channel-option{display:flex;align-items:flex-start;gap:11px;padding:13px;margin-bottom:9px;border:1px solid #dce4ed;border-radius:13px;cursor:pointer}
      .semester-channel-option:has(input:checked){border-color:#4464cf;background:#f3f5ff}
      .semester-channel-option input{margin-top:3px;accent-color:#3d52bc}
      .semester-channel-option strong{display:block;margin-bottom:3px;color:#17223b}
      .semester-channel-option small{display:block;line-height:1.5;color:#64748b}
      .semester-channel-feedback{font-size:13px;color:#b45309;background:#fff7e8;border-radius:10px;padding:10px 12px;margin:9px 0}
      .semester-channel-note{font-size:13px;line-height:1.55;color:#37557a;background:#f1f6ff;border-radius:10px;padding:10px 12px;margin:8px 0}
      .semester-channel-actions{display:flex;justify-content:flex-end;gap:10px;margin-top:18px;flex-wrap:wrap}
      .semester-channel-form-hint{padding:9px 12px;border-radius:10px;border:1px solid #d9e4f3;background:#f4f8ff;color:#29456c;margin:10px 0}
      .semester-channel-modal .modal-close{position:static}
      @media(max-width:520px){.semester-channel-grid{grid-template-columns:1fr 1fr}.semester-channel-actions .btn{flex:1}}
    `;
    document.head.appendChild(style);
  }

  function openSettings(){
    if(document.querySelector(".semester-channel-modal"))return;
    if(!canManage()){
      window.alert("เฉพาะแอดมินหลักหรือหัวหน้าวิชาการเท่านั้นที่ตั้งค่าการส่งแผนได้");
      return;
    }
    stylesheet();
    const fallback=periodDefault();
    const modal=document.createElement("div");
    modal.className="modal-backdrop";
    modal.innerHTML=`<div class="modal semester-channel-modal">
      <div class="modal-head"><div><h3>กำหนดช่องทางส่งแผนรายภาคเรียน</h3>
        <p>หัวหน้าวิชาการและแอดมินหลักกำหนดได้แยกตามปีการศึกษาและภาคเรียน โดยไม่ลบเอกสารที่เคยส่ง</p></div>
        <button type="button" class="modal-close" aria-label="ปิด">×</button></div>
      <div class="semester-channel-grid">
        <label>ปีการศึกษา<input class="input" id="semester-channel-year" inputmode="numeric" maxlength="4" value="${esc(fallback.year)}"></label>
        <label>ภาคเรียน<select class="select" id="semester-channel-term">
          ${[1,2,3].map(n=>`<option value="${n}" ${n===fallback.semester?"selected":""}>${n}</option>`).join("")}</select></label>
      </div>
      <div id="semester-channel-options">
        <label class="semester-channel-option"><input type="radio" name="semester-channel-mode" value="drive_only">
          <span><strong>Google Drive Link เท่านั้น</strong><small>ครูส่งลิงก์ ไม่ต้องอัปโหลดไฟล์ PDF เก็บใน Supabase</small></span></label>
        <label class="semester-channel-option"><input type="radio" name="semester-channel-mode" value="pdf_only">
          <span><strong>PDF เท่านั้น</strong><small>ครูอัปโหลดไฟล์ PDF เข้าระบบตามปกติ</small></span></label>
        <label class="semester-channel-option"><input type="radio" name="semester-channel-mode" value="both">
          <span><strong>เปิดทั้งสองช่องทาง</strong><small>ครูเลือกส่ง PDF หรือ Google Drive ได้อย่างใดอย่างหนึ่ง หรือแนบเพิ่มภายหลัง</small></span></label>
      </div>
      <div class="semester-channel-note">การตั้งค่านี้ใช้กับแผนรายภาคเรียนเท่านั้น ไม่เปลี่ยนแผนรายสัปดาห์ และไม่ลบ PDF/ลิงก์ที่บันทึกไว้ก่อนหน้า</div>
      <div class="semester-channel-feedback" hidden></div>
      <div class="semester-channel-actions">
        <button type="button" class="btn btn-secondary" id="semester-channel-cancel">ยกเลิก</button>
        <button type="button" class="btn btn-primary" id="semester-channel-save">บันทึกการตั้งค่า</button>
      </div>
    </div>`;
    document.body.appendChild(modal);
    const year=modal.querySelector("#semester-channel-year"),term=modal.querySelector("#semester-channel-term");
    const save=modal.querySelector("#semester-channel-save"),feedback=modal.querySelector(".semester-channel-feedback");
    const close=()=>modal.remove();
    modal.querySelector(".modal-close").addEventListener("click",close);
    modal.querySelector("#semester-channel-cancel").addEventListener("click",close);
    modal.addEventListener("click",e=>{if(e.target===modal)close();});
    let serial=0;
    async function refresh(){
      const n=++serial;
      feedback.hidden=true;
      [...modal.querySelectorAll('[name="semester-channel-mode"]')].forEach(x=>x.disabled=true);
      save.disabled=true;
      try{
        const mode=await getMode(year.value,term.value,true);
        if(!modal.isConnected||serial!==n)return;
        const target=modal.querySelector('[name="semester-channel-mode"][value="'+mode+'"]');
        if(target)target.checked=true;
        [...modal.querySelectorAll('[name="semester-channel-mode"]')].forEach(x=>x.disabled=false);
        save.disabled=false;
      }catch(e){if(modal.isConnected&&serial===n)message("โหลดการตั้งค่าไม่ได้: "+(e.message||e),modal);}
    }
    year.addEventListener("change",refresh);term.addEventListener("change",refresh);
    save.addEventListener("click",async()=>{
      if(!canManage())return message("คุณไม่มีสิทธิ์เปลี่ยนการตั้งค่านี้",modal);
      if(!isValidPeriod(year.value,term.value))return message("ปีการศึกษาและภาคเรียนไม่ถูกต้อง",modal);
      const mode=modal.querySelector('[name="semester-channel-mode"]:checked')?.value;
      if(!["both","pdf_only","drive_only"].includes(mode))return message("กรุณาเลือกช่องทางส่งแผน",modal);
      save.disabled=true;
      const payload={academic_year:year.value.trim(),semester:Number(term.value),
        submission_mode:mode,updated_by:state.user.id,updated_at:new Date().toISOString()};
      const {error}=await supabase.from(table).upsert(payload,{onConflict:"academic_year,semester"});
      save.disabled=false;
      if(error)return message("บันทึกไม่สำเร็จ: "+error.message,modal);
      cache.set(key(payload.academic_year,payload.semester),mode);
      const button=document.getElementById("semester-channel-settings-button");
      if(button)button.title="บันทึกแล้ว: "+labels[mode];
      close();
      window.alert("บันทึกสำเร็จ: ปีการศึกษา "+payload.academic_year+" ภาคเรียนที่ "+payload.semester+" — "+labels[mode]);
      const planForm=findSemesterForm(document);
      if(planForm)void syncForm(planForm.closest(".modal-backdrop"),true);
    });
    void refresh();
  }

  function mountManager(){
    if(!canManage()||state.lessonPlanMode!=="semester")return;
    const actions=document.querySelector(".lesson-hero .lesson-hero-actions");
    if(!actions||actions.querySelector("#semester-channel-settings-button"))return;
    const btn=document.createElement("button");
    btn.id="semester-channel-settings-button";btn.type="button";btn.className="btn btn-secondary";
    btn.textContent="⚙ กำหนดวิธีส่งแผน";
    btn.title="เลือกรับ PDF เท่านั้น, Google Drive เท่านั้น หรือทั้งสองแบบ";
    // The main application renders the button directly; retain this for older app builds.
    // One delegated click handler serves both without duplicate modal openings.
    actions.appendChild(btn);
  }

  async function syncForm(modal,force=false){
    const form=findSemesterForm(modal);
    if(!form)return;
    const year=form.querySelector('[name="academic_year"]')?.value?.trim();
    const term=form.querySelector('[name="semester"]')?.value;
    const expected=key(year,term);
    const hint=modal.querySelector(".semester-channel-form-hint");
    const requestId=String(Number(form.dataset.semesterChannelRequest||"0")+1);
    form.dataset.semesterChannelRequest=requestId;
    if(hint)hint.textContent="กำลังตรวจช่องทางรับแผน...";
    form.dataset.semesterChannelReady="0";
    // Do not briefly expose both channels while checking the actual term policy.
    modal.querySelectorAll("[data-attachment-method]").forEach(btn=>{
      btn.hidden=true;btn.disabled=true;btn.style.display="none";
    });
    try{
      const mode=await getMode(year,term,force);
      if(!form.isConnected||form.dataset.semesterChannelRequest!==requestId||key(form.querySelector('[name="academic_year"]').value,form.querySelector('[name="semester"]').value)!==expected)return;
      form.dataset.semesterChannelPeriod=expected;
      form.dataset.semesterChannelMode=mode;
      form.dataset.semesterChannelReady="1";
      const pdfAllowed=mode!=="drive_only",driveAllowed=mode!=="pdf_only";
      modal.querySelectorAll("[data-attachment-method]").forEach(btn=>{
        const allowed=btn.dataset.attachmentMethod==="pdf"?pdfAllowed:driveAllowed;
        btn.hidden=!allowed;btn.disabled=!allowed;btn.style.display=allowed?"":"none";
      });
      const selected=modal.dataset.attachmentMethod;
      if((selected==="pdf"&&!pdfAllowed)||(selected==="google_drive"&&!driveAllowed)){
        const target=pdfAllowed?"pdf":"google_drive";
        modal.querySelector('[data-attachment-method="'+target+'"]')?.click();
        if(modal.dataset.attachmentMethod!==target)modal.dataset.attachmentMethod=target;
      }
      if(hint)hint.textContent="ปี "+year+" ภาคเรียน "+term+" — "+labels[mode]+
        (mode==="both"?" เลือกอย่างใดอย่างหนึ่งได้":" (ตามที่ฝ่ายวิชาการกำหนด)");
    }catch(e){
      if(form.dataset.semesterChannelRequest!==requestId)return;
      form.dataset.semesterChannelReady="0";
      if(hint)hint.textContent="โหลดสิทธิ์การแนบเอกสารไม่สำเร็จ: "+(e.message||e)+" — กรุณาเปิดหน้านี้ใหม่";
    }
  }

  function mountedForm(){
    const form=findSemesterForm(document);
    if(!form)return;
    if(form.dataset.semesterChannelBound==="1"){
      const current=key(form.querySelector('[name="academic_year"]')?.value,form.querySelector('[name="semester"]')?.value);
      if(form.dataset.semesterChannelPeriod!==current&&form.dataset.semesterChannelReady!=="0")
        void syncForm(form.closest(".modal-backdrop"),true);
      return;
    }
    form.dataset.semesterChannelBound="1";
    const modal=form.closest(".modal-backdrop");
    const box=form.querySelector(".attachment-field");
    if(box){
      const hint=document.createElement("div");
      hint.className="semester-channel-form-hint";
      hint.textContent="กำลังตรวจช่องทางรับแผน...";
      box.insertBefore(hint,box.querySelector(".attachment-method-tabs"));
    }
    form.querySelector('[name="academic_year"]')?.addEventListener("change",()=>void syncForm(modal,true));
    form.querySelector('[name="academic_year"]')?.addEventListener("blur",()=>void syncForm(modal,true));
    form.querySelector('[name="semester"]')?.addEventListener("change",()=>void syncForm(modal,true));
    // Capture before the existing save handlers; backend triggers remain authoritative.
    modal.addEventListener("click",e=>{
      const btn=e.target.closest("#save-draft,#save-submit");
      if(!btn||!form.isConnected)return;
      const ready=form.dataset.semesterChannelReady==="1",mode=form.dataset.semesterChannelMode||"both";
      if(!ready){e.preventDefault();e.stopImmediatePropagation();return message("กรุณารอให้ระบบตรวจช่องทางรับแผนก่อนบันทึก",modal);}
      const selected=modal.dataset.attachmentMethod;
      const files=selected==="pdf"?modal.querySelector("#lesson-pdfs")?.files?.length||0:0;
      const drive=selected==="google_drive"?!!modal.querySelector("#drive-url")?.value.trim():false;
      if((mode==="drive_only"&&files)||(mode==="pdf_only"&&drive)){
        e.preventDefault();e.stopImmediatePropagation();
        return message("ช่องทางนี้ถูกปิดสำหรับปีการศึกษา/ภาคเรียนที่เลือก",modal);
      }
      if(btn.id==="save-submit"){
        const allowedOld=[...modal.querySelectorAll(".attached-file-chip")].some(chip=>
          mode==="both"||(mode==="drive_only"&&chip.classList.contains("drive"))||
          (mode==="pdf_only"&&!chip.classList.contains("drive")));
        if(!allowedOld&&!files&&!drive){
          e.preventDefault();e.stopImmediatePropagation();
          message("ต้องแนบเอกสารตามช่องทางที่เปิดรับก่อนส่งตรวจ: "+labels[mode],modal);
        }
      }
    },true);
    void syncForm(modal,true);
  }

  function guardDetailSubmission(e){
    const btn=e.target.closest?.("#submit-lesson-plan");
    const plan=state.lessonDetail?.plan;
    if(!btn||plan?.plan_type!=="semester")return;
    const mode=cache.get(key(plan.academic_year,plan.semester));
    if(!mode||mode==="both")return; // Database trigger also checks latest mode.
    const allowed=(state.lessonDetail?.files||[]).some(f=>mode==="drive_only"?
      f.attachment_type==="google_drive":f.attachment_type==="pdf");
    if(!allowed){
      e.preventDefault();e.stopImmediatePropagation();
      window.alert("ยังส่งแผนไม่ได้: "+labels[mode]+" กรุณาแก้ไขแผนและเพิ่มเอกสารตามช่องทางที่เปิดรับ");
    }
  }

  let scanPending=false;
  function scan(){
    scanPending=false;
    mountManager();
    mountedForm();
    const plan=state.lessonDetail?.plan;
    if(plan?.plan_type==="semester"&&!cache.has(key(plan.academic_year,plan.semester)))
      void getMode(plan.academic_year,plan.semester).catch(()=>{});
  }
  const scheduleScan=()=>{
    if(scanPending)return;
    scanPending=true;
    queueMicrotask(scan);
  };
  // Installed controller stays active on long-lived tabs. Own the settings click
  // before older app-build handlers can leave a permanent loading button.
  function handleSettingsClick(event){
    const button=event.target?.closest?.("#semester-channel-settings-button");
    if(!button||state.lessonPlanMode!=="semester")return;
    event.preventDefault();
    event.stopImmediatePropagation();
    button.disabled=false;
    button.textContent="⚙ กำหนดวิธีส่งแผน";
    openSettings();
  }
  function resumeSemesterSettings(){
    if(document.visibilityState==="hidden")return;
    cache.clear();
    const button=document.getElementById("semester-channel-settings-button");
    if(button&&canManage()){
      button.disabled=false;
      button.textContent="⚙ กำหนดวิธีส่งแผน";
    }
    const form=findSemesterForm(document);
    if(form)void syncForm(form.closest(".modal-backdrop"),true);
    scheduleScan();
  }
  stylesheet();
  document.addEventListener("click",handleSettingsClick,true);
  document.addEventListener("visibilitychange",resumeSemesterSettings);
  window.addEventListener?.("pageshow",resumeSemesterSettings);
  window.addEventListener?.("focus",resumeSemesterSettings);
  const observer=new MutationObserver(scheduleScan);
  observer.observe(document.body,{childList:true,subtree:true});
  document.addEventListener("click",guardDetailSubmission,true);
  const controller={openSettings};
  activeSemesterChannelController=controller;
  document.documentElement.dataset.bnkSemesterChannelsInstalled="1";
  scheduleScan();
  return controller;
}
