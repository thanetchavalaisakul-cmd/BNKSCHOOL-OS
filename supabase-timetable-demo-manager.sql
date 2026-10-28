-- BNK SCHOOL OS: optional timetable management restricted to a designated test classroom
CREATE TABLE IF NOT EXISTS public.timetable_demo_managers(
 class_id uuid PRIMARY KEY REFERENCES public.school_classes(id) ON DELETE CASCADE,
 teacher_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_timetable_demo_managers_teacher ON public.timetable_demo_managers(teacher_id);
ALTER TABLE public.timetable_demo_managers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS timetable_demo_read_own ON public.timetable_demo_managers;
CREATE POLICY timetable_demo_read_own ON public.timetable_demo_managers FOR SELECT TO authenticated
 USING (teacher_id=auth.uid() AND EXISTS(
 SELECT 1 FROM public.profiles p WHERE p.id=auth.uid() AND p.account_status='active' AND p.deleted_at IS NULL));
GRANT SELECT ON public.timetable_demo_managers TO authenticated;
REVOKE INSERT,UPDATE,DELETE ON public.timetable_demo_managers FROM anon,authenticated;
CREATE OR REPLACE FUNCTION private.can_manage_timetable_class(p_class_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT private.is_active_user() AND EXISTS(
 SELECT 1 FROM public.school_classes c WHERE c.id=p_class_id AND(
 private.can_manage_timetable_stage(c.academic_year,c.stage_code)
 OR EXISTS(SELECT 1 FROM public.timetable_demo_managers d WHERE d.class_id=c.id AND d.teacher_id=auth.uid())
 ));
$$;
