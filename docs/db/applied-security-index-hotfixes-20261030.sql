-- Historical mirror of the applied 2026-10-30 BNK Production hotfixes, not a new migration.
-- Source of truth for execution order: Supabase migration history ledger.
-- Security and FK index changes are idempotent; policy consolidation is tracked by the migration ledger.
REVOKE ALL PRIVILEGES ON TABLE public.student_followup_batch_counters FROM PUBLIC, anon, authenticated;
ALTER TABLE public.student_followup_batch_counters ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON FUNCTION public.budget_signer_clear_approval_on_change() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.budget_signer_notify_assignment() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.budget_signer_notify_ready() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.home_visit_signatures_validate_method() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.signature_compliance_register_new_system() FROM PUBLIC, anon, authenticated;
CREATE INDEX IF NOT EXISTS bnk_fki_club_members_student ON public.academic_club_activity_members (student_id);
CREATE INDEX IF NOT EXISTS bnk_fki_club_members_class ON public.academic_club_activity_members (class_id);
CREATE INDEX IF NOT EXISTS bnk_fki_followup_class ON public.student_followup_cases (class_id);
CREATE INDEX IF NOT EXISTS bnk_fki_followup_enrollment ON public.student_followup_cases (enrollment_id);
CREATE INDEX IF NOT EXISTS bnk_fki_academic_offerings_created_by ON public.academic_class_subject_offerings (created_by);
CREATE INDEX IF NOT EXISTS bnk_fki_approval_control_actor ON public.approval_control_audit (actor_user_id);
CREATE INDEX IF NOT EXISTS bnk_fki_approval_document_policy ON public.approval_document_slots (policy_id);
CREATE INDEX IF NOT EXISTS bnk_fki_approval_document_signature ON public.approval_document_slots (signature_id);
CREATE INDEX IF NOT EXISTS bnk_fki_deletion_audit_actor ON public.deletion_audit_log (deleted_by);
-- Realtime 22 table publication migration already recorded at supabase/migrations/20261030_realtime_consistency.sql.
-- 23 RLS policy auth.uid conversions and 7 merged duplicate policy pairs were applied atomically
-- as bnk_optimize_23_auth_uid_rls_policies_20261030,
-- bnk_remove_redundant_procurement_read_policies_20261030 and
-- bnk_merge_5_permissive_policy_pairs_20261030. Preserve the original production
-- definitions through Supabase migration history; avoid recreating old policies.
