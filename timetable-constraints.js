
import {generateTimetablePlan} from "./timetable-solver.js?v=1";
export function createTimetableConstraintFeature({supabase,state,escapeHtml,toast,redraw,reload,scopeClasses,currentPeriod}){
 const C={blocks:[],locks:[],error:"",loaded:false,teacher:"",selectedDays:[],weekday:2,period:1,length:1,
 subject:"",selectedRooms:[],generatorRooms:[],preview:null,settingTab:"subjects",pending:false};
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
  const [a,b]=await Promise.all([
   supabase.from("timetable_teacher_unavailability").select("*").eq("academic_year",selectedYear()).eq("semester",selectedTerm()).order("weekday"),
   supabase.from("timetable_fixed_slots").select("*").order("weekday")
  ]);
  if(a.error||b.error)C.error=(a.error||b.error).message;
  C.blocks=a.data||[];const ids=new Set(currentClasses().map(c=>c.id));
  C.locks=(b.data||[]).filter(f=>ids.has(f.class_id));
  C.loaded=true;syncState();
 }
 const slotItems=()=>Array.from({length:12},(_,i)=>i+1);
 const roomCheckboxes=(selected,attr)=>currentClasses().map(c=>'<label class="tt-rule-room"><input type="checkbox" '+attr+'="'+e(c.id)+'" '+(selected.includes(c.id)?"checked":"")+'> '+e(classLabel(c))+'</label>').join("");
 function subjectView(){
  const cls=currentClasses(),rooms=C.selectedRooms;
  const valid=cls.filter(c=>rooms.includes(c.id));
  const missing=valid.filter(c=>assignmentOf(c.id,C.subject).length!==1);
  return '<div class="tt-rule-layout"><section class="panel"><h3>ล็อกคาบวิชา · หลายห้องพร้อมกัน</h3><p class="helper">เลือกวิชา วัน คาบเริ่มต้น และจำนวนคาบต่อเนื่อง ระบบจะใช้ครูที่มอบหมายไว้แล้วของแต่ละห้องและวางคาบให้ทันทีเมื่อบันทึก</p>'+
    '<div class="tt-rule-form"><label>รายวิชา'+select("tt-rule-subject",subjects().map(s=>opt(s.id,s.name,C.subject)))+'</label>'+
    '<label>วัน'+select("tt-rule-day",Object.keys(days).map(d=>opt(d,days[d],C.weekday)))+'</label>'+
    '<label>เริ่มคาบที่'+select("tt-rule-period",slotItems().map(n=>opt(n,"คาบที่ "+n,C.period)))+'</label>'+
    '<label>จำนวนคาบต่อเนื่อง'+select("tt-rule-length",[1,2,3,4,5,6].map(n=>opt(n,n+" คาบ",C.length)))+'</label></div>'+
    '<h4>ห้องเรียนที่ต้องการให้ล็อกคาบพร้อมกัน</h4>'+
    '<div class="tt-rule-rooms">'+roomCheckboxes(rooms,"data-tt-rule-class")+'</div>'+
    (missing.length?'<div class="tt-rule-warning">ห้องที่ยังไม่มีครูและวิชาที่ตรงกันเพียงรายการเดียว: '+e(missing.map(classLabel).join(", "))+' · กรุณากำหนดครูก่อน</div>':'')+
    '<button class="btn btn-primary" id="tt-rule-save" '+(!rooms.length||missing.length?"disabled":"")+'>ล็อกคาบและลงตารางพร้อมกัน '+rooms.length+' ห้อง</button></section>'+
    '<section class="panel"><h3>คาบวิชาที่ล็อกไว้</h3><p class="helper">ปลดล็อกได้โดยไม่ลบวิชาออกจากตาราง หากต้องย้ายคาบให้ปลดล็อกก่อน</p>'+
    (C.locks.length?'<div class="tt-rule-list">'+C.locks.map(l=>{
      const cl=cls.find(c=>c.id===l.class_id),a=state.timetableAssignments.find(a=>a.id===l.assignment_id);
      return '<div><div><strong>'+e(classLabel(cl))+' · '+e(subjName(a?.subject_id))+'</strong><small>'+e(days[l.weekday])+' คาบที่ '+e(l.period_no)+' · '+e(teacherName(a?.teacher_id))+'</small></div><button class="btn btn-ghost" data-tt-unlock="'+e(l.id)+'">ปลดล็อก</button></div>'
    }).join("")+'</div>':'<div class="empty">ยังไม่มีคาบที่ล็อก</div>')+'</section></div>';
 }
 function teacherView(){
  const t=teachers(),teacher=C.teacher;
  const teacherAssignments=state.timetableAssignments.filter(a=>a.teacher_id===teacher&&currentClasses().some(c=>c.id===a.class_id));
  const blocks=C.blocks.filter(b=>b.teacher_id===teacher);
  const selected=new Set(C.selectedDays);
  return '<div class="tt-rule-layout"><section class="panel"><h3>กำหนดคาบห้ามสอนของครูรายบุคคล</h3><p>เลือกครูแล้วติ๊กคาบที่ห้ามสอนประจำทุกสัปดาห์ของภาคเรียนนี้ เช่น วันจันทร์คาบ 1–2</p>'+
    '<div class="field"><label>ครูผู้สอน</label>'+select("tt-rule-teacher",t.map(x=>opt(x.id,x.name,teacher)))+'</div>'+
    '<p class="helper">ครูรายนี้มีวิชาที่รับผิดชอบ '+teacherAssignments.length+' รายการ · ช่องที่ล็อกไว้จะไม่ถูกจัดด้วยมือหรือจัดอัตโนมัติ</p>'+
    '<div class="tt-rule-table-scroll"><table class="tt-rule-grid"><thead><tr><th>วัน</th>'+slotItems().map(n=>'<th>'+n+'</th>').join("")+'</tr></thead><tbody>'+
    Object.entries(days).map(([day,name])=>'<tr><th>'+name+'</th>'+slotItems().map(p=>{
      const already=blocks.some(b=>b.weekday==day&&b.period_no===p),id=day+":"+p;
      return '<td><label class="'+(already?"already":"")+'"><input type="checkbox" data-tt-new-block="'+id+'" '+(already?"checked disabled":selected.has(id)?"checked":"")+'> <span>'+(already?"🔒":selected.has(id)?"●":"·")+'</span></label></td>'
    }).join("")+'</tr>').join("")+'</tbody></table></div><button class="btn btn-primary" id="tt-rule-block-save" '+(!teacher||!C.selectedDays.length?"disabled":"")+'>บันทึกคาบห้ามสอน ('+C.selectedDays.length+' คาบ)</button></section>'+
    '<section class="panel"><h3>ช่วงเวลาที่ห้ามสอนอยู่แล้ว</h3>'+
    (blocks.length?'<div class="tt-rule-list">'+blocks.map(b=>'<div><div><strong>'+e(days[b.weekday])+' คาบที่ '+e(b.period_no)+'</strong><small>'+e(teacherName(b.teacher_id))+'</small></div><button class="btn btn-ghost" data-tt-unblock="'+e(b.id)+'">ยกเลิก</button></div>').join("")+'</div>':'<p>ยังไม่ได้กำหนดช่วงเวลาห้ามสอน</p>')+'</section></div>';
 }
 function conditionsHtml(){
  syncView();
  return '<section class="panel tt-rule-intro"><div><h2>ตั้งค่าเงื่อนไขการจัดตารางสอน</h2><p>กำหนดล่วงหน้าได้ตามต้องการ หรือข้ามขั้นตอนนี้แล้วจัดตารางด้วยมือ/อัตโนมัติได้เลย</p></div><span class="pill neutral">ปี '+e(selectedYear())+' · ภาคเรียน '+e(selectedTerm())+'</span></section>'+
    (C.error?'<div class="tt-rule-warning">'+e(C.error)+'</div>':'')+
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
  toast("ล็อกคาบเรียบร้อย",data+" คาบ","success");C.selectedRooms=[];await refresh();
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
  document.querySelector("#tt-rule-subject")?.addEventListener("change",ev=>{C.subject=ev.target.value;redraw()});
  document.querySelector("#tt-rule-day")?.addEventListener("change",ev=>{C.weekday=Number(ev.target.value);redraw()});
  document.querySelector("#tt-rule-period")?.addEventListener("change",ev=>{C.period=Number(ev.target.value);redraw()});
  document.querySelector("#tt-rule-length")?.addEventListener("change",ev=>{C.length=Number(ev.target.value);redraw()});
  document.querySelectorAll("[data-tt-rule-class]").forEach(el=>el.addEventListener("change",()=>{C.selectedRooms=Array.from(document.querySelectorAll("[data-tt-rule-class]:checked")).map(x=>x.dataset.ttRuleClass);redraw()}));
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
