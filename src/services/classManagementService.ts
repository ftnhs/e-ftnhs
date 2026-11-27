/**
 * classManagementService.ts
 * Manages Classes (Sections + Advisers + Track/Strand), Enrolled Learners Masterlist,
 * and Connected Section Subjects + Subject Teachers for SY 2026-2027.
 */

import { supabase } from "../lib/supabase";
import { sanitizeSpreadsheetValue } from "./fileSanitizer";
import { inferCurriculumAndUnits } from "./transmutationEngine";
import type {
  Section,
  Learner,
  SectionSubject,
  Subject,
  Profile,
  CurriculumType,
  EnrollmentStatus,
  AcademicTerm,
} from "../types";

export interface ClassOverviewItem {
  section: Section;
  learnerCount: number;
  subjectCount: number;
}

export interface AssignedClassSubjectItem {
  section: Section;
  subject: Subject;
  curriculumType: CurriculumType;
  units: number;
  existingRecordId?: string;
  source: "section_subject" | "teacher_load";
}

/**
 * Finds all sibling section IDs across Terms 1-3 of the same school year
 * matching (grade_level, section_name).
 */
async function getSiblingSectionsInSchoolYear(
  section: Pick<Section, "id" | "term_id" | "grade_level" | "section_name">
): Promise<Array<{ id: string; term_id: string }>> {
  const { data: termRow } = await supabase
    .from("academic_terms")
    .select("school_year")
    .eq("id", section.term_id)
    .single();

  if (!termRow?.school_year) return [{ id: section.id, term_id: section.term_id }];

  const { data: syTerms } = await supabase
    .from("academic_terms")
    .select("id")
    .eq("school_year", termRow.school_year);

  const termIds = (syTerms || []).map((t) => t.id);
  if (termIds.length === 0) return [{ id: section.id, term_id: section.term_id }];

  const { data: siblings } = await supabase
    .from("sections")
    .select("id, term_id")
    .in("term_id", termIds)
    .eq("grade_level", section.grade_level)
    .eq("section_name", section.section_name);

  return (siblings && siblings.length > 0 ? siblings : [{ id: section.id, term_id: section.term_id }]) as Array<{
    id: string;
    term_id: string;
  }>;
}

export async function fetchClassesWithStats(termId: string): Promise<ClassOverviewItem[]> {
  const [secRes, learnersRes, subRes] = await Promise.all([
    supabase
      .from("sections")
      .select(`
        *,
        adviser:profiles!sections_adviser_id_fkey(id, full_name, email),
        room:rooms_catalog(id, room_number, room_name, room_type, capacity, is_specialized)
      `)
      .eq("term_id", termId)
      .order("grade_level", { ascending: true })
      .order("section_name", { ascending: true }),
    supabase.from("learners").select("section_id").eq("term_id", termId),
    supabase.from("section_subjects").select("section_id").eq("term_id", termId),
  ]);

  if (secRes.error) {
    console.error("fetchClassesWithStats error:", secRes.error);
    return [];
  }

  const learnerCounts = new Map<string, number>();
  (learnersRes.data || []).forEach((r: { section_id: string }) => {
    learnerCounts.set(r.section_id, (learnerCounts.get(r.section_id) || 0) + 1);
  });

  const subjectCounts = new Map<string, number>();
  (subRes.data || []).forEach((r: { section_id: string }) => {
    subjectCounts.set(r.section_id, (subjectCounts.get(r.section_id) || 0) + 1);
  });

  return ((secRes.data || []) as Section[]).map((section) => ({
    section,
    learnerCount: learnerCounts.get(section.id) || 0,
    subjectCount: subjectCounts.get(section.id) || 0,
  }));
}

export async function updateSectionAdviserAndTrack(
  section: Section,
  adviserId: string | null,
  trackStrand: string | null,
  syncAcrossSchoolYear = true
): Promise<boolean> {
  const payload = {
    adviser_id: adviserId || null,
    track_strand: trackStrand?.trim() || null,
  };

  if (syncAcrossSchoolYear) {
    const siblings = await getSiblingSectionsInSchoolYear(section);
    const ids = siblings.map((s) => s.id);
    const { error } = await supabase.from("sections").update(payload).in("id", ids);
    if (error) throw error;
  } else {
    const { error } = await supabase.from("sections").update(payload).eq("id", section.id);
    if (error) throw error;
  }
  return true;
}

// ============================================================================
// LEARNERS ROSTER MANAGEMENT
// ============================================================================

