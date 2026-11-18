"""Apply the 18 Nov 2026 student suspension UI patch on an isolated Git branch.
Repeatable: a second run is a no-op. The production database is not touched.
"""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def replace_once(source, before, after, label):
    count = source.count(before)
    if count != 1:
        raise RuntimeError(f"{label}: expected exactly 1 match, found {count}")
    return source.replace(before, after, 1)


def patch_app():
    path = ROOT / "app.js"
    source = path.read_text(encoding="utf-8")
    if "function studentSuspensionBadge(value)" in source:
        return

    helpers = r'''
function studentSuspensionBadge(value){
  return value ? '<span title="นักเรียนยังอยู่ในทะเบียนและต้องติดตาม" style="display:inline-block;margin-left:6px;border:1px solid #d97706;border-radius:999px;padding:2px 7px;background:#fffbeb;color:#92400e;font-size:11px;font-weight:700;white-space:nowrap">แขวนลอย</span>' : '';
}
function canSetStudentSuspensionUi(enrollment){
  return !!enrollment && enrollment.enrollment_status==="active" &&
    (canManageStudentMasterUi() || studentOwnHomeroomClasses().some(c=>c.id===enrollment.class_id));
}
function studentClassListSuspensionSuffix(row){
  const selected=studentRegistrySelectedClass();
  const matching=(state.studentRegistryEnrollments||[]).find(e=>e.student_id===row.student_id &&
    e.class_id===selected?.id && e.enrollment_status==="active");
  return matching?.is_suspended?" (แขวนลอย)":"";
}
function studentSuspensionFollowupPanel(){
  const pending=(state.studentFollowupStudents||[]).filter(s=>state.studentFollowupSuspendedIds?.has(s.student_id));
  return `<section class="panel" style="border-left:4px solid #d97706"><div class="panel-head"><div class="panel-title-wrap"><h3>บัญชีนักเรียนแขวนลอย (${pending.length} คน)</h3><p>เชื่อมสถานะจากทะเบียนนักเรียน · ยังมีชื่อและเลขที่ตามเดิม · การออกหนังสือต้องตรวจสอบระยะเวลาขาดเรียนและเงื่อนไขที่กำหนดแยกต่างหาก</p></div></div>${pending.length?`<div class="table-wrap"><table class="table"><thead><tr><th>นักเรียน</th><th>ชั้น / ห้อง</th><th>สถานะ</th></tr></thead><tbody>${pending.map(x=>`<tr><td><strong>${escapeHtml(x.student_name)}</strong> <small class="table-muted">${escapeHtml(x.student_code||'')}</small></td><td>${escapeHtml(x.class_label||'—')}</td><td>${studentSuspensionBadge(true)}</td></tr>`).join('')}</tbody></table></div>`:'<p style="padding:0 20px 18px">ไม่มีนักเรียนแขวนลอยในช่วงที่เลือก</p>'}</section>`;
}
document.addEventListener("change",event=>{
  if(event.target?.id!=="student-only-suspended")return;
  state.studentRegistrySuspensionOnly=!!event.target.checked;
  state.studentRegistryPage=1;
  renderDashboard();
});
document.addEventListener("click",async event=>{
  const button=event.target?.closest?.("[data-student-suspension]");
  if(!button)return;
  const enrollment=(state.studentRegistryEnrollments||[]).find(e=>e.id===button.dataset.studentSuspension);
  if(!canSetStudentSuspensionUi(enrollment))return toast("ไม่มีสิทธิ์","เฉพาะครูประจำชั้นหรือผู้จัดการทะเบียน","error");
  const next=!enrollment.is_suspended;
  const note=next?window.prompt("หมายเหตุการกำหนดสถานะแขวนลอย (เว้นว่างได้)",""):
    (window.confirm("ยืนยันยกเลิกสถานะแขวนลอย โดยคงนักเรียนไว้ในทะเบียนหรือไม่?")?"":null);
  if(note===null)return;
  if(note.length>1000)return toast("หมายเหตุยาวเกินไป","สูงสุด 1,000 ตัวอักษร","error");
  button.disabled=true;
  try{
    const {error}=await supabase.rpc("set_student_enrollment_suspension",{
      p_enrollment_id:enrollment.id,p_is_suspended:next,p_note:note||null
    });
    if(error)throw error;
    state.studentRegistrySkipBaseOnce=false;
    await loadStudentRegistryWorkspace();
    await renderDashboard();
    toast(next?"กำหนดนักเรียนแขวนลอยแล้ว":"ยกเลิกสถานะแขวนลอยแล้ว",
      "รายชื่อและเลขที่ยังอยู่ในทะเบียนตามปกติ","success");
  }catch(error){toast("เปลี่ยนสถานะไม่สำเร็จ",error.message||String(error),"error");}
  finally{button.disabled=false;}
});
'''
    source = replace_once(source, "function studentRegistryStudentsHtml(){", helpers + "\nfunction studentRegistryStudentsHtml(){", "insert helpers")
    source = replace_once(source,
        "const rows=studentVisibleEnrollments(),p=studentRegistryCurrentPeriod(),c=studentRegistrySelectedClass();",
        "const rows=studentVisibleEnrollments().filter(e=>!state.studentRegistrySuspensionOnly||e.is_suspended),p=studentRegistryCurrentPeriod(),c=studentRegistrySelectedClass();",
        "registry filter")
    source = replace_once(source,
        '<span class="student-count-badge">${rows.length} รายการ</span></div>',
        '<span class="student-count-badge">${rows.length} รายการ</span><label style="margin-left:12px;font-size:12px;white-space:nowrap"><input type="checkbox" id="student-only-suspended" ${state.studentRegistrySuspensionOnly?"checked":""}> เฉพาะแขวนลอย</label></div>',
        "filter checkbox")
    source = replace_once(source,
        '<span class="student-enrollment-pill ${studentEnrollmentStatusClass(e)}">${escapeHtml(studentEnrollmentStatusLabel(e))}</span>${e.exit_reason?',
        '<span class="student-enrollment-pill ${studentEnrollmentStatusClass(e)}">${escapeHtml(studentEnrollmentStatusLabel(e))}</span>${studentSuspensionBadge(e.is_suspended)}${e.exit_reason?',
        "registry badge")
    source = replace_once(source,
        '<button class="student-detail-btn" data-student-detail="${s.id}">ดูรายละเอียด <span>›</span></button>',
        '<button class="student-detail-btn" data-student-detail="${s.id}">ดูรายละเอียด <span>›</span></button>${canSetStudentSuspensionUi(e)?`<button type="button" class="btn btn-ghost btn-small" data-student-suspension="${e.id}">${e.is_suspended?"ยกเลิกแขวนลอย":"กำหนดแขวนลอย"}</button>`:""}',
        "teacher control")
    old_name='${escapeHtml(studentClassRosterFullName(r))}'
    name_count=source.count(old_name)
    if name_count not in (1,2):
        raise RuntimeError(f"class name occurrences: {name_count}")
    source=source.replace(old_name,'${escapeHtml(studentClassRosterFullName(r)+studentClassListSuspensionSuffix(r))}')
    source = replace_once(source,
        '"สถานะ":studentEnrollmentStatusLabel(e),"เหตุผลออกจากรายชื่อ"',
        '"สถานะ":studentEnrollmentStatusLabel(e),"สถานะติดตาม":e.is_suspended?"แขวนลอย":"","เหตุผลออกจากรายชื่อ"',
        "registry Excel")
    source = replace_once(source,
        '"ชื่อ-สกุล":studentClassRosterFullName(r)',
        '"ชื่อ-สกุล":studentClassRosterFullName(r)+studentClassListSuspensionSuffix(r)',
        "class list Excel")
    source = replace_once(source,
        '${escapeHtml(studentEnrollmentStatusLabel(e))}</td></tr>',
        '${escapeHtml(studentEnrollmentStatusLabel(e))}${e.is_suspended?" · แขวนลอย":""}</td></tr>',
        "registry PDF")
    source = replace_once(source,
        'state.studentFollowupStudents=studentsRes.data||[];',
        '''state.studentFollowupStudents=studentsRes.data||[];
  const flaggedRes=await supabase.from('student_enrollments').select('student_id,is_suspended')
    .eq('academic_year',year).eq('semester',semester).eq('enrollment_status','active').eq('is_suspended',true);
  if(flaggedRes.error)throw flaggedRes.error;
  state.studentFollowupSuspendedIds=new Set((flaggedRes.data||[]).map(x=>x.student_id));''',
        "follow-up read")
    source = replace_once(source,
        '''</div>
  <section class="panel"><div class="panel-head"><div class="panel-title-wrap"><h3>ทะเบียนหนังสือติดตามนักเรียน''',
        '''</div>
  ${studentSuspensionFollowupPanel()}
  <section class="panel"><div class="panel-head"><div class="panel-title-wrap"><h3>ทะเบียนหนังสือติดตามนักเรียน''',
        "follow-up queue")
    source = replace_once(source,
        '<strong>${escapeHtml(s.student_name)}</strong><br><span class="table-muted">${escapeHtml(s.student_code||\'—\')}</span>',
        '<strong>${escapeHtml(s.student_name)}</strong>${studentSuspensionBadge(state.studentFollowupSuspendedIds?.has(s.student_id))}<br><span class="table-muted">${escapeHtml(s.student_code||\'—\')}</span>',
        "follow-up picker")
    path.write_text(source,encoding="utf-8")
    print("Patched app.js: registry, reports, homeroom action and follow-up queue")


