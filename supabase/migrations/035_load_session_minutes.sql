-- Migration 035: Add session_minutes to teacher_subject_loads
-- Stores minutes per class session (default 50 for JHS <= 10, 60 for SHS >= 11, customizable)

ALTER TABLE public.teacher_subject_loads
  ADD COLUMN IF NOT EXISTS session_minutes INT DEFAULT 60;

-- Backfill existing loads based on section grade level
UPDATE public.teacher_subject_loads tsl
SET session_minutes = CASE
  WHEN (SELECT grade_level FROM public.sections s WHERE s.id = tsl.section_id) <= 10 THEN 50
  ELSE 60
END
WHERE session_minutes IS NULL;
