import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {wholeDayDocumentRows,wholeDayDocumentImages} from "../substitute-day-document.mjs";
const app=readFileSync(new URL("../app.js",import.meta.url),"utf8");
const day={id:"day1",leave_request_id:"leave1",leave_date:"2026-10-30",substitute_teacher_id:"teacherB",
 substitute_teacher_name:"ครู ข",status:"accepted",signature_method:"stored",signature_id:"sig1"};
const periods=[{period_no:3,start_time:"11:00",end_time:"11:50",subject_name:null,class_label:null},
 {period_no:1,start_time:"09:00",end_time:"09:50",subject_name:"คณิตศาสตร์",class_label:"ป.6/1"},
 {period_no:2,start_time:"10:00",end_time:"10:50",subject_name:null,class_label:null}];
const lesson=[{id:"actual1",leave_request_id:"leave1",leave_date:"2026-10-30",status:"assigned",
 period_no:1,start_time:"09:00:00",class_label:"ป.6/1",subject_name:"คณิตศาสตร์",stage_code:"stage2",
 absent_teacher_name:"ครู ก",leave_request_no:42}];
test("whole-day rows retain exact configured periods and real subjects; empty periods are duty",()=>{
 const rows=wholeDayDocumentRows(periods,lesson,day,null);
 assert.deepEqual(rows.map(r=>r.period_no),[1,2,3]);
 assert.equal(rows[0].id,"actual1");
 assert.equal(rows[0].subject_name,"คณิตศาสตร์");
 assert.match(rows[1].subject_name,/ปฏิบัติหน้าที่แทนครูผู้ลา/);
 assert.equal(rows[2].class_label,"—");
 assert.ok(rows.every(r=>r.substitute_teacher_id==="teacherB"&&r.leave_request_no===42));
 assert.equal(periods[0].period_no,3);
});
test("one accepted online signature appears in every lesson and duty row",()=>{
 const rows=wholeDayDocumentRows(periods,lesson,day);
 const originals={"substitute_day:day1":"data:image/png;base64,approved",
   "substitute:actual1":"data:image/png;base64,prior","requester":"data:image/png;base64,requester"};
 const result=wholeDayDocumentImages(originals,rows,day);
 assert.ok(rows.every(r=>result["substitute:"+r.id]==="data:image/png;base64,approved"));
 assert.equal(result.requester,originals.requester);
 assert.equal(originals["substitute:actual1"],"data:image/png;base64,prior");
});
test("before acceptance or for paper signing all signature images are blank",()=>{
 const rows=wholeDayDocumentRows(periods,lesson,day);
 const imgs={"substitute_day:day1":"data:online","substitute:actual1":"data:old"};
 for(const d of [{...day,status:"assigned"},{...day,signature_method:"paper",signature_id:null}])
  assert.ok(rows.every(r=>wholeDayDocumentImages(imgs,rows,d)["substitute:"+r.id]===null));
});
test("paper override metadata for director and other signers survives cloning",()=>{
 const paper=new Set(["director"]);const images={director:"data:old"};
 Object.defineProperty(images,"_paperSlots",{value:paper,enumerable:false});
 const resolved=wholeDayDocumentImages(images,[],day);
 assert.equal(resolved._paperSlots,paper);
});
test("whole-day PDF uses unchanged legacy per-period document template and styles",()=>{
 const src=app.slice(app.indexOf("async function substituteAllDayPdfPreview(dayId)"),app.indexOf("function substituteDayPlannerHtml()"));
 assert.match(src,/buildSubstituteDocument\(rows,signers,schoolLogo,directorSignature,documentImages\)/);
 assert.match(src,/substituteDocumentStyles\(\)/);
 assert.match(src,/wholeDayDocumentImages\(images,rows,day\)/);
 assert.match(src,/confirmSubstituteAllDay\(day\.id\)/);
 assert.doesNotMatch(src,/บันทึกการปฏิบัติหน้าที่สอนแทนทั้งวัน/);
});
