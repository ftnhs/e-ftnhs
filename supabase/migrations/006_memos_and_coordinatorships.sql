-- ==============================================================================
-- Migration 006: School Memos Broadcast Center & Coordinatorships Vault (Phase 5)
-- School: Fermin Tayabas National High School (FTNHS - School ID: 302851)
-- Standards: DepEd Administrative Communications & Ancillary Roles
-- ==============================================================================

-- 1. Create storage buckets for memos and coordinatorships
INSERT INTO storage.buckets (id, name, public)
VALUES ('memo-attachments', 'memo-attachments', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('coordinatorship-files', 'coordinatorship-files', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for memo-attachments
CREATE POLICY "memo_attachments_public_read"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'memo-attachments');

CREATE POLICY "memo_attachments_admin_insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'memo-attachments' AND
    EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
        AND p.role IN ('Super Admin', 'School Head')
    )
);

-- Storage policies for coordinatorship-files
CREATE POLICY "coordinatorship_files_read"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'coordinatorship-files');

CREATE POLICY "coordinatorship_files_insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'coordinatorship-files');

-- 2. Create memos table
CREATE TABLE IF NOT EXISTS public.memos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    memo_number TEXT NOT NULL,
    title TEXT NOT NULL,
    priority TEXT NOT NULL DEFAULT 'Standard' CHECK (priority IN ('Urgent', 'Standard', 'FYI')),
    target_audience TEXT NOT NULL DEFAULT 'All Faculty',
    content TEXT NOT NULL,
    attachment_url TEXT,
    attachment_name TEXT,
    attachment_size INTEGER DEFAULT 0,
    published_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    status TEXT NOT NULL DEFAULT 'Published' CHECK (status IN ('Draft', 'Published', 'Archived')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. Create memo_acknowledgments table
CREATE TABLE IF NOT EXISTS public.memo_acknowledgments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    memo_id UUID NOT NULL REFERENCES public.memos(id) ON DELETE CASCADE,
    teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    acknowledged_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT unique_memo_acknowledgment UNIQUE (memo_id, teacher_id)
);

-- 4. Create coordinatorship_units table
CREATE TABLE IF NOT EXISTS public.coordinatorship_units (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    unit_name TEXT NOT NULL UNIQUE,
    unit_code TEXT NOT NULL UNIQUE,
    coordinator_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    description TEXT,
    icon_name TEXT DEFAULT 'Briefcase',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 5. Create coordinatorship_files table
CREATE TABLE IF NOT EXISTS public.coordinatorship_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    unit_id UUID NOT NULL REFERENCES public.coordinatorship_units(id) ON DELETE CASCADE,
    uploader_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_type TEXT NOT NULL,
    file_size INTEGER NOT NULL DEFAULT 0,
    title TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL DEFAULT 'Action Plan' CHECK (category IN ('Action Plan', 'Accomplishment Report', 'Attendance / Minutes', 'Photo Documentation', 'Financial / Inventory', 'Other')),
    visibility TEXT NOT NULL DEFAULT 'Internal' CHECK (visibility IN ('Public', 'Internal', 'Confidential')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 6. Indexes for performant lookups
CREATE INDEX IF NOT EXISTS idx_memos_published ON public.memos(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_memos_priority ON public.memos(priority);
CREATE INDEX IF NOT EXISTS idx_memos_status ON public.memos(status);
CREATE INDEX IF NOT EXISTS idx_memo_ack_memo ON public.memo_acknowledgments(memo_id);
CREATE INDEX IF NOT EXISTS idx_memo_ack_teacher ON public.memo_acknowledgments(teacher_id);
CREATE INDEX IF NOT EXISTS idx_coord_files_unit ON public.coordinatorship_files(unit_id);
CREATE INDEX IF NOT EXISTS idx_coord_files_category ON public.coordinatorship_files(category);
CREATE INDEX IF NOT EXISTS idx_coord_files_uploader ON public.coordinatorship_files(uploader_id);

-- 7. Enable Row Level Security
ALTER TABLE public.memos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memo_acknowledgments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coordinatorship_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coordinatorship_files ENABLE ROW LEVEL SECURITY;

-- 8. RLS Policies for memos
CREATE POLICY "memos_select_policy"
ON public.memos FOR SELECT
TO authenticated
USING (
    status = 'Published' OR
    author_id = auth.uid() OR
    EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
        AND p.role IN ('Super Admin', 'School Head')
    )
);

CREATE POLICY "memos_insert_policy"
ON public.memos FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
        AND p.role IN ('Super Admin', 'School Head')
    )
);

CREATE POLICY "memos_update_policy"
ON public.memos FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
        AND p.role IN ('Super Admin', 'School Head')
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
        AND p.role IN ('Super Admin', 'School Head')
    )
);

