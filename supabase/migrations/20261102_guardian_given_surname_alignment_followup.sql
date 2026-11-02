-- Production hotfix bnk_guardian_given_surname_alignment_20261102
-- From the original 609-row private backup, the guardian given name was
-- located in guardian_prefix and surname in guardian_first_name.
-- The previous repair retained both but left them in the wrong columns.
DO $check$
DECLARE backup_count integer;safe_count integer;changed_count integer;
BEGIN
 SELECT count(*) INTO backup_count FROM private.student_parent_columns_backup_20261102;
 SELECT count(*) INTO safe_count FROM public.students s
 JOIN private.student_parent_columns_backup_20261102 b ON b.id=s.id
 WHERE s.guardian_prefix IS NOT DISTINCT FROM b.guardian_prefix
   AND s.guardian_first_name IS NOT DISTINCT FROM b.guardian_first_name
   AND s.guardian_last_name IS NULL
   AND s.father_first_name IS NOT DISTINCT FROM b.father_prefix;
 IF backup_count<>609 OR safe_count<>609 THEN
   RAISE EXCEPTION 'Guardian name correction requires manual inspection: original %, safe %',backup_count,safe_count;
 END IF;
 WITH corrected AS (
  UPDATE public.students s
  SET guardian_prefix=NULL,
      guardian_first_name=b.guardian_prefix,
      guardian_last_name=b.guardian_first_name
  FROM private.student_parent_columns_backup_20261102 b
  WHERE s.id=b.id AND s.guardian_last_name IS NULL
  RETURNING s.id
 ) SELECT count(*) INTO changed_count FROM corrected;
 IF changed_count<>609 THEN RAISE EXCEPTION 'Guardian correction incomplete: %',changed_count; END IF;
END $check$;
