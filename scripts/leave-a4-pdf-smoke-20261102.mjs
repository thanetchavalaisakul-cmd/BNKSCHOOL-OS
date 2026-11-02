import assert from "node:assert/strict";
import {readFileSync,writeFileSync,mkdtempSync,statSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {execFileSync} from "node:child_process";
import {pathToFileURL} from "node:url";

const src=readFileSync(new URL("../app.js",import.meta.url),"utf8");
const section=(start,end)=>{
  const a=src.indexOf(start),b=src.indexOf(end,a+start.length);
  assert(a>=0&&b>a,"Missing leave PDF function "+start);
  return src.slice(a,b);
};
const cssBase=new Function("officialPdfFontFaceCss",section("function a4DocumentStyles()","function ",)+"return a4DocumentStyles;")(()=>"\n")();
const css=new Function("a4DocumentStyles",section("function leaveA4Styles()","function buildLeaveA4Html(")+"return leaveA4Styles;")(()=>cssBase)();
assert(css.includes("@page{size:A4 portrait;margin:7mm;}"),"Leave must be A4 portrait");
assert(css.includes("grid-template-columns:repeat(3,minmax(0,1fr))!important;"),"Leave signatures must retain 3 columns on print");
assert(css.includes("grid-template-columns:repeat(2,minmax(0,1fr))!important;"),"Leave meta fields must retain 2 columns on print");
const escapeHtml=x=>String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const thaiDateOnly=x=>String(x||"").slice(0,10);
const thaiDateTimeDocument=x=>String(x||"").slice(0,16);
const signSnippet=section("function leaveSignatureLine(","function leavePrintTypeLabel(");
const makeSign=new Function("escapeHtml","thaiDateTimeDocument",signSnippet+"return leaveSignatureLine;")(escapeHtml,thaiDateTimeDocument);
const typeLabels=new Function(section("function leavePrintTypeLabel(","function leaveA4Styles(")+"return leavePrintTypeLabel;")();
const types=["ลาป่วย","ลากิจส่วนตัว","ลาคลอดบุตร","ลาช่วยเหลือภริยา","ลาอุปสมบท","ลาเข้ารับการตรวจเลือก","ลาศึกษาดูงาน","ลาอื่น ๆ","ลาฝึกอบรม"];
const stats=types.map((name,i)=>({name,code:String(i),times:i%2,days:i%2?2:0}));
const render=new Function(
 "leaveQuotaStats","leavePersonnelSkipped","LEAVE_STATUS_LABEL","ROLE_LABEL","leaveTypeStatsForUser",
 "escapeHtml","schoolName","schoolAddress","educationOffice","leaveTypeName","thaiDateOnly","leavePrintTypeLabel",
 "leaveSignatureLine","appName","thaiDateTimeDocument",
 section("function buildLeaveA4Html(","function leaveReportPrintStyles(")+"return buildLeaveA4Html;"
)(
 ()=>({usedTimes:3,maxTimes:10,usedDays:5,maxDays:30,remainingTimes:7,remainingDays:25}),
 ()=>false,{approved:"อนุมัติแล้ว"},{teacher:"ครูผู้สอน"},()=>stats,
 escapeHtml,()=>"โรงเรียนบ้านหนองเขียว",()=>"สำนักงานโรงเรียนบ้านหนองเขียว",()=>"สำนักงานเขตพื้นที่การศึกษาประถมศึกษา",
 ()=>"ลาป่วย",thaiDateOnly,typeLabels,makeSign,()=>"BNK SCHOOL OS",thaiDateTimeDocument
);
const sample={
 requester_id:"sample",academic_year:2569,semester:2,requester_name:"ครูตัวอย่าง ใจดี",
 requester_position:"ครู",requester_role:"teacher",leave_type_code:"sick",start_date:"2026-11-02",end_date:"2026-11-04",
 leave_days:3,request_no:15,reason:"มีความจำเป็นต้องลาป่วยตามหลักฐานใบรับรองแพทย์ เนื่องจากต้องเข้ารับการตรวจรักษาพยาบาลและพักฟื้นร่างกาย",
 contact_during_leave:"ที่พักตามที่อยู่แจ้งไว้",contact_phone:"000-000-0000",
 submitted_at:"2026-11-01T10:30:00Z",personnel_reviewer_name:"หัวหน้าฝ่ายบุคคล",
 personnel_reviewed_at:"2026-11-01T12:30:00Z",director_reviewer_name:"ผู้อำนวยการ",
 director_reviewed_at:"2026-11-02T08:00:00Z",status:"approved"
};
let browser;
for(const executable of ["google-chrome","chromium","chromium-browser"]){
 try{execFileSync("which",[executable],{stdio:"ignore"});browser=executable;break;}catch{}
}
assert(browser,"Chrome is required");
const dir=mkdtempSync(join(tmpdir(),"bnk-leave-realpdf-"));
for(const [kind,reason] of [["normal",sample.reason],["long-reason",sample.reason.repeat(3)]]){
 const html=render({...sample,reason},{schoolLogo:null,documentSignatures:{}});
 for(const term of ["แบบคำขอ","สถิติการลา","หัวหน้ากลุ่มงานบริหารงานบุคคล","ผู้อำนวยการโรงเรียน"])assert(html.includes(term),kind+" missing section "+term);
 const input=join(dir,kind+".html"),output=join(dir,kind+".pdf");
 writeFileSync(input,'<!doctype html><html lang="th"><head><meta charset="utf-8"><style>'+css+'</style></head><body class="a4-print-body">'+html+'</body></html>');
 execFileSync(browser,["--headless","--no-sandbox","--disable-dev-shm-usage","--disable-gpu","--no-pdf-header-footer",
 "--virtual-time-budget=3500","--print-to-pdf="+output,pathToFileURL(input).href],{stdio:"pipe",timeout:60000});
 assert(statSync(output).size>3000,"No real PDF output for "+kind);
 const info=execFileSync("pdfinfo",[output],{encoding:"utf8"});
 const count=Number(info.match(/^Pages:\s+(\d+)/m)?.[1]);
 const pageSize=info.match(/^Page size:\s+([\d.]+)\s+x\s+([\d.]+)/m);
 assert.equal(count,1,kind+" leave form PDF must be exactly one page");
 assert(pageSize&&Number(pageSize[1])<Number(pageSize[2]),kind+" leave PDF must be A4 portrait");
 console.log("LEAVE_PDF_OK scenario="+kind+" pages="+count+" A4 portrait bytes="+statSync(output).size);
}
