-- Applied to production via migration bnk_security_internal_numbering_and_triggers_20261030.
-- Version-controlled mirror for reproducible access hardening.
REVOKE ALL PRIVILEGES ON TABLE public.student_followup_batch_counters FROM PUBLIC, anon, authenticated;
ALTER TABLE public.student_followup_batch_counters ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE public.student_followup_batch_counters IS 'Internal atomic numbering counter. Accessible only through the guarded SECDEFINER student follow-up code allocator. No direct Data API access.';
REVOKE ALL ON FUNCTION public.budget_signer_clear_approval_on_change() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.budget_signer_notify_assignment() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.budget_signer_notify_ready() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.home_visit_signatures_validate_method() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.signature_compliance_register_new_system() FROM PUBLIC, anon, authenticated;
