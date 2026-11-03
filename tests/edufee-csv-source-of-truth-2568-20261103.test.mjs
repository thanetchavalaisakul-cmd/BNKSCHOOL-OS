import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createEducationFeeLegacy} from "../education-fee-legacy.js";

const app=readFileSync(new URL("../app.js",import.meta.url),"utf8");
const bundle=readFileSync(new URL("../app.min.js",import.meta.url),"utf8");
const page=readFileSync(new URL("../index.html",import.meta.url),"utf8");
const moduleFile=readFileSync(new URL("../education-fees.js",import.meta.url),"utf8");

function fixture(year="2568") {
 const F={year,searchText:"",manager:false,roster:[],payments:[]};
 const legacy=createEducationFeeLegacy({
  supabase:{},F,state:{systemSettings:{}},
  e:x=>String(x??""),fmt:x=>Number(x||0).toFixed(2),
  htmlMoney:x=>Number(x||0).toFixed(2),
  sc:(value,label)=>'<option value="'+value+'">'+label+'</option>',
  toast(){},renderDashboard(){},educationPrint(){},printOpts:()=>({})
 });
 return {F,legacy};
}

test("historical 2568 fee ledger displays complete raw CSV totals and review separately",()=>{
 const {F,legacy}=fixture();
 F.legacyRows=[
 {id:"good",academic_year:"2568",full_name:"เด็กชาย สมชาย ใจดี",student_id:null,class_name:"ป.1/1",
  review_status:"ready",source_paid_term1:170,source_paid_term2:170,source_paid_water:20,
  expected_term1:170,expected_term2:170,expected_water:20,source_csv_combined:360},
 {id:"review",academic_year:"2568",full_name:"เด็กหญิง สมศรี ใจดี",student_id:null,class_name:"ป.1/1",
  review_status:"review",review_note:"ยอดรวม CSV ไม่ตรงกับยอดแยก",source_csv_combined:20,source_csv_line:321,
  source_paid_term1:0,source_paid_term2:170,source_paid_water:20,
  expected_term1:170,expected_term2:170,expected_water:20}
 ];
 const html=legacy.view();
 assert.match(html,/ประวัติค่าบำรุงตาม CSV ฝ่ายการเงิน/);
 assert.match(html,/ยอดชำระตามช่อง CSV ทั้งหมด/);
 assert.match(html,/550\.00/);
 assert.match(html,/360\.00/);
 assert.match(html,/ยอดรวม CSV ไม่ตรงกับยอดแยก/);
 assert.match(html,/ไม่บังคับเทียบทะเบียนปีปัจจุบัน/);
 assert.match(html,/1 รายการที่ยังต้องตรวจสอบ/);
});

test("academic year 2569 keeps registry-based, verified-only imports",()=>{
 const {F,legacy}=fixture("2569");
 F.legacyRows=[
 {id:"pending",academic_year:"2569",full_name:"เด็กหญิง รอตรวจ รายชื่อ",student_id:null,class_name:"อ.2/3",
  review_status:"ready",source_paid_term1:0,source_paid_term2:0,source_paid_water:0,
  expected_term1:350,expected_term2:0,expected_water:20}
 ];
 const html=legacy.view();
 assert.match(html,/ยอดย้อนหลังจาก Google Sheets/);
 assert.match(html,/ยังไม่จับคู่ทะเบียน 1 รายการ/);
 assert.doesNotMatch(html,/ยอดชำระตามช่อง CSV ทั้งหมด/);
});

test("CSV provenance is exported without inventing a student ID",()=>{
 const source=readFileSync(new URL("../education-fee-legacy.js",import.meta.url),"utf8");
 assert.match(source,/r\.source_csv_combined\?\?""/);
 assert.match(source,/r\.source_csv_line\?\?""/);
 assert.match(source,/r\.review_note\|\|""/);
 assert.match(source,/source_paid_term1/);
 assert.match(source,/source_paid_term2/);
 assert.match(source,/source_paid_water/);
 assert.match(source,/identity_unlinked:row\.academic_year==="2569"/);
});

test("corrected history copy is loaded by the versioned browser bundle",()=>{
 assert.match(moduleFile,/education-fee-legacy\.js\?v=6/);
 assert.match(app,/education-fees\.js\?v=9/);
 assert.match(bundle,/education-fees\.js\?v=9/);
 assert.match(page,/app\.min\.js\?v=5\.12\.9\.78/);
});
