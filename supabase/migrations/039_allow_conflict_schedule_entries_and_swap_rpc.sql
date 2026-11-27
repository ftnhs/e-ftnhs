-- Migration 039: Allow saving dragged/swapped schedule_entries even when temporary conflicts exist
-- Conflict detection and resolution warnings are handled visually on the Schedule Grid so admins
-- can freely rearrange/swap classes and resolve cascading conflicts in subsequent moves.

DROP TRIGGER IF EXISTS trg_schedule_entries_time_overlap ON public.schedule_entries;

CREATE OR REPLACE FUNCTION public.swap_schedule_entries(
  p_entry_a_id UUID,
  p_a_day TEXT,
  p_a_time_slot_id UUID,
  p_a_custom_start TIME,
  p_a_custom_end TIME,
  p_a_custom_duration INT,
  p_entry_b_id UUID,
  p_b_day TEXT,
  p_b_time_slot_id UUID,
  p_b_custom_start TIME,
  p_b_custom_end TIME,
  p_b_custom_duration INT
)
RETURNS SETOF public.schedule_entries
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_a public.schedule_entries%ROWTYPE;
  v_b public.schedule_entries%ROWTYPE;
  v_locked BOOLEAN;
BEGIN
  IF NOT public.is_admin_or_principal() THEN
    RAISE EXCEPTION 'Only Super Admin or School Head can swap schedule slots.';
  END IF;

  SELECT * INTO v_a FROM public.schedule_entries WHERE id = p_entry_a_id FOR UPDATE;
  SELECT * INTO v_b FROM public.schedule_entries WHERE id = p_entry_b_id FOR UPDATE;

  IF v_a.id IS NULL OR v_b.id IS NULL THEN
    RAISE EXCEPTION 'One or both schedule entries could not be found.';
  END IF;

  SELECT is_schedule_locked INTO v_locked FROM public.academic_terms WHERE id = v_a.term_id;
  IF COALESCE(v_locked, false) THEN
    RAISE EXCEPTION 'Schedule grid for this term is locked.';
  END IF;

  UPDATE public.schedule_entries
  SET day_of_week = p_a_day,
      time_slot_id = p_a_time_slot_id,
      custom_start_time = p_a_custom_start,
      custom_end_time = p_a_custom_end,
      custom_duration_minutes = p_a_custom_duration
  WHERE id = p_entry_a_id;

  UPDATE public.schedule_entries
  SET day_of_week = p_b_day,
      time_slot_id = p_b_time_slot_id,
      custom_start_time = p_b_custom_start,
      custom_end_time = p_b_custom_end,
      custom_duration_minutes = p_b_custom_duration
  WHERE id = p_entry_b_id;

  RETURN QUERY
  SELECT * FROM public.schedule_entries WHERE id IN (p_entry_a_id, p_entry_b_id);
END;
$$;
