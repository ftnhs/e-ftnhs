-- ==============================================================================
-- Migration 007: Three-Term E-Class Record (MATATAG & SHS) & RPMS-COT Hub (Phase 6)
-- School: Fermin Tayabas National High School (FTNHS - School ID: 302851)
-- Standards: DepEd Order No. 8 s. 2015 / DepEd Order No. 9 s. 2026 (3 Terms) /
--            MATATAG JHS Curriculum / Strengthened Senior High School Curriculum /
--            RPMS-PPST Classroom Observation Tool (COT) Guidelines
-- ==============================================================================

-- 1. Create class_records table
CREATE TABLE IF NOT EXISTS public.class_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    term_id UUID NOT NULL REFERENCES public.academic_terms(id) ON DELETE CASCADE,
    teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES public.subjects_catalog(id) ON DELETE CASCADE,
    section_id UUID NOT NULL REFERENCES public.sections(id) ON DELETE CASCADE,
    curriculum_type TEXT NOT NULL CHECK (curriculum_type IN ('MATATAG JHS', 'SHS Core', 'SHS Academic', 'SHS TVL')),
    subject_category TEXT NOT NULL DEFAULT 'Core Academic',
    term_number INTEGER NOT NULL CHECK (term_number IN (1, 2, 3)),
    ww_weight NUMERIC(4, 2) NOT NULL DEFAULT 0.20,
    pt_weight NUMERIC(4, 2) NOT NULL DEFAULT 0.50,
    qa_weight NUMERIC(4, 2) NOT NULL DEFAULT 0.30,
    ww_max_scores INTEGER[] NOT NULL DEFAULT '{20, 20, 20, 20, 20}',
    pt_max_scores INTEGER[] NOT NULL DEFAULT '{50, 50, 50, 50, 50}',
    qa_max_score INTEGER NOT NULL DEFAULT 50,
    status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Locked', 'Submitted')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT unique_class_record UNIQUE (term_id, teacher_id, subject_id, section_id, term_number)
);

-- 2. Create student_grades table
CREATE TABLE IF NOT EXISTS public.student_grades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_record_id UUID NOT NULL REFERENCES public.class_records(id) ON DELETE CASCADE,
    student_name TEXT NOT NULL,
    student_lrn TEXT,
    gender TEXT NOT NULL CHECK (gender IN ('Male', 'Female')),
    ww_scores NUMERIC(5, 2)[] NOT NULL DEFAULT '{}',
    pt_scores NUMERIC(5, 2)[] NOT NULL DEFAULT '{}',
    qa_score NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    ww_total NUMERIC(6, 2) NOT NULL DEFAULT 0.00,
    ww_percentage_score NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    ww_weighted_score NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    pt_total NUMERIC(6, 2) NOT NULL DEFAULT 0.00,
    pt_percentage_score NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    pt_weighted_score NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    qa_percentage_score NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    qa_weighted_score NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    initial_grade NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    transmuted_grade INTEGER NOT NULL DEFAULT 60 CHECK (transmuted_grade >= 60 AND transmuted_grade <= 100),
    remarks TEXT NOT NULL DEFAULT 'Did Not Meet Expectations' CHECK (remarks IN ('Passed', 'Failed', 'Did Not Meet Expectations')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. Create cot_observations table
CREATE TABLE IF NOT EXISTS public.cot_observations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    term_id UUID NOT NULL REFERENCES public.academic_terms(id) ON DELETE CASCADE,
    observer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES public.subjects_catalog(id) ON DELETE SET NULL,
    section_id UUID REFERENCES public.sections(id) ON DELETE SET NULL,
    observation_date DATE NOT NULL DEFAULT CURRENT_DATE,
    observation_period TEXT NOT NULL CHECK (observation_period IN ('Observation 1', 'Observation 2', 'Observation 3')),
    indicator_ratings JSONB NOT NULL DEFAULT '{}'::jsonb,
    average_rating NUMERIC(4, 2) NOT NULL DEFAULT 0.00,
    post_conference_notes TEXT,
    strengths TEXT,
    areas_for_improvement TEXT,
    status TEXT NOT NULL DEFAULT 'Scheduled' CHECK (status IN ('Scheduled', 'Completed', 'Conferred')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 4. Create rpms_portfolio_items table
CREATE TABLE IF NOT EXISTS public.rpms_portfolio_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    term_id UUID NOT NULL REFERENCES public.academic_terms(id) ON DELETE CASCADE,
    teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    kra_number INTEGER NOT NULL CHECK (kra_number IN (1, 2, 3, 4, 5)),
    objective_number INTEGER NOT NULL CHECK (objective_number >= 1 AND objective_number <= 15),
    objective_description TEXT NOT NULL,
    mov_type TEXT NOT NULL,
    linked_document_type TEXT,
    linked_document_id TEXT,
    document_url TEXT,
    document_name TEXT,
    status TEXT NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft', 'Submitted', 'Verified')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 5. Indexes for performant lookups
CREATE INDEX IF NOT EXISTS idx_class_records_lookup ON public.class_records(term_id, teacher_id, section_id);
CREATE INDEX IF NOT EXISTS idx_student_grades_record ON public.student_grades(class_record_id);
CREATE INDEX IF NOT EXISTS idx_cot_teacher ON public.cot_observations(teacher_id);
CREATE INDEX IF NOT EXISTS idx_cot_observer ON public.cot_observations(observer_id);
CREATE INDEX IF NOT EXISTS idx_rpms_teacher ON public.rpms_portfolio_items(teacher_id, kra_number);

-- 6. Enable Row Level Security
ALTER TABLE public.class_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cot_observations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rpms_portfolio_items ENABLE ROW LEVEL SECURITY;

-- 7. RLS Policies for class_records
CREATE POLICY "class_records_select_policy"
ON public.class_records FOR SELECT
TO authenticated
USING (
    teacher_id = auth.uid() OR
    EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
        AND p.role IN ('Super Admin', 'School Head')
    )
);

CREATE POLICY "class_records_insert_policy"
ON public.class_records FOR INSERT
TO authenticated
WITH CHECK (
    teacher_id = auth.uid() OR
    EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
        AND p.role IN ('Super Admin', 'School Head')
    )
);