export async function fetchLearnersBySection(sectionId: string): Promise<Learner[]> {
  const { data, error } = await supabase
    .from("learners")
    .select("*")
    .eq("section_id", sectionId)
    .order("gender", { ascending: false }) // Male first, then Female
    .order("full_name", { ascending: true });

  if (error) {
    console.error("fetchLearnersBySection error:", error);
    return [];
  }
  return (data || []) as Learner[];
}

export async function enrollLearner(payload: {
  section: Section;
  lrn: string;
  full_name: string;
  gender: "Male" | "Female";
  birthdate?: string | null;
  age_june?: number | null;
  mother_tongue?: string | null;
  ip_ethnic_group?: string | null;
  religion?: string | null;
  address_street?: string | null;
  address_barangay?: string | null;
  address_municipality?: string | null;
  address_province?: string | null;
  father_name?: string | null;
  mother_maiden_name?: string | null;
  guardian_name?: string | null;
  guardian_relationship?: string | null;
  parent_guardian_contact?: string | null;
  learning_modality?: string | null;
  sf1_remarks?: string | null;
  enrollment_status?: EnrollmentStatus;
  syncAcrossSchoolYear?: boolean;
}): Promise<Learner | null> {
  const cleanLrn = sanitizeSpreadsheetValue(payload.lrn).replace(/^'/, "").trim();
  const cleanName = sanitizeSpreadsheetValue(payload.full_name).replace(/^'/, "").trim();
  const targets = payload.syncAcrossSchoolYear
    ? await getSiblingSectionsInSchoolYear(payload.section)
    : [{ id: payload.section.id, term_id: payload.section.term_id }];

  const rows = targets.map((t) => ({
    term_id: t.term_id,
    section_id: t.id,
    lrn: cleanLrn,
    full_name: cleanName,
    gender: payload.gender,
    birthdate: payload.birthdate || null,
    age_june: payload.age_june ?? null,
    mother_tongue: payload.mother_tongue || null,
    ip_ethnic_group: payload.ip_ethnic_group || null,
    religion: payload.religion || null,
    address_street: payload.address_street || null,
    address_barangay: payload.address_barangay || null,
    address_municipality: payload.address_municipality || null,
    address_province: payload.address_province || null,
    father_name: payload.father_name || null,
    mother_maiden_name: payload.mother_maiden_name || null,
    guardian_name: payload.guardian_name || null,
    guardian_relationship: payload.guardian_relationship || null,
    parent_guardian_contact: payload.parent_guardian_contact || null,
    learning_modality: payload.learning_modality || "Face to Face",
    sf1_remarks: payload.sf1_remarks || null,
    enrollment_status: payload.enrollment_status || "Enrolled",
    updated_at: new Date().toISOString(),
  }));

  const { data, error } = await supabase
    .from("learners")
    .upsert(rows, { onConflict: "section_id,lrn" })
    .select();

  if (error) throw error;
  const matched = ((data || []) as Learner[]).find((r) => r.section_id === payload.section.id);
  return matched || ((data || [])[0] as Learner) || null;
}

export async function bulkImportLearnersToSection(
  section: Section,
  entries: Array<{
    lrn: string;
    full_name: string;
    gender: "Male" | "Female";
    birthdate?: string | null;
    age_june?: number | null;
    mother_tongue?: string | null;
    ip_ethnic_group?: string | null;
    religion?: string | null;
    address_street?: string | null;
    address_barangay?: string | null;
    address_municipality?: string | null;
    address_province?: string | null;
    father_name?: string | null;
    mother_maiden_name?: string | null;
    guardian_name?: string | null;
    guardian_relationship?: string | null;
    parent_guardian_contact?: string | null;
    learning_modality?: string | null;
    sf1_remarks?: string | null;
    enrollment_status?: EnrollmentStatus;
  }>,
  syncAcrossSchoolYear = true
): Promise<number> {
  if (entries.length === 0) return 0;

  const targets = syncAcrossSchoolYear
    ? await getSiblingSectionsInSchoolYear(section)
    : [{ id: section.id, term_id: section.term_id }];

  const now = new Date().toISOString();
  const rows: Array<Record<string, unknown>> = [];

  for (const t of targets) {
    for (const item of entries) {
      const cleanLrn = sanitizeSpreadsheetValue(item.lrn).replace(/^'/, "").trim();
      const cleanName = sanitizeSpreadsheetValue(item.full_name).replace(/^'/, "").trim();
      if (!cleanLrn || !cleanName) continue;
      rows.push({
        term_id: t.term_id,
        section_id: t.id,
        lrn: cleanLrn,
        full_name: cleanName,
        gender: item.gender,
        birthdate: item.birthdate || null,
        age_june: item.age_june ?? null,
        mother_tongue: item.mother_tongue || null,
        ip_ethnic_group: item.ip_ethnic_group || null,
        religion: item.religion || null,
        address_street: item.address_street || null,
        address_barangay: item.address_barangay || null,
        address_municipality: item.address_municipality || null,
        address_province: item.address_province || null,
        father_name: item.father_name || null,
        mother_maiden_name: item.mother_maiden_name || null,
        guardian_name: item.guardian_name || null,
        guardian_relationship: item.guardian_relationship || null,
        parent_guardian_contact: item.parent_guardian_contact || null,
        learning_modality: item.learning_modality || "Face to Face",
        sf1_remarks: item.sf1_remarks || null,
        enrollment_status: item.enrollment_status || "Enrolled",
        updated_at: now,
      });
    }
  }

  if (rows.length === 0) return 0;

  const { error } = await supabase
    .from("learners")
    .upsert(rows, { onConflict: "section_id,lrn" });

  if (error) throw error;
  return entries.length;
}

export async function updateLearner(
  learnerId: string,
  updates: Partial<
    Pick<
      Learner,
      | "lrn"
      | "full_name"
      | "gender"
      | "birthdate"
      | "age_june"
      | "mother_tongue"
      | "ip_ethnic_group"
      | "religion"
      | "address_street"
      | "address_barangay"
      | "address_municipality"
      | "address_province"
      | "father_name"
      | "mother_maiden_name"
      | "guardian_name"
      | "guardian_relationship"
      | "parent_guardian_contact"
      | "learning_modality"
      | "sf1_remarks"
      | "enrollment_status"
    >
  >
): Promise<Learner> {
  const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (updates.lrn !== undefined) payload.lrn = updates.lrn.trim();
  if (updates.full_name !== undefined) payload.full_name = updates.full_name.trim();
  if (updates.gender !== undefined) payload.gender = updates.gender;
  if (updates.birthdate !== undefined) payload.birthdate = updates.birthdate || null;
  if (updates.age_june !== undefined) payload.age_june = updates.age_june ?? null;
  if (updates.mother_tongue !== undefined) payload.mother_tongue = updates.mother_tongue || null;
  if (updates.ip_ethnic_group !== undefined) payload.ip_ethnic_group = updates.ip_ethnic_group || null;
  if (updates.religion !== undefined) payload.religion = updates.religion || null;
  if (updates.address_street !== undefined) payload.address_street = updates.address_street || null;
  if (updates.address_barangay !== undefined) payload.address_barangay = updates.address_barangay || null;
  if (updates.address_municipality !== undefined) payload.address_municipality = updates.address_municipality || null;
  if (updates.address_province !== undefined) payload.address_province = updates.address_province || null;
  if (updates.father_name !== undefined) payload.father_name = updates.father_name || null;
  if (updates.mother_maiden_name !== undefined) payload.mother_maiden_name = updates.mother_maiden_name || null;
  if (updates.guardian_name !== undefined) payload.guardian_name = updates.guardian_name || null;
  if (updates.guardian_relationship !== undefined) payload.guardian_relationship = updates.guardian_relationship || null;
  if (updates.parent_guardian_contact !== undefined) payload.parent_guardian_contact = updates.parent_guardian_contact || null;
  if (updates.learning_modality !== undefined) payload.learning_modality = updates.learning_modality || null;
  if (updates.sf1_remarks !== undefined) payload.sf1_remarks = updates.sf1_remarks || null;
  if (updates.enrollment_status !== undefined) payload.enrollment_status = updates.enrollment_status;

  const { data, error } = await supabase
    .from("learners")
    .update(payload)
    .eq("id", learnerId)
    .select()
    .single();

  if (error) throw error;
  return data as Learner;
}

export async function deleteLearner(learnerId: string): Promise<void> {
  const { error } = await supabase.from("learners").delete().eq("id", learnerId);
  if (error) throw error;
}

export async function syncSectionLearnersAcrossSchoolYear(sourceSection: Section): Promise<number> {
  const [learners, siblings] = await Promise.all([
    fetchLearnersBySection(sourceSection.id),
    getSiblingSectionsInSchoolYear(sourceSection),
  ]);
  const otherTargets = siblings.filter((s) => s.id !== sourceSection.id);
  if (learners.length === 0 || otherTargets.length === 0) return 0;

  const rows: Array<Record<string, unknown>> = [];
  for (const target of otherTargets) {
    for (const l of learners) {
      rows.push({
        term_id: target.term_id,
        section_id: target.id,
        lrn: l.lrn,
        full_name: l.full_name,
        gender: l.gender,
        birthdate: l.birthdate || null,
        age_june: l.age_june ?? null,
        mother_tongue: l.mother_tongue || null,
        ip_ethnic_group: l.ip_ethnic_group || null,
        religion: l.religion || null,
        address_street: l.address_street || null,
        address_barangay: l.address_barangay || null,
        address_municipality: l.address_municipality || null,
        address_province: l.address_province || null,
        father_name: l.father_name || null,
        mother_maiden_name: l.mother_maiden_name || null,
        guardian_name: l.guardian_name || null,
        guardian_relationship: l.guardian_relationship || null,
        parent_guardian_contact: l.parent_guardian_contact || null,
        learning_modality: l.learning_modality || "Face to Face",
        sf1_remarks: l.sf1_remarks || null,
        enrollment_status: l.enrollment_status,
        updated_at: new Date().toISOString(),
      });
    }
  }

  const { error } = await supabase.from("learners").upsert(rows, { onConflict: "section_id,lrn" });
  if (error) throw error;
  return learners.length;
}

// ============================================================================
// CONNECTED SUBJECTS & TEACHERS PER SECTION
// ============================================================================

export async function fetchSectionSubjects(sectionId: string): Promise<SectionSubject[]> {
  const { data, error } = await supabase
    .from("section_subjects")
    .select(`
      *,
      subject:subjects_catalog(*),
      teacher:profiles!section_subjects_teacher_id_fkey(id, full_name, email, department, designation)
    `)
    .eq("section_id", sectionId)
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("fetchSectionSubjects error:", error);
    return [];
  }
  return (data || []) as SectionSubject[];
}

export async function upsertSectionSubject(payload: {
  section: Section;
  subject: Subject;
  teacherId: string | null;
  curriculumType: CurriculumType;
  units: number;
  sortOrder?: number;
  syncAcrossSchoolYear?: boolean;
}): Promise<SectionSubject | null> {
  const targets = payload.syncAcrossSchoolYear
    ? await getSiblingSectionsInSchoolYear(payload.section)
    : [{ id: payload.section.id, term_id: payload.section.term_id }];

  const rows = targets.map((t) => ({
    term_id: t.term_id,
    section_id: t.id,
    subject_id: payload.subject.id,
    teacher_id: payload.teacherId || null,
    curriculum_type: payload.curriculumType,
    units: payload.units,
    sort_order: payload.sortOrder ?? 1,
  }));

  const { data, error } = await supabase
    .from("section_subjects")
    .upsert(rows, { onConflict: "section_id,subject_id" })
    .select(`
      *,
      subject:subjects_catalog(*),
      teacher:profiles!section_subjects_teacher_id_fkey(id, full_name, email, department, designation)
    `);

  if (error) throw error;
  const matched = ((data || []) as SectionSubject[]).find((r) => r.section_id === payload.section.id);
  return matched || ((data || [])[0] as SectionSubject) || null;
}

export async function deleteSectionSubject(id: string): Promise<void> {
  const { error } = await supabase.from("section_subjects").delete().eq("id", id);
  if (error) throw error;
}

/**
 * Pulls any teacher_subject_loads assigned to a section into section_subjects
 * so Class Management and Faculty Loading stay completely aligned.
 */
export async function syncSectionSubjectsFromLoads(
  section: Section,
  schoolYear?: string | null
): Promise<number> {
  let effectiveSchoolYear = schoolYear;
  if (!effectiveSchoolYear && section.term_id) {
    const { data: termRow } = await supabase
      .from("academic_terms")
      .select("school_year")
      .eq("id", section.term_id)
      .single();
    effectiveSchoolYear = termRow?.school_year || null;
  }

  const { data: loads, error } = await supabase
    .from("teacher_subject_loads")
    .select("*, subject:subjects_catalog(*)")
    .eq("section_id", section.id);

  if (error) throw error;
  if (!loads || loads.length === 0) return 0;

  const rows = loads
    .filter((l: { subject?: Subject }) => Boolean(l.subject))
    .map((l: { term_id: string; section_id: string; subject_id: string; teacher_id: string; subject: Subject }, idx: number) => {
      const inferred = inferCurriculumAndUnits(
        section.grade_level,
        l.subject,
        section,
        effectiveSchoolYear
      );
      return {
        term_id: l.term_id,
        section_id: l.section_id,
        subject_id: l.subject_id,
        teacher_id: l.teacher_id,
        curriculum_type: inferred.curriculumType,
        units: inferred.units,
        sort_order: idx + 1,
      };
    });

  if (rows.length === 0) return 0;

  const { error: upsertErr } = await supabase
    .from("section_subjects")
    .upsert(rows, { onConflict: "section_id,subject_id" });

  if (upsertErr) throw upsertErr;
  return rows.length;
}

/**
 * Fetches all (Section, Subject) combinations handled by a subject teacher
 * in the active term (combining section_subjects and teacher_subject_loads),
 * and checks whether an E-Class Record already exists.
 */
export async function fetchTeacherAssignedClassSubjects(
  teacherId: string,
  termId: string,
  termNumber: 1 | 2 | 3,
  schoolYear?: string | null
): Promise<AssignedClassSubjectItem[]> {
  const [secSubRes, loadsRes, recordsRes] = await Promise.all([
    supabase
      .from("section_subjects")
      .select(`
        *,
        section:sections(*),
        subject:subjects_catalog(*)
      `)
      .eq("term_id", termId)
      .eq("teacher_id", teacherId),
    supabase
      .from("teacher_subject_loads")
      .select(`
        *,
        section:sections(*),
        subject:subjects_catalog(*)
      `)
      .eq("term_id", termId)
      .eq("teacher_id", teacherId),
    supabase
      .from("class_records")
      .select("id, section_id, subject_id, term_number")
      .eq("term_id", termId)
      .eq("teacher_id", teacherId)
      .eq("term_number", termNumber),
  ]);

  const recordMap = new Map<string, string>();
  (recordsRes.data || []).forEach((r: { id: string; section_id: string; subject_id: string }) => {
    recordMap.set(`${r.section_id}_${r.subject_id}`, r.id);
  });

  const combined = new Map<string, AssignedClassSubjectItem>();

  for (const row of (secSubRes.data || []) as Array<{
    section: Section;
    subject: Subject;
    curriculum_type: CurriculumType;
    units: number;
  }>) {
    if (!row.section || !row.subject) continue;
    const key = `${row.section.id}_${row.subject.id}`;
    combined.set(key, {
      section: row.section,
      subject: row.subject,
      curriculumType: row.curriculum_type,
      units: Number(row.units) || 1,
      existingRecordId: recordMap.get(key),
      source: "section_subject",
    });
  }

  for (const row of (loadsRes.data || []) as Array<{
    section: Section;
    subject: Subject;
  }>) {
    if (!row.section || !row.subject) continue;
    const key = `${row.section.id}_${row.subject.id}`;
    if (combined.has(key)) continue;
    const inferred = inferCurriculumAndUnits(
      row.section.grade_level,
      row.subject,
      row.section,
      schoolYear
    );
    combined.set(key, {
      section: row.section,
      subject: row.subject,
      curriculumType: inferred.curriculumType,
      units: inferred.units,
      existingRecordId: recordMap.get(key),
      source: "teacher_load",
    });
  }

  return Array.from(combined.values()).sort((a, b) => {
    const gradeDiff = a.section.grade_level - b.section.grade_level;
    if (gradeDiff !== 0) return gradeDiff;
    const secDiff = a.section.section_name.localeCompare(b.section.section_name);
    if (secDiff !== 0) return secDiff;
    return a.subject.subject_name.localeCompare(b.subject.subject_name);
  });
}

export async function fetchSchoolTermsAndFaculty(): Promise<{
  terms: AcademicTerm[];
  faculty: Profile[];
}> {
  const [termsRes, facRes] = await Promise.all([
    supabase
      .from("academic_terms")
      .select("*")
      .order("school_year", { ascending: false })
      .order("term_number", { ascending: true }),
    supabase
      .from("profiles")
      .select("*")
      .eq("status", "Approved")
      .order("full_name", { ascending: true }),
  ]);

  return {
    terms: (termsRes.data || []) as AcademicTerm[],
    faculty: ((facRes.data || []) as Profile[]).filter(
      (p) => p.is_teaching === true || p.role === "Teacher" || p.role === "Super Admin"
    ),
  };
}
