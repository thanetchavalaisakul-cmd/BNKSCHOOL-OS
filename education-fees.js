
import { educationPrint } from "./education-fee-print.js?v=4";
import { createEducationFeeLegacy } from "./education-fee-legacy.js?v=3";
import { feeStudentMatches } from "./education-fee-search.js?v=1";
export function createEducationFeeFeature({supabase,state,escapeHtml,toast,renderDashboard,currentAcademicPeriod,officialPdfFontFaceCss,ensureOfficialPdfFont}){
 const F={tab:"dashboard",year:"2569",semester:2,loaded:false,loading:false,error:"",access:false,manager:false,admin:false,
 roster:[],payments:[],rates:[],windows:[],cycles:[],depositChoices:[],staff:[],people:[],collectibleClassIds:[],classFilter:"all",gradeFilter:"",studentFilter:"",searchText:"",historyTerm:"all",historyOrder:"newest",
 receiveGrade:"",receiveClass:"",receiveStudent:"",historyStudent:"",pending:false};
 const e=v=>escapeHtml(String(v??""));
 const cats=[["tuition","ค่าบำรุงการศึกษา (รายภาคเรียน)"],["deposit","ค่าประกัน (สมัครใจ รายปี)"],["water","ค่าน้ำ (รายปี)"]];
 const catName=k=>cats.find(c=>c[0]===k)?.[1]||k;
 const fmt=v=>Number(v||0).toLocaleString("th-TH",{minimumFractionDigits:2,maximumFractionDigits:2});
 const htmlMoney=v=>fmt(v)+" ฿";
 const selectedPeriod=()=>({year:F.year,semester:F.semester});
 const myClassStaff=()=>F.staff.filter(v=>v.user_id===state.user?.id && v.role==="collector");
 const canCollect=cid=>F.manager||F.collectibleClassIds.includes(cid);
 const className=s=>s?.class_name||"ไม่ระบุ";
 const allClasses=()=>[...new Map(F.roster.map(s=>[s.class_id,{id:s.class_id,name:s.class_name}])).values()]
   .sort((a,b)=>a.name.localeCompare(b.name,"th",{numeric:true}));
 const grades=()=>[...new Set(allClasses().map(c=>c.name.replace(/\/[^/]*$/,"")))].filter(Boolean).sort((a,b)=>a.localeCompare(b,"th",{numeric:true}));
 const rooms=()=>allClasses().filter(c=>c.name.replace(/\/[^/]*$/,"")===F.receiveGrade);
 const selectedRooms=()=>F.roster.filter(s=>s.class_id===F.receiveClass).sort((a,b)=>Number(a.student_number||0)-Number(b.student_number||0));
 const activeWindow=(year,sem,cat)=>F.windows.find(x=>x.academic_year===String(year)&&Number(x.semester)===Number(sem)&&x.category===cat)?.enabled===true;
 const cycleOf=cat=>cat==="deposit"||cat==="water"?"annual":F.cycles.find(c=>c.academic_year===F.year&&c.category===cat)?.cycle||"semester";
 const depositSelected=sid=>F.depositChoices.some(c=>c.student_id===sid&&c.academic_year===F.year&&c.opted_in===true);
 const rateFor=(cat,sem)=>Number(F.rates.find(r=>r.academic_year===F.year&&Number(r.semester)===Number(sem)&&r.category===cat)?.amount||0);
 const rate=(cat,sem=F.semester)=>rateFor(cat,cycleOf(cat)==="annual"?0:sem);
 const yearlyActive=cat=>activeWindow(F.year,1,cat)||activeWindow(F.year,2,cat);
 const target=cat=>cycleOf(cat)==="annual"?(yearlyActive(cat)?rate(cat):0):(activeWindow(F.year,F.semester,cat)?rate(cat):0);
 const paid=(sid,cat,sem=F.semester)=>F.payments.filter(p=>p.student_id===sid&&p.academic_year===F.year&&p.category===cat
   &&(cycleOf(cat)==="annual"||Number(p.semester)===sem)&&!p.voided_at).reduce((n,p)=>n+Number(p.amount),0)+legacy.importedPaid(sid,cat,sem);
 const bill=(s,cat)=>{const due=cat==="deposit"&&!depositSelected(s.student_id)?0:target(cat);
  const received=paid(s.student_id,cat);return {due,paid:received,balance:Math.max(0,due-received)};};
 // The semester-2 summary is for semester-2 tuition only.
 // Water and voluntary insurance are annual and must not masquerade as semester-2 fees.
 const totals=s=>{const x=cats.filter(([k])=>F.semester!==2||cycleOf(k)!=="annual").map(([k])=>bill(s,k));
  return {student:s,due:x.reduce((n,b)=>n+b.due,0),paid:x.reduce((n,b)=>n+b.paid,0),balance:x.reduce((n,b)=>n+b.balance,0)};};
 const gradeOf=name=>String(name||"").replace(/\/[^/]*$/,"");
 const rosterFiltered=()=>F.roster.filter(s=>(!F.gradeFilter||gradeOf(s.class_name)===F.gradeFilter)
 &&(F.classFilter==="all"||s.class_id===F.classFilter)&&(!F.studentFilter||s.student_id===F.studentFilter)&&feeStudentMatches(s,F.searchText));
 const scopeClasses=()=>allClasses().filter(c=>!F.gradeFilter||gradeOf(c.name)===F.gradeFilter);
 const scopeStudents=()=>F.roster.filter(s=>(!F.gradeFilter||gradeOf(s.class_name)===F.gradeFilter)
 &&(F.classFilter==="all"||s.class_id===F.classFilter)&&feeStudentMatches(s,F.searchText)).sort((a,b)=>String(a.class_name).localeCompare(String(b.class_name),"th",{numeric:true})||Number(a.student_number||0)-Number(b.student_number||0));
 const scopeName=()=>F.studentFilter?"นักเรียน "+(F.roster.find(s=>s.student_id===F.studentFilter)?.full_name||""):
 F.classFilter!=="all"?"ห้องเรียน "+(allClasses().find(c=>c.id===F.classFilter)?.name||""):
 F.gradeFilter?"ระดับชั้น "+F.gradeFilter:F.searchText.trim()?"ผลค้นหา "+F.searchText.trim():"ทุกห้องที่มีสิทธิ์";
 const sc=(v,t,selected)=>'<option value="'+e(v)+'" '+(String(v)===String(selected)?"selected":"")+'>'+e(t)+'</option>';
 const legacy=createEducationFeeLegacy({supabase,F,state,e,fmt,htmlMoney,sc,toast,renderDashboard,educationPrint,printOpts:()=>printOpts()});
 async function allPayments(){
  const rows=[];for(let i=0;i<12;i++){const {data,error}=await supabase.from("edufee_payments").select("*").eq("academic_year",F.year).order("recorded_at",{ascending:false}).range(i*1000,i*1000+999);if(error)throw error;rows.push(...(data||[]));if((data||[]).length<1000)break}return rows;
 }
 async function load(){
  F.loading=true;F.error="";
  try{
   const results=await Promise.all([
    supabase.rpc("edufee_is_manager"),supabase.rpc("edufee_is_leader"),
    supabase.rpc("edufee_roster",{p_year:F.year,p_semester:F.semester}),
    supabase.from("edufee_rates").select("*").eq("academic_year",F.year),
    supabase.from("edufee_windows").select("*").eq("academic_year",F.year),
    supabase.from("edufee_staff").select("*"),
    supabase.from("personnel_public_directory").select("user_id,full_name,role").order("full_name"),
    allPayments(),
    supabase.from("edufee_cycles").select("*").eq("academic_year",F.year),
    supabase.rpc("edufee_my_collectible_classes",{p_year:F.year,p_semester:F.semester}),
    supabase.from("edufee_deposit_choices").select("student_id,academic_year,opted_in").eq("academic_year",F.year)
   ]);
   for(const [i,label] of [[2,"ทะเบียนนักเรียน"],[3,"อัตราค่าบำรุง"],[4,"รอบการจัดเก็บ"]])if(results[i].error)throw new Error(label+": "+results[i].error.message);
   F.manager=results[0].data===true;F.admin=state.profile?.role==="super_admin";
   F.roster=results[2].data||[];F.rates=results[3].data||[];F.windows=results[4].data||[];
   if(results[8].error||results[9].error||results[10].error)throw new Error(results[8].error?.message||results[9].error?.message||results[10].error?.message);
   F.staff=results[5].data||[];F.people=results[6].data||[];F.payments=results[7]||[];
   F.cycles=results[8].data||[];F.depositChoices=results[10].data||[];
   F.collectibleClassIds=(results[9].data||[]).map(c=>c.class_id);
   F.access=results[1].data===true||F.roster.length>0||F.staff.some(s=>s.user_id===state.user?.id);await legacy.load();
   if(F.gradeFilter&&!grades().includes(F.gradeFilter))F.gradeFilter="";
   if(F.classFilter!=="all"&&!F.roster.some(s=>s.class_id===F.classFilter))F.classFilter="all";
   if(F.studentFilter&&!F.roster.some(s=>s.student_id===F.studentFilter))F.studentFilter="";
   if(F.receiveClass&&!F.roster.some(s=>s.class_id===F.receiveClass))F.receiveClass="";
  }catch(err){F.error=err.message||String(err)}finally{F.loaded=true;F.loading=false}
 }
 function feeSearchResults(){
  const term=F.searchText.trim();if(!term)return "";
  const roomOk=st=>(!F.gradeFilter||gradeOf(st.class_name)===F.gradeFilter)&&
   (F.classFilter==="all"||st.class_id===F.classFilter);
  const current=F.roster.filter(st=>roomOk(st)&&feeStudentMatches(st,term));
  const availableIds=new Set(F.roster.map(st=>st.student_id));
  const historical=F.legacyRows.filter(st=>feeStudentMatches(st,term)&&
   (F.year==="2568"||!st.student_id||!availableIds.has(st.student_id))&&
   (!F.legacyClassFilter||st.class_name===F.legacyClassFilter));
  const limit=15,items=[
   ...current.map(st=>({kind:"current",record:st})),
   ...historical.map(st=>({kind:"legacy",record:st}))
  ],shown=items.slice(0,limit);
  return '<section class="panel" aria-label="ผลการค้นหานักเรียน"><h3>ผลการค้นหา · '+e(F.year)+
   ' ('+items.length.toLocaleString("th-TH")+' รายการ)</h3>'+
   (shown.length?'<div class="edufee-search-results">'+shown.map(({kind,record:st})=>
    '<div class="edufee-room"><b>'+e(st.full_name)+'</b><span>เลขประจำตัว '+e(st.student_code||"ไม่ระบุ")+
    ' · '+e(st.class_name||"ไม่ระบุห้อง")+'</span><span>'+
    (kind==="current"?'<button class="btn btn-ghost btn-sm" data-fee-search-detail="'+e(st.student_id)+'">ดูรายละเอียด</button>'+
    (canCollect(st.class_id)?'<button class="btn btn-primary btn-sm" data-fee-search-collect="'+e(st.student_id)+'">บันทึกรับเงิน</button>':""):
    '<button class="btn btn-ghost btn-sm" data-fee-search-legacy="'+e(st.id)+'">ดูยอดจากชีต</button>')+
    '</span></div>').join("")+'</div>':'<p class="edufee-empty">ไม่พบชื่อนักเรียนหรือเลขประจำตัวที่ค้นหาในปีการศึกษานี้</p>')+
   (items.length>limit?'<p class="helper">แสดง '+limit+' รายการแรก กรุณาพิมพ์ชื่อหรือรหัสเพิ่มเพื่อจำกัดผลลัพธ์</p>':"")+'</section>';
 }
 const scope=()=>'<div class="edufee-filter"><label>ปีการศึกษา <select id="edufee-year">'+
  [F.year,"2568","2569",...(state.academicTerms||[]).map(x=>String(x.academic_year))].filter((x,i,a)=>a.indexOf(x)===i).map(x=>sc(x,x,F.year)).join("")+
  '</select></label><label>ภาคเรียน <select id="edufee-sem">'+sc("1","ภาคเรียนที่ 1",F.semester)+sc("2","ภาคเรียนที่ 2",F.semester)+'</select></label>'+
  '<label>ระดับชั้น <select id="edufee-scope-grade">'+sc("","ทุกระดับชั้น",F.gradeFilter)+grades().map(g=>sc(g,g,F.gradeFilter)).join("")+'</select></label>'+
  '<label>ห้องเรียน <select id="edufee-class">'+sc("all","ทุกห้อง",F.classFilter)+scopeClasses().map(x=>sc(x.id,x.name,F.classFilter)).join("")+'</select></label>'+
  '<label>นักเรียน <select id="edufee-scope-student">'+sc("","นักเรียนทุกคน",F.studentFilter)+scopeStudents().map(x=>sc(x.student_id,x.full_name+" · "+x.class_name,F.studentFilter)).join("")+'</select></label></div><div class="edufee-filter"><label style="flex:1">ค้นหานักเรียนทุกปีการศึกษา (ชื่อ–นามสกุล / เลขประจำตัว)'+
  '<input class="input" id="edufee-search" type="search" autocomplete="off" aria-label="ค้นหาชื่อนักเรียนหรือเลขประจำตัว" placeholder="พิมพ์ชื่อ–นามสกุล หรือเลขประจำตัวนักเรียน" value="'+e(F.searchText)+'"></label></div><p class="helper">ค่าน้ำและค่าประกันเป็นยอดรายปี ไม่ใช่เงินค่าเทอม 2 · ค่าประกันคิดเฉพาะผู้สมัครใจเท่านั้น</p>';
 const stats=()=>{const all=rosterFiltered().map(totals),due=all.reduce((n,x)=>n+x.due,0),got=all.reduce((n,x)=>n+x.paid,0),rest=all.reduce((n,x)=>n+x.balance,0),complete=all.filter(x=>x.balance===0&&x.due>0).length;return {all,due,got,rest,complete}};
 const status=row=>row.due<=0?"ยังไม่เปิดเก็บ":row.balance<=0?"ชำระครบ":row.paid>0?"ชำระบางส่วน":"ยังไม่ชำระ";
 function feeRows(s){return cats.map(([k,name])=>{const b=bill(s,k);
  const label=cycleOf(k)==="annual"?(F.semester===2?" · รายปี (ไม่รวมยอดเทอม 2)":" · รวมทั้งปี"):" · ภาคเรียนที่ "+F.semester;
  return '<tr><td>'+name+label+'</td><td class="num">'+fmt(b.due)+'</td><td class="num">'+fmt(b.paid)+'</td><td class="num">'+fmt(b.balance)+'</td></tr>'}).join("")}
 const colhead='<thead><tr><th>นักเรียน</th><th>ห้อง</th><th class="num">ต้องชำระ</th><th class="num">รับแล้ว</th><th class="num">คงค้าง</th><th>สถานะ</th><th>ดูรายการ</th></tr></thead>';
 function rosterTable(rows){
  return '<div class="table-wrap"><table class="table edufee-table">'+colhead+'<tbody>'+rows.map(r=>'<tr><td>'+e(r.student.full_name)+'</td><td>'+e(className(r.student))+'</td><td class="num">'+fmt(r.due)+'</td><td class="num">'+fmt(r.paid)+'</td><td class="num">'+fmt(r.balance)+'</td><td><span class="edufee-pill '+(r.balance<=0?"ok":r.paid>0?"half":"pending")+'">'+status(r)+'</span></td><td><button class="btn btn-ghost" data-fee-person="'+e(r.student.student_id)+'">รายละเอียด</button></td></tr>').join("")+'</tbody></table></div>'
 }
 const noRates=()=>!cats.some(x=>target(x[0])>0);
 function dashboard(){
  if(F.year==="2568")return legacy.view();
  const m=stats(),pct=m.due?Math.max(0,Math.min(100,m.got/m.due*100)):0;
  return '<div class="edufee-statgrid">'+[
   ["ยอดที่ต้องจัดเก็บ",htmlMoney(m.due)],["รับชำระแล้ว",htmlMoney(m.got)],["คงค้าง",htmlMoney(m.rest)],["ชำระครบ",m.complete.toLocaleString("th-TH")+" คน"]
  ].map(([k,v])=>'<article class="edufee-stat"><span>'+k+'</span><strong>'+v+'</strong></article>').join("")+'</div>'+
  (noRates()?'<div class="edufee-notice">ยังไม่มีอัตราที่เปิดจัดเก็บในรอบนี้ โปรดตั้งค่าอัตราและเปิดรายการก่อนเริ่มรับเงิน</div>':"")+
  '<div class="edufee-chartgrid"><section class="panel"><h3>สัดส่วนยอดจัดเก็บ</h3><div class="edufee-ring" style="--p:'+pct+'%"><div><strong>'+pct.toFixed(1)+'%</strong><small>รับชำระ</small></div></div><p class="edufee-legend">รับแล้ว '+fmt(m.got)+' บาท · คงค้าง '+fmt(m.rest)+' บาท</p></section><section class="panel"><h3>สรุปตามประเภทเงิน</h3>'+cats.filter(([k])=>F.semester!==2||cycleOf(k)!=="annual").map(([k,name])=>{const b=m.all.reduce((n,r)=>{const x=bill(r.student,k);n.due+=x.due;n.paid+=x.paid;return n},{due:0,paid:0});const pct=b.due?Math.min(100,b.paid/b.due*100):0;return '<div class="edufee-bar"><div><b>'+name+'</b><span>'+fmt(b.paid)+' / '+fmt(b.due)+' บาท</span></div><i><em style="width:'+pct+'%"></em></i></div>'}).join("")+'</section></div>'+
  '<section class="panel"><h3>ภาพรวมรายห้อง</h3>'+allClasses().filter(c=>F.classFilter==="all"||c.id===F.classFilter).map(c=>{const rows=m.all.filter(v=>v.student.class_id===c.id),due=rows.reduce((n,v)=>n+v.due,0),got=rows.reduce((n,v)=>n+v.paid,0);return '<button class="edufee-room" data-fee-room="'+e(c.id)+'"><b>'+e(c.name)+'</b><span>'+rows.length+' คน</span><span>รับแล้ว '+fmt(got)+' ฿</span><span>คงค้าง '+fmt(Math.max(0,due-got))+' ฿</span></button>'}).join("")+'</section>'
 }
 function selector(){
  return '<div class="edufee-selector"><label>๑. ระดับชั้น<select id="edufee-grade"><option value="">— เลือกระดับชั้น —</option>'+grades().map(x=>sc(x,x,F.receiveGrade)).join("")+'</select></label><label>๒. ห้องเรียน<select id="edufee-room" '+(!F.receiveGrade?"disabled":"")+'><option value="">— เลือกห้อง —</option>'+rooms().map(x=>sc(x.id,x.name,F.receiveClass)).join("")+'</select></label><label>๓. ชื่อนักเรียน<select id="edufee-student" '+(!F.receiveClass?"disabled":"")+'><option value="">— เลือกนักเรียน —</option>'+selectedRooms().map(s=>sc(s.student_id,(s.student_number?"เลขที่ "+s.student_number+" · ":"")+s.full_name,F.receiveStudent)).join("")+'</select></label></div>';
 }
 function collect(){
  const s=F.roster.find(x=>x.student_id===F.receiveStudent&&x.class_id===F.receiveClass);
  return '<section class="panel"><h3>รับชำระเงินจากผู้ปกครอง</h3><p>เลือกชั้น → ห้อง → นักเรียน รายชื่อจะเปลี่ยนตามห้องเรียนจริง</p>'+selector()+
  (s?'<div class="edufee-person-head"><strong>'+e(s.full_name)+'</strong><span>เลขประจำตัว '+e(s.student_code||"—")+' · '+e(s.class_name)+'</span><span>ผู้ปกครอง '+e(s.guardian_name||"—")+'</span></div>'+
  (canCollect(s.class_id)?'<div class="edufee-notice"><label><input type="checkbox" data-fee-insurance-option="'+e(s.student_id)+'" '+(depositSelected(s.student_id)?"checked":"")+'> สมัครใจทำประกันรายปี (เลือกได้เป็นรายนักเรียน)</label></div><form id="edufee-payment"><h3>เลือกประเภทที่ต้องการรับเงิน</h3><p class="helper">ติ๊กเฉพาะรายการที่รับเงินจริง สามารถแก้จำนวนเงินเพื่อรับชำระบางส่วนได้</p>'+
  cats.map(([k,name])=>{const b=bill(s,k),enabled=activeWindow(F.year,F.semester,k)&&b.balance>0&&rate(k)>0;
   const cycle=cycleOf(k)==="annual"?"รายปีการศึกษา":"รายภาคเรียน";
   return '<div class="edufee-payrow"><label><input type="checkbox" name="selected" value="'+k+'" '+(!enabled?"disabled":"")+'> <b>'+name+'</b><small>'+cycle+'</small></label><div><span>ยอดค้าง '+fmt(b.balance)+' ฿</span><input type="number" name="amount_'+k+'" min="0.01" max="'+b.balance+'" step="0.01" value="'+b.balance+'" '+(!enabled?"disabled":"")+'></div><small>'+(enabled?"พร้อมรับชำระ":(!activeWindow(F.year,F.semester,k)?"ไม่เปิดเก็บในเทอมนี้":b.balance===0?"ชำระครบแล้ว":"กรุณาตั้งค่าอัตรา"))+'</small></div>'
  }).join("")+'<div class="edufee-fields"><label>วันที่รับเงินจริง<input name="paid_on" type="date" required value="'+new Date().toLocaleDateString("en-CA",{timeZone:"Asia/Bangkok"})+'"></label><label>ผู้ชำระเงิน<input name="payer" maxlength="120" value="'+e(s.guardian_name||"")+'"></label><label class="wide">หมายเหตุ / กรณีบันทึกย้อนหลัง<textarea name="note" maxlength="500" placeholder="เช่น รับเงินภาคเรียนที่ 1 ก่อนเริ่มใช้งานระบบ"></textarea></label></div><button class="btn btn-primary" type="submit" '+(F.pending?"disabled":"")+'>บันทึกรับเงิน</button></form>':'<div class="edufee-notice">บัญชีนี้ยังไม่มีสิทธิ์รับเงินของห้องนี้</div>')+
  '<section class="edufee-subtable"><h3>สถานะการชำระเงิน</h3><div class="table-wrap"><table class="table"><thead><tr><th>รายการ</th><th class="num">ต้องชำระ</th><th class="num">จ่ายแล้ว</th><th class="num">ค้าง</th></tr></thead><tbody>'+feeRows(s)+'</tbody></table></div></section>'
  :'<div class="edufee-empty">เลือกนักเรียนเพื่อเริ่มรับเงินและดูยอดคงค้าง</div>')+'</section>'
 }
 function history(){
  const people=rosterFiltered(),allowed=new Set(people.map(x=>x.student_id));
  const p=F.payments.filter(x=>allowed.has(x.student_id)&&(!F.historyStudent||x.student_id===F.historyStudent)
   &&(F.historyTerm==="all"||Number(x.semester)===Number(F.historyTerm)))
  .sort((a,b)=>(F.historyOrder==="oldest"?1:-1)*(
    String(a.paid_on).localeCompare(String(b.paid_on))||Number(a.sequence_no)-Number(b.sequence_no)));
  return '<section class="panel"><h3>ประวัติการรับเงินและใบรับเงิน</h3>'+
  '<p class="helper">ใช้ตัวกรองด้านบนเพื่อดูทั้งโรงเรียน รายชั้น รายห้อง หรือรายบุคคล และเลือกเรียงจากรายการรับเงินล่าสุดหรือเก่าสุด</p>'+
  '<div class="edufee-filter"><label>นักเรียน<select id="edufee-history-student">'+sc("","ทุกคน",F.historyStudent)+people.map(x=>sc(x.student_id,x.full_name+" · "+x.class_name,F.historyStudent)).join("")+'</select></label>'+
  '<label>รายการรับเงินของภาคเรียน<select id="edufee-history-term">'+sc("all","ทุกภาคเรียน",F.historyTerm)+sc("1","ภาคเรียนที่ 1",F.historyTerm)+sc("2","ภาคเรียนที่ 2",F.historyTerm)+'</select></label>'+
  '<label>เรียงตามวันที่รับเงิน<select id="edufee-history-order">'+sc("newest","ล่าสุดก่อน",F.historyOrder)+sc("oldest","เก่าสุดก่อน",F.historyOrder)+'</select></label></div>'+
  '<div class="table-wrap"><table class="table edufee-table"><thead><tr><th>เลขอ้างอิง</th><th>วันที่รับจริง</th><th>นักเรียน</th><th>รายการ</th><th>ภาคเรียน</th><th class="num">จำนวน</th><th>ผู้บันทึก/สถานะ</th><th>เอกสาร</th></tr></thead><tbody>'+
  p.map(x=>{const s=people.find(s=>s.student_id===x.student_id);return '<tr><td>'+e(x.sequence_no)+'</td><td>'+e(x.paid_on)+'</td><td>'+e(s?.full_name||"")+'</td><td>'+catName(x.category)+'</td><td>'+(cycleOf(x.category)==="annual"?"รายปี":"เทอม "+e(x.semester))+'</td><td class="num">'+fmt(x.amount)+'</td><td>'+e(F.people.find(z=>z.user_id===x.recorded_by)?.full_name||"—")+(x.voided_at?'<br><strong class="edufee-void">ยกเลิกแล้ว</strong>':'')+'</td><td><button class="btn btn-ghost" data-fee-receipt="'+e(x.id)+'">ใบรับเงิน</button>'+(F.manager&&!x.voided_at?'<button class="btn btn-ghost" data-fee-void="'+e(x.id)+'">ยกเลิก</button>':'')+'</td></tr>'}).join("")+
  '</tbody></table></div>'+(p.length?"":'<p class="edufee-empty">ยังไม่มีรายการรับชำระในขอบเขตที่เลือก</p>')+'</section>';
 }
 function register(){
  const students=rosterFiltered(),rows=students.map(totals);
  const insurance=students.map(st=>{const b=bill(st,"deposit"),chosen=depositSelected(st.student_id);
    return '<tr><td>'+e(st.full_name)+'</td><td>'+e(st.class_name)+'</td><td>'+
      (canCollect(st.class_id)?'<label><input type="checkbox" data-fee-insurance-option="'+e(st.student_id)+'" '+(chosen?"checked":"")+'> '+(chosen?"เลือกทำประกัน":"ยังไม่เลือกทำประกัน")+'</label>':
      (chosen?"เลือกทำประกัน":"ยังไม่เลือกทำประกัน"))+'</td>'+
      '<td class="num">'+fmt(b.due)+'</td><td class="num">'+fmt(b.paid)+'</td><td class="num">'+fmt(b.balance)+'</td></tr>';
  }).join("");
  return '<section class="panel"><div class="edufee-head"><h3>ทะเบียนสถานะการชำระเงินรายบุคคล</h3><button class="btn btn-ghost" id="edufee-csv">ส่งออก Excel (CSV)</button></div>'+rosterTable(rows)+'</section>'+
   '<section class="panel"><div class="edufee-head"><h3>ค่าประกันรายปี · สมัครใจเป็นรายนักเรียน</h3><button class="btn btn-primary" id="edufee-deposit-pdf">PDF รายชื่อค่าประกันแยกต่างหาก</button></div>'+
   '<p class="helper">ติ๊กเครื่องหมายถูกเฉพาะนักเรียนที่สมัครใจทำประกัน ไม่เลือก = ไม่เรียกเก็บค่าประกัน ไม่สร้างหนี้ และไม่กระทบค่าบำรุงรายเทอมหรือค่าน้ำ</p>'+
   '<div class="table-wrap"><table class="table"><thead><tr><th>ชื่อ–นามสกุล</th><th>ห้อง</th><th>สมัครใจทำประกัน</th><th>ต้องชำระรายปี</th><th>รับแล้วรายปี</th><th>ค้างรายปี</th></tr></thead><tbody>'+
   insurance+'</tbody></table></div></section>';
 }
 function person(){
  const s=F.roster.find(s=>s.student_id===F.historyStudent);if(!s)return history();
  const m=totals(s);return '<section class="panel"><button class="btn btn-ghost" id="edufee-person-back">ย้อนกลับทะเบียน</button><button class="btn btn-primary" id="edufee-person-pdf">รายงาน PDF รายบุคคล</button><h3>'+e(s.full_name)+' · '+e(s.class_name)+'</h3><div class="edufee-statgrid"><article class="edufee-stat"><span>รวมต้องชำระ</span><strong>'+htmlMoney(m.due)+'</strong></article><article class="edufee-stat"><span>รับแล้ว</span><strong>'+htmlMoney(m.paid)+'</strong></article><article class="edufee-stat"><span>ค้างชำระ</span><strong>'+htmlMoney(m.balance)+'</strong></article></div><div class="table-wrap"><table class="table"><thead><tr><th>รายการ</th><th class="num">ต้องชำระ</th><th class="num">รับแล้ว</th><th class="num">ค้าง</th></tr></thead><tbody>'+feeRows(s)+'</tbody></table></div></section>'+history();
 }
 function settings(){
  if(!F.manager)return '<section class="panel"><div class="edufee-empty">เฉพาะผู้ดูแลด้านการเงินที่ได้รับสิทธิ์เท่านั้น</div></section>';
  return '<section class="panel"><h3>กำหนดประเภทและรอบการจัดเก็บ · ปีการศึกษา '+e(F.year)+'</h3>'+
   '<p class="helper">แต่ละประเภทเลือกรายปีหรือรายภาคเรียนได้เอง ตั้งจำนวนเงินตามรอบที่เลือก และเปิดรายการเก็บเงินแยกแต่ละเทอมด้านล่าง</p>'+
   '<form id="edufee-settings-rates" class="edufee-plan-form">'+cats.map(([k,name])=>{
    const cycle=cycleOf(k),locked=k==="deposit"||k==="water"||F.payments.some(p=>p.category===k);
    return '<div class="edufee-plan"><div class="edufee-plan-head"><h4>'+name+'</h4>'+
      '<label>รอบจัดเก็บ<select name="cycle_'+k+'" data-fee-cycle="'+k+'" '+(locked?"disabled":"")+'>'+
      sc("annual","รายปีการศึกษา",cycle)+sc("semester","รายภาคเรียน",cycle)+'</select></label></div>'+
      (locked?'<p class="edufee-locked">มีประวัติรับเงินจริงแล้ว จึงล็อกรอบจัดเก็บของปีนี้เพื่อคุ้มครองยอดที่บันทึกไว้ (ยังปรับอัตราได้โดยไม่ต่ำกว่ายอดรับจริง)</p>':'')+
      '<div class="edufee-plan-amounts"><label data-fee-cycle-amount="'+k+'_0" '+(cycle==="semester"?"hidden":"")+' >อัตรารายปี (บาท)<input name="rate_'+k+'_0" type="number" min="0" max="1000000" step="0.01" value="'+rateFor(k,0)+'"></label>'+
      '<label data-fee-cycle-amount="'+k+'_1" '+(cycle==="annual"?"hidden":"")+' >อัตราภาคเรียนที่ 1 (บาท)<input name="rate_'+k+'_1" type="number" min="0" max="1000000" step="0.01" value="'+rateFor(k,1)+'"></label>'+
      '<label data-fee-cycle-amount="'+k+'_2" '+(cycle==="annual"?"hidden":"")+' >อัตราภาคเรียนที่ 2 (บาท)<input name="rate_'+k+'_2" type="number" min="0" max="1000000" step="0.01" value="'+rateFor(k,2)+'"></label></div></div>';
   }).join("")+'<button type="submit" class="btn btn-primary">บันทึกอัตราและรอบจัดเก็บ</button></form></section>'+
  '<section class="panel"><h3>เปิด / ปิดการจัดเก็บรายเทอม</h3><p class="helper">รายการรายปีจ่ายครั้งเดียวในปีการศึกษา โดยเลือกเทอมที่อนุญาตให้รับเงินได้ ไม่คิดยอดซ้ำเมื่อชำระแล้ว</p><form id="edufee-settings-windows"><div class="edufee-windowgrid">'+
  [1,2].map(sem=>'<div><h4>ภาคเรียนที่ '+sem+'</h4>'+cats.map(([k,name])=>'<label class="edufee-switch"><input type="checkbox" name="window_'+sem+'_'+k+'" '+(activeWindow(F.year,sem,k)?"checked":"")+'> '+name+'</label>').join("")+'</div>').join("")+
  '</div><button class="btn btn-primary">บันทึกการเปิด / ปิด</button></form></section>'+
  '<section class="panel"><h3>ผู้รับผิดชอบการเงิน</h3><p>ครูประจำชั้นสามารถดูและรับเงินของห้องที่ได้รับมอบหมายอยู่แล้วโดยอัตโนมัติ ส่วนสิทธิ์ผู้รับเงินเพิ่มเติมสามารถแต่งตั้งได้ที่นี่</p>'+
  (F.admin?'<form id="edufee-staff-form" class="edufee-staff-form"><select name="user_id" required>'+sc("","เลือกบุคลากร",null)+F.people.filter(x=>x.user_id).map(x=>sc(x.user_id,x.full_name,null)).join("")+'</select><select name="role" id="edufee-staff-role">'+sc("collector","ผู้รับเงิน",null)+sc("manager","ผู้ดูแลการเงิน",null)+'</select><select name="class_id"><option value="">ทุกห้อง</option>'+allClasses().map(c=>sc(c.id,c.name,"")).join("")+'</select><button class="btn btn-primary">มอบหมายสิทธิ์</button></form>':'')+
  '<div class="edufee-stafflist">'+F.staff.map(x=>'<div><strong>'+e(F.people.find(v=>v.user_id===x.user_id)?.full_name||"บุคลากร")+'</strong><span>'+(x.role==="manager"?"ผู้ดูแลการเงิน":"ผู้รับเงิน")+' · '+e(allClasses().find(c=>c.id===x.class_id)?.name||"ทุกห้อง")+'</span>'+(F.admin?'<button class="btn btn-ghost" data-fee-revoke="'+e(x.id)+'">ถอนสิทธิ์</button>':"")+'</div>').join("")+'</div></section>';
 }
 const tabs=()=>{const arr=[["dashboard","Dashboard"],["registry","ทะเบียนการชำระเงิน"],["history","ประวัติ / ใบรับเงิน"],["reports","รายงาน"]];if(F.year!=="2568"&&(F.manager||F.collectibleClassIds.length))arr.splice(1,0,["collect","บันทึกรับเงิน"]);if(F.manager||F.legacyRows.length)arr.push(["legacy","ยอดย้อนหลังจากชีต"]);if(F.manager)arr.push(["settings","ตั้งค่าการจัดเก็บ"]);return '<div class="edufee-tabs">'+arr.map(([k,n])=>'<button data-fee-tab="'+k+'" class="'+(k===F.tab?"active":"")+'">'+n+'</button>').join("")+'</div>'};
 function view(){
  const hero='<div class="edufee-hero"><div><small>กลุ่มงานบริหารแผนและงบประมาณ</small><h2>ระบบจัดเก็บค่าบำรุงการศึกษา</h2><p>ค่าบำรุงการศึกษา · ค่าประกัน · ค่าน้ำ · เชื่อมทะเบียนนักเรียน BNK SCHOOL OS</p></div><img src="./school-logo.png" alt="ตราโรงเรียน"></div>';
  if(F.loading)return hero+'<section class="panel">กำลังโหลดข้อมูลการรับชำระ…</section>';
  if(F.error)return hero+'<section class="panel"><h3>เกิดข้อผิดพลาดในการโหลดข้อมูล</h3><p>'+e(F.error)+'</p><button class="btn btn-ghost" id="edufee-reload">ลองใหม่</button></section>';
  if(!F.access)return hero+'<section class="panel"><h3>ยังไม่ได้รับสิทธิ์ใช้งาน</h3><p>กรุณาให้ Super Admin แต่งตั้งผู้รับผิดชอบการเงิน หรือใช้บัญชีผู้บริหารที่ได้รับสิทธิ์ดูรายงาน</p></section>';
  const contents=F.tab==="legacy"||(F.year==="2568"&&F.tab!=="settings")?legacy.view():F.tab==="dashboard"?dashboard():F.tab==="collect"?collect():F.tab==="registry"?register():F.tab==="person"?person():F.tab==="history"?history():F.tab==="settings"?settings():
   '<section class="panel"><h3>รายงานสรุปทั้งโรงเรียน รายชั้น รายห้อง และรายบุคคล</h3><p>เลือกปีการศึกษา ภาคเรียน ระดับชั้น ห้องเรียน หรือชื่อผู้เรียนจากตัวกรอง แล้วส่งออกเอกสาร</p><div class="edufee-actions"><button class="btn btn-primary" id="edufee-print-report">พิมพ์รายงาน A4 / PDF</button><button class="btn btn-ghost" id="edufee-csv">ส่งออก Excel (CSV)</button></div>'+rosterTable(rosterFiltered().map(totals))+'</section>';
  return hero+tabs()+scope()+feeSearchResults()+contents;
 }
 const rerender=()=>renderDashboard();
 // Local search must not trigger the global dashboard's expensive fee reload,
 // metrics RPC or unrelated module rebinds on every Thai character.
 function renderSearchLocally(){
  const region=document.querySelector(".dashboard .content");
  if(!region||!region.querySelector("#edufee-search"))return rerender();
  region.innerHTML=view();
  bind();
 }

 function exportCSV(){
  const columns=["รหัสนักเรียน","ชื่อ-นามสกุล","ห้อง","ค่าเทอมต้องชำระ","ค่าเทอมรับแล้ว","สมัครใจทำประกันรายปี","ค่าประกันรายปีต้องชำระ","ค่าประกันรายปีรับแล้ว","ค่าน้ำรายปีต้องชำระ","ค่าน้ำรายปีรับแล้ว","รวมเฉพาะรอบที่เลือกต้องชำระ","รับแล้วเฉพาะรอบที่เลือก","คงค้างเฉพาะรอบที่เลือก"];
  const safe=v=>{const x=String(v??"");return '"'+(/^[=+@\-\t\r]/.test(x)?"'"+x:x).replace(/"/g,'""')+'"';};
  const rows=rosterFiltered().map(s=>[s.student_code,s.full_name,s.class_name,bill(s,"tuition").due,bill(s,"tuition").paid,depositSelected(s.student_id)?"ทำ":"ไม่ทำ",bill(s,"deposit").due,bill(s,"deposit").paid,bill(s,"water").due,bill(s,"water").paid,totals(s).due,totals(s).paid,totals(s).balance]);
  const blob=new Blob(["\ufeff"+[columns,...rows].map(row=>row.map(safe).join(",")).join("\r\n")],{type:"text/csv;charset=utf-8"});
  const url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download="BNK_education_fees_"+F.year+"_term_"+F.semester+".csv";a.click();URL.revokeObjectURL(url);
 }
 const printOpts=()=>({fontsCss:officialPdfFontFaceCss(),ensureFont:ensureOfficialPdfFont,toast});
 function depositPdf(){
  const rows=rosterFiltered().map(st=>({student:st,opted_in:depositSelected(st.student_id),...bill(st,"deposit")}));
  educationPrint({type:"deposit",data:{rows,year:F.year,scope:scopeName(),schoolName:state.systemSettings?.school_name_th},...printOpts()});
 }
 function reportPdf(){
  const rows=rosterFiltered().map(totals);
  const isIndividual=rows.length===1&&Boolean(F.studentFilter||(F.tab==="person"&&F.historyStudent));
  const person=F.tab==="person"&&F.historyStudent?F.roster.find(s=>s.student_id===F.historyStudent):rows[0]?.student;
  const payments=F.payments.filter(p=>p.student_id===person?.student_id);
  educationPrint({type:isIndividual?"individual":"summary",data:{
   rows,student:person,payments,year:F.year,semester:F.semester,scope:scopeName(),schoolName:state.systemSettings?.school_name_th,
   categoryRows:person?cats.map(([k,name])=>({name,cycle:cycleOf(k),...bill(person,k)})):[]
  },...printOpts()});
 }
 function receiptPdf(id){
  const p=F.payments.find(x=>x.id===id),s=F.roster.find(x=>x.student_id===p?.student_id);if(!p||!s)return toast("ไม่พบรายการ","ไม่สามารถสร้างใบรับเงิน","error");
  const collector=F.people.find(x=>x.user_id===p.recorded_by)?.full_name||"";
  educationPrint({type:"receipt",data:{payment:p,student:s,schoolName:state.systemSettings?.school_name_th,collectorName:collector},...printOpts()});
 }
 function bind(){
  document.querySelector("#edufee-reload")?.addEventListener("click",async()=>{await load();rerender()});
  document.querySelectorAll("[data-fee-tab]").forEach(b=>b.addEventListener("click",()=>{F.tab=b.dataset.feeTab;F.historyStudent="";rerender()}));
  document.querySelector("#edufee-year")?.addEventListener("change",async ev=>{F.year=ev.target.value;F.tab="dashboard";F.legacyClassFilter="";F.legacyStatusFilter="all";F.legacySearch="";F.searchText="";F.gradeFilter="";F.classFilter="all";F.studentFilter="";F.receiveGrade=F.receiveClass=F.receiveStudent="";await load();rerender()});
  document.querySelector("#edufee-sem")?.addEventListener("change",async ev=>{F.semester=Number(ev.target.value);F.gradeFilter="";F.classFilter="all";F.studentFilter="";F.receiveGrade=F.receiveClass=F.receiveStudent="";await load();rerender()});
  const updateSearch=ev=>{
   if(ev.isComposing)return;
   const source=ev.currentTarget,term=source.value;
   if(F.searchText===term)return;
   const start=source.selectionStart,end=source.selectionEnd;
   F.searchText=term;renderSearchLocally();
   const next=document.querySelector("#edufee-search");
   if(next){next.focus();if(start!==null&&end!==null)next.setSelectionRange(start,end);}
  };
  document.querySelector("#edufee-search")?.addEventListener("input",updateSearch);
  document.querySelector("#edufee-search")?.addEventListener("compositionend",updateSearch);
  document.querySelectorAll("[data-fee-search-detail]").forEach(b=>b.addEventListener("click",()=>{
   F.historyStudent=b.dataset.feeSearchDetail;F.tab="person";rerender();
  }));
  document.querySelectorAll("[data-fee-search-collect]").forEach(b=>b.addEventListener("click",()=>{
   const st=F.roster.find(x=>x.student_id===b.dataset.feeSearchCollect);
   if(!st||!canCollect(st.class_id))return;
   F.tab="collect";F.receiveGrade=gradeOf(st.class_name);F.receiveClass=st.class_id;F.receiveStudent=st.student_id;rerender();
  }));
  document.querySelectorAll("[data-fee-search-legacy]").forEach(b=>b.addEventListener("click",()=>{
   const st=F.legacyRows.find(x=>x.id===b.dataset.feeSearchLegacy);if(!st)return;
   F.tab="legacy";F.legacyClassFilter=st.class_name;F.legacyStatusFilter="all";rerender();
  }));
  document.querySelector("#edufee-scope-grade")?.addEventListener("change",ev=>{F.gradeFilter=ev.target.value;F.classFilter="all";F.studentFilter="";F.historyStudent="";rerender()});
  document.querySelector("#edufee-class")?.addEventListener("change",ev=>{F.classFilter=ev.target.value;F.studentFilter="";F.historyStudent="";rerender()});
  document.querySelector("#edufee-scope-student")?.addEventListener("change",ev=>{F.studentFilter=ev.target.value;F.historyStudent="";rerender()});
  document.querySelectorAll("[data-fee-room]").forEach(b=>b.onclick=()=>{F.classFilter=b.dataset.feeRoom;F.gradeFilter=gradeOf(allClasses().find(c=>c.id===F.classFilter)?.name);F.studentFilter="";F.tab="registry";rerender()});
  document.querySelectorAll("[data-fee-person]").forEach(b=>b.onclick=()=>{F.historyStudent=b.dataset.feePerson;F.tab="person";rerender()});
  document.querySelector("#edufee-person-back")?.addEventListener("click",()=>{F.historyStudent="";F.tab="registry";rerender()});
  document.querySelector("#edufee-grade")?.addEventListener("change",ev=>{F.receiveGrade=ev.target.value;F.receiveClass="";F.receiveStudent="";rerender()});
  document.querySelector("#edufee-room")?.addEventListener("change",ev=>{F.receiveClass=ev.target.value;F.receiveStudent="";rerender()});
  document.querySelector("#edufee-student")?.addEventListener("change",ev=>{F.receiveStudent=ev.target.value;rerender()});
   document.querySelectorAll("[data-fee-insurance-option]").forEach(box=>box.addEventListener("change",async ev=>{
    const id=ev.currentTarget.dataset.feeInsuranceOption,st=F.roster.find(x=>x.student_id===id);
    if(!st||!canCollect(st.class_id)){rerender();return;}
    const chosen=ev.currentTarget.checked;
    if(!confirm("ยืนยัน"+(chosen?"สมัครใจทำประกัน":"ยกเลิกการเลือกทำประกัน")+" รายปีของ "+st.full_name+"?")){rerender();return;}
    ev.currentTarget.disabled=true;
    const {error}=await supabase.rpc("edufee_set_deposit_choice",{p_student:id,p_year:F.year,p_opted_in:chosen});
    if(error){rerender();return toast("เปลี่ยนสถานะค่าประกันไม่สำเร็จ",error.message,"error");}
    await load();rerender();toast("บันทึกการเลือกทำประกันรายปีแล้ว","","success");
   }));
  document.querySelector("#edufee-history-student")?.addEventListener("change",ev=>{F.historyStudent=ev.target.value;rerender()});
  document.querySelector("#edufee-history-term")?.addEventListener("change",ev=>{F.historyTerm=ev.target.value;rerender()});
  document.querySelector("#edufee-history-order")?.addEventListener("change",ev=>{F.historyOrder=ev.target.value;rerender()});
  document.querySelectorAll("[data-fee-cycle]").forEach(sel=>sel.addEventListener("change",()=>{
   const k=sel.dataset.feeCycle;
   document.querySelectorAll("[data-fee-cycle-amount^='"+k+"_']").forEach(label=>{
    const n=Number(label.dataset.feeCycleAmount.split("_").pop());
    label.hidden=sel.value==="annual"?n!==0:n===0;
   });
  }));
  document.querySelector("#edufee-csv")?.addEventListener("click",exportCSV);
   document.querySelector("#edufee-deposit-pdf")?.addEventListener("click",depositPdf);
  document.querySelector("#edufee-print-report")?.addEventListener("click",reportPdf);
  document.querySelector("#edufee-person-pdf")?.addEventListener("click",()=>{
   const s=F.roster.find(s=>s.student_id===F.historyStudent);
   if(!s)return;
   educationPrint({type:"individual",data:{
    student:s,categoryRows:cats.map(([k,name])=>({name,cycle:cycleOf(k),...bill(s,k)})),
    payments:F.payments.filter(p=>p.student_id===s.student_id),
    year:F.year,semester:F.semester,schoolName:state.systemSettings?.school_name_th
   },...printOpts()});
  });
  document.querySelectorAll("[data-fee-receipt]").forEach(b=>b.onclick=()=>receiptPdf(b.dataset.feeReceipt));
  document.querySelectorAll("[data-fee-void]").forEach(b=>b.onclick=async()=>{
   const reason=prompt("ระบุเหตุผลการยกเลิกรายการ (อย่างน้อย 8 ตัวอักษร)");if(!reason)return;
   const {error}=await supabase.rpc("edufee_void_payment",{p_id:b.dataset.feeVoid,p_reason:reason});
   if(error)return toast("ยกเลิกไม่สำเร็จ",error.message,"error");await load();rerender();toast("ยกเลิกรายการแล้ว","","success");
  });
  document.querySelector("#edufee-payment")?.addEventListener("submit",async ev=>{
   ev.preventDefault();if(F.pending)return;
   const s=F.roster.find(x=>x.student_id===F.receiveStudent&&x.class_id===F.receiveClass);
   if(!s||!canCollect(s.class_id))return toast("ไม่มีสิทธิ์รับเงิน","กรุณาตรวจสอบห้องเรียน","error");
   const form=ev.currentTarget,d=new FormData(form),items=d.getAll("selected");if(!items.length)return toast("ยังไม่ได้เลือกรายการ","ติ๊กรายการที่รับเงินอย่างน้อยหนึ่งประเภท","error");
   const paidOn=String(d.get("paid_on")||""),notes=String(d.get("note")||"");
   const requests=items.map(k=>({k,amount:Number(d.get("amount_"+k)),request:crypto.randomUUID()}));
   for(const item of requests)if(!Number.isFinite(item.amount)||item.amount<=0||item.amount>bill(s,item.k).balance)return toast("จำนวนเงินไม่ถูกต้อง","ตรวจสอบจำนวนเงิน "+catName(item.k),"error");
   if(!confirm("ยืนยันรับเงินจริง "+fmt(requests.reduce((n,x)=>n+x.amount,0))+" บาท จาก "+s.full_name+" หรือไม่?"))return;
   F.pending=true;form.querySelector("[type=submit]").disabled=true;
   let done=0;
   for(const item of requests){
    const {error}=await supabase.rpc("edufee_record_payment",{p_student:s.student_id,p_class:s.class_id,p_year:F.year,p_semester:F.semester,p_category:item.k,p_amount:item.amount,p_paid_on:paidOn,p_payer:String(d.get("payer")||""),p_note:notes,p_request:item.request});
    if(error){F.pending=false;await load();rerender();return toast("บันทึกบางรายการไม่สำเร็จ",done+" รายการสำเร็จแล้ว; "+catName(item.k)+": "+error.message,"error")}done++;
   }
   F.pending=false;await load();rerender();toast("บันทึกรับเงินสำเร็จ",done+" รายการ","success");
  });
  document.querySelector("#edufee-settings-rates")?.addEventListener("submit",async ev=>{
    ev.preventDefault();if(!F.manager)return;
    const form=ev.currentTarget,fd=new FormData(form),btn=ev.submitter||form.querySelector('button[type="submit"]');
    // A rate of 0 is valid; hidden fields for the inactive billing cycle are optional.
    for(const [k,name] of cats){
     const cycle=String(fd.get("cycle_"+k)||cycleOf(k));
     for(const period of (cycle==="annual"?[0]:[1,2])){
      const field=form.elements.namedItem("rate_"+k+"_"+period),value=String(field?.value??"").trim();
      if(!value||!Number.isFinite(Number(value))||Number(value)<0||Number(value)>1000000){
       return toast("อัตราจัดเก็บไม่ถูกต้อง",name+" · กรุณาระบุจำนวนเงิน 0–1,000,000 บาท","error");
      }
     }
    }
    if(!btn)return toast("ไม่พบปุ่มบันทึก","กรุณาเปิดหน้าตั้งค่าการจัดเก็บอีกครั้ง","error");
    btn.disabled=true;
    try{
     for(const [k] of cats){
      const cycle=String(fd.get("cycle_"+k)||cycleOf(k));
      const {error}=await supabase.rpc("edufee_save_fee_plan",{
       p_year:F.year,p_category:k,p_cycle:cycle,
       p_annual_amount:Number(fd.get("rate_"+k+"_0")),
       p_term1_amount:Number(fd.get("rate_"+k+"_1")),
       p_term2_amount:Number(fd.get("rate_"+k+"_2"))
      });
      if(error)throw new Error(catName(k)+": "+error.message);
     }
     await load();rerender();toast("บันทึกอัตราและรอบจัดเก็บแล้ว","","success");
    }catch(err){await load();rerender();toast("บันทึกไม่ครบ",err.message||String(err),"error")}
    finally{btn.disabled=false}
  });
  document.querySelector("#edufee-settings-windows")?.addEventListener("submit",async ev=>{
    ev.preventDefault();if(!F.manager)return;const d=new FormData(ev.currentTarget),payload=[];
    for(let sem=1;sem<=2;sem++)for(const [category] of cats)payload.push({academic_year:F.year,semester:sem,category,enabled:d.has("window_"+sem+"_"+category),updated_by:state.user.id,updated_at:new Date().toISOString()});
    const {error}=await supabase.from("edufee_windows").upsert(payload,{onConflict:"academic_year,semester,category"});
    if(error)return toast("เปิด/ปิดรายการไม่สำเร็จ",error.message,"error");await load();rerender();toast("บันทึกรอบจัดเก็บแล้ว","","success");
  });
  document.querySelector("#edufee-staff-form")?.addEventListener("submit",async ev=>{
   ev.preventDefault();if(!F.admin)return;const d=new FormData(ev.currentTarget);
   const role=String(d.get("role"));const row={user_id:d.get("user_id"),role,class_id:role==="manager"?null:d.get("class_id")||null,granted_by:state.user.id};
   const {error}=await supabase.from("edufee_staff").insert(row);
   if(error)return toast("มอบหมายสิทธิ์ไม่สำเร็จ",error.message,"error");await load();rerender();toast("มอบหมายสิทธิ์แล้ว","","success");
  });
  document.querySelectorAll("[data-fee-revoke]").forEach(b=>b.addEventListener("click",async()=>{
    if(!F.admin||!confirm("ยืนยันถอนสิทธิ์รับเงินรายนี้?"))return;
    const {error}=await supabase.from("edufee_staff").delete().eq("id",b.dataset.feeRevoke);
    if(error)return toast("ถอนสิทธิ์ไม่สำเร็จ",error.message,"error");await load();rerender();
  }));
  legacy.bind();
 }
 return {load,view,bind,F};
}
