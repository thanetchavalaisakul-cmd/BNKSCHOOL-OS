
import test from "node:test";
import assert from "node:assert/strict";
import {generateTimetablePlan} from "../timetable-solver.js";
const c1={id:"c1",academic_year:"2569",semester:2,stage_code:"stage1",level_name:"ป.1",room_name:"1"};
const c2={id:"c2",academic_year:"2569",semester:2,stage_code:"stage1",level_name:"ป.1",room_name:"2"};
const profiles=[{id:"p1",class_id:"c1",status:"draft",weekdays:[1,2]},{id:"p2",class_id:"c2",status:"draft",weekdays:[1,2]}];
const periods=[...["p1","p2"].flatMap(timetable_id=>[1,2].map(period_no=>({id:timetable_id+"n"+period_no,timetable_id,period_no,start_time:period_no===1?"08:30:00":"09:30:00",end_time:period_no===1?"09:30:00":"10:30:00",is_break:false})))];
const a1={id:"a1",class_id:"c1",subject_id:"s1",teacher_id:"t1",periods_per_week:2,is_active:true};
const a2={id:"a2",class_id:"c2",subject_id:"s2",teacher_id:"t1",periods_per_week:2,is_active:true};
const base={classes:[c1,c2],profiles,periods,assignments:[a1,a2],entries:[],blocks:[],fixed:[],selectedClassIds:["c1","c2"],scopeClassIds:["c1","c2"]};
test("auto generator schedules two classes without double-booking their shared teacher",()=>{
 const r=generateTimetablePlan(base);
 assert.equal(r.complete,true);
 assert.equal(r.suggestions.length,4);
 for(const x of r.suggestions)for(const y of r.suggestions){
  if(x===y)continue;
  assert.ok(!(x.weekday===y.weekday&&x.period_no===y.period_no),"shared teacher must never overlap");
 }
});
test("teacher unavailable period is never assigned",()=>{
 const b={teacher_id:"t1",academic_year:"2569",semester:2,weekday:1,period_no:1};
 const r=generateTimetablePlan({...base,blocks:[b]});
 assert.ok(r.suggestions.every(x=>!(x.weekday===1&&x.period_no===1)));
});
test("the generator preserves previously placed entries and counts required hours",()=>{
 const entry={timetable_id:"p1",assignment_id:"a1",weekday:1,period_id:"p1n1"};
 const r=generateTimetablePlan({...base,entries:[entry],selectedClassIds:["c1"]});
 assert.equal(r.suggestions.length,1);
 assert.ok(r.suggestions.every(x=>!(x.class_id==="c1"&&x.weekday===1&&x.period_no===1)));
});
test("conflicts are explicit and cannot be marked complete",()=>{
 const r=generateTimetablePlan({...base,blocks:[1,2].flatMap(weekday=>[1,2].map(period_no=>({teacher_id:"t1",academic_year:"2569",semester:2,weekday,period_no})))});
 assert.equal(r.complete,false);
 assert.ok(r.errors.length);
});
test("published timetables are skipped with an explicit reason",()=>{
 const r=generateTimetablePlan({...base,profiles:[{...profiles[0],status:"published"},profiles[1]]});
 assert.equal(r.complete,false);
 assert.ok(r.errors.some(x=>x.includes("เผยแพร่")));
 assert.ok(r.suggestions.every(x=>x.class_id!=="c1"));
});
