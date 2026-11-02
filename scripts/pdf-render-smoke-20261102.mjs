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
