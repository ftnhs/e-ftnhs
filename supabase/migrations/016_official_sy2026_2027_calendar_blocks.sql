-- ============================================================================
-- e-FTNHS MIGRATION 016: Official SY 2026-2027 3-Term Dates & Academic Calendar Blocks
-- Target DB: https://ndwwoxsgcegdqiyoipvj.supabase.co
-- Calendar Source: Official User SY 2026-2027 3-Term Calendar
--   - Term 1: June 8 – September 15, 2026
--   - Term 2: September 16 – December 18, 2026 (Active)
--   - Christmas / Year-End Break: December 19, 2026 – January 3, 2027
--   - Term 3: January 4 – April 8, 2027
-- ============================================================================

-- 1. UPDATE EXACT TERM BOUNDARIES IN ACADEMIC_TERMS
UPDATE public.academic_terms
SET start_date = '2026-06-08',
    end_date = '2026-09-15',
    is_active = false
WHERE school_year = '2026-2027' AND term_number = 1;

UPDATE public.academic_terms
SET start_date = '2026-09-16',
    end_date = '2026-12-18',
    is_active = true
WHERE school_year = '2026-2027' AND term_number = 2;

UPDATE public.academic_terms
SET start_date = '2027-01-04',
    end_date = '2027-04-08',
    is_active = false
WHERE school_year = '2026-2027' AND term_number = 3;

-- 2. REPLACE PLACEHOLDER CALENDAR EVENTS WITH OFFICIAL SY 2026-2027 TERM BLOCKS
DELETE FROM public.school_calendar_events;

DO $$
DECLARE
  v_t1 UUID;
  v_t2 UUID;
  v_t3 UUID;
  v_admin UUID;
BEGIN
  SELECT id INTO v_t1 FROM public.academic_terms WHERE school_year = '2026-2027' AND term_number = 1;
  SELECT id INTO v_t2 FROM public.academic_terms WHERE school_year = '2026-2027' AND term_number = 2;
  SELECT id INTO v_t3 FROM public.academic_terms WHERE school_year = '2026-2027' AND term_number = 3;
  SELECT id INTO v_admin FROM public.profiles WHERE email = 'anthonyriel.diango@deped.gov.ph';

  INSERT INTO public.school_calendar_events (
    term_id, title, description, start_date, end_date, event_type, target_audience, created_by
  ) VALUES
    -- TERM 1 (June 8 - September 15, 2026)
    (
      v_t1,
      'Term 1: Opening Block & School Readiness',
      'Official opening block of SY 2026-2027 (June 8-11): student orientation, classroom organization, and pre-instructional briefings prior to regular classes.',
      '2026-06-08', '2026-06-11', 'School Event', 'All', v_admin
    ),
    (
      v_t1,
      'Term 1: Instructional Period (Classes Start June 15)',
      'Regular classroom instruction across JHS (MATATAG) and SHS tracks for Term 1 (June 15 - September 1, 2026).',
      '2026-06-15', '2026-09-01', 'School Event', 'All', v_admin
    ),
    (
      v_t1,
      'Term 1: End-of-Term Assessment & Closing Block',
      'Term 1 final examinations, item analysis computations, academic interventions, and E-Class Record consolidation (September 2-15, 2026).',
      '2026-09-02', '2026-09-15', 'Exam Period', 'All', v_admin
    ),
    (
      v_t1,
      'Term 1: E-Class Records & Grades Submission Deadline',
      'Final submission and principal verification of Term 1 DLL compliance, Item Analysis, and E-Class Record transmuted grades.',
      '2026-09-15', '2026-09-15', 'Submission Deadline', 'Teachers', v_admin
    ),

    -- TERM 2 (September 16 - December 18, 2026)
    (
      v_t2,
      'Term 2: Instructional Period',
      'Regular classroom instruction for SY 2026-2027 Term 2 across Grade 7-12 classes (September 16 - December 4, 2026).',
      '2026-09-16', '2026-12-04', 'School Event', 'All', v_admin
    ),
    (
      v_t2,
      'Term 2: End-of-Term Assessment & Closing Block',
      'Term 2 final examinations, summative evaluations, remedial clinics, and term closing activities (December 7-18, 2026).',
      '2026-12-07', '2026-12-18', 'Exam Period', 'All', v_admin
    ),
    (
      v_t2,
      'Term 2: E-Class Records & Card Distribution Deadline',
      'Submission of Term 2 E-Class Records, Item Analysis reports, and SF2 attendance summaries prior to the year-end break.',
      '2026-12-18', '2026-12-18', 'Submission Deadline', 'Teachers', v_admin
    ),

    -- CHRISTMAS / YEAR-END BREAK
    (
      v_t2,
      'Christmas & Year-End Academic Break',
      'Official DepEd Christmas and Year-End Vacation for learners and teaching personnel (December 19, 2026 - January 3, 2027).',
      '2026-12-19', '2027-01-03', 'DepEd Holiday', 'All', v_admin
    ),

    -- TERM 3 (January 4 - April 8, 2027)
    (
      v_t3,
      'Term 3: Instructional Period',
      'Resumption of classes and regular Term 3 classroom instruction across all JHS and SHS sections (January 4 - March 23, 2027).',
      '2027-01-04', '2027-03-23', 'School Event', 'All', v_admin
    ),
    (
      v_t3,
      'Term 3: End-of-Term & SY Closing Block',
      'Final Term 3 examinations, moving-up/graduation clearances, RPMS-PPST portfolio lock, and end-of-school-year closing block (March 24 - April 8, 2027).',
      '2027-03-24', '2027-04-08', 'Exam Period', 'All', v_admin
    ),
    (
      v_t3,
      'SY 2026-2027 Final Grades, SF2 & RPMS Submission Deadline',
      'Institutional deadline for Final Grade averaging ((T1+T2+T3)/3), SF2 closing, and RPMS MOV verification.',
      '2027-04-08', '2027-04-08', 'Submission Deadline', 'Teachers', v_admin
    );
END $$;
