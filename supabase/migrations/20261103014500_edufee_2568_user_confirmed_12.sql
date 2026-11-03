-- 2568 finance CSV: preserve immutable source columns and add school-confirmed amounts.
-- The amounts below were explicitly confirmed in BNK SCHOOL OS chat on 2026-11-03.
-- Keep all 12 records in 'review' until the production UI uses these confirmed fields.
ALTER TABLE public.edufee_import_rows
 ADD COLUMN IF NOT EXISTS confirmed_paid_term1 numeric,
 ADD COLUMN IF NOT EXISTS confirmed_paid_term2 numeric,
 ADD COLUMN IF NOT EXISTS confirmed_paid_water numeric,
 ADD COLUMN IF NOT EXISTS confirmed_total numeric,
 ADD COLUMN IF NOT EXISTS confirmed_note text,
 ADD COLUMN IF NOT EXISTS confirmed_at timestamptz;

COMMENT ON COLUMN public.edufee_import_rows.confirmed_paid_term1 IS 'User-confirmed historical paid term 1; source_paid_term1 remains the original CSV field.';
COMMENT ON COLUMN public.edufee_import_rows.confirmed_paid_term2 IS 'User-confirmed historical paid term 2; source_paid_term2 remains the original CSV field.';
COMMENT ON COLUMN public.edufee_import_rows.confirmed_paid_water IS 'User-confirmed historical paid annual water; source_paid_water remains the original CSV field.';
COMMENT ON COLUMN public.edufee_import_rows.confirmed_total IS 'User-confirmed combined amount; source_csv_combined remains the original CSV-reported total.';
COMMENT ON COLUMN public.edufee_import_rows.confirmed_note IS 'Description and provenance of the human confirmation, without manufacturing a payment receipt.';

DO $preflight$
BEGIN
 IF (SELECT count(*) FROM public.edufee_import_rows
     WHERE academic_year='2568' AND source_spreadsheet_id='csv2568:7c6eeeb56fefe511bc0b3ca5c1e22f7a5ab76acc8b5b79630773aec248d80a91'
       AND review_status='review'
       AND source_csv_line IN (321,332,334,734,503,514,517,471,474,493,757,765)) <> 12
 THEN RAISE EXCEPTION 'Expected exactly 12 pending original 2568 CSV rows; abort confirmation import';
 END IF;
END $preflight$;

WITH verified(line,term1,term2,water,total,note) AS (
 VALUES
 (321, 0, 170, 20, 190, 'ยืนยันยอด 190: เทอม 2=170 ค่าน้ำ=20'),
 (332, 0, 170, 20, 190, 'ยืนยันยอด 190: เทอม 2=170 ค่าน้ำ=20'),
 (334, 0, 170, 20, 190, 'ยืนยันยอด 190: เทอม 2=170 ค่าน้ำ=20'),
 (734, 170, 170, 20, 360, 'ยืนยันยอดชำระรวม 360'),
 (503, 170, 170, 20, 360, 'ยืนยันแบ่งจากช่องเทอม 2 เดิมเป็นเทอม 1=170 เทอม 2=170 ค่าน้ำ=20'),
 (514, 170, 170, 20, 360, 'ยืนยันแบ่งจากช่องเทอม 2 เดิมเป็นเทอม 1=170 เทอม 2=170 ค่าน้ำ=20'),
 (517, 170, 170, 20, 360, 'ยืนยันแบ่งจากช่องเทอม 2 เดิมเป็นเทอม 1=170 เทอม 2=170 ค่าน้ำ=20'),
 (471, 170, 0, 0, 170, 'ยืนยันจ่ายเฉพาะเทอม 1 จำนวน 170'),
 (474, 170, 170, 20, 360, 'ยืนยันชำระครบแล้วทั้งสองเทอมและค่าน้ำ'),
 (493, 170, 0, 0, 170, 'ยืนยันจ่ายเฉพาะเทอม 1 จำนวน 170'),
 (757, 170, 170, 20, 360, 'ยืนยันชำระครบแล้วทั้งสองเทอมและค่าน้ำ'),
 (765, 170, 170, 20, 360, 'ยืนยันชำระครบแล้วทั้งสองเทอมและค่าน้ำ')
)
UPDATE public.edufee_import_rows AS r
SET confirmed_paid_term1 = v.term1,
    confirmed_paid_term2 = v.term2,
    confirmed_paid_water = v.water,
    confirmed_total = v.total,
    confirmed_note = 'ผู้ดูแลยืนยันเมื่อ 3 พ.ย. 2569 (BNK SCHOOL OS) | ' || v.note,
    confirmed_at = now()
FROM verified AS v
WHERE r.academic_year='2568'
  AND r.source_spreadsheet_id='csv2568:7c6eeeb56fefe511bc0b3ca5c1e22f7a5ab76acc8b5b79630773aec248d80a91'
  AND r.source_csv_line=v.line
  AND r.review_status='review';

DO $verification$
BEGIN
 IF (SELECT count(*) FROM public.edufee_import_rows
     WHERE academic_year='2568' AND source_spreadsheet_id='csv2568:7c6eeeb56fefe511bc0b3ca5c1e22f7a5ab76acc8b5b79630773aec248d80a91'
       AND confirmed_at IS NOT NULL
       AND source_csv_line IN (321,332,334,734,503,514,517,471,474,493,757,765)) <> 12
 THEN RAISE EXCEPTION 'Exactly 12 user confirmations were not persisted';
 END IF;
 IF (SELECT count(*) FROM public.edufee_import_rows
     WHERE academic_year='2568' AND source_spreadsheet_id='csv2568:7c6eeeb56fefe511bc0b3ca5c1e22f7a5ab76acc8b5b79630773aec248d80a91'
       AND confirmed_at IS NOT NULL
       AND source_csv_line IN (321,332,334,734,503,514,517,471,474,493,757,765)
       AND (confirmed_paid_term1+confirmed_paid_term2+confirmed_paid_water<>confirmed_total
            OR confirmed_paid_term1>expected_term1
            OR confirmed_paid_term2>expected_term2
            OR confirmed_paid_water>expected_water)) <> 0
 THEN RAISE EXCEPTION 'User-confirmed amount split inconsistent with expected rates';
 END IF;
END $verification$;
