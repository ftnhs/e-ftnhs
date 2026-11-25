/**
 * statsEngine.ts
 * Exact Mathematical & Statistical Calculation Core for DepEd Assessment & Item Analysis
 * Fermin Tayabas National High School (FTNHS - School ID: 302851)
 * Adheres to DepEd Order No. 8 s. 2015 & DepEd Standard MPS Formulas
 */

import type {
  StudentScoreRecord,
  StatisticalSummary,
  AssessmentItemAnalysis,
  DifficultyInterpretation,
  ActionRecommendation,
  DepEdMasteryLevel,
} from "../types";

/**
 * Calculates Arithmetic Mean (\mu = \sum X_i / N)
 */
export function computeMean(scores: number[]): number {
  if (scores.length === 0) return 0;
  const sum = scores.reduce((acc, score) => acc + score, 0);
  return Number((sum / scores.length).toFixed(2));
}

/**
 * Calculates Population Standard Deviation (SD = \sqrt{\sum (X_i - \mu)^2 / N})
 */
export function computeStandardDeviation(scores: number[], providedMean?: number): number {
  if (scores.length === 0) return 0;
  const mean = providedMean !== undefined ? providedMean : computeMean(scores);
  const variance = scores.reduce((acc, score) => acc + Math.pow(score - mean, 2), 0) / scores.length;
  return Number(Math.sqrt(variance).toFixed(2));
}

/**
 * Calculates Mean Percentage Score (MPS = (\mu / Total Items) * 100)
 */
export function computeMPS(mean: number, totalItems: number): number {
  if (totalItems <= 0) return 0;
  return Number(((mean / totalItems) * 100).toFixed(2));
}

/**
 * Calculates Index of Difficulty per Item (D_j = R_j / N)
 */
export function computeDifficultyIndex(correctCount: number, totalExaminees: number): number {
  if (totalExaminees <= 0) return 0;
  return Number((correctCount / totalExaminees).toFixed(3));
}

/**
 * Interprets Index of Difficulty according to standard DepEd test analysis:
 * - D_j >= 0.81: Easy
 * - 0.21 <= D_j <= 0.80: Average / Moderate
 * - D_j <= 0.20: Difficult
 */
export function interpretDifficulty(difficultyIndex: number): DifficultyInterpretation {
  if (difficultyIndex >= 0.81) return "Easy";
  if (difficultyIndex <= 0.20) return "Difficult";
  return "Average";
}

/**
 * Action Recommendation based on Item Difficulty Index:
 * - 0.21 <= D_j <= 0.80: Retain (Good discriminator)
 * - D_j > 0.80: Revise (Too easy, may lack discrimination)
 * - D_j < 0.20: Reject (Too difficult, ambiguous or untaught)
 */
export function recommendAction(difficultyIndex: number): ActionRecommendation {
  if (difficultyIndex >= 0.21 && difficultyIndex <= 0.80) {
    return "Retain";
  }
  if (difficultyIndex > 0.80) {
    return "Revise";
  }
  return "Reject";
}

/**
 * DepEd 7 Mastery Level Buckets:
 * - Mastered (96% - 100%)
 * - Closely Approximating Mastery (86% - 95%)
 * - Moving Towards Mastery (66% - 85%)
 * - Average Mastery (35% - 65%)
 * - Low Mastery (15% - 34%)
 * - Very Low Mastery (5% - 14%)
 * - Absolutely No Mastery (0% - 4%)
 */
export function determineMasteryLevel(mps: number): DepEdMasteryLevel {
  if (mps >= 96.0) return "Mastered";
  if (mps >= 86.0) return "Closely Approximating Mastery";
  if (mps >= 66.0) return "Moving Towards Mastery";
  if (mps >= 35.0) return "Average Mastery";
  if (mps >= 15.0) return "Low Mastery";
  if (mps >= 5.0) return "Very Low Mastery";
  return "Absolutely No Mastery";
}

/**
 * Computes automatic 75% passing score rounded up to the nearest whole number.
 */
export function computePassingScore(totalItems: number): number {
  if (totalItems <= 0) return 0;
  return Math.ceil((totalItems * 3) / 4);
}

