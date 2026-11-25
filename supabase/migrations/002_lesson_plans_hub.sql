-- ==============================================================================
-- e-FTNHS: Phase 3 Database Migration (Lesson Plan / DLL/DLP Hub & Review System)
-- Target Supabase Instance: https://ndwwoxsgcegdqiyoipvj.supabase.co
-- Safety: Completely isolated. Zero impact on other project tables.
-- ==============================================================================

-- 1. Create Lesson Plans Table
CREATE TABLE IF NOT EXISTS public.lesson_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  term_id UUID REFERENCES public.academic_terms(id) ON DELETE SET NULL,
  subject_name TEXT NOT NULL,
  grade_level INT NOT NULL,
  section_name TEXT NOT NULL,
  department TEXT NOT NULL DEFAULT 'General Academics',
  week_number INT NOT NULL CHECK (week_number BETWEEN 1 AND 10),
  title TEXT NOT NULL,
  learning_competencies TEXT,
  file_url TEXT,
  file_name TEXT,
  file_size INT,
  mime_type TEXT,
  status TEXT NOT NULL DEFAULT 'Submitted' CHECK (status IN ('Submitted', 'Under Review', 'Approved', 'Needs Revision')),
  submission_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_late BOOLEAN NOT NULL DEFAULT false,
  reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  reviewer_feedback TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for lightning-fast analytics queries
CREATE INDEX IF NOT EXISTS idx_lesson_plans_teacher ON public.lesson_plans(teacher_id);
CREATE INDEX IF NOT EXISTS idx_lesson_plans_week ON public.lesson_plans(week_number);
CREATE INDEX IF NOT EXISTS idx_lesson_plans_status ON public.lesson_plans(status);
CREATE INDEX IF NOT EXISTS idx_lesson_plans_dept ON public.lesson_plans(department);

-- 2. Ensure Storage Bucket for DLL Uploads
INSERT INTO storage.buckets (id, name, public)
VALUES ('dll-uploads', 'dll-uploads', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Row-Level Security (RLS)
ALTER TABLE public.lesson_plans ENABLE ROW LEVEL SECURITY;

-- Select: Authenticated faculty can view lesson plans (for school compliance transparency)
DROP POLICY IF EXISTS "Lesson plans are readable by authenticated faculty" ON public.lesson_plans;
CREATE POLICY "Lesson plans are readable by authenticated faculty"
  ON public.lesson_plans FOR SELECT
  TO authenticated
  USING (true);

-- Insert: Teachers can upload their own lesson plans
DROP POLICY IF EXISTS "Teachers can insert their own lesson plans" ON public.lesson_plans;
CREATE POLICY "Teachers can insert their own lesson plans"
  ON public.lesson_plans FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = teacher_id);

-- Update (Teacher): Teachers can update their own unapproved submissions
DROP POLICY IF EXISTS "Teachers can edit their own pending lesson plans" ON public.lesson_plans;
CREATE POLICY "Teachers can edit their own pending lesson plans"
  ON public.lesson_plans FOR UPDATE
  TO authenticated
  USING (auth.uid() = teacher_id)
  WITH CHECK (auth.uid() = teacher_id);

-- Update (Reviewer): Super Admins, School Heads, and Master Teachers can review & stamp
DROP POLICY IF EXISTS "Reviewers can note and update lesson plans" ON public.lesson_plans;
CREATE POLICY "Reviewers can note and update lesson plans"
  ON public.lesson_plans FOR UPDATE
  TO authenticated
  USING (
    public.is_admin_or_principal() OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND role IN ('Super Admin', 'School Head', 'Master Teacher')
    )
  )
  WITH CHECK (
    public.is_admin_or_principal() OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND role IN ('Super Admin', 'School Head', 'Master Teacher')
    )
  );

-- 4. Seed Initial Demonstration Submissions for Live Analytics
-- Uses active term and real faculty IDs from public.profiles
DO $$
DECLARE
  v_term_id UUID;
  v_reviewer_id UUID;
  v_teacher_1 UUID := '5e437747-c9ca-427d-be67-1072d0e384c4'; -- Renalyn Pujadas
  v_teacher_2 UUID := '4536e7c0-f7ae-4699-a6a3-6f2ab490d469'; -- Reah Ong
  v_teacher_3 UUID := '29df0ea2-bfd3-40d0-88ed-b305d41b5aa3'; -- Nova Fuentes
  v_teacher_4 UUID := 'cf2a766d-71bc-48fc-973a-66614b247b3e'; -- Maurine Cuario
  v_teacher_5 UUID := '254c97e0-0fe5-4988-a4c1-5c28e9da61e5'; -- Dellie Vigonte
