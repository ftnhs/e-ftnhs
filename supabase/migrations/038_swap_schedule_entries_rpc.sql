-- Migration 038: Atomic RPC for swapping two schedule_entries cleanly while respecting overlap triggers
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

  -- Temporarily remove B within the transaction so overlap trigger checks against other classes cleanly
  DELETE FROM public.schedule_entries WHERE id = p_entry_b_id;

  -- Move A to B's target slot
  UPDATE public.schedule_entries
  SET day_of_week = p_a_day,
      time_slot_id = p_a_time_slot_id,
      custom_start_time = p_a_custom_start,
      custom_end_time = p_a_custom_end,
      custom_duration_minutes = p_a_custom_duration
  WHERE id = p_entry_a_id;

  -- Re-insert B at A's target slot preserving original UUID and attributes
  INSERT INTO public.schedule_entries (
    id, term_id, load_id, teacher_id, guest_instructor_name,
    section_id, subject_id, room_id, day_of_week, time_slot_id,
    custom_start_time, custom_end_time, custom_duration_minutes, created_at
  ) VALUES (
    v_b.id, v_b.term_id, v_b.load_id, v_b.teacher_id, v_b.guest_instructor_name,
    v_b.section_id, v_b.subject_id, v_b.room_id, p_b_day, p_b_time_slot_id,
    p_b_custom_start, p_b_custom_end, p_b_custom_duration, v_b.created_at
  );

  RETURN QUERY
  SELECT * FROM public.schedule_entries WHERE id IN (p_entry_a_id, p_entry_b_id);
END;
$$;
