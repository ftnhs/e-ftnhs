-- ============================================================================
-- e-FTNHS MIGRATION 029: Exact SY 2026-2027 Term 2 Class Program Schedule,
-- JHS 50-Min Afternoon Periods, 12-HUMSS 12:30-1:00 HOPE Slot,
-- Guest Instructor Support (F. Narisma Religion), & Auto-Synced Load Minutes
-- Target DB: https://ndwwoxsgcegdqiyoipvj.supabase.co
-- ============================================================================

-- 1. ADD 12:30 - 1:00 PM (30 MIN) ACADEMIC SLOT FOR GRADE 12 HUMSS (HOPE 3)
--    Shift sort_order on existing slots >= 6 so slot_number 11 sits between Lunch (5) and Period 5 (6).
UPDATE public.time_slots
SET sort_order = slot_number + 1
WHERE slot_number IN (6, 7, 8, 9, 10);

INSERT INTO public.time_slots (
  slot_number, slot_label, start_time, end_time, duration_minutes, slot_type, sort_order
)
SELECT
  11,
  'Midday Period (12:30 - 01:00 PM)',
  '12:30:00'::TIME,
  '13:00:00'::TIME,
  30,
  'Academic',
  6
WHERE NOT EXISTS (
  SELECT 1 FROM public.time_slots WHERE slot_number = 11
);

-- Keep base slot 11 consistent if it already exists
UPDATE public.time_slots
SET slot_label = 'Midday Period (12:30 - 01:00 PM)',
    start_time = '12:30:00'::TIME,
    end_time = '13:00:00'::TIME,
    duration_minutes = 30,
    slot_type = 'Academic',
    sort_order = 6
WHERE slot_number = 11;

-- 2. ENSURE ALL JHS / SHS / 12-HUMSS TIME SLOT OVERRIDES MATCH EXCEL EXACTLY
--    JHS:
--      12:00 - 12:40 (40m Lunch)
--      12:40 - 01:30 (50m Academic)
--      01:30 - 02:20 (50m Academic)
--      02:20 - 03:10 (50m Academic)
--      03:10 - 04:00 (50m Academic)
--      04:00 - 05:00 (40m SPORTS CLUB - Homeroom / non-academic)
INSERT INTO public.time_slot_overrides (
  time_slot_id, scope_type, section_id, start_time, end_time, duration_minutes, slot_label, slot_type
)
SELECT
  ts.id,
  'JHS',
  NULL,
  CASE ts.slot_number
    WHEN 5  THEN '12:00:00'::TIME
    WHEN 6  THEN '12:40:00'::TIME
    WHEN 7  THEN '13:30:00'::TIME
    WHEN 8  THEN '14:20:00'::TIME
    WHEN 9  THEN '15:10:00'::TIME
    WHEN 10 THEN '16:00:00'::TIME
  END,
  CASE ts.slot_number
    WHEN 5  THEN '12:40:00'::TIME
    WHEN 6  THEN '13:30:00'::TIME
    WHEN 7  THEN '14:20:00'::TIME
    WHEN 8  THEN '15:10:00'::TIME
    WHEN 9  THEN '16:00:00'::TIME
    WHEN 10 THEN '17:00:00'::TIME
  END,
  CASE ts.slot_number
    WHEN 5  THEN 40
    WHEN 10 THEN 40
    ELSE 50
  END,
  CASE ts.slot_number
    WHEN 5  THEN 'NOON INTERMISSION'
    WHEN 6  THEN 'Period 5 (12:40 - 01:30 PM JHS)'
    WHEN 7  THEN 'Period 6 (01:30 - 02:20 PM JHS)'
    WHEN 8  THEN 'Period 7 (02:20 - 03:10 PM JHS)'
    WHEN 9  THEN 'Period 8 (03:10 - 04:00 PM JHS)'
    WHEN 10 THEN 'SPORTS CLUB'
  END,
  CASE ts.slot_number
    WHEN 5  THEN 'Lunch'
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

--    SHS:
--      12:00 - 01:00 (60m Lunch)
--      01:00 - 02:00 (60m Academic)
--      02:00 - 03:00 (60m Academic)
--      03:00 - 04:00 (60m Academic)
--      04:00 - 05:00 (60m Academic)
INSERT INTO public.time_slot_overrides (
  time_slot_id, scope_type, section_id, start_time, end_time, duration_minutes, slot_label, slot_type
)
SELECT
  ts.id,
  'SHS',
  NULL,
  CASE ts.slot_number
    WHEN 5  THEN '12:00:00'::TIME
    WHEN 6  THEN '13:00:00'::TIME
    WHEN 7  THEN '14:00:00'::TIME
    WHEN 8  THEN '15:00:00'::TIME
    WHEN 10 THEN '16:00:00'::TIME
  END,
  CASE ts.slot_number
    WHEN 5  THEN '13:00:00'::TIME
    WHEN 6  THEN '14:00:00'::TIME
    WHEN 7  THEN '15:00:00'::TIME
    WHEN 8  THEN '16:00:00'::TIME
    WHEN 10 THEN '17:00:00'::TIME
  END,
  60,
  CASE ts.slot_number
    WHEN 5  THEN 'NOON INTERMISSION'
    WHEN 6  THEN 'Period 5 (01:00 - 02:00 PM SHS)'
    WHEN 7  THEN 'Period 6 (02:00 - 03:00 PM SHS)'
    WHEN 8  THEN 'Period 7 (03:00 - 04:00 PM SHS)'
    WHEN 10 THEN 'Period 8 (04:00 - 05:00 PM SHS)'
  END,
  CASE ts.slot_number
    WHEN 5 THEN 'Lunch'
    ELSE 'Academic'
  END
FROM public.time_slots ts
WHERE ts.slot_number IN (5, 6, 7, 8, 10)
ON CONFLICT (time_slot_id, scope_type) WHERE section_id IS NULL
DO UPDATE SET
  start_time = EXCLUDED.start_time,
  end_time = EXCLUDED.end_time,
  duration_minutes = EXCLUDED.duration_minutes,
  slot_label = EXCLUDED.slot_label,
  slot_type = EXCLUDED.slot_type,
  updated_at = NOW();

--    SECTION OVERRIDES FOR ALL GRADE 12 - HUMSS SECTIONS (SY 2026-2027):
--      Slot 5:  12:00 - 12:30 (30m NOON INTERMISSION)
--      Slot 11: 12:30 - 01:00 (30m HOPE / Midday Academic Period)
INSERT INTO public.time_slot_overrides (
  time_slot_id, scope_type, section_id, start_time, end_time, duration_minutes, slot_label, slot_type
)
SELECT
  ts.id,
  'SECTION',
  sec.id,
  CASE ts.slot_number
    WHEN 5  THEN '12:00:00'::TIME
    WHEN 11 THEN '12:30:00'::TIME
  END,
  CASE ts.slot_number
    WHEN 5  THEN '12:30:00'::TIME
    WHEN 11 THEN '13:00:00'::TIME
  END,
  30,
  CASE ts.slot_number
    WHEN 5  THEN 'NOON INTERMISSION'
    WHEN 11 THEN 'Midday Period (12:30 - 01:00 PM)'
  END,
  CASE ts.slot_number
    WHEN 5  THEN 'Lunch'
    WHEN 11 THEN 'Academic'
  END
FROM public.time_slots ts
CROSS JOIN public.sections sec
WHERE ts.slot_number IN (5, 11)
  AND sec.grade_level = 12
  AND UPPER(sec.section_name) = 'HUMSS'
