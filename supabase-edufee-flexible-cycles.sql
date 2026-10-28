
-- Configurable fee billing cycles and automatic homeroom collector rights.
CREATE TABLE IF NOT EXISTS public.edufee_cycles (
 academic_year text not null,
 category text not null check(category in ('tuition','deposit','water')),
 cycle text not null check(cycle in ('annual','semester')),
 updated_by uuid references public.profiles(id),
 updated_at timestamptz not null default now(),
 primary key (academic_year,category)
);
INSERT INTO public.edufee_cycles(academic_year,category,cycle)
SELECT year_info.academic_year, cat.category, cat.cycle
FROM (SELECT DISTINCT academic_year FROM public.edufee_rates) year_info
CROSS JOIN (VALUES ('tuition','semester'),('deposit','annual'),('water','annual')) cat(category,cycle)
ON CONFLICT DO NOTHING;

ALTER TABLE public.edufee_rates DROP CONSTRAINT IF EXISTS edufee_rates_check;
ALTER TABLE public.edufee_cycles ENABLE ROW LEVEL SECURITY;
CREATE POLICY edufee_cycles_read ON public.edufee_cycles FOR SELECT TO authenticated
USING (public.edufee_is_leader() OR EXISTS(SELECT 1 FROM public.edufee_staff s WHERE s.user_id=auth.uid())
 OR EXISTS(SELECT 1 FROM public.homeroom_teachers ht JOIN public.profiles p ON p.id=ht.teacher_id WHERE ht.teacher_id=auth.uid() AND p.account_status='active' AND p.deleted_at IS NULL));
GRANT SELECT ON public.edufee_cycles TO authenticated;

