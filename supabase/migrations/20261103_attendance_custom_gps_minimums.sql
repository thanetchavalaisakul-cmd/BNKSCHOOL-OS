-- Allow authorised attendance managers to configure tighter positive GPS thresholds.
-- The default values, current settings, role policies, and existing attendance records are not changed.
ALTER TABLE public.official_attendance_settings
  DROP CONSTRAINT IF EXISTS official_attendance_settings_allowed_radius_m_check;
ALTER TABLE public.official_attendance_settings
  ADD CONSTRAINT official_attendance_settings_allowed_radius_m_check
  CHECK (allowed_radius_m BETWEEN 1 AND 5000);
ALTER TABLE public.official_attendance_settings
  DROP CONSTRAINT IF EXISTS official_attendance_settings_max_accuracy_m_check;
ALTER TABLE public.official_attendance_settings
  ADD CONSTRAINT official_attendance_settings_max_accuracy_m_check
  CHECK (max_accuracy_m BETWEEN 1 AND 2000);
