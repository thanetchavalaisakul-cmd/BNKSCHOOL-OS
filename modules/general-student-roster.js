// BNK SCHOOL OS lazy module: general-student-roster.
// Uses the shared student/enrollment master. No duplicate roster storage is created.
export function createGeneralStudentRosterFeature(ctx){
  const {state,supabase,currentAcademicPeriod,escapeHtml,toast,isSuperAdminUser,studentPdfBase,xlsxDownloadFromRows,renderDashboard}=ctx;
  // Operational lists/exports show current students by default; history remains available via "ทุกสถานะ".
  if(!state.generalStudentRosterDefaultStatusSet){
    state.generalStudentRosterStatus="active";
    state.generalStudentRosterDefaultStatusSet=true;
  }
  const buttonLoading=(el,busy,label)=>{if(!el)return;el.disabled=!!busy;if(label&&busy)el.dataset.gsrOriginalLabel=el.textContent,el.textContent=label;else if(!busy&&el.dataset.gsrOriginalLabel){el.textContent=el.dataset.gsrOriginalLabel;delete el.dataset.gsrOriginalLabel;}};
  const access=()=>state.generalStudentRosterAccess||{};
  const canView=()=>!!(isSuperAdminUser()||access().can_view);
  const canManageTransfers=()=>!!(isSuperAdminUser()||access().can_manage_transfers);
  const canAddStudents=()=>!!(isSuperAdminUser()||access().can_add_students);
  const canExport=()=>!!(isSuperAdminUser()||access().can_export);
  const thaiDate=v=>{if(!v)return "—";const d=new Date(v);return Number.isNaN(d.getTime())?String(v):d.toLocaleDateString("th-TH",{day:"numeric",month:"short",year:"numeric"});};
  const name=r=>[r?.prefix,r?.first_name,r?.last_name].filter(Boolean).join(" ").replace(/\s+/g," ").trim();
  const statusLabel=v=>({active:"กำลังเรียน",transferred_out:"ย้ายออก",inactive:"พ้นสภาพ",graduated:"จบการศึกษา"}[v]||v||"—");
  const eventLabel=v=>({student_added:"เพิ่มนักเรียนใหม่",transfer_in:"รับย้ายเข้า",transfer_out:"ย้ายออก"}[v]||v||"—");
  const period=()=>({year:String(state.generalStudentRosterYear||currentAcademicPeriod().academicYear),semester:Number(state.generalStudentRosterSemester||currentAcademicPeriod().semester)});
  const esc=escapeHtml;
  function classOptions(){
    const p=period();
    return (state.generalStudentRosterClasses||[]).filter(c=>String(c.academic_year)===p.year&&Number(c.semester)===p.semester)
      .sort((a,b)=>Number(a.sort_order||0)-Number(b.sort_order||0)||String(a.level_name).localeCompare(String(b.level_name),"th",{numeric:true})||String(a.room_name).localeCompare(String(b.room_name),"th",{numeric:true}));
  }
  function filteredRows(){
    const q=String(state.generalStudentRosterSearch||"").trim().toLowerCase();
    return (state.generalStudentRosterRows||[]).filter(r=>{
      if(state.generalStudentRosterClassId&&r.class_id!==state.generalStudentRosterClassId)return false;
      if(state.generalStudentRosterStatus!=="all"&&r.enrollment_status!==state.generalStudentRosterStatus)return false;
      if(!q)return true;
      return [r.student_code,name(r),r.class_label,r.exit_note].some(v=>String(v||"").toLowerCase().includes(q));
    });
  }
  async function load(){
    if(!canView())return;
    const p=period();
    const results=await Promise.all([
      supabase.from("school_classes").select("id,academic_year,semester,stage_code,level_name,room_name,sort_order,is_active").order("academic_year",{ascending:false}).order("sort_order").order("level_name").order("room_name"),
      supabase.rpc("general_student_roster_list",{p_academic_year:p.year,p_semester:p.semester}),
      supabase.rpc("general_student_roster_transfer_queue")
    ]);
    for(const r of results)if(r.error)throw r.error;
    state.generalStudentRosterClasses=results[0].data||[];
    state.generalStudentRosterRows=results[1].data||[];
    state.generalStudentRosterTransfers=results[2].data||[];
    state.generalStudentRosterError="";
    if(state.generalStudentRosterTab==="history"){
      const h=await supabase.rpc("general_student_roster_event_history",{p_limit:150});
      if(h.error)throw h.error;
      state.generalStudentRosterEvents=h.data||[];
    }
    if(state.generalStudentRosterTab==="permissions"&&isSuperAdminUser()){
      const pair=await Promise.all([
        supabase.from("profiles").select("id,full_name,email,role,department_id,account_status,deleted_at").eq("account_status","active").is("deleted_at",null).order("full_name"),
        supabase.from("general_student_roster_permissions").select("*")
      ]);
      if(pair[0].error)throw pair[0].error;
      if(pair[1].error)throw pair[1].error;
      state.generalStudentRosterUsers=pair[0].data||[];
      state.generalStudentRosterPermissions=pair[1].data||[];
    }
  }
  function hero(){
    const rows=state.generalStudentRosterRows||[],active=rows.filter(r=>r.enrollment_status==="active").length,
      moved=rows.filter(r=>r.enrollment_status==="transferred_out").length,pending=(state.generalStudentRosterTransfers||[]).length;
    return '<section class="gsr-hero"><div class="gsr-hero-copy"><span class="gsr-kicker">ฝ่ายบริหารงานทั่วไป · GENERAL ADMINISTRATION</span><h2>ระบบจัดการรายชื่อนักเรียน</h2><p>บัญชีรายชื่อกลาง เชื่อมโยงทะเบียนวิชาการ พร้อมติดตามการย้ายเข้าและย้ายออก</p><div class="gsr-period">ปีการศึกษา <strong>'+esc(period().year)+'</strong> · ภาคเรียนที่ <strong>'+period().semester+'</strong></div></div><div class="gsr-stats"><article><span>นักเรียนกำลังศึกษา</span><strong>'+active+'</strong><small>คน</small></article><article><span>ทะเบียนภาคเรียนนี้</span><strong>'+rows.length+'</strong><small>รวมประวัติทุกสถานะ</small></article><article><span>ใบย้ายรอดำเนินการ</span><strong>'+pending+'</strong><small>รายการ</small></article><article><span>ย้ายออกแล้ว</span><strong>'+moved+'</strong><small>คน</small></article></div></section>';
  }
  function tabs(){
    const items=[["roster","บัญชีรายชื่อ",null],["transfers","ใบย้ายที่อนุมัติแล้ว",(state.generalStudentRosterTransfers||[]).length],["history","ประวัติการย้ายเข้า–ออก",null]];
    if(isSuperAdminUser())items.push(["permissions","กำหนดสิทธิ์",null]);
    return '<nav class="gsr-tabs">'+items.map(x=>'<button type="button" class="gsr-tab '+(state.generalStudentRosterTab===x[0]?"active":"")+'" data-gsr-tab="'+x[0]+'">'+x[1]+(x[2]!==null?'<span>'+x[2]+'</span>':"")+'</button>').join("")+'</nav>';
  }
  function filters(){
    const p=period(),years=[...new Set((state.generalStudentRosterClasses||[]).map(c=>String(c.academic_year)))].sort((a,b)=>Number(b)-Number(a)),classes=classOptions();
    return '<section class="gsr-filter"><div class="gsr-filter-grid"><label>ปีการศึกษา<select class="select" id="gsr-year">'+years.map(y=>'<option value="'+esc(y)+'" '+(y===p.year?"selected":"")+'>'+esc(y)+'</option>').join("")+'</select></label><label>ภาคเรียน<select class="select" id="gsr-semester"><option value="1" '+(p.semester===1?"selected":"")+'>ภาคเรียนที่ 1</option><option value="2" '+(p.semester===2?"selected":"")+'>ภาคเรียนที่ 2</option></select></label><label>ห้องเรียน<select class="select" id="gsr-class"><option value="">ทุกห้อง</option>'+classes.map(c=>'<option value="'+c.id+'" '+(state.generalStudentRosterClassId===c.id?"selected":"")+'>'+esc(c.level_name+"/"+c.room_name)+'</option>').join("")+'</select></label><label>สถานะ<select class="select" id="gsr-status"><option value="all">ทุกสถานะ</option><option value="active" '+(state.generalStudentRosterStatus==="active"?"selected":"")+'>กำลังเรียน</option><option value="transferred_out" '+(state.generalStudentRosterStatus==="transferred_out"?"selected":"")+'>ย้ายออก</option><option value="inactive" '+(state.generalStudentRosterStatus==="inactive"?"selected":"")+'>พ้นสภาพ</option><option value="graduated" '+(state.generalStudentRosterStatus==="graduated"?"selected":"")+'>จบการศึกษา</option></select></label></div><div class="gsr-filter-actions"><input class="input" id="gsr-search" value="'+esc(state.generalStudentRosterSearch||"")+'" placeholder="ค้นหาชื่อ / เลขประจำตัว / ห้องเรียน"><button class="btn btn-secondary" id="gsr-refresh">↻ รีเฟรช</button></div></section>';
  }
  function rosterView(){
    const rows=filteredRows(),p=period();
    const actions='<div class="gsr-toolbar">'+(canAddStudents()?'<button class="btn btn-primary" id="gsr-add-student">＋ เพิ่มนักเรียน / รับย้ายเข้า</button>':"")+(canExport()?'<button class="btn btn-secondary" id="gsr-export-pdf">PDF</button><button class="btn btn-secondary" id="gsr-export-xlsx">Excel</button>':"")+'</div>';
    return '<section class="gsr-card"><div class="gsr-card-head"><div><h3>บัญชีรายชื่อนักเรียน</h3><p>แสดงเฉพาะข้อมูลที่จำเป็นต่อการจัดการรายชื่อ ไม่แสดงเลขประชาชนและข้อมูลผู้ปกครอง</p></div>'+actions+'</div><div class="gsr-table-wrap"><table class="gsr-table"><thead><tr><th>เลขที่</th><th>เลขประจำตัว</th><th>ชื่อ–นามสกุล</th><th>ชั้น/ห้อง</th><th>สถานะ</th><th>รายละเอียดการออก</th></tr></thead><tbody>'+rows.map(r=>'<tr><td>'+(r.student_number||"—")+'</td><td><strong>'+esc(r.student_code)+'</strong></td><td>'+esc(name(r))+'</td><td>'+esc(r.class_label)+'</td><td><span class="gsr-status '+esc(r.enrollment_status)+'">'+esc(statusLabel(r.enrollment_status))+'</span></td><td>'+esc(r.exit_note||"—")+'</td></tr>').join("")+'</tbody></table>'+(rows.length?"":'<div class="gsr-empty">ไม่พบรายชื่อนักเรียนตามเงื่อนไขที่เลือก</div>')+'</div><div class="gsr-table-foot">พบ '+rows.length+' รายชื่อ · ปีการศึกษา '+esc(p.year)+' ภาคเรียนที่ '+p.semester+'</div></section>';
  }
  function transfersView(){
    const rows=state.generalStudentRosterTransfers||[];
    return '<section class="gsr-card"><div class="gsr-card-head"><div><h3>ใบย้ายที่ได้รับอนุมัติแล้ว</h3><p>รายการดึงจากระบบทะเบียนวิชาการโดยตรง ฝ่ายบริหารทั่วไปยืนยันย้ายออกเมื่อพร้อมดำเนินการ</p></div><button class="btn btn-secondary" id="gsr-refresh">↻ รีเฟรช</button></div><div class="gsr-transfer-list">'+rows.map(r=>'<article class="gsr-transfer-row '+(state.generalStudentRosterSelectedRequestId===r.request_id?"selected":"")+'" data-gsr-transfer-row="'+r.request_id+'"><div class="gsr-transfer-main"><div class="gsr-transfer-title"><strong>'+esc(r.student_name)+'</strong><span>'+esc(r.request_code||"—")+'</span></div><div class="gsr-transfer-meta"><span>'+esc(r.student_code)+' · '+esc(r.class_label)+'</span><span>วันที่ย้าย '+thaiDate(r.transfer_date)+'</span><span>ปลายทาง '+esc(r.destination_school||"ไม่ระบุ")+'</span></div><small>อนุมัติ/ปรับปรุงล่าสุด '+thaiDate(r.updated_at)+'</small></div><div class="gsr-transfer-action">'+(r.has_active_enrollment?'<span class="gsr-status pending">รอดำเนินการ</span>':'<span class="gsr-status inactive">ต้องตรวจสอบทะเบียน</span>')+(canManageTransfers()?'<button type="button" class="btn btn-danger btn-sm" data-gsr-process-transfer="'+r.request_id+'" '+(r.has_active_enrollment?"":"disabled")+'>ยืนยันย้ายออก</button>':"")+'</div></article>').join("")+(rows.length?"":'<div class="gsr-empty-state"><strong>ไม่มีใบย้ายที่รอดำเนินการ</strong><span>เมื่อใบย้ายผ่านการอนุมัติครบทุกฝ่าย รายการจะปรากฏที่นี่โดยอัตโนมัติ</span></div>')+'</div></section>';
  }
  function historyView(){
    const rows=state.generalStudentRosterEvents||[];
    return '<section class="gsr-card"><div class="gsr-card-head"><div><h3>ประวัติการย้ายเข้า–ย้ายออก</h3><p>บันทึกผู้ดำเนินการ วันเวลา และข้อมูลอ้างอิงจากทะเบียนกลาง</p></div><button class="btn btn-secondary" id="gsr-refresh">↻ รีเฟรช</button></div><div class="gsr-table-wrap"><table class="gsr-table"><thead><tr><th>วันที่ดำเนินการ</th><th>รายการ</th><th>นักเรียน</th><th>ชั้น/ห้อง</th><th>ปี/ภาคเรียน</th><th>ผู้ดำเนินการ</th><th>รายละเอียด</th></tr></thead><tbody>'+rows.map(r=>'<tr><td>'+thaiDate(r.created_at)+'</td><td><span class="gsr-status '+(r.event_type==="transfer_out"?"transferred_out":"active")+'">'+esc(eventLabel(r.event_type))+'</span></td><td><strong>'+esc(r.student_name)+'</strong><small class="gsr-subline">'+esc(r.student_code)+'</small></td><td>'+esc(r.class_label)+'</td><td>'+esc(r.academic_year)+'/'+r.semester+'</td><td>'+esc(r.actor_name||"—")+'</td><td>'+esc(r.details?.destination_school||r.details?.source_school||r.details?.request_code||"—")+'</td></tr>').join("")+'</tbody></table>'+(rows.length?"":'<div class="gsr-empty">ยังไม่มีประวัติการดำเนินการ</div>')+'</div></section>';
  }
  const roleLabel=r=>({super_admin:"แอดมิน",director:"ผู้อำนวยการ",department_head:"หัวหน้าฝ่าย",teacher:"ครู",pa_evaluator:"กรรมการ PA"}[r]||r||"—");
  function permissionsView(){
    if(!isSuperAdminUser())return '<section class="gsr-card"><div class="gsr-empty-state">เฉพาะแอดมินเท่านั้นที่กำหนดสิทธิ์ได้</div></section>';
    const map=new Map((state.generalStudentRosterPermissions||[]).map(p=>[p.user_id,p]));
    const rows=(state.generalStudentRosterUsers||[]).filter(u=>u.role!=="super_admin").map(u=>{
      const p=map.get(u.id)||{};
      return '<tr data-gsr-permission-row="'+u.id+'"><td><strong>'+esc(u.full_name||u.email)+'</strong><small class="gsr-subline">'+esc(roleLabel(u.role))+'</small></td><td><input type="checkbox" data-gsr-permission="can_view" '+(p.can_view?"checked":"")+'></td><td><input type="checkbox" data-gsr-permission="can_manage_transfers" '+(p.can_manage_transfers?"checked":"")+'></td><td><input type="checkbox" data-gsr-permission="can_add_students" '+(p.can_add_students?"checked":"")+'></td><td><input type="checkbox" data-gsr-permission="can_export" '+(p.can_export?"checked":"")+'></td><td><button class="btn btn-secondary btn-sm" data-gsr-save-permission="'+u.id+'">บันทึก</button></td></tr>';
    }).join("");
    return '<section class="gsr-card"><div class="gsr-card-head"><div><h3>กำหนดสิทธิ์ผู้ใช้งาน</h3><p>แอดมินเลือกบุคลากรเป็นรายบุคคลได้ สิทธิ์จัดการจะไม่เปิดให้ทั้งฝ่ายโดยอัตโนมัติ</p></div></div><div class="gsr-table-wrap"><table class="gsr-table gsr-permissions-table"><thead><tr><th>บุคลากร</th><th>ดูรายชื่อ</th><th>ดำเนินการย้าย</th><th>เพิ่ม/รับย้ายเข้า</th><th>ส่งออก</th><th></th></tr></thead><tbody>'+(rows||'<tr><td colspan="6" class="gsr-empty">ไม่พบบัญชีบุคลากรที่เปิดใช้งาน</td></tr>')+'</tbody></table></div><p class="gsr-permission-note">หากเลือกสิทธิ์ดำเนินการย้าย เพิ่มนักเรียน หรือส่งออก ระบบจะเปิดสิทธิ์ดูรายชื่อให้โดยอัตโนมัติ</p></section>';
  }
  function view(){
    if(!canView())return '<section class="panel"><div class="empty"><strong>ไม่มีสิทธิ์เข้าถึงระบบนี้</strong><span>กรุณาติดต่อแอดมินเพื่อขอรับสิทธิ์ระบบจัดการรายชื่อนักเรียน</span></div></section>';
    if(state.generalStudentRosterError)return '<section class="panel"><div class="empty"><strong>โหลดข้อมูลระบบรายชื่อนักเรียนไม่สำเร็จ</strong><span>'+esc(state.generalStudentRosterError)+'</span><button class="btn btn-secondary" id="gsr-refresh">ลองอีกครั้ง</button></div></section>';
    const tab=state.generalStudentRosterTab||"roster";
    const body=tab==="transfers"?transfersView():tab==="history"?historyView():tab==="permissions"?permissionsView():rosterView();
    return '<div class="general-student-roster">'+hero()+tabs()+(tab==="permissions"?"":filters())+body+'</div>';
  }
  function addStudentModal(){
    if(!canAddStudents())return;
    const p=period(),classes=classOptions(),m=document.createElement("div");m.className="modal-backdrop";
    const classList=classes.map(c=>'<option value="'+c.id+'">'+esc(c.level_name+"/"+c.room_name)+' · ปี '+esc(c.academic_year)+' ภาค '+c.semester+'</option>').join("");
    m.innerHTML='<div class="modal modal-wide gsr-add-modal"><div class="modal-head"><div><h3>เพิ่มนักเรียน / รับย้ายเข้า</h3><p>ข้อมูลจะถูกเพิ่มลงทะเบียนนักเรียนกลาง และปรากฏในระบบวิชาการกับระบบอื่นที่เชื่อมโยงทันที</p></div><button class="modal-close">×</button></div><form id="gsr-add-form" class="form-grid"><div class="gsr-modal-note">ระบบจะตรวจเลขประจำตัวนักเรียนและเลขประชาชน/เลข G ซ้ำก่อนบันทึก และไม่แสดงเลขประชาชนในใบรายชื่อทั่วไป</div><div class="form-row"><label>ประเภทการรับนักเรียน<select class="select" name="entry_type"><option value="transfer_in">รับย้ายเข้าจากสถานศึกษาอื่น</option><option value="student_added">นักเรียนเข้าใหม่</option></select></label><label>โรงเรียนเดิม / โรงเรียนต้นทาง<input class="input" name="source_school" maxlength="180" placeholder="กรอกเมื่อเป็นการรับย้ายเข้า"></label></div><div class="form-row"><label>เลขประจำตัวนักเรียน<input class="input" name="student_code" maxlength="40" required></label><label>เลขประชาชน / เลข G<input class="input" name="citizen_id" maxlength="30" required></label></div><div class="form-row"><label>คำนำหน้า<input class="input" name="prefix" maxlength="30" placeholder="เด็กชาย / เด็กหญิง" required></label><label>เพศ<select class="select" name="gender"><option value="">ไม่ระบุ</option><option value="ชาย">ชาย</option><option value="หญิง">หญิง</option></select></label></div><div class="form-row"><label>ชื่อ<input class="input" name="first_name" maxlength="100" required></label><label>นามสกุล<input class="input" name="last_name" maxlength="100" required></label></div><div class="form-row"><label>วันเดือนปีเกิด<input class="input" name="birth_date" type="date" required></label><label>ระดับชั้น / ห้อง<select class="select" name="class_id" required>'+classList+'</select></label></div><div class="gsr-modal-period">ปีการศึกษา '+esc(p.year)+' · ภาคเรียนที่ '+p.semester+' · เลือกห้องจากปี/ภาคเรียนที่ต้องการบันทึก</div></form><div class="modal-actions"><button class="btn btn-ghost modal-cancel">ยกเลิก</button><button class="btn btn-primary" id="gsr-add-save">บันทึกนักเรียน</button></div></div>';
    document.body.appendChild(m);const close=()=>m.remove();m.querySelector(".modal-close").onclick=close;m.querySelector(".modal-cancel").onclick=close;
    const type=m.querySelector('[name="entry_type"]'),source=m.querySelector('[name="source_school"]'),sync=()=>{source.required=type.value==="transfer_in";source.disabled=type.value!=="transfer_in";};type.onchange=sync;sync();
    m.querySelector("#gsr-add-save").onclick=async ev=>{
      const form=m.querySelector("#gsr-add-form");if(!form.reportValidity())return;
      const fd=new FormData(form),cls=classes.find(c=>c.id===fd.get("class_id"));if(!cls)return toast("กรุณาเลือกห้องเรียน","ไม่พบห้องเรียนที่เลือก","error");
      buttonLoading(ev.currentTarget,true,"กำลังบันทึก...");
      try{
        const result=await supabase.rpc("general_student_roster_create_student",{
          p_student_code:String(fd.get("student_code")).trim(),p_citizen_id:String(fd.get("citizen_id")).trim(),
          p_prefix:String(fd.get("prefix")).trim(),p_first_name:String(fd.get("first_name")).trim(),
          p_last_name:String(fd.get("last_name")).trim(),p_birth_date:String(fd.get("birth_date")),
          p_gender:String(fd.get("gender")||"")||null,p_class_id:cls.id,
          p_academic_year:String(cls.academic_year),p_semester:Number(cls.semester),
          p_entry_type:String(fd.get("entry_type")),p_source_school:String(fd.get("source_school")||"").trim()||null
        });
        if(result.error)throw result.error;
        state.generalStudentRosterYear=String(cls.academic_year);state.generalStudentRosterSemester=Number(cls.semester);
        state.generalStudentRosterTab="roster";state.generalStudentRosterClassId=cls.id;
        close();toast("เพิ่มข้อมูลนักเรียนสำเร็จ",(result.data?.student_name||"นักเรียน")+" · "+(result.data?.class_label||"")+" · เชื่อมทะเบียนกลางแล้ว","success");
        await load();await renderDashboard();
      }catch(err){toast("เพิ่มนักเรียนไม่สำเร็จ",err.message||String(err),"error");}
      finally{buttonLoading(ev.currentTarget,false);}
    };
  }
  async function finalizeTransfer(id){
    if(!canManageTransfers())return;
    const r=(state.generalStudentRosterTransfers||[]).find(x=>x.request_id===id);if(!r)return;
    if(!r.has_active_enrollment)return toast("ยังดำเนินการไม่ได้","ไม่พบสถานะกำลังเรียนที่ตรงกับใบย้าย กรุณาให้ฝ่ายวิชาการตรวจสอบทะเบียนก่อน","error");
    const ok=confirm("ยืนยันย้ายออกนักเรียนหรือไม่?\n\n"+r.student_name+"\n"+r.class_label+" · เลขประจำตัว "+r.student_code+"\nโรงเรียนปลายทาง: "+(r.destination_school||"ไม่ระบุ")+"\n\nเมื่อยืนยัน รายชื่อจะถูกปรับสถานะพร้อมกันในทะเบียนกลางและทุกระบบที่เชื่อมโยง โดยประวัติเดิมไม่ถูกลบ");
    if(!ok)return;
    const btn=document.querySelector('[data-gsr-process-transfer="'+id+'"]');if(btn)buttonLoading(btn,true,"กำลังยืนยัน...");
    try{
      const result=await supabase.rpc("general_student_roster_finalize_transfer",{p_request_id:id});
      if(result.error)throw result.error;
      toast("ดำเนินการย้ายออกสำเร็จ",(result.data?.student_name||r.student_name)+" · "+(result.data?.class_label||r.class_label)+" · อัปเดตทะเบียนกลางแล้ว","success");
      state.generalStudentRosterSelectedRequestId=null;await load();await renderDashboard();
    }catch(err){toast("ดำเนินการไม่สำเร็จ",err.message||String(err),"error");if(btn)buttonLoading(btn,false);}
  }
  async function savePermission(id,row,button){
    if(!isSuperAdminUser())return;
    const values={};row.querySelectorAll("[data-gsr-permission]").forEach(el=>values[el.dataset.gsrPermission]=!!el.checked);
    if(values.can_manage_transfers||values.can_add_students||values.can_export)values.can_view=true;
    buttonLoading(button,true,"กำลังบันทึก...");
    try{
      const allOff=!values.can_view&&!values.can_manage_transfers&&!values.can_add_students&&!values.can_export;
      let result;
      if(allOff)result=await supabase.from("general_student_roster_permissions").delete().eq("user_id",id);
      else {
        const existing=(state.generalStudentRosterPermissions||[]).find(p=>p.user_id===id);
        const payload={can_view:values.can_view,can_manage_transfers:values.can_manage_transfers,
          can_add_students:values.can_add_students,can_export:values.can_export,
          is_active:true,updated_by:state.user.id};
        result=existing
          ? await supabase.from("general_student_roster_permissions").update(payload).eq("user_id",id)
          : await supabase.from("general_student_roster_permissions").insert({...payload,user_id:id,created_by:state.user.id});
      }
      if(result.error)throw result.error;
      toast("บันทึกสิทธิ์แล้ว",allOff?"ยกเลิกสิทธิ์การเข้าถึงเรียบร้อย":"อัปเดตสิทธิ์ผู้ใช้งานเรียบร้อย","success");
      await load();await renderDashboard();
    }catch(err){toast("บันทึกสิทธิ์ไม่สำเร็จ",err.message||String(err),"error");buttonLoading(button,false);}
  }
  function exportRows(){
    return filteredRows().map(r=>({"เลขที่":r.student_number||"","เลขประจำตัวนักเรียน":r.student_code||"",
      "ชื่อ-นามสกุล":name(r),"เพศ":r.gender||"","ชั้น/ห้อง":r.class_label||"",
      "ปีการศึกษา":period().year,"ภาคเรียน":period().semester,
      "สถานะ":statusLabel(r.enrollment_status),"เหตุผลการออก":r.exit_note||""}));
  }
  async function exportXlsx(){
    if(!canExport())return;
    const rows=exportRows();if(!rows.length)return toast("ไม่มีข้อมูล","ไม่มีรายชื่อสำหรับส่งออก","error");
    const p=period();await xlsxDownloadFromRows(rows,"บัญชีรายชื่อนักเรียนทั่วไป_"+p.year+"_ภาค"+p.semester+".xlsx","รายชื่อนักเรียน");
  }
  async function exportPdf(){
    if(!canExport())return;
    const rows=filteredRows();if(!rows.length)return toast("ไม่มีข้อมูล","ไม่มีรายชื่อสำหรับส่งออก","error");
    const table='<table class="student-pdf-table"><thead><tr><th style="width:13mm">เลขที่</th><th style="width:28mm">เลขประจำตัว</th><th>ชื่อ–นามสกุล</th><th style="width:25mm">ชั้น/ห้อง</th><th style="width:27mm">สถานะ</th></tr></thead><tbody>'+rows.map(r=>'<tr><td class="center">'+(r.student_number||"—")+'</td><td>'+esc(r.student_code)+'</td><td>'+esc(name(r))+'</td><td class="center">'+esc(r.class_label)+'</td><td class="center">'+esc(statusLabel(r.enrollment_status))+'</td></tr>').join("")+'</tbody></table>';
    const p=period();await studentPdfBase("บัญชีรายชื่อนักเรียน","ฝ่ายบริหารงานทั่วไป · ปีการศึกษา "+p.year+" ภาคเรียนที่ "+p.semester,table,{landscape:false});
  }
  async function bind(){
    if(!canView())return;
    document.querySelectorAll("[data-gsr-tab]").forEach(btn=>btn.addEventListener("click",async()=>{
      state.generalStudentRosterTab=btn.dataset.gsrTab;
      try{await load();await renderDashboard();}catch(err){toast("โหลดข้อมูลไม่สำเร็จ",err.message||String(err),"error");}
    }));
    document.querySelector("#gsr-year")?.addEventListener("change",async e=>{state.generalStudentRosterYear=e.currentTarget.value;state.generalStudentRosterClassId="";try{await load();await renderDashboard();}catch(err){toast("โหลดข้อมูลไม่สำเร็จ",err.message||String(err),"error");}});
    document.querySelector("#gsr-semester")?.addEventListener("change",async e=>{state.generalStudentRosterSemester=Number(e.currentTarget.value);state.generalStudentRosterClassId="";try{await load();await renderDashboard();}catch(err){toast("โหลดข้อมูลไม่สำเร็จ",err.message||String(err),"error");}});
    document.querySelector("#gsr-class")?.addEventListener("change",e=>{state.generalStudentRosterClassId=e.currentTarget.value||"";state.generalStudentRosterSkipNextLoad=true;renderDashboard();});
    document.querySelector("#gsr-status")?.addEventListener("change",e=>{state.generalStudentRosterStatus=e.currentTarget.value;state.generalStudentRosterSkipNextLoad=true;renderDashboard();});
    document.querySelector("#gsr-search")?.addEventListener("input",e=>{state.generalStudentRosterSearch=e.currentTarget.value;state.generalStudentRosterSkipNextLoad=true;const pos=e.currentTarget.selectionStart;renderDashboard().then(()=>{const input=document.querySelector("#gsr-search");if(input){input.focus();input.setSelectionRange(pos,pos);}});});
    document.querySelector("#gsr-refresh")?.addEventListener("click",async()=>{try{await load();await renderDashboard();}catch(err){toast("รีเฟรชไม่สำเร็จ",err.message||String(err),"error");}});
    document.querySelector("#gsr-add-student")?.addEventListener("click",()=>addStudentModal());
    document.querySelector("#gsr-export-xlsx")?.addEventListener("click",()=>exportXlsx());
    document.querySelector("#gsr-export-pdf")?.addEventListener("click",()=>exportPdf());
    document.querySelectorAll("[data-gsr-process-transfer]").forEach(btn=>btn.addEventListener("click",()=>finalizeTransfer(btn.dataset.gsrProcessTransfer)));
    document.querySelectorAll("[data-gsr-save-permission]").forEach(btn=>btn.addEventListener("click",()=>savePermission(btn.dataset.gsrSavePermission,btn.closest("[data-gsr-permission-row]"),btn)));
    if(state.generalStudentRosterSelectedRequestId){
      const target=document.querySelector('[data-gsr-transfer-row="'+state.generalStudentRosterSelectedRequestId+'"]');
      target?.scrollIntoView({behavior:"smooth",block:"center"});
    }
  }
  return {load,view,bind};
}
