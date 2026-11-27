-- ============================================================================
-- e-FTNHS MIGRATION 031: Optional Room Assignment on Teacher Subject Loads
-- Target DB: https://ndwwoxsgcegdqiyoipvj.supabase.co
-- Safety: Non-destructive additive nullable column; preserves existing loads.
-- ============================================================================

ALTER TABLE public.teacher_subject_loads
  ADD COLUMN IF NOT EXISTS room_id UUID REFERENCES public.rooms_catalog(id) ON DELETE SET NULL;
