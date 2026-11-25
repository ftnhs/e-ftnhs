-- ============================================================================
-- e-FTNHS MIGRATION 027: Class Management, Learners Masterlist, Section Subjects & SF9
-- Target DB: https://ndwwoxsgcegdqiyoipvj.supabase.co
-- Enables:
--   1. Sections track/strand metadata + Adviser assignment
--   2. Enrolled Learners masterlist per class/section
--   3. Connected Subjects & Subject Teachers per class/section (seeded from teacher_subject_loads)
--   4. Adviser access to read student grades for their advisory section
--   5. SF9 Adviser comments, certificate of transfer, and attendance overrides
-- ============================================================================

-- 1. Add track_strand metadata to sections
ALTER TABLE public.sections
  ADD COLUMN IF NOT EXISTS track_strand TEXT;

UPDATE public.sections
SET track_strand = CASE
  WHEN grade_level BETWEEN 7 AND 10 THEN 'JHS MATATAG'
  WHEN grade_level = 11 AND UPPER(section_name) LIKE '%TECHPRO%' THEN 'SSHS TechPro - ICT'
  WHEN grade_level = 11 THEN 'SSHS Academic - ASSH'
  WHEN grade_level = 12 AND UPPER(section_name) LIKE '%ICT%' THEN 'Old SHS TVL - ICT'
  WHEN grade_level = 12 THEN 'Old SHS Academic - HUMSS'
  ELSE track_strand
END
WHERE track_strand IS NULL;

-- 2. Learners masterlist table
CREATE TABLE IF NOT EXISTS public.learners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  term_id UUID NOT NULL REFERENCES public.academic_terms(id) ON DELETE CASCADE,
  section_id UUID NOT NULL REFERENCES public.sections(id) ON DELETE CASCADE,
  lrn TEXT NOT NULL,
  full_name TEXT NOT NULL,
  gender TEXT NOT NULL CHECK (gender IN ('Male', 'Female')),
  birthdate DATE,
  enrollment_status TEXT NOT NULL DEFAULT 'Enrolled' CHECK (
    enrollment_status IN ('Enrolled', 'Transferred In', 'Transferred Out', 'Dropped')
  ),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT unique_section_learner_lrn UNIQUE (section_id, lrn)
);

CREATE INDEX IF NOT EXISTS idx_learners_section ON public.learners(section_id);
CREATE INDEX IF NOT EXISTS idx_learners_term ON public.learners(term_id);

ALTER TABLE public.learners ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'learners' AND policyname = 'learners_select_policy') THEN
    CREATE POLICY "learners_select_policy" ON public.learners
      FOR SELECT TO authenticated
      USING (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'learners' AND policyname = 'learners_manage_policy') THEN
    CREATE POLICY "learners_manage_policy" ON public.learners
      FOR ALL TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = (select auth.uid()) AND p.role IN ('Super Admin', 'School Head')
        )
        OR EXISTS (
          SELECT 1 FROM public.sections s
          WHERE s.id = learners.section_id AND s.adviser_id = (select auth.uid())
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = (select auth.uid()) AND p.role IN ('Super Admin', 'School Head')
        )
        OR EXISTS (
          SELECT 1 FROM public.sections s
          WHERE s.id = learners.section_id AND s.adviser_id = (select auth.uid())
        )
      );
  END IF;
END $$;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.learners TO authenticated;
GRANT ALL ON public.learners TO service_role;

