# BNK SCHOOL OS — 14-system prevention review, 30 October 2026

## Deployment
- GitHub tested v5.12.9.57 — 156/156 automated tests succeeded.
- Main Production deployment `eaaa0634530f406aa5d32b823b6e6e46925af842` is READY.
- Supabase Production has 247 applied migrations; GitHub migration inventory is NOT a full restorable schema backup.

## Verified complete changes
1. Student follow-up counter: RLS enabled; anon and authenticated table privileges revoked; internal numbering RPC retained.
2. Five trigger-only SECURITY DEFINER functions: external EXECUTE revoked (no trigger changes).
3. Realtime publications synchronized: 26 -> 48 tables (22 missing now enabled AFTER debounced frontend Production).
7. RLS initplan: 23 -> 0 by replacing direct `auth.uid()` with per-statement `(select auth.uid())` in exactly 23 named policies; USING/WITH CHECK constraints retained.
8. Overlapping permissive policies: 7 -> 0 by dropping two identical read-only procurement policies and preserving OR semantics while merging five more policy pairs.
11. Realtime burst refresh: debounce and serialize refresh callbacks, deployed.
14. Added cursor-safe paginated loading in timetable entries, active teaching assignments, and subjects; previous student enrollment pagination preserved.

## Partially improved — do not claim fully remediated
4. Migration inventory updated to 247 entries; generated static public/private API types recorded. This DOES NOT replace pg_dump or tested point-in-time recovery.
5. 250 public SECURITY DEFINER RPCs remain callable by authenticated roles. Static scan: 236 reference role/identity helpers; 14 are wrappers to guarded methods, scope-aware report functions, or intentionally disabled. DO NOT revoke these 250 because that would break the system; comprehensive role-matrix integration testing remains necessary.
6. FK index advisories: 220 -> 211; nine useful indexes added. Most remaining FK warnings concern low-row-count tables, and adding 211 new indexes could harm writes.
9. Seven private/internal RLS-enabled tables have deliberately NO permissive policies; their direct API access is denied. Adding permissive policies to silence warnings would weaken security.
12. Main JS bundle ~2.46 MB (uncompressed); Vercel serves compressed minified assets. Full route-based code splitting is an architectural change needing functional tests, not a safe hotfix.
13. Unused index advisories 199. No exact duplicate indexes were found by catalog equivalence scan. Query stats are historical/traffic-dependent; deleting all indexes because idx_scan=0 is unsafe.

## Requires Supabase platform owner, not a SQL migration
10. Leaked-password protection remains disabled (security advisor 1 warning). Supabase's Authentication > Sign In / Providers > Email setting 'Prevent use of leaked passwords' must be enabled by authorized project administrator; feature requires Supabase Pro or above. No safe Supabase connector action for changing Auth config was exposed.

## Next release gate
- Keep 156 regression tests green and extend role-matrix tests before sensitive RPC modifications.
- Validate browser login, document approvals, leave deletion, and actual 30-user workload.
- Perform an isolated full database restore exercise and audit all policy and function privileges.
- Check Production alias and Realtime state together before each publication migration.
