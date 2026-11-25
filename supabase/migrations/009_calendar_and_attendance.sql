-- ============================================================================
-- e-FTNHS MIGRATION 009: Unified School Calendar & SF2 Daily Attendance Tracker
-- Target DB: https://ndwwoxsgcegdqiyoipvj.supabase.co
-- Safety: Preserves all existing tables and auth schema.
-- ============================================================================

-- 1. SCHOOL CALENDAR EVENTS
CREATE TABLE IF NOT EXISTS public.school_calendar_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    term_id UUID REFERENCES public.academic_terms(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    event_type TEXT NOT NULL CHECK (
        event_type IN (
            'Division Activity',
            'School Event',
            'DepEd Holiday',
            'Exam Period',
            'Submission Deadline',
            'Faculty Meeting'
        )
    ),
    target_audience TEXT NOT NULL DEFAULT 'All' CHECK (
        target_audience IN ('All', 'Teachers', 'Students', 'Junior High School', 'Senior High School')
    ),
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT valid_event_dates CHECK (end_date >= start_date)
);

-- 2. DAILY ATTENDANCE SESSIONS (PER SECTION ROLL-CALL)
CREATE TABLE IF NOT EXISTS public.daily_attendance_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    section_id UUID NOT NULL REFERENCES public.sections(id) ON DELETE CASCADE,
    attendance_date DATE NOT NULL,
    recorded_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    total_present INT NOT NULL DEFAULT 0,
    total_absent INT NOT NULL DEFAULT 0,
    total_tardy INT NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'Submitted' CHECK (status IN ('Draft', 'Submitted', 'Locked')),
    remarks TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_section_attendance_date UNIQUE (section_id, attendance_date)
);

-- 3. STUDENT DAILY ATTENDANCE (SF2 LOGS)
CREATE TABLE IF NOT EXISTS public.student_daily_attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES public.daily_attendance_sessions(id) ON DELETE CASCADE,
    student_name TEXT NOT NULL,
    student_lrn TEXT NOT NULL,
    gender TEXT NOT NULL CHECK (gender IN ('Male', 'Female')),
    status TEXT NOT NULL CHECK (status IN ('Present', 'Absent', 'Tardy')),
    remarks TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_session_student UNIQUE (session_id, student_lrn)
);

-- 4. PERFORMANCE INDEXES
CREATE INDEX IF NOT EXISTS idx_calendar_events_dates ON public.school_calendar_events(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_calendar_events_type ON public.school_calendar_events(event_type);
CREATE INDEX IF NOT EXISTS idx_attendance_sessions_section_date ON public.daily_attendance_sessions(section_id, attendance_date);
CREATE INDEX IF NOT EXISTS idx_student_attendance_session ON public.student_daily_attendance(session_id);
CREATE INDEX IF NOT EXISTS idx_student_attendance_lrn ON public.student_daily_attendance(student_lrn);

-- 5. ENABLE ROW-LEVEL SECURITY
ALTER TABLE public.school_calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_attendance_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_daily_attendance ENABLE ROW LEVEL SECURITY;

-- 6. RLS POLICIES FOR CALENDAR EVENTS
DROP POLICY IF EXISTS "calendar_events_select_policy" ON public.school_calendar_events;
CREATE POLICY "calendar_events_select_policy" ON public.school_calendar_events
    FOR SELECT TO authenticated
    USING (true);

DROP POLICY IF EXISTS "calendar_events_insert_policy" ON public.school_calendar_events;
CREATE POLICY "calendar_events_insert_policy" ON public.school_calendar_events
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role IN ('Super Admin', 'School Head')
        )
    );

DROP POLICY IF EXISTS "calendar_events_update_policy" ON public.school_calendar_events;
CREATE POLICY "calendar_events_update_policy" ON public.school_calendar_events
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role IN ('Super Admin', 'School Head')
        )
    );

DROP POLICY IF EXISTS "calendar_events_delete_policy" ON public.school_calendar_events;
CREATE POLICY "calendar_events_delete_policy" ON public.school_calendar_events
    FOR DELETE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role IN ('Super Admin', 'School Head')
        )
    );

-- 7. RLS POLICIES FOR DAILY ATTENDANCE SESSIONS
DROP POLICY IF EXISTS "attendance_sessions_select_policy" ON public.daily_attendance_sessions;
CREATE POLICY "attendance_sessions_select_policy" ON public.daily_attendance_sessions
    FOR SELECT TO authenticated
    USING (true);

DROP POLICY IF EXISTS "attendance_sessions_insert_policy" ON public.daily_attendance_sessions;
CREATE POLICY "attendance_sessions_insert_policy" ON public.daily_attendance_sessions
    FOR INSERT TO authenticated
    WITH CHECK (
        recorded_by = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role IN ('Super Admin', 'School Head')
        )
        OR EXISTS (
            SELECT 1 FROM public.sections 
            WHERE id = section_id AND adviser_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "attendance_sessions_update_policy" ON public.daily_attendance_sessions;
CREATE POLICY "attendance_sessions_update_policy" ON public.daily_attendance_sessions
    FOR UPDATE TO authenticated
    USING (
        recorded_by = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role IN ('Super Admin', 'School Head')
        )
        OR EXISTS (
            SELECT 1 FROM public.sections 
            WHERE id = section_id AND adviser_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "attendance_sessions_delete_policy" ON public.daily_attendance_sessions;
CREATE POLICY "attendance_sessions_delete_policy" ON public.daily_attendance_sessions
    FOR DELETE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role IN ('Super Admin', 'School Head')
        )
    );

-- 8. RLS POLICIES FOR STUDENT DAILY ATTENDANCE
DROP POLICY IF EXISTS "student_attendance_select_policy" ON public.student_daily_attendance;
CREATE POLICY "student_attendance_select_policy" ON public.student_daily_attendance
    FOR SELECT TO authenticated
    USING (true);

DROP POLICY IF EXISTS "student_attendance_insert_policy" ON public.student_daily_attendance;
CREATE POLICY "student_attendance_insert_policy" ON public.student_daily_attendance
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.daily_attendance_sessions das
            WHERE das.id = session_id
            AND (
                das.recorded_by = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM public.profiles 
                    WHERE id = auth.uid() AND role IN ('Super Admin', 'School Head')
                )
            )
        )
    );

DROP POLICY IF EXISTS "student_attendance_update_policy" ON public.student_daily_attendance;
CREATE POLICY "student_attendance_update_policy" ON public.student_daily_attendance
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.daily_attendance_sessions das
            WHERE das.id = session_id
            AND (
                das.recorded_by = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM public.profiles 
                    WHERE id = auth.uid() AND role IN ('Super Admin', 'School Head')
                )
            )
        )
    );
