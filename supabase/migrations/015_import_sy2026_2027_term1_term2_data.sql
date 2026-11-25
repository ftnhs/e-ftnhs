-- ============================================================================
-- e-FTNHS MIGRATION 015: Official SY 2026-2027 Term 1 & Term 2 Schedule,
-- Sections, Subjects Catalog, Time Slots, Coordinatorships & Faculty Loads
-- Target DB: https://ndwwoxsgcegdqiyoipvj.supabase.co
-- Safety: Strictly preserves external inventory project tables.
-- ============================================================================

-- 1. PROVISION ACADEMIC TERMS (SY 2026-2027 TERMS 1, 2 & 3)
INSERT INTO public.academic_terms (school_year, term_number, is_active, start_date, end_date)
VALUES
  ('2026-2027', 1, false, '2026-08-17', '2026-11-20'),
  ('2026-2027', 2, true,  '2026-11-23', '2027-02-26'),
  ('2026-2027', 3, false, '2027-03-01', '2027-05-28')
ON CONFLICT (school_year, term_number) DO UPDATE
SET start_date = EXCLUDED.start_date,
    end_date = EXCLUDED.end_date,
    is_active = EXCLUDED.is_active;

-- Ensure Term 2 is currently active (matching SY 2026-2027 current term)
UPDATE public.academic_terms
SET is_active = (school_year = '2026-2027' AND term_number = 2);

-- 2. UPDATE SCHOOL SETTINGS WITH OFFICIAL HEADS & DISTRICT SUPERVISORS
UPDATE public.school_settings
SET principal_name = 'PEEJAY BASLAN, EdD',
    principal_designation = 'School-in-Charge / Secondary School Principal IV',
    district = 'Calape District',
    division = 'Division of Bohol',
    region = 'Region VII, Central Visayas',
    updated_at = NOW();

-- 3. ENRICH FACULTY PROFILES WITH OFFICIAL SF7 DEGREES, MAJORS & DESIGNATIONS
UPDATE public.profiles SET department = 'Technical-Vocational-Livelihood (TVL)', designation = 'Teacher III / ICT Coordinator', major_specialization = 'BS Computer Engineering / Mathematics' WHERE email = 'anthonyriel.diango@deped.gov.ph';
UPDATE public.profiles SET department = 'Science & Technology', designation = 'Teacher III / Science Coordinator', major_specialization = 'BSED Biology' WHERE email = 'reah.ong@deped.gov.ph';
UPDATE public.profiles SET department = 'English', designation = 'Teacher III / ARAL & Reading Coordinator', major_specialization = 'BSED English' WHERE email = 'florenda.calotes@deped.gov.ph';
UPDATE public.profiles SET department = 'Mathematics', designation = 'Teacher III / SNED & ADM Coordinator', major_specialization = 'BSED English' WHERE email = 'fe.joseph@deped.gov.ph';
UPDATE public.profiles SET department = 'English', designation = 'Teacher III / LR & School Paper Adviser', major_specialization = 'BSED English' WHERE email = 'liza.cruspero@deped.gov.ph';
UPDATE public.profiles SET department = 'Technology and Livelihood Education (TLE)', designation = 'Teacher III / TLE & Feeding Coordinator', major_specialization = 'BSED Technology and Livelihood Education' WHERE email = 'renalyn.pujadas@deped.gov.ph';
UPDATE public.profiles SET department = 'Mathematics', designation = 'Teacher III / LAC Coordinator & Treasurer', major_specialization = 'BSED Mathematics' WHERE email = 'necris.tiedra@deped.gov.ph';
UPDATE public.profiles SET department = 'Junior High School (JHS)', designation = 'Teacher III / JHS & Research Coordinator', major_specialization = 'BSED Mathematics' WHERE email = 'maurine.dumanig@deped.gov.ph';
UPDATE public.profiles SET department = 'Araling Panlipunan (Social Studies)', designation = 'Teacher III / AP & Gulayan Coordinator', major_specialization = 'BSED Araling Panlipunan' WHERE email = 'gerry.cahiles@deped.gov.ph';
UPDATE public.profiles SET department = 'Filipino', designation = 'Teacher III / BSP & BKD Coordinator', major_specialization = 'BSED Filipino' WHERE email = 'warren.clarito@deped.gov.ph';
UPDATE public.profiles SET department = 'Senior High School (SHS)', designation = 'Teacher III / Arts Club & Career Advocate', major_specialization = 'BSED Mathematics' WHERE email = 'famelarose.malalis@deped.gov.ph';
UPDATE public.profiles SET department = 'Araling Panlipunan (Social Studies)', designation = 'Teacher III / SSLG Adviser & LFO SHS', major_specialization = 'BSIT / Social Science' WHERE email = 'wiltfrancis.pamaong@deped.gov.ph';
UPDATE public.profiles SET department = 'Senior High School (SHS)', designation = 'Teacher III / SHS & English Coordinator', major_specialization = 'BSED English / Mathematics' WHERE email = 'dellie.vigonte@deped.gov.ph';
UPDATE public.profiles SET department = 'MAPEH (Music, Arts, PE & Health)', designation = 'Teacher III / Sports Coordinator', major_specialization = 'BSED MAPEH' WHERE email = 'maesheila.lastomen@deped.gov.ph';
UPDATE public.profiles SET department = 'MAPEH (Music, Arts, PE & Health)', designation = 'Teacher III / MAPEH Coordinator', major_specialization = 'BSED MAPEH' WHERE email = 'nova.fuentes@deped.gov.ph';
UPDATE public.profiles SET department = 'Edukasyon sa Pagpapakatao (Values)', designation = 'Teacher III / Values Coordinator & LFO JHS', major_specialization = 'BSED Social Studies' WHERE email = 'rayalbert.albaran@deped.gov.ph';
UPDATE public.profiles SET department = 'Edukasyon sa Pagpapakatao (Values)', designation = 'Teacher III / SWM Coordinator', major_specialization = 'BSED English' WHERE email = 'gerard.aranas@deped.gov.ph';
UPDATE public.profiles SET department = 'Filipino', designation = 'Teacher III / Filipino, DRRM & Canteen Mgr', major_specialization = 'BSED Filipino' WHERE email = 'maryjane.baluma@deped.gov.ph';
UPDATE public.profiles SET department = 'Edukasyon sa Pagpapakatao (Values)', designation = 'Teacher III / SHS Guidance & GAD Coord.', major_specialization = 'BSED Values Education' WHERE email = 'juliet.lodripas@deped.gov.ph';
UPDATE public.profiles SET department = 'Science & Technology', designation = 'Teacher III / ARH & YES-O Coordinator', major_specialization = 'BSED Science' WHERE email = 'rheljan.casino@deped.gov.ph';
UPDATE public.profiles SET department = 'Technology and Livelihood Education (TLE)', designation = 'Teacher I / 4Ps Coordinator', major_specialization = 'BSED' WHERE email = 'ruthlyn.solis@deped.gov.ph';

-- 4. ASSIGN DEPARTMENT HEADS IN DEPARTMENTS TABLE
UPDATE public.departments SET dept_head_id = (SELECT id FROM public.profiles WHERE email = 'maurine.dumanig@deped.gov.ph') WHERE dept_code IN ('JHS', 'MATH');
UPDATE public.departments SET dept_head_id = (SELECT id FROM public.profiles WHERE email = 'dellie.vigonte@deped.gov.ph') WHERE dept_code IN ('SHS', 'ENG');
UPDATE public.departments SET dept_head_id = (SELECT id FROM public.profiles WHERE email = 'reah.ong@deped.gov.ph') WHERE dept_code = 'SCI';
UPDATE public.departments SET dept_head_id = (SELECT id FROM public.profiles WHERE email = 'maryjane.baluma@deped.gov.ph') WHERE dept_code = 'FIL';
UPDATE public.departments SET dept_head_id = (SELECT id FROM public.profiles WHERE email = 'gerry.cahiles@deped.gov.ph') WHERE dept_code = 'AP';
UPDATE public.departments SET dept_head_id = (SELECT id FROM public.profiles WHERE email = 'nova.fuentes@deped.gov.ph') WHERE dept_code = 'MAPEH';
UPDATE public.departments SET dept_head_id = (SELECT id FROM public.profiles WHERE email = 'rayalbert.albaran@deped.gov.ph') WHERE dept_code = 'ESP';
UPDATE public.departments SET dept_head_id = (SELECT id FROM public.profiles WHERE email = 'renalyn.pujadas@deped.gov.ph') WHERE dept_code = 'TLE';
UPDATE public.departments SET dept_head_id = (SELECT id FROM public.profiles WHERE email = 'anthonyriel.diango@deped.gov.ph') WHERE dept_code = 'TVL';

-- 5. EXPAND ROOMS CATALOG FOR ALL 10 SECTIONS & LABS
INSERT INTO public.rooms_catalog (room_number, room_name, room_type, capacity, is_specialized)
VALUES
  ('RM-101', 'Room 101 (Grade 7 - Peace)', 'Standard Classroom', 45, false),
  ('RM-102', 'Room 102 (Grade 8 - Faith)', 'Standard Classroom', 45, false),
  ('RM-103', 'Room 103 (Grade 8 - Love)', 'Standard Classroom', 45, false),
  ('RM-201', 'Room 201 (Grade 9 - Honesty)', 'Standard Classroom', 45, false),
  ('RM-202', 'Room 202 (Grade 9 - Patience)', 'Standard Classroom', 45, false),
  ('RM-203', 'Room 203 (Grade 10 - Charity)', 'Standard Classroom', 45, false),
  ('RM-301', 'Room 301 (Grade 11 - ASSH)', 'Standard Classroom', 45, false),
  ('RM-302', 'Room 302 (Grade 12 - HUMSS)', 'Standard Classroom', 45, false),
  ('RM-303', 'Room 303 (Grade 11 - TechPro ICT)', 'Standard Classroom', 45, false),
  ('COMP-LAB', 'Computer & ICT Innovation Hub (12 - ICT)', 'Computer Laboratory', 40, true),
  ('SCI-LAB', 'Integrated Science Laboratory', 'Science Laboratory', 40, true),
  ('TVL-WORK', 'TVL & TLE Practical Workshop', 'TVL Workshop', 40, true)
ON CONFLICT (room_number) DO UPDATE
SET room_name = EXCLUDED.room_name,
    room_type = EXCLUDED.room_type,
    is_specialized = EXCLUDED.is_specialized;

-- 6. REPLACE TIME SLOTS WITH OFFICIAL FTNHS BELL SCHEDULE (7:45 AM - 5:00 PM)
DELETE FROM public.schedule_entries;
DELETE FROM public.time_slots;

INSERT INTO public.time_slots (slot_number, slot_label, start_time, end_time, duration_minutes, slot_type, sort_order)
VALUES
  (0, 'Morning Prayers & Flag Raising Ceremony', '07:45:00', '08:00:00', 15, 'Flag Ceremony', 0),
  (1, 'Period 1 (08:00 - 09:00 AM)', '08:00:00', '09:00:00', 60, 'Academic', 1),
  (2, 'Period 2 (09:00 - 10:00 AM)', '09:00:00', '10:00:00', 60, 'Academic', 2),
  (3, 'Period 3 (10:00 - 11:00 AM)', '10:00:00', '11:00:00', 60, 'Academic', 3),
  (4, 'Period 4 (11:00 - 12:00 NN)', '11:00:00', '12:00:00', 60, 'Academic', 4),
  (5, 'Noon Intermission / Lunch Break', '12:00:00', '12:40:00', 40, 'Lunch', 5),
  (6, 'Period 5 (12:40/01:00 - 02:00 PM)', '13:00:00', '14:00:00', 60, 'Academic', 6),
  (7, 'Period 6 (01:30/02:00 - 03:00 PM)', '14:00:00', '15:00:00', 60, 'Academic', 7),
  (8, 'Period 7 (02:20/03:00 - 04:00 PM)', '15:00:00', '16:00:00', 60, 'Academic', 8),
  (9, 'Period 8 (03:10 - 04:00 PM JHS)', '15:10:00', '16:00:00', 50, 'Academic', 9),
  (10, 'Period 9 (04:00 - 05:00 PM / ARAL, HGP & Sports)', '16:00:00', '17:00:00', 60, 'Academic', 10);

-- 7. POPULATE OFFICIAL COORDINATORSHIPS & ANCILLARY UNITS
UPDATE public.coordinatorship_units SET coordinator_id = (SELECT id FROM public.profiles WHERE email = 'anthonyriel.diango@deped.gov.ph') WHERE unit_code = 'ICT';
UPDATE public.coordinatorship_units SET coordinator_id = (SELECT id FROM public.profiles WHERE email = 'maryjane.baluma@deped.gov.ph') WHERE unit_code = 'DRRM';
UPDATE public.coordinatorship_units SET coordinator_id = (SELECT id FROM public.profiles WHERE email = 'juliet.lodripas@deped.gov.ph') WHERE unit_code = 'GUIDANCE';
UPDATE public.coordinatorship_units SET coordinator_id = (SELECT id FROM public.profiles WHERE email = 'liza.cruspero@deped.gov.ph') WHERE unit_code = 'JOURNALISM';
UPDATE public.coordinatorship_units SET coordinator_id = (SELECT id FROM public.profiles WHERE email = 'maesheila.lastomen@deped.gov.ph') WHERE unit_code = 'SPORTS';
UPDATE public.coordinatorship_units SET coordinator_id = (SELECT id FROM public.profiles WHERE email = 'rheljan.casino@deped.gov.ph') WHERE unit_code = 'YES-O';
UPDATE public.coordinatorship_units SET coordinator_id = (SELECT id FROM public.profiles WHERE email = 'warren.clarito@deped.gov.ph'), unit_name = 'Boy Scouts of the Philippines (BSP)' WHERE unit_code = 'SCOUTING';
UPDATE public.coordinatorship_units SET coordinator_id = (SELECT id FROM public.profiles WHERE email = 'gerry.cahiles@deped.gov.ph') WHERE unit_code = 'BRIGADA';