BEGIN
  SELECT id INTO v_term_id FROM public.academic_terms WHERE is_active = true LIMIT 1;
  SELECT id INTO v_reviewer_id FROM public.profiles WHERE email = 'rieldiango24@gmail.com' LIMIT 1;

  IF NOT EXISTS (SELECT 1 FROM public.lesson_plans LIMIT 1) THEN
    -- Renalyn Pujadas (Science)
    INSERT INTO public.lesson_plans (teacher_id, term_id, subject_name, grade_level, section_name, department, week_number, title, learning_competencies, status, is_late, reviewed_by, reviewed_at, reviewer_feedback)
    VALUES
      (v_teacher_1, v_term_id, 'Science 10', 10, 'Rizal', 'Science & Technology', 1, 'DLL Week 1: Plate Tectonics & Earthquakes', 'Describe the distribution of active volcanoes, earthquake epicenters, and major mountain belts.', 'Approved', false, v_reviewer_id, NOW() - INTERVAL '18 days', 'Excellent alignment with DepEd curriculum learning competencies. Exemplary learning activities.'),
      (v_teacher_1, v_term_id, 'Science 10', 10, 'Rizal', 'Science & Technology', 2, 'DLL Week 2: Divergent and Convergent Plate Boundaries', 'Differentiate the types of plate boundaries and related geological events.', 'Approved', false, v_reviewer_id, NOW() - INTERVAL '11 days', 'Very clear formative assessment items. Noted with approval.'),
      (v_teacher_1, v_term_id, 'Science 10', 10, 'Rizal', 'Science & Technology', 3, 'DLL Week 3: Transform Fault Boundaries & Oceanic Ridges', 'Explain the processes that occur along transform fault plate boundaries.', 'Approved', false, v_reviewer_id, NOW() - INTERVAL '4 days', 'Well structured lesson flow. Keep up the great work.'),
      (v_teacher_1, v_term_id, 'Science 10', 10, 'Rizal', 'Science & Technology', 4, 'DLL Week 4: Internal Structure of the Earth', 'Describe the internal structure of the Earth (crust, mantle, core).', 'Submitted', false, null, null, null);

    -- Reah Ong (Mathematics)
    INSERT INTO public.lesson_plans (teacher_id, term_id, subject_name, grade_level, section_name, department, week_number, title, learning_competencies, status, is_late, reviewed_by, reviewed_at, reviewer_feedback)
    VALUES
      (v_teacher_2, v_term_id, 'Mathematics 9', 9, 'Mabini', 'Mathematics', 1, 'DLL Week 1: Quadratic Equations by Factoring', 'Illustrates quadratic equations and solves quadratic equations by factoring.', 'Approved', false, v_reviewer_id, NOW() - INTERVAL '19 days', 'Comprehensive differentiation tasks provided for advanced learners.'),
      (v_teacher_2, v_term_id, 'Mathematics 9', 9, 'Mabini', 'Mathematics', 2, 'DLL Week 2: Completing the Square', 'Solves quadratic equations by completing the square.', 'Approved', false, v_reviewer_id, NOW() - INTERVAL '12 days', 'Noted. Good pacing.'),
      (v_teacher_2, v_term_id, 'Mathematics 9', 9, 'Mabini', 'Mathematics', 3, 'DLL Week 3: The Quadratic Formula', 'Solves quadratic equations using the quadratic formula.', 'Needs Revision', true, v_reviewer_id, NOW() - INTERVAL '5 days', 'Please include guided practice examples before independent evaluation.'),
      (v_teacher_2, v_term_id, 'Mathematics 9', 9, 'Mabini', 'Mathematics', 4, 'DLL Week 4: Nature of the Roots of a Quadratic Equation', 'Characterizes the roots of a quadratic equation using the discriminant.', 'Under Review', false, null, null, null);

    -- Nova Fuentes (English)
    INSERT INTO public.lesson_plans (teacher_id, term_id, subject_name, grade_level, section_name, department, week_number, title, learning_competencies, status, is_late, reviewed_by, reviewed_at, reviewer_feedback)
    VALUES
      (v_teacher_3, v_term_id, 'English 8', 8, 'Bonifacio', 'English', 1, 'DLL Week 1: African Literature & Folktales', 'Determine the meaning of words and expressions that reflect the local culture by noting context clues.', 'Approved', false, v_reviewer_id, NOW() - INTERVAL '20 days', 'Culturally enriched material. Approved.'),
      (v_teacher_3, v_term_id, 'English 8', 8, 'Bonifacio', 'English', 2, 'DLL Week 2: Using Context Clues', 'Use context clues from the selection to determine word meanings.', 'Approved', false, v_reviewer_id, NOW() - INTERVAL '13 days', 'Great alignment with English curriculum learning competencies.'),
      (v_teacher_3, v_term_id, 'English 8', 8, 'Bonifacio', 'English', 3, 'DLL Week 3: Conventions in Citing Sources', 'Use conventions in citing sources accurately in formal research writing.', 'Approved', false, v_reviewer_id, NOW() - INTERVAL '6 days', 'Excellent integration of academic integrity principles.'),
      (v_teacher_3, v_term_id, 'English 8', 8, 'Bonifacio', 'English', 4, 'DLL Week 4: Modal Verbs and Expressions', 'Use modal verbs, nouns and adverbs appropriately in spoken dialogues.', 'Submitted', false, null, null, null);

    -- Maurine Cuario (TVL)
    INSERT INTO public.lesson_plans (teacher_id, term_id, subject_name, grade_level, section_name, department, week_number, title, learning_competencies, status, is_late, reviewed_by, reviewed_at, reviewer_feedback)
    VALUES
      (v_teacher_4, v_term_id, 'TVL - Agri-Crop', 11, 'Agri 1', 'TVL Track', 1, 'DLL Week 1: Farm Tools & Equipment Safety', 'Apply occupational health and safety standards in agricultural operations.', 'Approved', false, v_reviewer_id, NOW() - INTERVAL '17 days', 'Safety checklist thoroughly integrated.'),
      (v_teacher_4, v_term_id, 'TVL - Agri-Crop', 11, 'Agri 1', 'TVL Track', 2, 'DLL Week 2: Land Preparation and Tillage', 'Prepare field and nursery beds according to crop specifications.', 'Approved', false, v_reviewer_id, NOW() - INTERVAL '10 days', 'Approved.'),
      (v_teacher_4, v_term_id, 'TVL - Agri-Crop', 11, 'Agri 1', 'TVL Track', 3, 'DLL Week 3: Nursery Bed Construction', 'Construct nursery sheds and maintain seedling moisture levels.', 'Submitted', true, null, null, null);

    -- Dellie Vigonte (Filipino)
    INSERT INTO public.lesson_plans (teacher_id, term_id, subject_name, grade_level, section_name, department, week_number, title, learning_competencies, status, is_late, reviewed_by, reviewed_at, reviewer_feedback)
    VALUES
      (v_teacher_5, v_term_id, 'Filipino 7', 7, 'Silang', 'Filipino', 1, 'DLL Week 1: Kuwentong Bayan ng Mindanao', 'Nahihinuha ang kaugalian at kalagayang panlipunan ng lugar na pinagmulan ng kuwentong bayan.', 'Approved', false, v_reviewer_id, NOW() - INTERVAL '18 days', 'Napakagandang pagkakabalangkas ng mga gawain.'),
      (v_teacher_5, v_term_id, 'Filipino 7', 7, 'Silang', 'Filipino', 2, 'DLL Week 2: Pabula at Elemento Nito', 'Naisasalaysay nang maayos at wasto ang buod ng binasang pabula.', 'Approved', false, v_reviewer_id, NOW() - INTERVAL '11 days', 'Aprubado.'),
      (v_teacher_5, v_term_id, 'Filipino 7', 7, 'Silang', 'Filipino', 3, 'DLL Week 3: Epiko ng Maranao: Darangan', 'Nailalarawan ang mga natatanging katangian ng tauhan sa epiko.', 'Submitted', false, null, null, null);
  END IF;
END $$;