-- 3. Connected subjects per section (with assigned teacher, curriculum type & units)
CREATE TABLE IF NOT EXISTS public.section_subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  term_id UUID NOT NULL REFERENCES public.academic_terms(id) ON DELETE CASCADE,
  section_id UUID NOT NULL REFERENCES public.sections(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES public.subjects_catalog(id) ON DELETE CASCADE,
  teacher_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  curriculum_type TEXT NOT NULL DEFAULT 'MATATAG JHS' CHECK (
    curriculum_type IN (
      'MATATAG JHS',
      'MATATAG JHS Skill-Based',
      'SHS Core', 'SHS Academic', 'SHS TVL',
      'SSHS Core', 'SSHS Academic Elective', 'SSHS Field Exposure',
      'SSHS Arts Sports Health', 'SSHS Research Design',
      'SSHS TechPro Elective', 'SSHS Work Immersion',
      'Old SHS Core', 'Old SHS Applied', 'Old SHS Specialized',
      'Old SHS TVL', 'Old SHS Immersion'
    )
  ),
  units NUMERIC(4, 1) NOT NULL DEFAULT 1.0,
  sort_order INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT unique_section_subject UNIQUE (section_id, subject_id)
);

CREATE INDEX IF NOT EXISTS idx_section_subjects_section ON public.section_subjects(section_id);
CREATE INDEX IF NOT EXISTS idx_section_subjects_teacher ON public.section_subjects(teacher_id);

ALTER TABLE public.section_subjects ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'section_subjects' AND policyname = 'section_subjects_select_policy') THEN
    CREATE POLICY "section_subjects_select_policy" ON public.section_subjects
      FOR SELECT TO authenticated
      USING (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'section_subjects' AND policyname = 'section_subjects_manage_policy') THEN
    CREATE POLICY "section_subjects_manage_policy" ON public.section_subjects
      FOR ALL TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = (select auth.uid()) AND p.role IN ('Super Admin', 'School Head')
        )
        OR EXISTS (
          SELECT 1 FROM public.sections s
          WHERE s.id = section_subjects.section_id AND s.adviser_id = (select auth.uid())
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = (select auth.uid()) AND p.role IN ('Super Admin', 'School Head')
        )
        OR EXISTS (
          SELECT 1 FROM public.sections s
          WHERE s.id = section_subjects.section_id AND s.adviser_id = (select auth.uid())
        )
      );
  END IF;
END $$;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.section_subjects TO authenticated;
GRANT ALL ON public.section_subjects TO service_role;

-- Seed section_subjects automatically from existing teacher_subject_loads
INSERT INTO public.section_subjects (term_id, section_id, subject_id, teacher_id, curriculum_type, units, sort_order)
SELECT
  tsl.term_id,
  tsl.section_id,
  tsl.subject_id,
  tsl.teacher_id,
  CASE
    WHEN sec.grade_level <= 10 THEN
      CASE
        WHEN UPPER(sub.subject_code) LIKE 'MAPEH%' OR UPPER(sub.subject_code) LIKE 'TLE%' THEN 'MATATAG JHS Skill-Based'
        ELSE 'MATATAG JHS'
      END
    WHEN sec.grade_level = 11 THEN
      CASE
        WHEN sub.category = 'TVL' OR UPPER(COALESCE(sub.track_strand, '')) LIKE '%TECHPRO%' THEN 'SSHS TechPro Elective'
        WHEN sub.category = 'Specialized' THEN 'SSHS Academic Elective'
        ELSE 'SSHS Core'
      END
    ELSE
      CASE
        WHEN sub.category = 'TVL' THEN 'Old SHS TVL'
        WHEN UPPER(sub.subject_name) LIKE '%IMMERSION%' OR UPPER(sub.subject_name) LIKE '%PRACTICAL RESEARCH%' THEN 'Old SHS Immersion'
        WHEN sub.category = 'Specialized' THEN 'Old SHS Specialized'
        WHEN sub.category = 'Applied' THEN 'Old SHS Applied'
        ELSE 'Old SHS Core'
      END
  END AS curriculum_type,
  CASE
    WHEN sec.grade_level = 11 AND sub.category = 'Core' AND UPPER(sub.subject_code) NOT LIKE 'HGP%' THEN 2.0
    WHEN sec.grade_level = 11 AND (sub.category = 'TVL' OR UPPER(COALESCE(sub.track_strand, '')) LIKE '%TECHPRO%') THEN 4.0
    WHEN sec.grade_level = 11 AND sub.category = 'Specialized' THEN 3.0
    ELSE 1.0
  END AS units,
  ROW_NUMBER() OVER (PARTITION BY tsl.section_id ORDER BY sub.category, sub.subject_name)
