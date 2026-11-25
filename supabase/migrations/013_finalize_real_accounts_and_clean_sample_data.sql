-- ============================================================================
-- e-FTNHS MIGRATION 013: Finalize Real Accounts, Role Mapping & Sample Data Purge
-- Target DB: https://ndwwoxsgcegdqiyoipvj.supabase.co
-- Safety: STRICTLY isolates other project tables (user_roles, equipment, supplies, etc.)
-- ============================================================================

-- 1. Remove temporary demo accounts created during testing
DELETE FROM public.profiles WHERE email IN ('ao.admin@ftnhs.deped.gov.ph', 'registrar@ftnhs.deped.gov.ph');
DELETE FROM auth.users WHERE email IN ('ao.admin@ftnhs.deped.gov.ph', 'registrar@ftnhs.deped.gov.ph');

-- 2. Update abigail@gmail.com to official DepEd email: ruthlyn.solis@deped.gov.ph
UPDATE auth.users
SET email = 'ruthlyn.solis@deped.gov.ph',
    raw_user_meta_data = jsonb_set(COALESCE(raw_user_meta_data, '{}'::jsonb), '{full_name}', '"Ruthlyn Solis"'),
    updated_at = NOW()
WHERE email = 'abigail@gmail.com';

UPDATE public.profiles
SET email = 'ruthlyn.solis@deped.gov.ph',
    full_name = 'Ruthlyn Solis',
    role = 'Teacher',
    is_teaching = true,
    status = 'Approved',
    updated_at = NOW()
WHERE email = 'abigail@gmail.com' OR id = '6b09550a-bd5a-4363-b7f6-0444984cdd7d';

-- 3. Configure designated School Head: Peejay Baslan
UPDATE public.profiles
SET role = 'School Head',
    designation = 'Secondary School Principal IV / School Head',
    department = 'Office of the Principal',
    is_teaching = false,
    status = 'Approved',
    updated_at = NOW()
WHERE email = 'peejay.baslan@deped.gov.ph';

-- Also update institutional settings header with official School Head
UPDATE public.school_settings
SET principal_name = 'PEEJAY BASLAN',
    principal_designation = 'Secondary School Principal IV',
    updated_at = NOW();

-- 4. Configure Non-Teaching accounts
UPDATE public.profiles
SET role = 'Non-Teaching',
    designation = 'Administrative Support / School Office',
    department = 'Administrative & Personnel Services',
    is_teaching = false,
    status = 'Approved',
    updated_at = NOW()
WHERE email = 'ftnhs@deped.gov.ph';

UPDATE public.profiles
SET role = 'Non-Teaching',
    designation = 'Administrative Assistant II (ADAS II)',
    department = 'Administrative & Personnel Services',
    is_teaching = false,
    status = 'Approved',
    updated_at = NOW()
WHERE email = 'jeanecarmel.estaca@deped.gov.ph';

UPDATE public.profiles
SET role = 'Non-Teaching',
    designation = 'Administrative Assistant / Records Officer',
    department = 'Administrative & Personnel Services',
    is_teaching = false,
    status = 'Approved',
    updated_at = NOW()
WHERE email = 'zosiemay.ormido@deped.gov.ph';

-- 5. Configure Lead Super Admin & Active Teacher: Anthony Riel Diango
UPDATE public.profiles
SET role = 'Super Admin',
    designation = 'Teacher III / ICT Coordinator',
    department = 'Junior High School (JHS)',
    is_teaching = true,
    status = 'Approved',
    updated_at = NOW()
WHERE email IN ('anthonyriel.diango@deped.gov.ph', 'rieldiango24@gmail.com');

-- 6. Configure Junrey Namang as Teacher
UPDATE public.profiles
SET role = 'Teacher',
    designation = 'Teacher III',
    department = 'Junior High School (JHS)',
    is_teaching = true,
    status = 'Approved',
    updated_at = NOW()
WHERE email = 'junrey.namang@deped.gov.ph';

-- 7. Ensure all other instructional faculty have Teacher role & approved status
UPDATE public.profiles
SET role = 'Teacher',
    is_teaching = true,
    status = 'Approved',
    updated_at = NOW()
WHERE email NOT IN (
  'anthonyriel.diango@deped.gov.ph',
  'rieldiango24@gmail.com',
  'peejay.baslan@deped.gov.ph',
  'ftnhs@deped.gov.ph',
  'jeanecarmel.estaca@deped.gov.ph',
  'zosiemay.ormido@deped.gov.ph'
);

-- 8. Purge demo / sample placeholder data across e-FTNHS operational modules
DELETE FROM public.memo_acknowledgments;
DELETE FROM public.memos;
DELETE FROM public.coordinatorship_files;
DELETE FROM public.leave_class_reliefs;
DELETE FROM public.leave_applications;
DELETE FROM public.cot_observations;
DELETE FROM public.rpms_portfolio_items;
DELETE FROM public.student_grades;
DELETE FROM public.class_records;
DELETE FROM public.assessment_item_analysis;
DELETE FROM public.assessments;
DELETE FROM public.student_daily_attendance;
DELETE FROM public.daily_attendance_sessions;
DELETE FROM public.lesson_plans;
DELETE FROM public.schedule_entries;
DELETE FROM public.teacher_subject_loads;
