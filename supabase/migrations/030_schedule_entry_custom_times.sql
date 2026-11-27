-- ============================================================================
-- e-FTNHS MIGRATION 030: Per-Class Custom Start/Finish Times & Split Periods
-- Target DB: https://ndwwoxsgcegdqiyoipvj.supabase.co
-- Enables:
--   1. Custom start_time / end_time / duration_minutes on schedule_entries
--   2. Non-overlapping split periods inside the same time slot
--      (e.g. Wednesday Period 1: 08:00-08:30 MABISANGKOM-11 + 08:30-09:00 EFFCOMM-11)
--   3. Automatic sync of custom_duration_minutes -> teacher_subject_loads
-- ============================================================================

-- 1. ADD CUSTOM TIME COLUMNS ON schedule_entries
ALTER TABLE public.schedule_entries
  ADD COLUMN IF NOT EXISTS custom_start_time TIME,
  ADD COLUMN IF NOT EXISTS custom_end_time TIME,
  ADD COLUMN IF NOT EXISTS custom_duration_minutes INT;

ALTER TABLE public.schedule_entries
  DROP CONSTRAINT IF EXISTS chk_schedule_entry_custom_time_range;

ALTER TABLE public.schedule_entries
  ADD CONSTRAINT chk_schedule_entry_custom_time_range CHECK (
    (custom_start_time IS NULL AND custom_end_time IS NULL AND custom_duration_minutes IS NULL)
    OR (
      custom_start_time IS NOT NULL
      AND custom_end_time IS NOT NULL
      AND custom_end_time > custom_start_time
      AND custom_duration_minutes IS NOT NULL
      AND custom_duration_minutes > 0
    )
  );

-- 2. REPLACE SLOT-LEVEL UNIQUE CONSTRAINTS WITH TRUE CLOCK-TIME OVERLAP GUARD
--    This keeps full conflict safety while permitting consecutive split classes
--    (e.g., 08:00-08:30 and 08:30-09:00) within the same Academic Period.
ALTER TABLE public.schedule_entries
  DROP CONSTRAINT IF EXISTS unique_teacher_day_slot,
  DROP CONSTRAINT IF EXISTS unique_section_day_slot;

DROP INDEX IF EXISTS public.unique_room_day_slot_idx;
DROP INDEX IF EXISTS public.unique_guest_day_slot_idx;

CREATE OR REPLACE FUNCTION public.get_resolved_slot_bounds(
  p_time_slot_id UUID,
  p_section_id UUID
) RETURNS TABLE(start_t TIME, end_t TIME) AS $$
DECLARE
  v_grade INT;
  v_level_scope TEXT;
  v_s TIME;
  v_e TIME;
BEGIN
  IF p_section_id IS NOT NULL THEN
    SELECT grade_level INTO v_grade FROM public.sections WHERE id = p_section_id;
    v_level_scope := CASE WHEN COALESCE(v_grade, 7) >= 11 THEN 'SHS' ELSE 'JHS' END;

    SELECT start_time, end_time INTO v_s, v_e
    FROM public.time_slot_overrides
    WHERE time_slot_id = p_time_slot_id
      AND scope_type = 'SECTION'
      AND section_id = p_section_id
    LIMIT 1;
    IF v_s IS NOT NULL AND v_e IS NOT NULL THEN
      RETURN QUERY SELECT v_s, v_e;
      RETURN;
    END IF;

    SELECT start_time, end_time INTO v_s, v_e
    FROM public.time_slot_overrides
    WHERE time_slot_id = p_time_slot_id
      AND scope_type = v_level_scope
      AND section_id IS NULL
    LIMIT 1;
    IF v_s IS NOT NULL AND v_e IS NOT NULL THEN
      RETURN QUERY SELECT v_s, v_e;
      RETURN;
    END IF;
  END IF;

  SELECT start_time, end_time INTO v_s, v_e
  FROM public.time_slots
  WHERE id = p_time_slot_id;

  RETURN QUERY SELECT COALESCE(v_s, '08:00:00'::TIME), COALESCE(v_e, '09:00:00'::TIME);
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION public.trg_check_schedule_time_overlap()
RETURNS TRIGGER AS $$
DECLARE
  v_new_start TIME;
  v_new_end TIME;
  v_guest_norm TEXT;
  r RECORD;