/**
 * Formats stored GradingPeriod code ('T1' | 'T2' | 'T3') into display label ('Term 1', etc.).
 */
export function formatGradingPeriod(period?: string | null): string {
  if (!period) return "Term 1";
  if (period === "T1" || period === "Q1") return "Term 1";
  if (period === "T2" || period === "Q2") return "Term 2";
  if (period === "T3" || period === "Q3" || period === "Q4") return "Term 3";
  return period;
}

/**
 * Computes complete statistical summary from student score records
 */
export function computeFullAssessmentStats(
  records: StudentScoreRecord[],
  totalItems: number,
  passingScore: number = 0
): StatisticalSummary {
  if (records.length === 0) {
    return {
      examinee_count: 0,
      total_items: totalItems,
      highest_score: 0,
      lowest_score: 0,
      mean_score: 0,
      standard_deviation: 0,
      mean_percentage_score: 0,
      mastery_level: "Pending Analysis",
      passing_rate: 0,
    };
  }

  const scores = records.map((r) => r.raw_score);
  const highest = Math.max(...scores);
  const lowest = Math.min(...scores);
  const mean = computeMean(scores);
  const sd = computeStandardDeviation(scores, mean);
  const mps = computeMPS(mean, totalItems);
  const mastery = determineMasteryLevel(mps);

  const passingThreshold = passingScore > 0 ? passingScore : computePassingScore(totalItems);
  const passedCount = scores.filter((s) => s >= passingThreshold).length;
  const passingRate = Number(((passedCount / records.length) * 100).toFixed(2));

  return {
    examinee_count: records.length,
    total_items: totalItems,
    highest_score: highest,
    lowest_score: lowest,
    mean_score: mean,
    standard_deviation: sd,
    mean_percentage_score: mps,
    mastery_level: mastery,
    passing_rate: passingRate,
  };
}

/**
 * Computes Item-by-Item Analysis across all test items
 */
export function computeItemAnalysis(
  records: StudentScoreRecord[],
  totalItems: number,
  competencies: Record<number, string> = {},
  assessmentId: string = ""
): AssessmentItemAnalysis[] {
  const examineeCount = records.length;
  const items: AssessmentItemAnalysis[] = [];

  for (let itemNum = 1; itemNum <= totalItems; itemNum++) {
    // Count how many students scored 1 on this item
    let correctCount = 0;
    records.forEach((record) => {
      // 0-indexed in item_scores array
      const score = record.item_scores[itemNum - 1];
      if (score !== undefined && score > 0) {
        correctCount++;
      }
    });

    const diffIndex = computeDifficultyIndex(correctCount, examineeCount);
    const interpretation = interpretDifficulty(diffIndex);
    const recommendation = recommendAction(diffIndex);
    const competency = competencies[itemNum] || `Learning Competency for Item ${itemNum}`;

    items.push({
      id: `${assessmentId}-item-${itemNum}`,
      assessment_id: assessmentId,
      item_number: itemNum,
      learning_competency: competency,
      correct_responses_count: correctCount,
      total_examinees: examineeCount,
      difficulty_index: diffIndex,
      difficulty_interpretation: interpretation,
      action_recommendation: recommendation,
      is_least_learned: false, // will be tagged below
    });
  }

  // Tag top 3 Least Learned Competencies (lowest difficulty index)
  // Sort copy by difficulty_index ascending
  const sorted = [...items].sort((a, b) => a.difficulty_index - b.difficulty_index);
  const leastLearnedItemNumbers = new Set(sorted.slice(0, 3).map((i) => i.item_number));

  return items.map((item) => ({
    ...item,
    is_least_learned: leastLearnedItemNumbers.has(item.item_number),
  }));
}

/**
 * Extracts top N least learned competencies for targeted instructional intervention
 */
export function identifyLeastLearnedCompetencies(
  items: AssessmentItemAnalysis[],
  count: number = 3
): AssessmentItemAnalysis[] {
  return [...items]
    .sort((a, b) => a.difficulty_index - b.difficulty_index)
    .slice(0, count);
}
