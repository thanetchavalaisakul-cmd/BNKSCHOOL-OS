-- Restore parent-name and occupation columns shifted by a missing
-- guardian surname column in the original school roster.
-- Preserve original values in a private, access-revoked recovery table.
CREATE TABLE IF NOT EXISTS private.student_parent_columns_backup_20261102 AS
SELECT s.id,s.guardian_prefix,s.guardian_first_name,s.guardian_last_name,
       s.guardian_occupation,s.guardian_relationship,
       s.father_prefix,s.father_first_name,s.father_last_name,s.father_occupation,
       s.mother_prefix,s.mother_first_name,s.mother_last_name,s.mother_occupation,
       s.disadvantaged_status,s.updated_at
FROM public.students s
WHERE s.disadvantaged_status IS NULL AND s.mother_occupation='เด็กยากจน'
 AND s.guardian_relationship IN ('นาย','นาง','นางสาว','เด็กหญิง')
 AND s.father_occupation IN ('นาย','นาง','นางสาว','เด็กหญิง');
REVOKE ALL ON private.student_parent_columns_backup_20261102 FROM PUBLIC,anon,authenticated;
DO $guard$
DECLARE expected_count integer; actual_count integer; updated_count integer;
BEGIN
 SELECT count(*) INTO expected_count FROM private.student_parent_columns_backup_20261102;
 IF expected_count<>609 THEN
  RAISE EXCEPTION 'Parent import repair requires manual review: expected 609, found %',expected_count;
 END IF;
 SELECT count(*) INTO actual_count FROM public.students s
 JOIN private.student_parent_columns_backup_20261102 b ON b.id=s.id
 WHERE s.disadvantaged_status IS NULL AND s.mother_occupation='เด็กยากจน'
 AND s.guardian_relationship=b.guardian_relationship
 AND s.father_occupation=b.father_occupation;
 IF actual_count<>expected_count THEN
  RAISE EXCEPTION 'Parent fields changed since backup: % versus %',actual_count,expected_count;
 END IF;
 WITH repaired AS (
 UPDATE public.students s
 SET
  guardian_last_name=NULL,
  guardian_occupation=b.guardian_last_name,
  guardian_relationship=b.guardian_occupation,
  father_prefix=b.guardian_relationship,
  father_first_name=b.father_prefix,
  father_last_name=b.father_first_name,
  father_occupation=b.father_last_name,
  mother_prefix=b.father_occupation,
  mother_first_name=b.mother_prefix,
  mother_last_name=b.mother_first_name,
  mother_occupation=b.mother_last_name,
  disadvantaged_status=b.mother_occupation
 FROM private.student_parent_columns_backup_20261102 b
 WHERE s.id=b.id AND s.disadvantaged_status IS NULL
  AND s.mother_occupation='เด็กยากจน'
 RETURNING s.id
 ) SELECT count(*) INTO updated_count FROM repaired;
 IF updated_count<>expected_count THEN
  RAISE EXCEPTION 'Parent field correction incomplete: % versus %',updated_count,expected_count;
 END IF;
END $guard$;
-- Historic requests remain untouched for approval audit integrity;
-- PDF/form renderers remove verified occupation suffixes from older snapshots.

