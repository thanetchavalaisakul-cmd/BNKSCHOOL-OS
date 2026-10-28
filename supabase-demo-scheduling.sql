-- BNK SCHOOL OS isolated timetable demo; independent from real teaching assignments
CREATE TABLE IF NOT EXISTS public.timetable_demo_assignments (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),class_id uuid NOT NULL REFERENCES public.school_classes(id) ON DELETE CASCADE,
 subject_id uuid NOT NULL REFERENCES public.academic_subjects(id) ON DELETE RESTRICT,
 teacher_id uuid NOT NULL REFERENCES public.timetable_demo_teachers(id) ON DELETE RESTRICT,
 periods_per_week integer NOT NULL CHECK(periods_per_week BETWEEN 1 AND 40),
 created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(class_id,subject_id));
CREATE TABLE IF NOT EXISTS public.timetable_demo_unavailability (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),class_id uuid NOT NULL REFERENCES public.school_classes(id) ON DELETE CASCADE,
 teacher_id uuid NOT NULL REFERENCES public.timetable_demo_teachers(id) ON DELETE CASCADE,
 weekday smallint NOT NULL CHECK(weekday BETWEEN 1 AND 7),period_no integer NOT NULL CHECK(period_no BETWEEN 1 AND 20),
 created_at timestamptz NOT NULL DEFAULT now(),UNIQUE(teacher_id,weekday,period_no));
CREATE TABLE IF NOT EXISTS public.timetable_demo_entries (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),class_id uuid NOT NULL REFERENCES public.school_classes(id) ON DELETE CASCADE,
 assignment_id uuid NOT NULL REFERENCES public.timetable_demo_assignments(id) ON DELETE CASCADE,
 weekday smallint NOT NULL CHECK(weekday BETWEEN 1 AND 7), period_no integer NOT NULL CHECK(period_no BETWEEN 1 AND 20),
 is_locked boolean NOT NULL DEFAULT false,created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(class_id,weekday,period_no));
CREATE INDEX IF NOT EXISTS demo_assignment_teacher_idx ON public.timetable_demo_assignments(teacher_id);
CREATE INDEX IF NOT EXISTS demo_entries_assignment_idx ON public.timetable_demo_entries(assignment_id);
ALTER TABLE public.timetable_demo_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timetable_demo_unavailability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timetable_demo_entries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS demo_ass_access ON public.timetable_demo_assignments;
DROP POLICY IF EXISTS demo_unavail_access ON public.timetable_demo_unavailability;
DROP POLICY IF EXISTS demo_entries_access ON public.timetable_demo_entries;
CREATE POLICY demo_ass_access ON public.timetable_demo_assignments FOR ALL TO authenticated
 USING(private.can_manage_timetable_class(class_id)) WITH CHECK(private.can_manage_timetable_class(class_id));
CREATE POLICY demo_unavail_access ON public.timetable_demo_unavailability FOR ALL TO authenticated
 USING(private.can_manage_timetable_class(class_id)) WITH CHECK(private.can_manage_timetable_class(class_id));
CREATE POLICY demo_entries_access ON public.timetable_demo_entries FOR ALL TO authenticated
 USING(private.can_manage_timetable_class(class_id)) WITH CHECK(private.can_manage_timetable_class(class_id));
