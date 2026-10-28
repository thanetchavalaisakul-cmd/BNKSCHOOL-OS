
import test from "node:test";
import assert from "node:assert/strict";
import {createTimetableConstraintFeature} from "../timetable-constraints.js";

function fixture(periodCount=8){
 const c1={id:"c1",stage_code:"stage1",level_name:"ป.3",room_name:"3",academic_year:"2569",semester:2};
 const c2={id:"c2",stage_code:"stage1",level_name:"ป.1",room_name:"1",academic_year:"2569",semester:2};
 const state={
  timetableProfiles:[{id:"p1",class_id:"c1",weekdays:[1,2,3,4,5]},{id:"p2",class_id:"c2",weekdays:[1,2,3,4,5]}],
  timetablePeriodTemplates:[{id:"master",academic_year:"2569",semester:2,weekdays:[1,2,3,4,5]}],
  timetablePeriodTemplateItems:Array.from({length:8},(_,i)=>({template_id:"master",period_no:i+1,is_break:i===4})),
  timetablePeriods:[...Array.from({length:periodCount},(_,i)=>({id:"a"+i,timetable_id:"p1",period_no:i+1,is_break:i===4,start_time:"08:00:00",end_time:"09:00:00"})),
  ...Array.from({length:8},(_,i)=>({id:"b"+i,timetable_id:"p2",period_no:i+1,is_break:i===4,start_time:"08:00:00",end_time:"09:00:00"}))],
  timetableAssignments:[{id:"a1",class_id:"c1",subject_id:"thai",teacher_id:"demo",is_active:true},
    {id:"a2",class_id:"c1",subject_id:"math",teacher_id:"demo",is_active:true},
    {id:"a3",class_id:"c2",subject_id:"science",teacher_id:"another",is_active:true}],
  timetableSubjects:[{id:"thai",subject_name:"ภาษาไทย"},{id:"math",subject_name:"คณิตศาสตร์"},{id:"science",subject_name:"วิทยาศาสตร์"}],
  timetableTeachers:[{id:"demo",full_name:"ครูตัวอย่าง"},{id:"another",full_name:"ครูอีกคน"}]
 };
 const feature=createTimetableConstraintFeature({
  supabase:{},state,escapeHtml:v=>String(v),toast:()=>{},redraw:()=>{},reload:()=>{},
  scopeClasses:()=>[c1,c2],currentPeriod:()=>({academicYear:2569,semester:2})
 });
 return {feature,state};
}
test("select grade and room first before rendering matching subjects",()=>{
 const {feature}=fixture();
 assert.match(feature.conditionsHtml(),/กรุณาเลือกช่วงชั้นก่อน/);
 feature.C.stage="stage1";feature.C.grade="ป.3";feature.C.selectedRooms=["c1"];
 const view=feature.conditionsHtml();
 assert.match(view,/ภาษาไทย/);assert.match(view,/คณิตศาสตร์/);
 assert.doesNotMatch(view,/วิทยาศาสตร์/);
 assert.match(view,/id="tt-rule-all-rooms"/);
});
test("period selector reads real 8 school periods and disables break 5",()=>{
 const {feature}=fixture();
 Object.assign(feature.C,{stage:"stage1",grade:"ป.3",selectedRooms:["c1"],subject:"thai",period:4,length:3});
 const html=feature.conditionsHtml();
 assert.match(html,/<option value="5"[^>]*disabled[^>]*>คาบที่ 5 \(พักกลางวัน\)/);
 assert.match(html,/id="tt-rule-length"/);
 assert.equal(feature.C.length,1,"cannot lock consecutive periods through break");
 assert.doesNotMatch(html,/<option value="9"[^>]*>คาบที่ 9/);
});
test("teacher grid reads school periods and disables break 5",()=>{
 const {feature}=fixture();
 Object.assign(feature.C,{settingTab:"teacher",teacher:"demo"});
 const html=feature.conditionsHtml();
 assert.equal((html.match(/data-tt-new-block="/g)||[]).length,40);
 assert.match(html,/data-tt-new-block="1:5" disabled/);
 assert.doesNotMatch(html,/data-tt-new-block="1:9"/);
});
test("teacher with custom 6-period timetable does not see extra master periods",()=>{
 const {feature}=fixture(6);
 Object.assign(feature.C,{settingTab:"teacher",teacher:"demo"});
 const html=feature.conditionsHtml();
 assert.equal((html.match(/data-tt-new-block="/g)||[]).length,30);
 assert.doesNotMatch(html,/data-tt-new-block="1:7"/);
});
