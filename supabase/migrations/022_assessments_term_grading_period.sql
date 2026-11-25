-- ============================================================================
-- e-FTNHS MIGRATION 022: Assessments Grading Period by Term (T1, T2, T3)
-- Target DB: https://ndwwoxsgcegdqiyoipvj.supabase.co
-- Safety: Updates public.assessments grading_period constraint from Q1-Q4 to T1-T3.
-- ============================================================================

DO $$
DECLARE
  c RECORD;
BEGIN
  FOR c IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.assessments'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%grading_period%'
  LOOP
    EXECUTE format('ALTER TABLE public.assessments DROP CONSTRAINT %I', c.conname);
  END LOOP;
END $$;

UPDATE public.assessments
SET grading_period = CASE grading_period
  WHEN 'Q1' THEN 'T1'
  WHEN 'Q2' THEN 'T2'
  WHEN 'Q3' THEN 'T3'
  WHEN 'Q4' THEN 'T3'
  ELSE grading_period
END
WHERE grading_period IN ('Q1', 'Q2', 'Q3', 'Q4');

ALTER TABLE public.assessments
  ALTER COLUMN grading_period SET DEFAULT 'T1';

ALTER TABLE public.assessments
  ADD CONSTRAINT assessments_grading_period_check
  CHECK (grading_period IN ('T1', 'T2', 'T3'));
