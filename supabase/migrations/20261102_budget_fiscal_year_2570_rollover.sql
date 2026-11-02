
-- One-time, audited FY 2570 rollover for project-budget disbursement control numbers.
-- Academic year and all monetary, approval and signing data remain unchanged.
-- Only October 2026 onward rows verified against the production snapshot are eligible.
CREATE TABLE IF NOT EXISTS private.budget_fiscal_rollover_audit (
  migration_id text NOT NULL,
  entity_type text NOT NULL CHECK (entity_type IN ('disbursement','setting')),
  entity_key text NOT NULL,
  before_values jsonb NOT NULL,
  after_values jsonb NOT NULL,
  changed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (migration_id, entity_type, entity_key)
);
COMMENT ON TABLE private.budget_fiscal_rollover_audit IS
  'Immutable reference of original/new control numbers and department counters during one-time fiscal rollover. Private schema; do not publish via the Data API.';
LOCK TABLE public.budget_control_settings, public.budget_disbursements IN ACCESS EXCLUSIVE MODE;
DO $preflight$
BEGIN
  IF EXISTS (SELECT 1 FROM private.budget_fiscal_rollover_audit WHERE migration_id='budget_fy2570_20261102') THEN
    RAISE EXCEPTION 'Rollover was already recorded; refusing to reapply';
  END IF;
  IF (SELECT count(*) FROM public.budget_disbursements WHERE control_year=2569) <> 5
     OR EXISTS (SELECT 1 FROM public.budget_disbursements WHERE control_year=2569 AND (request_date<'2026-10-01' OR control_sequence IS NULL))
     OR EXISTS (SELECT 1 FROM public.budget_disbursements WHERE control_year=2570)
  THEN
    RAISE EXCEPTION 'Budget rows have changed from the verified five-row snapshot; aborting safely';
  END IF;
  IF (SELECT count(*) FROM public.budget_control_settings WHERE control_year=2569) <> 6
     OR EXISTS (SELECT 1 FROM public.budget_control_settings WHERE control_year<>2569)
  THEN
    RAISE EXCEPTION 'Department control settings have changed from the verified six-group snapshot; aborting safely';
  END IF;
END $preflight$;
WITH numbered AS (
  SELECT b.id, b.department_code, coalesce(b.control_group_key,b.department_code) AS group_key,
         b.control_year, b.control_sequence, b.control_number, b.academic_year,
         b.request_date, b.amount, b.status,
         row_number() over (
           partition by coalesce(b.control_group_key,b.department_code)
           order by b.request_date, b.created_at, b.id
         )::integer AS new_sequence
  FROM public.budget_disbursements b
  WHERE b.control_year=2569 AND b.request_date >= '2026-10-01'
)
INSERT INTO private.budget_fiscal_rollover_audit
  (migration_id,entity_type,entity_key,before_values,after_values)
SELECT 'budget_fy2570_20261102','disbursement',id::text,
       jsonb_build_object('group_key',group_key,'control_year',control_year,
         'control_sequence',control_sequence,'control_number',control_number,
         'academic_year',academic_year,'request_date',request_date,'amount',amount,'status',status),
       jsonb_build_object('group_key',group_key,'control_year',2570,
         'control_sequence',new_sequence,'control_number',new_sequence::text||'/2570',
         'academic_year',academic_year,'request_date',request_date,'amount',amount,'status',status)
FROM numbered;
INSERT INTO private.budget_fiscal_rollover_audit
  (migration_id,entity_type,entity_key,before_values,after_values)
SELECT 'budget_fy2570_20261102','setting',s.department_code,
       jsonb_build_object('control_year',s.control_year,'start_number',s.start_number,
         'last_number',s.last_number),
       jsonb_build_object('control_year',2570,'start_number',1,
         'last_number',coalesce((SELECT max((a.after_values->>'control_sequence')::integer)
                  FROM private.budget_fiscal_rollover_audit a
                  WHERE a.migration_id='budget_fy2570_20261102'
                    AND a.entity_type='disbursement'
                    AND a.after_values->>'group_key'=s.department_code),0))
FROM public.budget_control_settings s WHERE s.control_year=2569;
-- Avoid normalizing the restored control number, generating spurious signing actions,
-- or reusing a signed-action trigger for this controlled administrative migration.
-- Disabling is transaction scoped: if migration fails, Postgres rolls back ALTER TABLE.
ALTER TABLE public.budget_disbursements DISABLE TRIGGER USER;
ALTER TABLE public.budget_control_settings DISABLE TRIGGER USER;
UPDATE public.budget_disbursements b
  SET control_year=(a.after_values->>'control_year')::integer,
      control_sequence=(a.after_values->>'control_sequence')::integer,
      control_number=a.after_values->>'control_number'
FROM private.budget_fiscal_rollover_audit a
WHERE a.migration_id='budget_fy2570_20261102' AND a.entity_type='disbursement'
  AND a.entity_key=b.id::text;
UPDATE public.budget_control_settings s
  SET control_year=(a.after_values->>'control_year')::integer,
      start_number=(a.after_values->>'start_number')::integer,
      last_number=(a.after_values->>'last_number')::integer,
      updated_at=now()
FROM private.budget_fiscal_rollover_audit a
WHERE a.migration_id='budget_fy2570_20261102' AND a.entity_type='setting'
  AND a.entity_key=s.department_code;
ALTER TABLE public.budget_control_settings ENABLE TRIGGER USER;
ALTER TABLE public.budget_disbursements ENABLE TRIGGER USER;
DO $verify$
BEGIN
  IF (SELECT count(*) FROM private.budget_fiscal_rollover_audit
      WHERE migration_id='budget_fy2570_20261102' AND entity_type='disbursement') <> 5
     OR (SELECT count(*) FROM private.budget_fiscal_rollover_audit
         WHERE migration_id='budget_fy2570_20261102' AND entity_type='setting') <> 6
     OR EXISTS (SELECT 1 FROM public.budget_disbursements WHERE control_year<>2570)
     OR EXISTS (SELECT 1 FROM public.budget_control_settings WHERE control_year<>2570)
     OR EXISTS (
        SELECT 1 FROM public.budget_disbursements b
        JOIN private.budget_fiscal_rollover_audit a ON a.entity_key=b.id::text
        WHERE a.migration_id='budget_fy2570_20261102' AND a.entity_type='disbursement'
        AND (b.control_sequence<>(a.after_values->>'control_sequence')::integer
          OR b.control_number<>a.after_values->>'control_number'
          OR b.academic_year<>(a.before_values->>'academic_year')::integer
          OR b.amount<>(a.before_values->>'amount')::numeric
          OR b.status<>a.before_values->>'status')
      )
  THEN
    RAISE EXCEPTION 'FY2570 migration verification failed; do not commit changes';
  END IF;
END $verify$;
