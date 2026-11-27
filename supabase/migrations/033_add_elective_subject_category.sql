-- ============================================================================
-- e-FTNHS MIGRATION 033: Allow 'Elective' Category on subjects_catalog (SSHS Grade 11)
-- Target DB: https://ndwwoxsgcegdqiyoipvj.supabase.co
-- Safety: Relaxes CHECK constraint non-destructively to support SSHS Grade 11 'Elective'.
-- ============================================================================

ALTER TABLE public.subjects_catalog
  DROP CONSTRAINT IF EXISTS subjects_catalog_category_check;

ALTER TABLE public.subjects_catalog
  ADD CONSTRAINT subjects_catalog_category_check
  CHECK (category IN ('Core', 'Elective', 'Applied', 'Specialized', 'TVL'));
