-- Migration 020: Add Schools Division Superintendent (SDS) signatory fields to school_settings

ALTER TABLE public.school_settings
  ADD COLUMN IF NOT EXISTS sds_name TEXT NOT NULL DEFAULT 'FAY C. LUAREZ EdD, PhD TM, CESO V',
  ADD COLUMN IF NOT EXISTS sds_designation TEXT NOT NULL DEFAULT 'Schools Division Superintendent';

UPDATE public.school_settings
SET
  sds_name = COALESCE(NULLIF(sds_name, ''), 'FAY C. LUAREZ EdD, PhD TM, CESO V'),
  sds_designation = COALESCE(NULLIF(sds_designation, ''), 'Schools Division Superintendent');
