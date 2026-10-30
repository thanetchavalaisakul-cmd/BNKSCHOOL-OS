// BNK SCHOOL OS lazy module: timetable-dialogs. Original function bodies preserved.
export function createTimetableDialogsFeature(ctx){
const {TIMETABLE_STAGE_LABEL,buttonLoading,currentAcademicPeriod,escapeHtml,loadActiveUserData,renderDashboard,schoolClassLabel,state,supabase,toast}=ctx;
async function timetableTeacherCapabilityModal(user) {
  const period=currentAcademicPeriod();
  const [classesRes,homeroomsRes,stageRes,assignmentsRes,subjectsRes,subjectHeadRes]=await Promise.all([
    supabase.from("school_classes").select("*").eq("is_active",true).eq("academic_year",String(period.academicYear)).eq("semester",period.semester).order("sort_order").order("level_name"),
    supabase.from("homeroom_teachers").select("*").eq("teacher_id",user.id),
    supabase.from("stage_heads").select("*").eq("academic_year",String(period.academicYear)),
    supabase.from("teaching_assignments").select("id,class_id,subject_id,periods_per_week,is_active").eq("teacher_id",user.id).eq("is_active",true),
    supabase.from("academic_subjects").select("id,subject_code,subject_name").eq("is_active",true),
    supabase.from("academic_subject_group_heads").select("academic_year,subject_group_id,head_user_id").eq("academic_year",String(period.academicYear))
  ]);
  const classes=classesRes.data||[],homerooms=homeroomsRes.data||[],stageRows=stageRes.data||[],subjectHeadRows=subjectHeadRes.data||[];
  const assignments=(assignmentsRes.data||[]).filter(a=>classes.some(c=>c.id===a.class_id));
  const subjectMap=Object.fromEntries((subjectsRes.data||[]).map(x=>[x.id,x]));
  const classMap=Object.fromEntries(classes.map(x=>[x.id,x]));
  const currentHome=homerooms.find(h=>classes.some(c=>c.id===h.class_id));
  const isPreschoolHome=classMap[currentHome?.class_id]?.stage_code==="early_childhood";
  const preschoolUnitCount=Number((state.teacherDutyAudit||[]).find(x=>x.user_id===user.id)?.preschool_weekly_unit_count)||0;
  const currentStage=stageRows.find(s=>s.teacher_id===user.id);
  const currentSubjectHeadIds=new Set(subjectHeadRows.filter(x=>x.head_user_id===user.id).map(x=>x.subject_group_id));
  const userNameMap=Object.fromEntries((state.pendingUsers||[]).map(x=>[x.id,x.full_name||x.email||"ผู้ใช้งาน"]));
  const currentSubjectHeadLabels=state.subjectGroups.filter(x=>currentSubjectHeadIds.has(x.id)).map(x=>x.name_th);
  const subjectHeadChoices=state.subjectGroups.map(g=>{
    const assigned=subjectHeadRows.find(x=>x.subject_group_id===g.id);
    const assignedName=assigned?.head_user_id&&assigned.head_user_id!==user.id?userNameMap[assigned.head_user_id]:null;
    return `<label class="teacher-duty-choice"><input type="checkbox" data-subject-group-head="${g.id}" ${currentSubjectHeadIds.has(g.id)?"checked":""}><span><strong>${escapeHtml(g.name_th)}</strong>${assignedName?`<small>ปัจจุบัน: ${escapeHtml(assignedName)} · หากเลือกจะย้ายหน้าที่มาที่คนนี้</small>`:`<small>${currentSubjectHeadIds.has(g.id)?"กำลังรับผิดชอบ":"ยังไม่ได้กำหนดให้คนนี้"}</small>`}</span></label>`;
  }).join("");
  const teachingRows=assignments.map(a=>{
    const c=classMap[a.class_id],sub=subjectMap[a.subject_id];
    return `<div class="teacher-duty-row"><div><strong>${escapeHtml(sub?.subject_name||"รายวิชา")}</strong><span>${escapeHtml(c?schoolClassLabel(c):"ไม่พบชั้นเรียน")} · ${Number(a.periods_per_week)||0} คาบ/สัปดาห์</span></div></div>`;
  }).join("");
  const roleHint=user.role==="department_head"
    ? `<div class="settings-rule-box teacher-dual-role-note"><div><strong>หัวหน้ากลุ่มงาน + ครูผู้สอน</strong><span>สิทธิ์หัวหน้าฝ่ายไม่ตัดหน้าที่ครู ระบบต่าง ๆ จะอ้างอิงรายวิชาที่สอนและห้องประจำชั้นจากการมอบหมายด้านล่าง</span></div></div>`
    : `<div class="settings-rule-box teacher-dual-role-note"><div><strong>ครูผู้สอน</strong><span>ระบบต่าง ๆ จะเชื่อมสิทธิ์จากรายวิชาที่สอน ห้องประจำชั้น และหน้าที่ช่วงชั้นที่ได้รับมอบหมาย</span></div></div>`;
  const modal=document.createElement("div");modal.className="modal-backdrop";
  modal.innerHTML=`<div class="modal modal-wide"><div class="modal-head"><div><h3>หน้าที่สอน / ประจำชั้น</h3><p>${escapeHtml(user.full_name||user.email)} · ปีการศึกษา ${period.academicYear} ภาคเรียน ${period.semester}</p></div><button class="modal-close">×</button></div><div class="form-grid">
    ${roleHint}
    <div class="teacher-duty-summary-grid">
      <div class="teacher-duty-stat"><span>${isPreschoolHome?"หน่วยจัดประสบการณ์รายสัปดาห์":"รายวิชาที่สอน"}</span><strong>${isPreschoolHome?preschoolUnitCount:assignments.length}</strong><small>${isPreschoolHome?"ใช้หน่วยกลางชุดเดียวกันทุกห้องอนุบาล โดยไม่ต้องสร้างคาบวิชา":"เชื่อมกับตารางสอน แผนการสอน บันทึกหลังแผน และสอนแทน"}</small></div>
      <div class="teacher-duty-stat"><span>ครูประจำชั้น</span><strong>${currentHome?escapeHtml(schoolClassLabel(classMap[currentHome.class_id])):"ยังไม่กำหนด"}</strong><small>เชื่อมกับนักเรียน เยี่ยมบ้าน คำร้องย้าย และงานประจำชั้น</small></div>
      <div class="teacher-duty-stat"><span>หัวหน้าช่วงชั้น</span><strong>${currentStage?escapeHtml(TIMETABLE_STAGE_LABEL[currentStage.stage_code]||currentStage.stage_code):"ไม่ได้รับมอบหมาย"}</strong><small>ใช้กับขอบเขตการจัดตาราง/นิเทศที่เกี่ยวข้อง</small></div>
      <div class="teacher-duty-stat"><span>หัวหน้ากลุ่มสาระ</span><strong>${currentSubjectHeadLabels.length?escapeHtml(currentSubjectHeadLabels.join(", ")):"ไม่ได้รับมอบหมาย"}</strong><small>ใช้เป็นผู้ตรวจขั้นแรกของรายงานผลการใช้แผน</small></div>
    </div>
    <section class="teacher-duty-list-box"><div><strong>${isPreschoolHome?"หน่วยการจัดประสบการณ์ระดับปฐมวัย":"รายวิชาที่สอนในภาคเรียนนี้"}</strong><span>${isPreschoolHome?"1 หน่วยใช้ร่วมกันทุกห้องอนุบาลต่อ 1 สัปดาห์ · ไม่ต้องมีรายวิชารายคาบ":"กำหนดหรือแก้ไขรายวิชา/ห้องที่สอนในเมนูตารางสอน"}</span></div>${isPreschoolHome?`<div class="teacher-duty-row"><div><strong>ใช้หน่วยร่วมระดับอนุบาล ${preschoolUnitCount} สัปดาห์</strong><span>อ้างอิงแผนหน่วยการเรียนรู้ปีการศึกษา ${period.academicYear} ภาคเรียน ${period.semester}</span></div></div>`:teachingRows||`<div class="empty compact-empty"><strong>ยังไม่มีรายวิชาที่ได้รับมอบหมาย</strong><span>เมื่อกำหนดในระบบตารางสอน ระบบแผนการสอนและบันทึกหลังแผนจะเชื่อมให้อัตโนมัติ</span></div>`}</section>
    <section class="teacher-duty-list-box"><div><strong>หัวหน้ากลุ่มสาระการเรียนรู้</strong><span>Super Admin เป็นผู้กำหนดหน้าที่นี้ และระบบรายงานผลการใช้แผนจะดึงไปใช้เป็นผู้ตรวจขั้นแรกอัตโนมัติ</span></div><div class="teacher-duty-choice-grid">${subjectHeadChoices}</div></section>
    <label class="settings-check"><input type="checkbox" id="teacher-stage-head" ${currentStage?"checked":""}> เป็นหัวหน้าช่วงชั้น</label>
    <div class="field"><label>ช่วงชั้นที่รับผิดชอบ</label><select class="select" id="teacher-stage-code">${Object.entries(TIMETABLE_STAGE_LABEL).map(([v,l])=>`<option value="${v}" ${currentStage?.stage_code===v?"selected":""}>${escapeHtml(l)}</option>`).join("")}</select></div>
    <div class="field"><label>ครูประจำชั้น <strong class="required-mark">*</strong></label><select class="select" id="teacher-homeroom"><option value="" ${currentHome?"":"selected"} disabled>— กรุณาเลือกห้องประจำชั้น —</option>${classes.map(c=>`<option value="${c.id}" ${currentHome?.class_id===c.id?"selected":""}>${escapeHtml(schoolClassLabel(c))}</option>`).join("")}</select><span class="helper">ครูผู้สอนทุกคน รวมถึงหัวหน้ากลุ่มงาน ต้องมีห้องประจำชั้น 1 ห้องต่อปีการศึกษา/ภาคเรียน</span></div>
    ${classes.length?"":`<div class="drive-permission-warning"><strong>ยังไม่มีห้องในภาคเรียนปัจจุบัน</strong><span>หัวหน้าวิชาการต้องสร้างชั้น/ห้องในระบบตารางสอนก่อน จึงจะเลือกครูประจำชั้นได้</span></div>`}
  </div><div class="modal-actions"><button class="btn btn-ghost modal-cancel">ยกเลิก</button><button class="btn btn-primary" id="save-teacher-capability">บันทึกหน้าที่ครู</button></div></div>`;
  document.body.appendChild(modal);const close=()=>modal.remove();modal.querySelector(".modal-close").addEventListener("click",close);modal.querySelector(".modal-cancel").addEventListener("click",close);
  modal.querySelector("#save-teacher-capability").addEventListener("click",async e=>{
    buttonLoading(e.currentTarget,true,"กำลังบันทึก...");
    const home=modal.querySelector("#teacher-homeroom").value;
    if(!home){buttonLoading(e.currentTarget,false);return toast("กรุณาเลือกห้องประจำชั้น","ครูผู้สอนทุกคนต้องมีห้องประจำชั้นก่อนบันทึกหน้าที่","error");}
    const stageCode=modal.querySelector("#teacher-stage-head").checked?modal.querySelector("#teacher-stage-code").value:null;
    const subjectGroupIds=[...modal.querySelectorAll("[data-subject-group-head]:checked")].map(x=>x.dataset.subjectGroupHead);
    const {data,error}=await supabase.rpc("set_staff_teacher_duty_bundle",{
      p_user_id:user.id,
      p_academic_year:String(period.academicYear),
      p_semester:Number(period.semester),
      p_homeroom_class_id:home,
      p_stage_code:stageCode,
      p_subject_group_ids:subjectGroupIds
    });
    buttonLoading(e.currentTarget,false);
    if(error)return toast("บันทึกหน้าที่ครูไม่สำเร็จ",error.message,"error");
    close();
    const assignmentCount=Number(data?.teaching_assignment_count||0);
    const groupCount=Number(data?.subject_group_head_count||0);
    if(!assignmentCount)toast("บันทึกหน้าที่ครูแล้ว",`บันทึกครูประจำชั้น${stageCode?" + หัวหน้าช่วงชั้น":""}${groupCount?` + หัวหน้ากลุ่มสาระ ${groupCount} กลุ่ม`:""}แล้ว แต่ยังไม่มีรายวิชาสอนในภาคเรียนนี้`,"warning");
    else toast("บันทึกหน้าที่ครูแล้ว",`เชื่อมประจำชั้น · ${assignmentCount} วิชาสอน${stageCode?" · หัวหน้าช่วงชั้น":""}${groupCount?` · หัวหน้ากลุ่มสาระ ${groupCount} กลุ่ม`:""}กับทุกระบบแล้ว`,"success");
    await loadActiveUserData();
    renderDashboard();
  });
}
return {timetableTeacherCapabilityModal};
}
