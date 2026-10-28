
-- Follow-up hardening: use a qualified group key in RLS and require group-owner authorization.
drop policy if exists timetable_joint_activities_read on public.timetable_joint_activities;
create policy timetable_joint_activities_read on public.timetable_joint_activities
 for select to authenticated using (
   exists (select 1 from public.timetable_entries e
      where e.joint_activity_id=public.timetable_joint_activities.id
        and private.can_view_timetable_profile(e.timetable_id))
 );
do $patch$
declare def text; marker text;
begin
 def:=pg_get_functiondef('private.validate_timetable_entry()'::regprocedure);
 marker:='where g.id=new.joint_activity_id' || E'\n' || '        and g.academic_year';
 if position(marker in def)=0 then
   raise exception 'Cannot locate joint activity validator for owner authorization';
 end if;
 def:=replace(def,marker,'where g.id=new.joint_activity_id' || E'\n'
   || '        and private.can_manage_timetable_profile(g.owner_timetable_id)' || E'\n'
   || '        and g.academic_year');
 execute def;
end;
$patch$;
