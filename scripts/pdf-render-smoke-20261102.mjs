import {readFileSync,writeFileSync,mkdtempSync,statSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {execFileSync} from "node:child_process";
import {pathToFileURL} from "node:url";
import assert from "node:assert/strict";

const source=readFileSync(new URL("../app.js",import.meta.url),"utf8");
const styleStart=source.indexOf("function preschoolCoverDocStyles()");
const styleEnd=source.indexOf("// Names come from existing personnel",styleStart);
assert(styleStart>0&&styleEnd>styleStart);
const baseCss="*{box-sizing:border-box;}html,body{margin:0;color:#111;background:white;font-family:serif;} .a4-document{margin:0 auto;background:white;} .a4-school-logo{display:block;margin:auto;}";
const css=new Function("a4DocumentStyles",source.slice(styleStart,styleEnd)+"return preschoolCoverDocStyles;")(()=>baseCss)();
const renderStart=source.indexOf("function preschoolCoverWetSignature(");
const renderEnd=source.indexOf("async function preschoolCoverPdfPreview(",renderStart);
assert(renderStart>0&&renderEnd>renderStart);
const escapeHtml=x=>String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const members=Array.from({length:12},(_,i)=>({
  teacher_id:"teacher-"+i,teacher_name:"ครูผู้รับฝากหมายเลข "+(i+1),
  is_available:true,acknowledged_at:i%2===0?"2026-11-02T08:00:00Z":null
}));
const build=new Function("preschoolCoverMembers","preschoolUnitForDate","escapeHtml","schoolName","thaiDateOnly",
  source.slice(renderStart,renderEnd)+"return buildPreschoolCoverDocument;")(
  ()=>members,()=>({unit_title:"หน่วยการจัดประสบการณ์ปฐมวัย",week_no:8}),
  escapeHtml,()=>"โรงเรียนบ้านหนองเขียว",x=>String(x).slice(0,10)
);
const doc=build({
 id:"test",class_id:"class",leave_date:"2026-11-02",semester:2,academic_year:2569,
 absent_teacher_name:"ครูผู้ลา",class_label:"อนุบาล 2"
},{
 schoolLogo:null,signers:{
  stage_head_name:"หัวหน้าช่วงชั้นอนุบาล",academic_head_name:"หัวหน้าวิชาการ",
  director_name:"ผู้อำนวยการโรงเรียน"
 },signatureByTeacher:{},linkedSignatures:{}
});
const dir=mkdtempSync(join(tmpdir(),"bnk-preschool-realpdf-"));
const input=join(dir,"cover.html"),output=join(dir,"cover.pdf");
writeFileSync(input,'<!doctype html><html lang="th"><head><meta charset="utf-8"><style>'+css+'</style></head><body class="a4-print-body">'+doc+'</body></html>');
let browser;
for(const candidate of ["google-chrome","chromium","chromium-browser"]){
 try{execFileSync("which",[candidate],{stdio:"ignore"});browser=candidate;break;}catch{}
}
assert(browser,"Chrome or Chromium is required for PDF verification");
execFileSync(browser,[
 "--headless","--no-sandbox","--disable-dev-shm-usage","--disable-gpu",
 "--no-pdf-header-footer","--virtual-time-budget=5000","--print-to-pdf="+output,
 pathToFileURL(input).href
],{timeout:60000,stdio:"pipe"});
assert(statSync(output).size>3000,"Non-empty PDF required");
const meta=execFileSync("pdfinfo",[output],{encoding:"utf8"});
const pages=Number(meta.match(/^Pages:\s+(\d+)/m)?.[1]);
const dims=meta.match(/^Page size:\s+([\d.]+)\s+x\s+([\d.]+)/m);
console.log("ACTUAL_PDF_LAYOUT "+(meta.match(/^Pages:.*$/m)?.[0]||"")+" "+(meta.match(/^Page size:.*$/m)?.[0]||""));
assert.equal(pages,1,"Preschool cover must be exactly one printed page");
assert(dims&&Number(dims[1])>Number(dims[2]),"Preschool cover must use A4 landscape");
console.log("PRESCHOOL_PDF_RENDER_OK pages="+pages+" orientation=landscape memberRows="+members.length+" bytes="+statSync(output).size);


const normalizeBegin=source.indexOf("function academicRegistryPersonNameOnly(");
const normalizeEnd=source.indexOf("\nasync function academicCertificatePdfSigners(",normalizeBegin);
assert(normalizeBegin>0&&normalizeEnd>normalizeBegin);
const nameOnly=new Function(source.slice(normalizeBegin,normalizeEnd)+"return academicRegistryPersonNameOnly;")();
const parentFixture={
 request_date:"2026-11-02",transfer_date:"2026-11-12",birth_date:"2016-01-14",
 student_name:"เด็กชาย ตัวอย่าง ทดสอบ",class_label:"ป.6/1",student_number:10,
 student_code:"T00001",academic_year:2569,guardian_name:"นาย สมชาย ใจดี เกษตรกรรม",
 father_name:"นาย สมชาย ใจดี เกษตรกรรม",mother_name:"นาง สุภา แก้วดี รับจ้างทั่วไป",
 applicant_name:"นาย สมชาย ใจดี เกษตรกรรม",contact_phone:"0000000000",
 citizen_id:"0000000000000",reason_type:"continue_study",destination_school:"โรงเรียนตัวอย่าง",
 destination_district:"ทดสอบ",destination_province:"ทดสอบ",guardian_address:"บ้านตัวอย่าง",
 evidence_photo:false,evidence_birth_certificate:false,evidence_house_registration:false,
 evidence_parent_id:false,evidence_phone:false,evidence_other:false,request_code:"CER-2569-002",
 certificate_type:"current",purpose_type:"other",purpose_other:"ใช้ประกอบการศึกษา",
 student_address:"ที่อยู่ตัวอย่าง",semester:2
};
const thaiDate=()=>({day:"๒",month:"พฤศจิกายน",year:"๒๕๖๙"});
const check=(yes,label)=>'<span class="cert-check">'+(yes?"☑":"☐")+label+'</span>';
const transferStart=source.indexOf("function academicTransferPdfDocumentHtml(");
const transferEnd=source.indexOf("\nasync function academicRegWaitForGaruda",transferStart);
assert(transferStart>0&&transferEnd>transferStart,"Find actual transfer PDF template");
const renderTransfer=new Function(
 "academicRegThaiDateParts","escapeHtml","schoolName","schoolAddress","academicRegPdfText",
 "academicRegistryPersonNameOnly","academicTransferPdfCheckbox","academicTransferPdfSignerBox",
 source.slice(transferStart,transferEnd)+"return academicTransferPdfDocumentHtml;"
)(thaiDate,escapeHtml,()=>"โรงเรียนบ้านหนองเขียว",()=>"ที่อยู่โรงเรียน",
 x=>escapeHtml(x),nameOnly,(yes,label)=>'<span>'+(yes?"☑":"☐")+label+"</span>",
 (s)=>'<div class="transfer-doc-sign-box">ลงชื่อ ................ '+escapeHtml(s.title)+"</div>");
const certificateStart=source.indexOf("function academicCertificateRequestPageHtml(");
const certificateEnd=source.indexOf("\nfunction ",certificateStart+30);
assert(certificateStart>0&&certificateEnd>certificateStart,"Find actual certificate PDF template");
const renderCertificate=new Function(
 "academicRegThaiDateParts","escapeHtml","schoolName","academicCertificateRequestRunningNumber",
 "academicCertificateInfoCell","academicRegPdfText","academicRegistryPersonNameOnly",
 "academicCertificateCheck","ACADEMIC_CERTIFICATE_PURPOSE_LABEL","academicCertificateApprovalBox",
 source.slice(certificateStart,certificateEnd)+"return academicCertificateRequestPageHtml;"
)(thaiDate,escapeHtml,()=>"โรงเรียนบ้านหนองเขียว",()=>"๒/๒๕๖๙",
 (label,value)=>'<div class="cert-info-cell"><span class="cert-info-label">'+label+'</span><span class="cert-info-value">'+value+"</span></div>",
 x=>escapeHtml(x),nameOnly,check,{"other":"อื่น ๆ"},
 (r,slot,title)=>'<section class="cert-approval-box"><strong>'+title+'</strong><div class="cert-approval-signature">ลงชื่อ .......................</div></section>');
const liveStyle=readFileSync(new URL("../styles.css",import.meta.url),"utf8");
const realPdfTemplates=[
 ["transfer_request",renderTransfer(parentFixture,{},{} )],
 ["certificate_request",renderCertificate(parentFixture,{},{} )]
];
for(const [kind,markup] of realPdfTemplates){
 assert(markup.includes("สมชาย ใจดี"),kind+" must retain parent name");
 assert(markup.includes("สุภา แก้วดี"),kind+" must retain mother name");
 assert(!markup.includes("เกษตรกรรม")&&!markup.includes("รับจ้างทั่วไป"),kind+" must not display occupation suffix");
 const h=join(dir,kind+".html"),pdf=join(dir,kind+".pdf");
 writeFileSync(h,'<!doctype html><html lang="th"><head><meta charset="utf-8"><style>'+liveStyle+
 ' @page{size:A4 portrait;margin:7mm;} body{background:white;}</style></head><body>'+markup+'</body></html>');
 execFileSync(browser,[
  "--headless","--no-sandbox","--disable-dev-shm-usage","--disable-gpu","--no-pdf-header-footer",
  "--virtual-time-budget=6000","--print-to-pdf="+pdf,pathToFileURL(h).href
 ],{timeout:60000,stdio:"pipe"});
 assert(statSync(pdf).size>3000,kind+" must create a non-empty actual Chrome PDF");
 const info=execFileSync("pdfinfo",[pdf],{encoding:"utf8"});
 const count=Number(info.match(/^Pages:\s+(\d+)/m)?.[1]);
 const pageSize=info.match(/^Page size:\s+([\d.]+)\s+x\s+([\d.]+)/m);
 assert(count>=1&&count<=3,kind+" must produce actual bounded PDF");
 assert(pageSize&&Number(pageSize[1])<Number(pageSize[2]),kind+" must be A4 portrait");
 console.log("REAL_PDF_OK template="+kind+" pages="+count+" bytes="+statSync(pdf).size+" occupations=excluded");
}
