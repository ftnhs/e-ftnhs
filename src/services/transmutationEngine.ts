/**
 * transmutationEngine.ts
 * Exact DepEd Order No. 8 s. 2015 & DepEd Order No. 9 s. 2026 (3-Term School Year)
 * Transmutation Table & Curriculum Assessment Weight Engine
 * School: Fermin Tayabas National High School (School ID: 302851)
 */

import type { CurriculumType, Subject, Section } from "../types";
import { isSshsGrade } from "../utils/shsCurriculum";

/**
 * Adjusted Transmutation Table (SY 2026-2027 Transition)
 * Converts Initial Grade (0.00 to 100.00) into Transmuted Grade (60 to 100).
 * Passing threshold for SY 2026-2027 is 70.00 Initial Grade -> 75 Transmuted Grade.
 */
export function transmuteInitialGrade(initialGrade: number): number {
  const g = Number(initialGrade.toFixed(2));

  if (g >= 99.5) return 100;
  if (g >= 98.32) return 99;
  if (g >= 97.14) return 98;
  if (g >= 95.96) return 97;
  if (g >= 94.78) return 96;
  if (g >= 93.6) return 95;
  if (g >= 92.42) return 94;
  if (g >= 91.24) return 93;
  if (g >= 90.06) return 92;
  if (g >= 88.88) return 91;
  if (g >= 87.7) return 90;
  if (g >= 86.52) return 89;
  if (g >= 85.34) return 88;
  if (g >= 84.16) return 87;
  if (g >= 82.98) return 86;
  if (g >= 81.8) return 85;
  if (g >= 80.62) return 84;
  if (g >= 79.44) return 83;
  if (g >= 78.26) return 82;
  if (g >= 77.08) return 81;
  if (g >= 75.9) return 80;
  if (g >= 74.72) return 79;
  if (g >= 73.54) return 78;
  if (g >= 72.36) return 77;
  if (g >= 71.18) return 76;
  if (g >= 70.0) return 75; // SY 2026-2027 Passing cutoff

  // Failing range (< 70.00)
  if (g >= 65.34) return 74;
  if (g >= 60.67) return 73;
  if (g >= 56.01) return 72;
  if (g >= 51.34) return 71;
  if (g >= 46.67) return 70;
  if (g >= 42.01) return 69;
  if (g >= 37.34) return 68;
  if (g >= 32.68) return 67;
  if (g >= 28.01) return 66;
  if (g >= 23.35) return 65;
  if (g >= 18.68) return 64;
  if (g >= 14.01) return 63;
  if (g >= 9.35) return 62;
  if (g >= 4.68) return 61;
  return 60; // Minimum grade on DepEd report card
}

/**
 * Returns assessment component weights based on Curriculum Type and Subject Category:
 * Key Stages 2 & 3 (Grades 4-10):
 * - MATATAG JHS Core Academic (English, Filipino, Math, Science, AP, GMRC/VE): WW 20%, PT 50%, EX 30%
 * - MATATAG JHS Skill-based (EPP/TLE, MAPEH): WW 20%, PT 60%, EX 20%
 * Key Stage 4 — Grade 11 SSHS:
 * - SSHS Core / Other Academic Electives: WW 20%, PT 50%, EX 30%
 * - SSHS Field Exposure / Arts Apprenticeship / Creative Production & Innovation: WW 15%, PT 70%, EX 15%
 * - SSHS Arts, Sports, & Health and Wellness Electives: WW 20%, PT 60%, EX 20%
 * - SSHS Research Electives & Design and Innovation: WW 40%, PT 60%, EX 0%
 * - SSHS TechPro Electives: WW 15%, PT 65%, EX 20%
 * - SSHS Work Immersion: WW 20%, PT 80%, EX 0%
 * Key Stage 4 — Grade 12 Old SHS (DO 8 s. 2015):
 * - Old SHS Core: WW 25%, PT 50%, QA 25%
 * - Old SHS Applied / Specialized: WW 25%, PT 45%, QA 30%
 * - Old SHS TVL: WW 20%, PT 60%, QA 20%
 * - Old SHS Immersion / Research: WW 35%, PT 40%, QA 25%
 */
