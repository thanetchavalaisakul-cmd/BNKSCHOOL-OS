import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createEducationFeeFeature} from "../education-fees.js";
const migration=readFileSync(new URL("../supabase/migrations/20261102_edufee_annual_insurance_opt_in_and_water_separation.sql",import.meta.url),"utf8");
const print=readFileSync(new URL("../education-fee-print.js",import.meta.url),"utf8");
const fee=readFileSync(new URL("../education-fees.js",import.meta.url),"utf8");

function setup(){
 const x=createEducationFeeFeature({
  supabase:{},state:{user:{id:"staff"},profile:{role:"super_admin"},academicTerms:[],systemSettings:{}},
  escapeHtml:s=>String(s),toast(){},renderDashboard(){},currentAcademicPeriod(){},
  officialPdfFontFaceCss:()=>"",ensureOfficialPdfFont:async()=>{}
 });
 const f=x.F;
 Object.assign(f,{loaded:true,loading:false,error:"",access:true,manager:true,year:"2569",semester:2,
  tab:"dashboard",staff:[],people:[],collectibleClassIds:[],payments:[],depositChoices:[],
  roster:[{student_id:"child",class_id:"c",class_name:"ป.1/1",student_code:"007",full_name:"นักเรียนทดสอบ"}],
  rates:[{academic_year:"2569",category:"tuition",semester:1,amount:350},
   {academic_year:"2569",category:"tuition",semester:2,amount:350},
   {academic_year:"2569",category:"water",semester:0,amount:20},
   {academic_year:"2569",category:"deposit",semester:0,amount:150}],
  cycles:[{academic_year:"2569",category:"tuition",cycle:"semester"},
   {academic_year:"2569",category:"water",cycle:"annual"},
   {academic_year:"2569",category:"deposit",cycle:"annual"}],
  windows:[
   {academic_year:"2569",semester:1,category:"tuition",enabled:true},
   {academic_year:"2569",semester:2,category:"tuition",enabled:true},
   {academic_year:"2569",semester:1,category:"water",enabled:true},
   {academic_year:"2569",semester:1,category:"deposit",enabled:true}]});
 f.legacyRows=[{id:"r",student_id:"child",academic_year:"2569",review_status:"ready",
  source_paid_term1:350,source_paid_term2:0,source_paid_water:20}];f.legacyReceipts=[];
 return {x,f};
}
test("water 20 paid in annual column NEVER counted in term-two tuition total",()=>{
 const {x,f}=setup();
 const term2=x.view();
 assert.match(term2,/350\.00/);
 assert.match(term2,/คงค้าง/);
 assert.match(term2,/รายปี/);
 assert.match(term2,/ไม่ใช่เงินค่าเทอม 2/);
 assert.match(term2,/ค่าประกัน.*รายปี/);
 assert.match(term2,/สรุปตามประเภทเงิน/);
 assert.doesNotMatch(term2,/420\.00/);
 f.semester=1;
 const term1=x.view();
 assert.match(term1,/370\.00/);
});
test("insurance creates obligation only for an explicit opted-in student",()=>{
 const {x,f}=setup();f.semester=1;
 assert.match(x.view(),/370\.00/);
 f.depositChoices=[{student_id:"child",academic_year:"2569",opted_in:true}];
 assert.match(x.view(),/520\.00/);
 f.tab="registry";
 assert.match(x.view(),/data-fee-insurance-option/);
 assert.match(x.view(),/edufee-deposit-pdf/);
});
test("database rejects insurance payment without election and prevents term-cycle drift",()=>{
 assert.match(migration,/edufee_enforce_deposit_choice/);
 assert.match(migration,/before insert or update of category,student_id,academic_year/);
 assert.match(migration,/edufee_set_deposit_choice/);
 assert.match(migration,/edufee_can_collect/);
 assert.match(migration,/edufee_annual_cycles_guard/);
 assert.match(migration,/semester=1 and category='deposit'/);
 assert.doesNotMatch(migration,/update public\.edufee_windows[^;]+semester=2/i);
});
test("year-only insurance PDF and term-two report separation exist",()=>{
 assert.match(fee,/type:"deposit"/);
 assert.match(print,/function depositReport/);
 assert.match(print,/สมัครใจรายปี/);
 assert.match(print,/รายปี \(แสดงแยก ไม่ใช่หนี้ภาคเรียนที่ ๒\)/);
 assert.match(fee,/F\.semester!==2\|\|cycleOf\(k\)!=="annual"/);
});