CREATE POLICY "class_records_update_policy"
ON public.class_records FOR UPDATE
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

CREATE POLICY "class_records_delete_policy"
ON public.class_records FOR DELETE
TO authenticated
USING (
    teacher_id = auth.uid() OR
    EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
        AND p.role IN ('Super Admin', 'School Head')
    )
);

-- 8. RLS Policies for student_grades
CREATE POLICY "student_grades_select_policy"
ON public.student_grades FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.class_records cr
        WHERE cr.id = student_grades.class_record_id
        AND (
            cr.teacher_id = auth.uid() OR
            EXISTS (
                SELECT 1 FROM public.profiles p
                WHERE p.id = auth.uid()
                AND p.role IN ('Super Admin', 'School Head')
            )
        )
    )
);

CREATE POLICY "student_grades_all_policy"
ON public.student_grades FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.class_records cr
        WHERE cr.id = student_grades.class_record_id
        AND (
            cr.teacher_id = auth.uid() OR
            EXISTS (
                SELECT 1 FROM public.profiles p
                WHERE p.id = auth.uid()
                AND p.role IN ('Super Admin', 'School Head')
            )
        )
    )
);

-- 9. RLS Policies for cot_observations
CREATE POLICY "cot_select_policy"
ON public.cot_observations FOR SELECT
TO authenticated
USING (
    teacher_id = auth.uid() OR
    observer_id = auth.uid() OR
    EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
        AND p.role IN ('Super Admin', 'School Head')
    )
);

CREATE POLICY "cot_manage_policy"
ON public.cot_observations FOR ALL
TO authenticated
USING (
    observer_id = auth.uid() OR
    EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
        AND p.role IN ('Super Admin', 'School Head')
    )
);

-- 10. RLS Policies for rpms_portfolio_items
CREATE POLICY "rpms_select_policy"
ON public.rpms_portfolio_items FOR SELECT
TO authenticated
USING (
    teacher_id = auth.uid() OR
    EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
        AND p.role IN ('Super Admin', 'School Head')
    )
);

CREATE POLICY "rpms_manage_policy"
ON public.rpms_portfolio_items FOR ALL
TO authenticated
USING (
    teacher_id = auth.uid() OR
    EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
        AND p.role IN ('Super Admin', 'School Head')
    )
);
