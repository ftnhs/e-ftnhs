-- ============================================================================
-- e-FTNHS MIGRATION 008: Leave Application, Dynamic Class Relief Matrix & PDF Generator
-- Target DB: https://ndwwoxsgcegdqiyoipvj.supabase.co
-- Safety: Preserves all existing tables and auth schema.
-- ============================================================================

-- 1. LEAVE APPLICATIONS TABLE
CREATE TABLE IF NOT EXISTS public.leave_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    term_id UUID REFERENCES public.academic_terms(id) ON DELETE CASCADE,
    leave_type TEXT NOT NULL CHECK (
        leave_type IN (
            'Vacation Leave',
            'Mandatory/Forced Leave',
            'Sick Leave',
            'Maternity Leave',
            'Paternity Leave',
            'Special Privilege Leave',
            'Solo Parent Leave',
            'Study Leave',
            '10-Day VAWC Leave',
            'Rehabilitation Privilege',
            'Special Leave Benefits for Women',
            'Special Emergency Leave',
            'Adoption Leave'
        )
    ),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    total_days NUMERIC(4, 1) NOT NULL DEFAULT 1.0,
    reason TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Pending_Relief' CHECK (
        status IN ('Pending_Relief', 'Pending_Approval', 'Approved', 'Disapproved', 'Cancelled')
    ),
    school_head_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    school_head_action_at TIMESTAMPTZ,
    school_head_remarks TEXT,
    signed_document_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT valid_leave_dates CHECK (end_date >= start_date)
);

-- 2. LEAVE CLASS RELIEFS (CONFORME MATRIX) TABLE
CREATE TABLE IF NOT EXISTS public.leave_class_reliefs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    leave_application_id UUID NOT NULL REFERENCES public.leave_applications(id) ON DELETE CASCADE,
    schedule_entry_id UUID REFERENCES public.schedule_entries(id) ON DELETE SET NULL,
    relief_date DATE NOT NULL,
    day_of_week TEXT NOT NULL CHECK (
        day_of_week IN ('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday')
    ),
    time_slot_id UUID NOT NULL REFERENCES public.time_slots(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES public.subjects_catalog(id) ON DELETE CASCADE,
    section_id UUID NOT NULL REFERENCES public.sections(id) ON DELETE CASCADE,
    reliever_teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    conforme_status TEXT NOT NULL DEFAULT 'Pending' CHECK (
        conforme_status IN ('Pending', 'Accepted', 'Declined')
    ),
    conforme_acted_at TIMESTAMPTZ,
    reliever_remarks TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_leave_relief_slot UNIQUE (leave_application_id, relief_date, time_slot_id)
);

-- 3. INDEXES FOR HIGH-CONCURRENCY QUERYING
CREATE INDEX IF NOT EXISTS idx_leave_applications_teacher ON public.leave_applications(teacher_id);
CREATE INDEX IF NOT EXISTS idx_leave_applications_status ON public.leave_applications(status);
CREATE INDEX IF NOT EXISTS idx_leave_applications_dates ON public.leave_applications(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_leave_reliefs_application ON public.leave_class_reliefs(leave_application_id);
CREATE INDEX IF NOT EXISTS idx_leave_reliefs_reliever ON public.leave_class_reliefs(reliever_teacher_id);
CREATE INDEX IF NOT EXISTS idx_leave_reliefs_date_slot ON public.leave_class_reliefs(relief_date, time_slot_id);

-- 4. ENABLE ROW-LEVEL SECURITY
ALTER TABLE public.leave_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_class_reliefs ENABLE ROW LEVEL SECURITY;

-- 5. RLS POLICIES FOR LEAVE APPLICATIONS
DROP POLICY IF EXISTS "leave_applications_select_policy" ON public.leave_applications;
CREATE POLICY "leave_applications_select_policy" ON public.leave_applications
    FOR SELECT TO authenticated
    USING (
        auth.uid() = teacher_id
        OR auth.uid() IN (
            SELECT reliever_teacher_id 
            FROM public.leave_class_reliefs 
            WHERE leave_application_id = leave_applications.id
        )
        OR EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role IN ('Super Admin', 'School Head')
        )
    );

DROP POLICY IF EXISTS "leave_applications_insert_policy" ON public.leave_applications;
CREATE POLICY "leave_applications_insert_policy" ON public.leave_applications
    FOR INSERT TO authenticated
    WITH CHECK (
        auth.uid() = teacher_id
        OR EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role IN ('Super Admin', 'School Head')
        )
    );

DROP POLICY IF EXISTS "leave_applications_update_policy" ON public.leave_applications;
CREATE POLICY "leave_applications_update_policy" ON public.leave_applications
    FOR UPDATE TO authenticated
    USING (
        auth.uid() = teacher_id
        OR EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role IN ('Super Admin', 'School Head')
        )
    )
    WITH CHECK (
        auth.uid() = teacher_id
        OR EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role IN ('Super Admin', 'School Head')
        )
    );

DROP POLICY IF EXISTS "leave_applications_delete_policy" ON public.leave_applications;
CREATE POLICY "leave_applications_delete_policy" ON public.leave_applications
    FOR DELETE TO authenticated
    USING (
        (auth.uid() = teacher_id AND status = 'Pending_Relief')
        OR EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'Super Admin'
        )
    );

-- 6. RLS POLICIES FOR LEAVE CLASS RELIEFS
DROP POLICY IF EXISTS "leave_reliefs_select_policy" ON public.leave_class_reliefs;
CREATE POLICY "leave_reliefs_select_policy" ON public.leave_class_reliefs
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.leave_applications la
            WHERE la.id = leave_class_reliefs.leave_application_id
            AND (la.teacher_id = auth.uid() OR leave_class_reliefs.reliever_teacher_id = auth.uid())
        )
        OR EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role IN ('Super Admin', 'School Head')
        )
    );

DROP POLICY IF EXISTS "leave_reliefs_insert_policy" ON public.leave_class_reliefs;
CREATE POLICY "leave_reliefs_insert_policy" ON public.leave_class_reliefs
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.leave_applications la
            WHERE la.id = leave_class_reliefs.leave_application_id
            AND la.teacher_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role IN ('Super Admin', 'School Head')
        )
    );

DROP POLICY IF EXISTS "leave_reliefs_update_policy" ON public.leave_class_reliefs;
CREATE POLICY "leave_reliefs_update_policy" ON public.leave_class_reliefs
    FOR UPDATE TO authenticated
    USING (
        reliever_teacher_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.leave_applications la
            WHERE la.id = leave_class_reliefs.leave_application_id
            AND la.teacher_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role IN ('Super Admin', 'School Head')
        )
    )
    WITH CHECK (
        reliever_teacher_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.leave_applications la
            WHERE la.id = leave_class_reliefs.leave_application_id
            AND la.teacher_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role IN ('Super Admin', 'School Head')
        )
    );

-- 7. STORAGE BUCKET INITIALIZATION FOR LEAVE ATTACHMENTS
INSERT INTO storage.buckets (id, name, public)
VALUES ('leave-attachments', 'leave-attachments', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "leave_attachments_select" ON storage.objects;
CREATE POLICY "leave_attachments_select" ON storage.objects
    FOR SELECT TO public
    USING (bucket_id = 'leave-attachments');

DROP POLICY IF EXISTS "leave_attachments_insert" ON storage.objects;
CREATE POLICY "leave_attachments_insert" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'leave-attachments');
