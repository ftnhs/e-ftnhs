-- ============================================================================
-- e-FTNHS MIGRATION 021: JHS, SHS & Section-Specific Time Slot Overrides
-- Target DB: https://ndwwoxsgcegdqiyoipvj.supabase.co
-- Safety: Non-destructive additive layer over public.time_slots so existing
-- schedule_entries and leave_class_reliefs foreign keys remain intact.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.time_slot_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  time_slot_id UUID NOT NULL REFERENCES public.time_slots(id) ON DELETE CASCADE,
  scope_type TEXT NOT NULL CHECK (scope_type IN ('JHS', 'SHS', 'SECTION')),
  section_id UUID REFERENCES public.sections(id) ON DELETE CASCADE,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  duration_minutes INT NOT NULL CHECK (duration_minutes > 0),
  slot_label TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_time_slot_overrides_scope_section CHECK (
    (scope_type = 'SECTION' AND section_id IS NOT NULL)
    OR (scope_type IN ('JHS', 'SHS') AND section_id IS NULL)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_time_slot_overrides_level_unique
  ON public.time_slot_overrides (time_slot_id, scope_type)
  WHERE section_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_time_slot_overrides_section_unique
  ON public.time_slot_overrides (time_slot_id, section_id)
  WHERE scope_type = 'SECTION';

CREATE INDEX IF NOT EXISTS idx_time_slot_overrides_section_id
  ON public.time_slot_overrides (section_id)
  WHERE section_id IS NOT NULL;

ALTER TABLE public.time_slot_overrides ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated read on time_slot_overrides" ON public.time_slot_overrides;
CREATE POLICY "Allow authenticated read on time_slot_overrides"
  ON public.time_slot_overrides FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Admins manage time_slot_overrides" ON public.time_slot_overrides;
CREATE POLICY "Admins manage time_slot_overrides"
  ON public.time_slot_overrides FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (SELECT auth.uid())
        AND profiles.role IN ('Super Admin', 'School Head')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (SELECT auth.uid())
        AND profiles.role IN ('Super Admin', 'School Head')
    )
  );

-- Seed default JHS 50-minute afternoon time ranges matching existing period hints
INSERT INTO public.time_slot_overrides (
  time_slot_id,
  scope_type,
  section_id,
  start_time,
  end_time,
  duration_minutes,
  slot_label
)
SELECT
  ts.id,
  'JHS',
  NULL,
  CASE ts.slot_number
    WHEN 6 THEN '12:40:00'::TIME
    WHEN 7 THEN '13:30:00'::TIME
    WHEN 8 THEN '14:20:00'::TIME
    WHEN 9 THEN '15:10:00'::TIME
  END,
  CASE ts.slot_number
    WHEN 6 THEN '13:30:00'::TIME
    WHEN 7 THEN '14:20:00'::TIME
    WHEN 8 THEN '15:10:00'::TIME
    WHEN 9 THEN '16:00:00'::TIME
  END,
  50,
  CASE ts.slot_number
    WHEN 6 THEN 'Period 5 (12:40 - 01:30 PM JHS)'
    WHEN 7 THEN 'Period 6 (01:30 - 02:20 PM JHS)'
    WHEN 8 THEN 'Period 7 (02:20 - 03:10 PM JHS)'
    WHEN 9 THEN 'Period 8 (03:10 - 04:00 PM JHS)'
  END
FROM public.time_slots ts
WHERE ts.slot_number IN (6, 7, 8, 9)
ON CONFLICT (time_slot_id, scope_type) WHERE section_id IS NULL DO NOTHING;
