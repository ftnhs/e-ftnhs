-- ============================================================================
-- e-FTNHS MIGRATION 023: Time Slot Override Type, JHS Club Activities & SHS Lunch
-- Target DB: https://ndwwoxsgcegdqiyoipvj.supabase.co
-- Safety: Additive column + idempotent upserts on public.time_slot_overrides.
-- ============================================================================

ALTER TABLE public.time_slot_overrides
  ADD COLUMN IF NOT EXISTS slot_type TEXT
  CHECK (slot_type IN ('Academic', 'Flag Ceremony', 'Recess', 'Lunch', 'Homeroom'));

-- Ensure JHS schedule overrides:
--   12:00 - 12:40 (40 min Lunch)
--   12:40 - 04:00 (4 x 50 min Academic periods)
--   04:00 - 05:00 (60 min CLUB ACTIVITIES non-academic block)
INSERT INTO public.time_slot_overrides (
  time_slot_id,
  scope_type,
  section_id,
  start_time,
  end_time,
  duration_minutes,
  slot_label,
  slot_type
)
SELECT
  ts.id,
  'JHS',
  NULL,
  CASE ts.slot_number
    WHEN 5 THEN '12:00:00'::TIME
    WHEN 6 THEN '12:40:00'::TIME
    WHEN 7 THEN '13:30:00'::TIME
    WHEN 8 THEN '14:20:00'::TIME
    WHEN 9 THEN '15:10:00'::TIME
    WHEN 10 THEN '16:00:00'::TIME
  END,
  CASE ts.slot_number
    WHEN 5 THEN '12:40:00'::TIME
    WHEN 6 THEN '13:30:00'::TIME
    WHEN 7 THEN '14:20:00'::TIME
    WHEN 8 THEN '15:10:00'::TIME
    WHEN 9 THEN '16:00:00'::TIME
    WHEN 10 THEN '17:00:00'::TIME
  END,
  CASE ts.slot_number
    WHEN 5 THEN 40
    WHEN 10 THEN 60
    ELSE 50
  END,
  CASE ts.slot_number
    WHEN 5 THEN 'NOON INTERMISSION'
    WHEN 6 THEN 'Period 5 (12:40 - 01:30 PM JHS)'
    WHEN 7 THEN 'Period 6 (01:30 - 02:20 PM JHS)'
    WHEN 8 THEN 'Period 7 (02:20 - 03:10 PM JHS)'
    WHEN 9 THEN 'Period 8 (03:10 - 04:00 PM JHS)'
    WHEN 10 THEN 'CLUB ACTIVITIES'
  END,
  CASE ts.slot_number
    WHEN 5 THEN 'Lunch'
    WHEN 10 THEN 'Homeroom'
    ELSE 'Academic'
  END
FROM public.time_slots ts
WHERE ts.slot_number IN (5, 6, 7, 8, 9, 10)
ON CONFLICT (time_slot_id, scope_type) WHERE section_id IS NULL
DO UPDATE SET
  start_time = EXCLUDED.start_time,
  end_time = EXCLUDED.end_time,
  duration_minutes = EXCLUDED.duration_minutes,
  slot_label = EXCLUDED.slot_label,
  slot_type = EXCLUDED.slot_type,
  updated_at = NOW();

-- Ensure SHS Lunch is 12:00 - 01:00 PM (60 mins)
INSERT INTO public.time_slot_overrides (
  time_slot_id,
  scope_type,
  section_id,
  start_time,
  end_time,
  duration_minutes,
  slot_label,
  slot_type
)
SELECT
  ts.id,
  'SHS',
  NULL,
  '12:00:00'::TIME,
  '13:00:00'::TIME,
  60,
  'NOON INTERMISSION',
  'Lunch'
FROM public.time_slots ts
WHERE ts.slot_number = 5
ON CONFLICT (time_slot_id, scope_type) WHERE section_id IS NULL
DO UPDATE SET
  start_time = EXCLUDED.start_time,
  end_time = EXCLUDED.end_time,
  duration_minutes = EXCLUDED.duration_minutes,
  slot_label = EXCLUDED.slot_label,
  slot_type = EXCLUDED.slot_type,
  updated_at = NOW();

-- Ensure Grade 12 - HUMSS (Term 2) custom Lunch is 12:00 - 12:30 PM (30 mins)
INSERT INTO public.time_slot_overrides (
  time_slot_id,
  scope_type,
  section_id,
  start_time,
  end_time,
  duration_minutes,
  slot_label,
  slot_type
)
SELECT
  ts.id,
  'SECTION',
  sec.id,
  '12:00:00'::TIME,
  '12:30:00'::TIME,
  30,
  'NOON INTERMISSION',
  'Lunch'
FROM public.time_slots ts
CROSS JOIN public.sections sec
JOIN public.academic_terms t ON t.id = sec.term_id
WHERE ts.slot_number = 5
  AND t.term_number = 2
  AND sec.grade_level = 12
  AND sec.section_name = 'HUMSS'
ON CONFLICT (time_slot_id, section_id) WHERE scope_type = 'SECTION'
DO UPDATE SET
  start_time = EXCLUDED.start_time,
  end_time = EXCLUDED.end_time,
  duration_minutes = EXCLUDED.duration_minutes,
  slot_label = EXCLUDED.slot_label,
  slot_type = EXCLUDED.slot_type,
  updated_at = NOW();
