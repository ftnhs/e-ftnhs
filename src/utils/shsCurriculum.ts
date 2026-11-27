import type { SubjectCategory, SubjectCurriculumVersion } from "../types";

export const SSHS_TRACK_OPTIONS = [
  "Academic",
  "Technical-Professional (TechPro)",
] as const;

export function parseSchoolYearStart(schoolYear?: string | null): number | null {
  if (!schoolYear) return null;
  const match = schoolYear.trim().match(/^(\d{4})/);
  return match?.[1] ? Number(match[1]) : null;
}

/**
 * SY 2026-2027 is the transition year where Grade 11 uses Strengthened SHS (SSHS)
 * while Grade 12 still finishes the Old K-12 SHS Curriculum.
 * Starting SY 2027-2028+, both Grade 11 and Grade 12 follow SSHS with the same
 * "Academic" and "Technical-Professional (TechPro)" tracks.
 */
export function isOldShsGrade12ForSchoolYear(
  gradeLevel: number,
  schoolYear?: string | null
): boolean {
  if (gradeLevel !== 12) return false;
  const startYear = parseSchoolYearStart(schoolYear);
  return startYear === null || startYear <= 2026;
}

export function isSshsGrade(
  gradeLevel: number,
  schoolYear?: string | null
): boolean {
  if (gradeLevel === 11) return true;
  if (gradeLevel === 12) return !isOldShsGrade12ForSchoolYear(12, schoolYear);
  return false;
}

export function defaultCurriculumVersionForGrade(
  gradeLevel: number,
  schoolYear?: string | null
): SubjectCurriculumVersion {
  if (gradeLevel <= 10) return "JHS MATATAG";
  return isOldShsGrade12ForSchoolYear(gradeLevel, schoolYear) ? "Old SHS" : "SSHS";
}

export function defaultCategoryForGrade(
  gradeLevel: number,
  schoolYear?: string | null
): SubjectCategory {
  return isSshsGrade(gradeLevel, schoolYear) ? "Elective" : "Core";
}
