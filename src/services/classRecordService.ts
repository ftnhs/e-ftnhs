/**
 * classRecordService.ts
 * Supabase Data Layer for Automated Three-Term E-Class Record
 * School: Fermin Tayabas National High School (School ID: 302851)
 */

import { supabase } from "../lib/supabase";
import type {
  ClassRecord,
  StudentGrade,
  CurriculumType,
} from "../types";
import {
  computeStudentRowGrades,
  getCurriculumAssessmentWeights,
} from "./transmutationEngine";

export interface CreateClassRecordPayload {
  term_id: string;
  teacher_id: string;
  subject_id: string;
  section_id: string;
  curriculum_type: CurriculumType;
  subject_category?: string;
  term_number: 1 | 2 | 3;
  ww_max_scores?: number[];
  pt_max_scores?: number[];
  qa_max_score?: number;
  autoSyncLearners?: boolean;
}

export async function fetchClassRecords(
  termId?: string,
  teacherId?: string
): Promise<ClassRecord[]> {
  try {
    let query = supabase
      .from("class_records")
      .select(`
        *,
        teacher:profiles!class_records_teacher_id_fkey(id, full_name, email, department),
        subject:subjects_catalog!class_records_subject_id_fkey(id, subject_name, subject_code),
        section:sections!class_records_section_id_fkey(id, section_name, grade_level)
      `)
      .order("created_at", { ascending: false });

    if (termId) query = query.eq("term_id", termId);
    if (teacherId) query = query.eq("teacher_id", teacherId);

    const { data, error } = await query;
    if (error) {
      console.error("fetchClassRecords error:", error);
      return [];
    }

    return (data || []) as ClassRecord[];
  } catch (err) {
    console.error("fetchClassRecords exception:", err);
    return [];
  }
}

export async function fetchClassRecordDetails(recordId: string): Promise<ClassRecord | null> {
  try {
    const { data: record, error: rError } = await supabase
      .from("class_records")
      .select(`
        *,
        teacher:profiles!class_records_teacher_id_fkey(id, full_name, email, department),
        subject:subjects_catalog!class_records_subject_id_fkey(id, subject_name, subject_code),
        section:sections!class_records_section_id_fkey(id, section_name, grade_level)
      `)
      .eq("id", recordId)
      .single();

    if (rError || !record) {
      console.error("fetchClassRecordDetails error:", rError);
      return null;
    }

    const { data: grades, error: gError } = await supabase
      .from("student_grades")
      .select("*")
      .eq("class_record_id", recordId)
      .order("student_name", { ascending: true });

    if (gError) {
      console.error("fetchStudentGrades error:", gError);
    }

    return {
      ...(record as ClassRecord),
      grades: (grades || []) as StudentGrade[],
    };
  } catch (err) {
    console.error("fetchClassRecordDetails exception:", err);
    return null;
  }
}

export async function createClassRecord(
  payload: CreateClassRecordPayload
): Promise<{ success: boolean; data?: ClassRecord; error?: string }> {
  try {
    const {
      term_id,
      teacher_id,
      subject_id,
      section_id,
      curriculum_type,
      subject_category = "Core Academic",
      term_number,
      ww_max_scores = [20, 20, 25, 20, 25],
      pt_max_scores = [50, 50, 50, 50, 50],
      qa_max_score = 50,
    } = payload;

    const weights = getCurriculumAssessmentWeights(curriculum_type, subject_category);

    const { data, error } = await supabase
      .from("class_records")
      .insert({
        term_id,
        teacher_id,
        subject_id,
        section_id,
        curriculum_type,
        subject_category,
        term_number,
        ww_weight: weights.wwWeight,
        pt_weight: weights.ptWeight,
        qa_weight: weights.qaWeight,
        ww_max_scores,
        pt_max_scores,
        qa_max_score,
        status: "Active",
      })
      .select(`
        *,
        teacher:profiles!class_records_teacher_id_fkey(id, full_name, email),
        subject:subjects_catalog!class_records_subject_id_fkey(id, subject_name, subject_code),
        section:sections!class_records_section_id_fkey(id, section_name, grade_level)
      `)
      .single();

    if (error || !data) {
      return { success: false, error: error?.message || "Failed to create class record." };
    }

    const createdRecord = data as ClassRecord;
    if (payload.autoSyncLearners !== false) {
      await syncEnrolledLearnersToClassRecord(createdRecord);
    }

    const detailed = await fetchClassRecordDetails(createdRecord.id);
    return { success: true, data: detailed || createdRecord };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error creating class record.";
    return { success: false, error: msg };
  }
}

