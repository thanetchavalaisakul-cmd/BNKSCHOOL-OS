// Reuse BNK's original per-period document renderer for whole-day assignments.
// Actual scheduled classes remain real lessons; blank periods are duty, never invented subjects.
export function wholeDayDocumentRows(periods,lessons,day,leave) {
  const realLessons=(lessons||[]).filter(l=>l.leave_request_id===day.leave_request_id
    &&l.leave_date===day.leave_date&&l.status==="assigned");
  const first=realLessons[0]||(lessons||[])[0];
  return (periods||[]).slice().sort((a,b)=>Number(a.period_no)-Number(b.period_no)).map(p=>{
    const actual=realLessons.find(l=>Number(l.period_no)===Number(p.period_no)
      &&String(l.start_time||"").slice(0,5)===String(p.start_time||"").slice(0,5))
      ||realLessons.find(l=>Number(l.period_no)===Number(p.period_no));
    return {
      id:actual?.id||"duty:"+day.id+":"+p.period_no,
      leave_request_id:day.leave_request_id,leave_date:day.leave_date,
      leave_request_no:first?.leave_request_no??leave?.request_no??"",
      absent_teacher_name:first?.absent_teacher_name||leave?.requester_name||"",
      period_no:Number(p.period_no),
      start_time:p.start_time,end_time:p.end_time,
      class_label:actual?.class_label||p.class_label||"—",
      subject_name:actual?.subject_name||p.subject_name||"ปฏิบัติหน้าที่แทนครูผู้ลา (ไม่มีรายวิชาตามตาราง)",
      stage_code:actual?.stage_code||first?.stage_code||"",
      substitute_teacher_name:day.substitute_teacher_name,
      substitute_teacher_id:day.substitute_teacher_id
    };
  });
}
export function wholeDayDocumentImages(images,rows,day) {
  const output={...images};
  Object.defineProperty(output,"_paperSlots",{value:images?._paperSlots||new Set(),enumerable:false});
  const accepted=day.status==="accepted" && day.signature_method!=="paper" && !!day.signature_id;
  const dayImage=accepted?images?.["substitute_day:"+day.id]:null;
  for(const row of rows){
    const slot="substitute:"+row.id;
    // Prevent automatic or stale per-period images from showing before explicit whole-day acceptance.
    output[slot]=accepted?(dayImage||images?.[slot]||null):null;
  }
  return output;
}
