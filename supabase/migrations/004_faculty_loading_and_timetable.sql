-- ============================================================================
-- e-FTNHS MIGRATION 004: Faculty Loading, Conflict-Free Timetable & SF7 Engine
-- Target DB: https://ndwwoxsgcegdqiyoipvj.supabase.co
-- Safety: Preserves all existing tables and auth schema.
-- ============================================================================

-- 1. SUBJECTS CATALOG
CREATE TABLE IF NOT EXISTS public.subjects_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_code TEXT NOT NULL UNIQUE,
  subject_name TEXT NOT NULL,
  grade_level INT NOT NULL CHECK (grade_level BETWEEN 7 AND 12),
  track_strand TEXT, -- For Senior High School (e.g., 'STEM', 'TVL-ICT', 'HUMSS')
  category TEXT NOT NULL CHECK (category IN ('Core', 'Applied', 'Specialized', 'TVL')),
  minutes_per_week INT NOT NULL DEFAULT 240,
  requires_lab BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. ROOMS & SPECIALIZED LABORATORIES CATALOG
CREATE TABLE IF NOT EXISTS public.rooms_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_number TEXT NOT NULL UNIQUE,
  room_name TEXT NOT NULL,
  room_type TEXT NOT NULL CHECK (room_type IN ('Standard Classroom', 'Science Laboratory', 'Computer Laboratory', 'TVL Workshop', 'Covered Court')),
  capacity INT DEFAULT 45,
  is_specialized BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. SECTIONS DIRECTORY
CREATE TABLE IF NOT EXISTS public.sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  term_id UUID REFERENCES public.academic_terms(id) ON DELETE CASCADE,
  grade_level INT NOT NULL CHECK (grade_level BETWEEN 7 AND 12),
  section_name TEXT NOT NULL,
  adviser_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  room_id UUID REFERENCES public.rooms_catalog(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_term_grade_section UNIQUE (term_id, grade_level, section_name)
);

-- 4. BELL SCHEDULE / TIME SLOTS
CREATE TABLE IF NOT EXISTS public.time_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_number INT NOT NULL,
  slot_label TEXT NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  duration_minutes INT NOT NULL,
  slot_type TEXT NOT NULL CHECK (slot_type IN ('Academic', 'Flag Ceremony', 'Recess', 'Lunch', 'Homeroom')),
  sort_order INT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. TEACHER SUBJECT LOADS (MAGNA CARTA COMPLIANCE)
CREATE TABLE IF NOT EXISTS public.teacher_subject_loads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  term_id UUID REFERENCES public.academic_terms(id) ON DELETE CASCADE NOT NULL,
  teacher_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  subject_id UUID REFERENCES public.subjects_catalog(id) ON DELETE CASCADE NOT NULL,
  section_id UUID REFERENCES public.sections(id) ON DELETE CASCADE NOT NULL,
  teaching_minutes_weekly INT NOT NULL DEFAULT 240,
  ancillary_minutes_weekly INT NOT NULL DEFAULT 0,
  ancillary_description TEXT,
  status TEXT DEFAULT 'Assigned' CHECK (status IN ('Draft', 'Assigned', 'Locked')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_term_teacher_subject_section UNIQUE (term_id, teacher_id, subject_id, section_id)
);

