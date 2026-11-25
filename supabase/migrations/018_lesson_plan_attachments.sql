-- Migration 018: Support multiple file attachments per weekly Lesson Plan (DLL/DLP)

ALTER TABLE public.lesson_plans
ADD COLUMN IF NOT EXISTS attachments JSONB NOT NULL DEFAULT '[]'::jsonb;

-- Backfill existing single-file records into attachments array
UPDATE public.lesson_plans
SET attachments = jsonb_build_array(
  jsonb_build_object(
    'file_url', file_url,
    'file_name', COALESCE(file_name, 'Lesson Plan Document'),
    'file_size', file_size,
    'mime_type', mime_type
  )
)
WHERE file_url IS NOT NULL
  AND (attachments IS NULL OR attachments = '[]'::jsonb);
