
import test from "node:test";
import assert from "node:assert/strict";
import {createDemoTimetableFeature} from "../timetable-demo.js";

const demoClass={id:"c1",academic_year:"2569",semester:2,stage_code:"stage1",level_name:"ป.3",room_name:"3"};
const template={id:"master",period_mode:"shared",weekdays:[1,2,3,4,5]};
const periodRows=Array.from({length:8},(_,i)=>({
 id:"p"+(i+1),timetable_id:"tp1",period_no:i+1,is_break:i===4,
 start_time:"08:00:00",end_time:"09:00:00"
}));
const teachers=["ครูตัวอย่าง 1 (ทดลอง)","ครูตัวอย่าง 2 (ทดลอง)","ครูตัวอย่าง 3 (ทดลอง)"].map((display_name,i)=>({
 id:"t"+(i+1),class_id:"c1",demo_number:i+1,display_name
}));
function setup(data={}){
 const calls={
  timetable_demo_teachers:data.teachers||teachers,
  timetable_demo_assignments:data.assignments||[],
  timetable_demo_unavailability:data.unavailable||[],
  timetable_demo_entries:data.entries||[]
 };
 const supabase={from:table=>({select:()=>({order:async()=>({data:calls[table],error:null})})})};
 const state={
  timetableProfiles:[{...template,id:"tp1",class_id:"c1",status:"draft"}],
  timetablePeriods:periodRows,
  timetableSubjectOfferings:[{class_id:"c1",subject_id:"thai",is_active:true},{class_id:"c1",subject_id:"math",is_active:true}],
  timetableSubjects:[{id:"thai",subject_name:"ภาษาไทย"},{id:"math",subject_name:"วิชาคณิตศาสตร์"}]
 };
 const feature=createDemoTimetableFeature({
  supabase,state,escapeHtml:s=>String(s),toast:()=>{},redraw:()=>{},
  scopeClasses:()=>[demoClass],currentPeriod:()=>({academicYear:2569,semester:2})
 });
 return {feature,state};
}
test("three demo teachers are selectable as teaching assignment targets",async()=>{
 const {feature}=setup();
 await feature.load();
 const html=feature.html();
 for(const t of teachers)assert.ok(html.includes(t.display_name));
 assert.ok(html.includes("tt-demo-ass-save"));
 assert.ok(html.includes("tt-demo-hours"));
 assert.ok(html.includes("ภาษาไทย"));
 assert.ok(html.includes("วิชาคณิตศาสตร์"));
 assert.ok(html.includes("ข้อมูลทดลอง"));
});
test("demo teacher blocked slots respect eight configured periods, fifth is break",async()=>{
 const {feature}=setup();await feature.load();
 const html=feature.html();
 assert.ok(html.includes("คาบ 5 (พักกลางวัน)"));
 assert.match(html,/data-tt-demo-block="1:5" disabled/);
 assert.doesNotMatch(html,/data-tt-demo-block="1:9"/);
});
test("mock teaching assignments populate timetable and preview with correct remaining lessons",async()=>{
 const assignments=[{id:"a1",class_id:"c1",teacher_id:"t1",subject_id:"thai",periods_per_week:3}];
 const entries=[{id:"e1",class_id:"c1",assignment_id:"a1",weekday:1,period_no:1,is_locked:true}];
 const {feature}=setup({assignments,entries});await feature.load();
 const html=feature.html();
 assert.ok(html.includes("จัดแล้ว 1"));
 assert.ok(html.includes("ปลดล็อก"));
 assert.ok(html.includes("🔒"));
 assert.ok(html.includes("คำนวณตารางทดลองอัตโนมัติ"));
});
test("displaying no assigned lessons encourages starting with teacher and subject",async()=>{
 const {feature}=setup();await feature.load();
 assert.ok(feature.html().includes("ยังไม่ได้มอบหมายวิชา"));
});
