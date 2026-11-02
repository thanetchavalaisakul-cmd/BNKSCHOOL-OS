from pathlib import Path
D=chr(36);T=chr(96)
def fmt(s):return s.replace('¤',D).replace('§',T)
app=Path('app.js');s=app.read_text()
def replace_once(a,b,label):
 global s
 a=fmt(a);b=fmt(b)
 if s.count(a)!=1:raise RuntimeError(f"{label}: expected 1; found {s.count(a)}")
 s=s.replace(a,b,1)
# Signed acknowledgement records stay bound to the original leave request.
replace_once('function preschoolCoverWetSignature(title,name){',
'''function preschoolCoverWetSignature(title,name,image=null,note=""){''',
 'sign card parameters')
replace_once('return §<div class="ps-doc-sign-card"><div class="ps-doc-sign-space"></div><div>ลงชื่อ................................................</div><span class="ps-doc-signer-name">(¤{escapeHtml(name||"........................................")})</span><strong>¤{escapeHtml(title)}</strong></div>§;',
'''return §<div class="ps-doc-sign-card">¤{image?§<img class="ps-doc-signed-image" src="¤{escapeHtml(image)}" alt="ภาพลายเซ็น">§:§<div class="ps-doc-sign-space"></div>§}<div>ลงชื่อ................................................</div><span class="ps-doc-signer-name">(¤{escapeHtml(name||"........................................")})</span><strong>¤{escapeHtml(title)}</strong>¤{note?§<small class="ps-doc-sign-note">¤{escapeHtml(note)}</small>§:""}</div>§;''',
'sign card markup')
replace_once('function buildPreschoolCoverDocument(g,assets={}){',
'''function buildPreschoolCoverDocument(g,assets={}){
  const linked=assets.linkedSignatures||{};
  const linkedImage=slot=>linked[slot]?.image||null;
  const linkedNote=(slot,label)=>{
    const ref=linked[slot];
    if(!ref)return "";
    if(ref.method==="paper")return label+" · ลงนามบนกระดาษ";
    return label+(ref.signed_at?" · "+thaiDateTimeDocument(ref.signed_at):"");
  };''','document signature sources')
replace_once('¤{preschoolCoverWetSignature("ผู้ฝากดูแลชั้นเรียน",g.absent_teacher_name)}¤{preschoolCoverWetSignature("หัวหน้าช่วงชั้นปฐมวัย",assets.signers?.stage_head_name)}¤{preschoolCoverWetSignature("หัวหน้ากลุ่มงานบริหารงานวิชาการ",assets.signers?.academic_head_name)}¤{preschoolCoverWetSignature("ผู้อำนวยการโรงเรียน",assets.signers?.director_name)}',
'''¤{preschoolCoverWetSignature("ผู้ฝากดูแลชั้นเรียน",g.absent_teacher_name,linkedImage("requester"),linkedNote("requester","อ้างอิงการยื่นคำขอลา"))}¤{preschoolCoverWetSignature("หัวหน้าช่วงชั้นปฐมวัย",assets.signers?.stage_head_name,linkedImage("stage_head"),linkedNote("stage_head","รับทราบและลงนาม"))}¤{preschoolCoverWetSignature("หัวหน้ากลุ่มงานบริหารงานวิชาการ",assets.signers?.academic_head_name,linkedImage("academic_head"),linkedNote("academic_head","รับทราบและลงนาม"))}¤{preschoolCoverWetSignature("ผู้อำนวยการโรงเรียน",assets.signers?.director_name,linkedImage("director"),linkedNote("director","อ้างอิงการอนุมัติการลา ไม่ต้องอนุมัติสอนแทนซ้ำ"))}''',
'footer 4 signed lines')
replace_once('หมายเหตุ: “รับทราบแล้ว” บันทึกเวลาเดิม ภาพจากโปรไฟล์ที่เพิ่มภายหลังไม่ใช่การลงนามย้อนหลัง · ช่องผู้บริหารเว้นไว้จนกว่าจะมีหลักฐานการลงนามในเอกสารฉบับนี้',
'''หมายเหตุ: ลายเซ็นผู้ลาและผู้อำนวยการอ้างอิงจากคำขอลาที่อนุมัติแล้ว ไม่ใช่การอนุมัติใบฝากดูแลซ้ำ · หัวหน้าช่วงชั้นและหัวหน้าวิชาการลงนามรับทราบแยกต่างหาก · ภาพจากโปรไฟล์ของผู้รับฝากที่เพิ่มภายหลังไม่ถือเป็นการลงนามย้อนหลัง''',
'PDF provenance note')
replace_once('.ps-sign-image{max-width:39mm;max-height:9mm;object-fit:contain;display:block;margin:auto}',
'''.ps-sign-image{max-width:39mm;max-height:9mm;object-fit:contain;display:block;margin:auto}
  .ps-doc-signed-image{height:12mm;max-width:40mm;object-fit:contain;display:block;margin:0 auto}
  .ps-doc-sign-note{display:block;font-size:8.5pt;color:#555;line-height:1.1}''','pdf sign style')