export function getCurriculumAssessmentWeights(
  curriculum: CurriculumType,
  subjectCategory: string
): { wwWeight: number; ptWeight: number; qaWeight: number } {
  // JHS MATATAG
  if (curriculum === "MATATAG JHS Skill-Based") {
    return { wwWeight: 0.2, ptWeight: 0.6, qaWeight: 0.2 };
  }
  if (curriculum === "MATATAG JHS") {
    if (/mapeh|tle|skill|creative/i.test(subjectCategory)) {
      return { wwWeight: 0.2, ptWeight: 0.6, qaWeight: 0.2 };
    }
    return { wwWeight: 0.2, ptWeight: 0.5, qaWeight: 0.3 };
  }

  // Grade 11 — Strengthened SHS (SSHS)
  if (curriculum === "SSHS Core" || curriculum === "SSHS Academic Elective") {
    return { wwWeight: 0.2, ptWeight: 0.5, qaWeight: 0.3 };
  }
  if (curriculum === "SSHS Field Exposure") {
    return { wwWeight: 0.15, ptWeight: 0.7, qaWeight: 0.15 };
  }
  if (curriculum === "SSHS Arts Sports Health") {
    return { wwWeight: 0.2, ptWeight: 0.6, qaWeight: 0.2 };
  }
  if (curriculum === "SSHS Research Design") {
    return { wwWeight: 0.4, ptWeight: 0.6, qaWeight: 0.0 };
  }
  if (curriculum === "SSHS TechPro Elective") {
    return { wwWeight: 0.15, ptWeight: 0.65, qaWeight: 0.2 };
  }
  if (curriculum === "SSHS Work Immersion") {
    return { wwWeight: 0.2, ptWeight: 0.8, qaWeight: 0.0 };
  }

  // Grade 12 — Old K-12 SHS (DO 8 s. 2015)
  if (curriculum === "Old SHS Core") {
    return { wwWeight: 0.25, ptWeight: 0.5, qaWeight: 0.25 };
  }
  if (curriculum === "Old SHS Applied" || curriculum === "Old SHS Specialized") {
    if (/immersion|research/i.test(subjectCategory)) {
      return { wwWeight: 0.35, ptWeight: 0.4, qaWeight: 0.25 };
    }
    return { wwWeight: 0.25, ptWeight: 0.45, qaWeight: 0.3 };
  }
  if (curriculum === "Old SHS Immersion") {
    return { wwWeight: 0.35, ptWeight: 0.4, qaWeight: 0.25 };
  }
  if (curriculum === "Old SHS TVL") {
    return { wwWeight: 0.2, ptWeight: 0.6, qaWeight: 0.2 };
  }

  // Legacy SHS fallbacks
  if (curriculum === "SHS Core") {
    return { wwWeight: 0.25, ptWeight: 0.5, qaWeight: 0.25 };
  }
  if (curriculum === "SHS Academic") {
    if (/immersion|research/i.test(subjectCategory)) {
      return { wwWeight: 0.35, ptWeight: 0.4, qaWeight: 0.25 };
    }
    return { wwWeight: 0.25, ptWeight: 0.45, qaWeight: 0.3 };
  }

  // Legacy SHS TVL Track
  return { wwWeight: 0.2, ptWeight: 0.6, qaWeight: 0.2 };
}

export interface ComputedStudentRowScores {
  wwTotal: number;
  wwPS: number;
  wwWS: number;
  ptTotal: number;
  ptPS: number;
  ptWS: number;
  qaPS: number;
  qaWS: number;
  initialGrade: number;
  transmutedGrade: number;
  remarks: "Passed" | "Failed" | "Did Not Meet Expectations";
}

/**
 * Computes exact weighted percentages and transmuted grade for a single student row
 */
export function computeStudentRowGrades(
  wwScores: number[],
  ptScores: number[],
  qaScore: number,
  wwMaxScores: number[],
  ptMaxScores: number[],
  qaMaxScore: number,
  wwWeight: number,
  ptWeight: number,
  qaWeight: number
): ComputedStudentRowScores {
  // 1. Written Works Total & Percentage Score
  const wwTotal = wwScores.reduce((sum, score) => sum + (Number(score) || 0), 0);
  const wwMaxTotal = wwMaxScores.reduce((sum, score) => sum + (Number(score) || 0), 0);
  const wwPS = wwMaxTotal > 0 ? Number(((wwTotal / wwMaxTotal) * 100).toFixed(2)) : 0;
  const wwWS = Number((wwPS * wwWeight).toFixed(2));

  // 2. Performance Tasks Total & Percentage Score
  const ptTotal = ptScores.reduce((sum, score) => sum + (Number(score) || 0), 0);
  const ptMaxTotal = ptMaxScores.reduce((sum, score) => sum + (Number(score) || 0), 0);
  const ptPS = ptMaxTotal > 0 ? Number(((ptTotal / ptMaxTotal) * 100).toFixed(2)) : 0;
  const ptWS = Number((ptPS * ptWeight).toFixed(2));

  // 3. Quarterly/Term Exam Percentage Score
  const safeQA = Number(qaScore) || 0;
  const qaPS = qaMaxScore > 0 ? Number(((safeQA / qaMaxScore) * 100).toFixed(2)) : 0;
  const qaWS = Number((qaPS * qaWeight).toFixed(2));

  // 4. Initial Grade = Sum of Weighted Scores
  const initialGrade = Number((wwWS + ptWS + qaWS).toFixed(2));

  // 5. Transmuted Grade
  const transmutedGrade = transmuteInitialGrade(initialGrade);
  const remarks: "Passed" | "Did Not Meet Expectations" =
    transmutedGrade >= 75 ? "Passed" : "Did Not Meet Expectations";

  return {
    wwTotal,
    wwPS,
    wwWS,
    ptTotal,
    ptPS,
    ptWS,
    qaPS,
    qaWS,
    initialGrade,
    transmutedGrade,
    remarks,
  };
}

