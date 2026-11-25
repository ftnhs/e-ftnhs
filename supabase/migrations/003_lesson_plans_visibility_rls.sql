-- ==============================================================================
-- e-FTNHS: Phase 2/3 Migration - Role-Based Lesson Plan Visibility RLS
-- Target Supabase Instance: https://ndwwoxsgcegdqiyoipvj.supabase.co
-- Safety: Completely isolated. Zero impact on other project tables.
-- ==============================================================================

-- 1. Update SELECT policy on public.lesson_plans:
-- Super Admins & School Head can view ALL lesson plans across all faculty.
-- Teachers can strictly view ONLY their own DLL submissions.
DROP POLICY IF EXISTS "Lesson plans are readable by authenticated faculty" ON public.lesson_plans;
DROP POLICY IF EXISTS "Role-based lesson plan viewing policy" ON public.lesson_plans;

CREATE POLICY "Role-based lesson plan viewing policy"
  ON public.lesson_plans FOR SELECT
  TO authenticated
  USING (
    public.is_admin_or_principal() OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND role IN ('Super Admin', 'School Head')
    ) OR
    auth.uid() = teacher_id
  );

-- 2. Update REVIEWER policy (Super Admin & School Head only - no Master Teachers at FTNHS)
DROP POLICY IF EXISTS "Reviewers can note and update lesson plans" ON public.lesson_plans;

CREATE POLICY "Reviewers can note and update lesson plans"
  ON public.lesson_plans FOR UPDATE
  TO authenticated
  USING (
    public.is_admin_or_principal() OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND role IN ('Super Admin', 'School Head')
    )
  )
  WITH CHECK (
    public.is_admin_or_principal() OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND role IN ('Super Admin', 'School Head')
    )
  );
