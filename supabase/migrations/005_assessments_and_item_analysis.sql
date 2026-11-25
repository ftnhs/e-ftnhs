-- ==============================================================================
-- Migration 005: Online Exam Importer & Automated Item Analysis Engine (Phase 4)
-- School: Fermin Tayabas National High School (FTNHS - School ID: 302851)
-- Standards: DepEd Order No. 8 s. 2015 / DepEd Item Analysis & MPS Formulas
-- CWE-1236 Defense: Sanitization against CSV/XLSX formula injection
-- ==============================================================================

-- 1. Create assessments table
CREATE TABLE IF NOT EXISTS public.assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    term_id UUID NOT NULL REFERENCES public.academic_terms(id) ON DELETE CASCADE,
    teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES public.subjects_catalog(id) ON DELETE SET NULL,
    section_id UUID REFERENCES public.sections(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    assessment_type TEXT NOT NULL DEFAULT 'Summative' CHECK (assessment_type IN ('Diagnostic', 'Summative', 'Quarterly Exam', 'Formative')),
    grading_period TEXT NOT NULL DEFAULT 'Q1' CHECK (grading_period IN ('Q1', 'Q2', 'Q3', 'Q4')),
    total_items INTEGER NOT NULL CHECK (total_items > 0),
    passing_score INTEGER NOT NULL DEFAULT 0 CHECK (passing_score >= 0),
    test_date DATE NOT NULL DEFAULT CURRENT_DATE,
    raw_scores JSONB NOT NULL DEFAULT '[]'::jsonb,
    examinee_count INTEGER NOT NULL DEFAULT 0 CHECK (examinee_count >= 0),
    mean_score NUMERIC(6, 2) DEFAULT 0.00,
    standard_deviation NUMERIC(6, 2) DEFAULT 0.00,
    mean_percentage_score NUMERIC(6, 2) DEFAULT 0.00,
    mastery_level TEXT DEFAULT 'Pending Analysis',
    status TEXT NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft', 'Analyzed', 'Locked')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. Create assessment_item_analysis table
CREATE TABLE IF NOT EXISTS public.assessment_item_analysis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assessment_id UUID NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
    item_number INTEGER NOT NULL CHECK (item_number > 0),
    learning_competency TEXT NOT NULL DEFAULT '',
    correct_responses_count INTEGER NOT NULL DEFAULT 0 CHECK (correct_responses_count >= 0),
    total_examinees INTEGER NOT NULL DEFAULT 0 CHECK (total_examinees >= 0),
    difficulty_index NUMERIC(5, 3) NOT NULL DEFAULT 0.000 CHECK (difficulty_index >= 0.000 AND difficulty_index <= 1.000),
    difficulty_interpretation TEXT NOT NULL DEFAULT 'Average' CHECK (difficulty_interpretation IN ('Difficult', 'Average', 'Easy')),
    action_recommendation TEXT NOT NULL DEFAULT 'Retain' CHECK (action_recommendation IN ('Retain', 'Revise', 'Reject')),
    is_least_learned BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT unique_assessment_item UNIQUE (assessment_id, item_number)
);

-- 3. Indexes for performant lookups
CREATE INDEX IF NOT EXISTS idx_assessments_term ON public.assessments(term_id);
CREATE INDEX IF NOT EXISTS idx_assessments_teacher ON public.assessments(teacher_id);
CREATE INDEX IF NOT EXISTS idx_assessments_subject ON public.assessments(subject_id);
CREATE INDEX IF NOT EXISTS idx_assessments_section ON public.assessments(section_id);
CREATE INDEX IF NOT EXISTS idx_assessments_status ON public.assessments(status);
CREATE INDEX IF NOT EXISTS idx_item_analysis_assessment ON public.assessment_item_analysis(assessment_id);
CREATE INDEX IF NOT EXISTS idx_item_analysis_least_learned ON public.assessment_item_analysis(assessment_id, is_least_learned);

-- 4. Enable Row Level Security
ALTER TABLE public.assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_item_analysis ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for assessments
CREATE POLICY "assessments_select_policy"
ON public.assessments FOR SELECT
TO authenticated
USING (
    teacher_id = auth.uid() OR
    EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
        AND p.role IN ('Super Admin', 'School Head')
    )
);

CREATE POLICY "assessments_insert_policy"
ON public.assessments FOR INSERT
TO authenticated
WITH CHECK (
    teacher_id = auth.uid() OR
    EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
        AND p.role IN ('Super Admin', 'School Head')
    )
);

CREATE POLICY "assessments_update_policy"
ON public.assessments FOR UPDATE
TO authenticated
USING (
    teacher_id = auth.uid() OR
    EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
        AND p.role IN ('Super Admin', 'School Head')
    )
)
WITH CHECK (
    teacher_id = auth.uid() OR
    EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
        AND p.role IN ('Super Admin', 'School Head')
    )
);

CREATE POLICY "assessments_delete_policy"
ON public.assessments FOR DELETE
TO authenticated
USING (
    teacher_id = auth.uid() OR
    EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
        AND p.role IN ('Super Admin', 'School Head')
    )
);

-- 6. RLS Policies for assessment_item_analysis
CREATE POLICY "item_analysis_select_policy"
ON public.assessment_item_analysis FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.assessments a
        WHERE a.id = assessment_item_analysis.assessment_id
        AND (
            a.teacher_id = auth.uid() OR
            EXISTS (
                SELECT 1 FROM public.profiles p
                WHERE p.id = auth.uid()
                AND p.role IN ('Super Admin', 'School Head')
            )
        )
    )
);

CREATE POLICY "item_analysis_insert_policy"
ON public.assessment_item_analysis FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.assessments a
        WHERE a.id = assessment_item_analysis.assessment_id
        AND (
            a.teacher_id = auth.uid() OR
            EXISTS (
                SELECT 1 FROM public.profiles p
                WHERE p.id = auth.uid()
                AND p.role IN ('Super Admin', 'School Head')
            )
        )
    )
);

CREATE POLICY "item_analysis_update_policy"
ON public.assessment_item_analysis FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.assessments a
        WHERE a.id = assessment_item_analysis.assessment_id
        AND (
            a.teacher_id = auth.uid() OR
            EXISTS (
                SELECT 1 FROM public.profiles p
                WHERE p.id = auth.uid()
                AND p.role IN ('Super Admin', 'School Head')
            )
        )
    )
);

CREATE POLICY "item_analysis_delete_policy"
ON public.assessment_item_analysis FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.assessments a
        WHERE a.id = assessment_item_analysis.assessment_id
        AND (
            a.teacher_id = auth.uid() OR
            EXISTS (
                SELECT 1 FROM public.profiles p
                WHERE p.id = auth.uid()
                AND p.role IN ('Super Admin', 'School Head')
            )
        )
    )
);