CREATE POLICY "memos_delete_policy"
ON public.memos FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
        AND p.role IN ('Super Admin', 'School Head')
    )
);

-- 9. RLS Policies for memo_acknowledgments
CREATE POLICY "memo_ack_select_policy"
ON public.memo_acknowledgments FOR SELECT
TO authenticated
USING (
    teacher_id = auth.uid() OR
    EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
        AND p.role IN ('Super Admin', 'School Head')
    )
);

CREATE POLICY "memo_ack_insert_policy"
ON public.memo_acknowledgments FOR INSERT
TO authenticated
WITH CHECK (
    teacher_id = auth.uid() OR
    EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
        AND p.role IN ('Super Admin', 'School Head')
    )
);

CREATE POLICY "memo_ack_delete_policy"
ON public.memo_acknowledgments FOR DELETE
TO authenticated
USING (
    teacher_id = auth.uid() OR
    EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
        AND p.role IN ('Super Admin', 'School Head')
    )
);

-- 10. RLS Policies for coordinatorship_units
CREATE POLICY "coord_units_select_policy"
ON public.coordinatorship_units FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "coord_units_all_policy"
ON public.coordinatorship_units FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
        AND p.role IN ('Super Admin', 'School Head')
    )
);

-- 11. RLS Policies for coordinatorship_files
CREATE POLICY "coord_files_select_policy"
ON public.coordinatorship_files FOR SELECT
TO authenticated
USING (
    visibility IN ('Public', 'Internal') OR
    uploader_id = auth.uid() OR
    EXISTS (
        SELECT 1 FROM public.coordinatorship_units u
        WHERE u.id = coordinatorship_files.unit_id
        AND u.coordinator_id = auth.uid()
    ) OR
    EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
        AND p.role IN ('Super Admin', 'School Head')
    )
);

CREATE POLICY "coord_files_insert_policy"
ON public.coordinatorship_files FOR INSERT
TO authenticated
WITH CHECK (
    uploader_id = auth.uid() OR
    EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
        AND p.role IN ('Super Admin', 'School Head')
    )
);

CREATE POLICY "coord_files_update_policy"
ON public.coordinatorship_files FOR UPDATE
TO authenticated
USING (
    uploader_id = auth.uid() OR
    EXISTS (
        SELECT 1 FROM public.coordinatorship_units u
        WHERE u.id = coordinatorship_files.unit_id
        AND u.coordinator_id = auth.uid()
    ) OR
    EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
        AND p.role IN ('Super Admin', 'School Head')
    )
);

CREATE POLICY "coord_files_delete_policy"
ON public.coordinatorship_files FOR DELETE
TO authenticated
USING (
    uploader_id = auth.uid() OR
    EXISTS (
        SELECT 1 FROM public.coordinatorship_units u
        WHERE u.id = coordinatorship_files.unit_id
        AND u.coordinator_id = auth.uid()
    ) OR
    EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
        AND p.role IN ('Super Admin', 'School Head')
    )
);

-- 12. Seed default FTNHS Coordinatorship Units
INSERT INTO public.coordinatorship_units (unit_name, unit_code, description, icon_name)
VALUES
    ('Disaster Risk Reduction & Management (DRRM)', 'DRRM', 'School disaster preparedness, emergency drills, safety audits, and resilience programs.', 'ShieldAlert'),
    ('Brigada Eskwela & Adopt-A-School', 'BRIGADA', 'Community partnerships, school maintenance, stakeholder engagement, and donation inventory.', 'Users'),
    ('Guidance & Counseling Services', 'GUIDANCE', 'Student counseling, career guidance, child protection policy, and mental health initiatives.', 'HeartHandshake'),
    ('Boy Scouts / Girl Scouts of the Philippines (BSP/GSP)', 'SCOUTING', 'Scouting activities, outdoor leadership, investiture ceremonies, and community service.', 'Compass'),
    ('School Paper & Campus Journalism', 'JOURNALISM', 'Editorial board, school newsletter publication, press conferences, and broadcasting.', 'Newspaper'),
    ('Information & Communications Technology (ICT)', 'ICT', 'Computer laboratories, school network maintenance, DCP e-Classroom packages, and digital platforms.', 'Laptop'),
    ('Youth for Environment in Schools (YES-O)', 'YES-O', 'Ecological preservation, school vegetable gardens (Gulayan sa Paaralan), and solid waste management.', 'Leaf'),
    ('Sports & Physical Fitness Development', 'SPORTS', 'Athletic training, Intramurals, Bohol Provincial Athletic Meet, and sports equipment inventory.', 'Trophy')
ON CONFLICT (unit_code) DO NOTHING;