GRANT SELECT,INSERT,UPDATE,DELETE ON public.timetable_demo_assignments,public.timetable_demo_unavailability,public.timetable_demo_entries TO authenticated;
REVOKE ALL ON public.timetable_demo_assignments,public.timetable_demo_unavailability,public.timetable_demo_entries FROM anon;
CREATE OR REPLACE FUNCTION private.demo_timetable_validate()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE c uuid; ass record; tp record; v_period record; n integer;
BEGIN
 IF TG_TABLE_NAME='timetable_demo_assignments' THEN
  IF TG_OP='DELETE' THEN RETURN OLD; END IF;
  IF TG_OP='UPDATE' AND OLD.class_id<>NEW.class_id THEN RAISE EXCEPTION 'Cannot move demo assignment between classes'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.timetable_demo_teachers t WHERE t.id=NEW.teacher_id AND t.class_id=NEW.class_id)
    THEN RAISE EXCEPTION 'ครูตัวอย่างไม่อยู่ในห้องทดลองนี้'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.academic_class_subject_offerings o
     WHERE o.class_id=NEW.class_id AND o.subject_id=NEW.subject_id AND o.is_active)
    THEN RAISE EXCEPTION 'รายวิชานี้ไม่ได้เปิดสอนในห้องทดลอง'; END IF;
  IF (SELECT status FROM public.timetable_profiles WHERE class_id=NEW.class_id)<>'draft'
    THEN RAISE EXCEPTION 'แก้ได้เฉพาะตารางฉบับร่าง'; END IF;
  IF TG_OP='UPDATE' AND EXISTS(SELECT 1 FROM public.timetable_demo_entries e WHERE e.assignment_id=OLD.id)
     AND (NEW.teacher_id<>OLD.teacher_id OR NEW.subject_id<>OLD.subject_id)
     THEN RAISE EXCEPTION 'กรุณานำคาบที่จัดไว้ของวิชานี้ออกก่อนเปลี่ยนครูหรือวิชา'; END IF;
  IF TG_OP='UPDATE' AND (SELECT count(*) FROM public.timetable_demo_entries e WHERE e.assignment_id=OLD.id)>NEW.periods_per_week
    THEN RAISE EXCEPTION 'จำนวนคาบใหม่ต่ำกว่าคาบที่จัดไปแล้ว'; END IF;
  RETURN NEW;
 ELSIF TG_TABLE_NAME='timetable_demo_unavailability' THEN
  IF TG_OP='DELETE' THEN RETURN OLD; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.timetable_demo_teachers t WHERE t.id=NEW.teacher_id AND t.class_id=NEW.class_id)
    THEN RAISE EXCEPTION 'ครูตัวอย่างไม่ตรงกับห้อง'; END IF;
  SELECT t.* INTO tp FROM public.timetable_profiles t WHERE t.class_id=NEW.class_id;
  IF tp.id IS NULL OR tp.status<>'draft' THEN RAISE EXCEPTION 'ไม่มีตารางฉบับร่าง'; END IF;
  IF NOT NEW.weekday=ANY(tp.weekdays) THEN RAISE EXCEPTION 'วันที่เลือกไม่เปิดเรียน'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.timetable_periods p WHERE p.timetable_id=tp.id AND p.period_no=NEW.period_no AND NOT p.is_break)
    THEN RAISE EXCEPTION 'คาบพักหรือคาบที่ไม่มีในตารางไม่สามารถล็อกได้'; END IF;
  IF EXISTS(SELECT 1 FROM public.timetable_demo_entries e
    JOIN public.timetable_demo_assignments a ON a.id=e.assignment_id
    WHERE a.teacher_id=NEW.teacher_id AND e.weekday=NEW.weekday AND e.period_no=NEW.period_no)
    THEN RAISE EXCEPTION 'ครูมีคาบสอนอยู่แล้ว ต้องย้ายคาบก่อนล็อกเวลาห้ามสอน'; END IF;
  RETURN NEW;
 ELSIF TG_TABLE_NAME='timetable_demo_entries' THEN
  IF TG_OP='DELETE' THEN
    IF OLD.is_locked THEN RAISE EXCEPTION 'คาบนี้ล็อกไว้ กรุณาปลดล็อกก่อนนำออก'; END IF;
    RETURN OLD;
  END IF;
  IF TG_OP='UPDATE' AND OLD.is_locked AND (NEW.weekday<>OLD.weekday OR NEW.period_no<>OLD.period_no OR NEW.assignment_id<>OLD.assignment_id OR NEW.class_id<>OLD.class_id)
    THEN RAISE EXCEPTION 'คาบนี้ล็อกไว้ กรุณาปลดล็อกก่อนย้าย'; END IF;
  SELECT a.* INTO ass FROM public.timetable_demo_assignments a WHERE a.id=NEW.assignment_id;
  IF ass.id IS NULL OR ass.class_id<>NEW.class_id THEN RAISE EXCEPTION 'รายวิชาไม่ตรงกับห้องทดลอง'; END IF;
  SELECT t.* INTO tp FROM public.timetable_profiles t WHERE t.class_id=NEW.class_id;
  IF tp.id IS NULL OR tp.status<>'draft' THEN RAISE EXCEPTION 'ตารางที่เลือกไม่ใช่ฉบับร่าง'; END IF;
  IF NOT NEW.weekday=ANY(tp.weekdays) THEN RAISE EXCEPTION 'วันที่เลือกไม่เปิดเรียน'; END IF;
  SELECT x.* INTO v_period FROM public.timetable_periods x WHERE x.timetable_id=tp.id AND x.period_no=NEW.period_no AND NOT x.is_break;
  IF v_period.id IS NULL THEN RAISE EXCEPTION 'ไม่สามารถวางคาบเรียนในคาบพักหรือคาบที่ไม่มี'; END IF;
  IF EXISTS(SELECT 1 FROM public.timetable_demo_unavailability u WHERE u.teacher_id=ass.teacher_id AND u.weekday=NEW.weekday AND u.period_no=NEW.period_no)
    THEN RAISE EXCEPTION 'ครูตัวอย่างถูกกำหนดห้ามสอนในคาบนี้'; END IF;
  SELECT count(*) INTO n FROM public.timetable_demo_entries e
    WHERE e.assignment_id=NEW.assignment_id AND e.id<>NEW.id;
  IF n>=ass.periods_per_week THEN RAISE EXCEPTION 'จำนวนคาบเกินที่มอบหมายให้ครูแล้ว'; END IF;
  RETURN NEW;
 END IF;
 RETURN NEW;
