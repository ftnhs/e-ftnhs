-- Migration 017: Remove redundant "(MATATAG)" suffix from subject names
-- MATATAG is automatic for Junior High School; keep subject names clean across Timetables, SF7, and Class Programs.

UPDATE public.subjects_catalog
SET subject_name = TRIM(REGEXP_REPLACE(subject_name, '\s*\(MATATAG\)\s*', '', 'gi'))
WHERE subject_name ~* '\(MATATAG\)';
