CREATE OR REPLACE FUNCTION public.edufee_guard_rate() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
DECLARE v_paid numeric;v_cycle text;
BEGIN
 IF TG_OP='UPDATE' AND NEW.amount=OLD.amount THEN RETURN NEW; END IF;
 SELECT cycle INTO v_cycle FROM public.edufee_cycles
 WHERE academic_year=NEW.academic_year AND category=NEW.category;
 v_cycle:=coalesce(v_cycle,CASE WHEN NEW.category='tuition' THEN 'semester' ELSE 'annual' END);
 IF (v_cycle='annual' AND NEW.semester<>0) OR
    (v_cycle='semester' AND NEW.semester=0) THEN
  RETURN NEW;
 END IF;
 SELECT coalesce(max(q.total),0) INTO v_paid FROM (
   SELECT sum(p.amount) total FROM public.edufee_payments p
   WHERE p.academic_year=NEW.academic_year AND p.category=NEW.category
     AND p.voided_at IS NULL AND (v_cycle='annual' OR p.semester=NEW.semester)
   GROUP BY p.student_id
 ) q;
 IF NEW.amount<coalesce(v_paid,0) THEN
  RAISE EXCEPTION 'Fee rate cannot be lower than money already collected (%)',v_paid;
 END IF;
 RETURN NEW;
END $$;