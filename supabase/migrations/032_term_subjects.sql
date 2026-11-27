-- ============================================================================
-- e-FTNHS MIGRATION 032: By-Term Curriculum Subjects (JHS & SHS)
-- Target DB: https://ndwwoxsgcegdqiyoipvj.supabase.co
-- Safety: Non-destructive additive mapping table; preserves master subjects_catalog.
-- ============================================================================

-- 1. CREATE term_subjects TABLE (Maps offered master subjects to each academic term)
CREATE TABLE IF NOT EXISTS public.term_subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  term_id UUID NOT NULL REFERENCES public.academic_terms(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES public.subjects_catalog(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_term_subject UNIQUE (term_id, subject_id)
);

CREATE INDEX IF NOT EXISTS idx_term_subjects_term_id
  ON public.term_subjects(term_id);

CREATE INDEX IF NOT EXISTS idx_term_subjects_subject_id
  ON public.term_subjects(subject_id);

-- 2. ENABLE ROW-LEVEL SECURITY (RLS)
ALTER TABLE public.term_subjects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated read on term_subjects" ON public.term_subjects;
CREATE POLICY "Allow authenticated read on term_subjects"
  ON public.term_subjects FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Admins manage term_subjects" ON public.term_subjects;
CREATE POLICY "Admins manage term_subjects"
  ON public.term_subjects FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('Super Admin', 'School Head')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('Super Admin', 'School Head')
    )
  );

-- 3. INITIAL BACKFILL: Populate term_subjects from existing term loads, schedule entries, and section subjects
INSERT INTO public.term_subjects (term_id, subject_id)
SELECT DISTINCT term_id, subject_id
FROM (
  SELECT term_id, subject_id FROM public.teacher_subject_loads
  UNION
  SELECT term_id, subject_id FROM public.schedule_entries
  UNION
  SELECT term_id, subject_id FROM public.section_subjects
) existing_refs
WHERE term_id IS NOT NULL AND subject_id IS NOT NULL
ON CONFLICT (term_id, subject_id) DO NOTHING;
