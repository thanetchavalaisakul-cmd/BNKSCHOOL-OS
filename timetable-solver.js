
// Constraint-based draft scheduler for BNK SCHOOL OS. No writes to DB.
const key=(...p)=>p.join("|");
const mns=v=>{const s=String(v||"00:00").split(":");return Number(s[0])*60+Number(s[1])};
const overlap=(a,b)=>mns(a.start_time)<mns(b.end_time)&&mns(a.end_time)>mns(b.start_time);
const yearOf=(c)=>String(c.academic_year)+"|"+Number(c.semester);
const sortSlots=(a,b)=>a.day-b.day||a.period.period_no-b.period.period_no;
export function generateTimetablePlan({classes=[],profiles=[],periods=[],assignments=[],entries=[],blocks=[],fixed=[],jointTeachers=[],selectedClassIds=[],scopeClassIds=[]}){
 const allowed=new Set(scopeClassIds);
 const targets=classes.filter(c=>selectedClassIds.includes(c.id)&&allowed.has(c.id)&&c.stage_code!=="early_childhood");
 const errors=[];const suggestions=[];const assignmentsById=new Map(assignments.map(a=>[a.id,a]));
 const profilesByClass=new Map(profiles.map(p=>[p.class_id,p]));
 const periodsById=new Map(periods.map(p=>[p.id,p]));
 const classById=new Map(classes.map(c=>[c.id,c]));
 const busyByTeacher=new Map();
 const occupied=new Set();
 const usedByAssignment=new Map();
 const usedByDay=new Map();
 const blocked=new Set(blocks.map(b=>key(b.teacher_id,b.academic_year,b.semester,b.weekday,b.period_no)));
 const addBusy=(teacher,c,weekday,period)=>{if(!teacher)return;const k=key(teacher,yearOf(c),weekday);if(!busyByTeacher.has(k))busyByTeacher.set(k,[]);busyByTeacher.get(k).push(period)};
 const busy=(teacher,c,weekday,period)=>!!teacher&&(busyByTeacher.get(key(teacher,yearOf(c),weekday))||[]).some(p=>overlap(p,period));
 const assigned=(a,day)=>usedByDay.get(key(a.id,day))||0;
 const tick=(a,day)=>{usedByAssignment.set(a.id,(usedByAssignment.get(a.id)||0)+1);usedByDay.set(key(a.id,day),assigned(a,day)+1)};
 const withinPeriod=p=>p&&!p.is_break&&p.start_time&&p.end_time&&mns(p.end_time)>mns(p.start_time);
 for(const entry of entries){
  const profile=profiles.find(p=>p.id===entry.timetable_id),c=classById.get(profile?.class_id);
  const a=assignmentsById.get(entry.assignment_id),period=periodsById.get(entry.period_id);
  if(!c||!period)continue;
  occupied.add(key(c.id,entry.weekday,period.period_no));
  if(a){tick(a,entry.weekday);addBusy(a.teacher_id,c,entry.weekday,period)}
  if(entry.joint_activity_id)for(const j of jointTeachers.filter(j=>j.activity_id===entry.joint_activity_id))addBusy(j.teacher_id,c,entry.weekday,period);
 }
 const fixedBySlot=new Map(fixed.map(f=>[key(f.class_id,f.weekday,f.period_no),f]));
 for(const c of targets){
  const profile=profilesByClass.get(c.id);
  if(!profile){errors.push(c.level_name+"/"+c.room_name+": ยังไม่มีตารางเรียน");continue}
  if(profile.status!=="draft"){errors.push(c.level_name+"/"+c.room_name+": เผยแพร่แล้ว ต้องนำกลับเป็นฉบับร่างก่อน");continue}
  const slots=periods.filter(p=>p.timetable_id===profile.id&&withinPeriod(p))
   .flatMap(p=>(profile.weekdays||[1,2,3,4,5]).map(day=>({day,period:p}))).sort(sortSlots);
  const tasks=assignments.filter(a=>a.class_id===c.id&&a.is_active!==false).map(a=>({a,remaining:Math.max(0,Number(a.periods_per_week||0)-(usedByAssignment.get(a.id)||0))}));
  if(!slots.length){errors.push(c.level_name+"/"+c.room_name+": ยังไม่ได้ตั้งคาบเรียน");continue}
  // Scarce scheduling options first; prefer even distribution of each subject.
  tasks.sort((a,b)=>b.remaining-a.remaining);
  for(const {a,remaining} of tasks){
   for(let i=0;i<remaining;i++){
    let best=null,bestScore=Infinity;
    for(const slot of slots){
     const p=slot.period,day=slot.day;
     if(occupied.has(key(c.id,day,p.period_no))||fixedBySlot.has(key(c.id,day,p.period_no)))continue;
     if(blocked.has(key(a.teacher_id,c.academic_year,c.semester,day,p.period_no)))continue;
     if(busy(a.teacher_id,c,day,p))continue;
     const dayCount=assigned(a,day);
     const workload=(busyByTeacher.get(key(a.teacher_id,yearOf(c),day))||[]).length;
     const neighborCount=slots.filter(s=>s.day===day&&Math.abs(s.period.period_no-p.period_no)===1
       &&occupied.has(key(c.id,day,s.period.period_no))).length;
     const score=dayCount*17+workload*2+neighborCount*0.05+p.period_no*0.1+day*0.01;
     if(score<bestScore){bestScore=score;best=slot}
    }
    if(!best){errors.push(c.level_name+"/"+c.room_name+": ไม่พบคาบว่างให้ "+(a.subject_name||a.teacher_name||"รายวิชา")+" ("+(remaining-i)+" คาบ)");break}
    const slot={class_id:c.id,assignment_id:a.id,weekday:best.day,period_no:best.period.period_no};
    suggestions.push(slot);
    occupied.add(key(c.id,best.day,best.period.period_no));tick(a,best.day);addBusy(a.teacher_id,c,best.day,best.period);
   }
  }
 }
 return {suggestions,errors,classesAttempted:targets.length,complete:errors.length===0};
}