FROM public.teacher_subject_loads tsl
JOIN public.sections sec ON sec.id = tsl.section_id
JOIN public.subjects_catalog sub ON sub.id = tsl.subject_id
ON CONFLICT (section_id, subject_id) DO NOTHING;

-- 4. Link student_grades rows to learners masterlist (optional FK)
ALTER TABLE public.student_grades
  ADD COLUMN IF NOT EXISTS learner_id UUID REFERENCES public.learners(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_student_grades_learner ON public.student_grades(learner_id);

-- 5. SF9 Adviser Records (comments, transfer cert, manual attendance adjustments)
CREATE TABLE IF NOT EXISTS public.sf9_adviser_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id UUID NOT NULL REFERENCES public.sections(id) ON DELETE CASCADE,
  learner_id UUID NOT NULL REFERENCES public.learners(id) ON DELETE CASCADE,
  term1_remarks TEXT,
  term2_remarks TEXT,
  term3_remarks TEXT,
  admitted_to_grade TEXT,
  eligible_for_grade TEXT,
  transfer_school TEXT,
  transfer_date DATE,
  manual_attendance JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT unique_sf9_learner_section UNIQUE (section_id, learner_id)
);

ALTER TABLE public.sf9_adviser_records ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'sf9_adviser_records' AND policyname = 'sf9_adviser_select_policy') THEN
    CREATE POLICY "sf9_adviser_select_policy" ON public.sf9_adviser_records
      FOR SELECT TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = (select auth.uid()) AND p.role IN ('Super Admin', 'School Head')
        )
        OR EXISTS (
          SELECT 1 FROM public.sections s
          WHERE s.id = sf9_adviser_records.section_id AND s.adviser_id = (select auth.uid())
        )
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'sf9_adviser_records' AND policyname = 'sf9_adviser_manage_policy') THEN
    CREATE POLICY "sf9_adviser_manage_policy" ON public.sf9_adviser_records
      FOR ALL TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = (select auth.uid()) AND p.role IN ('Super Admin', 'School Head')
        )
        OR EXISTS (
          SELECT 1 FROM public.sections s
          WHERE s.id = sf9_adviser_records.section_id AND s.adviser_id = (select auth.uid())
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = (select auth.uid()) AND p.role IN ('Super Admin', 'School Head')
        )
        OR EXISTS (
          SELECT 1 FROM public.sections s
          WHERE s.id = sf9_adviser_records.section_id AND s.adviser_id = (select auth.uid())
        )
      );
  END IF;
END $$;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.sf9_adviser_records TO authenticated;
GRANT ALL ON public.sf9_adviser_records TO service_role;

-- 6. Allow Section Advisers to read all class_records and student_grades for their advisory section (for SF9 & Summary consolidation)
ALTER POLICY "class_records_select_policy" ON public.class_records
  USING (
    teacher_id = (select auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = (select auth.uid()) AND p.role IN ('Super Admin', 'School Head')
    )
    OR EXISTS (
      SELECT 1 FROM public.sections s
      WHERE s.id = class_records.section_id AND s.adviser_id = (select auth.uid())
    )
  );

ALTER POLICY "student_grades_select_policy" ON public.student_grades
  USING (
    EXISTS (
      SELECT 1 FROM public.class_records cr
      WHERE cr.id = student_grades.class_record_id
      AND (
        cr.teacher_id = (select auth.uid())
        OR EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = (select auth.uid()) AND p.role IN ('Super Admin', 'School Head')
        )
        OR EXISTS (
          SELECT 1 FROM public.sections s
          WHERE s.id = cr.section_id AND s.adviser_id = (select auth.uid())
        )
      )
    )
  );
