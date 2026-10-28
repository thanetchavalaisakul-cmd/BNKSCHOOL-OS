export function staffDutyTeachingDisplay(duty){
  const preschool=duty?.homeroom_stage_code==="early_childhood";
  const count=preschool?Number(duty?.preschool_weekly_unit_count)||0:Number(duty?.teaching_assignment_count)||0;
  return {preschool,count,label:preschool?"หน่วยรายสัปดาห์":"วิชา",summary:preschool?count+" หน่วยรายสัปดาห์":count+" วิชา"};
}
