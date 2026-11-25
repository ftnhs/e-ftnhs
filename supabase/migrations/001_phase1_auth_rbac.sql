-- ==============================================================================
-- e-FTNHS: Phase 1 Database Migration (Auth, RBAC, Academic Terms, School Settings)
-- Target Supabase Instance: https://ndwwoxsgcegdqiyoipvj.supabase.co
-- School: FERMIN TAYABAS NATIONAL HIGH SCHOOL (School ID: 302851)
-- Safety: Non-destructive, idempotent, preserves all existing tables and rows.
-- ==============================================================================

-- 1. Safely Alter Profiles Table with Required e-FTNHS Columns
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'Teacher';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Pending';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS department TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS designation TEXT DEFAULT 'Teacher I';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT false;

-- Add check constraints safely
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_role_check'
  ) THEN
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check 
      CHECK (role IN ('Super Admin', 'School Head', 'Master Teacher', 'Teacher'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_status_check'
  ) THEN
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_status_check 
      CHECK (status IN ('Pending', 'Approved', 'Rejected'));
  END IF;
END $$;

-- 2. Backfill existing registered faculty accounts safely from auth.users & user_roles
UPDATE public.profiles p
SET 
  email = COALESCE(p.email, u.email),
  full_name = COALESCE(
    p.full_name,
    NULLIF(TRIM(CONCAT(COALESCE(p.first_name, ''), ' ', COALESCE(p.last_name, ''))), ''),
    split_part(u.email, '@', 1)
  ),
  status = CASE
    WHEN p.active IS TRUE THEN 'Approved'
    WHEN p.status IS NOT NULL THEN p.status
    ELSE 'Approved'
  END,
  role = CASE 
    WHEN EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = p.id AND ur.role::text = 'admin'
    ) THEN 'Super Admin'
    WHEN p.role IS NOT NULL AND p.role IN ('Super Admin', 'School Head', 'Master Teacher', 'Teacher') THEN p.role
    ELSE 'Teacher'
  END
FROM auth.users u
WHERE p.id = u.id;

-- 3. Create Academic Terms Table
CREATE TABLE IF NOT EXISTS public.academic_terms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_year TEXT NOT NULL, -- e.g., '2026-2027'
  term_number INT NOT NULL CHECK (term_number IN (1, 2, 3)),
  is_active BOOLEAN NOT NULL DEFAULT false,
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_academic_term UNIQUE (school_year, term_number)
);

-- Seed default academic term (SY 2026-2027 Term 1) if not present
INSERT INTO public.academic_terms (school_year, term_number, is_active, start_date, end_date)
SELECT '2026-2027', 1, true, '2026-08-17', '2026-11-20'
WHERE NOT EXISTS (SELECT 1 FROM public.academic_terms WHERE school_year = '2026-2027' AND term_number = 1);

-- 4. Create School Settings Table (Powers official DepEd headers)
CREATE TABLE IF NOT EXISTS public.school_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_name TEXT NOT NULL DEFAULT 'FERMIN TAYABAS NATIONAL HIGH SCHOOL',
  school_id TEXT NOT NULL DEFAULT '302851',
  region TEXT NOT NULL DEFAULT 'REGION VII',
  division TEXT NOT NULL DEFAULT 'DIVISION OF BOHOL',
  district TEXT NOT NULL DEFAULT 'DISTRICT OF CALAPE',
  address TEXT NOT NULL DEFAULT 'Cabayugan, Calape, Bohol',
  principal_name TEXT NOT NULL DEFAULT 'JUAN DELA CRUZ',
  principal_designation TEXT NOT NULL DEFAULT 'Secondary School Principal IV',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed default school settings for Fermin Tayabas NHS if not present
INSERT INTO public.school_settings (school_name, school_id, region, division, district, address, principal_name, principal_designation)
SELECT 'FERMIN TAYABAS NATIONAL HIGH SCHOOL', '302851', 'REGION VII', 'DIVISION OF BOHOL', 'DISTRICT OF CALAPE', 'Cabayugan, Calape, Bohol', 'JUAN DELA CRUZ', 'Secondary School Principal IV'
WHERE NOT EXISTS (SELECT 1 FROM public.school_settings LIMIT 1);

