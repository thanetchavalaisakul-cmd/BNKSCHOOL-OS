-- BNK SCHOOL OS performance optimization (applied 2026-10-29).
-- Previous joint activity policies traversed row-level access checks on two
-- nested public tables. This helper performs the *same* explicit authorization
-- in a SECURITY DEFINER function, without recursively repeating entry RLS.
-- No timetable rows or teacher permissions are changed.
CREATE OR REPLACE FUNCTION private.can_view_joint_timetable_activity(p_activity_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=''
AS $$
 SELECT EXISTS(
  SELECT 1 FROM public.timetable_entries e
  WHERE e.joint_activity_id=p_activity_id
    AND private.can_view_timetable_profile(e.timetable_id)
 );
$$;
REVOKE ALL ON FUNCTION private.can_view_joint_timetable_activity(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION private.can_view_joint_timetable_activity(uuid) TO authenticated;

DROP POLICY IF EXISTS timetable_joint_activities_read ON public.timetable_joint_activities;
CREATE POLICY timetable_joint_activities_read ON public.timetable_joint_activities
FOR SELECT TO authenticated USING(private.can_view_joint_timetable_activity(id));

DROP POLICY IF EXISTS timetable_joint_teachers_read ON public.timetable_joint_activity_teachers;
CREATE POLICY timetable_joint_teachers_read ON public.timetable_joint_activity_teachers
FOR SELECT TO authenticated USING(private.can_view_joint_timetable_activity(activity_id));