END $function$
;
DROP TRIGGER IF EXISTS demo_assignment_validate ON public.timetable_demo_assignments;
CREATE TRIGGER demo_assignment_validate BEFORE INSERT OR UPDATE OR DELETE ON public.timetable_demo_assignments FOR EACH ROW EXECUTE FUNCTION private.demo_timetable_validate();
DROP TRIGGER IF EXISTS demo_unavailable_validate ON public.timetable_demo_unavailability;
CREATE TRIGGER demo_unavailable_validate BEFORE INSERT OR UPDATE OR DELETE ON public.timetable_demo_unavailability FOR EACH ROW EXECUTE FUNCTION private.demo_timetable_validate();
DROP TRIGGER IF EXISTS demo_entries_validate ON public.timetable_demo_entries;
CREATE TRIGGER demo_entries_validate BEFORE INSERT OR UPDATE OR DELETE ON public.timetable_demo_entries FOR EACH ROW EXECUTE FUNCTION private.demo_timetable_validate();
CREATE OR REPLACE FUNCTION public.timetable_demo_save_generated(p_class uuid, p_slots jsonb)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE v jsonb; n integer:=0; tp public.timetable_profiles%rowtype;
BEGIN
 IF auth.uid() IS NULL OR NOT private.can_manage_timetable_class(p_class)
   THEN RAISE EXCEPTION 'ไม่มีสิทธิ์จัดตารางห้องทดลอง'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.timetable_demo_teachers WHERE class_id=p_class)
   THEN RAISE EXCEPTION 'ห้องนี้ไม่ใช่ห้องทดลอง'; END IF;
 IF jsonb_typeof(p_slots)<>'array' OR jsonb_array_length(p_slots)>100
   THEN RAISE EXCEPTION 'จำนวนคาบไม่ถูกต้องหรือมากเกินไป'; END IF;
 SELECT * INTO tp FROM public.timetable_profiles WHERE class_id=p_class FOR UPDATE;
 IF tp.status<>'draft' THEN RAISE EXCEPTION 'ต้องเป็นตารางฉบับร่าง'; END IF;
 FOR v IN SELECT value FROM jsonb_array_elements(p_slots) LOOP
   INSERT INTO public.timetable_demo_entries(class_id,assignment_id,weekday,period_no,is_locked)
   VALUES(p_class,(v->>'assignment_id')::uuid,(v->>'weekday')::int,(v->>'period_no')::int,false);
   n:=n+1;
 END LOOP;
 RETURN n;
END $function$
;
REVOKE ALL ON FUNCTION public.timetable_demo_save_generated(uuid,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.timetable_demo_save_generated(uuid,jsonb) TO authenticated;
