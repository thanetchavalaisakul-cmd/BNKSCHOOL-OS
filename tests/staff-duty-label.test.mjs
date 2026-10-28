import test from "node:test";
import assert from "node:assert/strict";
import {staffDutyTeachingDisplay} from "../staff-duty-label.js";
test("preschool teacher uses shared weekly units even with zero period subjects",()=>{
 const x=staffDutyTeachingDisplay({homeroom_stage_code:"early_childhood",preschool_weekly_unit_count:22,teaching_assignment_count:0});
 assert.deepEqual(x,{preschool:true,count:22,label:"หน่วยรายสัปดาห์",summary:"22 หน่วยรายสัปดาห์"});
});
test("primary teacher keeps teaching assignments and subject label",()=>{
 const x=staffDutyTeachingDisplay({homeroom_stage_code:"stage1",preschool_weekly_unit_count:22,teaching_assignment_count:4});
 assert.deepEqual(x,{preschool:false,count:4,label:"วิชา",summary:"4 วิชา"});
});
test("preschool with no recorded units reports zero, not a fake completed class",()=>{
 const x=staffDutyTeachingDisplay({homeroom_stage_code:"early_childhood",preschool_weekly_unit_count:0});
 assert.equal(x.summary,"0 หน่วยรายสัปดาห์");
});