INSERT INTO public.coordinatorship_units (unit_code, unit_name, coordinator_id, description, icon_name)
VALUES
  ('GSP', 'Girl Scouts of the Philippines (GSP)', (SELECT id FROM public.profiles WHERE email = 'fe.joseph@deped.gov.ph'), 'Girl Scouts troop coordination, leadership camps, and community service.', 'Compass'),
  ('SNED', 'Special Needs Education (SNED)', (SELECT id FROM public.profiles WHERE email = 'fe.joseph@deped.gov.ph'), 'Inclusive and special needs learning accommodations and profiling.', 'HeartHandshake'),
  ('ADM', 'Alternative Delivery Mode (ADM)', (SELECT id FROM public.profiles WHERE email = 'fe.joseph@deped.gov.ph'), 'Flexible modular learning and alternative delivery mode tracking.', 'BookOpen'),
  ('ARAL', 'ARAL Program & Phil-IRI Reading', (SELECT id FROM public.profiles WHERE email = 'florenda.calotes@deped.gov.ph'), 'National Academic Recovery and Accessible Learning (ARAL) & Phil-IRI literacy audits.', 'BookOpen'),
  ('CLINIC-WINS', 'School Clinic, WinS & Red Cross Youth', (SELECT id FROM public.profiles WHERE email = 'reah.ong@deped.gov.ph'), 'Campus clinic first aid, WASH in Schools (WinS), and RCY compliance.', 'HeartPulse'),
  ('ARH', 'Adolescent Reproductive Health (ARH)', (SELECT id FROM public.profiles WHERE email = 'rheljan.casino@deped.gov.ph'), 'Youth health education, counseling referrals, and wellness campaigns.', 'ShieldAlert'),
  ('GAD', 'Gender and Development (GAD)', (SELECT id FROM public.profiles WHERE email = 'juliet.lodripas@deped.gov.ph'), 'DepEd GAD mainstreaming, parity audits, and safe school initiatives.', 'Users'),
  ('SSLG', 'Supreme Secondary Learner Government (SSLG & LFO SHS)', (SELECT id FROM public.profiles WHERE email = 'wiltfrancis.pamaong@deped.gov.ph'), 'Student governance, SHS learner formation, and campus leadership.', 'Award'),
  ('LFO-JHS', 'Learner Formation Office (JHS)', (SELECT id FROM public.profiles WHERE email = 'rayalbert.albaran@deped.gov.ph'), 'Junior High School values formation and student leadership activities.', 'Users'),
  ('FEEDING', 'School-Based Feeding Program (SBFP)', (SELECT id FROM public.profiles WHERE email = 'renalyn.pujadas@deped.gov.ph'), 'Nutritional assessment and daily supplemental feeding management.', 'Utensils'),
  ('GULAYAN', 'Gulayan sa Paaralan Program', (SELECT id FROM public.profiles WHERE email = 'gerry.cahiles@deped.gov.ph'), 'School vegetable gardens, agricultural sustainability, and nutrition.', 'Leaf'),
  ('SWM', 'Solid Waste Management (SWM)', (SELECT id FROM public.profiles WHERE email = 'gerard.aranas@deped.gov.ph'), 'Ecological waste segregation, recycling, and zero-waste campus maintenance.', 'Recycle'),
  ('BKD', 'Barkada Kontra Droga (BKD)', (SELECT id FROM public.profiles WHERE email = 'warren.clarito@deped.gov.ph'), 'National Drug Education Program (NDEP) advocacy and peer education.', 'ShieldCheck'),
  ('LAC', 'Learning Action Cell (LAC)', (SELECT id FROM public.profiles WHERE email = 'necris.tiedra@deped.gov.ph'), 'School-based teacher professional development and collaborative INSET.', 'GraduationCap'),
  ('TREASURY', 'School Treasury & Fiscal Management', (SELECT id FROM public.profiles WHERE email = 'necris.tiedra@deped.gov.ph'), 'Financial records, school fund liquidation, and collection reports.', 'Wallet'),
  ('CANTEEN', 'School Canteen Operations', (SELECT id FROM public.profiles WHERE email = 'maryjane.baluma@deped.gov.ph'), 'School canteen nutrition compliance (DO 13 s. 2017) and inventory.', 'Store'),
  ('LR-LIB', 'Learning Resource Center & School Library', (SELECT id FROM public.profiles WHERE email = 'liza.cruspero@deped.gov.ph'), 'DepEd LR Portal resources, textbook distribution, and library cataloging.', 'Library'),
  ('RESEARCH', 'School Research & Innovation Committee', (SELECT id FROM public.profiles WHERE email = 'maurine.dumanig@deped.gov.ph'), 'Action research mentoring, BERF proposals, and SHS research defense.', 'Microscope'),
  ('CI', 'Continuous Improvement (CI) Program', (SELECT id FROM public.profiles WHERE email = 'dellie.vigonte@deped.gov.ph'), 'Process bottleneck elimination and school-wide quality improvement.', 'TrendingUp'),
  ('ARTS', 'Visual Arts & Career Guidance (SHS)', (SELECT id FROM public.profiles WHERE email = 'famelarose.malalis@deped.gov.ph'), 'Campus arts club exhibitions and SHS career advocacy.', 'Palette'),
  ('PERF-ARTS', 'Performing Arts Guild', (SELECT id FROM public.profiles WHERE email = 'nova.fuentes@deped.gov.ph'), 'Cultural dance, music, and institutional program performances.', 'Music'),
  ('4PS', 'Pantawid Pamilyang Pilipino Program (4Ps)', (SELECT id FROM public.profiles WHERE email = 'ruthlyn.solis@deped.gov.ph'), 'DSWD 4Ps student attendance compliance monitoring and focal desk.', 'ClipboardCheck')
ON CONFLICT (unit_code) DO UPDATE
SET unit_name = EXCLUDED.unit_name,
    coordinator_id = EXCLUDED.coordinator_id,
    description = EXCLUDED.description;

-- 8. POPULATE REAL SUBJECTS CATALOG (JHS MATATAG + GRADE 10 + SHS TERM 1 & 2)
INSERT INTO public.subjects_catalog (subject_code, subject_name, grade_level, track_strand, category, minutes_per_week, requires_lab)
VALUES
  -- Grade 7 (MATATAG)
  ('ENG-7', 'English 7 (MATATAG)', 7, 'JHS', 'Core', 240, false),
  ('SCI-7', 'Science 7 (MATATAG)', 7, 'JHS', 'Core', 240, true),
  ('MATH-7', 'Mathematics 7 (MATATAG)', 7, 'JHS', 'Core', 240, false),
  ('FIL-7', 'Filipino 7 (MATATAG)', 7, 'JHS', 'Core', 240, false),
  ('ESP-7', 'GMRC / Values Education 7 (MATATAG)', 7, 'JHS', 'Core', 240, false),
  ('AP-7', 'Araling Panlipunan 7 (MATATAG)', 7, 'JHS', 'Core', 240, false),
  ('TLE-7', 'TLE 7 (MATATAG)', 7, 'JHS', 'TVL', 240, true),
  ('MAPEH-7', 'MAPEH 7 (MATATAG)', 7, 'JHS', 'Core', 240, false),
  ('HGP-7', 'Homeroom Guidance 7', 7, 'JHS', 'Core', 60, false),
  ('ARAL-7', 'ARAL Reading & Math Intervention 7', 7, 'JHS', 'Applied', 120, false),

  -- Grade 8 (MATATAG)
  ('ENG-8', 'English 8', 8, 'JHS', 'Core', 240, false),
  ('SCI-8', 'Science 8', 8, 'JHS', 'Core', 240, true),
  ('MATH-8', 'Mathematics 8', 8, 'JHS', 'Core', 240, false),
  ('FIL-8', 'Filipino 8', 8, 'JHS', 'Core', 240, false),
  ('ESP-8', 'Edukasyon sa Pagpapakatao 8', 8, 'JHS', 'Core', 240, false),
  ('AP-8', 'Araling Panlipunan 8', 8, 'JHS', 'Core', 240, false),
  ('TLE-8', 'TLE 8', 8, 'JHS', 'TVL', 240, true),
  ('MAPEH-8', 'MAPEH 8', 8, 'JHS', 'Core', 240, false),
  ('HGP-8', 'Homeroom Guidance 8', 8, 'JHS', 'Core', 60, false),
  ('ARAL-8', 'ARAL Reading & Math Intervention 8', 8, 'JHS', 'Applied', 120, false),

  -- Grade 9 (MATATAG)
  ('ENG-9', 'English 9', 9, 'JHS', 'Core', 240, false),
  ('SCI-9', 'Science 9', 9, 'JHS', 'Core', 240, true),
  ('MATH-9', 'Mathematics 9', 9, 'JHS', 'Core', 240, false),
  ('FIL-9', 'Filipino 9', 9, 'JHS', 'Core', 240, false),
  ('ESP-9', 'Edukasyon sa Pagpapakatao 9', 9, 'JHS', 'Core', 240, false),
  ('AP-9', 'Araling Panlipunan 9', 9, 'JHS', 'Core', 240, false),
  ('TLE-9', 'TLE 9', 9, 'JHS', 'TVL', 240, true),
  ('MAPEH-9', 'MAPEH 9', 9, 'JHS', 'Core', 240, false),
  ('HGP-9', 'Homeroom Guidance 9', 9, 'JHS', 'Core', 60, false),
  ('ARAL-9', 'ARAL Reading & Math Intervention 9', 9, 'JHS', 'Applied', 120, false),

  -- Grade 10
  ('ENG-10', 'English 10', 10, 'JHS', 'Core', 240, false),
  ('SCI-10', 'Science 10', 10, 'JHS', 'Core', 240, true),
  ('MATH-10', 'Mathematics 10', 10, 'JHS', 'Core', 240, false),
  ('FIL-10', 'Filipino 10', 10, 'JHS', 'Core', 240, false),
  ('ESP-10', 'Edukasyon sa Pagpapakatao 10', 10, 'JHS', 'Core', 240, false),
  ('AP-10', 'Araling Panlipunan 10', 10, 'JHS', 'Core', 240, false),
  ('TLE-10', 'TLE 10', 10, 'JHS', 'TVL', 240, true),
  ('MAPEH-10', 'MAPEH 10', 10, 'JHS', 'Core', 240, false),
  ('CAT-10', 'Citizenship Advancement Training (CAT 10)', 10, 'JHS', 'Applied', 60, false),
  ('HGP-10', 'Homeroom Guidance 10', 10, 'JHS', 'Core', 60, false),
  ('ARAL-10', 'ARAL Reading & Math Intervention 10', 10, 'JHS', 'Applied', 120, false),

  -- Grade 11 (Strengthened SHS Curriculum)
  ('GENMATH-11', 'General Mathematics 11', 11, 'SHS', 'Core', 300, false),
  ('GENSCI-11', 'General Science 11', 11, 'SHS', 'Core', 300, true),
  ('LIFECAREER-11', 'Life and Career Skills 11', 11, 'SHS', 'Core', 300, false),
  ('KASAYSAYAN-11', 'Pag-aaral ng Kasaysayan at Lipunang Pilipino 11', 11, 'SHS', 'Core', 300, false),
  ('EFFCOMM-11', 'Effective Communication 11', 11, 'SHS', 'Core', 150, false),
  ('MABISANGKOM-11', 'Mabisang Komunikasyon 11', 11, 'SHS', 'Core', 150, false),
  ('PHILO-11', 'Introduction to Philosophy 11', 11, 'ASSH', 'Specialized', 480, false),
  ('SOCSCI-11', 'Social Sciences 11', 11, 'ASSH', 'Specialized', 480, false),
  ('PROGNET-11', 'Computer Programming (.NET Technology) 11', 11, 'TechPro-ICT', 'TVL', 600, true),
  ('HGP-11', 'Homeroom Guidance 11', 11, 'SHS', 'Core', 60, false),
  ('ARAL-11', 'ARAL Reading & Math Intervention 11', 11, 'SHS', 'Applied', 120, false),

  -- Grade 12 (SHS Core, Applied, HUMSS & TVL-ICT)
  ('PROGJAVA-12', 'Computer Programming (Java) 12', 12, 'ICT', 'TVL', 840, true),
  ('EMPTECH-12', 'Empowerment Technologies 12', 12, 'SHS', 'Applied', 480, true),
  ('PRACRES-12', 'Practical Research 2 (Quantitative Research)', 12, 'SHS', 'Applied', 480, false),
  ('III-12', 'Inquiries, Investigations, and Immersion (3Is)', 12, 'SHS', 'Applied', 480, false),
  ('PERDEV-12', 'Personal Development 12', 12, 'SHS', 'Core', 480, false),
  ('PHILO-12', 'Introduction to the Philosophy of the Human Person 12', 12, 'HUMSS', 'Core', 480, false),
  ('CREATIVEWRITING-12', 'Creative Writing 12', 12, 'HUMSS', 'Specialized', 480, false),
  ('CREATIVENONFIC-12', 'Creative Nonfiction 12', 12, 'HUMSS', 'Specialized', 480, false),
  ('CPAR-12', 'Contemporary Philippine Arts from the Regions 12', 12, 'SHS', 'Core', 480, false),
  ('MIL-12', 'Media and Information Literacy 12', 12, 'SHS', 'Core', 480, false),
  ('TRENDS-12', 'Trends, Networks, and Critical Thinking 12', 12, 'HUMSS', 'Specialized', 480, false),
  ('HOPE3-12', 'Health Optimizing Physical Education 3 (HOPE 3)', 12, 'SHS', 'Core', 120, false),
  ('DIASS-12', 'Disciplines and Ideas in the Applied Social Sciences 12', 12, 'HUMSS', 'Specialized', 120, false),
  ('ENTREP-12', 'Entrepreneurship 12', 12, 'SHS', 'Applied', 60, false),
  ('WORLDREL-12', 'Introduction to World Religions and Belief Systems 12', 12, 'HUMSS', 'Specialized', 60, false),
  ('HGP-12', 'Homeroom Guidance 12', 12, 'SHS', 'Core', 60, false),
  ('ARAL-12', 'ARAL Reading Intervention 12', 12, 'SHS', 'Applied', 60, false)
