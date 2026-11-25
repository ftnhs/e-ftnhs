-- ============================================================================
-- e-FTNHS MIGRATION 014: Unify Anthony Riel Diango Account under Official DepEd Email
-- Target DB: https://ndwwoxsgcegdqiyoipvj.supabase.co
-- User: Anthony Riel Diango (ID: f3bf96b6-f53f-4d06-8cdf-93bdde432340)
-- Action:
--   1. Update email from rieldiango24@gmail.com to anthonyriel.diango@deped.gov.ph
--      in auth.users and public.profiles.
--   2. All transactions, roles (admin in user_roles), audit logs (18 records in
--      audit_events), backup ownership, and supply requests in the concurrent
--      inventory project are keyed by user UUID f3bf96b6-f53f-4d06-8cdf-93bdde432340,
--      ensuring 100% preservation and seamless transfer to anthonyriel.diango@deped.gov.ph.
--   3. Update public.messages email reference to anthonyriel.diango@deped.gov.ph.
-- ============================================================================

-- 1. Update auth.users account
UPDATE auth.users
SET email = 'anthonyriel.diango@deped.gov.ph',
    raw_user_meta_data = jsonb_set(
      COALESCE(raw_user_meta_data, '{}'::jsonb),
      '{email}',
      '"anthonyriel.diango@deped.gov.ph"'
    ),
    email_change = '',
    email_change_token_new = '',
    updated_at = NOW()
WHERE id = 'f3bf96b6-f53f-4d06-8cdf-93bdde432340'
   OR email = 'rieldiango24@gmail.com';

-- 2. Update public.profiles account in e-FTNHS
UPDATE public.profiles
SET email = 'anthonyriel.diango@deped.gov.ph',
    full_name = 'Anthony Riel Diango',
    role = 'Super Admin',
    is_teaching = true,
    status = 'Approved',
    designation = 'Teacher III / ICT Coordinator',
    department = 'Junior High School (JHS)',
    station_school_id = '302851',
    station_school_name = 'FERMIN TAYABAS NATIONAL HIGH SCHOOL',
    division = 'DIVISION OF BOHOL',
    region = 'REGION VII',
    updated_at = NOW()
WHERE id = 'f3bf96b6-f53f-4d06-8cdf-93bdde432340'
   OR email = 'rieldiango24@gmail.com';

-- 3. Update messages email in other project if referencing old email
UPDATE public.messages
SET email = 'anthonyriel.diango@deped.gov.ph'
WHERE email = 'rieldiango24@gmail.com';
