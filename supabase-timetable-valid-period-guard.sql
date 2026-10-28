-- BNK SCHOOL OS: teacher unavailability may refer only to teachable configured periods
CREATE OR REPLACE FUNCTION private.validate_timetable_teacher_unavailability()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_colliding_class text;
BEGIN
 IF NOT private.timetable_can_manage_teacher_block(NEW.teacher_id,NEW.academic_year,NEW.semester) THEN
  RAISE EXCEPTION 'No permission to set this teacher availability';
 END IF;
 IF NOT EXISTS(
  SELECT 1 FROM public.teaching_assignments a
  JOIN public.school_classes c ON c.id=a.class_id
  JOIN public.timetable_profiles t ON t.class_id=c.id
  JOIN public.timetable_periods p ON p.timetable_id=t.id
  WHERE a.teacher_id=NEW.teacher_id AND a.is_active=true
   AND c.academic_year=NEW.academic_year AND c.semester=NEW.semester
   AND p.period_no=NEW.period_no AND p.is_break=false
 ) THEN RAISE EXCEPTION 'คาบที่เลือกไม่มีในตารางสอนของครู หรือเป็นคาบพัก'; END IF;
 SELECT cls.level_name||'/'||cls.room_name INTO v_colliding_class
 FROM public.timetable_entries e
 JOIN public.timetable_profiles t ON t.id=e.timetable_id
 JOIN public.school_classes cls ON cls.id=t.class_id
 JOIN public.timetable_periods p ON p.id=e.period_id
 JOIN public.teaching_assignments a ON a.id=e.assignment_id
 WHERE cls.academic_year=NEW.academic_year AND cls.semester=NEW.semester
 AND e.weekday=NEW.weekday AND p.period_no=NEW.period_no
 AND (a.teacher_id=NEW.teacher_id OR EXISTS(
 SELECT 1 FROM public.timetable_joint_activity_teachers jt
 WHERE jt.activity_id=e.joint_activity_id AND jt.teacher_id=NEW.teacher_id))
 LIMIT 1;
 IF v_colliding_class IS NOT NULL THEN
  RAISE EXCEPTION 'ครูมีคาบสอนอยู่แล้วในวันและคาบที่เลือก (%). ต้องย้ายคาบเดิมก่อน',v_colliding_class;
 END IF;
 NEW.created_by:=coalesce(NEW.created_by,auth.uid());
 RETURN NEW;
END $$;