export async function updateStudentGradeRecord(
  gradeId: string,
  record: ClassRecord,
  wwScores: number[],
  ptScores: number[],
  qaScore: number
): Promise<boolean> {
  try {
    const calc = computeStudentRowGrades(
      wwScores,
      ptScores,
      qaScore,
      record.ww_max_scores,
      record.pt_max_scores,
      record.qa_max_score,
      record.ww_weight,
      record.pt_weight,
      record.qa_weight
    );

    const { error } = await supabase
      .from("student_grades")
      .update({
        ww_scores: wwScores,
        pt_scores: ptScores,
        qa_score: qaScore,
        ww_total: calc.wwTotal,
        ww_percentage_score: calc.wwPS,
        ww_weighted_score: calc.wwWS,
        pt_total: calc.ptTotal,
        pt_percentage_score: calc.ptPS,
        pt_weighted_score: calc.ptWS,
        qa_percentage_score: calc.qaPS,
        qa_weighted_score: calc.qaWS,
        initial_grade: calc.initialGrade,
        transmuted_grade: calc.transmutedGrade,
        remarks: calc.remarks,
        updated_at: new Date().toISOString(),
      })
      .eq("id", gradeId);

    if (error) {
      console.error("updateStudentGradeRecord error:", error);
      return false;
    }
    return true;
  } catch (err) {
    console.error("updateStudentGradeRecord exception:", err);
    return false;
  }
}

export async function addStudentToClassRecord(
  classRecordId: string,
  record: ClassRecord,
  studentName: string,
  studentLrn: string,
  gender: "Male" | "Female"
): Promise<{ success: boolean; data?: StudentGrade; error?: string }> {
  try {
    const defaultWW = new Array(record.ww_max_scores.length).fill(0);
    const defaultPT = new Array(record.pt_max_scores.length).fill(0);
    const defaultQA = 0;

    const calc = computeStudentRowGrades(
      defaultWW,
      defaultPT,
      defaultQA,
      record.ww_max_scores,
      record.pt_max_scores,
      record.qa_max_score,
      record.ww_weight,
      record.pt_weight,
      record.qa_weight
    );

    const { data, error } = await supabase
      .from("student_grades")
      .insert({
        class_record_id: classRecordId,
        student_name: studentName.trim(),
        student_lrn: studentLrn.trim() || null,
        gender,
        ww_scores: defaultWW,
        pt_scores: defaultPT,
        qa_score: defaultQA,
        ww_total: calc.wwTotal,
        ww_percentage_score: calc.wwPS,
        ww_weighted_score: calc.wwWS,
        pt_total: calc.ptTotal,
        pt_percentage_score: calc.ptPS,
        pt_weighted_score: calc.ptWS,
        qa_percentage_score: calc.qaPS,
        qa_weighted_score: calc.qaWS,
        initial_grade: calc.initialGrade,
        transmuted_grade: calc.transmutedGrade,
        remarks: calc.remarks,
      })
      .select()
      .single();

    if (error || !data) {
      return { success: false, error: error?.message || "Failed to add student." };
    }

    return { success: true, data: data as StudentGrade };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error adding student.";
    return { success: false, error: msg };
  }
}