-- ==============================================================================
-- 5. Helper Functions
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.is_admin_or_principal()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND (
        role IN ('Super Admin', 'School Head')
        OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role::text = 'admin')
      )
      AND (status = 'Approved' OR active IS TRUE)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ==============================================================================
-- 6. Account Creation Security
-- Registrations are open to any valid Google email; unauthorized access is
-- prevented by defaulting all new accounts to status = 'Pending' until approved.
-- ==============================================================================


-- ==============================================================================
-- 7. Unified Profile Creation Trigger on auth.users
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER AS $$
DECLARE
  meta jsonb := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);
  v_first text := nullif(trim(meta->>'first_name'), '');
  v_last  text := nullif(trim(meta->>'last_name'), '');
  v_user  text := nullif(trim(meta->>'username'), '');
  v_full  text := COALESCE(
    nullif(trim(concat(v_first, ' ', v_last)), ''),
    nullif(trim(meta->>'full_name'), ''),
    nullif(trim(meta->>'name'), ''),
    split_part(NEW.email, '@', 1)
  );
  v_avatar text := COALESCE(meta->>'avatar_url', meta->>'picture');
BEGIN
  INSERT INTO public.profiles (
    id, email, full_name, first_name, last_name, username, role, status, avatar_url, active
  )
  VALUES (
    NEW.id, NEW.email, v_full, v_first, v_last, v_user, 'Teacher', 'Pending', v_avatar, false
  )
  ON CONFLICT (id) DO UPDATE
  SET
    email = EXCLUDED.email,
    full_name = COALESCE(profiles.full_name, EXCLUDED.full_name),
    avatar_url = COALESCE(EXCLUDED.avatar_url, profiles.avatar_url),
    updated_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach trigger if not already attached
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

-- ==============================================================================
-- 8. Row-Level Security (RLS) Policies
-- ==============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academic_terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_settings ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
DROP POLICY IF EXISTS "select_profiles" ON public.profiles;
DROP POLICY IF EXISTS "Profiles are readable by authenticated users" ON public.profiles;
CREATE POLICY "Profiles are readable by authenticated users"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "update_profiles_self" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile basic info" ON public.profiles;
CREATE POLICY "Users can update their own profile basic info"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND (
      (role = (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid()) AND status = (SELECT p.status FROM public.profiles p WHERE p.id = auth.uid()))
      OR public.is_admin_or_principal()
    )
  );

DROP POLICY IF EXISTS "update_profiles_admin" ON public.profiles;
DROP POLICY IF EXISTS "Admins and School Heads can update all profile roles and statuses" ON public.profiles;
CREATE POLICY "Admins and School Heads can update all profile roles and statuses"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (public.is_admin_or_principal())
  WITH CHECK (public.is_admin_or_principal());

-- Academic Terms Policies
DROP POLICY IF EXISTS "Academic terms are viewable by authenticated users" ON public.academic_terms;
CREATE POLICY "Academic terms are viewable by authenticated users"
  ON public.academic_terms FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Admins can manage academic terms" ON public.academic_terms;
CREATE POLICY "Admins can manage academic terms"
  ON public.academic_terms FOR ALL
  TO authenticated
  USING (public.is_admin_or_principal())
  WITH CHECK (public.is_admin_or_principal());

-- School Settings Policies
DROP POLICY IF EXISTS "School settings are viewable by authenticated users" ON public.school_settings;
CREATE POLICY "School settings are viewable by authenticated users"
  ON public.school_settings FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Admins can update school settings" ON public.school_settings;
CREATE POLICY "Admins can update school settings"
  ON public.school_settings FOR UPDATE
  TO authenticated
  USING (public.is_admin_or_principal())
  WITH CHECK (public.is_admin_or_principal());
