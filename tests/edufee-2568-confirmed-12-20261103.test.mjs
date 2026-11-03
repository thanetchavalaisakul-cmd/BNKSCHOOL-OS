import test from "node:test";
import assert from "node:assert/strict";
import {canonicalizeFeeImportRows,createEducationFeeLegacy,effectiveImportedPaid} from "../education-fee-legacy.js";

function viewRows(rows){
 const F={year:"2568",searchText:"",manager:false,roster:[],payments:[],legacyRows:rows,legacyReceipts:[]};
 const ui=createEducationFeeLegacy({supabase:{},F,state:{systemSettings:{}},e:x=>String(x??""),fmt:n=>Number(n||0).toFixed(2),htmlMoney:n=>Number(n||0).toFixed(2),sc:(x,y)=>"<option>"+y+"</option>",toast(){},renderDashboard(){},educationPrint(){},printOpts:()=>({})});
 F.legacyRows=rows;
 return ui.view();
}
test("school-confirmed split overrides source without changing original CSV values",()=>{
 const row={source_paid_term1:0,source_paid_term2:340,source_paid_water:20,source_csv_combined:360,confirmed_paid_term1:170,confirmed_paid_term2:170,confirmed_paid_water:20,confirmed_total:360};
 assert.equal(effectiveImportedPaid(row,"tuition",1),170);
 assert.equal(effectiveImportedPaid(row,"tuition",2),170);
 assert.equal(effectiveImportedPaid(row,"water",1),20);
 assert.equal(row.source_paid_term1,0);
 assert.equal(row.source_paid_term2,340);
 assert.equal(row.source_csv_combined,360);
});
test("confirmed year-2568 partial payment still shows remaining term-2 and annual water debt",()=>{
 const row={id:"471",academic_year:"2568",full_name:"เด็กชายตัวอย่าง",class_name:"ป.5/1",student_id:null,review_status:"ready",
 source_paid_term1:0,source_paid_term2:0,source_paid_water:0,source_csv_combined:null,
 confirmed_paid_term1:170,confirmed_paid_term2:0,confirmed_paid_water:0,confirmed_total:170,confirmed_at:"2026-11-03T00:00:00Z",
 expected_term1:170,expected_term2:170,expected_water:20};
 const html=viewRows([row]);
 assert.ok(html.includes("ค้างบางส่วน"));
 assert.ok(html.includes("190.00"));
 assert.ok(html.includes("170.00 / 170.00"));
 assert.ok(html.includes("ยอดชำระตามช่อง CSV ทั้งหมด"));
 assert.ok(html.includes("ตรวจยืนยันยอดแล้ว"));
});
test("legacy rows without confirmations still use raw finance CSV amounts",()=>{
 const row={source_paid_term1:0,source_paid_term2:170,source_paid_water:20};
 assert.equal(effectiveImportedPaid(row,"tuition",1),0);
 assert.equal(effectiveImportedPaid(row,"tuition",2),170);
 assert.equal(effectiveImportedPaid(row,"water",1),20);
 const [canon]=canonicalizeFeeImportRows([{...row,academic_year:"2568",student_id:null}],[]);
 assert.equal(canon.source_paid_term2,170);
});
