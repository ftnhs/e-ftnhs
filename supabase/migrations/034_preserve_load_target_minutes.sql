-- ============================================================================
-- e-FTNHS MIGRATION 034: Preserve Per-Term Target Weekly Minutes on Loads
-- Target DB: https://ndwwoxsgcegdqiyoipvj.supabase.co
-- Safety: Non-destructive additive column; keeps plotted vs target minutes separate.
-- ============================================================================

ALTER TABLE public.teacher_subject_loads
  ADD COLUMN IF NOT EXISTS target_minutes_weekly INT;

UPDATE public.teacher_subject_loads
SET target_minutes_weekly = teaching_minutes_weekly
WHERE target_minutes_weekly IS NULL
  AND teaching_minutes_weekly IS NOT NULL
  AND teaching_minutes_weekly > 0;