-- 6. SCHEDULE ENTRIES (TIMETABLE GRID)
CREATE TABLE IF NOT EXISTS public.schedule_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  term_id UUID REFERENCES public.academic_terms(id) ON DELETE CASCADE NOT NULL,
  load_id UUID REFERENCES public.teacher_subject_loads(id) ON DELETE CASCADE NOT NULL,
  teacher_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  section_id UUID REFERENCES public.sections(id) ON DELETE CASCADE NOT NULL,
  subject_id UUID REFERENCES public.subjects_catalog(id) ON DELETE CASCADE NOT NULL,
  time_slot_id UUID REFERENCES public.time_slots(id) ON DELETE CASCADE NOT NULL,
  room_id UUID REFERENCES public.rooms_catalog(id) ON DELETE SET NULL,
  day_of_week TEXT NOT NULL CHECK (day_of_week IN ('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday')),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- HARD CONSTRAINTS ENFORCED AT DATABASE LEVEL:
  -- Constraint 1: Zero Teacher Collision (a teacher cannot teach 2 classes at the same slot)
  CONSTRAINT unique_teacher_day_slot UNIQUE (term_id, day_of_week, time_slot_id, teacher_id),
  -- Constraint 2: Zero Section Collision (a section cannot have 2 subjects at the same slot)
  CONSTRAINT unique_section_day_slot UNIQUE (term_id, day_of_week, time_slot_id, section_id)
);

-- Partial Unique Index for Rooms (Only when room_id is NOT NULL)
CREATE UNIQUE INDEX IF NOT EXISTS unique_room_day_slot_idx 
ON public.schedule_entries (term_id, day_of_week, time_slot_id, room_id) 
WHERE room_id IS NOT NULL;

-- 7. ENABLE ROW-LEVEL SECURITY (RLS)
ALTER TABLE public.subjects_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooms_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_subject_loads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedule_entries ENABLE ROW LEVEL SECURITY;

-- 8. RLS POLICIES

-- All authenticated users can read catalogs, loading, and timetables
CREATE POLICY "Allow authenticated read on subjects_catalog"
  ON public.subjects_catalog FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated read on rooms_catalog"
  ON public.rooms_catalog FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated read on sections"
  ON public.sections FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated read on time_slots"
  ON public.time_slots FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated read on teacher_subject_loads"
  ON public.teacher_subject_loads FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated read on schedule_entries"
  ON public.schedule_entries FOR SELECT
  TO authenticated
  USING (true);

-- Super Admin and School Head have full INSERT, UPDATE, DELETE permissions
CREATE POLICY "Admins manage subjects_catalog"
  ON public.subjects_catalog FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('Super Admin', 'School Head')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('Super Admin', 'School Head')
    )
  );

CREATE POLICY "Admins manage rooms_catalog"
  ON public.rooms_catalog FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('Super Admin', 'School Head')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('Super Admin', 'School Head')
    )
  );

CREATE POLICY "Admins manage sections"
  ON public.sections FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('Super Admin', 'School Head')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('Super Admin', 'School Head')
    )
  );

CREATE POLICY "Admins manage time_slots"
  ON public.time_slots FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('Super Admin', 'School Head')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('Super Admin', 'School Head')
    )
  );

CREATE POLICY "Admins manage teacher_subject_loads"
  ON public.teacher_subject_loads FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('Super Admin', 'School Head')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('Super Admin', 'School Head')
    )
  );

CREATE POLICY "Admins manage schedule_entries"
  ON public.schedule_entries FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('Super Admin', 'School Head')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('Super Admin', 'School Head')
    )
  );