# Existing preschool member signatures stay intact. Fetch linked proven leave
# signatures and head acknowledgements at PDF render time, not the current profile.
replace_once('''  const [schoolLogo,signers,assetResult]=await Promise.all([
    schoolLogoDataUrl(),preschoolCoverDocumentSigners(g),
    supabase.rpc("get_preschool_cover_signature_assets",{p_cover_id:id})
  ]);
  if(assetResult.error)return toast("เปิด PDF ไม่สำเร็จ",assetResult.error.message,"error");''',
'''  const [schoolLogo,signers,assetResult,linkedResult]=await Promise.all([
    schoolLogoDataUrl(),preschoolCoverDocumentSigners(g),
    supabase.rpc("get_preschool_cover_signature_assets",{p_cover_id:id}),
    supabase.rpc("get_preschool_cover_linked_signatures",{p_cover_id:id})
  ]);
  if(assetResult.error||linkedResult.error)return toast("เปิด PDF ไม่สำเร็จ",(assetResult.error||linkedResult.error).message,"error");''',
'linked read RPC')
replace_once('''  const signatureByTeacher=Object.fromEntries(resolved.map(ref=>[ref.teacher_id,ref]));
  const body=buildPreschoolCoverDocument(g,{schoolLogo,signers,signatureByTeacher}),css=preschoolCoverDocStyles();''',
'''  const signatureByTeacher=Object.fromEntries(resolved.map(ref=>[ref.teacher_id,ref]));
  const linkedRows=Array.isArray(linkedResult.data)?linkedResult.data:[];
  const linkedResolved=await Promise.all(linkedRows.map(async ref=>{
    if(!ref.storage_path||ref.method==="paper")return ref;
    const download=await supabase.storage.from(ref.bucket_id||"signatures").download(ref.storage_path);
    if(download.error||!download.data){
      console.warn("Cannot fetch linked preschool approval signature",download.error);
      return ref;
    }
    return {...ref,image:await blobToDataUrl(download.data)};
  }));
  const linkedSignatures=Object.fromEntries(linkedResolved.map(ref=>[ref.slot_code,ref]));
  const body=buildPreschoolCoverDocument(g,{schoolLogo,signers,signatureByTeacher,linkedSignatures}),css=preschoolCoverDocStyles();''',
'linked PDF images')

