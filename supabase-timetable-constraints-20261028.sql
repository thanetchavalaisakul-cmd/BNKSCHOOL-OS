
REVOKE INSERT,DELETE,UPDATE ON public.timetable_fixed_slots FROM authenticated,anon; GRANT SELECT ON public.timetable_fixed_slots TO authenticated;

CREATE OR REPLACE FUNCTION private.validate_timetable_teacher_unavailability()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_colliding_class text;
BEGIN
 IF NOT private.timetable_can_manage_teacher_block(NEW.teacher_id,NEW.academic_year,NEW.semester) THEN
  RAISE EXCEPTION 'No permission to set this teacher availability';
 END IF;
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
