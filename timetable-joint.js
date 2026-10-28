// BNK SCHOOL OS — shared/co-teaching timetable editor.
// Uses the host's authenticated Supabase session and existing scheduling permissions.
export function openJointActivityModal(o) {
  const { entry, classes, profiles, periods, assignments, entries, teachers,
    activities, members, canManageClass, notify, refresh, supabase, esc, classLabel, teacherName } = o;
  const srcAssignment = assignments.find(a => a.id === entry?.assignment_id);
  const srcClass = classes.find(c => c.id === srcAssignment?.class_id);
  const srcProfile = profiles.find(p => p.id === entry?.timetable_id);
  const srcPeriod = periods.find(p => p.id === entry?.period_id);
  if (!srcAssignment || !srcClass || !srcProfile || !srcPeriod || !canManageClass(srcClass) || srcProfile.status !== 'draft') {
    notify('ไม่สามารถจัดคาบร่วมได้','ต้องเลือกคาบในตารางฉบับร่างที่คุณมีสิทธิ์แก้ไข','error');
    return;
  }
  const current = (activities || []).find(g => g.id === entry.joint_activity_id);
  const joined = entries.filter(e => e.joint_activity_id && e.joint_activity_id === current?.id);
  const joinedClassIds = new Set(joined.map(e => profiles.find(p => p.id === e.timetable_id)?.class_id).filter(Boolean));
  const alreadyExtra = new Set((members || []).filter(m => m.activity_id === current?.id).map(m => m.teacher_id));
  const sameTime = p => String(p.start_time).slice(0,5) === String(srcPeriod.start_time).slice(0,5)
    && String(p.end_time).slice(0,5) === String(srcPeriod.end_time).slice(0,5) && !p.is_break;
  const rooms = classes.filter(c => c.id !== srcClass.id
    && String(c.academic_year) === String(srcClass.academic_year)
    && Number(c.semester) === Number(srcClass.semester) && canManageClass(c))
    .map(c => {
      const tp = profiles.find(p => p.class_id === c.id && p.status === 'draft');
      const period = tp && periods.find(p => p.timetable_id === tp.id && sameTime(p));
      const occupied = period && entries.find(e => e.timetable_id === tp.id && Number(e.weekday) === Number(entry.weekday) && e.period_id === period.id);
      const options = period ? assignments.filter(a => a.class_id === c.id && a.is_active !== false
        && (!occupied || (occupied.assignment_id === a.id
          && (!occupied.joint_activity_id || occupied.joint_activity_id === current?.id)))) : [];
      return {c,tp,period,options,occupied};
    }).filter(x => x.options.length && !joinedClassIds.has(x.c.id));
  const helper = document.createElement('div');
  helper.className = 'modal-backdrop';
  const subjectLabel = o.subjectName(srcAssignment.subject_id) || 'กิจกรรมร่วม';
  const suggestedKind = /โฮมรูม|homeroom/i.test(subjectLabel) ? 'homeroom'
    : /ลูกเสือ|เนตรนารี|ยุวกาชาด|scout/i.test(subjectLabel) ? 'scouts'
    : /ชุมนุม|club/i.test(subjectLabel) ? 'club'
    : /กิจกรรมพัฒนา|แนะแนว|คุณธรรม/i.test(subjectLabel) ? 'development' : 'other';
  const kinds = [
    ['homeroom','โฮมรูม'],['scouts','ลูกเสือ–เนตรนารี'],['club','ชุมนุม'],
    ['development','กิจกรรมพัฒนาผู้เรียน'],['co_teaching','ครูสอนร่วมในห้องเดียว'],['other','กิจกรรมร่วมอื่น ๆ']
  ];
  const teacherOptions = (teachers || []).filter(t => t.id && t.id !== srcAssignment.teacher_id);
  helper.innerHTML = '<div class="modal" style="max-width:760px;width:min(94vw,760px);max-height:90vh;overflow-y:auto">'
    + '<div class="modal-head"><div><h3>จัดคาบเรียนร่วม / ครูสอนร่วม</h3>'
    + '<p>' + esc(classLabel(srcClass)) + ' · วัน' + esc(String(o.dayLabel(entry.weekday)))
    + ' · ' + esc(String(srcPeriod.start_time).slice(0,5)) + '–' + esc(String(srcPeriod.end_time).slice(0,5))
    + '</p></div><button type="button" class="modal-close">×</button></div>'
    + '<div class="form-grid">'
    + '<div class="field"><label>ชื่อกิจกรรมร่วม</label><input class="input" id="joint-title" maxlength="160" '
    + (current ? 'readonly ' : '') + 'value="' + esc(current?.title || subjectLabel) + '"></div>'
    + '<div class="field"><label>ประเภทกิจกรรม</label><select class="select" id="joint-kind" '
    + (current ? 'disabled' : '') + '>' + kinds.map(k => '<option value="' + k[0] + '"'
    + ((current?.kind || suggestedKind) === k[0] ? ' selected' : '') + '>' + k[1] + '</option>').join('') + '</select></div>'
    + (current ? '<div class="helper">กลุ่มกิจกรรมร่วมนี้มี ' + joinedClassIds.size + ' ห้องเชื่อมอยู่แล้ว สามารถเพิ่มห้องหรือครูร่วมได้</div>' : '')
    + '<details open><summary style="cursor:pointer;font-weight:700;margin-bottom:8px">เชื่อมห้องอื่นในคาบเดียวกัน (' + rooms.length + ' ห้องที่พร้อม)</summary>'
    + '<div style="max-height:230px;overflow:auto;display:grid;gap:8px;margin-top:10px">'
    + (rooms.length ? rooms.map(item => '<div class="field"><label>' + esc(classLabel(item.c)) + '</label>'
      + '<select class="select" data-joint-room="' + item.c.id + '">'
      + '<option value="">— ไม่เชื่อมห้องนี้ —</option>'
      + item.options.map(a => '<option value="' + a.id + '">' + esc(o.subjectName(a.subject_id) || 'รายวิชา')
        + ' · ' + esc(a.teacher_name || teacherName(a.teacher_id) || 'ครูผู้สอน') + '</option>').join('')
      + '</select></div>').join('') : '<p class="helper">ไม่มีห้องอื่นที่คาบเวลาตรงกันและยังแก้ไขได้</p>')
    + '</div></details>'
    + '<details><summary style="cursor:pointer;font-weight:700;margin-bottom:8px">เพิ่มครูผู้สอนร่วม (' + teacherOptions.length + ' คน)</summary>'
    + '<div style="max-height:210px;overflow:auto;display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:7px;margin-top:10px">'
    + teacherOptions.map(t => '<label style="display:flex;align-items:center;gap:7px;font-size:13px">'
      + '<input type="checkbox" data-joint-teacher="' + t.id + '" ' + (alreadyExtra.has(t.id) ? 'checked disabled' : '') + '>'
      + esc(t.full_name || t.email || 'ครูผู้สอน') + '</label>').join('')
    + '</div></details>'
    + '<div class="helper">อนุญาตให้เวลาเดียวกันเฉพาะรายการที่เชื่อมเป็นกิจกรรมเดียวกันเท่านั้น '
    + 'หากมีคาบอื่นชนอยู่ ระบบจะไม่บันทึก และจะคืนค่าทั้งหมดอัตโนมัติ</div></div>'
    + '<div class="modal-actions"><button type="button" class="btn btn-ghost modal-cancel">ยกเลิก</button>'
    + '<button type="button" class="btn btn-primary" id="save-joint-activity">บันทึกกิจกรรมร่วม</button></div></div>';
  document.body.appendChild(helper);
  const close = () => helper.remove();
  helper.querySelector('.modal-close').onclick = close;
  helper.querySelector('.modal-cancel').onclick = close;
  helper.addEventListener('click', e => { if (e.target === helper) close(); });
  helper.querySelector('#save-joint-activity').onclick = async e => {
    const title = String(helper.querySelector('#joint-title').value || '').trim();
    if (!title) { notify('กรุณากรอกชื่อกิจกรรมร่วม','','error'); return; }
    const assignmentIds = [...helper.querySelectorAll('[data-joint-room]')].map(x => x.value).filter(Boolean);
    const extraTeacherIds = [...helper.querySelectorAll('[data-joint-teacher]:checked:not(:disabled)')].map(x => x.dataset.jointTeacher);
    const btn = e.currentTarget; btn.disabled = true; btn.textContent = 'กำลังบันทึก…';
    try {
      const {error} = await supabase.rpc('create_timetable_joint_activity', {
        p_source_entry_id: entry.id,
        p_other_assignment_ids: assignmentIds,
        p_extra_teacher_ids: extraTeacherIds,
        p_title: title,
        p_kind: helper.querySelector('#joint-kind').value
      });
      if (error) { notify('บันทึกคาบร่วมไม่สำเร็จ',error.message,'error'); return; }
      close(); notify('บันทึกคาบเรียนร่วมแล้ว','ตรวจสอบคาบชนและสิทธิ์ทุกห้องเรียบร้อย','success');
      await refresh();
    } catch (error) {
      notify('บันทึกคาบร่วมไม่สำเร็จ',error?.message || 'เกิดข้อผิดพลาด','error');
    } finally {
      if (btn.isConnected) { btn.disabled = false; btn.textContent = 'บันทึกกิจกรรมร่วม'; }
    }
  };
}