/**
 * Returns Official SY 2026-2027 SF9 Performance Descriptor & Remarks
 * (Advancing / Benchmarking / Connecting / Developing / Emerging),
 * or DepEd DO 8 s. 2015 descriptors when isOldShs = true.
 */
export function getSF9PerformanceDescriptor(
  grade: number | null,
  isOldShs = false
): { descriptor: string; remarks: "Passed" | "Failed" | "—" } {
  if (grade === null || Number.isNaN(grade) || grade <= 0) {
    return { descriptor: "—", remarks: "—" };
  }
  const rounded = Math.round(grade);
  if (isOldShs) {
    if (rounded >= 90) return { descriptor: "Outstanding", remarks: "Passed" };
    if (rounded >= 85) return { descriptor: "Very Satisfactory", remarks: "Passed" };
    if (rounded >= 80) return { descriptor: "Satisfactory", remarks: "Passed" };
    if (rounded >= 75) return { descriptor: "Fairly Satisfactory", remarks: "Passed" };
    return { descriptor: "Did Not Meet Expectations", remarks: "Failed" };
  }
  if (rounded >= 90) return { descriptor: "Advancing", remarks: "Passed" };
  if (rounded >= 80) return { descriptor: "Benchmarking", remarks: "Passed" };
  if (rounded >= 75) return { descriptor: "Connecting", remarks: "Passed" };
  if (rounded >= 65) return { descriptor: "Developing", remarks: "Failed" };
  return { descriptor: "Emerging", remarks: "Failed" };
}

/**
 * Infers the default CurriculumType and Units per Term for a (Section, Subject) pair.
 */
export function inferCurriculumAndUnits(
  gradeLevel: number,
  subject: Pick<Subject, "subject_code" | "subject_name" | "category" | "track_strand">,
  section?: Pick<Section, "section_name" | "track_strand"> | null,
  schoolYear?: string | null
): { curriculumType: CurriculumType; units: number } {
  const code = subject.subject_code.toUpperCase();
  const name = subject.subject_name.toLowerCase();
  const trackText = `${section?.track_strand || ""} ${section?.section_name || ""} ${subject.track_strand || ""}`.toLowerCase();

  if (gradeLevel <= 10) {
    if (/^(mapeh|tle|epp)/.test(code.toLowerCase()) || /mapeh|tle|epp|music|arts|physical education/.test(name)) {
      return { curriculumType: "MATATAG JHS Skill-Based", units: 1 };
    }
    return { curriculumType: "MATATAG JHS", units: 1 };
  }

  if (isSshsGrade(gradeLevel, schoolYear)) {
    if (/immersion/.test(name)) {
      return { curriculumType: "SSHS Work Immersion", units: /technical-professional|techpro|tvl|ict/.test(trackText) ? 4 : 3 };
    }
    if (/research|design and innovation/.test(name)) {
      return { curriculumType: "SSHS Research Design", units: 3 };
    }
    if (/field exposure|apprenticeship|creative production/.test(name)) {
      return { curriculumType: "SSHS Field Exposure", units: /creative production|apprenticeship/.test(name) ? 6 : 3 };
    }
    if (/sports|first aid|basic life support|human movement|physical education/.test(name)) {
      return { curriculumType: "SSHS Arts Sports Health", units: 3 };
    }
    if (subject.category === "TVL" || /technical-professional|techpro|prognet|ict/.test(`${code.toLowerCase()} ${trackText}`)) {
      return { curriculumType: "SSHS TechPro Elective", units: 4 };
    }
    if (subject.category === "Specialized" || subject.category === "Elective") {
      return { curriculumType: "SSHS Academic Elective", units: 3 };
    }
    return { curriculumType: "SSHS Core", units: 2 };
  }

  // Grade 12 (Old K-12 SHS Curriculum)
  if (subject.category === "TVL" || /tvl|progjava/.test(code.toLowerCase())) {
    return { curriculumType: "Old SHS TVL", units: 1 };
  }
  if (/immersion|practical research|inquiries, investigations/.test(name)) {
    return { curriculumType: "Old SHS Immersion", units: 1 };
  }
  if (subject.category === "Specialized") {
    return { curriculumType: "Old SHS Specialized", units: 1 };
  }
  if (subject.category === "Applied") {
    return { curriculumType: "Old SHS Applied", units: 1 };
  }
  return { curriculumType: "Old SHS Core", units: 1 };
}

/**
 * Computes the 3-Term School Year Final Grade:
 * Final Grade = round((Term 1 + Term 2 + Term 3) / 3)
 */
export function computeFinalYearAverage(
  term1Grade: number,
  term2Grade: number,
  term3Grade: number
): { finalGrade: number; remarks: "Passed" | "Failed" } {
  const average = (term1Grade + term2Grade + term3Grade) / 3;
  const finalGrade = Math.round(average);
  return {
    finalGrade,
    remarks: finalGrade >= 75 ? "Passed" : "Failed",
  };
}