-- 9. SEED CORE ACADEMIC CATALOGS
INSERT INTO public.subjects_catalog (subject_code, subject_name, grade_level, category, minutes_per_week, requires_lab)
VALUES
  ('ENG-7', 'English 7', 7, 'Core', 240, false),
  ('SCI-7', 'Science 7', 7, 'Core', 240, true),
  ('MATH-7', 'Mathematics 7', 7, 'Core', 240, false),
  ('FIL-7', 'Filipino 7', 7, 'Core', 240, false),
  ('AP-7', 'Araling Panlipunan 7', 7, 'Core', 180, false),
  ('MAPEH-7', 'Music, Arts, PE & Health 7', 7, 'Core', 240, false),
  ('TLE-7', 'Technology and Livelihood Education 7', 7, 'TVL', 240, true),
  ('ESP-7', 'Edukasyon sa Pagpapakatao 7', 7, 'Core', 120, false),

  ('ENG-8', 'English 8', 8, 'Core', 240, false),
  ('SCI-8', 'Science 8', 8, 'Core', 240, true),
  ('MATH-8', 'Mathematics 8', 8, 'Core', 240, false),
  ('FIL-8', 'Filipino 8', 8, 'Core', 240, false),

  ('ENG-9', 'English 9', 9, 'Core', 240, false),
  ('SCI-9', 'Science 9', 9, 'Core', 240, true),
  ('MATH-9', 'Mathematics 9', 9, 'Core', 240, false),
  ('FIL-9', 'Filipino 9', 9, 'Core', 240, false),

  ('ENG-10', 'English 10', 10, 'Core', 240, false),
  ('SCI-10', 'Science 10', 10, 'Core', 240, true),
  ('MATH-10', 'Mathematics 10', 10, 'Core', 240, false),
  ('FIL-10', 'Filipino 10', 10, 'Core', 240, false),

  ('GENMATH-11', 'General Mathematics', 11, 'Core', 240, false),
  ('ORALCOMM-11', 'Oral Communication in Context', 11, 'Core', 240, false),
  ('EMPTECH-11', 'Empowerment Technologies', 11, 'Applied', 240, true),
  ('UCSP-12', 'Understanding Culture, Society & Politics', 12, 'Core', 240, false),
  ('PRACRES-12', 'Practical Research 2', 12, 'Applied', 240, false)
ON CONFLICT (subject_code) DO NOTHING;

INSERT INTO public.rooms_catalog (room_number, room_name, room_type, capacity, is_specialized)
VALUES
  ('RM-101', 'Room 101 (G7 Academic Hall)', 'Standard Classroom', 45, false),
  ('RM-102', 'Room 102 (G8 Academic Hall)', 'Standard Classroom', 45, false),
  ('RM-201', 'Room 201 (G9 Academic Hall)', 'Standard Classroom', 45, false),
  ('RM-202', 'Room 202 (G10 Academic Hall)', 'Standard Classroom', 45, false),
  ('SCI-LAB', 'Integrated Science Laboratory', 'Science Laboratory', 50, true),
  ('COMP-LAB', 'Computer & ICT Innovation Hub', 'Computer Laboratory', 45, true),
  ('TVL-WORK', 'TVL Agri-Crop & Industrial Workshop', 'TVL Workshop', 40, true)
ON CONFLICT (room_number) DO NOTHING;

-- Standard 8-Period Bell Schedule
INSERT INTO public.time_slots (slot_number, slot_label, start_time, end_time, duration_minutes, slot_type, sort_order)
VALUES
  (0, 'Morning Assembly / Flag Ceremony', '07:15:00', '07:30:00', 15, 'Flag Ceremony', 1),
  (1, 'Period 1 (07:30 - 08:30 AM)', '07:30:00', '08:30:00', 60, 'Academic', 2),
  (2, 'Period 2 (08:30 - 09:30 AM)', '08:30:00', '09:30:00', 60, 'Academic', 3),
  (3, 'Recess & Wellness Break', '09:30:00', '09:50:00', 20, 'Recess', 4),
  (4, 'Period 3 (09:50 - 10:50 AM)', '09:50:00', '10:50:00', 60, 'Academic', 5),
  (5, 'Period 4 (10:50 - 11:50 AM)', '10:50:00', '11:50:00', 60, 'Academic', 6),
  (6, 'Lunch Break & Homeroom Guidance', '11:50:00', '13:00:00', 70, 'Lunch', 7),
  (7, 'Period 5 (01:00 - 02:00 PM)', '13:00:00', '14:00:00', 60, 'Academic', 8),
  (8, 'Period 6 (02:00 - 03:00 PM)', '14:00:00', '15:00:00', 60, 'Academic', 9),
  (9, 'Period 7 (03:00 - 04:00 PM)', '15:00:00', '16:00:00', 60, 'Academic', 10),
  (10, 'Period 8 (04:00 - 05:00 PM / Ancillary)', '16:00:00', '17:00:00', 60, 'Academic', 11)
ON CONFLICT DO NOTHING;
