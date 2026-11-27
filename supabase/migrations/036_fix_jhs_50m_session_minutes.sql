-- Migration 036: Correct JHS 50-minute subjects whose session_minutes defaulted to 60 in migration 035
UPDATE public.teacher_subject_loads tsl
SET session_minutes = 50
FROM public.sections s
WHERE s.id = tsl.section_id
  AND s.grade_level <= 10
  AND tsl.session_minutes = 60
  AND COALESCE(tsl.target_minutes_weekly, tsl.teaching_minutes_weekly) > 0
  AND COALESCE(tsl.target_minutes_weekly, tsl.teaching_minutes_weekly) % 50 = 0
  AND COALESCE(tsl.target_minutes_weekly, tsl.teaching_minutes_weekly) % 60 <> 0;
