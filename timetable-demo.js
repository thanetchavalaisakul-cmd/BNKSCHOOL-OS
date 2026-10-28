
import {generateTimetablePlan} from "./timetable-solver.js?v=1";

export function createDemoTimetableFeature({supabase,state,escapeHtml,toast,redraw,scopeClasses,currentPeriod}){
 const D={assignments:[],unavailable:[],entries:[],teachers:[],loaded:false,error:"",
 classId:"",teacherId:"",subjectId:"",hours:1,blockTeacher:"",manualAssignment:"",manualDay:1,manualPeriod:1,manualLocked:false,
 chosenBlocks:[],preview:null,busy:false};
 const esc=v=>escapeHtml(String(v??""));
 const days={1:"จันทร์",2:"อังคาร",3:"พุธ",4:"พฤหัสบดี",5:"ศุกร์",6:"เสาร์",7:"อาทิตย์"};
 const cls=()=>scopeClasses().find(c=>c.id===D.classId);
 const classes=()=>scopeClasses().filter(c=>D.teachers.some(t=>t.class_id===c.id)
 && String(c.academic_year)===String(currentPeriod().academicYear)
 && Number(c.semester)===Number(currentPeriod().semester));
 const assignedTeacher=id=>D.teachers.find(t=>t.id===id);
 const subjectName=id=>state.timetableSubjects.find(s=>s.id===id)?.subject_name||"ไม่พบรายวิชา";
 const assignmentName=id=>{
  const a=D.assignments.find(x=>x.id===id);return a?subjectName(a.subject_id)+" · "+(assignedTeacher(a.teacher_id)?.display_name||"ครูทดลอง"):"ไม่พบวิชา";
 };
 const opts=(value,label,chosen,disabled=false)=>'<option value="'+esc(value)+'" '+(value==chosen?"selected":"")+(disabled?" disabled":"")+'>'+esc(label)+'</option>';
 const select=(id,options)=>'<select class="select" id="'+id+'">'+options.join("")+'</select>';
 const prof=()=>state.timetableProfiles.find(p=>p.class_id===D.classId);
 const periods=()=>state.timetablePeriods.filter(p=>p.timetable_id===prof()?.id).sort((a,b)=>a.period_no-b.period_no);
 const teachingPeriods=()=>periods().filter(p=>!p.is_break);
 const weekdays=()=>prof()?.weekdays||[1,2,3,4,5];
 const offered=()=>state.timetableSubjectOfferings.filter(o=>o.class_id===D.classId&&o.is_active!==false)
  .map(o=>({id:o.subject_id,name:o.subject_name_override||subjectName(o.subject_id)}))
  .sort((a,b)=>a.name.localeCompare(b.name,"th"));
 const assignments=()=>D.assignments.filter(a=>a.class_id===D.classId);
 const entries=()=>D.entries.filter(e=>e.class_id===D.classId);
 const blocks=()=>D.unavailable.filter(u=>u.class_id===D.classId);
 const periodLabel=p=>"คาบ "+p.period_no+(p.is_break?" (พักกลางวัน)":"");
 const classLabel=c=>c?c.level_name+"/"+c.room_name:"ห้องทดลอง";
 function resetChoices(){
  if(!classes().some(c=>c.id===D.classId))D.classId=classes()[0]?.id||"";
  const ts=D.teachers.filter(t=>t.class_id===D.classId);
  if(!ts.some(t=>t.id===D.teacherId))D.teacherId=ts[0]?.id||"";
  if(!ts.some(t=>t.id===D.blockTeacher))D.blockTeacher=ts[0]?.id||"";
  const available=offered();
  if(!available.some(s=>s.id===D.subjectId))D.subjectId=available[0]?.id||"";
  if(!assignments().some(a=>a.id===D.manualAssignment))D.manualAssignment=assignments()[0]?.id||"";
  if(!teachingPeriods().some(p=>p.period_no===Number(D.manualPeriod)))D.manualPeriod=teachingPeriods()[0]?.period_no||0;
  if(!weekdays().includes(Number(D.manualDay)))D.manualDay=weekdays()[0]||1;
  D.preview=null;
 }
 async function load(){
  D.error="";
  const [t,a,u,e]=await Promise.all([
   supabase.from("timetable_demo_teachers").select("*").order("demo_number"),
   supabase.from("timetable_demo_assignments").select("*").order("created_at"),
   supabase.from("timetable_demo_unavailability").select("*").order("weekday"),
   supabase.from("timetable_demo_entries").select("*").order("weekday")
  ]);
  const errs=[t,a,u,e].filter(x=>x.error).map(x=>x.error.message);
  D.error=errs.join("; ");
  D.teachers=t.data||[];D.assignments=a.data||[];D.unavailable=u.data||[];D.entries=e.data||[];
  D.loaded=true;
  resetChoices();
 }
 const viewRows=()=>weekdays().map(d=>({day:d,slots:periods().map(p=>({period:p,entry:entries().find(e=>e.weekday===d&&e.period_no===p.period_no)}))}));
 function teacherSummary(){
  const list=D.teachers.filter(t=>t.class_id===D.classId);
  return '<div class="tt-demo-summary">'+list.map(t=>{
   const ass=assignments().filter(a=>a.teacher_id===t.id);
   return '<div><strong>'+esc(t.display_name)+'</strong><span>'+ass.length+' วิชา · '+ass.reduce((sum,a)=>sum+Number(a.periods_per_week),0)+' คาบ/สัปดาห์</span></div>';
  }).join("")+'</div>';
 }
 function assignmentForm(){
  const list=assignments(),subjects=offered(),teachers=D.teachers.filter(t=>t.class_id===D.classId);
  return '<section class="panel tt-demo-section"><h3>1. มอบหมายวิชาให้ครูตัวอย่าง</h3>'+
   '<p class="helper">เลือกครู เลือกรายวิชาของห้อง ป.3/3 และกำหนดจำนวนคาบต่อสัปดาห์ได้เอง เพิ่มได้หลายรายวิชา และแก้จำนวนคาบภายหลังได้</p>'+
   '<div class="tt-rule-form"><label>ครูผู้สอน'+select("tt-demo-ass-teacher",teachers.map(t=>opts(t.id,t.display_name,D.teacherId)))+'</label>'+
   '<label>รายวิชา'+select("tt-demo-ass-subject",subjects.map(s=>opts(s.id,s.name,D.subjectId)))+'</label>'+
   '<label>จำนวนคาบต่อสัปดาห์<input class="input" type="number" min="1" max="40" id="tt-demo-hours" value="'+esc(D.hours)+'"></label></div>'+
   '<div class="tt-rule-buttons"><button class="btn btn-primary" id="tt-demo-ass-save" '+(D.busy||!D.teacherId||!D.subjectId?"disabled":"")+'>บันทึกการมอบหมายวิชา</button></div>'+
   '<div class="tt-demo-assignment-list">'+
   (list.length?list.map(a=>{
    const placed=entries().filter(e=>e.assignment_id===a.id).length;
    return '<div><div><strong>'+esc(subjectName(a.subject_id))+'</strong><small>'+esc(assignedTeacher(a.teacher_id)?.display_name)+' · กำหนด '+a.periods_per_week+' คาบ/สัปดาห์ · จัดแล้ว '+placed+'</small></div>'+
      '<div class="tt-demo-item-actions"><button class="btn btn-ghost" data-tt-demo-edit="'+esc(a.id)+'">แก้ไข</button><button class="btn btn-ghost" data-tt-demo-delete-ass="'+esc(a.id)+'">ลบ</button></div></div>';
   }).join(""):'<p class="helper">ยังไม่ได้มอบหมายวิชา เลือกครูและวิชาแล้วกดบันทึกเพื่อเริ่มจัดตาราง</p>')+'</div></section>';
 }
 function unavailabilityForm(){
  const teachers=D.teachers.filter(t=>t.class_id===D.classId),selected=new Set(D.chosenBlocks);
  return '<section class="panel tt-demo-section"><h3>2. กำหนดเวลาห้ามสอนรายบุคคล</h3>'+
    '<div class="field"><label>เลือกครูตัวอย่าง</label>'+select("tt-demo-block-teacher",teachers.map(t=>opts(t.id,t.display_name,D.blockTeacher)))+'</div>'+
    '<p class="helper">เลือกคาบที่ไม่สามารถสอนได้ประจำทุกสัปดาห์ คาบพักกลางวันจะเลือกไม่ได้</p>'+
    '<div class="tt-rule-table-scroll"><table class="tt-rule-grid"><thead><tr><th>วัน</th>'+periods().map(p=>'<th>'+p.period_no+(p.is_break?'<small class="tt-rule-break-label">พัก</small>':'')+'</th>').join("")+'</tr></thead><tbody>'+
    weekdays().map(d=>'<tr><th>'+esc(days[d])+'</th>'+periods().map(p=>{
     const b=blocks().find(b=>b.teacher_id===D.blockTeacher&&b.weekday===d&&b.period_no===p.period_no),k=d+":"+p.period_no;
     return '<td><label class="'+(p.is_break?"break":b?"already":"")+'"><input type="checkbox" data-tt-demo-block="'+k+'" '+
       (p.is_break||b?'disabled ':'')+(b||selected.has(k)?'checked':'')+'><span>'+(p.is_break?'พัก':b?'🔒':'·')+'</span></label></td>';
    }).join("")+'</tr>').join("")+'</tbody></table></div>'+
    '<button class="btn btn-primary" id="tt-demo-block-save" '+(!D.chosenBlocks.length||D.busy?"disabled":"")+'>บันทึกคาบห้ามสอน ('+D.chosenBlocks.length+')</button>'+
    '<div class="tt-demo-assignment-list">'+blocks().filter(b=>b.teacher_id===D.blockTeacher).map(b=>'<div><div><strong>'+esc(days[b.weekday])+' · คาบ '+b.period_no+'</strong></div><button class="btn btn-ghost" data-tt-demo-unblock="'+esc(b.id)+'">ยกเลิก</button></div>').join("")+'</div>'+
    '</section>';
 }
 function timetableGrid(){
  if(!prof()||!periods().length)return '<section class="panel">ยังไม่มีคาบเรียนสำหรับห้องนี้</section>';
  const cells=periods().map(p=>'<th>'+esc(periodLabel(p))+'</th>').join("");
  const body=viewRows().map(row=>'<tr><th>'+esc(days[row.day])+'</th>'+
   row.slots.map(x=>{
    const p=x.period,entry=x.entry,a=assignments().find(a=>a.id===entry?.assignment_id);
    const blockedTeacher=entry?assignedTeacher(a?.teacher_id)?.display_name:"";
    return '<td class="tt-demo-grid-cell '+(p.is_break?'is-break':entry?.is_locked?'is-locked':entry?'has-lesson':'')+'">'+
      (p.is_break?'<span>พัก</span>':entry?
       '<button type="button" data-tt-demo-cell="'+esc(entry.id)+'" title="เลือกเพื่อดูรายละเอียดคาบ">'+(entry.is_locked?'🔒 ':'')+'<strong>'+esc(subjectName(a?.subject_id))+'</strong><small>'+esc(blockedTeacher)+'</small></button>':
       '<button type="button" data-tt-demo-empty="'+row.day+":"+p.period_no+'">+ ว่าง</button>')+
    '</td>';
   }).join("")+'</tr>').join("");
  return '<section class="panel tt-demo-section"><h3>3. ตารางทดลอง ป.3/3</h3>'+
   '<p class="helper">ตารางนี้แยกจากตารางจริงทั้งหมด กดช่องว่างเพื่อเลือกวัน/คาบได้ จากนั้นกำหนดวิชาแล้วบันทึก หรือให้ระบบจัดคาบที่เหลืออัตโนมัติ</p>'+
   '<div class="tt-rule-table-scroll"><table class="tt-rule-grid tt-demo-grid"><thead><tr><th>วัน</th>'+cells+'</tr></thead><tbody>'+body+'</tbody></table></div>'+
   '<div class="tt-rule-form"><label>รายวิชาที่มอบหมาย'+select("tt-demo-place-ass",assignments().map(a=>opts(a.id,assignmentName(a.id),D.manualAssignment)))+'</label>'+
   '<label>วัน'+select("tt-demo-place-day",weekdays().map(d=>opts(d,days[d],D.manualDay)))+'</label>'+
   '<label>คาบ'+select("tt-demo-place-period",teachingPeriods().map(p=>opts(p.period_no,"คาบ "+p.period_no,D.manualPeriod)))+'</label>'+
   '<label class="tt-demo-check"><input type="checkbox" id="tt-demo-place-lock" '+(D.manualLocked?"checked":"")+'> ล็อกคาบวิชานี้ (ห้ามย้ายจนกว่าจะปลดล็อก)</label></div>'+
   '<button class="btn btn-primary" id="tt-demo-place-save" '+(!assignments().length||D.busy?"disabled":"")+'>บันทึกคาบเรียนด้วยมือ</button>'+
   '<div class="tt-demo-assignment-list">'+entries().map(x=>'<div><div><strong>'+esc(assignmentName(x.assignment_id))+'</strong><small>'+esc(days[x.weekday])+' · คาบ '+x.period_no+(x.is_locked?' · 🔒 ล็อกแล้ว':'')+'</small></div><div class="tt-demo-item-actions">'+
      '<button class="btn btn-ghost" data-tt-demo-toggle="'+esc(x.id)+'">'+(x.is_locked?'ปลดล็อก':'ล็อกคาบ')+'</button>'+
      '<button class="btn btn-ghost" data-tt-demo-delete-entry="'+esc(x.id)+'" '+(x.is_locked?'disabled':'')+'>ลบคาบ</button></div></div>').join("")+'</div></section>';
 }
 function generate(){
  const c=cls(),p=prof();if(!c||!p)return;
  const mapping=new Map(periods().map(x=>[x.period_no,x.id]));
  const fakeAssignments=assignments().map(a=>({...a,is_active:true,teacher_id:a.teacher_id,
   periods_per_week:Number(a.periods_per_week),subject_name:subjectName(a.subject_id)}));
  const fakeEntries=entries().map(x=>({timetable_id:p.id,assignment_id:x.assignment_id,weekday:x.weekday,period_id:mapping.get(x.period_no)}));
  const fakeBlocks=blocks().map(u=>({...u,academic_year:c.academic_year,semester:c.semester}));
  D.preview=generateTimetablePlan({
   classes:[c],profiles:[p],periods:periods(),assignments:fakeAssignments,
   entries:fakeEntries,blocks:fakeBlocks,fixed:[],
   selectedClassIds:[c.id],scopeClassIds:[c.id]
  });
  redraw();
 }
 function autoForm(){
  const p=D.preview,rows=p?.suggestions||[];
  return '<section class="panel tt-demo-section"><h3>4. ทดลองจัดตารางอัตโนมัติ</h3>'+
   '<p class="helper">ใช้วิชาและชั่วโมงสอนที่คุณกำหนด ระบบไม่ย้ายคาบเดิมที่ล็อกไว้ และหลีกเลี่ยงเวลาห้ามสอนของครู ผลลัพธ์เป็นตัวอย่างจนกว่าจะยืนยันบันทึก</p>'+
   '<button class="btn btn-secondary" id="tt-demo-auto-preview" '+(!assignments().length||D.busy?"disabled":"")+'>คำนวณตารางทดลองอัตโนมัติ</button>'+
   (p?'<div class="tt-rule-stats"><strong>เสนอเพิ่ม '+rows.length+' คาบ</strong><strong>ปัญหา '+p.errors.length+' รายการ</strong></div>'+
     (p.errors.length?'<div class="tt-rule-warning">'+p.errors.map(x=>'<p>'+esc(x)+'</p>').join("")+'</div>':"")+
     (rows.length?'<div class="tt-demo-assignment-list">'+rows.slice(0,60).map(x=>'<div><strong>'+esc(days[x.weekday])+' คาบ '+x.period_no+'</strong><span>'+esc(assignmentName(x.assignment_id))+'</span></div>').join("")+'</div>':'')+
     (p.complete&&rows.length?'<button class="btn btn-primary" id="tt-demo-auto-save">ยืนยันบันทึก '+rows.length+' คาบลงตารางทดลอง</button>':''):'')+
  '</section>';
 }
 function html(){
  const demoClasses=classes();
  if(!demoClasses.length)return '<section class="panel"><h3>ยังไม่มีห้องทดลองที่ได้รับสิทธิ์</h3><p>กรุณาเลือกปีการศึกษาและภาคเรียนที่มีห้อง ป.3/3</p></section>';
  if(!D.classId||!demoClasses.some(c=>c.id===D.classId))D.classId=demoClasses[0].id;
  return '<section class="panel tt-rule-intro"><div><h2>ทดลองจัดตารางด้วยครูตัวอย่าง</h2>'+
   '<p>มอบหมายวิชาและจำนวนคาบ → ล็อกเวลาห้ามสอน → ล็อกคาบวิชา → จัดด้วยมือหรืออัตโนมัติ เฉพาะห้องทดลองเท่านั้น</p></div>'+
   '<span class="pill neutral">ข้อมูลทดลอง — ไม่เผยแพร่เป็นตารางจริง</span></section>'+
   (D.error?'<div class="tt-rule-warning">'+esc(D.error)+'</div>':'')+
   '<section class="panel"><div class="field"><label>ห้องทดลอง</label>'+select("tt-demo-class",demoClasses.map(c=>opts(c.id,classLabel(c),D.classId)))+'</div>'+
   teacherSummary()+'</section>'+
   assignmentForm()+unavailabilityForm()+timetableGrid()+autoForm();
 }
 async function operate(promise,label){
  if(D.busy)return;
  D.busy=true;
  try{
   const res=await promise();
   if(res?.error)throw res.error;
   toast(label,"ข้อมูลทดลอง ป.3/3 เท่านั้น","success");
   D.chosenBlocks=[];D.preview=null;
   await load();
   redraw();
  }catch(err){D.error=err.message||String(err);toast("บันทึกไม่สำเร็จ",D.error,"error");redraw()}
  finally{D.busy=false}
 }
 function bind(){
  const el=(id,fn)=>document.querySelector(id)?.addEventListener("change",fn);
  const click=(id,fn)=>document.querySelector(id)?.addEventListener("click",fn);
  el("#tt-demo-class",e=>{D.classId=e.target.value;resetChoices();redraw()});
  el("#tt-demo-ass-teacher",e=>{D.teacherId=e.target.value});
  el("#tt-demo-ass-subject",e=>{D.subjectId=e.target.value});
  el("#tt-demo-hours",e=>{D.hours=Number(e.target.value)});
  click("#tt-demo-ass-save",()=>operate(async()=>{
   const hours=Number(document.querySelector("#tt-demo-hours")?.value);
   if(!Number.isInteger(hours)||hours<1||hours>40)throw new Error("กรุณากำหนดจำนวนคาบ 1–40 คาบ");
   return supabase.from("timetable_demo_assignments").upsert(
    {class_id:D.classId,subject_id:D.subjectId,teacher_id:D.teacherId,periods_per_week:hours},
    {onConflict:"class_id,subject_id"});
  },"มอบหมายวิชาให้ครูตัวอย่างแล้ว"));
  document.querySelectorAll("[data-tt-demo-edit]").forEach(b=>b.addEventListener("click",()=>{
   const a=assignments().find(a=>a.id===b.dataset.ttDemoEdit);
   if(!a)return;D.teacherId=a.teacher_id;D.subjectId=a.subject_id;D.hours=a.periods_per_week;redraw();
   document.querySelector("#tt-demo-hours")?.focus();
  }));
  document.querySelectorAll("[data-tt-demo-delete-ass]").forEach(b=>b.addEventListener("click",()=>{
   const a=assignments().find(a=>a.id===b.dataset.ttDemoDeleteAss);
   if(!a||!confirm("ยืนยันลบวิชาที่มอบหมาย "+subjectName(a.subject_id)+"? คาบทดลองที่จัดให้วิชานี้จะถูกลบด้วย"))return;
   operate(()=>supabase.from("timetable_demo_assignments").delete().eq("id",a.id),"ลบการมอบหมายวิชาแล้ว");
  }));
  el("#tt-demo-block-teacher",e=>{D.blockTeacher=e.target.value;D.chosenBlocks=[];redraw()});
  document.querySelectorAll("[data-tt-demo-block]").forEach(b=>b.addEventListener("change",()=>{
   D.chosenBlocks=Array.from(document.querySelectorAll("[data-tt-demo-block]:checked:not(:disabled)")).map(x=>x.dataset.ttDemoBlock);
   redraw();
  }));
  click("#tt-demo-block-save",()=>operate(async()=>{
   const rows=D.chosenBlocks.map(x=>{const [weekday,period_no]=x.split(":").map(Number);return {class_id:D.classId,teacher_id:D.blockTeacher,weekday,period_no};});
   return supabase.from("timetable_demo_unavailability").insert(rows);
  },"บันทึกคาบห้ามสอนแล้ว"));
  document.querySelectorAll("[data-tt-demo-unblock]").forEach(b=>b.addEventListener("click",()=>{
   if(!confirm("ยกเลิกคาบห้ามสอนนี้?"))return;
   operate(()=>supabase.from("timetable_demo_unavailability").delete().eq("class_id",D.classId).eq("id",b.dataset.ttDemoUnblock),"ปลดล็อกคาบห้ามสอนแล้ว");
  }));
  el("#tt-demo-place-ass",e=>{D.manualAssignment=e.target.value});
  el("#tt-demo-place-day",e=>{D.manualDay=Number(e.target.value)});
  el("#tt-demo-place-period",e=>{D.manualPeriod=Number(e.target.value)});
  el("#tt-demo-place-lock",e=>{D.manualLocked=e.target.checked});
  click("#tt-demo-place-save",()=>operate(()=>supabase.from("timetable_demo_entries").insert({
    class_id:D.classId,assignment_id:D.manualAssignment,weekday:Number(D.manualDay),
    period_no:Number(D.manualPeriod),is_locked:D.manualLocked
  }),"วางคาบเรียนทดลองแล้ว"));
  document.querySelectorAll("[data-tt-demo-empty]").forEach(b=>b.addEventListener("click",()=>{
   const [d,p]=b.dataset.ttDemoEmpty.split(":").map(Number);D.manualDay=d;D.manualPeriod=p;redraw();
   document.querySelector("#tt-demo-place-ass")?.focus();
  }));
  document.querySelectorAll("[data-tt-demo-cell]").forEach(b=>b.addEventListener("click",()=>{
   const x=entries().find(x=>x.id===b.dataset.ttDemoCell);
   if(!x)return;D.manualAssignment=x.assignment_id;D.manualDay=x.weekday;D.manualPeriod=x.period_no;redraw();
  }));
  document.querySelectorAll("[data-tt-demo-toggle]").forEach(b=>b.addEventListener("click",()=>{
   const x=entries().find(x=>x.id===b.dataset.ttDemoToggle);
   if(!x)return;
   operate(()=>supabase.from("timetable_demo_entries").update({is_locked:!x.is_locked}).eq("id",x.id),"เปลี่ยนสถานะล็อกคาบแล้ว");
  }));
  document.querySelectorAll("[data-tt-demo-delete-entry]").forEach(b=>b.addEventListener("click",()=>{
   const x=entries().find(x=>x.id===b.dataset.ttDemoDeleteEntry);
   if(!x||x.is_locked||!confirm("ลบคาบทดลองนี้?"))return;
   operate(()=>supabase.from("timetable_demo_entries").delete().eq("id",x.id),"ลบคาบทดลองแล้ว");
  }));
  click("#tt-demo-auto-preview",generate);
  click("#tt-demo-auto-save",()=>{const p=D.preview;if(!p?.complete||!p.suggestions.length)return;
   if(!confirm("บันทึกคาบที่ระบบจัดได้ "+p.suggestions.length+" คาบลงตารางทดลอง ป.3/3?"))return;
   operate(()=>supabase.rpc("timetable_demo_save_generated",{p_class:D.classId,p_slots:p.suggestions}),"บันทึกตารางทดลองอัตโนมัติแล้ว");
  });
 }
 return {D,load,html,bind};
}
