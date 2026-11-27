-- Migration 037: Add per-term Schedule Grid Lock columns to academic_terms
ALTER TABLE public.academic_terms
  ADD COLUMN IF NOT EXISTS is_schedule_locked BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS schedule_locked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS schedule_locked_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
