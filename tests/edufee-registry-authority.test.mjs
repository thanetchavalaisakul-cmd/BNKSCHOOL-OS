import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {canonicalizeFeeImportRows,createEducationFeeLegacy} from "../education-fee-legacy.js";

const esc=x=>String(x??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
const schoolRow={
 id:"source-1",academic_year:"2569",student_id:"student-1",
 full_name:"เด็กชาย เดวิ จะซือ",student_code:"3898",class_name:"อ.2/3",
 expected_term1:350,source_paid_term1:350,expected_term2:0,source_paid_term2:0,
 expected_water:20,source_paid_water:20,review_status:"ready",source_note:"เดิมตามชีต"
};
const registry={
 student_id:"student-1",full_name:"เด็กชาย เดวิ จะซือ",student_code:"3956",
 class_name:"อ.2/3",class_id:"room-23"
};
test("registry identity overrides incorrect sheet code without overwriting evidence or money",()=>{
 const raw={...schoolRow};
 const [row]=canonicalizeFeeImportRows([raw],[registry]);
 assert.equal(row.full_name,registry.full_name);
 assert.equal(row.student_code,"3956");
 assert.equal(row.sheet_student_code,"3898");
 assert.equal(row.sheet_full_name,raw.full_name);
 assert.equal(row.sheet_class_name,raw.class_name);
 assert.equal(row.source_paid_term1,350);
 assert.equal(row.source_paid_water,20);
 assert.equal(row.source_paid_term2,0);
 assert.equal(row.identity_from_registry,true);
 assert.deepEqual(raw,schoolRow);
});
test("unlinked year-2569 sheet rows are not assumed to be any other registry student",()=>{
 const [row]=canonicalizeFeeImportRows([{...schoolRow,id:"unlinked",student_id:null}],[registry]);
 assert.equal(row.identity_unlinked,true);
 assert.equal(row.student_code,"3898");
 assert.equal(row.student_id,null);
});
test("historical 2568 graduates remain in the source archive when registry record is absent",()=>{
 const [row]=canonicalizeFeeImportRows([{...schoolRow,id:"alumnus",academic_year:"2568",student_id:null}],[]);
 assert.equal(row.full_name,schoolRow.full_name);
 assert.equal(row.identity_unlinked,false);
});
test("confirmed finance totals omit unlinked 2569 rows without changing their amounts",()=>{
 const F={year:"2569",payments:[],roster:[registry],manager:true,legacyRows:[],legacyReceipts:[],pending:false};
 const legacy=createEducationFeeLegacy({
  supabase:{},F,state:{systemSettings:{}},e:esc,fmt:x=>Number(x).toFixed(2),
  htmlMoney:x=>Number(x).toFixed(2),sc:()=>"",toast(){},renderDashboard(){},
  educationPrint(){},printOpts:()=>({})
 });
 F.legacyRows=canonicalizeFeeImportRows([
   schoolRow,{...schoolRow,id:"source-2",student_id:null,student_code:"3897",full_name:"เด็กหญิง คนในชีต",source_paid_term1:350}
 ],[registry]);
 const html=legacy.view();
 assert.match(html,/ตามทะเบียนหลัก/);
 assert.match(html,/ชีตเดิม/);
 assert.match(html,/ยังไม่ยืนยันตัวตนจากทะเบียน/);
 assert.match(html,/ยังไม่จับคู่ทะเบียน 1 รายการ/);
 assert.match(html,/ยอดชำระเดิมและเพิ่มเติม/);
 assert.match(html,/370\.00/); // 350 tuition + 20 annual water, not 720
 assert.equal(F.legacyRows[1].source_paid_term1,350);
});
test("asset version uses the registry-authoritative module in both development and release",()=>{
 const fee=readFileSync(new URL("../education-fees.js",import.meta.url),"utf8");
 const src=readFileSync(new URL("../app.js",import.meta.url),"utf8");
 const min=readFileSync(new URL("../app.min.js",import.meta.url),"utf8");
 assert.match(fee,/education-fee-legacy\.js\?v=6/);
 assert.match(src,/education-fees\.js\?v=9/);
 assert.match(min,/education-fees\.js\?v=9/);
});
