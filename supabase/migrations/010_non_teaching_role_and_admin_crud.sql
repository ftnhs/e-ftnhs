-- ==============================================================================
-- e-FTNHS: Migration 010 (Non-Teaching Role Clarification & Super Admin User CRUD)
-- Target Supabase Instance: https://ndwwoxsgcegdqiyoipvj.supabase.co
-- Safety: Non-destructive, idempotent, preserves all existing tables and rows.
-- ==============================================================================

-- 1. Safely update profiles_role_check constraint to include 'Non-Teaching'
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_role_check'
  ) THEN
    ALTER TABLE public.profiles DROP CONSTRAINT profiles_role_check;
  END IF;

  ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check 
    CHECK (role IN ('Super Admin', 'School Head', 'Master Teacher', 'Teacher', 'Non-Teaching'));
END $$;

-- 2. Create is_super_admin helper function
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND (
        role = 'Super Admin'
        OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role::text = 'admin')
      )
      AND (status = 'Approved' OR active IS TRUE)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 3. Extend RLS Policies on public.profiles to enable full Admin CRUD
DROP POLICY IF EXISTS "Admins can insert profiles" ON public.profiles;
CREATE POLICY "Admins can insert profiles"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin_or_principal());

DROP POLICY IF EXISTS "Admins can delete profiles" ON public.profiles;
CREATE POLICY "Admins can delete profiles"
  ON public.profiles FOR DELETE
  TO authenticated
  USING (public.is_admin_or_principal());

-- 4. RPC Function: admin_create_user
-- Allows Super Admin and School Head to provision or update user accounts with password
CREATE OR REPLACE FUNCTION public.admin_create_user(
  p_email text,
  p_password text,
  p_full_name text,
  p_role text,
  p_department text DEFAULT NULL,
  p_designation text DEFAULT NULL,
  p_status text DEFAULT 'Approved'
)
RETURNS UUID AS $$
DECLARE
  v_user_id UUID;
  v_existing_id UUID;
  v_effective_pwd text;
BEGIN
  -- Verify caller privileges
  IF NOT public.is_admin_or_principal() THEN
    RAISE EXCEPTION 'Unauthorized: Only Super Admins and School Heads can create users.';
  END IF;

  -- Validate role
  IF p_role NOT IN ('Super Admin', 'School Head', 'Master Teacher', 'Teacher', 'Non-Teaching') THEN
    RAISE EXCEPTION 'Invalid role: %', p_role;
  END IF;

  v_effective_pwd := COALESCE(NULLIF(TRIM(p_password), ''), 'FTNHS@2026');

  -- Check if user already exists in auth.users
  SELECT id INTO v_existing_id FROM auth.users WHERE LOWER(email) = LOWER(TRIM(p_email)) LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    v_user_id := v_existing_id;
    -- Update password if requested
    IF p_password IS NOT NULL AND length(p_password) >= 6 THEN
      UPDATE auth.users
      SET encrypted_password = extensions.crypt(v_effective_pwd, extensions.gen_salt('bf')),
          raw_user_meta_data = raw_user_meta_data || jsonb_build_object('full_name', p_full_name),
          updated_at = NOW()
      WHERE id = v_user_id;
    END IF;
  ELSE
    v_user_id := gen_random_uuid();
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      v_user_id,
      'authenticated',
      'authenticated',
      LOWER(TRIM(p_email)),
      extensions.crypt(v_effective_pwd, extensions.gen_salt('bf')),
      NOW(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('full_name', p_full_name),
      NOW(),
      NOW(),
      ''
    );
  END IF;

  -- Upsert into public.profiles
  INSERT INTO public.profiles (
    id, email, full_name, role, department, designation, status, active, created_at, updated_at
  ) VALUES (
    v_user_id,
    LOWER(TRIM(p_email)),
    p_full_name,
    p_role,
    p_department,
    p_designation,
    p_status,
    (p_status = 'Approved'),
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    department = EXCLUDED.department,
    designation = EXCLUDED.designation,
    status = EXCLUDED.status,
    active = EXCLUDED.active,
    updated_at = NOW();

  RETURN v_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. RPC Function: admin_delete_user
-- Allows Super Admin to delete a user profile safely
CREATE OR REPLACE FUNCTION public.admin_delete_user(p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  IF NOT public.is_admin_or_principal() THEN
    RAISE EXCEPTION 'Unauthorized: Only Super Admins and School Heads can delete users.';
  END IF;

  -- Prevent self-deletion
  IF p_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Action Denied: You cannot delete your own administrative account.';
  END IF;

  -- Delete profile
  DELETE FROM public.profiles WHERE id = p_user_id;

  -- Delete from auth.users
  DELETE FROM auth.users WHERE id = p_user_id;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Seed Sample Non-Teaching Personnel if none exist
DO $$
DECLARE
  v_user_id UUID;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE role = 'Non-Teaching') THEN
    -- AO II Account
    v_user_id := gen_random_uuid();
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      v_user_id,
      'authenticated',
      'authenticated',
      'ao.admin@ftnhs.deped.gov.ph',
      extensions.crypt('FTNHS@2026', extensions.gen_salt('bf')),
      NOW(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('full_name', 'Clarita Mendoza'),
      NOW(),
      NOW(),
      ''
    ) ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.profiles (
      id, email, full_name, role, status, department, designation, active, created_at, updated_at
    ) VALUES (
      v_user_id,
      'ao.admin@ftnhs.deped.gov.ph',
      'Clarita Mendoza',
      'Non-Teaching',
      'Approved',
      'Administrative & Personnel Services',
      'Administrative Officer II (AO II)',
      true,
      NOW(),
      NOW()
    ) ON CONFLICT (id) DO UPDATE SET
      role = 'Non-Teaching',
      department = 'Administrative & Personnel Services',
      designation = 'Administrative Officer II (AO II)';

    -- Registrar Account
    v_user_id := gen_random_uuid();
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      v_user_id,
      'authenticated',
      'authenticated',
      'registrar@ftnhs.deped.gov.ph',
      extensions.crypt('FTNHS@2026', extensions.gen_salt('bf')),
      NOW(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('full_name', 'Eduardo Villanueva'),
      NOW(),
      NOW(),
      ''
    ) ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.profiles (
      id, email, full_name, role, status, department, designation, active, created_at, updated_at
    ) VALUES (
      v_user_id,
      'registrar@ftnhs.deped.gov.ph',
      'Eduardo Villanueva',
      'Non-Teaching',
      'Approved',
      'Office of the School Registrar',
      'Registrar I / Records Officer',
      true,
      NOW(),
      NOW()
    ) ON CONFLICT (id) DO UPDATE SET
      role = 'Non-Teaching',
      department = 'Office of the School Registrar',
      designation = 'Registrar I / Records Officer';
  END IF;
END $$;
