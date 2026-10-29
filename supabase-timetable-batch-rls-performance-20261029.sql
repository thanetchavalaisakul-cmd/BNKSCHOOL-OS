-- Phase 2: timetable RLS performance, identical per-profile permissions.
-- Compare pre/post user counts before release: admin 368 periods/630 entries;
-- two real teachers 8/35 and 64/280. All counts remained unchanged.
CREATE OR REPLACE FUNCTION private.visible_timetable_profile_ids()
RETURNS uuid[] LANGUAGE sql STABLE SECURITY DEFINER SET search_path=''
AS $$
 SELECT coalesce(array_agg(tp.id),'{}'::uuid[])
 FROM public.timetable_profiles tp
 WHERE private.can_view_timetable_profile(tp.id);
$$;
REVOKE ALL ON FUNCTION private.visible_timetable_profile_ids() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION private.visible_timetable_profile_ids() TO authenticated;

DROP POLICY IF EXISTS timetable_entries_read_scope ON public.timetable_entries;
CREATE POLICY timetable_entries_read_scope ON public.timetable_entries
FOR SELECT TO authenticated
USING (timetable_id = ANY ((SELECT private.visible_timetable_profile_ids())::uuid[]));

DROP POLICY IF EXISTS timetable_periods_read_scope ON public.timetable_periods;
CREATE POLICY timetable_periods_read_scope ON public.timetable_periods
FOR SELECT TO authenticated
USING (timetable_id = ANY ((SELECT private.visible_timetable_profile_ids())::uuid[]));
