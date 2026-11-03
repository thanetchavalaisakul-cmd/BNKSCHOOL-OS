-- Keep financial source evidence from the 2568 CSV separate from live student identity.
-- Data rows are imported using a private audited staging batch, not shipped in Git.
ALTER TABLE public.edufee_import_rows
  ADD COLUMN IF NOT EXISTS source_csv_combined numeric,
  ADD COLUMN IF NOT EXISTS source_csv_line integer;
COMMENT ON COLUMN public.edufee_import_rows.source_csv_combined
  IS 'Total exactly as reported by the original finance CSV; nullable and may differ from payment component sum.';
COMMENT ON COLUMN public.edufee_import_rows.source_csv_line
  IS 'Physical one-based CSV line number for audit and reconciliation.';
