-- ============================================================================
-- e-FTNHS MIGRATION 025: Lesson Plans Delete RLS Policy (Full Teacher CRUD)
-- Target DB: https://ndwwoxsgcegdqiyoipvj.supabase.co
-- Safety: Enables owners (teachers) and School Head/Super Admin to delete DLLs.
-- ============================================================================

DROP POLICY IF EXISTS "Teachers and Admins can delete lesson plans" ON public.lesson_plans;
CREATE POLICY "Teachers and Admins can delete lesson plans"
  ON public.lesson_plans FOR DELETE
  TO authenticated
  USING (
    (SELECT auth.uid()) = teacher_id
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (SELECT auth.uid())
        AND role IN ('Super Admin', 'School Head')
    )
  );

-- Allow owners & admins to delete uploaded files in dll-uploads storage bucket
DROP POLICY IF EXISTS "dll_uploads_delete" ON storage.objects;
CREATE POLICY "dll_uploads_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'dll-uploads'
    AND (
      (storage.foldername(name))[1] = (SELECT auth.uid())::text
      OR EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = (SELECT auth.uid())
          AND role IN ('Super Admin', 'School Head')
      )
    )
  );
