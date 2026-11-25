-- ============================================================================
-- e-FTNHS MIGRATION 028: Complete DepEd School Form 1 (SF1) Learner Fields
-- Target DB: https://ndwwoxsgcegdqiyoipvj.supabase.co
-- Adds all official DepEd LIS SF1 School Register columns to public.learners.
-- ============================================================================

ALTER TABLE public.learners
  ADD COLUMN IF NOT EXISTS age_june INT,
  ADD COLUMN IF NOT EXISTS mother_tongue TEXT,
  ADD COLUMN IF NOT EXISTS ip_ethnic_group TEXT,
  ADD COLUMN IF NOT EXISTS religion TEXT,
  ADD COLUMN IF NOT EXISTS address_street TEXT,
  ADD COLUMN IF NOT EXISTS address_barangay TEXT,
  ADD COLUMN IF NOT EXISTS address_municipality TEXT,
  ADD COLUMN IF NOT EXISTS address_province TEXT,
  ADD COLUMN IF NOT EXISTS father_name TEXT,
  ADD COLUMN IF NOT EXISTS mother_maiden_name TEXT,
  ADD COLUMN IF NOT EXISTS guardian_name TEXT,
  ADD COLUMN IF NOT EXISTS guardian_relationship TEXT,
  ADD COLUMN IF NOT EXISTS parent_guardian_contact TEXT,
  ADD COLUMN IF NOT EXISTS learning_modality TEXT DEFAULT 'Face to Face',
  ADD COLUMN IF NOT EXISTS sf1_remarks TEXT;
