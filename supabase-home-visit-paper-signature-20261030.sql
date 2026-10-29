-- Home visits: paper means a captured choice, not a forged electronic signature.
-- A student's or guardian's signature is not the logged-in teacher's saved signature.
ALTER TABLE public.home_visit_signatures ALTER COLUMN signed_at DROP NOT NULL;
ALTER TABLE public.home_visit_signatures ADD COLUMN IF NOT EXISTS method_selected_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.home_visit_signatures ADD COLUMN IF NOT EXISTS method_selected_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.home_visit_signatures DROP CONSTRAINT IF EXISTS home_visit_signatures_method_check;
ALTER TABLE public.home_visit_signatures ADD CONSTRAINT home_visit_signatures_method_check
 CHECK(method IN('paper','drawn','upload','stored'));
ALTER TABLE public.home_visit_signatures DROP CONSTRAINT IF EXISTS home_visit_signatures_check;
ALTER TABLE public.home_visit_signatures ADD CONSTRAINT home_visit_signatures_check
 CHECK(
 (method='paper' AND signature_id IS NULL AND storage_path IS NULL AND signed_at IS NULL)
 OR (method='stored' AND signature_id IS NOT NULL AND storage_path IS NULL AND signed_at IS NOT NULL)
 OR (method IN ('drawn','upload') AND signature_id IS NULL AND bucket_id='home-visits' AND storage_path IS NOT NULL AND signed_at IS NOT NULL)
 );

CREATE OR REPLACE FUNCTION public.home_visit_signatures_validate_method()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $function$
DECLARE v_name text;
BEGIN
  IF auth.uid() IS NOT NULL THEN
    NEW.method_selected_by:=auth.uid();
    NEW.method_selected_at:=now();
    IF NEW.method='stored' THEN
      IF NEW.signer_type NOT IN ('teacher','director') THEN
        RAISE EXCEPTION 'A teacher cannot use their own saved signature for a student, guardian or other person';
      END IF;
      IF NEW.signer_type='director' AND
         NOT (private.current_role()='director' OR EXISTS (
           SELECT 1 FROM public.approval_executives e
           WHERE e.user_id=auth.uid() AND e.is_active AND e.executive_kind IN('director','acting_director')
         )) THEN
        RAISE EXCEPTION 'A saved director signature requires the actual authorized executive';
      END IF;
      IF NOT EXISTS (
         SELECT 1 FROM public.signatures s
         WHERE s.id=NEW.signature_id AND s.user_id=auth.uid()
       ) THEN
        RAISE EXCEPTION 'The saved signature must belong to the authenticated signer';
      END IF;
      SELECT NULLIF(TRIM(p.full_name),'') INTO v_name FROM public.profiles p WHERE p.id=auth.uid();
      NEW.signer_name:=COALESCE(v_name,NEW.signer_name);
    END IF;
  END IF;
  IF NEW.method='paper' THEN
    NEW.signed_at:=NULL;
    NEW.signed_by_user_id:=NULL;
    NEW.signature_id:=NULL;
    NEW.bucket_id:=NULL;
    NEW.storage_path:=NULL;
  ELSE
    NEW.signed_at:=COALESCE(NEW.signed_at,now());
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS home_visit_signatures_validate_method_trg ON public.home_visit_signatures;
CREATE TRIGGER home_visit_signatures_validate_method_trg
BEFORE INSERT OR UPDATE ON public.home_visit_signatures
FOR EACH ROW EXECUTE FUNCTION public.home_visit_signatures_validate_method();

COMMENT ON FUNCTION public.home_visit_signatures_validate_method()
IS 'Paper is an explicit pending wet-signature choice; saved digital signatures require their actual signed-in owner and cannot be used as a guardian/student signature.';
