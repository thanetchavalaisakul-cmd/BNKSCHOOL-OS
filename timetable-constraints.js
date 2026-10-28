
import {generateTimetablePlan} from "./timetable-solver.js?v=1";
export function createTimetableConstraintFeature({supabase,state,escapeHtml,toast,redraw,reload,scopeClasses,currentPeriod}){
 const C={blocks:[],locks:[],demoTeachers:[],error:"",loaded:false,teacher:"",selectedDays:[],weekday:2,period:1,length:1,
 subject:"",stage:"",grade:"",selectedRooms:[],generatorRooms:[],preview:null,settingTab:"subjects",pending:false};
 const e=v=>escapeHtml(String(v??""));
 const days={1:"จันทร์",2:"อังคาร",3:"พุธ",4:"พฤหัสบดี",5:"ศุกร์",6:"เสาร์",7:"อาทิตย์"};
 const period=()=>currentPeriod();
 const availableClasses=()=>scopeClasses().filter(c=>c.stage_code!=="early_childhood");
 const selectedYear=()=>String(period().academicYear);
 const selectedTerm=()=>Number(period().semester);
 const currentClasses=()=>availableClasses().filter(c=>String(c.academic_year)===selectedYear()&&Number(c.semester)===selectedTerm());
 const classLabel=c=>c?c.level_name+(c.room_name?"/"+c.room_name:""):"ไม่พบห้อง";
 const subjName=id=>state.timetableSubjects.find(s=>s.id===id)?.subject_name||"รายวิชา";
 const teacherName=id=>state.timetableTeachers.find(t=>t.id===id)?.full_name||state.timetableAssignments.find(a=>a.teacher_id===id)?.teacher_name||"ครูผู้สอน";
 const assignmentOf=(classId,subjectId)=>state.timetableAssignments.filter(a=>a.class_id===classId&&a.subject_id===subjectId&&a.is_active!==false);
 const teachers=()=>[...new Set(state.timetableAssignments.filter(a=>currentClasses().some(c=>c.id===a.class_id)).map(a=>a.teacher_id).filter(Boolean))]
  .map(id=>({id,name:teacherName(id)})).sort((a,b)=>a.name.localeCompare(b.name,"th"));
 const subjects=()=>[...new Set(state.timetableAssignments.filter(a=>currentClasses().some(c=>c.id===a.class_id)).map(a=>a.subject_id).filter(Boolean))]
  .map(id=>({id,name:subjName(id)})).sort((a,b)=>a.name.localeCompare(b.name,"th"));
 const opt=(v,t,selected)=>'<option value="'+e(v)+'" '+(String(v)===String(selected)?"selected":"")+'>'+e(t)+'</option>';
 const select=(id,options)=>'<select class="select" id="'+id+'">'+options.join("")+'</select>';
 function syncState(){
  if(!teachers().some(t=>t.id===C.teacher))C.teacher=teachers()[0]?.id||"";
  if(!subjects().some(t=>t.id===C.subject))C.subject=subjects()[0]?.id||"";
  const classes=new Set(currentClasses().map(c=>c.id));
  C.selectedRooms=C.selectedRooms.filter(id=>classes.has(id));
  C.generatorRooms=C.generatorRooms.filter(id=>classes.has(id));
  if(!C.generatorRooms.length&&state.timetableSelectedClassId&&classes.has(state.timetableSelectedClassId))C.generatorRooms=[state.timetableSelectedClassId];
  C.preview=null;
 }
 async function load(){
  C.error="";
  const [a,b,demo]=await Promise.all([
   supabase.from("timetable_teacher_unavailability").select("*").eq("academic_year",selectedYear()).eq("semester",selectedTerm()).order("weekday"),
   supabase.from("timetable_fixed_slots").select("*").order("weekday"),
   supabase.from("timetable_demo_teachers").select("*").order("demo_number")
  ]);
  if(a.error||b.error)C.error=(a.error||b.error).message;
  C.blocks=a.data||[];C.demoTeachers=demo.error?[]:(demo.data||[]);const ids=new Set(currentClasses().map(c=>c.id));
  C.locks=(b.data||[]).filter(f=>ids.has(f.class_id));
  C.loaded=true;syncState();
 }
 const slotItems=()=>Array.from({length:12},(_,i)=>i+1);
 const roomCheckboxes=(selected,attr)=>currentClasses().map(c=>'<label class="tt-rule-room"><input type="checkbox" '+attr+'="'+e(c.id)+'" '+(selected.includes(c.id)?"checked":"")+'> '+e(classLabel(c))+'</label>').join("");

 const stages=()=>[...new Set(currentClasses().map(c=>c.stage_code))].sort();
 const levels=()=>[...new Set(currentClasses().filter(c=>!C.stage||c.stage_code===C.stage).map(c=>c.level_name))].sort((a,b)=>a.localeCompare(b,"th",{numeric:true}));
 const classChoices=()=>currentClasses().filter(c=>(!C.stage||c.stage_code===C.stage)&&(!C.grade||c.level_name===C.grade));
 const chosenClasses=()=>currentClasses().filter(c=>C.selectedRooms.includes(c.id));
 const subjectsForRooms=()=>{
   const chosen=chosenClasses();
   if(!chosen.length)return [];
   const assignments=state.timetableAssignments.filter(a=>chosen.some(c=>c.id===a.class_id)&&a.is_active!==false);
   const ids=[...new Set(assignments.map(a=>a.subject_id))];
   return ids.filter(id=>chosen.every(c=>assignmentOf(c.id,id).length===1))
    .map(id=>({id,name:subjName(id)})).sort((a,b)=>a.name.localeCompare(b.name,"th"));
 };
 const stageNames={stage1:"ช่วงชั้นที่ 1 (ป.1–ป.3)",stage2:"ช่วงชั้นที่ 2 (ป.4–ป.6)",stage3:"ช่วงชั้นที่ 3 (ม.1–ม.3)"};
 const periodRowsForClass=c=>{
   const profile=state.timetableProfiles.find(p=>p.class_id===c.id);
   return profile?(state.timetablePeriods||[]).filter(p=>p.timetable_id===profile.id).sort((a,b)=>Number(a.period_no)-Number(b.period_no)):[];
 };
 const schoolPeriodRows=()=>{
   const tp=(state.timetablePeriodTemplates||[]).find(x=>String(x.academic_year)===selectedYear()&&Number(x.semester)===selectedTerm());
   return tp?(state.timetablePeriodTemplateItems||[]).filter(x=>x.template_id===tp.id).sort((a,b)=>Number(a.period_no)-Number(b.period_no)):[];
 };
 const subjectPeriodRows=()=>{
   const rooms=chosenClasses();
   if(!rooms.length)return [];
   const rowSets=rooms.map(c=>periodRowsForClass(c));
   const reference=rowSets[0]||[];
   return reference.map(p=>({
     ...p,
     disabled:rowSets.some(rows=>!rows.some(q=>Number(q.period_no)===Number(p.period_no)&&!q.is_break)),
     disabledReason:p.is_break?"พักกลางวัน":"บางห้องเป็นคาบพักหรือไม่มีคาบนี้"
   }));
 };
 const durationChoices=()=>{
   const rows=subjectPeriodRows(),start=Number(C.period),valid=[];
   for(let n=1;n<=rows.length;n++){
     const r=rows.find(p=>Number(p.period_no)===start+n-1);
     if(!r||r.disabled||r.is_break)break;
     valid.push(n);
   }
   return valid;
 };
 const teacherPeriodRows=()=>{
   const assignments=state.timetableAssignments.filter(a=>a.teacher_id===C.teacher&&a.is_active!==false&&currentClasses().some(c=>c.id===a.class_id));
   const rows=assignments.map(a=>currentClasses().find(c=>c.id===a.class_id)).filter(Boolean).map(periodRowsForClass).filter(x=>x.length);
   const master=schoolPeriodRows();
   const union=new Map();
   (rows.length?rows.flat():master).forEach(p=>{
     const n=Number(p.period_no);
     if(n>0&&Number.isFinite(n))union.set(n,union.get(n)||p);
   });
   const result=[...union].sort((a,b)=>a[0]-b[0]).map(([n,p])=>({
      ...p,period_no:n,
      is_break:rows.length?rows.every(group=>!group.some(q=>Number(q.period_no)===n&&!q.is_break)):Boolean(p.is_break)
   }));
   return result;
 };
 const teacherWeekdays=()=>{
   const ids=new Set(state.timetableAssignments.filter(a=>a.teacher_id===C.teacher&&a.is_active!==false).map(a=>a.class_id));
   const weekdays=new Set();
   for(const c of currentClasses().filter(c=>ids.has(c.id))){
     const p=state.timetableProfiles.find(x=>x.class_id===c.id);
     (p?.weekdays||[]).forEach(d=>weekdays.add(Number(d)));
   }
   if(!weekdays.size){
     const t=(state.timetablePeriodTemplates||[]).find(x=>String(x.academic_year)===selectedYear()&&Number(x.semester)===selectedTerm());
     (t?.weekdays||[1,2,3,4,5]).forEach(d=>weekdays.add(Number(d)));
   }
   return [...weekdays].sort();
 };
 function normalizeSubjectSelection(){
   const ids=new Set(classChoices().map(c=>c.id));
   C.selectedRooms=C.selectedRooms.filter(id=>ids.has(id));
   const subjects=subjectsForRooms();
   if(!subjects.some(x=>x.id===C.subject))C.subject=subjects[0]?.id||"";
   const periods=subjectPeriodRows();
   if(!periods.some(p=>Number(p.period_no)===Number(C.period)&&!p.disabled&&!p.is_break))
     C.period=Number(periods.find(p=>!p.disabled&&!p.is_break)?.period_no||0);
   const durations=durationChoices();
   if(!durations.includes(Number(C.length)))C.length=durations[0]||1;
 }

 function subjectView(){
   normalizeSubjectSelection();
   const cls=classChoices(),rooms=C.selectedRooms,valid=chosenClasses();
   const subjects=subjectsForRooms(),periods=subjectPeriodRows(),durations=durationChoices();
   const missing=valid.filter(c=>assignmentOf(c.id,C.subject).length!==1);
   const disabled=!valid.length||!C.subject||missing.length||!C.period||!durations.includes(Number(C.length));
   return '<div class="tt-rule-layout"><section class="panel"><h3>ล็อกคาบวิชา · เลือกช่วงชั้นและห้องก่อน</h3>'+
     '<p class="helper">เลือกช่วงชั้น → ระดับชั้น → ห้องเรียน → วิชา ระบบจะแสดงเฉพาะวิชาที่กำหนดครูไว้ครบในห้องที่เลือก สามารถกลับมาเลือกวิชาอื่นเพื่อล็อกเพิ่มเติมได้</p>'+
     '<div class="tt-rule-form"><label>1. ช่วงชั้น'+select("tt-rule-stage",[
       opt("","— เลือกช่วงชั้น —",C.stage),...stages().map(code=>opt(code,stageNames[code]||code,C.stage))])+'</label>'+
       '<label>2. ระดับชั้น'+select("tt-rule-grade",[
         opt("","ทุกระดับชั้นในช่วงชั้น",C.grade),...levels().map(g=>opt(g,g,C.grade))])+'</label></div>'+
     '<h4>3. เลือกห้องเรียน (เลือกได้หลายห้อง)</h4>'+
     (!C.stage?'<div class="tt-rule-warning">กรุณาเลือกช่วงชั้นก่อน</div>':
       '<div class="tt-rule-rooms">'+cls.map(c=>'<label class="tt-rule-room"><input type="checkbox" data-tt-rule-class="'+e(c.id)+'" '+(rooms.includes(c.id)?"checked":"")+'> '+e(classLabel(c))+'</label>').join("")+'</div>'+
       '<button type="button" class="btn btn-ghost" id="tt-rule-all-rooms">เลือกทุกห้องที่แสดง</button>')+
     '<div class="tt-rule-form">'+
       '<label>4. รายวิชา'+select("tt-rule-subject",[
         opt("","— เลือกรายวิชา —",C.subject),...subjects.map(s=>opt(s.id,s.name,C.subject))])+'</label>'+
       '<label>วัน'+select("tt-rule-day",Object.keys(days).map(d=>opt(d,days[d],C.weekday)))+'</label>'+
       '<label>คาบเริ่มต้น<select class="select" id="tt-rule-period">'+
         periods.map(p=>'<option value="'+Number(p.period_no)+'" '+(Number(C.period)===Number(p.period_no)?"selected":"")+
           (p.disabled||p.is_break?' disabled':'')+'>คาบที่ '+Number(p.period_no)+
           (p.is_break?" (พักกลางวัน)":p.disabled?" (ใช้ไม่ได้ทุกห้อง)":"")+'</option>').join("")+
         '</select></label>'+
       '<label>จำนวนคาบต่อเนื่อง'+select("tt-rule-length",
         durations.map(n=>opt(n,n+" คาบ",C.length)))+'</label></div>'+
     (!subjects.length&&valid.length?'<div class="tt-rule-warning">ยังไม่มีรายวิชาที่มีครูมอบหมายครบทุกห้องที่เลือก กรุณาเลือกห้องที่มีรายวิชาตรงกันหรือกำหนดวิชา/ครูเพิ่มก่อน</div>':'')+
     (periods.length?'<p class="helper">อ้างอิงคาบจริงของ '+valid.length+' ห้อง · คาบพักและคาบที่ไม่ตรงกันจะเลือกไม่ได้ · ไม่ให้จำนวนคาบต่อเนื่องข้ามคาบพัก</p>':'')+
     (missing.length?'<div class="tt-rule-warning">ห้องที่ยังไม่ได้กำหนดวิชาและครู: '+e(missing.map(classLabel).join(", "))+'</div>':'')+
     '<button class="btn btn-primary" id="tt-rule-save" '+(disabled?"disabled":"")+'>ล็อกคาบและลงตาราง '+valid.length+' ห้อง</button></section>'+
     '<section class="panel"><h3>คาบวิชาที่ล็อกไว้</h3><p class="helper">ปลดล็อกได้โดยไม่ลบวิชาที่วางไว้ หากต้องการเปลี่ยนคาบให้ปลดล็อกก่อน</p>'+
     (C.locks.length?'<div class="tt-rule-list">'+C.locks.map(l=>{
       const cl=currentClasses().find(c=>c.id===l.class_id),a=state.timetableAssignments.find(a=>a.id===l.assignment_id);
       return '<div><div><strong>'+e(classLabel(cl))+' · '+e(subjName(a?.subject_id))+'</strong><small>'+e(days[l.weekday])+' คาบที่ '+e(l.period_no)+' · '+e(teacherName(a?.teacher_id))+'</small></div><button class="btn btn-ghost" data-tt-unlock="'+e(l.id)+'">ปลดล็อก</button></div>'
     }).join("")+'</div>':'<div class="empty">ยังไม่มีคาบที่ล็อก</div>')+'</section></div>';
 }
 function teacherView(){
   const t=teachers(),teacher=C.teacher;
   const teacherAssignments=state.timetableAssignments.filter(a=>a.teacher_id===teacher&&currentClasses().some(c=>c.id===a.class_id));
   const blocks=C.blocks.filter(b=>b.teacher_id===teacher),periods=teacherPeriodRows();
   const activeDays=teacherWeekdays(),selected=new Set(C.selectedDays);
   const allowed=new Set(periods.filter(p=>!p.is_break).map(p=>Number(p.period_no)));
   C.selectedDays=C.selectedDays.filter(x=>allowed.has(Number(x.split(":")[1]))&&activeDays.includes(Number(x.split(":")[0])));
   return '<div class="tt-rule-layout"><section class="panel"><h3>กำหนดคาบห้ามสอนของครูรายบุคคล</h3>'+
     '<p>เลือกครูแล้วติ๊กคาบที่ห้ามสอนประจำทุกสัปดาห์ของภาคเรียนนี้ เช่น วันจันทร์คาบ 1–2 โดยคาบเรียนจะดึงตามการตั้งค่าของห้องที่ครูรับผิดชอบ</p>'+
     '<div class="field"><label>ครูผู้สอน</label>'+select("tt-rule-teacher",t.map(x=>opt(x.id,x.name,teacher)))+'</div>'+
     '<p class="helper">ครูรายนี้มีวิชาที่รับผิดชอบ '+teacherAssignments.length+' รายการ · มี '+periods.length+' คาบตามการตั้งค่า · คาบพักเลือกไม่ได้</p>'+
     (periods.length?'<div class="tt-rule-table-scroll"><table class="tt-rule-grid"><thead><tr><th>วัน</th>'+periods.map(p=>'<th>'+Number(p.period_no)+(p.is_break?'<small class="tt-rule-break-label">พัก</small>':'')+'</th>').join("")+'</tr></thead><tbody>'+
     activeDays.map(day=>'<tr><th>'+e(days[day])+'</th>'+periods.map(p=>{
       const n=Number(p.period_no),already=blocks.some(b=>Number(b.weekday)===day&&Number(b.period_no)===n),id=day+":"+n;
       const unavailable=p.is_break;
       return '<td><label class="'+(already?"already":unavailable?"break":"")+'"><input type="checkbox" data-tt-new-block="'+id+'" '+
         (already?"checked disabled":unavailable?"disabled":selected.has(id)?"checked":"")+
         '> <span>'+(unavailable?"พัก":already?"🔒":selected.has(id)?"●":"·")+'</span></label></td>'
     }).join("")+'</tr>').join("")+'</tbody></table></div>':
     '<div class="tt-rule-warning">ยังไม่ได้ตั้งคาบเรียนสำหรับห้องที่ครูสอน</div>')+
     '<button class="btn btn-primary" id="tt-rule-block-save" '+(!teacher||!C.selectedDays.length?"disabled":"")+'>บันทึกคาบห้ามสอน ('+C.selectedDays.length+' คาบ)</button></section>'+
     '<section class="panel"><h3>ช่วงเวลาที่ห้ามสอนอยู่แล้ว</h3>'+
     (blocks.length?'<div class="tt-rule-list">'+blocks.map(b=>'<div><div><strong>'+e(days[b.weekday])+' คาบที่ '+e(b.period_no)+'</strong><small>'+e(teacherName(b.teacher_id))+'</small></div><button class="btn btn-ghost" data-tt-unblock="'+e(b.id)+'">ยกเลิก</button></div>').join("")+'</div>':'<p>ยังไม่ได้กำหนดช่วงเวลาห้ามสอน</p>')+'</section></div>';
 }
 function demoTeachersHtml(){
  const classes=currentClasses();
  const rows=C.demoTeachers.filter(t=>classes.some(c=>c.id===t.class_id));
  if(!rows.length)return "";
  return '<section class="panel tt-demo-teacher-panel"><h3>ครูตัวอย่างสำหรับทดลองจัดตาราง</h3>'+
    '<p class="helper">รายชื่อจำลองของห้องทดลอง ป.3/3 เท่านั้น ยังไม่ใช่บัญชีครูที่ล็อกอินได้ และยังไม่สามารถมอบหมายสอนในตารางจริงจนกว่าจะผูกกับบัญชีบุคลากร</p>'+
    '<div class="tt-demo-teacher-list">'+rows.map(t=>'<div><strong>'+e(t.display_name)+'</strong><span class="pill neutral">'+e(classLabel(classes.find(c=>c.id===t.class_id)))+'</span></div>').join("")+'</div></section>';
 }
 function conditionsHtml(){
  syncView();
  return '<section class="panel tt-rule-intro"><div><h2>ตั้งค่าเงื่อนไขการจัดตารางสอน</h2><p>กำหนดล่วงหน้าได้ตามต้องการ หรือข้ามขั้นตอนนี้แล้วจัดตารางด้วยมือ/อัตโนมัติได้เลย</p></div><span class="pill neutral">ปี '+e(selectedYear())+' · ภาคเรียน '+e(selectedTerm())+'</span></section>'+
    (C.error?'<div class="tt-rule-warning">'+e(C.error)+'</div>':'')+
    demoTeachersHtml()+
    '<div class="tt-rule-pills"><button class="'+(C.settingTab==="subjects"?"active":"")+'" data-tt-rule-tab="subjects">ล็อกคาบวิชา</button><button class="'+(C.settingTab==="teacher"?"active":"")+'" data-tt-rule-tab="teacher">ห้ามสอนรายบุคคล</button></div>'+
    (C.settingTab==="subjects"?subjectView():teacherView());
 }
 function syncView(){
  const valid=new Set(currentClasses().map(c=>c.id));
  C.selectedRooms=C.selectedRooms.filter(x=>valid.has(x));C.generatorRooms=C.generatorRooms.filter(x=>valid.has(x));
 }
 const first30=arr=>arr.slice(0,100);
 function generatedHtml(){
  const classes=currentClasses();
  const preview=C.preview,rows=preview?.suggestions||[];
  return '<section class="panel tt-rule-intro"><div><h2>จัดตารางสอนอัตโนมัติ</h2><p>ใช้วิชา ครู และชั่วโมงสอนที่กำหนดไว้แล้ว เคารพคาบที่ล็อกและเวลาห้ามสอน ไม่แก้ไขตารางจริงจนกว่าจะยืนยัน</p></div><span class="pill neutral">ฉบับร่างเท่านั้น</span></section>'+
  '<section class="panel"><h3>เลือกห้องที่จะให้ระบบช่วยจัดคาบที่เหลือ</h3><div class="tt-rule-rooms">'+roomCheckboxes(C.generatorRooms,"data-tt-generate-class")+'</div>'+
  '<div class="tt-rule-buttons"><button class="btn btn-secondary" id="tt-generate-preview" '+(!C.generatorRooms.length?"disabled":"")+'>สร้างตัวอย่างตารางอัตโนมัติ</button>'+
  (preview&&preview.complete&&rows.length?'<button class="btn btn-primary" id="tt-generate-apply">ยืนยันบันทึกลงตารางจริง ('+rows.length+' คาบ)</button>':'')+'</div></section>'+
  (preview?'<section class="panel"><h3>ผลการคำนวณฉบับร่าง</h3><div class="tt-rule-stats"><strong>ห้องที่เลือก '+preview.classesAttempted+'</strong><strong>คาบที่ระบบจัดได้ '+rows.length+'</strong><strong>ปัญหาที่พบ '+preview.errors.length+'</strong></div>'+
  (preview.errors.length?'<div class="tt-rule-warning"><strong>ยังไม่สามารถจัดครบตามเงื่อนไข จึงไม่เปิดให้บันทึก</strong><ul>'+first30(preview.errors).map(x=>'<li>'+e(x)+'</li>').join("")+'</ul></div>':!rows.length?'<p>ชั่วโมงสอนถูกจัดครบอยู่แล้ว ไม่มีคาบที่ต้องเพิ่ม</p>':'<p class="helper">ตรวจรายการก่อนกดยืนยัน การบันทึกเป็นธุรกรรมเดียว หากคาบใดชนระบบจะยกเลิกการบันทึกทั้งหมด</p>')+
  (rows.length?'<div class="table-wrap"><table class="table"><thead><tr><th>ห้องเรียน</th><th>วัน</th><th>คาบ</th><th>วิชา</th><th>ครูผู้สอน</th></tr></thead><tbody>'+first30(rows).map(x=>{
   const a=state.timetableAssignments.find(v=>v.id===x.assignment_id),c=classes.find(v=>v.id===x.class_id);
   return '<tr><td>'+e(classLabel(c))+'</td><td>'+e(days[x.weekday])+'</td><td>'+e(x.period_no)+'</td><td>'+e(subjName(a?.subject_id))+'</td><td>'+e(teacherName(a?.teacher_id))+'</td></tr>';
  }).join("")+'</tbody></table></div>':'')+(rows.length>100?'<p>แสดง 100 คาบแรกจาก '+rows.length+' คาบ</p>':'')+'</section>':'');
 }
 async function refresh(){await reload()}
 async function saveLocked(){
  const cls=currentClasses().filter(c=>C.selectedRooms.includes(c.id));
  if(!cls.length)return toast("กรุณาเลือกห้องเรียน","","error");
  const missing=cls.filter(c=>assignmentOf(c.id,C.subject).length!==1);
  if(missing.length)return toast("บางห้องยังไม่ได้กำหนดวิชาและครู",missing.map(classLabel).join(", "),"error");
  const items=cls.map(c=>({class_id:c.id,assignment_id:assignmentOf(c.id,C.subject)[0].id,weekday:Number(C.weekday),start_period:Number(C.period),length:Number(C.length)}));
  if(!confirm("ยืนยันล็อกวิชา "+subjName(C.subject)+" "+cls.length+" ห้อง วัน"+days[C.weekday]+" คาบที่ "+C.period+" จำนวน "+C.length+" คาบ?"))return;
  C.pending=true;const {data,error}=await supabase.rpc("timetable_lock_subject_batch",{p_items:items});C.pending=false;
  if(error)return toast("ล็อกคาบไม่สำเร็จ",error.message,"error");
  toast("ล็อกคาบเรียบร้อย",data+" คาบ","success");await refresh();
 }
 async function saveBlocked(){
  if(!C.teacher||!C.selectedDays.length)return;
  const items=C.selectedDays.map(s=>{const [day,periodNo]=s.split(":").map(Number);return {academic_year:selectedYear(),semester:selectedTerm(),teacher_id:C.teacher,weekday:day,period_no:periodNo,created_by:state.user.id}});
  if(!confirm("บันทึกคาบห้ามสอน "+teacherName(C.teacher)+" จำนวน "+items.length+" คาบต่อสัปดาห์?"))return;
  const {error}=await supabase.from("timetable_teacher_unavailability").insert(items);
  if(error)return toast("ล็อกคาบครูไม่สำเร็จ",error.message,"error");
  toast("กำหนดคาบห้ามสอนแล้ว","","success");C.selectedDays=[];await refresh();
 }
 function generate(){
  const selected=C.generatorRooms.slice();
  const all=generateTimetablePlan({
   classes:state.timetableClasses,profiles:state.timetableProfiles,periods:state.timetablePeriods,
   assignments:state.timetableAssignments,entries:state.timetableEntries,blocks:C.blocks,fixed:C.locks,jointTeachers:state.timetableJointTeachers||[],
   selectedClassIds:selected,scopeClassIds:currentClasses().map(c=>c.id)
  });
  C.preview=all;redraw();
 }
 async function apply(){
  const p=C.preview;if(!p?.complete||!p.suggestions.length)return;
  if(!confirm("ยืนยันเพิ่ม "+p.suggestions.length+" คาบลงตารางฉบับร่าง? ระบบจะตรวจคาบชนอีกครั้งและไม่เผยแพร่โดยอัตโนมัติ"))return;
  C.pending=true;const {data,error}=await supabase.rpc("timetable_apply_generated",{p_placements:p.suggestions});C.pending=false;
  if(error){C.preview=null;toast("บันทึกตารางอัตโนมัติไม่สำเร็จ",error.message,"error");return await refresh()}
  C.preview=null;toast("บันทึกตารางฉบับร่างแล้ว",data+" คาบ · ยังไม่ได้เผยแพร่","success");await refresh();
 }
 function bind(){
  document.querySelectorAll("[data-tt-rule-tab]").forEach(b=>b.addEventListener("click",()=>{C.settingTab=b.dataset.ttRuleTab;redraw()}));

  document.querySelector("#tt-rule-stage")?.addEventListener("change",ev=>{
    C.stage=ev.target.value;C.grade="";C.selectedRooms=[];C.subject="";redraw();
  });
  document.querySelector("#tt-rule-grade")?.addEventListener("change",ev=>{
    C.grade=ev.target.value;C.selectedRooms=[];C.subject="";redraw();
  });
  document.querySelector("#tt-rule-all-rooms")?.addEventListener("click",()=>{
    C.selectedRooms=classChoices().map(c=>c.id);C.subject="";redraw();
  });
  document.querySelector("#tt-rule-subject")?.addEventListener("change",ev=>{C.subject=ev.target.value;redraw()});
  document.querySelector("#tt-rule-day")?.addEventListener("change",ev=>{C.weekday=Number(ev.target.value);redraw()});
  document.querySelector("#tt-rule-period")?.addEventListener("change",ev=>{C.period=Number(ev.target.value);redraw()});
  document.querySelector("#tt-rule-length")?.addEventListener("change",ev=>{C.length=Number(ev.target.value);redraw()});
  document.querySelectorAll("[data-tt-rule-class]").forEach(el=>el.addEventListener("change",()=>{C.selectedRooms=Array.from(document.querySelectorAll("[data-tt-rule-class]:checked")).map(x=>x.dataset.ttRuleClass);C.subject="";redraw()}));
  document.querySelector("#tt-rule-save")?.addEventListener("click",saveLocked);
  document.querySelector("#tt-rule-teacher")?.addEventListener("change",ev=>{C.teacher=ev.target.value;C.selectedDays=[];redraw()});
  document.querySelectorAll("[data-tt-new-block]").forEach(el=>el.addEventListener("change",()=>{C.selectedDays=Array.from(document.querySelectorAll("[data-tt-new-block]:checked:not(:disabled)")).map(x=>x.dataset.ttNewBlock);redraw()}));
  document.querySelector("#tt-rule-block-save")?.addEventListener("click",saveBlocked);
  document.querySelectorAll("[data-tt-unblock]").forEach(b=>b.addEventListener("click",async()=>{
   if(!confirm("ยืนยันยกเลิกเวลาห้ามสอนของครูคนนี้?"))return;
   const {error}=await supabase.from("timetable_teacher_unavailability").delete().eq("id",b.dataset.ttUnblock);
   if(error)return toast("ยกเลิกไม่สำเร็จ",error.message,"error");await refresh();
  }));
  document.querySelectorAll("[data-tt-unlock]").forEach(b=>b.addEventListener("click",async()=>{
   if(!confirm("ปลดล็อกคาบนี้? วิชาที่วางไว้จะยังอยู่ในตาราง"))return;
   const {error}=await supabase.rpc("timetable_unlock_subject",{p_lock_id:b.dataset.ttUnlock});
   if(error)return toast("ปลดล็อกไม่สำเร็จ",error.message,"error");await refresh();
  }));
  document.querySelectorAll("[data-tt-generate-class]").forEach(el=>el.addEventListener("change",()=>{
   C.generatorRooms=Array.from(document.querySelectorAll("[data-tt-generate-class]:checked")).map(x=>x.dataset.ttGenerateClass);C.preview=null;redraw();
  }));
  document.querySelector("#tt-generate-preview")?.addEventListener("click",generate);
  document.querySelector("#tt-generate-apply")?.addEventListener("click",apply);
 }
 return {load,conditionsHtml,generatedHtml,bind,C};
}
