-- ==============================================================================
-- e-FTNHS: Migration 011 (DepEd 201 File & Personal Profile Attributes)
-- Target Supabase Instance: https://ndwwoxsgcegdqiyoipvj.supabase.co
-- School: FERMIN TAYABAS NATIONAL HIGH SCHOOL (School ID: 302851)
-- Safety: Non-destructive, idempotent, preserves all existing tables and rows.
-- ==============================================================================

-- 1. Safely add Personal Details Columns to public.profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS personal_email TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS gender TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS birthdate DATE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS civil_status TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS home_address TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS emergency_contact_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS emergency_contact_number TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS emergency_contact_relationship TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bio TEXT;

-- 2. Safely add Official DepEd 201 File Columns to public.profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS employee_id TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS plantilla_number TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS tin_number TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS gsis_bp_number TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS philhealth_number TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS pagibig_mid_number TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS highest_educational_attainment TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS degree_course TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS major_specialization TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS civil_service_eligibility TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS date_of_original_appointment DATE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS years_in_deped NUMERIC(4, 1);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS station_school_id TEXT DEFAULT '302851';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS station_school_name TEXT DEFAULT 'FERMIN TAYABAS NATIONAL HIGH SCHOOL';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS division TEXT DEFAULT 'DIVISION OF BOHOL';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS region TEXT DEFAULT 'REGION VII';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_teaching BOOLEAN DEFAULT true;

-- 3. Ensure self-update RLS Policy allows users to edit their own personal & DepEd info
DROP POLICY IF EXISTS "Users can update their own profile basic info" ON public.profiles;
CREATE POLICY "Users can update their own profile basic info"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND (
      -- Regular users cannot unilaterally elevate their role or approve themselves
      (
        role = (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid())
        AND status = (SELECT p.status FROM public.profiles p WHERE p.id = auth.uid())
      )
      OR public.is_admin_or_principal()
    )
  );

-- 4. Update Anthony Riel Diango's accounts to ensure accurate teacher + superadmin details
UPDATE public.profiles
SET
  full_name = 'Anthony Riel Diango',
  designation = COALESCE(designation, 'Teacher III / ICT Coordinator'),
  department = COALESCE(department, 'Junior High School (JHS)'),
  is_teaching = true,
  station_school_id = '302851',
  station_school_name = 'FERMIN TAYABAS NATIONAL HIGH SCHOOL',
  division = 'DIVISION OF BOHOL',
  region = 'REGION VII',
  major_specialization = COALESCE(major_specialization, 'Information & Communications Technology / Mathematics'),
  civil_service_eligibility = COALESCE(civil_service_eligibility, 'RA 1080 (LET)'),
  updated_at = NOW()
WHERE email IN ('anthonyriel.diango@deped.gov.ph', 'rieldiango24@gmail.com');
