
-- School education fee collection: three configurable categories, academic-year and semester aware.
CREATE TABLE IF NOT EXISTS public.edufee_staff (
 user_id uuid not null references public.profiles(id) on delete cascade,
 class_id uuid references public.school_classes(id) on delete cascade,
 role text not null check(role in ('manager','collector')),
 granted_by uuid references public.profiles(id),
 created_at timestamptz not null default now(),
 id uuid primary key default gen_random_uuid(),
 unique(user_id,class_id,role)
);
CREATE UNIQUE INDEX IF NOT EXISTS edufee_staff_all_unique ON public.edufee_staff(user_id,role) WHERE class_id IS NULL;

CREATE TABLE IF NOT EXISTS public.edufee_rates (
 academic_year text not null,
 semester smallint not null check(semester between 0 and 2),
 category text not null check(category in ('tuition','deposit','water')),
 amount numeric(10,2) not null default 0 check(amount>=0 and amount<=1000000),
 updated_by uuid references public.profiles(id),
 updated_at timestamptz not null default now(),
 primary key(academic_year,semester,category),
 check ((category='tuition' and semester in (1,2)) or (category in ('deposit','water') and semester=0))
);
CREATE TABLE IF NOT EXISTS public.edufee_windows (
 academic_year text not null,
 semester smallint not null check(semester between 1 and 2),
 category text not null check(category in ('tuition','deposit','water')),
 enabled boolean not null default false,
 updated_by uuid references public.profiles(id),
 updated_at timestamptz not null default now(),
 primary key(academic_year,semester,category)
);
INSERT INTO public.edufee_rates(academic_year,semester,category)
VALUES ('2569',1,'tuition'),('2569',2,'tuition'),('2569',0,'deposit'),('2569',0,'water')
ON CONFLICT DO NOTHING;
INSERT INTO public.edufee_windows(academic_year,semester,category)
SELECT '2569',s.semester,c.category FROM (VALUES (1),(2)) s(semester) CROSS JOIN (VALUES ('tuition'),('deposit'),('water')) c(category)
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS public.edufee_payments (
 id uuid primary key default gen_random_uuid(),
 sequence_no bigint generated always as identity unique,
 request_id uuid not null unique,
 student_id uuid not null references public.students(id),
 class_id uuid not null references public.school_classes(id),
 academic_year text not null,
 semester smallint not null check(semester in (1,2)),
 category text not null check(category in ('tuition','deposit','water')),
 amount numeric(10,2) not null check(amount>0 and amount<=1000000),
 paid_on date not null,
 payer_name text,
 note text,
 recorded_by uuid not null references public.profiles(id),
 recorded_at timestamptz not null default now(),
 voided_at timestamptz,
 voided_by uuid references public.profiles(id),
 void_reason text,
 check((voided_at is null and voided_by is null and void_reason is null) or (voided_at is not null and voided_by is not null and nullif(btrim(void_reason),'') is not null))
);
CREATE INDEX IF NOT EXISTS edufee_payments_student_idx ON public.edufee_payments(student_id,academic_year,category,semester);
CREATE INDEX IF NOT EXISTS edufee_payments_class_idx ON public.edufee_payments(class_id,academic_year,semester);
CREATE TABLE IF NOT EXISTS public.edufee_audit (
 id bigint generated always as identity primary key,
 payment_id uuid not null references public.edufee_payments(id),
 actor_id uuid references public.profiles(id),
 action text not null check(action in ('recorded','voided')),
 action_at timestamptz not null default now(),
 note text
);

CREATE OR REPLACE FUNCTION public.edufee_is_superadmin() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT auth.uid() is not null AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id=auth.uid() and p.role='super_admin' and p.account_status='active' and p.deleted_at is null)
$$;
CREATE OR REPLACE FUNCTION public.edufee_is_manager() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT public.edufee_is_superadmin() OR (auth.uid() is not null AND EXISTS(
 SELECT 1 FROM public.edufee_staff f JOIN public.profiles p ON p.id=f.user_id WHERE f.user_id=auth.uid() and f.role='manager' and p.account_status='active' and p.deleted_at is null))
$$;
CREATE OR REPLACE FUNCTION public.edufee_is_leader() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT public.edufee_is_manager() OR (auth.uid() is not null AND EXISTS (
 SELECT 1 FROM public.profiles p LEFT JOIN public.departments d ON d.id=p.department_id
 WHERE p.id=auth.uid() AND p.account_status='active' AND p.deleted_at is null AND
 (p.role='director' OR (p.role='department_head' and d.code='plan_budget'))))