export async function deleteStudentFromClassRecord(gradeId: string): Promise<boolean> {
  try {
    const { error } = await supabase.from("student_grades").delete().eq("id", gradeId);
    if (error) {
      console.error("deleteStudentFromClassRecord error:", error);
      return false;
    }
    return true;
  } catch (err) {
    console.error("deleteStudentFromClassRecord exception:", err);
    return false;
  }
}

/**
 * Syncs all enrolled learners from `public.learners` for the record's section
 * into `student_grades` without overwriting existing student scores.
 */
export async function syncEnrolledLearnersToClassRecord(
  record: ClassRecord
): Promise<{ addedCount: number; grades: StudentGrade[] }> {
  try {
    const [{ data: enrolled }, { data: existingGrades }] = await Promise.all([
      supabase
        .from("learners")
        .select("*")
        .eq("section_id", record.section_id)
        .in("enrollment_status", ["Enrolled", "Transferred In"])
        .order("gender", { ascending: false })
        .order("full_name", { ascending: true }),
      supabase
        .from("student_grades")
        .select("*")
        .eq("class_record_id", record.id),
    ]);

    const existingList = (existingGrades || []) as StudentGrade[];
    const enrolledList = (enrolled || []) as Array<{
      id: string;
      lrn: string;
      full_name: string;
      gender: "Male" | "Female";
    }>;

    const existingByLearnerId = new Set(
      existingList.map((g) => g.learner_id).filter(Boolean)
    );
    const existingByLrn = new Set(
      existingList.map((g) => (g.student_lrn || "").trim()).filter(Boolean)
    );
    const existingByName = new Set(
      existingList.map((g) => g.student_name.trim().toLowerCase())
    );

    const missing = enrolledList.filter(
      (l) =>
        !existingByLearnerId.has(l.id) &&
        !existingByLrn.has(l.lrn.trim()) &&
        !existingByName.has(l.full_name.trim().toLowerCase())
    );

    if (missing.length === 0) {
      return { addedCount: 0, grades: existingList };
    }

    const defaultWW = new Array(record.ww_max_scores.length).fill(0);
    const defaultPT = new Array(record.pt_max_scores.length).fill(0);
    const defaultQA = 0;

    const calc = computeStudentRowGrades(
      defaultWW,
      defaultPT,
      defaultQA,
      record.ww_max_scores,
      record.pt_max_scores,
      record.qa_max_score,
      record.ww_weight,
      record.pt_weight,
      record.qa_weight
    );

    const insertRows = missing.map((l) => ({
      class_record_id: record.id,
      learner_id: l.id,
      student_name: l.full_name.trim(),
      student_lrn: l.lrn.trim(),
      gender: l.gender,
      ww_scores: defaultWW,
      pt_scores: defaultPT,
      qa_score: defaultQA,
      ww_total: calc.wwTotal,
      ww_percentage_score: calc.wwPS,
      ww_weighted_score: calc.wwWS,
      pt_total: calc.ptTotal,
      pt_percentage_score: calc.ptPS,
      pt_weighted_score: calc.ptWS,
      qa_percentage_score: calc.qaPS,
      qa_weighted_score: calc.qaWS,
      initial_grade: calc.initialGrade,
      transmuted_grade: calc.transmutedGrade,
      remarks: calc.remarks,
    }));

    const { error } = await supabase.from("student_grades").insert(insertRows);
    if (error) {
      console.error("syncEnrolledLearnersToClassRecord insert error:", error);
      return { addedCount: 0, grades: existingList };
    }

    const { data: refreshed } = await supabase
      .from("student_grades")
      .select("*")
      .eq("class_record_id", record.id)
      .order("student_name", { ascending: true });

    return {
      addedCount: insertRows.length,
      grades: (refreshed || existingList) as StudentGrade[],
    };
  } catch (err) {
    console.error("syncEnrolledLearnersToClassRecord exception:", err);
    return { addedCount: 0, grades: [] };
  }
}