# Acknowledgement-only buttons, NOT new approval requests.
marker='function preschoolCoverWorkspaceHtml(){'
extra='''function preschoolCoverEndorsementButtons(g){
  const currentUser=state.user?.id;
  if(!currentUser||g.status!=="active")return "";
  const canStage=state.timetableStageHeads.some(h=>h.teacher_id===currentUser
    && h.stage_code==="early_childhood"
    && String(h.academic_year)===String(g.academic_year));
  const canAcademic=isAcademicHead();
  const buttons=[];
  if(canStage)buttons.push(§<button type="button" class="btn btn-secondary" data-preschool-endorse="¤{g.id}" data-endorse-slot="stage_head">รับทราบและลงนาม · หัวหน้าช่วงชั้น</button>§);
  if(canAcademic)buttons.push(§<button type="button" class="btn btn-secondary" data-preschool-endorse="¤{g.id}" data-endorse-slot="academic_head">รับทราบและลงนาม · หัวหน้าวิชาการ</button>§);
  return buttons.length?§<div class="preschool-cover-endorsements"><p class="helper">ผู้อำนวยการไม่ต้องอนุมัติซ้ำ ระบบจะดึงลายเซ็นจากคำขอลาที่อนุมัติแล้ว</p>¤{buttons.join("")}</div>§:"";
}
async function preschoolCoverEndorse(id,slot,button){
  const g=state.preschoolCovers.find(g=>g.id===id&&g.status==="active");
  if(!g||!["stage_head","academic_head"].includes(slot))return;
  const choice=await preschoolCoverChooseSignature("รับทราบและลงนามในใบฝากดูแล");
  if(!choice)return;
  buttonLoading(button,true,"กำลังบันทึก...");
  const {error}=await supabase.rpc("set_school_document_signature",{
    p_kind:"preschool",p_doc:g.id,p_day:g.leave_date,
    p_slot:slot,p_method:choice.method,p_signature:choice.signatureId
  });
  buttonLoading(button,false);
  if(error)return toast("บันทึกลายเซ็นไม่ได้",error.message,"error");
  toast("บันทึกรับทราบและลงนามแล้ว",
    "ลายเซ็นเชื่อมกับเอกสารฝากดูแลโดยตรง ไม่ใช่การอนุมัติการลาใหม่","success");
  await renderDashboard();
}
''';
replace_once(marker,extra+marker,'acknowledgement actions')
replace_once('¤{prog.members.length?§<div class="table-wrap">',
             '¤{preschoolCoverEndorsementButtons(selected)}¤{prog.members.length?§<div class="table-wrap">',
             'endorsement buttons in selected cover')
replace_once('async function preschoolCoverChooseSignature(){',
             'async function preschoolCoverChooseSignature(title="รับทราบและลงลายเซ็น"){',
             'signature chooser context')
replace_once('<h3>รับทราบและลงลายเซ็น</h3>',
             '<h3>¤{escapeHtml(title)}</h3>',
             'signature chooser heading')
# Wire lazy-loaded dashboard event handler through the existing dependency contract.
replace_once('mod.createDashboardEventsFeature({', 'mod.createDashboardEventsFeature({preschoolCoverEndorse,',
             'event loader DI')
s=s.replace('modules/dashboard-events.js?v=5.12.9.58',
            'modules/dashboard-events.js?v=5.12.9.62',1)
app.write_text(s)
events=Path("modules/dashboard-events.js")
code=events.read_text()
if code.count("const {TIMETABLE_DAY_LABEL,")!=1:raise RuntimeError("Dashboard feature contract changed")
code=code.replace("const {TIMETABLE_DAY_LABEL,","const {preschoolCoverEndorse,TIMETABLE_DAY_LABEL,",1)
needle='  document.querySelectorAll("[data-preschool-ack]").forEach(btn=>btn.addEventListener("click",()=>acknowledgePreschoolCover(btn.dataset.preschoolAck,btn.dataset.ackValue==="true",btn)));'
if code.count(needle)!=1:raise RuntimeError("Preschool event binding changed")
code=code.replace(needle,needle+'\n  document.querySelectorAll("[data-preschool-endorse]").forEach(btn=>btn.addEventListener("click",()=>preschoolCoverEndorse(btn.dataset.preschoolEndorse,btn.dataset.endorseSlot,btn)));',1)
events.write_text(code)
p=Path("index.html")
html=p.read_text()
if html.count("app.min.js?v=5.12.9.61")!=1:raise RuntimeError("Unexpected cache version")
p.write_text(html.replace("app.min.js?v=5.12.9.61","app.min.js?v=5.12.9.62"))
print("Linked evidence-based approval signatures, stage / academic receipt signing and PDF.")