ON CONFLICT (subject_code) DO UPDATE
SET subject_name = EXCLUDED.subject_name,
    grade_level = EXCLUDED.grade_level,
    track_strand = EXCLUDED.track_strand,
    category = EXCLUDED.category,
    minutes_per_week = EXCLUDED.minutes_per_week,
    requires_lab = EXCLUDED.requires_lab;

-- 9. POPULATE OFFICIAL 10 SECTIONS FOR TERM 1, TERM 2 & TERM 3
DELETE FROM public.teacher_subject_loads;
DELETE FROM public.sections;

DO $$
DECLARE
  t_rec RECORD;
BEGIN
  FOR t_rec IN SELECT id FROM public.academic_terms WHERE school_year = '2026-2027' LOOP
    INSERT INTO public.sections (term_id, grade_level, section_name, adviser_id, room_id) VALUES
      (t_rec.id, 7,  'Peace',       (SELECT id FROM public.profiles WHERE email = 'maryjane.baluma@deped.gov.ph'),    (SELECT id FROM public.rooms_catalog WHERE room_number = 'RM-101')),
      (t_rec.id, 8,  'Faith',       (SELECT id FROM public.profiles WHERE email = 'renalyn.pujadas@deped.gov.ph'),    (SELECT id FROM public.rooms_catalog WHERE room_number = 'RM-102')),
      (t_rec.id, 8,  'Love',        (SELECT id FROM public.profiles WHERE email = 'florenda.calotes@deped.gov.ph'),   (SELECT id FROM public.rooms_catalog WHERE room_number = 'RM-103')),
      (t_rec.id, 9,  'Honesty',     (SELECT id FROM public.profiles WHERE email = 'nova.fuentes@deped.gov.ph'),       (SELECT id FROM public.rooms_catalog WHERE room_number = 'RM-201')),
      (t_rec.id, 9,  'Patience',    (SELECT id FROM public.profiles WHERE email = 'rayalbert.albaran@deped.gov.ph'),  (SELECT id FROM public.rooms_catalog WHERE room_number = 'RM-202')),
      (t_rec.id, 10, 'Charity',     (SELECT id FROM public.profiles WHERE email = 'reah.ong@deped.gov.ph'),           (SELECT id FROM public.rooms_catalog WHERE room_number = 'RM-203')),
      (t_rec.id, 11, 'ASSH',        (SELECT id FROM public.profiles WHERE email = 'warren.clarito@deped.gov.ph'),     (SELECT id FROM public.rooms_catalog WHERE room_number = 'RM-301')),
      (t_rec.id, 11, 'TechPro ICT', (SELECT id FROM public.profiles WHERE email = 'fe.joseph@deped.gov.ph'),          (SELECT id FROM public.rooms_catalog WHERE room_number = 'RM-303')),
      (t_rec.id, 12, 'HUMSS',       (SELECT id FROM public.profiles WHERE email = 'maesheila.lastomen@deped.gov.ph'), (SELECT id FROM public.rooms_catalog WHERE room_number = 'RM-302')),
      (t_rec.id, 12, 'ICT',         (SELECT id FROM public.profiles WHERE email = 'famelarose.malalis@deped.gov.ph'), (SELECT id FROM public.rooms_catalog WHERE room_number = 'COMP-LAB'))
    ON CONFLICT (term_id, grade_level, section_name) DO UPDATE
    SET adviser_id = EXCLUDED.adviser_id,
        room_id = EXCLUDED.room_id;
  END LOOP;
END $$;

