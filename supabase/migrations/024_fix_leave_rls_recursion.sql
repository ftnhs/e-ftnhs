-- ============================================================================
-- e-FTNHS MIGRATION 024: Fix Leave Applications / Reliefs Circular RLS Recursion
-- Target DB: https://ndwwoxsgcegdqiyoipvj.supabase.co
-- Root cause: leave_applications_select_policy queried leave_class_reliefs,
-- while leave_reliefs_select_policy queried leave_applications (42P17 loop).
-- Fix: Use SECURITY DEFINER helper functions with locked search_path = ''.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.is_leave_reliever(
  p_leave_id UUID,
  p_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.leave_class_reliefs lcr
    WHERE lcr.leave_application_id = p_leave_id
      AND lcr.reliever_teacher_id = p_user_id
  );
$$;

CREATE OR REPLACE FUNCTION public.is_leave_owner(
  p_leave_id UUID,
  p_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.leave_applications la
    WHERE la.id = p_leave_id
      AND la.teacher_id = p_user_id
  );
$$;

-- Re-create leave_applications policies without direct cross-table RLS recursion
DROP POLICY IF EXISTS "leave_applications_select_policy" ON public.leave_applications;
CREATE POLICY "leave_applications_select_policy" ON public.leave_applications
  FOR SELECT TO authenticated
  USING (
    (SELECT auth.uid()) = teacher_id
    OR public.is_leave_reliever(id, (SELECT auth.uid()))
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (SELECT auth.uid())
        AND role IN ('Super Admin', 'School Head')
    )
  );

DROP POLICY IF EXISTS "leave_applications_insert_policy" ON public.leave_applications;
CREATE POLICY "leave_applications_insert_policy" ON public.leave_applications
  FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT auth.uid()) = teacher_id
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (SELECT auth.uid())
        AND role IN ('Super Admin', 'School Head')
    )
  );

DROP POLICY IF EXISTS "leave_applications_update_policy" ON public.leave_applications;
CREATE POLICY "leave_applications_update_policy" ON public.leave_applications
  FOR UPDATE TO authenticated
  USING (
    (SELECT auth.uid()) = teacher_id
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (SELECT auth.uid())
        AND role IN ('Super Admin', 'School Head')
    )
  )
  WITH CHECK (
    (SELECT auth.uid()) = teacher_id
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (SELECT auth.uid())
        AND role IN ('Super Admin', 'School Head')
    )
  );

DROP POLICY IF EXISTS "leave_applications_delete_policy" ON public.leave_applications;
CREATE POLICY "leave_applications_delete_policy" ON public.leave_applications
  FOR DELETE TO authenticated
  USING (
    ((SELECT auth.uid()) = teacher_id AND status = 'Pending_Relief')
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (SELECT auth.uid())
        AND role = 'Super Admin'
    )
  );

-- Re-create leave_class_reliefs policies using SECURITY DEFINER owner helper
DROP POLICY IF EXISTS "leave_reliefs_select_policy" ON public.leave_class_reliefs;
CREATE POLICY "leave_reliefs_select_policy" ON public.leave_class_reliefs
  FOR SELECT TO authenticated
  USING (
    reliever_teacher_id = (SELECT auth.uid())
    OR public.is_leave_owner(leave_application_id, (SELECT auth.uid()))
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (SELECT auth.uid())
        AND role IN ('Super Admin', 'School Head')
    )
  );

DROP POLICY IF EXISTS "leave_reliefs_insert_policy" ON public.leave_class_reliefs;
CREATE POLICY "leave_reliefs_insert_policy" ON public.leave_class_reliefs
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_leave_owner(leave_application_id, (SELECT auth.uid()))
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (SELECT auth.uid())
        AND role IN ('Super Admin', 'School Head')
    )
  );

DROP POLICY IF EXISTS "leave_reliefs_update_policy" ON public.leave_class_reliefs;
CREATE POLICY "leave_reliefs_update_policy" ON public.leave_class_reliefs
  FOR UPDATE TO authenticated
  USING (
    reliever_teacher_id = (SELECT auth.uid())
    OR public.is_leave_owner(leave_application_id, (SELECT auth.uid()))
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (SELECT auth.uid())
        AND role IN ('Super Admin', 'School Head')
    )
  )
  WITH CHECK (
    reliever_teacher_id = (SELECT auth.uid())
    OR public.is_leave_owner(leave_application_id, (SELECT auth.uid()))
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (SELECT auth.uid())
        AND role IN ('Super Admin', 'School Head')
    )
  );
