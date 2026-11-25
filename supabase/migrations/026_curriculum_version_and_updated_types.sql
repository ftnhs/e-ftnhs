-- ============================================================================
-- e-FTNHS MIGRATION 026: Curriculum Version (SSHS vs Old SHS vs MATATAG JHS)
-- Target DB: https://ndwwoxsgcegdqiyoipvj.supabase.co
-- Grade 11 = Strengthened Senior High School (SSHS)
-- Grade 12 = Old K-12 SHS Curriculum (2016)
-- Grades 7-10 = MATATAG JHS Curriculum
-- ============================================================================

-- 1. Add curriculum_version to subjects_catalog
ALTER TABLE public.subjects_catalog
  ADD COLUMN IF NOT EXISTS curriculum_version TEXT NOT NULL DEFAULT 'JHS MATATAG'
  CHECK (curriculum_version IN ('JHS MATATAG', 'SSHS', 'Old SHS'));

-- 2. Tag existing subjects with their exact curriculum version by grade level
UPDATE public.subjects_catalog
  SET curriculum_version = 'JHS MATATAG'
  WHERE grade_level BETWEEN 7 AND 10;

UPDATE public.subjects_catalog
  SET curriculum_version = 'SSHS'
  WHERE grade_level = 11;

UPDATE public.subjects_catalog
  SET curriculum_version = 'Old SHS'
  WHERE grade_level = 12;

-- 3. Expand class_records.curriculum_type CHECK constraint
ALTER TABLE public.class_records
  DROP CONSTRAINT IF EXISTS class_records_curriculum_type_check;

ALTER TABLE public.class_records
  ADD CONSTRAINT class_records_curriculum_type_check
  CHECK (curriculum_type IN (
    'MATATAG JHS',
    'MATATAG JHS Skill-Based',
    -- Legacy Old SHS values (kept for backward compatibility)
    'SHS Core', 'SHS Academic', 'SHS TVL',
    -- Grade 11: Strengthened SHS (SSHS)
    'SSHS Core', 'SSHS Academic Elective', 'SSHS Field Exposure', 'SSHS Arts Sports Health', 'SSHS Research Design', 'SSHS TechPro Elective', 'SSHS Work Immersion',
    -- Grade 12: Old K-12 SHS Curriculum (2016)
    'Old SHS Core', 'Old SHS Applied', 'Old SHS Specialized', 'Old SHS TVL', 'Old SHS Immersion'
  ));

-- 4. Migrate existing class_records from legacy SHS labels to explicit Old SHS labels
UPDATE public.class_records SET curriculum_type = 'Old SHS Core' WHERE curriculum_type = 'SHS Core';
UPDATE public.class_records SET curriculum_type = 'Old SHS Applied' WHERE curriculum_type = 'SHS Academic';
UPDATE public.class_records SET curriculum_type = 'Old SHS TVL' WHERE curriculum_type = 'SHS TVL';