ON CONFLICT (time_slot_id, section_id) WHERE scope_type = 'SECTION'
DO UPDATE SET
  start_time = EXCLUDED.start_time,
  end_time = EXCLUDED.end_time,
  duration_minutes = EXCLUDED.duration_minutes,
  slot_label = EXCLUDED.slot_label,
  slot_type = EXCLUDED.slot_type,
  updated_at = NOW();

-- 3. SUPPORT GUEST / VOLUNTEER INSTRUCTORS ON SCHEDULE_ENTRIES (e.g. F. Narisma for Religion)
ALTER TABLE public.schedule_entries
  ALTER COLUMN load_id DROP NOT NULL,
  ALTER COLUMN teacher_id DROP NOT NULL;

ALTER TABLE public.schedule_entries
  ADD COLUMN IF NOT EXISTS guest_instructor_name TEXT;

ALTER TABLE public.schedule_entries
  DROP CONSTRAINT IF EXISTS chk_schedule_entry_instructor;

ALTER TABLE public.schedule_entries
  ADD CONSTRAINT chk_schedule_entry_instructor CHECK (
    (load_id IS NOT NULL AND teacher_id IS NOT NULL)
    OR NULLIF(TRIM(COALESCE(guest_instructor_name, '')), '') IS NOT NULL
  );

CREATE UNIQUE INDEX IF NOT EXISTS unique_guest_day_slot_idx
  ON public.schedule_entries (term_id, day_of_week, time_slot_id, UPPER(TRIM(guest_instructor_name)))
  WHERE guest_instructor_name IS NOT NULL;

-- 4. AUTOMATIC DB SYNC: PLOTTED SCHEDULE DURATION <-> TEACHER SUBJECT LOADS
CREATE OR REPLACE FUNCTION public.get_resolved_slot_duration(
  p_time_slot_id UUID,
  p_section_id UUID
) RETURNS INT AS $$
DECLARE
  v_grade INT;
  v_level_scope TEXT;
  v_dur INT;
BEGIN
  IF p_section_id IS NOT NULL THEN
    SELECT grade_level INTO v_grade FROM public.sections WHERE id = p_section_id;
    v_level_scope := CASE WHEN COALESCE(v_grade, 7) >= 11 THEN 'SHS' ELSE 'JHS' END;

    -- 1. Section-level override
    SELECT duration_minutes INTO v_dur
    FROM public.time_slot_overrides
    WHERE time_slot_id = p_time_slot_id
      AND scope_type = 'SECTION'
      AND section_id = p_section_id
    LIMIT 1;
    IF v_dur IS NOT NULL THEN
      RETURN v_dur;
    END IF;

    -- 2. JHS / SHS level override
    SELECT duration_minutes INTO v_dur
    FROM public.time_slot_overrides
    WHERE time_slot_id = p_time_slot_id
      AND scope_type = v_level_scope
      AND section_id IS NULL
    LIMIT 1;
    IF v_dur IS NOT NULL THEN
      RETURN v_dur;
    END IF;
  END IF;

  -- 3. Base time slot duration
  SELECT duration_minutes INTO v_dur
  FROM public.time_slots
  WHERE id = p_time_slot_id;

  RETURN COALESCE(v_dur, 60);
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION public.recalculate_load_teaching_minutes(
  p_load_id UUID
) RETURNS VOID AS $$
DECLARE
  v_plotted_mins INT;
BEGIN
  IF p_load_id IS NULL THEN
    RETURN;
  END IF;

  SELECT COALESCE(SUM(public.get_resolved_slot_duration(se.time_slot_id, se.section_id)), 0)
  INTO v_plotted_mins
  FROM public.schedule_entries se
  WHERE se.load_id = p_load_id;

  UPDATE public.teacher_subject_loads
  SET teaching_minutes_weekly = v_plotted_mins
  WHERE id = p_load_id
    AND teaching_minutes_weekly IS DISTINCT FROM v_plotted_mins;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.trg_sync_load_minutes_from_schedule()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.load_id IS NOT NULL THEN
      PERFORM public.recalculate_load_teaching_minutes(OLD.load_id);
    END IF;
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.load_id IS NOT NULL AND OLD.load_id IS DISTINCT FROM NEW.load_id THEN
      PERFORM public.recalculate_load_teaching_minutes(OLD.load_id);
    END IF;
    IF NEW.load_id IS NOT NULL THEN
      PERFORM public.recalculate_load_teaching_minutes(NEW.load_id);
    END IF;
    RETURN NEW;
  ELSE
    IF NEW.load_id IS NOT NULL THEN
      PERFORM public.recalculate_load_teaching_minutes(NEW.load_id);
    END IF;
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_schedule_entries_sync_load_minutes ON public.schedule_entries;
CREATE TRIGGER trg_schedule_entries_sync_load_minutes
  AFTER INSERT OR UPDATE OF load_id, time_slot_id, section_id OR DELETE
  ON public.schedule_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_sync_load_minutes_from_schedule();

CREATE OR REPLACE FUNCTION public.trg_sync_load_minutes_from_timeslot()
RETURNS TRIGGER AS $$
DECLARE
  v_slot_id UUID;
  r RECORD;
BEGIN
  v_slot_id := CASE WHEN TG_OP = 'DELETE' THEN OLD.time_slot_id ELSE NEW.time_slot_id END;
  FOR r IN
    SELECT DISTINCT load_id
    FROM public.schedule_entries
    WHERE time_slot_id = v_slot_id
      AND load_id IS NOT NULL
  LOOP
    PERFORM public.recalculate_load_teaching_minutes(r.load_id);
  END LOOP;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.trg_sync_load_minutes_from_base_timeslot()
RETURNS TRIGGER AS $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT DISTINCT load_id
    FROM public.schedule_entries
    WHERE time_slot_id = NEW.id
      AND load_id IS NOT NULL
  LOOP
    PERFORM public.recalculate_load_teaching_minutes(r.load_id);
  END LOOP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_time_slot_overrides_sync_load_minutes ON public.time_slot_overrides;
CREATE TRIGGER trg_time_slot_overrides_sync_load_minutes
  AFTER INSERT OR UPDATE OR DELETE
  ON public.time_slot_overrides
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_sync_load_minutes_from_timeslot();

DROP TRIGGER IF EXISTS trg_time_slots_sync_load_minutes ON public.time_slots;
CREATE TRIGGER trg_time_slots_sync_load_minutes
  AFTER UPDATE OF duration_minutes
  ON public.time_slots
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_sync_load_minutes_from_base_timeslot();

-- 5. UPDATE SUBJECTS CATALOG MINUTES TO MATCH PLOTTED DURATIONS & ADD REMEDIAL / ARAL / RELIGION SUBJECTS
UPDATE public.subjects_catalog
SET minutes_per_week = CASE subject_code
  WHEN 'HGP-7' THEN 60
  WHEN 'HGP-8' THEN 60
  WHEN 'HGP-9' THEN 60
  WHEN 'HGP-10' THEN 60
  WHEN 'HGP-11' THEN 60
  WHEN 'HGP-12' THEN 60
  WHEN 'CAT-10' THEN 50
  WHEN 'AP-7' THEN 200
  WHEN 'MAPEH-7' THEN 200
  WHEN 'TLE-7' THEN 200
  WHEN 'ESP-7' THEN 250
  WHEN 'AP-8' THEN 200
  WHEN 'FIL-8' THEN 200
  WHEN 'MAPEH-8' THEN 200
  WHEN 'TLE-8' THEN 200
  WHEN 'AP-9' THEN 200
  WHEN 'FIL-9' THEN 200
  WHEN 'TLE-9' THEN 200
  WHEN 'AP-10' THEN 200
  WHEN 'ESP-10' THEN 200
  WHEN 'FIL-10' THEN 200
  WHEN 'MAPEH-10' THEN 200
  ELSE minutes_per_week
