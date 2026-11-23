-- Add official school duty to the existing leave-type selector.
-- The existing leave workflow and published-timetable substitute sync are reused.
-- A positive leave_days field still records the *duration* of duty for scheduling;
-- official_duty is excluded from leave quotas and leave-only statistics.
INSERT INTO public.leave_types
  (code, name_th, description_th, counts_against_quota, sort_order, is_active)
VALUES
  ('official_duty',
   'ไปราชการ (ไม่หักวันลา)',
   'ปฏิบัติราชการ ประชุม อบรม หรือปฏิบัติภารกิจภายนอกตามที่โรงเรียนมอบหมาย; ระบบเชื่อมการจัดสอนแทนเมื่อมีตารางสอนที่ได้รับผลกระทบ',
   false, 8, true)
ON CONFLICT (code) DO UPDATE
SET name_th = EXCLUDED.name_th,
    description_th = EXCLUDED.description_th,
    counts_against_quota = false,
    sort_order = EXCLUDED.sort_order,
    is_active = true;

-- Defense against accidentally changing this duty category into quota-counted leave.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.leave_types'::regclass
      AND conname = 'leave_types_official_duty_no_quota'
  ) THEN
    ALTER TABLE public.leave_types
      ADD CONSTRAINT leave_types_official_duty_no_quota
      CHECK (code <> 'official_duty' OR counts_against_quota = false);
  END IF;
END $$;