-- 10. HELPER FUNCTION TO SAFELY ASSIGN LOAD & SCHEDULE SLOTS
CREATE OR REPLACE FUNCTION pg_temp.add_load(
  p_term_num INT,
  p_email TEXT,
  p_subject_code TEXT,
  p_grade INT,
  p_section TEXT,
  p_mins INT,
  p_ancillary_mins INT DEFAULT 0,
  p_ancillary_desc TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_term_id UUID;
  v_teacher_id UUID;
  v_subject_id UUID;
  v_section_id UUID;
  v_load_id UUID;
BEGIN
  SELECT id INTO v_term_id FROM public.academic_terms WHERE school_year = '2026-2027' AND term_number = p_term_num;
  SELECT id INTO v_teacher_id FROM public.profiles WHERE email = p_email;
  SELECT id INTO v_subject_id FROM public.subjects_catalog WHERE subject_code = p_subject_code;
  SELECT id INTO v_section_id FROM public.sections WHERE term_id = v_term_id AND grade_level = p_grade AND section_name = p_section;

  IF v_term_id IS NULL OR v_teacher_id IS NULL OR v_subject_id IS NULL OR v_section_id IS NULL THEN
    RAISE EXCEPTION 'Missing lookup for add_load: term=%, email=%, subj=%, gr=%, sec=%', p_term_num, p_email, p_subject_code, p_grade, p_section;
  END IF;

  INSERT INTO public.teacher_subject_loads (
    term_id, teacher_id, subject_id, section_id,
    teaching_minutes_weekly, ancillary_minutes_weekly, ancillary_description, status
  ) VALUES (
    v_term_id, v_teacher_id, v_subject_id, v_section_id,
    p_mins, p_ancillary_mins, p_ancillary_desc, 'Assigned'
  )
  ON CONFLICT (term_id, teacher_id, subject_id, section_id) DO UPDATE
  SET teaching_minutes_weekly = EXCLUDED.teaching_minutes_weekly,
      ancillary_minutes_weekly = EXCLUDED.ancillary_minutes_weekly,
      ancillary_description = COALESCE(EXCLUDED.ancillary_description, public.teacher_subject_loads.ancillary_description)
  RETURNING id INTO v_load_id;

  RETURN v_load_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION pg_temp.add_slot(
  p_term_num INT,
  p_email TEXT,
  p_subject_code TEXT,
  p_grade INT,
  p_section TEXT,
  p_slot_num INT,
  p_days TEXT[],
  p_room_num TEXT DEFAULT NULL
) RETURNS VOID AS $$
DECLARE
  v_term_id UUID;
  v_teacher_id UUID;
  v_subject_id UUID;
  v_section_id UUID;
  v_load_id UUID;
  v_slot_id UUID;
  v_room_id UUID;
  v_day TEXT;
BEGIN
  SELECT id INTO v_term_id FROM public.academic_terms WHERE school_year = '2026-2027' AND term_number = p_term_num;
  SELECT id INTO v_teacher_id FROM public.profiles WHERE email = p_email;
  SELECT id INTO v_subject_id FROM public.subjects_catalog WHERE subject_code = p_subject_code;
  SELECT id, room_id INTO v_section_id, v_room_id FROM public.sections WHERE term_id = v_term_id AND grade_level = p_grade AND section_name = p_section;
  SELECT id INTO v_slot_id FROM public.time_slots WHERE slot_number = p_slot_num;

  IF p_room_num IS NOT NULL THEN
    SELECT id INTO v_room_id FROM public.rooms_catalog WHERE room_number = p_room_num;
  END IF;

  SELECT id INTO v_load_id FROM public.teacher_subject_loads
  WHERE term_id = v_term_id AND teacher_id = v_teacher_id AND subject_id = v_subject_id AND section_id = v_section_id;

  IF v_load_id IS NULL THEN
    v_load_id := pg_temp.add_load(p_term_num, p_email, p_subject_code, p_grade, p_section, array_length(p_days, 1) * 60, 0, NULL);
  END IF;

  FOREACH v_day IN ARRAY p_days LOOP
    INSERT INTO public.schedule_entries (
      term_id, load_id, teacher_id, section_id, subject_id, time_slot_id, room_id, day_of_week
    ) VALUES (
      v_term_id, v_load_id, v_teacher_id, v_section_id, v_subject_id, v_slot_id, v_room_id, v_day
    )
    ON CONFLICT DO NOTHING;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 11. SEED TERM 1 LOADS (SY 2026-2027 TERM 1 CSV: 26,760 MINS)
-- ============================================================================
DO $$
BEGIN
  -- Grade 7 Peace (Term 1)
  PERFORM pg_temp.add_load(1, 'liza.cruspero@deped.gov.ph', 'ENG-7', 7, 'Peace', 240);
  PERFORM pg_temp.add_load(1, 'rheljan.casino@deped.gov.ph', 'SCI-7', 7, 'Peace', 240);
  PERFORM pg_temp.add_load(1, 'necris.tiedra@deped.gov.ph', 'MATH-7', 7, 'Peace', 240);
  PERFORM pg_temp.add_load(1, 'maryjane.baluma@deped.gov.ph', 'FIL-7', 7, 'Peace', 240);
  PERFORM pg_temp.add_load(1, 'gerard.aranas@deped.gov.ph', 'ESP-7', 7, 'Peace', 240);
  PERFORM pg_temp.add_load(1, 'wiltfrancis.pamaong@deped.gov.ph', 'AP-7', 7, 'Peace', 240);
  PERFORM pg_temp.add_load(1, 'florenda.calotes@deped.gov.ph', 'TLE-7', 7, 'Peace', 240);
  PERFORM pg_temp.add_load(1, 'maesheila.lastomen@deped.gov.ph', 'MAPEH-7', 7, 'Peace', 240);
  PERFORM pg_temp.add_load(1, 'maryjane.baluma@deped.gov.ph', 'HGP-7', 7, 'Peace', 300, 0, 'Class Adviser 7-Peace; Canteen Mgr; Filipino & DRRM Coord.');

  -- Grade 8 Faith (Term 1)
  PERFORM pg_temp.add_load(1, 'florenda.calotes@deped.gov.ph', 'ENG-8', 8, 'Faith', 240);
  PERFORM pg_temp.add_load(1, 'rheljan.casino@deped.gov.ph', 'SCI-8', 8, 'Faith', 240);
  PERFORM pg_temp.add_load(1, 'fe.joseph@deped.gov.ph', 'MATH-8', 8, 'Faith', 240);
  PERFORM pg_temp.add_load(1, 'warren.clarito@deped.gov.ph', 'FIL-8', 8, 'Faith', 240);
  PERFORM pg_temp.add_load(1, 'gerard.aranas@deped.gov.ph', 'ESP-8', 8, 'Faith', 240);
  PERFORM pg_temp.add_load(1, 'gerry.cahiles@deped.gov.ph', 'AP-8', 8, 'Faith', 240);
  PERFORM pg_temp.add_load(1, 'renalyn.pujadas@deped.gov.ph', 'TLE-8', 8, 'Faith', 240);
  PERFORM pg_temp.add_load(1, 'nova.fuentes@deped.gov.ph', 'MAPEH-8', 8, 'Faith', 240);
  PERFORM pg_temp.add_load(1, 'renalyn.pujadas@deped.gov.ph', 'HGP-8', 8, 'Faith', 300, 0, 'Class Adviser 8-Faith; Feeding & TLE Coord.');

  -- Grade 8 Love (Term 1)
  PERFORM pg_temp.add_load(1, 'florenda.calotes@deped.gov.ph', 'ENG-8', 8, 'Love', 240);
  PERFORM pg_temp.add_load(1, 'rheljan.casino@deped.gov.ph', 'SCI-8', 8, 'Love', 240);
  PERFORM pg_temp.add_load(1, 'fe.joseph@deped.gov.ph', 'MATH-8', 8, 'Love', 240);
  PERFORM pg_temp.add_load(1, 'warren.clarito@deped.gov.ph', 'FIL-8', 8, 'Love', 240);
  PERFORM pg_temp.add_load(1, 'gerard.aranas@deped.gov.ph', 'ESP-8', 8, 'Love', 240);
  PERFORM pg_temp.add_load(1, 'gerry.cahiles@deped.gov.ph', 'AP-8', 8, 'Love', 240);
  PERFORM pg_temp.add_load(1, 'renalyn.pujadas@deped.gov.ph', 'TLE-8', 8, 'Love', 240);
  PERFORM pg_temp.add_load(1, 'nova.fuentes@deped.gov.ph', 'MAPEH-8', 8, 'Love', 240);
  PERFORM pg_temp.add_load(1, 'florenda.calotes@deped.gov.ph', 'HGP-8', 8, 'Love', 300, 0, 'Class Adviser 8-Love; ARAL, Phil-IRI & 4Ps Coord.');

  -- Grade 9 Honesty (Term 1)
  PERFORM pg_temp.add_load(1, 'liza.cruspero@deped.gov.ph', 'ENG-9', 9, 'Honesty', 240);
  PERFORM pg_temp.add_load(1, 'reah.ong@deped.gov.ph', 'SCI-9', 9, 'Honesty', 240);
  PERFORM pg_temp.add_load(1, 'juliet.lodripas@deped.gov.ph', 'MATH-9', 9, 'Honesty', 240);
  PERFORM pg_temp.add_load(1, 'dellie.vigonte@deped.gov.ph', 'FIL-9', 9, 'Honesty', 240);
  PERFORM pg_temp.add_load(1, 'rayalbert.albaran@deped.gov.ph', 'ESP-9', 9, 'Honesty', 240);
  PERFORM pg_temp.add_load(1, 'gerry.cahiles@deped.gov.ph', 'AP-9', 9, 'Honesty', 240);
  PERFORM pg_temp.add_load(1, 'renalyn.pujadas@deped.gov.ph', 'TLE-9', 9, 'Honesty', 240);
  PERFORM pg_temp.add_load(1, 'nova.fuentes@deped.gov.ph', 'MAPEH-9', 9, 'Honesty', 240);
  PERFORM pg_temp.add_load(1, 'nova.fuentes@deped.gov.ph', 'HGP-9', 9, 'Honesty', 300, 0, 'Class Adviser 9-Honesty; MAPEH & Performing Arts Coord.');

  -- Grade 9 Patience (Term 1)
  PERFORM pg_temp.add_load(1, 'liza.cruspero@deped.gov.ph', 'ENG-9', 9, 'Patience', 240);
  PERFORM pg_temp.add_load(1, 'reah.ong@deped.gov.ph', 'SCI-9', 9, 'Patience', 240);
  PERFORM pg_temp.add_load(1, 'juliet.lodripas@deped.gov.ph', 'MATH-9', 9, 'Patience', 240);
  PERFORM pg_temp.add_load(1, 'dellie.vigonte@deped.gov.ph', 'FIL-9', 9, 'Patience', 240);
  PERFORM pg_temp.add_load(1, 'rayalbert.albaran@deped.gov.ph', 'ESP-9', 9, 'Patience', 240);
  PERFORM pg_temp.add_load(1, 'gerry.cahiles@deped.gov.ph', 'AP-9', 9, 'Patience', 240);
  PERFORM pg_temp.add_load(1, 'renalyn.pujadas@deped.gov.ph', 'TLE-9', 9, 'Patience', 240);
  PERFORM pg_temp.add_load(1, 'nova.fuentes@deped.gov.ph', 'MAPEH-9', 9, 'Patience', 240);
  PERFORM pg_temp.add_load(1, 'rayalbert.albaran@deped.gov.ph', 'HGP-9', 9, 'Patience', 300, 0, 'Class Adviser 9-Patience; LFO JHS & Values Coord.');

  -- Grade 10 Charity (Term 1)
  PERFORM pg_temp.add_load(1, 'dellie.vigonte@deped.gov.ph', 'ENG-10', 10, 'Charity', 240);
  PERFORM pg_temp.add_load(1, 'reah.ong@deped.gov.ph', 'SCI-10', 10, 'Charity', 240);
  PERFORM pg_temp.add_load(1, 'maurine.dumanig@deped.gov.ph', 'MATH-10', 10, 'Charity', 240);
  PERFORM pg_temp.add_load(1, 'maryjane.baluma@deped.gov.ph', 'FIL-10', 10, 'Charity', 240);
  PERFORM pg_temp.add_load(1, 'rayalbert.albaran@deped.gov.ph', 'ESP-10', 10, 'Charity', 240);
  PERFORM pg_temp.add_load(1, 'gerry.cahiles@deped.gov.ph', 'AP-10', 10, 'Charity', 240);
  PERFORM pg_temp.add_load(1, 'florenda.calotes@deped.gov.ph', 'TLE-10', 10, 'Charity', 240);
  PERFORM pg_temp.add_load(1, 'maesheila.lastomen@deped.gov.ph', 'MAPEH-10', 10, 'Charity', 240);
  PERFORM pg_temp.add_load(1, 'gerry.cahiles@deped.gov.ph', 'CAT-10', 10, 'Charity', 60);
  PERFORM pg_temp.add_load(1, 'reah.ong@deped.gov.ph', 'HGP-10', 10, 'Charity', 300, 0, 'Class Adviser 10-Charity; Clinic, WinS, ARH & Science Coord.');

  -- Grade 11 ASSH (Term 1)
  PERFORM pg_temp.add_load(1, 'fe.joseph@deped.gov.ph', 'GENMATH-11', 11, 'ASSH', 300);
  PERFORM pg_temp.add_load(1, 'famelarose.malalis@deped.gov.ph', 'GENSCI-11', 11, 'ASSH', 300);
  PERFORM pg_temp.add_load(1, 'juliet.lodripas@deped.gov.ph', 'LIFECAREER-11', 11, 'ASSH', 300);
  PERFORM pg_temp.add_load(1, 'wiltfrancis.pamaong@deped.gov.ph', 'KASAYSAYAN-11', 11, 'ASSH', 300);
  PERFORM pg_temp.add_load(1, 'dellie.vigonte@deped.gov.ph', 'EFFCOMM-11', 11, 'ASSH', 150);
  PERFORM pg_temp.add_load(1, 'warren.clarito@deped.gov.ph', 'MABISANGKOM-11', 11, 'ASSH', 150);
  PERFORM pg_temp.add_load(1, 'wiltfrancis.pamaong@deped.gov.ph', 'SOCSCI-11', 11, 'ASSH', 480);
  PERFORM pg_temp.add_load(1, 'warren.clarito@deped.gov.ph', 'HGP-11', 11, 'ASSH', 300, 0, 'Class Adviser 11-ASSH; BKD, BSP & YES-O Coord.');

  -- Grade 11 TechPro ICT (Term 1)
  PERFORM pg_temp.add_load(1, 'fe.joseph@deped.gov.ph', 'GENMATH-11', 11, 'TechPro ICT', 300);
  PERFORM pg_temp.add_load(1, 'famelarose.malalis@deped.gov.ph', 'GENSCI-11', 11, 'TechPro ICT', 300);
  PERFORM pg_temp.add_load(1, 'juliet.lodripas@deped.gov.ph', 'LIFECAREER-11', 11, 'TechPro ICT', 300);
  PERFORM pg_temp.add_load(1, 'wiltfrancis.pamaong@deped.gov.ph', 'KASAYSAYAN-11', 11, 'TechPro ICT', 300);
  PERFORM pg_temp.add_load(1, 'dellie.vigonte@deped.gov.ph', 'EFFCOMM-11', 11, 'TechPro ICT', 150);
  PERFORM pg_temp.add_load(1, 'warren.clarito@deped.gov.ph', 'MABISANGKOM-11', 11, 'TechPro ICT', 150);
  PERFORM pg_temp.add_load(1, 'anthonyriel.diango@deped.gov.ph', 'PROGNET-11', 11, 'TechPro ICT', 600);
  PERFORM pg_temp.add_load(1, 'fe.joseph@deped.gov.ph', 'HGP-11', 11, 'TechPro ICT', 300, 0, 'Class Adviser 11-TechPro ICT; SNED, GSP & ADM Coord.');

  -- Grade 12 HUMSS (Term 1)
  PERFORM pg_temp.add_load(1, 'maryjane.baluma@deped.gov.ph', 'CPAR-12', 12, 'HUMSS', 480);
  PERFORM pg_temp.add_load(1, 'maurine.dumanig@deped.gov.ph', 'PRACRES-12', 12, 'HUMSS', 480);
  PERFORM pg_temp.add_load(1, 'necris.tiedra@deped.gov.ph', 'MIL-12', 12, 'HUMSS', 480);
  PERFORM pg_temp.add_load(1, 'maesheila.lastomen@deped.gov.ph', 'TRENDS-12', 12, 'HUMSS', 480);
  PERFORM pg_temp.add_load(1, 'liza.cruspero@deped.gov.ph', 'CREATIVEWRITING-12', 12, 'HUMSS', 480);
  PERFORM pg_temp.add_load(1, 'maesheila.lastomen@deped.gov.ph', 'HGP-12', 12, 'HUMSS', 300, 0, 'Class Adviser 12-HUMSS; Sports Coordinator');

  -- Grade 12 ICT (Term 1)
  PERFORM pg_temp.add_load(1, 'famelarose.malalis@deped.gov.ph', 'CPAR-12', 12, 'ICT', 480);
  PERFORM pg_temp.add_load(1, 'maurine.dumanig@deped.gov.ph', 'PRACRES-12', 12, 'ICT', 480);
  PERFORM pg_temp.add_load(1, 'necris.tiedra@deped.gov.ph', 'MIL-12', 12, 'ICT', 480);
  PERFORM pg_temp.add_load(1, 'gerard.aranas@deped.gov.ph', 'HOPE3-12', 12, 'ICT', 240);
  PERFORM pg_temp.add_load(1, 'anthonyriel.diango@deped.gov.ph', 'PROGJAVA-12', 12, 'ICT', 600, 300, 'School ICT Coordinator (6 hrs/wk ancillary credit)');
  PERFORM pg_temp.add_load(1, 'famelarose.malalis@deped.gov.ph', 'HGP-12', 12, 'ICT', 300, 0, 'Class Adviser 12-ICT; Arts Club & Career Advocate');
END $$;

-- ============================================================================
-- 12. SEED TERM 2 LOADS (SY 2026-2027 TERM 2 CSV: 27,180 MINS)
-- ============================================================================
DO $$
BEGIN
  -- Grade 7 Peace (Term 2)
  PERFORM pg_temp.add_load(2, 'florenda.calotes@deped.gov.ph', 'ENG-7', 7, 'Peace', 240);
  PERFORM pg_temp.add_load(2, 'rheljan.casino@deped.gov.ph', 'SCI-7', 7, 'Peace', 240);
  PERFORM pg_temp.add_load(2, 'necris.tiedra@deped.gov.ph', 'MATH-7', 7, 'Peace', 240);
  PERFORM pg_temp.add_load(2, 'maryjane.baluma@deped.gov.ph', 'FIL-7', 7, 'Peace', 240);
  PERFORM pg_temp.add_load(2, 'gerard.aranas@deped.gov.ph', 'ESP-7', 7, 'Peace', 240);
  PERFORM pg_temp.add_load(2, 'gerard.aranas@deped.gov.ph', 'AP-7', 7, 'Peace', 240);
  PERFORM pg_temp.add_load(2, 'ruthlyn.solis@deped.gov.ph', 'TLE-7', 7, 'Peace', 240);
  PERFORM pg_temp.add_load(2, 'maesheila.lastomen@deped.gov.ph', 'MAPEH-7', 7, 'Peace', 240);
  PERFORM pg_temp.add_load(2, 'maryjane.baluma@deped.gov.ph', 'HGP-7', 7, 'Peace', 300, 0, 'Class Adviser 7-Peace; Canteen Mgr, Filipino & DRRM Coord.');
  PERFORM pg_temp.add_load(2, 'reah.ong@deped.gov.ph', 'ARAL-7', 7, 'Peace', 120);

  -- Grade 8 Faith (Term 2)
  PERFORM pg_temp.add_load(2, 'florenda.calotes@deped.gov.ph', 'ENG-8', 8, 'Faith', 240);
  PERFORM pg_temp.add_load(2, 'rheljan.casino@deped.gov.ph', 'SCI-8', 8, 'Faith', 240);
  PERFORM pg_temp.add_load(2, 'fe.joseph@deped.gov.ph', 'MATH-8', 8, 'Faith', 240);
  PERFORM pg_temp.add_load(2, 'warren.clarito@deped.gov.ph', 'FIL-8', 8, 'Faith', 240);
  PERFORM pg_temp.add_load(2, 'gerard.aranas@deped.gov.ph', 'ESP-8', 8, 'Faith', 240);
  PERFORM pg_temp.add_load(2, 'gerry.cahiles@deped.gov.ph', 'AP-8', 8, 'Faith', 240);
  PERFORM pg_temp.add_load(2, 'renalyn.pujadas@deped.gov.ph', 'TLE-8', 8, 'Faith', 240);
  PERFORM pg_temp.add_load(2, 'nova.fuentes@deped.gov.ph', 'MAPEH-8', 8, 'Faith', 240);
  PERFORM pg_temp.add_load(2, 'renalyn.pujadas@deped.gov.ph', 'HGP-8', 8, 'Faith', 300, 0, 'Class Adviser 8-Faith; Feeding & TLE Coord.');
  PERFORM pg_temp.add_load(2, 'rheljan.casino@deped.gov.ph', 'ARAL-8', 8, 'Faith', 120);

  -- Grade 8 Love (Term 2)
  PERFORM pg_temp.add_load(2, 'florenda.calotes@deped.gov.ph', 'ENG-8', 8, 'Love', 240);
  PERFORM pg_temp.add_load(2, 'rheljan.casino@deped.gov.ph', 'SCI-8', 8, 'Love', 240);
  PERFORM pg_temp.add_load(2, 'fe.joseph@deped.gov.ph', 'MATH-8', 8, 'Love', 240);
  PERFORM pg_temp.add_load(2, 'warren.clarito@deped.gov.ph', 'FIL-8', 8, 'Love', 240);
  PERFORM pg_temp.add_load(2, 'gerard.aranas@deped.gov.ph', 'ESP-8', 8, 'Love', 240);
  PERFORM pg_temp.add_load(2, 'gerry.cahiles@deped.gov.ph', 'AP-8', 8, 'Love', 240);
  PERFORM pg_temp.add_load(2, 'renalyn.pujadas@deped.gov.ph', 'TLE-8', 8, 'Love', 240);
  PERFORM pg_temp.add_load(2, 'nova.fuentes@deped.gov.ph', 'MAPEH-8', 8, 'Love', 240);
  PERFORM pg_temp.add_load(2, 'florenda.calotes@deped.gov.ph', 'HGP-8', 8, 'Love', 300, 0, 'Class Adviser 8-Love; ARAL & Phil-IRI/Reading Coord.');
  PERFORM pg_temp.add_load(2, 'warren.clarito@deped.gov.ph', 'ARAL-8', 8, 'Love', 120);

  -- Grade 9 Honesty (Term 2)
  PERFORM pg_temp.add_load(2, 'liza.cruspero@deped.gov.ph', 'ENG-9', 9, 'Honesty', 240);
  PERFORM pg_temp.add_load(2, 'reah.ong@deped.gov.ph', 'SCI-9', 9, 'Honesty', 240);
  PERFORM pg_temp.add_load(2, 'juliet.lodripas@deped.gov.ph', 'MATH-9', 9, 'Honesty', 240);
  PERFORM pg_temp.add_load(2, 'dellie.vigonte@deped.gov.ph', 'FIL-9', 9, 'Honesty', 240);
  PERFORM pg_temp.add_load(2, 'rayalbert.albaran@deped.gov.ph', 'ESP-9', 9, 'Honesty', 240);
  PERFORM pg_temp.add_load(2, 'gerry.cahiles@deped.gov.ph', 'AP-9', 9, 'Honesty', 240);
  PERFORM pg_temp.add_load(2, 'renalyn.pujadas@deped.gov.ph', 'TLE-9', 9, 'Honesty', 240);
  PERFORM pg_temp.add_load(2, 'nova.fuentes@deped.gov.ph', 'MAPEH-9', 9, 'Honesty', 240);
  PERFORM pg_temp.add_load(2, 'nova.fuentes@deped.gov.ph', 'HGP-9', 9, 'Honesty', 300, 0, 'Class Adviser 9-Honesty; MAPEH & Performing Arts Coord.');
  PERFORM pg_temp.add_load(2, 'rayalbert.albaran@deped.gov.ph', 'ARAL-9', 9, 'Honesty', 120);

  -- Grade 9 Patience (Term 2)
  PERFORM pg_temp.add_load(2, 'liza.cruspero@deped.gov.ph', 'ENG-9', 9, 'Patience', 240);
  PERFORM pg_temp.add_load(2, 'reah.ong@deped.gov.ph', 'SCI-9', 9, 'Patience', 240);
  PERFORM pg_temp.add_load(2, 'juliet.lodripas@deped.gov.ph', 'MATH-9', 9, 'Patience', 240);
  PERFORM pg_temp.add_load(2, 'dellie.vigonte@deped.gov.ph', 'FIL-9', 9, 'Patience', 240);
  PERFORM pg_temp.add_load(2, 'rayalbert.albaran@deped.gov.ph', 'ESP-9', 9, 'Patience', 240);
  PERFORM pg_temp.add_load(2, 'gerry.cahiles@deped.gov.ph', 'AP-9', 9, 'Patience', 240);
  PERFORM pg_temp.add_load(2, 'renalyn.pujadas@deped.gov.ph', 'TLE-9', 9, 'Patience', 240);
  PERFORM pg_temp.add_load(2, 'nova.fuentes@deped.gov.ph', 'MAPEH-9', 9, 'Patience', 240);
  PERFORM pg_temp.add_load(2, 'rayalbert.albaran@deped.gov.ph', 'HGP-9', 9, 'Patience', 300, 0, 'Class Adviser 9-Patience; LFO JHS & Values Coord.');
  PERFORM pg_temp.add_load(2, 'gerry.cahiles@deped.gov.ph', 'ARAL-9', 9, 'Patience', 120);

  -- Grade 10 Charity (Term 2)
  PERFORM pg_temp.add_load(2, 'dellie.vigonte@deped.gov.ph', 'ENG-10', 10, 'Charity', 240);
  PERFORM pg_temp.add_load(2, 'reah.ong@deped.gov.ph', 'SCI-10', 10, 'Charity', 240);
  PERFORM pg_temp.add_load(2, 'maurine.dumanig@deped.gov.ph', 'MATH-10', 10, 'Charity', 240);
  PERFORM pg_temp.add_load(2, 'maryjane.baluma@deped.gov.ph', 'FIL-10', 10, 'Charity', 240);
  PERFORM pg_temp.add_load(2, 'rayalbert.albaran@deped.gov.ph', 'ESP-10', 10, 'Charity', 240);
  PERFORM pg_temp.add_load(2, 'rheljan.casino@deped.gov.ph', 'AP-10', 10, 'Charity', 240);
  PERFORM pg_temp.add_load(2, 'florenda.calotes@deped.gov.ph', 'TLE-10', 10, 'Charity', 240);
  PERFORM pg_temp.add_load(2, 'maesheila.lastomen@deped.gov.ph', 'MAPEH-10', 10, 'Charity', 240);
  PERFORM pg_temp.add_load(2, 'gerry.cahiles@deped.gov.ph', 'CAT-10', 10, 'Charity', 60);
  PERFORM pg_temp.add_load(2, 'reah.ong@deped.gov.ph', 'HGP-10', 10, 'Charity', 300, 0, 'Class Adviser 10-Charity; Clinic, WinS, RCY & Science Coord.');
  PERFORM pg_temp.add_load(2, 'juliet.lodripas@deped.gov.ph', 'ARAL-10', 10, 'Charity', 120);
  PERFORM pg_temp.add_load(2, 'gerard.aranas@deped.gov.ph', 'ARAL-10', 10, 'Charity', 120);

  -- Grade 11 ASSH (Term 2)
  PERFORM pg_temp.add_load(2, 'fe.joseph@deped.gov.ph', 'GENMATH-11', 11, 'ASSH', 300);
  PERFORM pg_temp.add_load(2, 'famelarose.malalis@deped.gov.ph', 'GENSCI-11', 11, 'ASSH', 300);
  PERFORM pg_temp.add_load(2, 'juliet.lodripas@deped.gov.ph', 'LIFECAREER-11', 11, 'ASSH', 300);
  PERFORM pg_temp.add_load(2, 'wiltfrancis.pamaong@deped.gov.ph', 'KASAYSAYAN-11', 11, 'ASSH', 300);
  PERFORM pg_temp.add_load(2, 'dellie.vigonte@deped.gov.ph', 'EFFCOMM-11', 11, 'ASSH', 150);
  PERFORM pg_temp.add_load(2, 'warren.clarito@deped.gov.ph', 'MABISANGKOM-11', 11, 'ASSH', 150);
  PERFORM pg_temp.add_load(2, 'wiltfrancis.pamaong@deped.gov.ph', 'PHILO-11', 11, 'ASSH', 480);
  PERFORM pg_temp.add_load(2, 'warren.clarito@deped.gov.ph', 'HGP-11', 11, 'ASSH', 300, 0, 'Class Adviser 11-ASSH; BKD & BSP Coord.');
  PERFORM pg_temp.add_load(2, 'gerard.aranas@deped.gov.ph', 'ARAL-11', 11, 'ASSH', 180);

  -- Grade 11 TechPro ICT (Term 2)
  PERFORM pg_temp.add_load(2, 'fe.joseph@deped.gov.ph', 'GENMATH-11', 11, 'TechPro ICT', 300);
  PERFORM pg_temp.add_load(2, 'famelarose.malalis@deped.gov.ph', 'GENSCI-11', 11, 'TechPro ICT', 300);
  PERFORM pg_temp.add_load(2, 'juliet.lodripas@deped.gov.ph', 'LIFECAREER-11', 11, 'TechPro ICT', 300);
  PERFORM pg_temp.add_load(2, 'wiltfrancis.pamaong@deped.gov.ph', 'KASAYSAYAN-11', 11, 'TechPro ICT', 300);
  PERFORM pg_temp.add_load(2, 'dellie.vigonte@deped.gov.ph', 'EFFCOMM-11', 11, 'TechPro ICT', 150);
  PERFORM pg_temp.add_load(2, 'warren.clarito@deped.gov.ph', 'MABISANGKOM-11', 11, 'TechPro ICT', 150);
  PERFORM pg_temp.add_load(2, 'anthonyriel.diango@deped.gov.ph', 'PROGNET-11', 11, 'TechPro ICT', 600);
  PERFORM pg_temp.add_load(2, 'fe.joseph@deped.gov.ph', 'HGP-11', 11, 'TechPro ICT', 300, 0, 'Class Adviser 11-TechPro ICT; SNED, GSP & ADM Coord.');
  PERFORM pg_temp.add_load(2, 'necris.tiedra@deped.gov.ph', 'ARAL-11', 11, 'TechPro ICT', 120);

  -- Grade 12 HUMSS (Term 2)
  PERFORM pg_temp.add_load(2, 'maryjane.baluma@deped.gov.ph', 'PHILO-12', 12, 'HUMSS', 480);
  PERFORM pg_temp.add_load(2, 'maurine.dumanig@deped.gov.ph', 'III-12', 12, 'HUMSS', 480);
  PERFORM pg_temp.add_load(2, 'ruthlyn.solis@deped.gov.ph', 'EMPTECH-12', 12, 'HUMSS', 480);
  PERFORM pg_temp.add_load(2, 'maesheila.lastomen@deped.gov.ph', 'PERDEV-12', 12, 'HUMSS', 480);
  PERFORM pg_temp.add_load(2, 'liza.cruspero@deped.gov.ph', 'CREATIVENONFIC-12', 12, 'HUMSS', 480);
  PERFORM pg_temp.add_load(2, 'necris.tiedra@deped.gov.ph', 'HOPE3-12', 12, 'HUMSS', 120);
  PERFORM pg_temp.add_load(2, 'wiltfrancis.pamaong@deped.gov.ph', 'DIASS-12', 12, 'HUMSS', 120);
  PERFORM pg_temp.add_load(2, 'necris.tiedra@deped.gov.ph', 'WORLDREL-12', 12, 'HUMSS', 60);
  PERFORM pg_temp.add_load(2, 'maesheila.lastomen@deped.gov.ph', 'HGP-12', 12, 'HUMSS', 300, 0, 'Class Adviser 12-HUMSS; Sports Coordinator');

  -- Grade 12 ICT (Term 2)
  PERFORM pg_temp.add_load(2, 'famelarose.malalis@deped.gov.ph', 'PERDEV-12', 12, 'ICT', 480);
  PERFORM pg_temp.add_load(2, 'maurine.dumanig@deped.gov.ph', 'III-12', 12, 'ICT', 480);
  PERFORM pg_temp.add_load(2, 'ruthlyn.solis@deped.gov.ph', 'EMPTECH-12', 12, 'ICT', 480);
  PERFORM pg_temp.add_load(2, 'anthonyriel.diango@deped.gov.ph', 'PROGJAVA-12', 12, 'ICT', 840, 300, 'School ICT Coordinator (6 hrs/wk ancillary credit)');
  PERFORM pg_temp.add_load(2, 'famelarose.malalis@deped.gov.ph', 'HGP-12', 12, 'ICT', 300, 0, 'Class Adviser 12-ICT; Arts Club & Career Advocate');
  PERFORM pg_temp.add_load(2, 'gerry.cahiles@deped.gov.ph', 'ARAL-12', 12, 'ICT', 60);
END $$;

-- ============================================================================
-- 13. POPULATE CONFLICT-FREE WEEKLY TIMETABLE FOR TERM 2 (PRIMARY CLASS PROGRAM)
-- ============================================================================
DO $$
DECLARE
  M_F TEXT[] := ARRAY['Monday','Tuesday','Wednesday','Thursday','Friday'];
  M_TH TEXT[] := ARRAY['Monday','Tuesday','Wednesday','Thursday'];
  TU_F TEXT[] := ARRAY['Tuesday','Wednesday','Thursday','Friday'];
BEGIN
  -- PERIOD 1 (08:00 - 09:00)
  PERFORM pg_temp.add_slot(2, 'maryjane.baluma@deped.gov.ph',    'HGP-7',        7,  'Peace',       1, ARRAY['Monday']);
  PERFORM pg_temp.add_slot(2, 'maryjane.baluma@deped.gov.ph',    'FIL-7',        7,  'Peace',       1, TU_F);
  PERFORM pg_temp.add_slot(2, 'renalyn.pujadas@deped.gov.ph',    'HGP-8',        8,  'Faith',       1, ARRAY['Monday']);
  PERFORM pg_temp.add_slot(2, 'renalyn.pujadas@deped.gov.ph',    'TLE-8',        8,  'Faith',       1, TU_F);
  PERFORM pg_temp.add_slot(2, 'florenda.calotes@deped.gov.ph',   'HGP-8',        8,  'Love',        1, ARRAY['Monday']);
  PERFORM pg_temp.add_slot(2, 'florenda.calotes@deped.gov.ph',   'ENG-8',        8,  'Love',        1, TU_F);
  PERFORM pg_temp.add_slot(2, 'nova.fuentes@deped.gov.ph',       'HGP-9',        9,  'Honesty',     1, ARRAY['Monday']);
  PERFORM pg_temp.add_slot(2, 'nova.fuentes@deped.gov.ph',       'MAPEH-9',      9,  'Honesty',     1, TU_F);
  PERFORM pg_temp.add_slot(2, 'rayalbert.albaran@deped.gov.ph',  'HGP-9',        9,  'Patience',    1, ARRAY['Monday']);
  PERFORM pg_temp.add_slot(2, 'rayalbert.albaran@deped.gov.ph',  'ESP-9',        9,  'Patience',    1, TU_F);
  PERFORM pg_temp.add_slot(2, 'reah.ong@deped.gov.ph',           'HGP-10',       10, 'Charity',     1, ARRAY['Monday']);
  PERFORM pg_temp.add_slot(2, 'reah.ong@deped.gov.ph',           'SCI-10',       10, 'Charity',     1, TU_F, 'SCI-LAB');
  PERFORM pg_temp.add_slot(2, 'warren.clarito@deped.gov.ph',     'MABISANGKOM-11', 11, 'ASSH',      1, ARRAY['Monday','Tuesday','Wednesday']);
  PERFORM pg_temp.add_slot(2, 'dellie.vigonte@deped.gov.ph',     'EFFCOMM-11',   11, 'ASSH',        1, ARRAY['Thursday','Friday']);
  PERFORM pg_temp.add_slot(2, 'fe.joseph@deped.gov.ph',          'GENMATH-11',   11, 'TechPro ICT', 1, M_F);
  PERFORM pg_temp.add_slot(2, 'maesheila.lastomen@deped.gov.ph', 'PERDEV-12',    12, 'HUMSS',       1, M_F);
  PERFORM pg_temp.add_slot(2, 'famelarose.malalis@deped.gov.ph', 'PERDEV-12',    12, 'ICT',         1, M_F);

  -- PERIOD 2 (09:00 - 10:00)
  PERFORM pg_temp.add_slot(2, 'florenda.calotes@deped.gov.ph',   'ENG-7',        7,  'Peace',       2, M_F);
  PERFORM pg_temp.add_slot(2, 'fe.joseph@deped.gov.ph',          'MATH-8',       8,  'Faith',       2, M_TH);
  PERFORM pg_temp.add_slot(2, 'rheljan.casino@deped.gov.ph',     'ARAL-8',       8,  'Faith',       2, ARRAY['Friday']);
  PERFORM pg_temp.add_slot(2, 'rheljan.casino@deped.gov.ph',     'SCI-8',        8,  'Love',        2, ARRAY['Monday','Tuesday','Thursday','Friday'], 'SCI-LAB');
  PERFORM pg_temp.add_slot(2, 'warren.clarito@deped.gov.ph',     'ARAL-8',       8,  'Love',        2, ARRAY['Wednesday']);
  PERFORM pg_temp.add_slot(2, 'juliet.lodripas@deped.gov.ph',    'MATH-9',       9,  'Honesty',     2, M_TH);
  PERFORM pg_temp.add_slot(2, 'rayalbert.albaran@deped.gov.ph',  'ARAL-9',       9,  'Honesty',     2, ARRAY['Friday']);
  PERFORM pg_temp.add_slot(2, 'reah.ong@deped.gov.ph',           'SCI-9',        9,  'Patience',    2, ARRAY['Monday','Wednesday','Thursday','Friday'], 'SCI-LAB');
  PERFORM pg_temp.add_slot(2, 'gerry.cahiles@deped.gov.ph',      'ARAL-9',       9,  'Patience',    2, ARRAY['Tuesday']);
  PERFORM pg_temp.add_slot(2, 'maurine.dumanig@deped.gov.ph',    'MATH-10',      10, 'Charity',     2, M_F);
  PERFORM pg_temp.add_slot(2, 'wiltfrancis.pamaong@deped.gov.ph','KASAYSAYAN-11',11, 'ASSH',        2, M_F);
  PERFORM pg_temp.add_slot(2, 'dellie.vigonte@deped.gov.ph',     'EFFCOMM-11',   11, 'TechPro ICT', 2, ARRAY['Monday','Tuesday','Wednesday']);
  PERFORM pg_temp.add_slot(2, 'warren.clarito@deped.gov.ph',     'MABISANGKOM-11',11, 'TechPro ICT',2, ARRAY['Thursday','Friday']);
  PERFORM pg_temp.add_slot(2, 'maesheila.lastomen@deped.gov.ph', 'PERDEV-12',    12, 'HUMSS',       2, ARRAY['Monday','Tuesday','Wednesday']);
  PERFORM pg_temp.add_slot(2, 'maryjane.baluma@deped.gov.ph',    'PHILO-12',     12, 'HUMSS',       2, ARRAY['Thursday','Friday']);
  PERFORM pg_temp.add_slot(2, 'famelarose.malalis@deped.gov.ph', 'PERDEV-12',    12, 'ICT',         2, ARRAY['Monday','Tuesday','Wednesday']);
  PERFORM pg_temp.add_slot(2, 'ruthlyn.solis@deped.gov.ph',      'EMPTECH-12',   12, 'ICT',         2, ARRAY['Thursday','Friday'], 'COMP-LAB');

  -- PERIOD 3 (10:00 - 11:00)
  PERFORM pg_temp.add_slot(2, 'necris.tiedra@deped.gov.ph',      'MATH-7',       7,  'Peace',       3, M_TH);
  PERFORM pg_temp.add_slot(2, 'reah.ong@deped.gov.ph',           'ARAL-7',       7,  'Peace',       3, ARRAY['Friday']);
  PERFORM pg_temp.add_slot(2, 'rheljan.casino@deped.gov.ph',     'SCI-8',        8,  'Faith',       3, M_TH, 'SCI-LAB');
  PERFORM pg_temp.add_slot(2, 'gerard.aranas@deped.gov.ph',      'ESP-8',        8,  'Love',        3, M_TH);
  PERFORM pg_temp.add_slot(2, 'warren.clarito@deped.gov.ph',     'ARAL-8',       8,  'Love',        3, ARRAY['Friday']);
  PERFORM pg_temp.add_slot(2, 'liza.cruspero@deped.gov.ph',      'ENG-9',        9,  'Honesty',     3, M_F);
  PERFORM pg_temp.add_slot(2, 'juliet.lodripas@deped.gov.ph',    'MATH-9',       9,  'Patience',    3, M_TH);
  PERFORM pg_temp.add_slot(2, 'florenda.calotes@deped.gov.ph',   'TLE-10',       10, 'Charity',     3, M_TH, 'TVL-WORK');
  PERFORM pg_temp.add_slot(2, 'gerard.aranas@deped.gov.ph',      'ARAL-10',      10, 'Charity',     3, ARRAY['Friday']);
  PERFORM pg_temp.add_slot(2, 'wiltfrancis.pamaong@deped.gov.ph','PHILO-11',     11, 'ASSH',        3, M_F);
  PERFORM pg_temp.add_slot(2, 'anthonyriel.diango@deped.gov.ph', 'PROGNET-11',   11, 'TechPro ICT', 3, M_F, 'COMP-LAB');
  PERFORM pg_temp.add_slot(2, 'maryjane.baluma@deped.gov.ph',    'PHILO-12',     12, 'HUMSS',       3, ARRAY['Monday','Tuesday','Wednesday','Friday']);
  PERFORM pg_temp.add_slot(2, 'ruthlyn.solis@deped.gov.ph',      'EMPTECH-12',   12, 'HUMSS',       3, ARRAY['Thursday']);
  PERFORM pg_temp.add_slot(2, 'maurine.dumanig@deped.gov.ph',    'III-12',       12, 'ICT',         3, ARRAY['Monday','Tuesday','Thursday']);
  PERFORM pg_temp.add_slot(2, 'ruthlyn.solis@deped.gov.ph',      'EMPTECH-12',   12, 'ICT',         3, ARRAY['Wednesday','Friday']);

  -- PERIOD 4 (11:00 - 12:00)
  PERFORM pg_temp.add_slot(2, 'rheljan.casino@deped.gov.ph',     'SCI-7',        7,  'Peace',       4, ARRAY['Monday','Tuesday','Wednesday','Friday'], 'SCI-LAB');
  PERFORM pg_temp.add_slot(2, 'necris.tiedra@deped.gov.ph',      'MATH-7',       7,  'Peace',       4, ARRAY['Thursday']);
  PERFORM pg_temp.add_slot(2, 'florenda.calotes@deped.gov.ph',   'ENG-8',        8,  'Faith',       4, M_TH);
  PERFORM pg_temp.add_slot(2, 'fe.joseph@deped.gov.ph',          'MATH-8',       8,  'Love',        4, M_TH);
  PERFORM pg_temp.add_slot(2, 'reah.ong@deped.gov.ph',           'SCI-9',        9,  'Honesty',     4, ARRAY['Monday','Wednesday','Thursday','Friday'], 'SCI-LAB');
  PERFORM pg_temp.add_slot(2, 'liza.cruspero@deped.gov.ph',      'ENG-9',        9,  'Patience',    4, M_F);
  PERFORM pg_temp.add_slot(2, 'dellie.vigonte@deped.gov.ph',     'ENG-10',       10, 'Charity',     4, M_TH);
  PERFORM pg_temp.add_slot(2, 'juliet.lodripas@deped.gov.ph',    'ARAL-10',      10, 'Charity',     4, ARRAY['Friday']);
  PERFORM pg_temp.add_slot(2, 'wiltfrancis.pamaong@deped.gov.ph','PHILO-11',     11, 'ASSH',        4, ARRAY['Monday','Thursday','Friday']);
  PERFORM pg_temp.add_slot(2, 'gerard.aranas@deped.gov.ph',      'ARAL-11',      11, 'ASSH',        4, ARRAY['Tuesday','Wednesday']);
  PERFORM pg_temp.add_slot(2, 'anthonyriel.diango@deped.gov.ph', 'PROGNET-11',   11, 'TechPro ICT', 4, M_F, 'COMP-LAB');
  PERFORM pg_temp.add_slot(2, 'ruthlyn.solis@deped.gov.ph',      'EMPTECH-12',   12, 'HUMSS',       4, M_F);
  PERFORM pg_temp.add_slot(2, 'maurine.dumanig@deped.gov.ph',    'III-12',       12, 'ICT',         4, M_F);

  -- PERIOD 5 (12:40/1:00 - 2:00 PM)
  PERFORM pg_temp.add_slot(2, 'maesheila.lastomen@deped.gov.ph', 'MAPEH-7',      7,  'Peace',       6, ARRAY['Monday','Tuesday','Wednesday','Friday']);
  PERFORM pg_temp.add_slot(2, 'reah.ong@deped.gov.ph',           'ARAL-7',       7,  'Peace',       6, ARRAY['Thursday']);
  PERFORM pg_temp.add_slot(2, 'gerard.aranas@deped.gov.ph',      'ESP-8',        8,  'Faith',       6, M_F);
  PERFORM pg_temp.add_slot(2, 'nova.fuentes@deped.gov.ph',       'MAPEH-8',      8,  'Love',        6, ARRAY['Monday','Tuesday','Thursday','Friday']);
  PERFORM pg_temp.add_slot(2, 'rheljan.casino@deped.gov.ph',     'ARAL-8',       8,  'Love',        6, ARRAY['Wednesday']);
  PERFORM pg_temp.add_slot(2, 'rayalbert.albaran@deped.gov.ph',  'ESP-9',        9,  'Honesty',     6, M_F);
  PERFORM pg_temp.add_slot(2, 'gerry.cahiles@deped.gov.ph',      'AP-9',         9,  'Patience',    6, ARRAY['Monday','Tuesday','Wednesday','Friday']);
  PERFORM pg_temp.add_slot(2, 'maryjane.baluma@deped.gov.ph',    'FIL-10',       10, 'Charity',     6, ARRAY['Monday','Wednesday','Thursday','Friday']);
  PERFORM pg_temp.add_slot(2, 'fe.joseph@deped.gov.ph',          'GENMATH-11',   11, 'ASSH',        6, M_F);
  PERFORM pg_temp.add_slot(2, 'famelarose.malalis@deped.gov.ph', 'GENSCI-11',    11, 'TechPro ICT', 6, M_F, 'SCI-LAB');
  PERFORM pg_temp.add_slot(2, 'maryjane.baluma@deped.gov.ph',    'PHILO-12',     12, 'HUMSS',       6, ARRAY['Monday','Wednesday']);
  PERFORM pg_temp.add_slot(2, 'liza.cruspero@deped.gov.ph',      'CREATIVENONFIC-12', 12, 'HUMSS',  6, ARRAY['Tuesday','Thursday','Friday']);
  PERFORM pg_temp.add_slot(2, 'anthonyriel.diango@deped.gov.ph', 'PROGJAVA-12',  12, 'ICT',         6, M_F, 'COMP-LAB');

  -- PERIOD 6 (1:30/2:00 - 3:00 PM)
  PERFORM pg_temp.add_slot(2, 'ruthlyn.solis@deped.gov.ph',      'TLE-7',        7,  'Peace',       7, ARRAY['Monday','Tuesday','Thursday','Friday'], 'TVL-WORK');
  PERFORM pg_temp.add_slot(2, 'gerard.aranas@deped.gov.ph',      'ESP-7',        7,  'Peace',       7, ARRAY['Wednesday']);
  PERFORM pg_temp.add_slot(2, 'gerry.cahiles@deped.gov.ph',      'AP-8',         8,  'Faith',       7, M_TH);
  PERFORM pg_temp.add_slot(2, 'warren.clarito@deped.gov.ph',     'FIL-8',        8,  'Love',        7, ARRAY['Monday','Tuesday','Thursday','Friday']);
  PERFORM pg_temp.add_slot(2, 'dellie.vigonte@deped.gov.ph',     'FIL-9',        9,  'Honesty',     7, ARRAY['Monday','Wednesday','Thursday','Friday']);
  PERFORM pg_temp.add_slot(2, 'renalyn.pujadas@deped.gov.ph',    'TLE-9',        9,  'Patience',    7, ARRAY['Monday','Tuesday','Thursday','Friday'], 'TVL-WORK');
  PERFORM pg_temp.add_slot(2, 'rayalbert.albaran@deped.gov.ph',  'ESP-10',       10, 'Charity',     7, M_TH);
  PERFORM pg_temp.add_slot(2, 'gerry.cahiles@deped.gov.ph',      'CAT-10',       10, 'Charity',     7, ARRAY['Friday']);
  PERFORM pg_temp.add_slot(2, 'juliet.lodripas@deped.gov.ph',    'LIFECAREER-11',11, 'ASSH',        7, M_F);
  PERFORM pg_temp.add_slot(2, 'wiltfrancis.pamaong@deped.gov.ph','KASAYSAYAN-11',11, 'TechPro ICT', 7, M_F);
  PERFORM pg_temp.add_slot(2, 'liza.cruspero@deped.gov.ph',      'CREATIVENONFIC-12', 12, 'HUMSS',  7, M_F);
  PERFORM pg_temp.add_slot(2, 'anthonyriel.diango@deped.gov.ph', 'PROGJAVA-12',  12, 'ICT',         7, M_F, 'COMP-LAB');

  -- PERIOD 7 (2:20/3:00 - 4:00 PM)
  PERFORM pg_temp.add_slot(2, 'gerard.aranas@deped.gov.ph',      'AP-7',         7,  'Peace',       8, ARRAY['Monday','Tuesday','Thursday','Friday']);
  PERFORM pg_temp.add_slot(2, 'warren.clarito@deped.gov.ph',     'FIL-8',        8,  'Faith',       8, ARRAY['Monday','Tuesday','Wednesday','Friday']);
  PERFORM pg_temp.add_slot(2, 'gerry.cahiles@deped.gov.ph',      'AP-8',         8,  'Love',        8, ARRAY['Monday','Tuesday','Wednesday','Friday']);
  PERFORM pg_temp.add_slot(2, 'renalyn.pujadas@deped.gov.ph',    'TLE-9',        9,  'Honesty',     8, ARRAY['Monday','Tuesday','Wednesday','Friday'], 'TVL-WORK');
  PERFORM pg_temp.add_slot(2, 'nova.fuentes@deped.gov.ph',       'MAPEH-9',      9,  'Patience',    8, ARRAY['Monday','Wednesday','Thursday','Friday']);
  PERFORM pg_temp.add_slot(2, 'rheljan.casino@deped.gov.ph',     'AP-10',        10, 'Charity',     8, ARRAY['Monday','Tuesday','Thursday','Friday']);
  PERFORM pg_temp.add_slot(2, 'famelarose.malalis@deped.gov.ph', 'GENSCI-11',    11, 'ASSH',        8, M_F, 'SCI-LAB');
  PERFORM pg_temp.add_slot(2, 'juliet.lodripas@deped.gov.ph',    'LIFECAREER-11',11, 'TechPro ICT', 8, M_F);
  PERFORM pg_temp.add_slot(2, 'maurine.dumanig@deped.gov.ph',    'III-12',       12, 'HUMSS',       8, M_F);
  PERFORM pg_temp.add_slot(2, 'ruthlyn.solis@deped.gov.ph',      'EMPTECH-12',   12, 'ICT',         8, ARRAY['Monday'], 'COMP-LAB');
  PERFORM pg_temp.add_slot(2, 'anthonyriel.diango@deped.gov.ph', 'PROGJAVA-12',  12, 'ICT',         8, TU_F, 'COMP-LAB');

  -- PERIOD 8 (3:10 - 4:00 PM JHS)
  PERFORM pg_temp.add_slot(2, 'gerard.aranas@deped.gov.ph',      'ESP-7',        7,  'Peace',       9, ARRAY['Monday','Tuesday','Thursday','Friday']);
  PERFORM pg_temp.add_slot(2, 'nova.fuentes@deped.gov.ph',       'MAPEH-8',      8,  'Faith',       9, ARRAY['Monday','Tuesday','Thursday','Friday']);
  PERFORM pg_temp.add_slot(2, 'renalyn.pujadas@deped.gov.ph',    'TLE-8',        8,  'Love',        9, ARRAY['Monday','Tuesday','Thursday','Friday'], 'TVL-WORK');
  PERFORM pg_temp.add_slot(2, 'gerry.cahiles@deped.gov.ph',      'AP-9',         9,  'Honesty',     9, ARRAY['Monday','Tuesday','Thursday','Friday']);
  PERFORM pg_temp.add_slot(2, 'dellie.vigonte@deped.gov.ph',     'FIL-9',        9,  'Patience',    9, ARRAY['Monday','Tuesday','Thursday','Friday']);
  PERFORM pg_temp.add_slot(2, 'maesheila.lastomen@deped.gov.ph', 'MAPEH-10',     10, 'Charity',     9, M_TH);
  PERFORM pg_temp.add_slot(2, 'wiltfrancis.pamaong@deped.gov.ph','DIASS-12',     12, 'HUMSS',       9, ARRAY['Monday','Wednesday']);

  -- PERIOD 9 (4:00 - 5:00 PM / ARAL, HGP & SHS P8)
  PERFORM pg_temp.add_slot(2, 'necris.tiedra@deped.gov.ph',      'HOPE3-12',     12, 'HUMSS',       10, ARRAY['Monday','Tuesday']);
  PERFORM pg_temp.add_slot(2, 'necris.tiedra@deped.gov.ph',      'WORLDREL-12',  12, 'HUMSS',       10, ARRAY['Wednesday']);
  PERFORM pg_temp.add_slot(2, 'maurine.dumanig@deped.gov.ph',    'III-12',       12, 'HUMSS',       10, ARRAY['Thursday']);
  PERFORM pg_temp.add_slot(2, 'maesheila.lastomen@deped.gov.ph', 'HGP-12',       12, 'HUMSS',       10, ARRAY['Friday']);
  PERFORM pg_temp.add_slot(2, 'ruthlyn.solis@deped.gov.ph',      'EMPTECH-12',   12, 'ICT',         10, ARRAY['Monday','Tuesday','Wednesday'], 'COMP-LAB');
  PERFORM pg_temp.add_slot(2, 'gerry.cahiles@deped.gov.ph',      'ARAL-12',      12, 'ICT',         10, ARRAY['Thursday']);
  PERFORM pg_temp.add_slot(2, 'famelarose.malalis@deped.gov.ph', 'HGP-12',       12, 'ICT',         10, ARRAY['Friday']);
  PERFORM pg_temp.add_slot(2, 'warren.clarito@deped.gov.ph',     'HGP-11',       11, 'ASSH',        10, ARRAY['Friday']);
  PERFORM pg_temp.add_slot(2, 'gerard.aranas@deped.gov.ph',      'ARAL-11',      11, 'ASSH',        10, ARRAY['Tuesday','Thursday']);
  PERFORM pg_temp.add_slot(2, 'necris.tiedra@deped.gov.ph',      'ARAL-11',      11, 'TechPro ICT', 10, ARRAY['Wednesday','Thursday']);
  PERFORM pg_temp.add_slot(2, 'fe.joseph@deped.gov.ph',          'HGP-11',       11, 'TechPro ICT', 10, ARRAY['Friday']);
  PERFORM pg_temp.add_slot(2, 'gerard.aranas@deped.gov.ph',      'ARAL-10',      10, 'Charity',     10, ARRAY['Monday','Wednesday']);
  PERFORM pg_temp.add_slot(2, 'reah.ong@deped.gov.ph',           'ARAL-7',       7,  'Peace',       10, ARRAY['Tuesday','Thursday']);
  PERFORM pg_temp.add_slot(2, 'maryjane.baluma@deped.gov.ph',    'HGP-7',        7,  'Peace',       10, ARRAY['Friday']);
END $$;

-- ============================================================================
-- 14. POPULATE CONFLICT-FREE WEEKLY TIMETABLE FOR TERM 1 (MATCHING TERM 1 LOADS)
-- ============================================================================
DO $$
DECLARE
  M_F TEXT[] := ARRAY['Monday','Tuesday','Wednesday','Thursday','Friday'];
  M_TH TEXT[] := ARRAY['Monday','Tuesday','Wednesday','Thursday'];
  TU_F TEXT[] := ARRAY['Tuesday','Wednesday','Thursday','Friday'];
BEGIN
  -- PERIOD 1 (08:00 - 09:00)
  PERFORM pg_temp.add_slot(1, 'maryjane.baluma@deped.gov.ph',    'HGP-7',        7,  'Peace',       1, ARRAY['Monday']);
  PERFORM pg_temp.add_slot(1, 'maryjane.baluma@deped.gov.ph',    'FIL-7',        7,  'Peace',       1, TU_F);
  PERFORM pg_temp.add_slot(1, 'renalyn.pujadas@deped.gov.ph',    'HGP-8',        8,  'Faith',       1, ARRAY['Monday']);
  PERFORM pg_temp.add_slot(1, 'renalyn.pujadas@deped.gov.ph',    'TLE-8',        8,  'Faith',       1, TU_F);
  PERFORM pg_temp.add_slot(1, 'florenda.calotes@deped.gov.ph',   'HGP-8',        8,  'Love',        1, ARRAY['Monday']);
  PERFORM pg_temp.add_slot(1, 'florenda.calotes@deped.gov.ph',   'ENG-8',        8,  'Love',        1, TU_F);
  PERFORM pg_temp.add_slot(1, 'nova.fuentes@deped.gov.ph',       'HGP-9',        9,  'Honesty',     1, ARRAY['Monday']);
  PERFORM pg_temp.add_slot(1, 'nova.fuentes@deped.gov.ph',       'MAPEH-9',      9,  'Honesty',     1, TU_F);
  PERFORM pg_temp.add_slot(1, 'rayalbert.albaran@deped.gov.ph',  'HGP-9',        9,  'Patience',    1, ARRAY['Monday']);
  PERFORM pg_temp.add_slot(1, 'rayalbert.albaran@deped.gov.ph',  'ESP-9',        9,  'Patience',    1, TU_F);
  PERFORM pg_temp.add_slot(1, 'reah.ong@deped.gov.ph',           'HGP-10',       10, 'Charity',     1, ARRAY['Monday']);
  PERFORM pg_temp.add_slot(1, 'reah.ong@deped.gov.ph',           'SCI-10',       10, 'Charity',     1, TU_F, 'SCI-LAB');
  PERFORM pg_temp.add_slot(1, 'warren.clarito@deped.gov.ph',     'MABISANGKOM-11', 11, 'ASSH',      1, ARRAY['Monday','Tuesday','Wednesday']);
  PERFORM pg_temp.add_slot(1, 'dellie.vigonte@deped.gov.ph',     'EFFCOMM-11',   11, 'ASSH',        1, ARRAY['Thursday','Friday']);
  PERFORM pg_temp.add_slot(1, 'fe.joseph@deped.gov.ph',          'GENMATH-11',   11, 'TechPro ICT', 1, M_F);
  PERFORM pg_temp.add_slot(1, 'maesheila.lastomen@deped.gov.ph', 'TRENDS-12',    12, 'HUMSS',       1, M_F);
  PERFORM pg_temp.add_slot(1, 'famelarose.malalis@deped.gov.ph', 'CPAR-12',      12, 'ICT',         1, M_F);

  -- PERIOD 2 (09:00 - 10:00)
  PERFORM pg_temp.add_slot(1, 'liza.cruspero@deped.gov.ph',      'ENG-7',        7,  'Peace',       2, M_TH);
  PERFORM pg_temp.add_slot(1, 'fe.joseph@deped.gov.ph',          'MATH-8',       8,  'Faith',       2, M_TH);
  PERFORM pg_temp.add_slot(1, 'rheljan.casino@deped.gov.ph',     'SCI-8',        8,  'Love',        2, M_TH, 'SCI-LAB');
  PERFORM pg_temp.add_slot(1, 'juliet.lodripas@deped.gov.ph',    'MATH-9',       9,  'Honesty',     2, M_TH);
  PERFORM pg_temp.add_slot(1, 'reah.ong@deped.gov.ph',           'SCI-9',        9,  'Patience',    2, M_TH, 'SCI-LAB');
  PERFORM pg_temp.add_slot(1, 'maurine.dumanig@deped.gov.ph',    'MATH-10',      10, 'Charity',     2, M_F);
  PERFORM pg_temp.add_slot(1, 'wiltfrancis.pamaong@deped.gov.ph','KASAYSAYAN-11',11, 'ASSH',        2, M_F);
  PERFORM pg_temp.add_slot(1, 'dellie.vigonte@deped.gov.ph',     'EFFCOMM-11',   11, 'TechPro ICT', 2, ARRAY['Monday','Tuesday','Wednesday']);
  PERFORM pg_temp.add_slot(1, 'warren.clarito@deped.gov.ph',     'MABISANGKOM-11',11, 'TechPro ICT',2, ARRAY['Thursday','Friday']);
  PERFORM pg_temp.add_slot(1, 'maryjane.baluma@deped.gov.ph',    'CPAR-12',      12, 'HUMSS',       2, M_F);
  PERFORM pg_temp.add_slot(1, 'necris.tiedra@deped.gov.ph',      'MIL-12',       12, 'ICT',         2, M_F);

  -- PERIOD 3 (10:00 - 11:00)
  PERFORM pg_temp.add_slot(1, 'necris.tiedra@deped.gov.ph',      'MATH-7',       7,  'Peace',       3, M_TH);
  PERFORM pg_temp.add_slot(1, 'rheljan.casino@deped.gov.ph',     'SCI-8',        8,  'Faith',       3, M_TH, 'SCI-LAB');
  PERFORM pg_temp.add_slot(1, 'gerard.aranas@deped.gov.ph',      'ESP-8',        8,  'Love',        3, M_TH);
  PERFORM pg_temp.add_slot(1, 'liza.cruspero@deped.gov.ph',      'ENG-9',        9,  'Honesty',     3, M_TH);
  PERFORM pg_temp.add_slot(1, 'juliet.lodripas@deped.gov.ph',    'MATH-9',       9,  'Patience',    3, M_TH);
  PERFORM pg_temp.add_slot(1, 'florenda.calotes@deped.gov.ph',   'TLE-10',       10, 'Charity',     3, M_TH, 'TVL-WORK');
  PERFORM pg_temp.add_slot(1, 'wiltfrancis.pamaong@deped.gov.ph','SOCSCI-11',    11, 'ASSH',        3, M_F);
  PERFORM pg_temp.add_slot(1, 'anthonyriel.diango@deped.gov.ph', 'PROGNET-11',   11, 'TechPro ICT', 3, M_F, 'COMP-LAB');
  PERFORM pg_temp.add_slot(1, 'maurine.dumanig@deped.gov.ph',    'PRACRES-12',   12, 'ICT',         3, M_F);

  -- PERIOD 4 (11:00 - 12:00)
  PERFORM pg_temp.add_slot(1, 'rheljan.casino@deped.gov.ph',     'SCI-7',        7,  'Peace',       4, M_TH, 'SCI-LAB');
  PERFORM pg_temp.add_slot(1, 'florenda.calotes@deped.gov.ph',   'ENG-8',        8,  'Faith',       4, M_TH);
  PERFORM pg_temp.add_slot(1, 'fe.joseph@deped.gov.ph',          'MATH-8',       8,  'Love',        4, M_TH);
  PERFORM pg_temp.add_slot(1, 'reah.ong@deped.gov.ph',           'SCI-9',        9,  'Honesty',     4, M_TH, 'SCI-LAB');
  PERFORM pg_temp.add_slot(1, 'liza.cruspero@deped.gov.ph',      'ENG-9',        9,  'Patience',    4, M_TH);
  PERFORM pg_temp.add_slot(1, 'dellie.vigonte@deped.gov.ph',     'ENG-10',       10, 'Charity',     4, M_TH);
  PERFORM pg_temp.add_slot(1, 'anthonyriel.diango@deped.gov.ph', 'PROGNET-11',   11, 'TechPro ICT', 4, M_F, 'COMP-LAB');
  PERFORM pg_temp.add_slot(1, 'necris.tiedra@deped.gov.ph',      'MIL-12',       12, 'HUMSS',       4, M_F);
  PERFORM pg_temp.add_slot(1, 'gerard.aranas@deped.gov.ph',      'HOPE3-12',     12, 'ICT',         4, M_TH);

  -- PERIOD 5 (12:40/1:00 - 2:00 PM)
  PERFORM pg_temp.add_slot(1, 'maesheila.lastomen@deped.gov.ph', 'MAPEH-7',      7,  'Peace',       6, M_TH);
  PERFORM pg_temp.add_slot(1, 'gerard.aranas@deped.gov.ph',      'ESP-8',        8,  'Faith',       6, M_TH);
  PERFORM pg_temp.add_slot(1, 'nova.fuentes@deped.gov.ph',       'MAPEH-8',      8,  'Love',        6, M_TH);
  PERFORM pg_temp.add_slot(1, 'rayalbert.albaran@deped.gov.ph',  'ESP-9',        9,  'Honesty',     6, M_TH);
  PERFORM pg_temp.add_slot(1, 'gerry.cahiles@deped.gov.ph',      'AP-9',         9,  'Patience',    6, M_TH);
  PERFORM pg_temp.add_slot(1, 'maryjane.baluma@deped.gov.ph',    'FIL-10',       10, 'Charity',     6, M_TH);
  PERFORM pg_temp.add_slot(1, 'fe.joseph@deped.gov.ph',          'GENMATH-11',   11, 'ASSH',        6, M_F);
  PERFORM pg_temp.add_slot(1, 'famelarose.malalis@deped.gov.ph', 'GENSCI-11',    11, 'TechPro ICT', 6, M_F, 'SCI-LAB');
  PERFORM pg_temp.add_slot(1, 'liza.cruspero@deped.gov.ph',      'CREATIVEWRITING-12', 12, 'HUMSS', 6, M_F);
  PERFORM pg_temp.add_slot(1, 'anthonyriel.diango@deped.gov.ph', 'PROGJAVA-12',  12, 'ICT',         6, M_F, 'COMP-LAB');

  -- PERIOD 6 (1:30/2:00 - 3:00 PM)
  PERFORM pg_temp.add_slot(1, 'florenda.calotes@deped.gov.ph',   'TLE-7',        7,  'Peace',       7, M_TH, 'TVL-WORK');
  PERFORM pg_temp.add_slot(1, 'gerry.cahiles@deped.gov.ph',      'AP-8',         8,  'Faith',       7, M_TH);
  PERFORM pg_temp.add_slot(1, 'warren.clarito@deped.gov.ph',     'FIL-8',        8,  'Love',        7, M_TH);
  PERFORM pg_temp.add_slot(1, 'dellie.vigonte@deped.gov.ph',     'FIL-9',        9,  'Honesty',     7, M_TH);
  PERFORM pg_temp.add_slot(1, 'renalyn.pujadas@deped.gov.ph',    'TLE-9',        9,  'Patience',    7, M_TH, 'TVL-WORK');
  PERFORM pg_temp.add_slot(1, 'rayalbert.albaran@deped.gov.ph',  'ESP-10',       10, 'Charity',     7, M_TH);
  PERFORM pg_temp.add_slot(1, 'gerry.cahiles@deped.gov.ph',      'CAT-10',       10, 'Charity',     7, ARRAY['Friday']);
  PERFORM pg_temp.add_slot(1, 'juliet.lodripas@deped.gov.ph',    'LIFECAREER-11',11, 'ASSH',        7, M_F);
  PERFORM pg_temp.add_slot(1, 'wiltfrancis.pamaong@deped.gov.ph','KASAYSAYAN-11',11, 'TechPro ICT', 7, M_F);
  PERFORM pg_temp.add_slot(1, 'maurine.dumanig@deped.gov.ph',    'PRACRES-12',   12, 'HUMSS',       7, M_F);
  PERFORM pg_temp.add_slot(1, 'anthonyriel.diango@deped.gov.ph', 'PROGJAVA-12',  12, 'ICT',         7, M_F, 'COMP-LAB');

  -- PERIOD 7 (2:20/3:00 - 4:00 PM)
  PERFORM pg_temp.add_slot(1, 'wiltfrancis.pamaong@deped.gov.ph','AP-7',         7,  'Peace',       8, M_TH);
  PERFORM pg_temp.add_slot(1, 'warren.clarito@deped.gov.ph',     'FIL-8',        8,  'Faith',       8, M_TH);
  PERFORM pg_temp.add_slot(1, 'gerry.cahiles@deped.gov.ph',      'AP-8',         8,  'Love',        8, M_TH);
  PERFORM pg_temp.add_slot(1, 'renalyn.pujadas@deped.gov.ph',    'TLE-9',        9,  'Honesty',     8, M_TH, 'TVL-WORK');
  PERFORM pg_temp.add_slot(1, 'nova.fuentes@deped.gov.ph',       'MAPEH-9',      9,  'Patience',    8, M_TH);
  PERFORM pg_temp.add_slot(1, 'famelarose.malalis@deped.gov.ph', 'GENSCI-11',    11, 'ASSH',        8, M_F, 'SCI-LAB');
  PERFORM pg_temp.add_slot(1, 'juliet.lodripas@deped.gov.ph',    'LIFECAREER-11',11, 'TechPro ICT', 8, M_F);

  -- PERIOD 8 (3:10 - 4:00 PM JHS)
  PERFORM pg_temp.add_slot(1, 'gerard.aranas@deped.gov.ph',      'ESP-7',        7,  'Peace',       9, M_TH);
  PERFORM pg_temp.add_slot(1, 'nova.fuentes@deped.gov.ph',       'MAPEH-8',      8,  'Faith',       9, M_TH);
  PERFORM pg_temp.add_slot(1, 'renalyn.pujadas@deped.gov.ph',    'TLE-8',        8,  'Love',        9, M_TH, 'TVL-WORK');
  PERFORM pg_temp.add_slot(1, 'gerry.cahiles@deped.gov.ph',      'AP-9',         9,  'Honesty',     9, M_TH);
  PERFORM pg_temp.add_slot(1, 'dellie.vigonte@deped.gov.ph',     'FIL-9',        9,  'Patience',    9, M_TH);
  PERFORM pg_temp.add_slot(1, 'maesheila.lastomen@deped.gov.ph', 'MAPEH-10',     10, 'Charity',     9, M_TH);

  -- PERIOD 9 (4:00 - 5:00 PM / HGP & AP-10)
  PERFORM pg_temp.add_slot(1, 'gerry.cahiles@deped.gov.ph',      'AP-10',        10, 'Charity',     10, M_TH);
  PERFORM pg_temp.add_slot(1, 'warren.clarito@deped.gov.ph',     'HGP-11',       11, 'ASSH',        10, ARRAY['Friday']);
  PERFORM pg_temp.add_slot(1, 'fe.joseph@deped.gov.ph',          'HGP-11',       11, 'TechPro ICT', 10, ARRAY['Friday']);
  PERFORM pg_temp.add_slot(1, 'maesheila.lastomen@deped.gov.ph', 'HGP-12',       12, 'HUMSS',       10, ARRAY['Friday']);
  PERFORM pg_temp.add_slot(1, 'famelarose.malalis@deped.gov.ph', 'HGP-12',       12, 'ICT',         10, ARRAY['Friday']);
  PERFORM pg_temp.add_slot(1, 'maryjane.baluma@deped.gov.ph',    'HGP-7',        7,  'Peace',       10, ARRAY['Friday']);
END $$;

DROP FUNCTION IF EXISTS pg_temp.add_slot(INT, TEXT, TEXT, INT, TEXT, INT, TEXT[], TEXT);
DROP FUNCTION IF EXISTS pg_temp.add_load(INT, TEXT, TEXT, INT, TEXT, INT, INT, TEXT);
