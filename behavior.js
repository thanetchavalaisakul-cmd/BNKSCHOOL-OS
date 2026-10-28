import { printBehaviorDocument } from "./behavior-print.js?v=2";

export function createBehaviorFeature({supabase,state,escapeHtml,toast,renderDashboard,currentAcademicPeriod,officialPdfFontFaceCss,ensureOfficialPdfFont}){
 const bs={tab:"overview",data:[],roster:[],classes:[],managers:[],people:[],settings:{starting_score:100,good_min:80,monitor_min:50},canEdit:false,canAdmin:false,canLead:false,selected:"",classId:"all",year:"",semester:2,loading:false,error:"",notified:false,selectedEvent:"",recordGrade:"",recordClassId:"",recordStudentId:""};
 const e=escapeHtml; const out=(v)=>e(String(v??""));
 const sum=s=>bs.settings.starting_score+bs.data.filter(x=>x.student_id===s.student_id&&x.academic_year===bs.year&&x.event_status!=="void").reduce((n,x)=>n+Number(x.score_delta),0);
 const cl=s=>s.class_name||"ไม่ระบุห้อง";
 const who=id=>bs.roster.find(s=>s.student_id===id);
 const tags=x=>x>=bs.settings.good_min?"good":x>=bs.settings.monitor_min?"watch":"risk";
 const badge=x=>'<span class="behavior-status '+tags(x)+'">'+(tags(x)==="good"?"ปกติ":tags(x)==="watch"?"ติดตาม":"เฝ้าระวัง")+'</span>';
 const filtered=()=>bs.roster.filter(s=>bs.classId==="all"||s.class_id===bs.classId);
 const option=(v,t)=>'<option value="'+out(v)+'">'+out(t)+'</option>';

 const gradeOf=name=>String(name||"").replace(/\/[^/]+$/,"");
 const recordGrades=()=>[...new Set(bs.classes.map(c=>gradeOf(c.name)))].filter(Boolean);
 const roomNames=()=>bs.classes.filter(c=>gradeOf(c.name)===bs.recordGrade);
 const recordStudents=()=>bs.roster.filter(s=>s.class_id===bs.recordClassId).sort((a,b)=>Number(a.student_number||0)-Number(b.student_number||0)||String(a.full_name).localeCompare(String(b.full_name),"th"));
 function syncRecordSelectors(){
   const grade=document.querySelector("#behavior-record-grade"),room=document.querySelector("#behavior-record-room"),student=document.querySelector("#behavior-record-student");
   if(!grade||!room||!student)return;
   room.replaceChildren(new Option("— เลือกห้องเรียน —",""),...roomNames().map(c=>new Option(c.name,c.id)));
   room.value=roomNames().some(c=>c.id===bs.recordClassId)?bs.recordClassId:"";
   room.disabled=!bs.recordGrade;
   student.replaceChildren(new Option("— เลือกนักเรียน —",""),...recordStudents().map(s=>new Option((s.student_number?("เลขที่ "+s.student_number+" · "):"")+s.full_name,s.student_id)));
   student.value=recordStudents().some(s=>s.student_id===bs.recordStudentId)?bs.recordStudentId:"";
   student.disabled=!bs.recordClassId;
   const info=document.querySelector("#behavior-record-info"),person=recordStudents().find(s=>s.student_id===bs.recordStudentId);
   if(info)info.textContent=person?"รหัสนักเรียน: "+(person.student_code||"—")+" | คะแนนปัจจุบัน: "+sum(person)+" | ผู้ปกครอง: "+(person.guardian_name||"—"):"เลือกนักเรียนเพื่อดูรหัสและคะแนนปัจจุบัน";
 }

 async function load(){
  bs.loading=true;bs.error="";
  try{
   const p=currentAcademicPeriod();
   if(!bs.year){
     const pr=await supabase.from("student_enrollments").select("academic_year,semester").order("academic_year",{ascending:false}).order("semester",{ascending:false}).limit(1).maybeSingle();
     bs.year=String(pr.data?.academic_year||p.academicYear);
     bs.semester=Number(pr.data?.semester||p.semester);
   }
   const [access,leader,ro,events,sett,users,managers]=await Promise.all([
    supabase.rpc("behavior_is_editor"),supabase.rpc("behavior_is_leader"),
    supabase.rpc("behavior_roster",{p_year:bs.year,p_semester:bs.semester}),
    supabase.from("behavior_events").select("*").eq("academic_year",bs.year).order("created_at",{ascending:false}),
    supabase.from("behavior_settings").select("*").eq("id",1).maybeSingle(),
    supabase.from("personnel_public_directory").select("user_id,full_name,role").order("full_name"),
    supabase.from("behavior_managers").select("*")
   ]);
   bs.canEdit=access.data===true;bs.canLead=leader.data===true;bs.canAdmin=state.profile?.role==="super_admin";
   for(const [label,r] of [["รายชื่อนักเรียน",ro],["รายการคะแนน",events],["ตั้งค่าคะแนน",sett]]){
    if(r.error)throw new Error(label+": "+r.error.message);
   }
   bs.roster=ro.data||[];bs.data=events.data||[];bs.settings=sett.data||bs.settings;
   bs.people=users.data||[];bs.managers=managers.data||[];
   bs.classes=[...new Map(bs.roster.map(s=>[s.class_id,{id:s.class_id,name:s.class_name}])).values()];
   if(bs.selected&&!bs.roster.some(s=>s.student_id===bs.selected))bs.selected="";
  }catch(err){bs.error=err.message||String(err)}finally{bs.loading=false}
 }
 function hero(){return '<div class="behavior-hero"><div><small>งานบริหารทั่วไป / ระบบคะแนนพฤติกรรมนักเรียน</small><h2>ระบบคะแนนพฤติกรรมนักเรียน</h2><p>เชื่อมทะเบียนนักเรียนและสิทธิ์ของ BNK SCHOOL OS · ปีการศึกษา '+out(bs.year)+' ภาคเรียนที่ '+bs.semester+'</p></div><img src="./school-logo.png" alt="ตราโรงเรียน" /></div>'}
 function tabs(){const arr=[["overview","ภาพรวม Dashboard"],["students","คะแนนรายบุคคล"],["history","ประวัติและเอกสาร"]];if(bs.canEdit)arr.splice(1,0,["record","เพิ่ม / หักคะแนน"]);if(bs.canEdit)arr.push(["settings","ตั้งค่าระบบ"]);return '<div class="behavior-tabs">'+arr.map(([k,v])=>'<button data-btab="'+k+'" class="'+(bs.tab===k?"active":"")+'">'+v+'</button>').join("")+'</div>'}
 function table(rows){return '<div class="table-wrap"><table class="table"><thead><tr><th>นักเรียน</th><th>ห้องเรียน</th><th>คะแนน</th><th>สถานะ</th><th>รายละเอียด</th></tr></thead><tbody>'+rows.map(s=>'<tr><td>'+out(s.full_name)+'</td><td>'+out(cl(s))+'</td><td><strong>'+sum(s)+'</strong></td><td>'+badge(sum(s))+'</td><td><button class="btn btn-ghost" data-bstudent="'+out(s.student_id)+'">ดูประวัติ</button></td></tr>').join("")+'</tbody></table></div>'}
 function view(){
  if(bs.loading)return '<div class="panel">กำลังโหลดข้อมูลคะแนนพฤติกรรม…</div>';
  if(bs.error)return '<div class="panel"><h3>ไม่สามารถโหลดข้อมูล</h3><p>'+out(bs.error)+'</p><button class="btn btn-primary" id="behavior-refresh">ลองใหม่</button></div>';
  const list=filtered(),total=list.length,average=total?(list.reduce((n,s)=>n+sum(s),0)/total).toFixed(1):"0.0";
  const good=list.filter(s=>tags(sum(s))==="good").length,watch=list.filter(s=>tags(sum(s))==="watch").length,risk=total-good-watch;
  const filt='<div class="behavior-toolbar"><label>ห้องเรียน <select id="behavior-class"><option value="all">ทุกห้องที่มีสิทธิ์ดู</option>'+bs.classes.map(c=>'<option value="'+out(c.id)+'" '+(bs.classId===c.id?"selected":"")+'>'+out(c.name)+'</option>').join("")+'</select></label><button id="behavior-export" class="btn btn-ghost">พิมพ์ / บันทึก PDF หน้านี้</button></div>';
  if(bs.tab==="overview")return filt+'<div class="behavior-metrics"><article>นักเรียนที่ดูได้<strong>'+total+'</strong></article><article>คะแนนเฉลี่ย<strong>'+average+'</strong></article><article>เหตุการณ์ที่บันทึก<strong>'+bs.data.filter(x=>list.some(s=>s.student_id===x.student_id)).length+'</strong></article><article>เฝ้าระวัง<strong>'+risk+'</strong></article></div><div class="behavior-charts"><section><h3>สัดส่วนระดับคะแนน</h3><div class="behavior-ring" style="background:conic-gradient(#19876b 0 '+(total?good/total*100:0)+'%,#dca93f '+(total?good/total*100:0)+'% '+(total?(good+watch)/total*100:0)+'%,#dc6665 '+(total?(good+watch)/total*100:0)+'% 100%)"><span>'+total+' คน</span></div><p class="behavior-legend">🟢 ดี '+good+' · 🟡 ติดตาม '+watch+' · 🔴 เฝ้าระวัง '+risk+'</p></section><section><h3>คะแนนเฉลี่ยตามห้องเรียน</h3>'+bs.classes.filter(c=>bs.classId==="all"||c.id===bs.classId).map(c=>{const a=list.filter(s=>s.class_id===c.id);const avg=a.length?a.reduce((n,s)=>n+sum(s),0)/a.length:0;return '<div class="behavior-bar"><small>'+out(c.name)+' · '+avg.toFixed(1)+'</small><div><i style="width:'+Math.max(0,Math.min(100,avg))+'%"></i></div></div>'}).join("")+'</section></div><section class="panel"><h3>รายชื่อนักเรียน</h3>'+table(list.slice(0,20))+'</section>';
  if(bs.tab==="students")return filt+'<section class="panel"><h3>ทะเบียนคะแนนรายบุคคล</h3>'+table(list)+'</section>';
  if(bs.tab==="record"&&bs.canEdit)return '<section class="panel"><h3>บันทึกเหตุการณ์พฤติกรรม</h3><p class="helper">เลือกชั้นเรียนก่อน จากนั้นเลือกห้องและนักเรียน ระบบแสดงเฉพาะรายชื่อที่มีอยู่ในห้องนั้น</p><form id="behavior-record" class="behavior-form"><label>๑. ระดับชั้น<select id="behavior-record-grade" required><option value="">— เลือกระดับชั้น —</option>'+recordGrades().map(g=>'<option value="'+out(g)+'" '+(g===bs.recordGrade?"selected":"")+'>'+out(g)+'</option>').join("")+'</select></label><label>๒. ห้องเรียน<select id="behavior-record-room" required disabled><option value="">— เลือกระดับชั้นก่อน —</option></select></label><label class="behavior-record-full">๓. ชื่อนักเรียน<select id="behavior-record-student" name="student_id" required disabled><option value="">— เลือกห้องเรียนก่อน —</option></select><small id="behavior-record-info" class="helper">เลือกนักเรียนเพื่อดูรหัสและคะแนนปัจจุบัน</small></label><label>ประเภท<select name="kind"><option value="deduction">หักคะแนน</option><option value="addition">เพิ่มคะแนน</option></select></label><label>จำนวนคะแนน (ไม่เกิน 100)<input type="number" name="score" min="1" max="100" value="5" required></label><label>วันที่เกิดเหตุ<input type="date" name="occurred_on" required value="'+new Date().toISOString().slice(0,10)+'"></label><label>สถานที่<input name="location" maxlength="200"></label><label class="behavior-record-full">เรื่องที่เกิดขึ้น<textarea name="description" required minlength="5" maxlength="2000"></textarea></label><fieldset><legend>ผลการพิจารณา (เลือกหลายข้อได้)</legend>'+["ว่ากล่าวตักเตือน","เชิญผู้ปกครองมาทำทัณฑ์บน","หักคะแนนความประพฤติ","ทำกิจกรรมเพื่อปรับเปลี่ยนพฤติกรรม","เสนอผู้อำนวยการเพื่อส่งต่อ"].map(x=>'<label><input type="checkbox" name="outcomes" value="'+x+'"> '+x+'</label>').join("")+'</fieldset><label class="behavior-record-full">หมายเหตุ<textarea name="note" maxlength="1500"></textarea></label><label>การแจ้งผู้ปกครอง<select name="parent_status"><option value="not_required">ยังไม่กำหนด</option><option value="pending">รอแจ้ง</option><option value="notified">แจ้งแล้ว</option><option value="appointment">นัดหมายแล้ว</option><option value="acknowledged">รับทราบแล้ว</option></select></label><div class="behavior-record-full"><button class="btn btn-primary" type="submit">บันทึกเหตุการณ์ลงระบบจริง</button></div></form><p class="helper">รายการความผิดและเกณฑ์คะแนนยังเป็นแบบกำหนดเองตามระเบียบของโรงเรียน ไม่ได้สมมติกฎตายตัว</p></section>';
  if(bs.tab==="history"){let rows=bs.data.filter(x=>list.some(s=>s.student_id===x.student_id));if(bs.selected)rows=rows.filter(x=>x.student_id===bs.selected);return filt+'<section class="panel"><h3>ประวัติการเพิ่ม / หักคะแนน '+(bs.selected?"รายบุคคล":"")+'</h3>'+(bs.selected?'<button class="btn btn-ghost" id="behavior-clear-student">แสดงทั้งหมด</button>':'')+'<div class="table-wrap"><table class="table"><thead><tr><th>วันที่</th><th>นักเรียน</th><th>รายการ</th><th>คะแนน</th><th>สถานะผู้ปกครอง</th><th>เอกสาร</th></tr></thead><tbody>'+rows.map(x=>'<tr><td>'+out(x.occurred_on)+'</td><td>'+out(who(x.student_id)?.full_name||"")+'</td><td>'+out(x.description)+'</td><td>'+out(x.score_delta)+'</td><td>'+out(x.parent_status)+'</td><td><button class="btn btn-ghost" data-bevent="'+out(x.id)+'">รายละเอียด / ลายเซ็น / PDF</button></td></tr>').join("")+'</tbody></table></div></section>'+(bs.selectedEvent?detail(): '');
  }
  if(bs.tab==="settings"&&bs.canEdit)return '<section class="panel"><h3>ตั้งค่าเกณฑ์คะแนน</h3><form id="behavior-settings" class="behavior-form"><label>คะแนนเริ่มต้น<input name="starting_score" type="number" min="1" max="1000" value="'+bs.settings.starting_score+'"></label><label>เกณฑ์ดีตั้งแต่<input name="good_min" type="number" value="'+bs.settings.good_min+'"></label><label>เกณฑ์ติดตามตั้งแต่<input name="monitor_min" type="number" value="'+bs.settings.monitor_min+'"></label><button class="btn btn-primary">บันทึกเกณฑ์คะแนน</button></form></section>'+(bs.canAdmin?'<section class="panel"><h3>ผู้รับผิดชอบระบบกิจการนักเรียน</h3><form id="behavior-manager"><select name="user_id" required><option value="">เลือกจากทะเบียนบุคลากร</option>'+bs.people.filter(p=>p.user_id).map(p=>option(p.user_id,p.full_name)).join("")+'</select><button class="btn btn-primary">เพิ่มผู้รับผิดชอบ</button></form><p>ผู้รับผิดชอบสามารถจัดการเฉพาะโมดูลนี้ ไม่ได้เป็นแอดมินทั้งระบบ</p><div>'+bs.managers.map(m=>'<div class="behavior-manage">'+out(bs.people.find(p=>p.user_id===m.user_id)?.full_name||"")+' <button class="btn btn-ghost" data-brevoke="'+out(m.user_id)+'">ถอนสิทธิ์</button></div>').join("")+'</div></section>':"");
  return '<section class="panel"><p>ไม่มีสิทธิ์เข้าถึงหน้านี้</p></section>';
 }
 function detail(){
  const x=bs.data.find(y=>y.id===bs.selectedEvent);if(!x)return "";
  const s=who(x.student_id);
  return '<section class="panel" id="behavior-print-detail"><div style="text-align:center"><img src="./school-logo.png" width="70" alt="ตราโรงเรียน"><h3>ใบบันทึก'+(x.kind==="addition"?"การเพิ่มคะแนน":"การหักคะแนน")+'ความประพฤติ</h3></div><p><strong>นักเรียน:</strong> '+out(s?.full_name)+' &nbsp; <strong>ห้อง:</strong> '+out(s?.class_name)+' &nbsp; <strong>รหัส:</strong> '+out(s?.student_code)+'</p><p>วันที่เกิดเหตุ '+out(x.occurred_on)+' · สถานที่ '+out(x.location)+'</p><p>เรื่อง '+out(x.description)+'</p><p>ผลการพิจารณา '+out((x.outcomes||[]).join(", "))+'</p><p>คะแนนที่เปลี่ยนแปลง <strong>'+out(x.score_delta)+'</strong> คะแนน</p><p>หมายเหตุ '+out(x.note)+'</p><p>การแจ้งผู้ปกครอง '+out(x.parent_status)+'</p><p>สถานะกรณี '+out(x.event_status)+'</p>'+(bs.canEdit?'<form id="behavior-case-update" class="behavior-form"><label>ติดตามผู้ปกครอง<select name="parent_status">'+[["not_required","ยังไม่กำหนด"],["pending","รอแจ้ง"],["notified","แจ้งแล้ว"],["appointment","นัดหมายแล้ว"],["acknowledged","รับทราบแล้ว"]].map(([v,t])=>'<option value="'+v+'" '+(x.parent_status===v?"selected":"")+'>'+t+'</option>').join("")+'</select></label><label>สถานะกรณี<select name="event_status">'+[["recorded","บันทึกแล้ว"],["in_review","กำลังพิจารณา"],["completed","ดำเนินการเสร็จ"],["void","ยกเลิกรายการ (ไม่นับคะแนน)"]].map(([v,t])=>'<option value="'+v+'" '+(x.event_status===v?"selected":"")+'>'+t+'</option>').join("")+'</select></label><button type="submit" class="btn btn-primary">บันทึกสถานะ</button></form>':"")+'<div id="behavior-sigs">กำลังโหลดลายมือชื่อ…</div><div id="behavior-files"></div><div class="behavior-actions"><button class="btn btn-ghost" id="behavior-print-detail-btn">พิมพ์ / PDF ใบนี้</button>'+(bs.canEdit?'<button class="btn btn-primary" id="behavior-sign">ลงลายมือชื่อสด</button><label class="btn btn-ghost">แนบรูป/PDF<input id="behavior-file" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" style="display:none"></label>':"")+'</div></section>'
 }
 async function detailLoad(){
  const id=bs.selectedEvent;if(!id)return;
  const [s,f]=await Promise.all([supabase.from("behavior_signatures").select("*").eq("event_id",id),supabase.from("behavior_evidence").select("*").eq("event_id",id)]);
  const holder=document.querySelector("#behavior-sigs");if(holder)holder.innerHTML='<h4>ลายมือชื่อ</h4>'+((s.data||[]).map(x=>'<div class="behavior-signed"><img src="'+out(x.signature_png)+'" alt="ลายมือชื่อ" width="130"><div>'+out(x.signer_name)+' · '+out(x.signer_role)+' · '+out(new Date(x.signed_at).toLocaleString("th-TH"))+'</div></div>').join("")||'<p>ยังไม่มีลายมือชื่อ</p>');
  const files=document.querySelector("#behavior-files");if(files)files.innerHTML='<h4>หลักฐานแนบ</h4>'+((f.data||[]).map(x=>'<button class="btn btn-ghost" data-bfile="'+out(x.storage_path)+'">'+out(x.file_name)+'</button>').join("")||'<p>ยังไม่มีหลักฐาน</p>');
 }
 function signModal(){
 const x=bs.data.find(y=>y.id===bs.selectedEvent);if(!x)return;
 const back=document.createElement("div");back.className="modal-backdrop behavior-sign-modal";back.innerHTML='<div class="modal" style="max-width:600px"><div class="modal-head"><h3>ลงลายมือชื่อสด</h3><button class="btn btn-ghost" id="b-close">ปิด</button></div><label>บทบาท<select id="b-role">'+["student","guardian","homeroom","student_affairs","witness"].map((v,i)=>option(v,["นักเรียน","ผู้ปกครอง","ครูประจำชั้น","งานกิจการนักเรียน","ผู้รับรอง"][i])).join("")+'</select></label><label>ชื่อผู้ลงนาม<input id="b-name" class="input" placeholder="ชื่อผู้ลงลายมือชื่อ" required></label><canvas id="b-canvas" width="560" height="190" style="width:100%;height:190px;border:1px solid #ccc;background:white;touch-action:none"></canvas><div class="modal-actions"><button id="b-clear" class="btn btn-ghost">ล้างลายเซ็น</button><button id="b-save" class="btn btn-primary">บันทึกลายเซ็น</button></div><p class="helper">วันที่และเวลาที่ลงนามจริงถูกบันทึกโดยฐานข้อมูล ไม่สามารถเปลี่ยนย้อนหลังได้</p></div>';document.body.append(back);
 const cv=back.querySelector("canvas"),ctx=cv.getContext("2d");ctx.lineWidth=2.4;ctx.lineCap="round";ctx.strokeStyle="#102b20";let drawing=false,marked=false;
 const pt=ev=>{const r=cv.getBoundingClientRect();return {x:(ev.clientX-r.left)*cv.width/r.width,y:(ev.clientY-r.top)*cv.height/r.height}};
 cv.onpointerdown=ev=>{drawing=true;marked=true;cv.setPointerCapture(ev.pointerId);const p=pt(ev);ctx.beginPath();ctx.moveTo(p.x,p.y)};
 cv.onpointermove=ev=>{if(!drawing)return;const p=pt(ev);ctx.lineTo(p.x,p.y);ctx.stroke()};
 cv.onpointerup=()=>drawing=false;const info=who(x.student_id),signName=back.querySelector("#b-name"),signRole=back.querySelector("#b-role");
 const setSigner=()=>{signName.value=signRole.value==="student"?(info?.full_name||""):signRole.value==="guardian"?(info?.guardian_name||""):(state.profile?.full_name||"")};
 signRole.onchange=setSigner;setSigner();
 back.querySelector("#b-close").onclick=()=>back.remove();back.querySelector("#b-clear").onclick=()=>{ctx.clearRect(0,0,cv.width,cv.height);marked=false};
 back.querySelector("#b-save").onclick=async()=>{const name=back.querySelector("#b-name").value.trim();if(name.length<2||!marked)return toast("ข้อมูลไม่ครบ","กรุณากรอกชื่อและเซ็นลายมือชื่อ","error");const data={event_id:x.id,signer_role:back.querySelector("#b-role").value,signer_name:name,signature_png:cv.toDataURL("image/png")};const r=await supabase.from("behavior_signatures").insert(data);if(r.error)return toast("ไม่สามารถบันทึกได้",r.error.message,"error");back.remove();await detailLoad();toast("บันทึกลายเซ็นแล้ว","","success")};
 }
 const schoolTitle=()=>state.systemSettings?.school_name_th||state.systemSettings?.system_name||"โรงเรียน";
 const printOptions=()=>({fontsCss:officialPdfFontFaceCss(),ensureFont:ensureOfficialPdfFont,toast});
 function printSummary(){
   const source=bs.selected&&bs.tab==="history"?bs.roster.filter(s=>s.student_id===bs.selected):filtered();
   const label=bs.selected&&bs.tab==="history"?"รายบุคคล: "+(source[0]?.full_name||""):
     bs.classId!=="all"?"ห้องเรียน: "+(bs.classes.find(c=>c.id===bs.classId)?.name||""):"ภาพรวมทั้งโรงเรียน";
   printBehaviorDocument({...printOptions(),type:"summary",data:{schoolName:schoolTitle(),scopeName:label,students:source,events:bs.data,settings:bs.settings,period:{year:bs.year,semester:bs.semester}}});
 }
 async function printCase(){
   const x=bs.data.find(y=>y.id===bs.selectedEvent);if(!x)return;
   // Open synchronously from the click event, so iPad Safari does not block it.
   const popup=window.open("","_blank");
   if(!popup)return toast("เปิดหน้าพิมพ์ไม่ได้","อนุญาตหน้าต่างใหม่ในเบราว์เซอร์แล้วลองอีกครั้ง","error");
   popup.document.body.textContent="กำลังจัดเตรียมเอกสารราชการ…";
   try{
     const [sr,fr]=await Promise.all([
       supabase.from("behavior_signatures").select("*").eq("event_id",x.id),
       supabase.from("behavior_evidence").select("*").eq("event_id",x.id)
     ]);
     if(sr.error||fr.error)throw new Error(sr.error?.message||fr.error?.message);
     const evidence=await Promise.all((fr.data||[]).map(async f=>{
       if(!/^image\/(?:png|jpeg|webp)$/.test(f.mime_type||""))return {...f,previewUrl:null};
       const r=await supabase.storage.from("behavior-evidence").createSignedUrl(f.storage_path,300);
       return {...f,previewUrl:r.error?null:r.data.signedUrl};
     }));
     await printBehaviorDocument({...printOptions(),type:"case",popup,data:{
       event:x,student:who(x.student_id),signatures:sr.data||[],evidence,
       schoolName:schoolTitle(),score:sum(who(x.student_id)||{student_id:x.student_id}),
       period:{year:x.academic_year,semester:x.semester}
     }});
   }catch(err){popup.document.body.textContent="ไม่สามารถเตรียมเอกสารได้: "+(err.message||String(err));toast("จัดทำเอกสารไม่ได้",err.message||String(err),"error");}
 }

 function html(){return '<div class="behavior-workspace">'+hero()+tabs()+view()+'</div>'}
 function bind(){
  document.querySelectorAll("[data-btab]").forEach(b=>b.onclick=()=>{bs.tab=b.dataset.btab;bs.selectedEvent="";renderDashboard()});
  document.querySelector("#behavior-class")?.addEventListener("change",ev=>{bs.classId=ev.target.value;renderDashboard()});
  document.querySelectorAll("[data-bstudent]").forEach(b=>b.onclick=()=>{bs.selected=b.dataset.bstudent;bs.tab="history";bs.selectedEvent="";renderDashboard()});
  document.querySelector("#behavior-clear-student")?.addEventListener("click",()=>{bs.selected="";renderDashboard()});
  document.querySelectorAll("[data-bevent]").forEach(b=>b.onclick=()=>{bs.selectedEvent=b.dataset.bevent;renderDashboard()});
  if(bs.tab==="record"&&bs.canEdit){
    syncRecordSelectors();
    document.querySelector("#behavior-record-grade")?.addEventListener("change",ev=>{
      bs.recordGrade=ev.target.value;bs.recordClassId="";bs.recordStudentId="";syncRecordSelectors();
    });
    document.querySelector("#behavior-record-room")?.addEventListener("change",ev=>{
      bs.recordClassId=ev.target.value;bs.recordStudentId="";syncRecordSelectors();
    });
    document.querySelector("#behavior-record-student")?.addEventListener("change",ev=>{
      bs.recordStudentId=ev.target.value;syncRecordSelectors();
    });
  }
  document.querySelector("#behavior-refresh")?.addEventListener("click",async()=>{await load();renderDashboard()});
  document.querySelector("#behavior-export")?.addEventListener("click",printSummary);
  document.querySelector("#behavior-print-detail-btn")?.addEventListener("click",printCase);
  document.querySelector("#behavior-case-update")?.addEventListener("submit",async ev=>{
    ev.preventDefault();const fd=new FormData(ev.currentTarget),x=bs.data.find(y=>y.id===bs.selectedEvent);
    if(!x)return;
    const status=String(fd.get("event_status")||"");
    if(x.event_status!=="void"&&status==="void"&&!confirm("ยืนยันยกเลิกรายการนี้? คะแนนจะไม่นำมาคำนวณ แต่ประวัติยังคงอยู่"))return;
    const {error}=await supabase.from("behavior_events").update({parent_status:String(fd.get("parent_status")),event_status:status}).eq("id",x.id);
    if(error)return toast("บันทึกสถานะไม่สำเร็จ",error.message,"error");
    await load();await renderDashboard();toast("อัปเดตสถานะแล้ว","","success");
  });
  document.querySelector("#behavior-sign")?.addEventListener("click",signModal);
  document.querySelectorAll("[data-bfile]").forEach(b=>b.onclick=async()=>{const {data,error}=await supabase.storage.from("behavior-evidence").createSignedUrl(b.dataset.bfile,90);if(error)return toast("เปิดหลักฐานไม่ได้",error.message,"error");window.open(data.signedUrl,"_blank","noopener")});
  document.querySelector("#behavior-file")?.addEventListener("change",async ev=>{const file=ev.target.files[0];if(!file)return;if(file.size>10485760)return toast("ไฟล์ใหญ่เกินไป","ขนาดสูงสุด 10 MB","error");const path=bs.selectedEvent+"/"+crypto.randomUUID()+"-"+file.name.replace(/[^a-zA-Z0-9._-]/g,"_");const up=await supabase.storage.from("behavior-evidence").upload(path,file,{contentType:file.type,upsert:false});if(up.error)return toast("อัปโหลดไม่สำเร็จ",up.error.message,"error");const ins=await supabase.from("behavior_evidence").insert({event_id:bs.selectedEvent,file_name:file.name,storage_path:path,mime_type:file.type});if(ins.error)return toast("บันทึกหลักฐานไม่ได้",ins.error.message,"error");await detailLoad();toast("แนบหลักฐานแล้ว","","success")});
  document.querySelector("#behavior-record")?.addEventListener("submit",async ev=>{ev.preventDefault();const form=new FormData(ev.target),n=Number(form.get("score")),kind=form.get("kind");if(!bs.recordGrade||!bs.recordClassId||!recordStudents().some(s=>s.student_id===form.get("student_id")))return toast("กรุณาเลือกข้อมูลให้ครบ","เลือกระดับชั้น ห้องเรียน และชื่อนักเรียนก่อนบันทึก","error");if(!n&&kind==="addition")return toast("กรอกจำนวนคะแนน","ต้องมากกว่า 0","error");const payload={student_id:form.get("student_id"),academic_year:bs.year,semester:bs.semester,kind,score_delta:kind==="deduction"?-n:n,description:String(form.get("description")||"").trim(),occurred_on:form.get("occurred_on"),location:form.get("location")||null,notes:null,note:form.get("note")||null,outcomes:form.getAll("outcomes"),parent_status:form.get("parent_status")};delete payload.notes;const {error}=await supabase.from("behavior_events").insert(payload);if(error)return toast("บันทึกไม่สำเร็จ",error.message,"error");bs.tab="history";await load();await renderDashboard();toast("บันทึกเหตุการณ์แล้ว","","success")});
  document.querySelector("#behavior-settings")?.addEventListener("submit",async ev=>{ev.preventDefault();const f=new FormData(ev.target);const payload={starting_score:Number(f.get("starting_score")),good_min:Number(f.get("good_min")),monitor_min:Number(f.get("monitor_min")),updated_by:state.user.id,updated_at:new Date().toISOString()};const {error}=await supabase.from("behavior_settings").update(payload).eq("id",1);if(error)return toast("บันทึกไม่ได้",error.message,"error");await load();renderDashboard()});
  document.querySelector("#behavior-manager")?.addEventListener("submit",async ev=>{ev.preventDefault();const u=new FormData(ev.target).get("user_id");const {error}=await supabase.from("behavior_managers").insert({user_id:u,assigned_by:state.user.id});if(error)return toast("เพิ่มผู้รับผิดชอบไม่ได้",error.message,"error");await load();renderDashboard()});
  document.querySelectorAll("[data-brevoke]").forEach(b=>b.onclick=async()=>{if(!confirm("ถอนสิทธิ์ผู้รับผิดชอบรายนี้?"))return;const {error}=await supabase.from("behavior_managers").delete().eq("user_id",b.dataset.brevoke);if(error)return toast("ถอนไม่สำเร็จ",error.message,"error");await load();renderDashboard()});
  if(bs.selectedEvent)detailLoad();
 }
 return {load,html,bind,bs};
}
