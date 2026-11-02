
export function createEducationFeeLegacy({supabase,F,state,e,fmt,htmlMoney,sc,toast,renderDashboard,educationPrint,printOpts}){
 F.legacyRows=[];F.legacyReceipts=[];F.legacyClassFilter="";F.legacyStatusFilter="all";F.legacySearch="";
 const rerender=()=>renderDashboard();
 async function load(){
  const [rows,receipts]=await Promise.all([
   supabase.from("edufee_import_rows").select("*").eq("academic_year",F.year).order("class_name").order("full_name"),
   supabase.from("edufee_import_receipts").select("*").order("recorded_at",{ascending:false}).limit(1000)
  ]);
  if(rows.error)throw new Error("ข้อมูลยอดค้างจากชีต: "+rows.error.message);
  if(receipts.error)throw new Error("รายการรับเงินย้อนหลัง: "+receipts.error.message);
  F.legacyRows=rows.data||[];F.legacyReceipts=receipts.data||[];
 }
 const legacyReceipts=id=>F.legacyReceipts.filter(x=>x.import_row_id===id&&!x.voided_at);
 function legacyComponent(r,cat,sem){
  const due=cat==="water"?Number(r.expected_water):sem===1?Number(r.expected_term1):Number(r.expected_term2);
  const source=cat==="water"?Number(r.source_paid_water):sem===1?Number(r.source_paid_term1):Number(r.source_paid_term2);
  const additional=legacyReceipts(r.id).filter(x=>x.category===cat&&(cat==="water"||Number(x.semester)===sem))
    .reduce((n,x)=>n+Number(x.amount),0);
  const native=F.payments.filter(x=>r.student_id&&x.student_id===r.student_id&&x.academic_year===r.academic_year&&
    x.category===cat&&(cat==="water"||Number(x.semester)===sem)&&!x.voided_at).reduce((n,x)=>n+Number(x.amount),0);
  return {due,paid:source+additional+native,balance:Math.max(0,due-source-additional-native)};
 }
 function importedPaid(studentId,cat,semester){
  const rows=F.legacyRows.filter(r=>r.student_id===studentId&&r.review_status==="ready");
  return rows.reduce((n,r)=>n+(cat==="water"?Number(r.source_paid_water):cat==="tuition"?
    (Number(semester)===1?Number(r.source_paid_term1):Number(r.source_paid_term2)):0),0)+
   F.legacyReceipts.filter(x=>!x.voided_at&&x.category===cat&&(cat==="water"||Number(x.semester)===Number(semester))&&
      rows.some(r=>r.id===x.import_row_id)).reduce((n,x)=>n+Number(x.amount),0);
 }
 function legacyTotals(r){
  const rows=[legacyComponent(r,"tuition",1),...(r.academic_year==="2568"?[legacyComponent(r,"tuition",2)]:[]),legacyComponent(r,"water",1)];
  return {student:{student_id:r.student_id,student_code:r.student_code,full_name:r.full_name,class_name:r.class_name},
   due:rows.reduce((n,x)=>n+x.due,0),paid:rows.reduce((n,x)=>n+x.paid,0),balance:rows.reduce((n,x)=>n+x.balance,0)};
 }
 const filtered=()=>F.legacyRows.filter(r=>(!F.legacyClassFilter||r.class_name===F.legacyClassFilter)&&
  (F.legacyStatusFilter==="all"||r.review_status===F.legacyStatusFilter)&&
  (!F.legacySearch||[r.full_name,r.student_code,r.class_name].join(" ").toLocaleLowerCase().includes(F.legacySearch.trim().toLocaleLowerCase())));
 function view(){
  const all=F.legacyRows,rows=filtered(),ready=all.filter(r=>r.review_status==="ready").map(legacyTotals);
  const due=ready.reduce((n,x)=>n+x.due,0),paid=ready.reduce((n,x)=>n+x.paid,0),
    balance=ready.reduce((n,x)=>n+x.balance,0);
  const classes=[...new Set(all.map(x=>x.class_name))].sort((a,b)=>a.localeCompare(b,"th",{numeric:true}));
  const countNeedsReview=all.filter(x=>x.review_status!=="ready").length;
  const header='<section class="panel"><div class="edufee-head"><div><h3>ยอดย้อนหลังจาก Google Sheets · ปีการศึกษา '+e(F.year)+'</h3>'+
   '<p class="helper">เงินที่เคยจ่ายตามชีตนำเข้าเป็นยอดสะสมเดิม ไม่สร้างวันที่รับเงินจริงหรือเลขใบเสร็จย้อนหลัง</p></div>'+
   '<div class="edufee-actions"><button class="btn btn-ghost" id="edufee-legacy-csv">ส่งออก CSV</button>'+
   '<button class="btn btn-primary" id="edufee-legacy-pdf">พิมพ์ PDF</button></div></div>';
  const stats='<div class="edufee-statgrid">'+[
   ["นักเรียนในชีต",all.length.toLocaleString("th-TH")+" รายการ"],["ยอดต้องชำระที่ยืนยันแล้ว",htmlMoney(due)],
   ["ยอดชำระเดิมและเพิ่มเติม",htmlMoney(paid)],["ยอดค้างที่ยืนยันแล้ว",htmlMoney(balance)]]
   .map(x=>'<article class="edufee-stat"><span>'+e(x[0])+'</span><strong>'+e(x[1])+'</strong></article>').join("")+'</div>';
  const hint='<p class="helper">ปี 2568: รวม 2 ภาคเรียนและค่าน้ำรายปี · ปี 2569: นำเข้าเฉพาะเทอม 1 และค่าน้ำ ไม่แตะเทอม 2</p>'+
   (countNeedsReview?'<p class="helper">มีอีก '+countNeedsReview+' รายการที่ไม่คิดเป็นยอดค้างจนกว่าจะตรวจสอบ/ยืนยันข้อมูล</p>':"");
  const controls='<div class="edufee-filter"><label>ห้อง<select id="edufee-legacy-class">'+sc("","ทุกห้อง",F.legacyClassFilter)+
   classes.map(x=>sc(x,x,F.legacyClassFilter)).join("")+'</select></label><label>สถานะ<select id="edufee-legacy-status">'+
   [["all","ทุกสถานะ"],["ready","ยืนยันแล้ว"],["review","รอตรวจสอบ"],["excluded","ไม่คิดยอด"]]
    .map(x=>sc(x[0],x[1],F.legacyStatusFilter)).join("")+'</select></label>'+
   '<label>ค้นหารหัส/ชื่อ<input class="input" id="edufee-legacy-search" value="'+e(F.legacySearch)+'" placeholder="พิมพ์แล้วกด Enter"></label></div>';
  const show=rows.slice(0,120);
  const table='<div class="table-wrap"><table class="table edufee-table"><thead><tr><th>ชื่อ–นามสกุล / รหัส</th><th>ชั้น</th>'+
   '<th>เทอม 1 รับแล้ว / กำหนด</th>'+(F.year==="2568"?"<th>เทอม 2 รับแล้ว / กำหนด</th>":"")+
   '<th>ค่าน้ำ รับแล้ว / กำหนด</th><th>ค้างชำระ</th><th>หมายเหตุ / สถานะ</th><th>รับเงิน</th></tr></thead><tbody>'+
   show.map(r=>{
    const one=legacyComponent(r,"tuition",1),two=legacyComponent(r,"tuition",2),water=legacyComponent(r,"water",1),sum=legacyTotals(r);
    const status=r.review_status==="excluded"?"ไม่คิดยอด":r.review_status==="review"?"รอตรวจสอบ":sum.balance===0?"ครบแล้ว":sum.paid>0?"ค้างบางส่วน":"ยังไม่ชำระ";
    const canUseNative=F.year==="2569"&&r.student_id&&F.roster.some(x=>x.student_id===r.student_id);
    const button=F.manager&&r.review_status==="ready"&&sum.balance>0?
     '<button class="btn btn-primary btn-sm" '+(canUseNative?'data-fee-legacy-native':'data-fee-legacy-pay')+'="'+e(r.id)+'">บันทึกรับเงิน</button>':"—";
    return '<tr><td><strong>'+e(r.full_name)+'</strong><small> · '+e(r.student_code||"ไม่ระบุรหัส")+'</small></td>'+
     '<td>'+e(r.class_name)+'</td><td class="num">'+fmt(one.paid)+' / '+fmt(one.due)+'</td>'+
     (F.year==="2568"?'<td class="num">'+fmt(two.paid)+' / '+fmt(two.due)+'</td>':"")+
     '<td class="num">'+fmt(water.paid)+' / '+fmt(water.due)+'</td><td class="num">'+
     (r.review_status==="ready"?fmt(sum.balance):"—")+'</td><td>'+e(status)+
     (r.source_note?'<small> · '+e(r.source_note)+'</small>':"")+'</td><td>'+button+'</td></tr>';
   }).join("")+'</tbody></table></div>';
  const tail=rows.length>show.length?'<p class="helper">แสดง '+show.length+' จาก '+rows.length+' รายการ ใช้ตัวกรองหรือ CSV เพื่อดูทั้งหมด</p>':
   rows.length===0?'<p class="edufee-empty">ยังไม่มีข้อมูลในปีการศึกษานี้</p>':"";
  const history=F.manager?'<details><summary>ประวัติรับชำระยอดย้อนหลังเพิ่มเติม ('+
    F.legacyReceipts.filter(x=>all.some(r=>r.id===x.import_row_id)).length+' รายการ)</summary>'+
   '<div class="table-wrap"><table class="table"><thead><tr><th>นักเรียน</th><th>วันที่รับ</th><th>รายการ</th><th>จำนวนเงิน</th><th>จัดการ</th></tr></thead><tbody>'+
   F.legacyReceipts.filter(x=>all.some(r=>r.id===x.import_row_id)).map(x=>{
    const r=all.find(y=>y.id===x.import_row_id);
    return '<tr><td>'+e(r?.full_name||"")+'</td><td>'+e(x.paid_on)+'</td><td>'+e(x.category==="water"?"ค่าน้ำ":"ค่าบำรุงเทอม "+x.semester)+'</td>'+
    '<td class="num">'+fmt(x.amount)+'</td><td>'+ (x.voided_at?"ยกเลิกแล้ว":
     '<button class="btn btn-ghost btn-sm" data-fee-legacy-void="'+e(x.id)+'">ยกเลิกรายการ</button>')+'</td></tr>';
   }).join("")+'</tbody></table></div></details>':"";
  return header+stats+hint+controls+table+tail+history+'</section>';
 }
 const csvCell=v=>{const x=String(v??"");return '"'+(/^[=+@\-\t\r]/.test(x)?"'"+x:x).replace(/"/g,'""')+'"';};
 function csv(){
  const head=["ปี","ห้อง","รหัส","ชื่อ","สถานะ","กำหนดเทอม1","รับเทอม1","กำหนดเทอม2","รับเทอม2","กำหนดค่าน้ำ","รับค่าน้ำ","ค้าง","หมายเหตุ"];
  const values=filtered().map(r=>{const a=legacyComponent(r,"tuition",1),b=legacyComponent(r,"tuition",2),c=legacyComponent(r,"water",1);
   return [r.academic_year,r.class_name,r.student_code,r.full_name,r.review_status,a.due,a.paid,r.academic_year==="2568"?b.due:0,
    r.academic_year==="2568"?b.paid:0,c.due,c.paid,r.review_status==="ready"?legacyTotals(r).balance:"",r.source_note];});
  const blob=new Blob(["\ufeff"+[head,...values].map(row=>row.map(csvCell).join(",")).join("\r\n")],{type:"text/csv;charset=utf-8"});
  const a=document.createElement("a"),url=URL.createObjectURL(blob);a.href=url;a.download="BNK_fees_import_"+F.year+".csv";a.click();URL.revokeObjectURL(url);
 }
 function pdf(){
  const rows=filtered().filter(r=>r.review_status==="ready").map(legacyTotals);
  educationPrint({type:"summary",data:{rows,year:F.year,semester:F.year==="2568"?"1–2":"1",
   scope:"ข้อมูลนำเข้าจาก Google Sheets · ไม่รวมรายการที่รอตรวจสอบ",
   importedFromSheet:true,schoolName:state.systemSettings?.school_name_th},...printOpts()});
 }
 function paymentModal(id){
  if(!F.manager)return;
  const r=F.legacyRows.find(x=>x.id===id);if(!r||r.review_status!=="ready")return;
  const choices=[["tuition",1,"ค่าบำรุงภาคเรียน 1"],...(r.academic_year==="2568"?[["tuition",2,"ค่าบำรุงภาคเรียน 2"]]:[]),["water",1,"ค่าน้ำรายปี"]]
   .filter(x=>legacyComponent(r,x[0],x[1]).balance>0);
  if(!choices.length)return toast("ไม่มีเงินค้าง","","success");
  const today=new Date(Date.now()+7*3600000).toISOString().slice(0,10),m=document.createElement("div");
  m.className="modal-backdrop";
  m.innerHTML='<div class="modal"><div class="modal-head"><div><h3>บันทึกรับเงินจริง · ยอดค้างย้อนหลัง</h3>'+
   '<p>'+e(r.full_name)+' · '+e(r.class_name)+' · '+e(r.academic_year)+'</p></div><button class="modal-close">×</button></div>'+
   '<form id="edufee-import-receipt-form" class="form-grid"><label>ประเภทเงิน<select class="select" name="item" required>'+
   choices.map(x=>sc(x[0]+"_"+x[1],x[2]+" (ค้าง "+fmt(legacyComponent(r,x[0],x[1]).balance)+" บาท)","")).join("")+
   '</select></label><label>รับเงินจริง (บาท)<input class="input" name="amount" type="number" min="0.01" step="0.01" required></label>'+
   '<label>วันที่รับเงินจริง<input class="input" name="date" type="date" value="'+today+'" max="'+today+'" required></label>'+
   '<label>ผู้ชำระ<input class="input" name="payer"></label><label class="form-span-2">หมายเหตุ<input class="input" name="note"></label>'+
   '<div class="modal-actions"><button type="button" class="btn btn-ghost modal-cancel">ยกเลิก</button><button type="submit" class="btn btn-primary">ยืนยันรับเงินจริง</button></div></form></div>';
  document.body.appendChild(m);
  const close=()=>m.remove();m.querySelector(".modal-close").onclick=close;m.querySelector(".modal-cancel").onclick=close;
  m.querySelector("form").onsubmit=async event=>{
   event.preventDefault();if(F.pending)return;const form=event.currentTarget,d=new FormData(form),parts=String(d.get("item")||"").split("_"),
    category=parts[0],semester=Number(parts[1]),amount=Number(d.get("amount"));
   const balance=legacyComponent(r,category,semester).balance;
   if(!Number.isFinite(amount)||amount<=0||amount>balance)return toast("จำนวนเงินไม่ถูกต้อง","คงค้างสูงสุด "+fmt(balance)+" บาท","error");
   if(!window.confirm("ยืนยันรับเงินจริงจำนวน "+fmt(amount)+" บาทจาก "+r.full_name+" ?"))return;
   const btn=event.submitter||form.querySelector('[type="submit"]');if(btn)btn.disabled=true;F.pending=true;
   const {error}=await supabase.rpc("edufee_record_import_receipt",{p_row_id:r.id,p_semester:semester,p_category:category,
    p_amount:amount,p_paid_on:String(d.get("date")),p_payer:String(d.get("payer")||""),p_note:String(d.get("note")||""),p_request:crypto.randomUUID()});
   F.pending=false;if(error){if(btn)btn.disabled=false;return toast("รับเงินไม่สำเร็จ",error.message,"error")}
   close();await load();rerender();toast("รับเงินสำเร็จ","ปรับยอดค้างแล้ว","success");
  };
 }
 function bind(){
  document.querySelector("#edufee-legacy-class")?.addEventListener("change",ev=>{F.legacyClassFilter=ev.target.value;rerender()});
  document.querySelector("#edufee-legacy-status")?.addEventListener("change",ev=>{F.legacyStatusFilter=ev.target.value;rerender()});
  document.querySelector("#edufee-legacy-search")?.addEventListener("change",ev=>{F.legacySearch=ev.target.value;rerender()});
  document.querySelector("#edufee-legacy-csv")?.addEventListener("click",csv);
  document.querySelector("#edufee-legacy-pdf")?.addEventListener("click",pdf);
  document.querySelectorAll("[data-fee-legacy-pay]").forEach(b=>b.addEventListener("click",()=>paymentModal(b.dataset.feeLegacyPay)));
  document.querySelectorAll("[data-fee-legacy-native]").forEach(b=>b.addEventListener("click",()=>{
   const r=F.legacyRows.find(x=>x.id===b.dataset.feeLegacyNative);
   const st=F.roster.find(x=>x.student_id===r?.student_id);
   if(!st)return toast("ไม่พบทะเบียนภาคเรียนที่ 1","","error");
   F.semester=1;F.tab="collect";F.receiveGrade=String(st.class_name).replace(/\/[^/]*$/,"");
   F.receiveClass=st.class_id;F.receiveStudent=st.student_id;rerender();
  }));
  document.querySelectorAll("[data-fee-legacy-void]").forEach(b=>b.addEventListener("click",async()=>{
   const reason=prompt("เหตุผลยกเลิกรายการ อย่างน้อย 8 ตัวอักษร");if(!reason||reason.trim().length<8)return;
   const {error}=await supabase.rpc("edufee_void_import_receipt",{p_id:b.dataset.feeLegacyVoid,p_reason:reason});
   if(error)return toast("ยกเลิกไม่สำเร็จ",error.message,"error");
   await load();rerender();toast("ยกเลิกรายการรับเงินแล้ว","","success");
  }));
 }
 return {load,view,bind,importedPaid};
}
