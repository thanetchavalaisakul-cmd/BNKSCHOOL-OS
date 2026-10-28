CREATE TABLE IF NOT EXISTS public.timetable_demo_teachers (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 class_id uuid NOT NULL REFERENCES public.school_classes(id) ON DELETE CASCADE,
 display_name text NOT NULL CHECK(length(btrim(display_name)) BETWEEN 3 AND 100),
 demo_number smallint NOT NULL CHECK(demo_number BETWEEN 1 AND 10),
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(class_id,demo_number)
);
ALTER TABLE public.timetable_demo_teachers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS timetable_demo_teachers_select ON public.timetable_demo_teachers;
CREATE POLICY timetable_demo_teachers_select ON public.timetable_demo_teachers
 FOR SELECT TO authenticated USING (private.can_manage_timetable_class(class_id));
GRANT SELECT ON public.timetable_demo_teachers TO authenticated;
REVOKE INSERT,UPDATE,DELETE ON public.timetable_demo_teachers FROM anon,authenticated;
INSERT INTO public.timetable_demo_teachers(class_id,demo_number,display_name)
SELECT c.id,n.no,'ครูตัวอย่าง '||n.no||' (ทดลอง)' FROM public.school_classes c
CROSS JOIN (VALUES(1),(2),(3)) AS n(no)
WHERE c.academic_year='2569' AND c.semester=2 AND c.level_name='ป.3' AND c.room_name='3'
ON CONFLICT(class_id,demo_number) DO UPDATE SET display_name=EXCLUDED.display_name;