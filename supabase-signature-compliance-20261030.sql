-- BNK central signature compliance register. Reporting and review only:
-- intentionally does not change approval routes, signature files or document statuses.
CREATE TABLE IF NOT EXISTS public.signature_compliance_registry (
  system_code text PRIMARY KEY REFERENCES public.approval_system_registry(system_code) ON DELETE CASCADE,
  four_methods_verified boolean NOT NULL DEFAULT false,
  before_action_verified boolean NOT NULL DEFAULT false,
  identity_timestamp_verified boolean NOT NULL DEFAULT false,
  pdf_verified boolean NOT NULL DEFAULT false,
  verification_notes text NOT NULL DEFAULT '',
  verified_by uuid,
  verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.signature_compliance_audit (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  system_code text NOT NULL REFERENCES public.approval_system_registry(system_code),
  reviewer_id uuid NOT NULL,
  previous_checks jsonb NOT NULL,
  new_checks jsonb NOT NULL,
  verification_notes text NOT NULL,
  recorded_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.signature_compliance_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.signature_compliance_audit ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.signature_compliance_registry,public.signature_compliance_audit FROM PUBLIC,anon;
GRANT SELECT ON public.signature_compliance_registry,public.signature_compliance_audit TO authenticated;
DROP POLICY IF EXISTS signature_compliance_admin_read ON public.signature_compliance_registry;
CREATE POLICY signature_compliance_admin_read ON public.signature_compliance_registry FOR SELECT TO authenticated
 USING ((SELECT private.is_super_admin()));
DROP POLICY IF EXISTS signature_compliance_audit_admin_read ON public.signature_compliance_audit;
CREATE POLICY signature_compliance_audit_admin_read ON public.signature_compliance_audit FOR SELECT TO authenticated
 USING ((SELECT private.is_super_admin()));

INSERT INTO public.signature_compliance_registry(system_code)
SELECT system_code FROM public.approval_system_registry ON CONFLICT(system_code) DO NOTHING;

CREATE OR REPLACE FUNCTION public.signature_compliance_register_new_system()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $function$
BEGIN
 INSERT INTO public.signature_compliance_registry(system_code)
 VALUES (NEW.system_code) ON CONFLICT (system_code) DO NOTHING;
 RETURN NEW;
END;
$function$;
DROP TRIGGER IF EXISTS signature_compliance_register_trigger ON public.approval_system_registry;
CREATE TRIGGER signature_compliance_register_trigger AFTER INSERT ON public.approval_system_registry
 FOR EACH ROW EXECUTE FUNCTION public.signature_compliance_register_new_system();

CREATE OR REPLACE FUNCTION public.get_signature_compliance_overview()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $function$
DECLARE result jsonb;
BEGIN
 IF auth.uid() IS NULL OR NOT private.is_active_user() OR NOT private.is_super_admin() THEN
  RAISE EXCEPTION 'Super admin access required';
 END IF;
 SELECT coalesce(jsonb_agg(jsonb_build_object(
   'system_code',a.system_code,
   'system_name_th',a.system_name_th,
   'module_code',a.module_code,
   'routing_mode',a.routing_mode,
   'is_active',a.is_active,
   'four_methods_verified',coalesce(c.four_methods_verified,false),
   'before_action_verified',coalesce(c.before_action_verified,false),
   'identity_timestamp_verified',coalesce(c.identity_timestamp_verified,false),
   'pdf_verified',coalesce(c.pdf_verified,false),
   'verification_notes',coalesce(c.verification_notes,''),
   'verified_at',c.verified_at,
   'fully_verified',coalesce(c.four_methods_verified,false)
     AND coalesce(c.before_action_verified,false)
     AND coalesce(c.identity_timestamp_verified,false)
     AND coalesce(c.pdf_verified,false)
  ) ORDER BY a.module_code,a.system_name_th),'[]'::jsonb)
 INTO result
 FROM public.approval_system_registry a
 LEFT JOIN public.signature_compliance_registry c ON c.system_code=a.system_code;
 RETURN result;
END;
$function$;

CREATE OR REPLACE FUNCTION public.review_signature_compliance(
  p_system_code text,
  p_four_methods boolean,
  p_before_action boolean,
  p_identity_timestamp boolean,
  p_pdf boolean,
  p_notes text
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $function$
DECLARE previous public.signature_compliance_registry%ROWTYPE;
        next_checks jsonb;
        previous_checks jsonb;
BEGIN
 IF auth.uid() IS NULL OR NOT private.is_active_user() OR NOT private.is_super_admin() THEN
  RAISE EXCEPTION 'Super admin access required';
 END IF;
 IF p_four_methods IS NULL OR p_before_action IS NULL OR p_identity_timestamp IS NULL OR p_pdf IS NULL THEN
  RAISE EXCEPTION 'All four compliance checks must be explicitly selected';
 END IF;
 IF p_notes IS NULL OR length(btrim(p_notes))<12 THEN
  RAISE EXCEPTION 'Provide test evidence of at least 12 characters';
 END IF;
 IF length(p_notes)>3000 THEN RAISE EXCEPTION 'Evidence note is too long'; END IF;
 SELECT * INTO previous FROM public.signature_compliance_registry WHERE system_code=p_system_code FOR UPDATE;
 IF previous.system_code IS NULL THEN RAISE EXCEPTION 'Unregistered signature system'; END IF;
 previous_checks:=jsonb_build_object('methods',previous.four_methods_verified,
  'before_action',previous.before_action_verified,'identity_timestamp',previous.identity_timestamp_verified,
  'pdf',previous.pdf_verified);
 next_checks:=jsonb_build_object('methods',p_four_methods,
  'before_action',p_before_action,'identity_timestamp',p_identity_timestamp,'pdf',p_pdf);
 UPDATE public.signature_compliance_registry SET
  four_methods_verified=p_four_methods,before_action_verified=p_before_action,
  identity_timestamp_verified=p_identity_timestamp,pdf_verified=p_pdf,
  verification_notes=btrim(p_notes),verified_by=auth.uid(),verified_at=now(),updated_at=now()
 WHERE system_code=p_system_code;
 INSERT INTO public.signature_compliance_audit(system_code,reviewer_id,previous_checks,new_checks,verification_notes)
 VALUES(p_system_code,auth.uid(),previous_checks,next_checks,btrim(p_notes));
END;
$function$;

REVOKE ALL ON FUNCTION public.get_signature_compliance_overview() FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.review_signature_compliance(text,boolean,boolean,boolean,boolean,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_signature_compliance_overview() TO authenticated;
GRANT EXECUTE ON FUNCTION public.review_signature_compliance(text,boolean,boolean,boolean,boolean,text) TO authenticated;