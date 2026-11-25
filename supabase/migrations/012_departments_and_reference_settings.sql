-- ============================================================================
-- e-FTNHS MIGRATION 012: Departments Catalog & Reference Data Dynamic Settings
-- Target DB: https://ndwwoxsgcegdqiyoipvj.supabase.co
-- Safety: Non-destructive. Multi-tenant safe for concurrent inventory project.
-- ============================================================================

-- 1. Create departments catalog table
CREATE TABLE IF NOT EXISTS public.departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dept_code TEXT UNIQUE NOT NULL,
  dept_name TEXT UNIQUE NOT NULL,
  dept_head_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Enable RLS on departments
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;

-- 3. RLS policies for departments
DROP POLICY IF EXISTS "Departments are viewable by authenticated users" ON public.departments;
CREATE POLICY "Departments are viewable by authenticated users"
  ON public.departments FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Admins can manage departments" ON public.departments;
CREATE POLICY "Admins can manage departments"
  ON public.departments FOR ALL
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

-- 4. Seed initial default departments if empty
INSERT INTO public.departments (dept_code, dept_name, description, sort_order)
VALUES
  ('JHS', 'Junior High School (JHS)', 'Junior High School general curriculum (Grades 7 to 10)', 1),
  ('SHS', 'Senior High School (SHS)', 'Senior High School specialized tracks & strands (Grades 11 & 12)', 2),
  ('SCI', 'Science & Technology', 'Natural sciences, biology, chemistry, physics, and robotics', 3),
  ('MATH', 'Mathematics', 'General mathematics, statistics, algebra, and calculus', 4),
  ('ENG', 'English', 'English language arts, communication, and literature', 5),
  ('FIL', 'Filipino', 'Wikang Filipino, panitikan, at komunikasyon', 6),
  ('AP', 'Araling Panlipunan (Social Studies)', 'Social sciences, Philippine and world history, economics, and contemporary issues', 7),
  ('MAPEH', 'MAPEH (Music, Arts, PE & Health)', 'Music, arts, physical education, and school health initiatives', 8),
  ('ESP', 'Edukasyon sa Pagpapakatao (Values)', 'Character education, ethics, and values formation', 9),
  ('TLE', 'Technology and Livelihood Education (TLE)', 'Technical skills, agri-fishery, home economics, and industrial arts', 10),
  ('TVL', 'Technical-Vocational-Livelihood (TVL)', 'Senior High School TVL tracks: ICT, Agri-Crop, Cookery, SMAW', 11),
  ('ADMIN', 'Administrative & Personnel Services', 'Office of the Principal, Registrar, AO, Finance, and Guidance', 12)
ON CONFLICT (dept_code) DO NOTHING;

-- 5. Helper function to safely switch the active academic term
CREATE OR REPLACE FUNCTION public.set_active_academic_term(p_term_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('Super Admin', 'School Head')
    )
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Only Super Admin or School Head can activate an academic term.';
  END IF;

  UPDATE public.academic_terms SET is_active = false WHERE id != p_term_id;
  UPDATE public.academic_terms SET is_active = true WHERE id = p_term_id;
END;
$$;