def patch_roster():
    path=ROOT / "modules/general-student-roster.js"
    source=path.read_text(encoding="utf-8")
    if "generalStudentRosterSuspensionOnly" in source:
        return
    source=replace_once(source,
        'state.generalStudentRosterRows=results[1].data||[];',
        '''const flagged=await supabase.from("student_enrollments")
      .select("id,is_suspended").eq("academic_year",p.year).eq("semester",p.semester).eq("is_suspended",true);
    if(flagged.error)throw flagged.error;
    const suspendedIds=new Set((flagged.data||[]).map(e=>e.id));
    state.generalStudentRosterRows=(results[1].data||[]).map(r=>({...r,is_suspended:suspendedIds.has(r.enrollment_id)}));''',
        "general roster read")
    source=replace_once(source,
        'if(state.generalStudentRosterClassId&&r.class_id!==state.generalStudentRosterClassId)return false;',
        '''if(state.generalStudentRosterClassId&&r.class_id!==state.generalStudentRosterClassId)return false;
      if(state.generalStudentRosterSuspensionOnly&&!r.is_suspended)return false;''',
        "general roster filter")
    source=source.replace(
        '<button class="btn btn-secondary" id="gsr-refresh">↻ รีเฟรช</button>',
        '''<label style="white-space:nowrap"><input type="checkbox" id="gsr-suspended-only" '+(state.generalStudentRosterSuspensionOnly?'checked':'')+'> เฉพาะแขวนลอย</label><button class="btn btn-secondary" id="gsr-refresh">↻ รีเฟรช</button>''',
        1)
    source=replace_once(source,
        '+esc(statusLabel(r.enrollment_status))+\'</span></td></tr>\'',
        '+esc(statusLabel(r.enrollment_status))+(r.is_suspended?\' · แขวนลอย\':\'\')+\'</span></td></tr>\'',
        "general roster badge")
    source=replace_once(source,
        '"สถานะ":statusLabel(r.enrollment_status),"เหตุผลการออก"',
        '"สถานะ":statusLabel(r.enrollment_status),"สถานะติดตาม":r.is_suspended?"แขวนลอย":"","เหตุผลการออก"',
        "general roster Excel")
    source=replace_once(source,
        "esc(statusLabel(r.enrollment_status))+'</td></tr>'",
        "esc(statusLabel(r.enrollment_status)+(r.is_suspended?' · แขวนลอย':''))+'</td></tr>'",
        "general roster PDF")
    source=replace_once(source,
        'document.querySelector("#gsr-search")?.addEventListener',
        '''document.querySelector("#gsr-suspended-only")?.addEventListener("change",e=>{state.generalStudentRosterSuspensionOnly=e.target.checked;state.generalStudentRosterSkipNextLoad=true;renderDashboard();});
    document.querySelector("#gsr-search")?.addEventListener''',
        "general roster checkbox event")
    path.write_text(source,encoding="utf-8")
    print("Patched general-student-roster.js: label, filter and exports")


def patch_cache_key():
    path=ROOT/"index.html"
    source=path.read_text(encoding="utf-8")
    old='app.min.js?v=5.12.9.815'
    if old in source:
        source=source.replace(old,'app.min.js?v=5.12.9.816',1)
        path.write_text(source,encoding="utf-8")


if __name__ == "__main__":
    patch_app()
    patch_roster()
    patch_cache_key()