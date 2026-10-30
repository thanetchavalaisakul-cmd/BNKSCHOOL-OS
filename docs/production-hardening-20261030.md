# BNK SCHOOL OS — production reliability hardening

The existing 237 production migrations are recorded in production-migration-manifest.json. These entries are a tracking ledger only, not full SQL recovery files. Do not claim that a new database can be built solely from the repository. Before future schema releases, capture a restorable schema baseline from the deployed Supabase project, test a scratch restore, and commit every subsequent DDL migration.

Security: database migration closed direct Data API access to the student followup numbering counter and five trigger-only SECURITY DEFINER RPCs. Realtime: after the debounced v5.12.9.56 client is READY, enable 22 existing subscriptions with supabase/migrations/20261030_realtime_consistency.sql. The admin Auth setting for leaked-password protection requires dashboard configuration; do not fake a DB-side setting. Other 250 authenticated SECURITY DEFINER functions must be reviewed based on role; many are legitimate. Empty-policy tables are intentionally private; do not add broad read policies. Unused indexes should not be dropped without representative production statistics. Multiple permissive RLS policies must preserve role OR semantics.

## Release verification

The 2026-10-30 client build v5.12.9.56 passed 156 regression tests, including queued Realtime refresh and paginated timetable datasets. The publication change is intentionally held until this build is serving from the production domain. Do not widen Realtime publication ahead of the client rate limit. Index additions are limited to demonstrated hot paths; unused indexes are retained.