END
WHERE subject_code IN (
  'HGP-7','HGP-8','HGP-9','HGP-10','HGP-11','HGP-12',
  'CAT-10','AP-7','MAPEH-7','TLE-7','ESP-7',
  'AP-8','FIL-8','MAPEH-8','TLE-8',
  'AP-9','FIL-9','TLE-9',
  'AP-10','ESP-10','FIL-10','MAPEH-10'
);

INSERT INTO public.subjects_catalog (
  subject_code, subject_name, grade_level, track_strand, category, curriculum_version, minutes_per_week, requires_lab
)
VALUES
  -- Remedial English & Math (Grades 7-10)
  ('REM-ENG-7',  'Remedial English 7',      7,  'JHS', 'Applied', 'JHS MATATAG', 60, false),
  ('REM-MATH-7', 'Remedial Mathematics 7',  7,  'JHS', 'Applied', 'JHS MATATAG', 60, false),
  ('REM-ENG-8',  'Remedial English 8',      8,  'JHS', 'Applied', 'JHS MATATAG', 50, false),
  ('REM-MATH-8', 'Remedial Mathematics 8',  8,  'JHS', 'Applied', 'JHS MATATAG', 60, false),
  ('REM-ENG-9',  'Remedial English 9',      9,  'JHS', 'Applied', 'JHS MATATAG', 60, false),
  ('REM-MATH-9', 'Remedial Mathematics 9',  9,  'JHS', 'Applied', 'JHS MATATAG', 60, false),
  ('REM-ENG-10', 'Remedial English 10',     10, 'JHS', 'Applied', 'JHS MATATAG', 50, false),
  ('REM-MATH-10','Remedial Mathematics 10', 10, 'JHS', 'Applied', 'JHS MATATAG', 60, false),

  -- ARAL Reading & ARAL Math (Grades 7-12)
  ('ARAL-READ-7',  'ARAL Reading 7',      7,  'JHS', 'Applied', 'JHS MATATAG', 100, false),
  ('ARAL-MATH-7',  'ARAL Math 7',         7,  'JHS', 'Applied', 'JHS MATATAG', 60,  false),
  ('ARAL-READ-8',  'ARAL Reading 8',      8,  'JHS', 'Applied', 'JHS MATATAG', 110, false),
  ('ARAL-MATH-8',  'ARAL Math 8',         8,  'JHS', 'Applied', 'JHS MATATAG', 50,  false),
  ('ARAL-READ-9',  'ARAL Reading 9',      9,  'JHS', 'Applied', 'JHS MATATAG', 110, false),
  ('ARAL-MATH-9',  'ARAL Math 9',         9,  'JHS', 'Applied', 'JHS MATATAG', 50,  false),
  ('ARAL-READ-10', 'ARAL Reading 10',     10, 'JHS', 'Applied', 'JHS MATATAG', 110, false),
  ('ARAL-MATH-10', 'ARAL Math 10',        10, 'JHS', 'Applied', 'JHS MATATAG', 60,  false),
  ('ARAL-READ-11', 'ARAL Reading 11',     11, 'SHS', 'Applied', 'SSHS',        120, false),
  ('ARAL-MATH-11', 'ARAL Math 11',        11, 'SHS', 'Applied', 'SSHS',        120, false),
  ('ARAL-READ-12', 'ARAL Reading 12',     12, 'SHS', 'Applied', 'Old SHS',     60,  false),

  -- Religion (Grades 7-10, Guest/Volunteer Catechist F. Narisma)
  ('REL-7',  'Religion 7',  7,  'JHS', 'Applied', 'JHS MATATAG', 50, false),
  ('REL-8',  'Religion 8',  8,  'JHS', 'Applied', 'JHS MATATAG', 50, false),
  ('REL-9',  'Religion 9',  9,  'JHS', 'Applied', 'JHS MATATAG', 50, false),
  ('REL-10', 'Religion 10', 10, 'JHS', 'Applied', 'JHS MATATAG', 50, false)
ON CONFLICT (subject_code) DO UPDATE
SET subject_name = EXCLUDED.subject_name,
    minutes_per_week = EXCLUDED.minutes_per_week,
    curriculum_version = EXCLUDED.curriculum_version;

-- 6. REPLACE TERM 2 SCHEDULE ENTRIES & TEACHER SUBJECT LOADS WITH EXACT EXCEL SCHEDULE
--    (Preserves Term 1 & Term 3 data completely intact.)
DELETE FROM public.schedule_entries
WHERE term_id = (SELECT id FROM public.academic_terms WHERE school_year = '2026-2027' AND term_number = 2);

DELETE FROM public.teacher_subject_loads
WHERE term_id = (SELECT id FROM public.academic_terms WHERE school_year = '2026-2027' AND term_number = 2);

