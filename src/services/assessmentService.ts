/**
 * assessmentService.ts
 * Supabase Data Layer for Online Assessments & Item Analysis
 * School: Fermin Tayabas National High School (School ID: 302851)
 */

import { supabase } from "../lib/supabase";
import type {
  Assessment,
  AssessmentItemAnalysis,
  StudentScoreRecord,
  AssessmentType,
  GradingPeriod,
  AssessmentStatus,
} from "../types";
import {
  computeFullAssessmentStats,
  computeItemAnalysis,
} from "./statsEngine";

export interface CreateAssessmentPayload {
  term_id: string;
  teacher_id: string;
  subject_id?: string | null;
  section_id?: string | null;
  title: string;
  assessment_type: AssessmentType;
  grading_period: GradingPeriod;
  total_items: number;
  passing_score: number;
  test_date: string;
  raw_scores: StudentScoreRecord[];
  competencies?: Record<number, string>;
}

export async function fetchAssessments(termId?: string): Promise<Assessment[]> {
  try {
    let query = supabase
      .from("assessments")
      .select(`
        *,
        teacher:profiles!assessments_teacher_id_fkey(id, full_name, email, department),
        subject:subjects_catalog!assessments_subject_id_fkey(id, subject_name, subject_code),
        section:sections!assessments_section_id_fkey(id, section_name, grade_level)
      `)
      .order("created_at", { ascending: false });

    if (termId) {
      query = query.eq("term_id", termId);
    }

    const { data, error } = await query;
    if (error) {
      console.error("fetchAssessments error:", error);
      return [];
    }

    return (data || []) as Assessment[];
  } catch (err) {
    console.error("fetchAssessments unexpected exception:", err);
    return [];
  }
}

export async function fetchAssessmentDetails(assessmentId: string): Promise<Assessment | null> {
  try {
    const { data: assessment, error: aError } = await supabase
      .from("assessments")
      .select(`
        *,
        teacher:profiles!assessments_teacher_id_fkey(id, full_name, email, department),
        subject:subjects_catalog!assessments_subject_id_fkey(id, subject_name, subject_code),
        section:sections!assessments_section_id_fkey(id, section_name, grade_level)
      `)
      .eq("id", assessmentId)
      .single();

    if (aError || !assessment) {
      console.error("fetchAssessmentDetails error:", aError);
      return null;
    }

    const { data: items, error: iError } = await supabase
      .from("assessment_item_analysis")
      .select("*")
      .eq("assessment_id", assessmentId)
      .order("item_number", { ascending: true });

    if (iError) {
      console.error("fetchAssessmentItems error:", iError);
    }

    return {
      ...(assessment as Assessment),
      items: (items || []) as AssessmentItemAnalysis[],
    };
  } catch (err) {
    console.error("fetchAssessmentDetails unexpected exception:", err);
    return null;
  }
}

export async function createAssessmentWithAnalysis(
  payload: CreateAssessmentPayload
): Promise<{ success: boolean; data?: Assessment; error?: string }> {
  try {
    const {
      term_id,
      teacher_id,
      subject_id,
      section_id,
      title,
      assessment_type,
      grading_period,
      total_items,
      passing_score,
      test_date,
      raw_scores,
      competencies = {},
    } = payload;

    // 1. Compute statistical summary
    const stats = computeFullAssessmentStats(raw_scores, total_items, passing_score);

    // 2. Insert parent assessment record
    const { data: createdAssessment, error: aError } = await supabase
      .from("assessments")
      .insert({
        term_id,
        teacher_id,
        subject_id: subject_id || null,
        section_id: section_id || null,
        title,
        assessment_type,
        grading_period,
        total_items,
        passing_score,
        test_date,
        raw_scores,
        examinee_count: stats.examinee_count,
        mean_score: stats.mean_score,
        standard_deviation: stats.standard_deviation,
        mean_percentage_score: stats.mean_percentage_score,
        mastery_level: stats.mastery_level,
        status: "Analyzed",
      })
      .select()
      .single();

    if (aError || !createdAssessment) {
      return { success: false, error: aError?.message || "Failed to create assessment." };
    }

    // 3. Compute item analysis rows
    const items = computeItemAnalysis(
      raw_scores,
      total_items,
      competencies,
      createdAssessment.id
    );

    // 4. Batch insert item analysis rows
    const itemRows = items.map((i) => ({
      assessment_id: createdAssessment.id,
      item_number: i.item_number,
      learning_competency: i.learning_competency,
      correct_responses_count: i.correct_responses_count,
      total_examinees: i.total_examinees,
      difficulty_index: i.difficulty_index,
      difficulty_interpretation: i.difficulty_interpretation,
      action_recommendation: i.action_recommendation,
      is_least_learned: i.is_least_learned,
    }));

    if (itemRows.length > 0) {
      const { error: itemsError } = await supabase
        .from("assessment_item_analysis")
        .insert(itemRows);

      if (itemsError) {
        console.error("Warning: Failed to insert item analysis rows:", itemsError);
      }
    }

    const fullAssessment = await fetchAssessmentDetails(createdAssessment.id);
    return {
      success: true,
      data: fullAssessment || (createdAssessment as Assessment),
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error creating assessment.";
    return { success: false, error: msg };
  }
}

export async function deleteAssessment(assessmentId: string): Promise<boolean> {
  try {
    const { error } = await supabase.from("assessments").delete().eq("id", assessmentId);
    if (error) {
      console.error("deleteAssessment error:", error);
      return false;
    }
    return true;
  } catch (err) {
    console.error("deleteAssessment exception:", err);
    return false;
  }
}

export async function updateAssessmentStatus(
  assessmentId: string,
  status: AssessmentStatus
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("assessments")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", assessmentId);

    if (error) {
      console.error("updateAssessmentStatus error:", error);
      return false;
    }
    return true;
  } catch (err) {
    console.error("updateAssessmentStatus exception:", err);
    return false;
  }
}