$$;
CREATE OR REPLACE FUNCTION public.edufee_can_collect(p_class uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT public.edufee_is_manager() OR (auth.uid() is not null AND EXISTS(
 SELECT 1 FROM public.edufee_staff f JOIN public.profiles p ON p.id=f.user_id
 WHERE f.user_id=auth.uid() and f.role='collector'
 AND (f.class_id=p_class OR f.class_id is null) AND p.account_status='active' AND p.deleted_at is null))
$$;
CREATE OR REPLACE FUNCTION public.edufee_can_read_class(p_class uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT public.edufee_is_leader() OR public.edufee_can_collect(p_class)
$$;
REVOKE ALL ON FUNCTION public.edufee_is_superadmin(),public.edufee_is_manager(),public.edufee_is_leader(),public.edufee_can_collect(uuid),public.edufee_can_read_class(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.edufee_is_superadmin(),public.edufee_is_manager(),public.edufee_is_leader(),public.edufee_can_collect(uuid),public.edufee_can_read_class(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.edufee_roster(p_year text,p_semester int)
RETURNS TABLE(student_id uuid,student_code text,full_name text,class_id uuid,class_name text,student_number int,guardian_name text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT s.id,s.student_code,trim(concat_ws(' ',s.prefix,s.first_name,s.last_name)),c.id,concat(c.level_name,'/',c.room_name),
 e.student_number,trim(concat_ws(' ',s.guardian_prefix,s.guardian_first_name,s.guardian_last_name))
 FROM public.student_enrollments e JOIN public.students s ON s.id=e.student_id JOIN public.school_classes c ON c.id=e.class_id
 WHERE e.academic_year=p_year AND e.semester=p_semester AND e.enrollment_status='active' AND c.is_active
 AND public.edufee_can_read_class(c.id)
 ORDER BY c.sort_order,e.student_number,s.last_name
$$;
REVOKE ALL ON FUNCTION public.edufee_roster(text,int) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.edufee_roster(text,int) TO authenticated;

CREATE OR REPLACE FUNCTION public.edufee_record_payment(
 p_student uuid,p_class uuid,p_year text,p_semester int,p_category text,
 p_amount numeric,p_paid_on date,p_payer text,p_note text,p_request uuid)
RETURNS public.edufee_payments LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_rate numeric(10,2);v_enabled boolean;v_paid numeric(10,2);v_row public.edufee_payments%ROWTYPE;
BEGIN
 IF auth.uid() IS NULL OR NOT public.edufee_can_collect(p_class) THEN RAISE EXCEPTION 'Not authorized to receive payments for this class'; END IF;
 IF p_category NOT IN ('tuition','deposit','water') OR p_semester NOT IN (1,2) OR p_request IS NULL OR p_amount IS NULL OR p_amount<=0 THEN
   RAISE EXCEPTION 'Invalid payment details';
 END IF;
 IF p_paid_on IS NULL OR p_paid_on>current_date THEN RAISE EXCEPTION 'Payment date cannot be in the future'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.student_enrollments e WHERE e.student_id=p_student AND e.class_id=p_class AND e.academic_year=p_year AND e.semester=p_semester AND e.enrollment_status='active') THEN
   RAISE EXCEPTION 'Student not enrolled in selected class and term';
 END IF;
 SELECT w.enabled INTO v_enabled FROM public.edufee_windows w WHERE w.academic_year=p_year AND w.semester=p_semester AND w.category=p_category;
 IF NOT coalesce(v_enabled,false) THEN RAISE EXCEPTION 'This fee category is not enabled for the selected term'; END IF;
 SELECT r.amount INTO v_rate FROM public.edufee_rates r WHERE r.academic_year=p_year AND r.semester=CASE WHEN p_category='tuition' THEN p_semester ELSE 0 END AND r.category=p_category;
 IF coalesce(v_rate,0)<=0 THEN RAISE EXCEPTION 'Configure a positive fee amount before receiving payments'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_student::text||'/'||p_year||'/'||p_category||'/'||(CASE WHEN p_category='tuition' THEN p_semester::text ELSE 'year' END),0));
 SELECT * INTO v_row FROM public.edufee_payments WHERE request_id=p_request;
 IF FOUND THEN
    IF v_row.student_id=p_student AND v_row.academic_year=p_year AND v_row.semester=p_semester AND v_row.category=p_category AND v_row.amount=p_amount AND v_row.voided_at is null THEN RETURN v_row; END IF;
    RAISE EXCEPTION 'Duplicate payment request identifier';
 END IF;
 SELECT coalesce(sum(t.amount),0) INTO v_paid FROM public.edufee_payments t WHERE t.student_id=p_student AND t.academic_year=p_year AND t.category=p_category
 AND (p_category<>'tuition' OR t.semester=p_semester) AND t.voided_at IS NULL;
 IF p_amount>v_rate-v_paid THEN RAISE EXCEPTION 'Payment exceeds outstanding balance (remaining %)',v_rate-v_paid; END IF;
 INSERT INTO public.edufee_payments(request_id,student_id,class_id,academic_year,semester,category,amount,paid_on,payer_name,note,recorded_by)
 VALUES(p_request,p_student,p_class,p_year,p_semester,p_category,p_amount,p_paid_on,nullif(btrim(p_payer),''),nullif(btrim(p_note),''),auth.uid())
 RETURNING * INTO v_row;
 INSERT INTO public.edufee_audit(payment_id,actor_id,action,note) VALUES(v_row.id,auth.uid(),'recorded','Recorded payment');
 RETURN v_row;
END $$;
REVOKE ALL ON FUNCTION public.edufee_record_payment(uuid,uuid,text,int,text,numeric,date,text,text,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.edufee_record_payment(uuid,uuid,text,int,text,numeric,date,text,text,uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.edufee_void_payment(p_id uuid,p_reason text)
RETURNS public.edufee_payments LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v public.edufee_payments%ROWTYPE;
BEGIN
 IF auth.uid() IS NULL OR NOT public.edufee_is_manager() THEN RAISE EXCEPTION 'Only financial managers can void a payment'; END IF;
 IF char_length(btrim(coalesce(p_reason,'')))<8 THEN RAISE EXCEPTION 'A reason of at least 8 characters is required'; END IF;
 SELECT * INTO v FROM public.edufee_payments WHERE id=p_id FOR UPDATE;
 IF NOT FOUND OR v.voided_at IS NOT NULL THEN RAISE EXCEPTION 'Payment not found or already voided'; END IF;
 UPDATE public.edufee_payments SET voided_at=now(),voided_by=auth.uid(),void_reason=btrim(p_reason) WHERE id=p_id RETURNING * INTO v;
 INSERT INTO public.edufee_audit(payment_id,actor_id,action,note) VALUES(v.id,auth.uid(),'voided',p_reason);
 RETURN v;
END $$;
REVOKE ALL ON FUNCTION public.edufee_void_payment(uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.edufee_void_payment(uuid,text) TO authenticated;

ALTER TABLE public.edufee_staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.edufee_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.edufee_windows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.edufee_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.edufee_audit ENABLE ROW LEVEL SECURITY;
CREATE POLICY edufee_staff_select ON public.edufee_staff FOR SELECT TO authenticated USING (public.edufee_is_manager() OR user_id=auth.uid());
CREATE POLICY edufee_staff_insert ON public.edufee_staff FOR INSERT TO authenticated WITH CHECK(public.edufee_is_superadmin());
CREATE POLICY edufee_staff_delete ON public.edufee_staff FOR DELETE TO authenticated USING(public.edufee_is_superadmin());
CREATE POLICY edufee_rates_select ON public.edufee_rates FOR SELECT TO authenticated USING(public.edufee_is_leader() OR EXISTS(SELECT 1 FROM public.edufee_staff f WHERE f.user_id=auth.uid()));
CREATE POLICY edufee_rates_insert ON public.edufee_rates FOR INSERT TO authenticated WITH CHECK(public.edufee_is_manager());
CREATE POLICY edufee_rates_update ON public.edufee_rates FOR UPDATE TO authenticated USING(public.edufee_is_manager()) WITH CHECK(public.edufee_is_manager());
CREATE POLICY edufee_windows_select ON public.edufee_windows FOR SELECT TO authenticated USING(public.edufee_is_leader() OR EXISTS(SELECT 1 FROM public.edufee_staff f WHERE f.user_id=auth.uid()));
CREATE POLICY edufee_windows_insert ON public.edufee_windows FOR INSERT TO authenticated WITH CHECK(public.edufee_is_manager());
CREATE POLICY edufee_windows_update ON public.edufee_windows FOR UPDATE TO authenticated USING(public.edufee_is_manager()) WITH CHECK(public.edufee_is_manager());
CREATE POLICY edufee_payments_read ON public.edufee_payments FOR SELECT TO authenticated USING(public.edufee_can_read_class(class_id));
CREATE POLICY edufee_audit_read ON public.edufee_audit FOR SELECT TO authenticated USING(EXISTS(SELECT 1 FROM public.edufee_payments p WHERE p.id=payment_id AND public.edufee_can_read_class(p.class_id)));
GRANT SELECT,INSERT,DELETE ON public.edufee_staff TO authenticated;
GRANT SELECT,INSERT,UPDATE ON public.edufee_rates,public.edufee_windows TO authenticated;
GRANT SELECT ON public.edufee_payments,public.edufee_audit TO authenticated;
INSERT INTO public.modules(department_id,code,name_th,name_en,route,sort_order,is_active)
SELECT d.id,'education_fee_collection','ระบบจัดเก็บค่าบำรุงการศึกษา','Education Fee Collection','/plan-budget/education-fees',25,true
FROM public.departments d WHERE d.code='plan_budget' AND NOT EXISTS(SELECT 1 FROM public.modules m WHERE m.code='education_fee_collection');
