
-- Allow a co-teacher to view the published class timetable even without a
-- standard teaching_assignment for that class. Editing rights are unchanged.
do $patch$
declare def text; target text;
begin
 def:=pg_get_functiondef('private.can_view_timetable_class(uuid)'::regprocedure);
 target:='    or exists(select 1 from public.homeroom_teachers h where h.class_id=p_class_id and h.teacher_id=auth.uid())';
 if position(target in def)=0 then raise exception 'Class visibility function changed; aborting'; end if;
 def:=replace(def,target,target || E'\n' || $extra$
    or exists(
      select 1
      from public.timetable_entries e
      join public.timetable_profiles tp on tp.id=e.timetable_id
      join public.timetable_joint_activity_teachers jt on jt.activity_id=e.joint_activity_id
      where tp.class_id=p_class_id and jt.teacher_id=auth.uid()
    )
$extra$);
 execute def;
end;
$patch$;