BEGIN
  SELECT
    COALESCE(NEW.custom_start_time, b.start_t),
    COALESCE(NEW.custom_end_time, b.end_t)
  INTO v_new_start, v_new_end
  FROM public.get_resolved_slot_bounds(NEW.time_slot_id, NEW.section_id) b;

  v_guest_norm := UPPER(TRIM(COALESCE(NEW.guest_instructor_name, '')));

  FOR r IN
    SELECT
      se.id,
      se.teacher_id,
      se.section_id,
      se.room_id,
      UPPER(TRIM(COALESCE(se.guest_instructor_name, ''))) AS guest_norm,
      COALESCE(se.custom_start_time, eb.start_t) AS other_start,
      COALESCE(se.custom_end_time, eb.end_t) AS other_end
    FROM public.schedule_entries se
    CROSS JOIN LATERAL public.get_resolved_slot_bounds(se.time_slot_id, se.section_id) eb
    WHERE se.term_id = NEW.term_id
      AND se.day_of_week = NEW.day_of_week
      AND se.id IS DISTINCT FROM NEW.id
      AND COALESCE(se.custom_start_time, eb.start_t) < v_new_end
      AND v_new_start < COALESCE(se.custom_end_time, eb.end_t)
  LOOP
    IF NEW.teacher_id IS NOT NULL AND r.teacher_id = NEW.teacher_id THEN
      RAISE EXCEPTION 'Teacher time overlap detected (% - % on %)', v_new_start, v_new_end, NEW.day_of_week;
    END IF;

    IF v_guest_norm <> '' AND r.guest_norm = v_guest_norm THEN
      RAISE EXCEPTION 'Guest instructor time overlap detected (% - % on %)', v_new_start, v_new_end, NEW.day_of_week;
    END IF;

    IF r.section_id = NEW.section_id THEN
      RAISE EXCEPTION 'Section time overlap detected (% - % on %)', v_new_start, v_new_end, NEW.day_of_week;
    END IF;

    IF NEW.room_id IS NOT NULL AND r.room_id = NEW.room_id THEN
      RAISE EXCEPTION 'Room time overlap detected (% - % on %)', v_new_start, v_new_end, NEW.day_of_week;
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_schedule_entries_time_overlap ON public.schedule_entries;
CREATE TRIGGER trg_schedule_entries_time_overlap
  BEFORE INSERT OR UPDATE OF term_id, day_of_week, time_slot_id, teacher_id, guest_instructor_name, section_id, room_id, custom_start_time, custom_end_time
  ON public.schedule_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_check_schedule_time_overlap();

-- 3. INCLUDE custom_duration_minutes IN AUTOMATIC LOAD MINUTES SYNC
CREATE OR REPLACE FUNCTION public.recalculate_load_teaching_minutes(
  p_load_id UUID
) RETURNS VOID AS $$
DECLARE
  v_plotted_mins INT;
BEGIN
  IF p_load_id IS NULL THEN
    RETURN;
  END IF;

  SELECT COALESCE(
    SUM(COALESCE(se.custom_duration_minutes, public.get_resolved_slot_duration(se.time_slot_id, se.section_id))),
    0
  )
  INTO v_plotted_mins
  FROM public.schedule_entries se
  WHERE se.load_id = p_load_id;

  UPDATE public.teacher_subject_loads
  SET teaching_minutes_weekly = v_plotted_mins
  WHERE id = p_load_id
    AND teaching_minutes_weekly IS DISTINCT FROM v_plotted_mins;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_schedule_entries_sync_load_minutes ON public.schedule_entries;
CREATE TRIGGER trg_schedule_entries_sync_load_minutes
  AFTER INSERT OR UPDATE OF load_id, time_slot_id, section_id, custom_start_time, custom_end_time, custom_duration_minutes OR DELETE
  ON public.schedule_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_sync_load_minutes_from_schedule();
