
-- Existing BNK School OS stores enabled profiles as 'active', not 'approved'.
CREATE OR REPLACE FUNCTION public.behavior_is_super_admin() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT auth.uid() IS NOT NULL AND EXISTS(SELECT 1 FROM public.profiles p WHERE p.id=auth.uid() AND p.role='super_admin' AND p.deleted_at IS NULL AND p.account_status='active')
$$;
CREATE OR REPLACE FUNCTION public.behavior_is_editor() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT public.behavior_is_super_admin() OR
 (auth.uid() IS NOT NULL AND EXISTS(SELECT 1 FROM public.behavior_managers b JOIN public.profiles p ON p.id=b.user_id WHERE b.user_id=auth.uid() AND p.deleted_at IS NULL AND p.account_status='active'))
$$;
CREATE OR REPLACE FUNCTION public.behavior_is_leader() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT public.behavior_is_editor() OR
 (auth.uid() IS NOT NULL AND EXISTS(SELECT 1 FROM public.profiles p WHERE p.id=auth.uid() AND p.role='director' AND p.deleted_at IS NULL AND p.account_status='active'))
$$;
CREATE OR REPLACE FUNCTION public.behavior_can_read(p_student uuid,p_year text,p_semester int) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT public.behavior_is_leader() OR
 (auth.uid() IS NOT NULL AND EXISTS(
  SELECT 1 FROM public.student_enrollments e
  JOIN public.homeroom_teachers ht ON ht.class_id=e.class_id
  JOIN public.profiles p ON p.id=ht.teacher_id
  WHERE e.student_id=p_student AND e.academic_year=p_year
    AND e.semester=p_semester AND ht.teacher_id=auth.uid()
    AND p.deleted_at IS NULL AND p.account_status='active'
 ))
$$;


-- Student behavior authorization and audit hardening.
CREATE OR REPLACE FUNCTION public.behavior_lock_case_fields() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
BEGIN
  IF (NEW.student_id,NEW.academic_year,NEW.semester,NEW.kind,NEW.occurred_on,NEW.description,NEW.score_delta,NEW.created_by,NEW.created_at)
    IS DISTINCT FROM
     (OLD.student_id,OLD.academic_year,OLD.semester,OLD.kind,OLD.occurred_on,OLD.description,OLD.score_delta,OLD.created_by,OLD.created_at)
  THEN
    RAISE EXCEPTION 'Scored behavior records are immutable; void and create a replacement case';
  END IF;
  IF OLD.event_status='void' AND NEW.event_status<>'void' THEN
    RAISE EXCEPTION 'Voided behavior records cannot be restored';
  END IF;
  NEW.updated_at=now();
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS behavior_case_immutable ON public.behavior_events;
CREATE TRIGGER behavior_case_immutable BEFORE UPDATE ON public.behavior_events
FOR EACH ROW EXECUTE FUNCTION public.behavior_lock_case_fields();

CREATE TABLE IF NOT EXISTS public.behavior_case_audit (
 id uuid primary key default gen_random_uuid(),
 event_id uuid not null references public.behavior_events(id) on delete restrict,
 changed_by uuid references public.profiles(id),
 changed_at timestamptz not null default now(),
 old_status text not null,
 new_status text not null,
 old_parent_status text not null,
 new_parent_status text not null,
 note text
);
ALTER TABLE public.behavior_case_audit ENABLE ROW LEVEL SECURITY;
CREATE POLICY behavior_case_audit_read ON public.behavior_case_audit FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.behavior_events e WHERE e.id=event_id AND public.behavior_can_read(e.student_id,e.academic_year,e.semester)));
GRANT SELECT ON public.behavior_case_audit TO authenticated;
CREATE OR REPLACE FUNCTION public.behavior_log_event_changes() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF OLD.event_status IS DISTINCT FROM NEW.event_status
    OR OLD.parent_status IS DISTINCT FROM NEW.parent_status THEN
   INSERT INTO public.behavior_case_audit(event_id,changed_by,old_status,new_status,old_parent_status,new_parent_status,note)
   VALUES(NEW.id,auth.uid(),OLD.event_status,NEW.event_status,OLD.parent_status,NEW.parent_status,NEW.note);
 END IF;
 RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.behavior_log_event_changes() FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS behavior_case_audit_event ON public.behavior_events;
CREATE TRIGGER behavior_case_audit_event AFTER UPDATE ON public.behavior_events
FOR EACH ROW EXECUTE FUNCTION public.behavior_log_event_changes();

CREATE OR REPLACE FUNCTION public.behavior_notify_homeroom() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_teacher uuid;
BEGIN
 FOR v_teacher IN
   SELECT DISTINCT ht.teacher_id
   FROM public.student_enrollments e
   JOIN public.homeroom_teachers ht ON ht.class_id=e.class_id
   WHERE e.student_id=NEW.student_id AND e.academic_year=NEW.academic_year
     AND e.semester=NEW.semester
 LOOP
   IF v_teacher<>NEW.created_by THEN
     INSERT INTO public.notifications(recipient_id,type,title,message,entity_type,entity_id,action_url)
     VALUES(v_teacher,'student_behavior','แจ้งรายการคะแนนพฤติกรรมนักเรียน',
       CASE WHEN NEW.kind='deduction' THEN 'มีการบันทึกการหักคะแนนพฤติกรรมนักเรียนในห้องที่รับผิดชอบ'
            ELSE 'มีการบันทึกการเพิ่มคะแนนพฤติกรรมนักเรียนในห้องที่รับผิดชอบ' END,
       'behavior_event',NEW.id,'/general/student-behavior');
   END IF;
 END LOOP;
 RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.behavior_notify_homeroom() FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS behavior_case_notify ON public.behavior_events;
CREATE TRIGGER behavior_case_notify AFTER INSERT ON public.behavior_events
FOR EACH ROW EXECUTE FUNCTION public.behavior_notify_homeroom();