CREATE OR REPLACE FUNCTION public.edufee_can_collect(p_class uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT public.edufee_is_manager()
 OR (auth.uid() is not null AND EXISTS(
   SELECT 1 FROM public.edufee_staff f JOIN public.profiles p ON p.id=f.user_id
   WHERE f.user_id=auth.uid() AND f.role='collector' AND (f.class_id=p_class OR f.class_id IS NULL)
   AND p.account_status='active' AND p.deleted_at IS NULL))
 OR (auth.uid() is not null AND EXISTS(
   SELECT 1 FROM public.homeroom_teachers ht JOIN public.profiles p ON p.id=ht.teacher_id
   WHERE ht.class_id=p_class AND ht.teacher_id=auth.uid() AND p.account_status='active' AND p.deleted_at IS NULL));
$$;

CREATE OR REPLACE FUNCTION public.edufee_my_collectible_classes(p_year text,p_semester integer)
RETURNS TABLE(class_id uuid)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT c.id FROM public.school_classes c
 WHERE c.academic_year=p_year AND c.semester=p_semester AND c.is_active AND public.edufee_can_collect(c.id)
 ORDER BY c.sort_order
$$;
REVOKE ALL ON FUNCTION public.edufee_my_collectible_classes(text,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.edufee_my_collectible_classes(text,integer) TO authenticated;

DROP POLICY IF EXISTS edufee_rates_select ON public.edufee_rates;
CREATE POLICY edufee_rates_select ON public.edufee_rates FOR SELECT TO authenticated
USING (public.edufee_is_leader() OR EXISTS(SELECT 1 FROM public.edufee_staff f WHERE f.user_id=auth.uid())
 OR EXISTS(SELECT 1 FROM public.homeroom_teachers ht JOIN public.profiles p ON p.id=ht.teacher_id WHERE ht.teacher_id=auth.uid() AND p.account_status='active' AND p.deleted_at IS NULL));
DROP POLICY IF EXISTS edufee_windows_select ON public.edufee_windows;
CREATE POLICY edufee_windows_select ON public.edufee_windows FOR SELECT TO authenticated
USING (public.edufee_is_leader() OR EXISTS(SELECT 1 FROM public.edufee_staff f WHERE f.user_id=auth.uid())
 OR EXISTS(SELECT 1 FROM public.homeroom_teachers ht JOIN public.profiles p ON p.id=ht.teacher_id WHERE ht.teacher_id=auth.uid() AND p.account_status='active' AND p.deleted_at IS NULL));

CREATE OR REPLACE FUNCTION public.edufee_guard_cycle() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
BEGIN
 IF NEW.cycle IS DISTINCT FROM OLD.cycle AND EXISTS(
   SELECT 1 FROM public.edufee_payments p WHERE p.academic_year=OLD.academic_year AND p.category=OLD.category
 ) THEN
    RAISE EXCEPTION 'Cannot switch annual or semester billing after payments were recorded for this category and academic year';
 END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS edufee_protect_cycle ON public.edufee_cycles;
CREATE TRIGGER edufee_protect_cycle BEFORE UPDATE ON public.edufee_cycles
FOR EACH ROW EXECUTE FUNCTION public.edufee_guard_cycle();

-- Recompute rate guard based on the rate row's semester: 0 = annual, 1/2 = term.
CREATE OR REPLACE FUNCTION public.edufee_guard_rate() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
DECLARE v_paid numeric;
BEGIN
 IF TG_OP='UPDATE' AND NEW.amount=OLD.amount THEN RETURN NEW; END IF;
 SELECT coalesce(max(q.total),0) INTO v_paid FROM (
   SELECT sum(p.amount) total FROM public.edufee_payments p
   WHERE p.academic_year=NEW.academic_year AND p.category=NEW.category
     AND p.voided_at IS NULL AND (NEW.semester=0 OR p.semester=NEW.semester)
   GROUP BY p.student_id
 ) q;
 IF NEW.amount < coalesce(v_paid,0) THEN
   RAISE EXCEPTION 'Fee rate cannot be lower than money already collected for this period (%)',v_paid;
 END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS edufee_guard_rate_update ON public.edufee_rates;
CREATE TRIGGER edufee_guard_rate_update BEFORE INSERT OR UPDATE ON public.edufee_rates
FOR EACH ROW EXECUTE FUNCTION public.edufee_guard_rate();

CREATE OR REPLACE FUNCTION public.edufee_guard_window() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
DECLARE v_other boolean; v_cycle text;
BEGIN
 IF NOT OLD.enabled OR NEW.enabled THEN RETURN NEW; END IF;
 SELECT cycle INTO v_cycle FROM public.edufee_cycles WHERE academic_year=OLD.academic_year AND category=OLD.category;
 v_cycle:=coalesce(v_cycle,CASE WHEN OLD.category='tuition' THEN 'semester' ELSE 'annual' END);
 IF v_cycle='semester' THEN
   IF EXISTS(SELECT 1 FROM public.edufee_payments p WHERE p.academic_year=OLD.academic_year
      AND p.semester=OLD.semester AND p.category=OLD.category AND p.voided_at IS NULL)
    THEN RAISE EXCEPTION 'Cannot disable this semester after payments were collected'; END IF;
 ELSE
   SELECT coalesce(bool_or(w.enabled),false) INTO v_other FROM public.edufee_windows w
   WHERE w.academic_year=OLD.academic_year AND w.category=OLD.category AND w.semester<>OLD.semester;
   IF NOT v_other AND EXISTS(SELECT 1 FROM public.edufee_payments p WHERE p.academic_year=OLD.academic_year
      AND p.category=OLD.category AND p.voided_at IS NULL)
    THEN RAISE EXCEPTION 'Cannot disable the last annual collection window after payments were collected'; END IF;
 END IF;
 RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.edufee_save_fee_plan(
 p_year text,p_category text,p_cycle text,p_annual_amount numeric,p_term1_amount numeric,p_term2_amount numeric)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_previous text; v_amount numeric; v_sem int;
BEGIN
 IF NOT public.edufee_is_manager() THEN RAISE EXCEPTION 'Only financial managers can configure fee plans'; END IF;
 IF p_category NOT IN ('tuition','deposit','water') OR p_cycle NOT IN ('annual','semester')
 OR p_year !~ '^25[0-9]{2}$' THEN RAISE EXCEPTION 'Invalid fee plan parameters'; END IF;
 IF p_annual_amount IS NULL OR p_term1_amount IS NULL OR p_term2_amount IS NULL OR
    LEAST(p_annual_amount,p_term1_amount,p_term2_amount)<0 OR
    GREATEST(p_annual_amount,p_term1_amount,p_term2_amount)>1000000 THEN
      RAISE EXCEPTION 'Fee amounts must be between 0 and 1,000,000'; END IF;
 SELECT cycle INTO v_previous FROM public.edufee_cycles
 WHERE academic_year=p_year AND category=p_category FOR UPDATE;
 IF v_previous IS NOT NULL AND v_previous<>p_cycle AND EXISTS(
  SELECT 1 FROM public.edufee_payments p WHERE p.academic_year=p_year AND p.category=p_category
 ) THEN RAISE EXCEPTION 'Cannot change billing cycle for a category with recorded payments'; END IF;
 INSERT INTO public.edufee_cycles(academic_year,category,cycle,updated_by,updated_at)
 VALUES(p_year,p_category,p_cycle,auth.uid(),now())
 ON CONFLICT(academic_year,category) DO UPDATE SET cycle=EXCLUDED.cycle,updated_by=auth.uid(),updated_at=now();
 FOR v_sem IN 0..2 LOOP
   v_amount:=CASE v_sem WHEN 0 THEN p_annual_amount WHEN 1 THEN p_term1_amount ELSE p_term2_amount END;
   INSERT INTO public.edufee_rates(academic_year,semester,category,amount,updated_by,updated_at)
   VALUES(p_year,v_sem,p_category,v_amount,auth.uid(),now())
   ON CONFLICT(academic_year,semester,category) DO UPDATE
   SET amount=EXCLUDED.amount,updated_by=auth.uid(),updated_at=now();
 END LOOP;
END $$;
REVOKE ALL ON FUNCTION public.edufee_save_fee_plan(text,text,text,numeric,numeric,numeric) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.edufee_save_fee_plan(text,text,text,numeric,numeric,numeric) TO authenticated;

CREATE OR REPLACE FUNCTION public.edufee_record_payment(
 p_student uuid,p_class uuid,p_year text,p_semester int,p_category text,
 p_amount numeric,p_paid_on date,p_payer text,p_note text,p_request uuid)
RETURNS public.edufee_payments LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_rate numeric(10,2);v_enabled boolean;v_paid numeric(10,2);
v_row public.edufee_payments%ROWTYPE;v_cycle text;v_rate_sem int;
BEGIN
 IF auth.uid() IS NULL OR NOT public.edufee_can_collect(p_class) THEN
  RAISE EXCEPTION 'Not authorized to receive payments for this class'; END IF;
 IF p_category NOT IN ('tuition','deposit','water') OR p_semester NOT IN (1,2)
    OR p_request IS NULL OR p_amount IS NULL OR p_amount<=0 THEN
  RAISE EXCEPTION 'Invalid payment details'; END IF;
 IF p_paid_on IS NULL OR p_paid_on>current_date THEN RAISE EXCEPTION 'Payment date cannot be in the future'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.student_enrollments e WHERE e.student_id=p_student
  AND e.class_id=p_class AND e.academic_year=p_year AND e.semester=p_semester AND e.enrollment_status='active')
 THEN RAISE EXCEPTION 'Student not enrolled in selected class and term'; END IF;
 SELECT cycle INTO v_cycle FROM public.edufee_cycles WHERE academic_year=p_year AND category=p_category;
 v_cycle:=coalesce(v_cycle,CASE WHEN p_category='tuition' THEN 'semester' ELSE 'annual' END);
 v_rate_sem:=CASE WHEN v_cycle='annual' THEN 0 ELSE p_semester END;
 SELECT w.enabled INTO v_enabled FROM public.edufee_windows w
 WHERE w.academic_year=p_year AND w.semester=p_semester AND w.category=p_category;
 IF NOT coalesce(v_enabled,false) THEN RAISE EXCEPTION 'Fee category is not enabled for this term'; END IF;
 SELECT r.amount INTO v_rate FROM public.edufee_rates r
 WHERE r.academic_year=p_year AND r.semester=v_rate_sem AND r.category=p_category;
 IF coalesce(v_rate,0)<=0 THEN RAISE EXCEPTION 'Configure a positive fee amount before receiving payments'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(
  p_student::text||'/'||p_year||'/'||p_category||'/'||
  (CASE WHEN v_cycle='annual' THEN 'year' ELSE p_semester::text END),0));
 SELECT * INTO v_row FROM public.edufee_payments WHERE request_id=p_request;
 IF FOUND THEN
  IF v_row.student_id=p_student AND v_row.academic_year=p_year AND v_row.semester=p_semester
   AND v_row.category=p_category AND v_row.amount=p_amount AND v_row.voided_at IS NULL
   THEN RETURN v_row; END IF;
  RAISE EXCEPTION 'Duplicate payment request identifier'; END IF;
 SELECT coalesce(sum(t.amount),0) INTO v_paid FROM public.edufee_payments t
 WHERE t.student_id=p_student AND t.academic_year=p_year AND t.category=p_category
 AND (v_cycle='annual' OR t.semester=p_semester) AND t.voided_at IS NULL;
 IF p_amount>v_rate-v_paid THEN
  RAISE EXCEPTION 'Payment exceeds outstanding balance (remaining %)',v_rate-v_paid; END IF;
 INSERT INTO public.edufee_payments
 (request_id,student_id,class_id,academic_year,semester,category,amount,paid_on,payer_name,note,recorded_by)
 VALUES(p_request,p_student,p_class,p_year,p_semester,p_category,p_amount,p_paid_on,
  nullif(btrim(p_payer),''),nullif(btrim(p_note),''),auth.uid())
 RETURNING * INTO v_row;
 INSERT INTO public.edufee_audit(payment_id,actor_id,action,note)
 VALUES(v_row.id,auth.uid(),'recorded','Recorded payment');
 RETURN v_row;
END $$;
