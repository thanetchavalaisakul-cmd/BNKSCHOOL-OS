// Admin-only, opt-in pilot to compress three existing student photos.
// Scans and previews are read-only. The originals are deleted only after validation.
import {createClient} from "https://esm.sh/@supabase/supabase-js@2.116.0";
import {SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY} from "../config.js?v=5.12.6";
import {optimizeStudentPhotoForCard,STUDENT_PHOTO_TARGET_BYTES,STUDENT_PHOTO_MAX_BYTES} from "./student-photo-optimizer.js?v=20261103.1";

const api=createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:true,autoRefreshToken:true}});
const bucket="student-photos",pilotLimit=3;
let mounting=false;
const size=b=>(b/1024).toLocaleString("th-TH",{maximumFractionDigits:1})+" KB";
const el=(tag,cls,txt)=>{
 const n=document.createElement(tag);
 if(cls)n.className=cls;
 if(txt!==undefined)n.textContent=txt;
 return n;
};
const err=e=>e?.message||String(e);
async function isAdmin(){
 const {data:{user},error}=await api.auth.getUser();
 if(error||!user)return false;
 const p=await api.from("profiles").select("role,account_status").eq("id",user.id).single();
 return !p.error&&p.data?.role==="super_admin"&&p.data?.account_status==="active";
}
function styles(){
 if(document.getElementById("bnk-retro-style"))return;
 const s=el("style");s.id="bnk-retro-style";
 s.textContent=".bnk-retro{z-index:9999}.bnk-retro .modal{max-width:900px;width:min(96vw,900px);max-height:92vh;overflow:auto}"+
 ".bnk-retro-status{white-space:pre-wrap;margin:14px 0;color:#334155}"+
 ".bnk-retro-row{border:1px solid #d0dbd6;padding:12px;margin:10px 0;border-radius:10px}"+
 ".bnk-retro-images{display:grid;grid-template-columns:1fr 1fr;gap:10px}"+
 ".bnk-retro-images img{width:100%;max-height:150px;object-fit:contain;background:#e5e7eb;border-radius:6px}"+
 ".bnk-retro-images figure{min-width:0;margin:0}.bnk-retro-images figcaption{font-size:12px;color:#475569}"+
 ".bnk-retro-actions{display:flex;justify-content:flex-end;gap:8px;flex-wrap:wrap;margin-top:14px}";
 document.head.appendChild(s);
}
async function mount(){
 const hero=document.querySelector(".student-card-hero");
 if(!hero||hero.querySelector("#bnk-retro-start")||mounting)return;
 mounting=true;
 let allowed=false;
 try{allowed=await isAdmin();}catch(e){console.warn("Photo manager login check",e);}
 mounting=false;
 if(!allowed||!hero.isConnected||hero.querySelector("#bnk-retro-start"))return;
 styles();
 const button=el("button","btn btn-secondary","บีบอัดรูปเก่าย้อนหลัง");
 button.type="button";button.id="bnk-retro-start";
 button.addEventListener("click",openPilot);
 (hero.querySelector(".lesson-hero-actions")||hero).appendChild(button);
}
function openPilot(){
 if(document.querySelector(".bnk-retro"))return;
 const backdrop=el("div","modal-backdrop bnk-retro");
 const modal=el("div","modal modal-wide"),head=el("div","modal-head");
 head.appendChild(el("h3","","ทดลองลดขนาดรูปนักเรียนย้อนหลัง"));
 const closeX=el("button","modal-close","×");closeX.type="button";head.appendChild(closeX);
 const hint=el("p","helper","เริ่ม 3 รูปที่ใหญ่ที่สุดก่อน · เป้าหมาย 96 KB · สูงสุด 224 KB · ไม่เปลี่ยนรูปจนกว่าจะกดยืนยัน");
 const status=el("div","bnk-retro-status","กดสำรวจรูปเพื่ออ่านขนาดไฟล์ที่เก็บจริงและดูตัวอย่างก่อน–หลัง");
 status.setAttribute("aria-live","polite");
 const previews=el("div");
 const actions=el("div","bnk-retro-actions");
 const scan=el("button","btn btn-secondary","สำรวจและดูตัวอย่าง");scan.type="button";
 const commit=el("button","btn btn-primary","ยืนยันเปลี่ยน 3 รูป");commit.type="button";commit.disabled=true;
 const bulk=el("button","btn btn-primary","บีบอัดรูปที่เหลืออัตโนมัติ");bulk.type="button";
 const close=el("button","btn btn-ghost","ปิด");close.type="button";
 actions.append(scan,commit,bulk,close);modal.append(head,hint,status,previews,actions);backdrop.appendChild(modal);document.body.appendChild(backdrop);
 let active=false,items=[];
 const urls=[];
 function progress(s){status.textContent=s;}
 function dispose(){for(const u of urls)URL.revokeObjectURL(u);urls.length=0;}
 function quit(){if(active)return;dispose();backdrop.remove();}
 close.addEventListener("click",quit);closeX.addEventListener("click",quit);
 scan.addEventListener("click",async()=>{
  if(active)return;
  active=true;scan.disabled=true;commit.disabled=true;dispose();previews.replaceChildren();items=[];
  try{
   if(!await isAdmin())throw new Error("เฉพาะแอดมินหลักที่มีสิทธิ์เท่านั้น");
   const response=await api.from("students").select("id,student_code,first_name,last_name,photo_bucket,photo_path").not("photo_path","is",null);
   if(response.error)throw response.error;
   const all=(response.data||[]).filter(s=>s.photo_path&&(!s.photo_bucket||s.photo_bucket===bucket));
   if(!all.length){progress("ยังไม่มีรูปนักเรียนที่บันทึกไว้");return;}
   const found=[];let cursor=0,done=0,failed=0;
   async function worker(){
    while(cursor<all.length&&backdrop.isConnected){
     const s=all[cursor++];
     const result=await api.storage.from(bucket).download(s.photo_path);
     done++;
     if(result.error||!result.data){failed++;continue;}
     found.push({student:s,original:result.data,bytes:result.data.size});
     if(done%5===0||done===all.length)progress("อ่านรูปแล้ว "+done+"/"+all.length+" รูป");
    }
   }
   await Promise.all(Array.from({length:Math.min(4,all.length)},worker));
   if(!backdrop.isConnected)return;
   found.sort((a,b)=>b.bytes-a.bytes);
   let failures=0;
   for(const f of found.filter(x=>x.bytes>STUDENT_PHOTO_TARGET_BYTES)){
    if(items.length===pilotLimit)break;
    try{
     const mime=f.original.type||(/\.png$/i.test(f.student.photo_path)?"image/png":/\.webp$/i.test(f.student.photo_path)?"image/webp":"image/jpeg");
     const input=new File([f.original],"original",{type:mime});
     const output=await optimizeStudentPhotoForCard(input);
     if(output.size>=f.bytes||output.size>STUDENT_PHOTO_MAX_BYTES)continue;
     items.push({...f,output});
    }catch(e){failures++;console.warn("Retro photo preview skipped",e);}
   }
   progress("พบ "+found.length+" รูป · เกิน 96 KB "+found.filter(x=>x.bytes>STUDENT_PHOTO_TARGET_BYTES).length+
    " รูป · พร้อมทดลอง "+items.length+" รูป"+(failed?" · โหลดไม่ได้ "+failed+" รูป":"")+(failures?" · บีบอัดไม่สำเร็จ "+failures+" รูป":""));
   for(const item of items){
    const wrap=el("section","bnk-retro-row");
    const name=item.student.first_name+" "+item.student.last_name+" · "+item.student.student_code;
    wrap.appendChild(el("strong","",name));
    const pics=el("div","bnk-retro-images");
    for(const [caption,blob] of [["รูปเดิม",item.original],["ตัวอย่างหลังบีบอัด",item.output]]){
     const fig=el("figure"),url=URL.createObjectURL(blob);urls.push(url);
     const img=el("img");img.src=url;img.alt=caption;img.loading="lazy";
     fig.append(img,el("figcaption","",caption+" · "+size(blob.size)));pics.appendChild(fig);
    }
    wrap.append(pics,el("p","helper","คาดว่าจะประหยัด "+size(item.bytes-item.output.size)));
    previews.appendChild(wrap);
   }
   commit.disabled=items.length===0;
  }catch(e){progress("สำรวจรูปไม่สำเร็จ: "+err(e));}
  finally{active=false;scan.disabled=false;}
 });

 // Automatic one-confirmation batch. It resumes safely by re-scanning student photo paths.
 bulk.addEventListener("click",async()=>{
  if(active)return;
  active=true;
  scan.disabled=true;commit.disabled=true;bulk.disabled=true;close.disabled=true;closeX.disabled=true;
  previews.replaceChildren();dispose();items=[];
  let replaced=0,bytesSaved=0,skipped=0,errors=0,retainedOriginals=0,readErrors=0,failedNotes=[];
  try{
   if(!await isAdmin())throw new Error("กรุณาเข้าสู่ระบบด้วยบัญชีแอดมินหลัก");
   const students=[];
   for(let offset=0;offset<10000;offset+=500){
    const response=await api.from("students")
     .select("id,student_code,first_name,last_name,photo_bucket,photo_path")
     .not("photo_path","is",null).order("id").range(offset,offset+499);
    if(response.error)throw response.error;
    students.push(...(response.data||[]));
    if((response.data||[]).length<500)break;
   }
   const linked=students.filter(s=>s.photo_path&&(!s.photo_bucket||s.photo_bucket===bucket));
   progress("กำลังตรวจไฟล์ภาพจริง "+linked.length+" รูป");
   let cursor=0,checked=0;
   const files=[];
   async function readWorker(){
    while(cursor<linked.length){
     const student=linked[cursor++];
     const downloaded=await api.storage.from(bucket).download(student.photo_path);
     checked++;
     if(downloaded.error||!downloaded.data){readErrors++;continue;}
     if(downloaded.data.size>STUDENT_PHOTO_TARGET_BYTES){
      files.push({student,blob:downloaded.data,bytes:downloaded.data.size});
     }else skipped++;
     if(checked%5===0||checked===linked.length)progress("อ่านรูป "+checked+"/"+linked.length+
      " · พบที่เกิน 96 KB "+files.length+" รูป");
    }
   }
   await Promise.all(Array.from({length:Math.min(4,linked.length)},()=>readWorker()));
   files.sort((a,b)=>b.bytes-a.bytes);
   if(!files.length){
    progress("ตรวจเสร็จ: ไม่มีรูปที่เกิน 96 KB"+(readErrors?" · อ่านไม่ได้ "+readErrors+" รูป":""));
    return;
   }
   const ok=window.confirm("พบ "+files.length+" รูปที่ใหญ่กว่า 96 KB\n"+
    "ให้ระบบบีบอัดและตรวจสอบไฟล์ใหม่แทนรูปเดิมอัตโนมัติทั้งหมดหรือไม่?\n"+
    "ระบบจะข้ามรูปที่ลดไม่ได้ และจะลบต้นฉบับเฉพาะเมื่อไฟล์ใหม่ตรวจสอบผ่าน");
   if(!ok){progress("ยกเลิกก่อนแก้ไข · ไม่มีไฟล์ใดถูกเปลี่ยน");return;}
   for(let i=0;i<files.length;i++){
    const item=files[i],student=item.student;
    let newPath=null,linkedNew=false;
    try{
     if(i%5===0&&!await isAdmin())throw new Error("หมดสิทธิ์แอดมิน กรุณาเข้าสู่ระบบใหม่");
     progress("กำลังบีบอัด "+(i+1)+"/"+files.length+" รูป\n"+
      "สำเร็จ "+replaced+" · ข้าม "+skipped+" · ผิดพลาด "+errors+" · ประหยัด "+size(bytesSaved));
     const before=await api.from("students").select("photo_path,photo_bucket").eq("id",student.id).single();
     if(before.error||before.data?.photo_path!==student.photo_path||
        (before.data?.photo_bucket&&before.data.photo_bucket!==bucket))
       throw new Error("รูปถูกเปลี่ยนไปแล้ว จึงไม่เขียนทับ");
     const mime=item.blob.type||(/\.png$/i.test(student.photo_path)?"image/png":/\.webp$/i.test(student.photo_path)?"image/webp":"image/jpeg");
     const original=new File([item.blob],"original",{type:mime});
     const output=await optimizeStudentPhotoForCard(original);
     if(output.size>=item.bytes||output.size>STUDENT_PHOTO_MAX_BYTES){
      skipped++;
      continue;
     }
     const latest=await api.from("students").select("photo_path").eq("id",student.id).single();
     if(latest.error||latest.data?.photo_path!==student.photo_path)
       throw new Error("ตรวจพบรูปเปลี่ยนระหว่างเตรียมไฟล์");
     const ext=output.type==="image/webp"?"webp":output.type==="image/png"?"png":"jpg";
     newPath=student.id+"/optimized-"+crypto.randomUUID()+"."+ext;
     const upload=await api.storage.from(bucket).upload(newPath,output,{contentType:output.type,upsert:false});
     if(upload.error)throw upload.error;
     const saved=await api.storage.from(bucket).download(newPath);
     if(saved.error||!saved.data||saved.data.size!==output.size||
       saved.data.size>STUDENT_PHOTO_MAX_BYTES)throw new Error("ไฟล์ใหม่มีขนาดไม่ตรง");
     const [expected,actual]=await Promise.all([
      crypto.subtle.digest("SHA-256",await output.arrayBuffer()),
      crypto.subtle.digest("SHA-256",await saved.data.arrayBuffer())
     ]);
     const ex=new Uint8Array(expected),ac=new Uint8Array(actual);
     if(ex.length!==ac.length||ex.some((byte,j)=>byte!==ac[j]))
      throw new Error("ข้อมูลไฟล์ใหม่ไม่ตรงกับต้นฉบับที่บีบอัด");
     if(typeof createImageBitmap==="function"){
      const bitmap=await createImageBitmap(saved.data);
      if(bitmap.width<1||bitmap.height<1){bitmap.close();throw new Error("ไฟล์ใหม่ไม่ใช่ภาพที่อ่านได้");}
      bitmap.close();
     }
     const changed=await api.rpc("set_student_photo",{p_student_id:student.id,p_photo_path:newPath});
     if(changed.error)throw changed.error;
     linkedNew=true;
     const check=await api.from("students").select("photo_path").eq("id",student.id).single();
     if(check.error||check.data?.photo_path!==newPath)
      throw new Error("อัปเดตรูปแล้ว แต่ยังยืนยันข้อมูลอ้างอิงไม่ได้ (เก็บต้นฉบับ)");
     const removed=await api.storage.from(bucket).remove([student.photo_path]);
     if(removed.error){
      retainedOriginals++;
      throw new Error("เปลี่ยนรูปสำเร็จ แต่ยังลบไฟล์เดิมไม่ได้: "+removed.error.message);
     }
     replaced++;
     bytesSaved+=item.bytes-output.size;
    }catch(e){
     errors++;
     if(newPath&&!linkedNew){
      // An RPC may have succeeded despite a network error: never remove a referenced new photo.
      try{
       const now=await api.from("students").select("photo_path").eq("id",student.id).single();
       if(!now.error&&now.data?.photo_path!==newPath)
        await api.storage.from(bucket).remove([newPath]);
       else if(now.data?.photo_path===newPath)retainedOriginals++;
      }catch{}
     }
     const message="นักเรียนรหัส "+(student.student_code||"ไม่ระบุ")+": "+err(e);
     failedNotes.push(message);
     console.warn("Student photo compression item requires review",message);
    }
   }
   progress("ประมวลผลครบ "+files.length+" รูป\n"+
    "บีบอัดและลบต้นฉบับสำเร็จ "+replaced+" รูป · ข้ามรวม "+skipped+" รูป · "+
    "ผิดพลาด "+errors+" รูป · ไฟล์เดิมที่ยังเก็บไว้ "+retainedOriginals+" รูป\n"+
    "พื้นที่ที่ประหยัดยืนยันแล้ว "+size(bytesSaved)+
    (readErrors?"\nตรวจอ่านไฟล์ไม่ได้ "+readErrors+" รูป":"")+
    (failedNotes.length?"\nรายการที่ต้องตรวจซ้ำ:\n"+failedNotes.slice(0,8).join("\n"):"")+
    "\nกดปิดแล้วตรวจรูปนักเรียนในบัตรอีกครั้ง");
  }catch(e){progress("ไม่สามารถดำเนินการอัตโนมัติ: "+err(e));}
  finally{
   active=false;scan.disabled=false;bulk.disabled=false;close.disabled=false;closeX.disabled=false;
   commit.disabled=true;
  }
 });

 commit.addEventListener("click",async()=>{
  if(active||!items.length)return;
  if(!await isAdmin()){progress("กรุณาเข้าสู่ระบบแอดมินใหม่");return;}
  if(!window.confirm("ยืนยันเปลี่ยนรูปจำนวน "+items.length+" คน? ระบบจะตรวจสอบไฟล์ใหม่และการผูกข้อมูลก่อนลบต้นฉบับทุกครั้ง"))return;
  active=true;commit.disabled=true;scan.disabled=true;close.disabled=true;closeX.disabled=true;
  let changed=0,saved=0,oldNotDeleted=0;
  for(let i=0;i<items.length;i++){
   const item=items[i],student=item.student;
   let newPath=null,linked=false;
   try{
    progress("กำลังตรวจและบันทึก "+(i+1)+"/"+items.length+" รูป");
    const checkOld=await api.from("students").select("photo_path,photo_bucket").eq("id",student.id).single();
    if(checkOld.error||checkOld.data?.photo_path!==student.photo_path||(
      checkOld.data.photo_bucket&&checkOld.data.photo_bucket!==bucket))throw new Error("รูปต้นทางมีการเปลี่ยนแปลงแล้ว");
    const ext=item.output.type==="image/webp"?"webp":item.output.type==="image/png"?"png":"jpg";
    newPath=student.id+"/optimized-"+crypto.randomUUID()+"."+ext;
    const upload=await api.storage.from(bucket).upload(newPath,item.output,{contentType:item.output.type,upsert:false});
    if(upload.error)throw upload.error;
    const downloaded=await api.storage.from(bucket).download(newPath);
    if(downloaded.error||!downloaded.data||downloaded.data.size!==item.output.size||
      downloaded.data.size>STUDENT_PHOTO_MAX_BYTES)throw new Error("ตรวจขนาดไฟล์ใหม่ไม่ผ่าน");
    if(typeof createImageBitmap==="function"){
     const bitmap=await createImageBitmap(downloaded.data);
     if(bitmap.width<=0||bitmap.height<=0){bitmap.close();throw new Error("ไฟล์ภาพเสียหาย");}
     bitmap.close();
    }
    const linkedResult=await api.rpc("set_student_photo",{p_student_id:student.id,p_photo_path:newPath});
    if(linkedResult.error)throw linkedResult.error;
    linked=true;
    const checkNew=await api.from("students").select("photo_path").eq("id",student.id).single();
    if(checkNew.error||checkNew.data?.photo_path!==newPath)throw new Error("ยังยืนยันการเชื่อมรูปใหม่ไม่ได้; เก็บต้นฉบับไว้");
    const remove=await api.storage.from(bucket).remove([student.photo_path]);
    if(remove.error){oldNotDeleted++;throw new Error("รูปใหม่พร้อม แต่ลบต้นฉบับไม่ได้: "+remove.error.message);}
    changed++;saved+=item.bytes-item.output.size;
   }catch(e){
    if(newPath&&!linked)try{await api.storage.from(bucket).remove([newPath]);}catch{}
    previews.appendChild(el("p","helper","รายการ "+student.student_code+": "+err(e)));
   }
  }
  progress("เสร็จแล้ว "+changed+"/"+items.length+" รูป · ประหยัดพื้นที่ที่ยืนยันแล้ว "+size(saved)+
   (oldNotDeleted?" · มี "+oldNotDeleted+" รูปเก่าที่ยังต้องลบ":"")+
   "\nปิดหน้าต่างแล้วตรวจบัตรนักเรียนเพื่อยืนยันความคมชัดอีกครั้ง");
  active=false;close.disabled=false;closeX.disabled=false;
 });
}
new MutationObserver(()=>{void mount();}).observe(document.querySelector("#app")||document.body,{childList:true,subtree:true});
void mount();