CREATE OR REPLACE FUNCTION pg_temp.add_load_t2(
  p_email TEXT,
  p_subject_code TEXT,
  p_grade INT,
  p_section TEXT,
  p_ancillary_mins INT DEFAULT 0,
  p_ancillary_desc TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_term_id UUID;
  v_teacher_id UUID;
  v_subject_id UUID;
  v_section_id UUID;
  v_load_id UUID;
BEGIN
  SELECT id INTO v_term_id FROM public.academic_terms WHERE school_year = '2026-2027' AND term_number = 2;
  SELECT id INTO v_teacher_id FROM public.profiles WHERE email = p_email;
  SELECT id INTO v_subject_id FROM public.subjects_catalog WHERE subject_code = p_subject_code;
  SELECT id INTO v_section_id FROM public.sections WHERE term_id = v_term_id AND grade_level = p_grade AND section_name = p_section;

  IF v_term_id IS NULL OR v_teacher_id IS NULL OR v_subject_id IS NULL OR v_section_id IS NULL THEN
    RAISE EXCEPTION 'Missing lookup in add_load_t2: email=%, subj=%, gr=%, sec=%', p_email, p_subject_code, p_grade, p_section;
  END IF;

  INSERT INTO public.teacher_subject_loads (
    term_id, teacher_id, subject_id, section_id,
    teaching_minutes_weekly, ancillary_minutes_weekly, ancillary_description, status
  ) VALUES (
    v_term_id, v_teacher_id, v_subject_id, v_section_id,
    0, COALESCE(p_ancillary_mins, 0), p_ancillary_desc, 'Assigned'
  )
  ON CONFLICT (term_id, teacher_id, subject_id, section_id) DO UPDATE
  SET ancillary_minutes_weekly = EXCLUDED.ancillary_minutes_weekly,
      ancillary_description = COALESCE(EXCLUDED.ancillary_description, public.teacher_subject_loads.ancillary_description)
  RETURNING id INTO v_load_id;

  RETURN v_load_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION pg_temp.add_slot_t2(
  p_email TEXT,
  p_subject_code TEXT,
  p_grade INT,
  p_section TEXT,
  p_slot_num INT,
  p_days TEXT[],
  p_guest_name TEXT DEFAULT NULL
) RETURNS VOID AS $$
DECLARE
  v_term_id UUID;
  v_teacher_id UUID;
  v_subject_id UUID;
  v_section_id UUID;
  v_load_id UUID;
  v_slot_id UUID;
  v_room_id UUID;
  v_day TEXT;
BEGIN
  SELECT id INTO v_term_id FROM public.academic_terms WHERE school_year = '2026-2027' AND term_number = 2;
  SELECT id INTO v_subject_id FROM public.subjects_catalog WHERE subject_code = p_subject_code;
  SELECT id, room_id INTO v_section_id, v_room_id FROM public.sections WHERE term_id = v_term_id AND grade_level = p_grade AND section_name = p_section;
  SELECT id INTO v_slot_id FROM public.time_slots WHERE slot_number = p_slot_num;

  IF v_term_id IS NULL OR v_subject_id IS NULL OR v_section_id IS NULL OR v_slot_id IS NULL THEN
    RAISE EXCEPTION 'Missing lookup in add_slot_t2: subj=%, gr=%, sec=%, slot=%', p_subject_code, p_grade, p_section, p_slot_num;
  END IF;

  IF p_guest_name IS NOT NULL THEN
    v_teacher_id := NULL;
    v_load_id := NULL;
  ELSE
    SELECT id INTO v_teacher_id FROM public.profiles WHERE email = p_email;
    IF v_teacher_id IS NULL THEN
      RAISE EXCEPTION 'Missing teacher email in add_slot_t2: %', p_email;
    END IF;

    SELECT id INTO v_load_id
    FROM public.teacher_subject_loads
    WHERE term_id = v_term_id
      AND teacher_id = v_teacher_id
      AND subject_id = v_subject_id
      AND section_id = v_section_id;

    IF v_load_id IS NULL THEN
      v_load_id := pg_temp.add_load_t2(p_email, p_subject_code, p_grade, p_section, 0, NULL);
    END IF;
  END IF;

  FOREACH v_day IN ARRAY p_days LOOP
    INSERT INTO public.schedule_entries (
      term_id, load_id, teacher_id, guest_instructor_name, section_id, subject_id, time_slot_id, room_id, day_of_week
    ) VALUES (
      v_term_id, v_load_id, v_teacher_id, p_guest_name, v_section_id, v_subject_id, v_slot_id, v_room_id, v_day
    );
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Pre-seed adviser & ICT ancillary metadata loads before plotting slots
DO $$
BEGIN
  PERFORM pg_temp.add_load_t2('maryjane.baluma@deped.gov.ph',    'HGP-7',       7,  'Peace',       0,   'Class Adviser 7-Peace; Canteen Mgr, Filipino & DRRM Coord.');
  PERFORM pg_temp.add_load_t2('renalyn.pujadas@deped.gov.ph',    'HGP-8',       8,  'Faith',       0,   'Class Adviser 8-Faith; Feeding & TLE Coord.');
  PERFORM pg_temp.add_load_t2('florenda.calotes@deped.gov.ph',   'HGP-8',       8,  'Love',        0,   'Class Adviser 8-Love; ARAL & Phil-IRI/Reading Coord.');
  PERFORM pg_temp.add_load_t2('nova.fuentes@deped.gov.ph',       'HGP-9',       9,  'Honesty',     0,   'Class Adviser 9-Honesty; MAPEH & Performing Arts Coord.');
  PERFORM pg_temp.add_load_t2('rayalbert.albaran@deped.gov.ph',  'HGP-9',       9,  'Patience',    0,   'Class Adviser 9-Patience; LFO JHS & Values Coord.');
  PERFORM pg_temp.add_load_t2('reah.ong@deped.gov.ph',           'HGP-10',      10, 'Charity',     0,   'Class Adviser 10-Charity; Clinic, WinS, RCY & Science Coord.');
  PERFORM pg_temp.add_load_t2('warren.clarito@deped.gov.ph',     'HGP-11',      11, 'ASSH',        0,   'Class Adviser 11-ASSH; BKD & BSP Coord.');
  PERFORM pg_temp.add_load_t2('fe.joseph@deped.gov.ph',          'HGP-11',      11, 'TechPro ICT', 0,   'Class Adviser 11-TechPro ICT; SNED, GSP & ADM Coord.');
  PERFORM pg_temp.add_load_t2('maesheila.lastomen@deped.gov.ph', 'PERDEV-12',   12, 'HUMSS',       0,   'Class Adviser 12-HUMSS; Sports Coordinator');
  PERFORM pg_temp.add_load_t2('famelarose.malalis@deped.gov.ph', 'HGP-12',      12, 'ICT',         0,   'Class Adviser 12-ICT; Arts Club & Career Advocate');
  PERFORM pg_temp.add_load_t2('anthonyriel.diango@deped.gov.ph', 'PROGJAVA-12', 12, 'ICT',         300, 'School ICT Coordinator (5 hrs/wk ancillary credit)');
END $$;

-- Plot exact Term 2 timetable matching the Excel Class Program across all 10 sections
DO $$
DECLARE
  M_F  TEXT[] := ARRAY['Monday','Tuesday','Wednesday','Thursday','Friday'];
  M_TH TEXT[] := ARRAY['Monday','Tuesday','Wednesday','Thursday'];
  TU_F TEXT[] := ARRAY['Tuesday','Wednesday','Thursday','Friday'];
BEGIN
  -- =========================================================================
  -- 1. GRADE 7 - PEACE
  -- =========================================================================
  PERFORM pg_temp.add_slot_t2('maryjane.baluma@deped.gov.ph',    'HGP-7',       7, 'Peace', 1, ARRAY['Monday']);
  PERFORM pg_temp.add_slot_t2('maryjane.baluma@deped.gov.ph',    'FIL-7',       7, 'Peace', 1, TU_F);
  PERFORM pg_temp.add_slot_t2('florenda.calotes@deped.gov.ph',   'ENG-7',       7, 'Peace', 2, M_TH);
  PERFORM pg_temp.add_slot_t2('florenda.calotes@deped.gov.ph',   'REM-ENG-7',   7, 'Peace', 2, ARRAY['Friday']);
  PERFORM pg_temp.add_slot_t2('necris.tiedra@deped.gov.ph',      'MATH-7',      7, 'Peace', 3, M_TH);
  PERFORM pg_temp.add_slot_t2('famelarose.malalis@deped.gov.ph', 'ARAL-MATH-7', 7, 'Peace', 3, ARRAY['Friday']);
  PERFORM pg_temp.add_slot_t2('rheljan.casino@deped.gov.ph',     'SCI-7',       7, 'Peace', 4, ARRAY['Monday','Tuesday','Wednesday','Friday']);
  PERFORM pg_temp.add_slot_t2('necris.tiedra@deped.gov.ph',      'REM-MATH-7',  7, 'Peace', 4, ARRAY['Thursday']);
  -- Afternoon (50m each)
  PERFORM pg_temp.add_slot_t2('maesheila.lastomen@deped.gov.ph', 'MAPEH-7',     7, 'Peace', 6, ARRAY['Monday','Tuesday','Wednesday','Friday']);
  PERFORM pg_temp.add_slot_t2('gerry.cahiles@deped.gov.ph',      'ARAL-READ-7', 7, 'Peace', 6, ARRAY['Thursday']);
  PERFORM pg_temp.add_slot_t2('ruthlyn.solis@deped.gov.ph',      'TLE-7',       7, 'Peace', 7, ARRAY['Monday','Tuesday','Thursday','Friday']);
  PERFORM pg_temp.add_slot_t2('gerard.aranas@deped.gov.ph',      'ESP-7',       7, 'Peace', 7, ARRAY['Wednesday']);
  PERFORM pg_temp.add_slot_t2('gerard.aranas@deped.gov.ph',      'AP-7',        7, 'Peace', 8, ARRAY['Monday','Tuesday','Thursday','Friday']);
  PERFORM pg_temp.add_slot_t2(NULL,                              'REL-7',       7, 'Peace', 8, ARRAY['Wednesday'], 'F. Narisma');
  PERFORM pg_temp.add_slot_t2('gerard.aranas@deped.gov.ph',      'ESP-7',       7, 'Peace', 9, ARRAY['Monday','Tuesday','Thursday','Friday']);
  PERFORM pg_temp.add_slot_t2('gerry.cahiles@deped.gov.ph',      'ARAL-READ-7', 7, 'Peace', 9, ARRAY['Wednesday']);

  -- =========================================================================
  -- 2. GRADE 8 - FAITH
  -- =========================================================================
  PERFORM pg_temp.add_slot_t2('renalyn.pujadas@deped.gov.ph',    'HGP-8',       8, 'Faith', 1, ARRAY['Monday']);
  PERFORM pg_temp.add_slot_t2('renalyn.pujadas@deped.gov.ph',    'TLE-8',       8, 'Faith', 1, TU_F);
  PERFORM pg_temp.add_slot_t2('fe.joseph@deped.gov.ph',          'MATH-8',      8, 'Faith', 2, M_TH);
  PERFORM pg_temp.add_slot_t2('liza.cruspero@deped.gov.ph',      'REM-ENG-8',   8, 'Faith', 2, ARRAY['Friday']);
  PERFORM pg_temp.add_slot_t2('rheljan.casino@deped.gov.ph',     'SCI-8',       8, 'Faith', 3, M_TH);
  PERFORM pg_temp.add_slot_t2('necris.tiedra@deped.gov.ph',      'REM-MATH-8',  8, 'Faith', 3, ARRAY['Friday']);
  PERFORM pg_temp.add_slot_t2('florenda.calotes@deped.gov.ph',   'ENG-8',       8, 'Faith', 4, M_TH);
  PERFORM pg_temp.add_slot_t2('gerard.aranas@deped.gov.ph',      'ARAL-READ-8', 8, 'Faith', 4, ARRAY['Friday']);
  -- Afternoon (50m each)
  PERFORM pg_temp.add_slot_t2('gerard.aranas@deped.gov.ph',      'ESP-8',       8, 'Faith', 6, M_F);
  PERFORM pg_temp.add_slot_t2('gerry.cahiles@deped.gov.ph',      'AP-8',        8, 'Faith', 7, M_TH);
  PERFORM pg_temp.add_slot_t2('gerard.aranas@deped.gov.ph',      'ARAL-READ-8', 8, 'Faith', 7, ARRAY['Friday']);
  PERFORM pg_temp.add_slot_t2('warren.clarito@deped.gov.ph',     'FIL-8',       8, 'Faith', 8, ARRAY['Monday','Tuesday','Wednesday','Friday']);
  PERFORM pg_temp.add_slot_t2('necris.tiedra@deped.gov.ph',      'ARAL-MATH-8', 8, 'Faith', 8, ARRAY['Thursday']);
  PERFORM pg_temp.add_slot_t2('nova.fuentes@deped.gov.ph',       'MAPEH-8',     8, 'Faith', 9, ARRAY['Monday','Tuesday','Thursday','Friday']);
  PERFORM pg_temp.add_slot_t2(NULL,                              'REL-8',       8, 'Faith', 9, ARRAY['Wednesday'], 'F. Narisma');

  -- =========================================================================
  -- 3. GRADE 8 - LOVE
  -- =========================================================================
  PERFORM pg_temp.add_slot_t2('florenda.calotes@deped.gov.ph',   'HGP-8',       8, 'Love', 1, ARRAY['Monday']);
  PERFORM pg_temp.add_slot_t2('florenda.calotes@deped.gov.ph',   'ENG-8',       8, 'Love', 1, TU_F);
  PERFORM pg_temp.add_slot_t2('rheljan.casino@deped.gov.ph',     'SCI-8',       8, 'Love', 2, ARRAY['Monday','Tuesday','Thursday','Friday']);
  PERFORM pg_temp.add_slot_t2('necris.tiedra@deped.gov.ph',      'ARAL-MATH-8', 8, 'Love', 2, ARRAY['Wednesday']);
  PERFORM pg_temp.add_slot_t2('gerard.aranas@deped.gov.ph',      'ESP-8',       8, 'Love', 3, M_TH);
  PERFORM pg_temp.add_slot_t2('warren.clarito@deped.gov.ph',     'ARAL-READ-8', 8, 'Love', 3, ARRAY['Friday']);
  PERFORM pg_temp.add_slot_t2('fe.joseph@deped.gov.ph',          'MATH-8',      8, 'Love', 4, M_TH);
  PERFORM pg_temp.add_slot_t2('necris.tiedra@deped.gov.ph',      'REM-MATH-8',  8, 'Love', 4, ARRAY['Friday']);
  -- Afternoon (50m each)
  PERFORM pg_temp.add_slot_t2('nova.fuentes@deped.gov.ph',       'MAPEH-8',     8, 'Love', 6, ARRAY['Monday','Tuesday','Thursday','Friday']);
  PERFORM pg_temp.add_slot_t2('liza.cruspero@deped.gov.ph',      'REM-ENG-8',   8, 'Love', 6, ARRAY['Wednesday']);
  PERFORM pg_temp.add_slot_t2('warren.clarito@deped.gov.ph',     'FIL-8',       8, 'Love', 7, ARRAY['Monday','Tuesday','Thursday','Friday']);
  PERFORM pg_temp.add_slot_t2(NULL,                              'REL-8',       8, 'Love', 7, ARRAY['Wednesday'], 'F. Narisma');
  PERFORM pg_temp.add_slot_t2('gerry.cahiles@deped.gov.ph',      'AP-8',        8, 'Love', 8, ARRAY['Monday','Tuesday','Wednesday','Friday']);
  PERFORM pg_temp.add_slot_t2('warren.clarito@deped.gov.ph',     'ARAL-READ-8', 8, 'Love', 8, ARRAY['Thursday']);
  PERFORM pg_temp.add_slot_t2('renalyn.pujadas@deped.gov.ph',    'TLE-8',       8, 'Love', 9, ARRAY['Monday','Tuesday','Thursday','Friday']);

  -- =========================================================================
  -- 4. GRADE 9 - HONESTY
  -- =========================================================================
  PERFORM pg_temp.add_slot_t2('nova.fuentes@deped.gov.ph',       'HGP-9',       9, 'Honesty', 1, ARRAY['Monday']);
  PERFORM pg_temp.add_slot_t2('nova.fuentes@deped.gov.ph',       'MAPEH-9',     9, 'Honesty', 1, TU_F);
  PERFORM pg_temp.add_slot_t2('juliet.lodripas@deped.gov.ph',    'MATH-9',      9, 'Honesty', 2, M_TH);
  PERFORM pg_temp.add_slot_t2('gerry.cahiles@deped.gov.ph',      'ARAL-READ-9', 9, 'Honesty', 2, ARRAY['Friday']);
  PERFORM pg_temp.add_slot_t2('liza.cruspero@deped.gov.ph',      'ENG-9',       9, 'Honesty', 3, M_TH);
  PERFORM pg_temp.add_slot_t2('liza.cruspero@deped.gov.ph',      'REM-ENG-9',   9, 'Honesty', 3, ARRAY['Friday']);
  PERFORM pg_temp.add_slot_t2('reah.ong@deped.gov.ph',           'SCI-9',       9, 'Honesty', 4, ARRAY['Monday','Wednesday','Thursday','Friday']);
  PERFORM pg_temp.add_slot_t2('necris.tiedra@deped.gov.ph',      'REM-MATH-9',  9, 'Honesty', 4, ARRAY['Tuesday']);
  -- Afternoon (50m each)
  PERFORM pg_temp.add_slot_t2('rayalbert.albaran@deped.gov.ph',  'ESP-9',       9, 'Honesty', 6, M_F);
  PERFORM pg_temp.add_slot_t2('maryjane.baluma@deped.gov.ph',    'FIL-9',       9, 'Honesty', 7, ARRAY['Monday','Wednesday','Thursday','Friday']);
  PERFORM pg_temp.add_slot_t2(NULL,                              'REL-9',       9, 'Honesty', 7, ARRAY['Tuesday'], 'F. Narisma');
  PERFORM pg_temp.add_slot_t2('renalyn.pujadas@deped.gov.ph',    'TLE-9',       9, 'Honesty', 8, ARRAY['Monday','Tuesday','Wednesday','Friday']);
  PERFORM pg_temp.add_slot_t2('gerry.cahiles@deped.gov.ph',      'ARAL-READ-9', 9, 'Honesty', 8, ARRAY['Thursday']);
  PERFORM pg_temp.add_slot_t2('gerry.cahiles@deped.gov.ph',      'AP-9',        9, 'Honesty', 9, ARRAY['Monday','Tuesday','Thursday','Friday']);
  PERFORM pg_temp.add_slot_t2('dellie.vigonte@deped.gov.ph',     'ARAL-MATH-9', 9, 'Honesty', 9, ARRAY['Wednesday']);

  -- =========================================================================
  -- 5. GRADE 9 - PATIENCE
  -- =========================================================================
  PERFORM pg_temp.add_slot_t2('rayalbert.albaran@deped.gov.ph',  'HGP-9',       9, 'Patience', 1, ARRAY['Monday']);
  PERFORM pg_temp.add_slot_t2('rayalbert.albaran@deped.gov.ph',  'ESP-9',       9, 'Patience', 1, TU_F);
  PERFORM pg_temp.add_slot_t2('reah.ong@deped.gov.ph',           'SCI-9',       9, 'Patience', 2, ARRAY['Monday','Wednesday','Thursday','Friday']);
  PERFORM pg_temp.add_slot_t2('necris.tiedra@deped.gov.ph',      'REM-MATH-9',  9, 'Patience', 2, ARRAY['Tuesday']);
  PERFORM pg_temp.add_slot_t2('juliet.lodripas@deped.gov.ph',    'MATH-9',      9, 'Patience', 3, M_TH);
  PERFORM pg_temp.add_slot_t2('rheljan.casino@deped.gov.ph',     'ARAL-READ-9', 9, 'Patience', 3, ARRAY['Friday']);
  PERFORM pg_temp.add_slot_t2('liza.cruspero@deped.gov.ph',      'ENG-9',       9, 'Patience', 4, M_TH);
  PERFORM pg_temp.add_slot_t2('liza.cruspero@deped.gov.ph',      'REM-ENG-9',   9, 'Patience', 4, ARRAY['Friday']);
  -- Afternoon (50m each)
  PERFORM pg_temp.add_slot_t2('gerry.cahiles@deped.gov.ph',      'AP-9',        9, 'Patience', 6, ARRAY['Monday','Tuesday','Wednesday','Friday']);
  PERFORM pg_temp.add_slot_t2('dellie.vigonte@deped.gov.ph',     'ARAL-MATH-9', 9, 'Patience', 6, ARRAY['Thursday']);
  PERFORM pg_temp.add_slot_t2('renalyn.pujadas@deped.gov.ph',    'TLE-9',       9, 'Patience', 7, ARRAY['Monday','Tuesday','Thursday','Friday']);
  PERFORM pg_temp.add_slot_t2('rheljan.casino@deped.gov.ph',     'ARAL-READ-9', 9, 'Patience', 7, ARRAY['Wednesday']);
  PERFORM pg_temp.add_slot_t2('nova.fuentes@deped.gov.ph',       'MAPEH-9',     9, 'Patience', 8, ARRAY['Monday','Wednesday','Thursday','Friday']);
  PERFORM pg_temp.add_slot_t2(NULL,                              'REL-9',       9, 'Patience', 8, ARRAY['Tuesday'], 'F. Narisma');
  PERFORM pg_temp.add_slot_t2('maryjane.baluma@deped.gov.ph',    'FIL-9',       9, 'Patience', 9, ARRAY['Monday','Tuesday','Thursday','Friday']);

  -- =========================================================================
  -- 6. GRADE 10 - CHARITY
  -- =========================================================================
  PERFORM pg_temp.add_slot_t2('reah.ong@deped.gov.ph',           'HGP-10',       10, 'Charity', 1, ARRAY['Monday']);
  PERFORM pg_temp.add_slot_t2('reah.ong@deped.gov.ph',           'SCI-10',       10, 'Charity', 1, TU_F);
  PERFORM pg_temp.add_slot_t2('maurine.dumanig@deped.gov.ph',    'MATH-10',      10, 'Charity', 2, M_TH);
  PERFORM pg_temp.add_slot_t2('maurine.dumanig@deped.gov.ph',    'REM-MATH-10',  10, 'Charity', 2, ARRAY['Friday']);
  PERFORM pg_temp.add_slot_t2('florenda.calotes@deped.gov.ph',   'TLE-10',       10, 'Charity', 3, M_TH);
  PERFORM pg_temp.add_slot_t2('gerard.aranas@deped.gov.ph',      'ARAL-READ-10', 10, 'Charity', 3, ARRAY['Friday']);
  PERFORM pg_temp.add_slot_t2('dellie.vigonte@deped.gov.ph',     'ENG-10',       10, 'Charity', 4, M_TH);
  PERFORM pg_temp.add_slot_t2('juliet.lodripas@deped.gov.ph',    'ARAL-MATH-10', 10, 'Charity', 4, ARRAY['Friday']);
  -- Afternoon (50m each)
  PERFORM pg_temp.add_slot_t2('maryjane.baluma@deped.gov.ph',    'FIL-10',       10, 'Charity', 6, ARRAY['Monday','Wednesday','Thursday','Friday']);
  PERFORM pg_temp.add_slot_t2(NULL,                              'REL-10',       10, 'Charity', 6, ARRAY['Tuesday'], 'F. Narisma');
  PERFORM pg_temp.add_slot_t2('rayalbert.albaran@deped.gov.ph',  'ESP-10',       10, 'Charity', 7, M_TH);
  PERFORM pg_temp.add_slot_t2('gerry.cahiles@deped.gov.ph',      'CAT-10',       10, 'Charity', 7, ARRAY['Friday']);
  PERFORM pg_temp.add_slot_t2('rayalbert.albaran@deped.gov.ph',  'AP-10',        10, 'Charity', 8, ARRAY['Monday','Tuesday','Thursday','Friday']);
  PERFORM pg_temp.add_slot_t2('gerard.aranas@deped.gov.ph',      'ARAL-READ-10', 10, 'Charity', 8, ARRAY['Wednesday']);
  PERFORM pg_temp.add_slot_t2('maesheila.lastomen@deped.gov.ph', 'MAPEH-10',     10, 'Charity', 9, M_TH);
  PERFORM pg_temp.add_slot_t2('warren.clarito@deped.gov.ph',     'REM-ENG-10',   10, 'Charity', 9, ARRAY['Friday']);

  -- =========================================================================
  -- 7. GRADE 11 - ASSH
  -- =========================================================================
  PERFORM pg_temp.add_slot_t2('warren.clarito@deped.gov.ph',     'MABISANGKOM-11', 11, 'ASSH', 1, ARRAY['Monday','Tuesday','Wednesday']);
  PERFORM pg_temp.add_slot_t2('dellie.vigonte@deped.gov.ph',     'EFFCOMM-11',     11, 'ASSH', 1, ARRAY['Thursday','Friday']);
  PERFORM pg_temp.add_slot_t2('wiltfrancis.pamaong@deped.gov.ph','KASAYSAYAN-11',  11, 'ASSH', 2, M_F);
  PERFORM pg_temp.add_slot_t2('wiltfrancis.pamaong@deped.gov.ph','PHILO-11',       11, 'ASSH', 3, M_F);
  PERFORM pg_temp.add_slot_t2('wiltfrancis.pamaong@deped.gov.ph','PHILO-11',       11, 'ASSH', 4, ARRAY['Monday','Thursday','Friday']);
  PERFORM pg_temp.add_slot_t2('famelarose.malalis@deped.gov.ph', 'ARAL-MATH-11',   11, 'ASSH', 4, ARRAY['Tuesday','Wednesday']);
  PERFORM pg_temp.add_slot_t2('fe.joseph@deped.gov.ph',          'GENMATH-11',     11, 'ASSH', 6, M_F);
  PERFORM pg_temp.add_slot_t2('juliet.lodripas@deped.gov.ph',    'LIFECAREER-11',  11, 'ASSH', 7, M_F);
  PERFORM pg_temp.add_slot_t2('rheljan.casino@deped.gov.ph',     'GENSCI-11',      11, 'ASSH', 8, M_F);
  PERFORM pg_temp.add_slot_t2('warren.clarito@deped.gov.ph',     'HGP-11',         11, 'ASSH', 10, ARRAY['Monday']);
  -- Resolved R. Solis Thu-Fri 4-5 PM double-booking by assigning class adviser Warren Clarito to 11-ASSH ARAL Reading
  PERFORM pg_temp.add_slot_t2('warren.clarito@deped.gov.ph',     'ARAL-READ-11',   11, 'ASSH', 10, ARRAY['Thursday','Friday']);

  -- =========================================================================
  -- 8. GRADE 11 - TECHPRO ICT
  -- =========================================================================
  PERFORM pg_temp.add_slot_t2('fe.joseph@deped.gov.ph',          'GENMATH-11',     11, 'TechPro ICT', 1, M_F);
  PERFORM pg_temp.add_slot_t2('dellie.vigonte@deped.gov.ph',     'EFFCOMM-11',     11, 'TechPro ICT', 2, ARRAY['Monday','Tuesday','Wednesday']);
  PERFORM pg_temp.add_slot_t2('warren.clarito@deped.gov.ph',     'MABISANGKOM-11', 11, 'TechPro ICT', 2, ARRAY['Thursday','Friday']);
  PERFORM pg_temp.add_slot_t2('anthonyriel.diango@deped.gov.ph', 'PROGNET-11',     11, 'TechPro ICT', 3, M_F);
  PERFORM pg_temp.add_slot_t2('anthonyriel.diango@deped.gov.ph', 'PROGNET-11',     11, 'TechPro ICT', 4, M_F);
  PERFORM pg_temp.add_slot_t2('famelarose.malalis@deped.gov.ph', 'GENSCI-11',      11, 'TechPro ICT', 6, M_F);
  PERFORM pg_temp.add_slot_t2('wiltfrancis.pamaong@deped.gov.ph','KASAYSAYAN-11',  11, 'TechPro ICT', 7, M_F);
  PERFORM pg_temp.add_slot_t2('juliet.lodripas@deped.gov.ph',    'LIFECAREER-11',  11, 'TechPro ICT', 8, M_F);
  PERFORM pg_temp.add_slot_t2('reah.ong@deped.gov.ph',           'ARAL-READ-11',   11, 'TechPro ICT', 10, ARRAY['Monday']);
  PERFORM pg_temp.add_slot_t2('rheljan.casino@deped.gov.ph',     'ARAL-READ-11',   11, 'TechPro ICT', 10, ARRAY['Tuesday']);
  PERFORM pg_temp.add_slot_t2('necris.tiedra@deped.gov.ph',      'ARAL-MATH-11',   11, 'TechPro ICT', 10, ARRAY['Wednesday','Thursday']);
  PERFORM pg_temp.add_slot_t2('fe.joseph@deped.gov.ph',          'HGP-11',         11, 'TechPro ICT', 10, ARRAY['Friday']);

  -- =========================================================================
  -- 9. GRADE 12 - HUMSS (includes 12:30 - 1:00 PM HOPE 3 Slot 11)
  -- =========================================================================
  PERFORM pg_temp.add_slot_t2('maesheila.lastomen@deped.gov.ph', 'PERDEV-12',         12, 'HUMSS', 1, M_F);
  PERFORM pg_temp.add_slot_t2('maesheila.lastomen@deped.gov.ph', 'PERDEV-12',         12, 'HUMSS', 2, ARRAY['Monday','Tuesday','Wednesday']);
  PERFORM pg_temp.add_slot_t2('dellie.vigonte@deped.gov.ph',     'PHILO-12',          12, 'HUMSS', 2, ARRAY['Thursday','Friday']);
  PERFORM pg_temp.add_slot_t2('dellie.vigonte@deped.gov.ph',     'PHILO-12',          12, 'HUMSS', 3, ARRAY['Monday','Tuesday','Wednesday','Friday']);
  PERFORM pg_temp.add_slot_t2('ruthlyn.solis@deped.gov.ph',      'EMPTECH-12',        12, 'HUMSS', 3, ARRAY['Thursday']);
  PERFORM pg_temp.add_slot_t2('ruthlyn.solis@deped.gov.ph',      'EMPTECH-12',        12, 'HUMSS', 4, M_F);
  PERFORM pg_temp.add_slot_t2('necris.tiedra@deped.gov.ph',      'HOPE3-12',          12, 'HUMSS', 11, M_TH);
  PERFORM pg_temp.add_slot_t2('dellie.vigonte@deped.gov.ph',     'PHILO-12',          12, 'HUMSS', 6, ARRAY['Monday','Wednesday']);
  PERFORM pg_temp.add_slot_t2('liza.cruspero@deped.gov.ph',      'CREATIVENONFIC-12', 12, 'HUMSS', 6, ARRAY['Tuesday','Thursday','Friday']);
  PERFORM pg_temp.add_slot_t2('liza.cruspero@deped.gov.ph',      'CREATIVENONFIC-12', 12, 'HUMSS', 7, M_F);
  PERFORM pg_temp.add_slot_t2('maurine.dumanig@deped.gov.ph',    'III-12',            12, 'HUMSS', 8, M_F);
  PERFORM pg_temp.add_slot_t2('maurine.dumanig@deped.gov.ph',    'III-12',            12, 'HUMSS', 10, ARRAY['Monday','Tuesday','Wednesday']);
  PERFORM pg_temp.add_slot_t2('ruthlyn.solis@deped.gov.ph',      'EMPTECH-12',        12, 'HUMSS', 10, ARRAY['Thursday','Friday']);

  -- =========================================================================
  -- 10. GRADE 12 - ICT
  -- =========================================================================
  PERFORM pg_temp.add_slot_t2('famelarose.malalis@deped.gov.ph', 'PERDEV-12',    12, 'ICT', 1, M_F);
  PERFORM pg_temp.add_slot_t2('famelarose.malalis@deped.gov.ph', 'PERDEV-12',    12, 'ICT', 2, ARRAY['Monday','Tuesday','Wednesday']);
  PERFORM pg_temp.add_slot_t2('ruthlyn.solis@deped.gov.ph',      'EMPTECH-12',   12, 'ICT', 2, ARRAY['Thursday','Friday']);
  PERFORM pg_temp.add_slot_t2('maurine.dumanig@deped.gov.ph',    'III-12',       12, 'ICT', 3, ARRAY['Monday','Tuesday','Thursday']);
  PERFORM pg_temp.add_slot_t2('ruthlyn.solis@deped.gov.ph',      'EMPTECH-12',   12, 'ICT', 3, ARRAY['Wednesday','Friday']);
  PERFORM pg_temp.add_slot_t2('maurine.dumanig@deped.gov.ph',    'III-12',       12, 'ICT', 4, M_F);
  PERFORM pg_temp.add_slot_t2('anthonyriel.diango@deped.gov.ph', 'PROGJAVA-12',  12, 'ICT', 6, M_F);
  PERFORM pg_temp.add_slot_t2('anthonyriel.diango@deped.gov.ph', 'PROGJAVA-12',  12, 'ICT', 7, M_F);
  PERFORM pg_temp.add_slot_t2('ruthlyn.solis@deped.gov.ph',      'EMPTECH-12',   12, 'ICT', 8, ARRAY['Monday']);
  PERFORM pg_temp.add_slot_t2('anthonyriel.diango@deped.gov.ph', 'PROGJAVA-12',  12, 'ICT', 8, TU_F);
  PERFORM pg_temp.add_slot_t2('ruthlyn.solis@deped.gov.ph',      'EMPTECH-12',   12, 'ICT', 10, ARRAY['Monday','Tuesday','Wednesday']);
  PERFORM pg_temp.add_slot_t2('gerry.cahiles@deped.gov.ph',      'ARAL-READ-12', 12, 'ICT', 10, ARRAY['Thursday']);
  PERFORM pg_temp.add_slot_t2('famelarose.malalis@deped.gov.ph', 'HGP-12',       12, 'ICT', 10, ARRAY['Friday']);
END $$;

-- 7. GUARANTEE ALL TERM 2 LOADS EQUAL PLOTTED SCHEDULE TOTALS
DO $$
DECLARE
  v_term2_id UUID;
  r RECORD;
BEGIN
  SELECT id INTO v_term2_id FROM public.academic_terms WHERE school_year = '2026-2027' AND term_number = 2;
  FOR r IN SELECT id FROM public.teacher_subject_loads WHERE term_id = v_term2_id LOOP
    PERFORM public.recalculate_load_teaching_minutes(r.id);
  END LOOP;
END $$;

-- 8. SYNC TERM 2 SECTION_SUBJECTS (CLASS MANAGEMENT, E-CLASS RECORDS & SF9) TO MATCH TERM 2 LOADS
DO $$
DECLARE
  v_term2_id UUID;
BEGIN
  SELECT id INTO v_term2_id FROM public.academic_terms WHERE school_year = '2026-2027' AND term_number = 2;

  -- Remove Term 2 section_subjects no longer present in Term 2 loads (e.g. omitted 12-HUMSS DIASS/WORLDREL/HGP or old ARAL codes)
  DELETE FROM public.section_subjects ss
  WHERE ss.term_id = v_term2_id
    AND NOT EXISTS (
      SELECT 1 FROM public.teacher_subject_loads tsl
      WHERE tsl.term_id = v_term2_id
        AND tsl.section_id = ss.section_id
        AND tsl.subject_id = ss.subject_id
    );

  -- Upsert current Term 2 teacher_subject_loads into section_subjects with updated teachers
  INSERT INTO public.section_subjects (
    term_id, section_id, subject_id, teacher_id, curriculum_type, units, sort_order
  )
  SELECT DISTINCT ON (tsl.section_id, tsl.subject_id)
    tsl.term_id,
    tsl.section_id,
    tsl.subject_id,
    tsl.teacher_id,
    CASE
      WHEN sec.grade_level <= 10 THEN
        CASE
          WHEN UPPER(sub.subject_code) LIKE 'MAPEH%' OR UPPER(sub.subject_code) LIKE 'TLE%' THEN 'MATATAG JHS Skill-Based'
          ELSE 'MATATAG JHS'
        END
      WHEN sec.grade_level = 11 THEN
        CASE
          WHEN sub.category = 'TVL' OR UPPER(COALESCE(sub.track_strand, '')) LIKE '%TECHPRO%' THEN 'SSHS TechPro Elective'
          WHEN sub.category = 'Specialized' THEN 'SSHS Academic Elective'
          ELSE 'SSHS Core'
        END
      ELSE
        CASE
          WHEN sub.category = 'TVL' THEN 'Old SHS TVL'
          WHEN UPPER(sub.subject_name) LIKE '%IMMERSION%' OR UPPER(sub.subject_name) LIKE '%PRACTICAL RESEARCH%' OR UPPER(sub.subject_name) LIKE '%INQUIRIES%' THEN 'Old SHS Immersion'
          WHEN sub.category = 'Specialized' THEN 'Old SHS Specialized'
          WHEN sub.category = 'Applied' THEN 'Old SHS Applied'
          ELSE 'Old SHS Core'
        END
    END AS curriculum_type,
    CASE
      WHEN sec.grade_level = 11 AND sub.category = 'Core' AND UPPER(sub.subject_code) NOT LIKE 'HGP%' AND UPPER(sub.subject_code) NOT LIKE 'ARAL%' THEN 2.0
      WHEN sec.grade_level = 11 AND (sub.category = 'TVL' OR UPPER(COALESCE(sub.track_strand, '')) LIKE '%TECHPRO%') THEN 4.0
      WHEN sec.grade_level = 11 AND sub.category = 'Specialized' THEN 3.0
      ELSE 1.0
    END AS units,
    ROW_NUMBER() OVER (PARTITION BY tsl.section_id ORDER BY sub.category, sub.subject_name)
  FROM public.teacher_subject_loads tsl
  JOIN public.sections sec ON sec.id = tsl.section_id
  JOIN public.subjects_catalog sub ON sub.id = tsl.subject_id
  WHERE tsl.term_id = v_term2_id
  ORDER BY tsl.section_id, tsl.subject_id, tsl.teaching_minutes_weekly DESC
  ON CONFLICT (section_id, subject_id) DO UPDATE
  SET teacher_id = EXCLUDED.teacher_id,
      curriculum_type = EXCLUDED.curriculum_type,
      units = EXCLUDED.units;
END $$;

DROP FUNCTION IF EXISTS pg_temp.add_slot_t2(TEXT, TEXT, INT, TEXT, INT, TEXT[], TEXT);
DROP FUNCTION IF EXISTS pg_temp.add_load_t2(TEXT, TEXT, INT, TEXT, INT, TEXT);
