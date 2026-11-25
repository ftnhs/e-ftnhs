-- Migration 019: Add Public Schools District Supervisor (PSDS) and JHS/SHS Coordinator signatories to school_settings

ALTER TABLE public.school_settings
  ADD COLUMN IF NOT EXISTS psds_name TEXT NOT NULL DEFAULT 'MA. TERESITA I. ALAMPAYAN, PhD',
  ADD COLUMN IF NOT EXISTS psds_designation TEXT NOT NULL DEFAULT 'Public Schools District Supervisor',
  ADD COLUMN IF NOT EXISTS jhs_coordinator_name TEXT NOT NULL DEFAULT 'MAURINE D. CUARIO',
  ADD COLUMN IF NOT EXISTS jhs_coordinator_designation TEXT NOT NULL DEFAULT 'Teacher III / JHS Coordinator',
  ADD COLUMN IF NOT EXISTS shs_coordinator_name TEXT NOT NULL DEFAULT 'DELLIE T. VIGONTE',
  ADD COLUMN IF NOT EXISTS shs_coordinator_designation TEXT NOT NULL DEFAULT 'Teacher III / SHS Coordinator';

UPDATE public.school_settings
SET
  psds_name = COALESCE(NULLIF(psds_name, ''), 'MA. TERESITA I. ALAMPAYAN, PhD'),
  psds_designation = COALESCE(NULLIF(psds_designation, ''), 'Public Schools District Supervisor'),
  jhs_coordinator_name = COALESCE(NULLIF(jhs_coordinator_name, ''), 'MAURINE D. CUARIO'),
  jhs_coordinator_designation = COALESCE(NULLIF(jhs_coordinator_designation, ''), 'Teacher III / JHS Coordinator'),
  shs_coordinator_name = COALESCE(NULLIF(shs_coordinator_name, ''), 'DELLIE T. VIGONTE'),
  shs_coordinator_designation = COALESCE(NULLIF(shs_coordinator_designation, ''), 'Teacher III / SHS Coordinator');
