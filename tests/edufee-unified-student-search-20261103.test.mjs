import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {feeStudentMatches,feeSearchKey} from "../education-fee-search.js";
import {createEducationFeeFeature} from "../education-fees.js";

const esc=v=>String(v).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
function fixture(year="2569"){
 const x=createEducationFeeFeature({
  supabase:{},
  state:{user:{id:"teacher"},profile:{role:"super_admin"},academicTerms:[],systemSettings:{}},
  escapeHtml:esc,toast(){},renderDashboard(){},currentAcademicPeriod(){},
  officialPdfFontFaceCss:()=>"",ensureOfficialPdfFont:async()=>{}
 });
 const F=x.F;
 Object.assign(F,{
  year,semester:1,loaded:true,loading:false,error:"",access:true,manager:true,staff:[],people:[],collectibleClassIds:[],
  tab:"registry",roster:[
   {student_id:"one",student_code:"003701",class_id:"c1",class_name:"ป.1/1",full_name:"เด็กชาย กิตติพงษ์ ใจดี"},
   {student_id:"two",student_code:"003702",class_id:"c2",class_name:"ป.2/1",full_name:"เด็กหญิง แก้วตา แสนสุข"}
  ],
  payments:[],rates:[{academic_year:year,semester:1,category:"tuition",amount:350}],
  cycles:[{academic_year:year,category:"tuition",cycle:"semester"}],
  windows:[{academic_year:year,semester:1,category:"tuition",enabled:true}],
  legacyRows:[],legacyReceipts:[]
 });
 return {x,F};
}

test("Thai name and student code matches whitespace-insensitively without altering records",()=>{
 const student={full_name:"เด็กชาย กิตติพงษ์  ใจดี",student_code:"003701"};
 assert.equal(feeStudentMatches(student,"กิตติพงษ์ใจดี"),true);
 assert.equal(feeStudentMatches(student," กิตติพงษ์   ใจดี "),true);
 assert.equal(feeStudentMatches(student,"003701"),true);
 assert.equal(feeStudentMatches(student,"3701"),true);
 assert.equal(feeStudentMatches(student,"อีกคน"),false);
 assert.equal(feeSearchKey(" เด็กหญิง\u200bแก้วตา "),"เด็กหญิงแก้วตา");
 assert.equal(student.student_code,"003701");
});

test("Every academic year uses a single global live search filtering register and report scope",()=>{
 for(const year of ["2569","2570"]){
  const {x,F}=fixture(year);
  const total=x.view();
  assert.match(total,/เด็กชาย กิตติพงษ์ ใจดี/);
  assert.match(total,/เด็กหญิง แก้วตา แสนสุข/);
  F.searchText="3702";
  const filtered=x.view();
  assert.match(filtered,/id="edufee-search"/);
  assert.match(filtered,/ผลการค้นหา/);
  assert.match(filtered,/เด็กหญิง แก้วตา แสนสุข/);
  assert.doesNotMatch(filtered,/เด็กชาย กิตติพงษ์ ใจดี/);
  assert.match(filtered,/350\.00/);
  F.searchText="ไม่มีรายชื่อ";
  assert.match(x.view(),/ไม่พบชื่อนักเรียนหรือเลขประจำตัว/);
  assert.doesNotMatch(x.view(),/350\.00/);
 }
});

test("2568 search includes graduates/unlinked legacy rows without requiring live enrollments",()=>{
 const {x,F}=fixture("2568");
 F.roster=[];F.tab="dashboard";
 F.legacyRows=[
  {id:"old1",academic_year:"2568",student_id:null,student_code:"2901",full_name:"เด็กชาย มานะ ใจมั่น",class_name:"ม.3",review_status:"ready",
   expected_term1:170,expected_term2:170,expected_water:20,source_paid_term1:170,source_paid_term2:170,source_paid_water:20},
  {id:"old2",academic_year:"2568",student_id:null,student_code:"2902",full_name:"เด็กหญิง ศิริพร จำปา",class_name:"ม.3",review_status:"ready",
   expected_term1:170,expected_term2:170,expected_water:20,source_paid_term1:170,source_paid_term2:0,source_paid_water:20}
 ];
 F.searchText="2902";
 const html=x.view();
 assert.match(html,/เด็กหญิง ศิริพร จำปา/);
 assert.doesNotMatch(html,/เด็กชาย มานะ ใจมั่น/);
 assert.match(html,/ดูยอดจากชีต/);
 assert.match(html,/id="edufee-search"/);
 assert.doesNotMatch(html,/id="edufee-legacy-search"/);
 assert.equal(F.legacyRows.length,2);
});

test("search does not edit financial balances and keeps per-class and insurance filters",()=>{
 const {x,F}=fixture();
 F.classFilter="c1";F.searchText="แก้วตา";
 assert.match(x.view(),/ไม่พบชื่อนักเรียนหรือเลขประจำตัว/);
 F.searchText="กิตติพงษ์";
 const html=x.view();
 assert.match(html,/เด็กชาย กิตติพงษ์ ใจดี/);
 assert.doesNotMatch(html,/เด็กหญิง แก้วตา แสนสุข/);
 assert.equal(F.payments.length,0);
 assert.equal(F.depositChoices.length,0);
});

test("live input handles composition and direct navigation without new RPC or mutations",()=>{
 const fee=readFileSync(new URL("../education-fees.js",import.meta.url),"utf8");
 const legacy=readFileSync(new URL("../education-fee-legacy.js",import.meta.url),"utf8");
 assert.match(fee,/addEventListener\("input",updateSearch\)/);
 assert.match(fee,/addEventListener\("compositionend",updateSearch\)/);
 assert.match(fee,/data-fee-search-detail/);
 assert.match(fee,/data-fee-search-collect/);
 assert.match(fee,/data-fee-search-legacy/);
 assert.match(legacy,/matches\(r,F\.searchText\)/);
});
