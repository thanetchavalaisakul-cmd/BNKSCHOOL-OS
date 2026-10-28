
CREATE OR REPLACE FUNCTION public.edufee_guard_rate() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
DECLARE v_paid numeric;
BEGIN
 IF NEW.amount=OLD.amount THEN RETURN NEW; END IF;
 SELECT coalesce(max(q.total),0) INTO v_paid FROM (
   SELECT sum(p.amount) total FROM public.edufee_payments p
   WHERE p.academic_year=NEW.academic_year AND p.category=NEW.category
     AND p.voided_at IS NULL AND (NEW.category<>'tuition' OR p.semester=NEW.semester)
   GROUP BY p.student_id
 ) q;
 IF NEW.amount < coalesce(v_paid,0) THEN
  RAISE EXCEPTION 'Fee rate cannot be less than already collected amount (%)',v_paid;
 END IF;
 RETURN NEW;
END$$;
DROP TRIGGER IF EXISTS edufee_guard_rate_update ON public.edufee_rates;
CREATE TRIGGER edufee_guard_rate_update BEFORE UPDATE ON public.edufee_rates
FOR EACH ROW EXECUTE FUNCTION public.edufee_guard_rate();

CREATE OR REPLACE FUNCTION public.edufee_guard_window() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
DECLARE v_other boolean;
BEGIN
 IF NOT OLD.enabled OR NEW.enabled THEN RETURN NEW; END IF;
 IF OLD.category='tuition' THEN
  IF EXISTS(SELECT 1 FROM public.edufee_payments p WHERE p.academic_year=OLD.academic_year
    AND p.semester=OLD.semester AND p.category='tuition' AND p.voided_at IS NULL)
   THEN RAISE EXCEPTION 'Cannot disable a semester fee with recorded payments'; END IF;
 ELSE
  SELECT coalesce(bool_or(w.enabled),false) INTO v_other FROM public.edufee_windows w
   WHERE w.academic_year=OLD.academic_year AND w.category=OLD.category AND w.semester<>OLD.semester;
  IF NOT v_other AND EXISTS(SELECT 1 FROM public.edufee_payments p WHERE p.academic_year=OLD.academic_year
    AND p.category=OLD.category AND p.voided_at IS NULL)
   THEN RAISE EXCEPTION 'Cannot disable the only annual collection window with recorded payments'; END IF;
 END IF;
 RETURN NEW;
END$$;
DROP TRIGGER IF EXISTS edufee_guard_window_update ON public.edufee_windows;
CREATE TRIGGER edufee_guard_window_update BEFORE UPDATE ON public.edufee_windows
FOR EACH ROW EXECUTE FUNCTION public.edufee_guard_window();
