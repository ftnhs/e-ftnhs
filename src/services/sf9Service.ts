/**
 * sf9Service.ts
 * Consolidates Class Records across Terms 1, 2, 3 + SF2 Daily Attendance
 * to generate Class Summary sheets and official DepEd SF9 Report Cards
 * for Grades 7-10 (MATATAG JHS), Grade 11 (SSHS Academic & TechPro), and Grade 12 (Old SHS).
 */

import { supabase } from "../lib/supabase";
import { getSF9PerformanceDescriptor } from "./transmutationEngine";
import { isSshsGrade } from "../utils/shsCurriculum";
import type {
  Section,
  Learner,
  SectionSubject,
  ClassRecord,
  StudentGrade,
  SF9AdviserRecord,
  SF9LearnerReport,
  SF9SubjectGradeRow,
  SF9MonthlyAttendanceCell,
  Subject,
} from "../types";

export const SF9_MONTH_KEYS = [
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
  "Jan",
  "Feb",
  "Mar",
  "Apr",
] as const;

export const DEFAULT_SF9_CLASS_DAYS: Record<string, number> = {
  Jun: 20,
  Jul: 20,
  Aug: 20,
  Sep: 20,
  Oct: 20,
  Nov: 20,
  Dec: 20,
  Jan: 18,
  Feb: 18,
  Mar: 20,
  Apr: 5,
};

const MONTH_INDEX_TO_KEY: Record<number, string> = {
  5: "Jun",
  6: "Jul",
  7: "Aug",
  8: "Sep",
  9: "Oct",
  10: "Nov",
  11: "Dec",
  0: "Jan",
  1: "Feb",
  2: "Mar",
  3: "Apr",
};

export type SF9TemplateVariant =
  | "JHS_MATATAG"
  | "SSHS_ACADEMIC"
  | "SSHS_TECHPRO"
  | "OLD_SHS";

export interface ConsolidatedSectionData {
  section: Section;
  schoolYear: string;
  variant: SF9TemplateVariant;
  learners: Learner[];
  sectionSubjects: SectionSubject[];
  reports: SF9LearnerReport[];
}

function normalizeText(value?: string | null): string {
  return (value || "").trim().toLowerCase().replace(/\s+/g, " ");
}

function computeAge(birthdate?: string | null): number | null {
  if (!birthdate) return null;
  const dob = new Date(`${birthdate.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(dob.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
    age--;
  }
  return age >= 0 ? age : null;
}

export function detectSF9TemplateVariant(
  section: Section,
  schoolYear?: string | null
): SF9TemplateVariant {
  if (section.grade_level <= 10) return "JHS_MATATAG";
  if (isSshsGrade(section.grade_level, schoolYear)) {
    const track = `${section.track_strand || ""} ${section.section_name || ""}`.toLowerCase();
    if (/technical-professional|techpro|tvl|ict|afa|awh|ind-tech|auto|maritime|create|artisan|htm/.test(track)) {
      return "SSHS_TECHPRO";
    }
    return "SSHS_ACADEMIC";
  }
  return "OLD_SHS";
}

function isNonGradedGuidanceOrAral(subject: Pick<Subject, "subject_code" | "subject_name">): boolean {
  const code = subject.subject_code.toUpperCase();
  const name = subject.subject_name.toLowerCase();
  return (
    code.startsWith("HGP") ||
    code.startsWith("ARAL") ||
    code.startsWith("CAT") ||
    code.startsWith("REL") ||
    code.startsWith("REM") ||
    /homeroom guidance|religion|remedial/.test(name)
  );
}

function matchGradeForLearner(
  grades: StudentGrade[],
  learner: Learner
): StudentGrade | undefined {
  if (learner.id) {
    const byId = grades.find((g) => g.learner_id === learner.id);
    if (byId) return byId;
  }
  if (learner.lrn) {
    const cleanLrn = learner.lrn.trim();
    const byLrn = grades.find((g) => (g.student_lrn || "").trim() === cleanLrn);
    if (byLrn) return byLrn;
  }
  const normName = normalizeText(learner.full_name);
  return grades.find((g) => normalizeText(g.student_name) === normName);
}

/**
 * Loads all data across Terms 1-3 for the logical class (grade_level + section_name)
 * within the school year and compiles both the Class Summary & SF9 Reports.
 */
export async function fetchConsolidatedSF9ForSection(
  section: Section
): Promise<ConsolidatedSectionData> {
  // 1. Resolve school year & all term sibling section IDs (T1, T2, T3)
  const { data: activeTermRow } = await supabase
    .from("academic_terms")
    .select("school_year")
    .eq("id", section.term_id)
    .single();

  const schoolYear = activeTermRow?.school_year || "2026-2027";
  const { data: syTerms } = await supabase
    .from("academic_terms")
    .select("id, term_number")
    .eq("school_year", schoolYear);

  const termNumberByTermId = new Map<string, 1 | 2 | 3>();
  (syTerms || []).forEach((t: { id: string; term_number: number }) => {
    termNumberByTermId.set(t.id, t.term_number as 1 | 2 | 3);
  });

  const syTermIds = (syTerms || []).map((t: { id: string }) => t.id);
  const { data: siblingSections } = syTermIds.length > 0
    ? await supabase
        .from("sections")
        .select("id, term_id")
        .in("term_id", syTermIds)
        .eq("grade_level", section.grade_level)
        .eq("section_name", section.section_name)
    : { data: [{ id: section.id, term_id: section.term_id }] };

  const siblingIds = (siblingSections && siblingSections.length > 0
    ? siblingSections
    : [{ id: section.id, term_id: section.term_id }]
  ).map((s: { id: string }) => s.id);

  // 2. Fetch learners, section_subjects, class_records (+grades), sf9_adviser_records, attendance
  const [learnersRes, secSubRes, recordsRes, adviserRecRes, attendanceRes] = await Promise.all([
    supabase
      .from("learners")
      .select("*")
      .eq("section_id", section.id)
      .order("gender", { ascending: false })
      .order("full_name", { ascending: true }),
    supabase
      .from("section_subjects")
      .select(`
        *,
        subject:subjects_catalog(*),
        teacher:profiles!section_subjects_teacher_id_fkey(id, full_name, email, department, designation)
      `)
      .in("section_id", siblingIds)
      .order("sort_order", { ascending: true }),
    supabase
      .from("class_records")
      .select(`
        *,
        subject:subjects_catalog(*),
        grades:student_grades(*)
      `)
      .in("section_id", siblingIds),
    supabase
      .from("sf9_adviser_records")
      .select("*")
      .eq("section_id", section.id),
    supabase
      .from("daily_attendance_sessions")
      .select(`
        id,
        attendance_date,
        students:student_daily_attendance(student_name, student_lrn, status)
      `)
      .in("section_id", siblingIds),
  ]);

  const learners = ((learnersRes.data || []) as Learner[]).filter(
    (l) => l.enrollment_status === "Enrolled" || l.enrollment_status === "Transferred In"
  );

  // Deduplicate connected subjects across terms by subject_id (preserving order)
  const subjectMap = new Map<string, SectionSubject>();
  for (const row of (secSubRes.data || []) as SectionSubject[]) {
    if (!row.subject) continue;
    if (!subjectMap.has(row.subject_id)) {
      subjectMap.set(row.subject_id, row);
    }
  }

  // Also include any subject that already has a class_record even if not explicitly in section_subjects
  const classRecords = (recordsRes.data || []) as Array<
    ClassRecord & { grades?: StudentGrade[]; subject?: Subject }
  >;
  for (const cr of classRecords) {
    if (cr.subject && !subjectMap.has(cr.subject_id)) {
      subjectMap.set(cr.subject_id, {
        id: cr.id,
        term_id: cr.term_id,
        section_id: cr.section_id,
        subject_id: cr.subject_id,
        teacher_id: cr.teacher_id,
        curriculum_type: cr.curriculum_type,
        units: isSshsGrade(section.grade_level, schoolYear) ? 2 : 1,
        sort_order: 99,
        subject: cr.subject,
      });
    }
  }

  const sectionSubjects = Array.from(subjectMap.values()).filter(
    (ss) => ss.subject && !isNonGradedGuidanceOrAral(ss.subject)
  );

  // Index class_records by `${subject_id}_${effectiveTermNumber}`
  const gradesLookup = new Map<string, StudentGrade[]>();
  for (const cr of classRecords) {
    const effectiveTerm = cr.term_number || termNumberByTermId.get(cr.term_id) || 1;
    const key = `${cr.subject_id}_${effectiveTerm}`;
    const prev = gradesLookup.get(key) || [];
    gradesLookup.set(key, [...prev, ...(cr.grades || [])]);
  }

  // Index adviser records by learner_id
  const adviserRecMap = new Map<string, SF9AdviserRecord>();
  ((adviserRecRes.data || []) as SF9AdviserRecord[]).forEach((rec) => {
    adviserRecMap.set(rec.learner_id, rec);
  });

  // Compute attendance sessions grouped by month key
  const sessions = (attendanceRes.data || []) as Array<{
    id: string;
    attendance_date: string;
    students?: Array<{ student_name: string; student_lrn: string; status: string }>;
  }>;

  const variant = detectSF9TemplateVariant(section, schoolYear);
  const isOldShs = variant === "OLD_SHS";

  // Build SF9 report per learner
  const reports: SF9LearnerReport[] = learners.map((learner) => {
    const getSubjectTermGrade = (subjectId: string, termNum: 1 | 2 | 3): number | null => {
      const list = gradesLookup.get(`${subjectId}_${termNum}`) || [];
      const row = matchGradeForLearner(list, learner);
      if (!row || row.transmuted_grade <= 0) return null;
      return Math.round(row.transmuted_grade);
    };

    const rows: SF9SubjectGradeRow[] = [];

    if (variant === "SSHS_ACADEMIC" || variant === "SSHS_TECHPRO") {
      // Grade 11 SSHS: Combine Effective Communication + Mabisang Komunikasyon into one Core entry (6 units across 3 terms)
      const effComm = sectionSubjects.find((s) =>
        /effcomm|effective communication/i.test(`${s.subject?.subject_code} ${s.subject?.subject_name}`)
      );
      const mabKom = sectionSubjects.find((s) =>
        /mabisangkom|mabisang komunikasyon/i.test(`${s.subject?.subject_code} ${s.subject?.subject_name}`)
      );

      if (effComm || mabKom) {
        const effT: [number | null, number | null, number | null] = [
          effComm ? getSubjectTermGrade(effComm.subject_id, 1) : null,
          effComm ? getSubjectTermGrade(effComm.subject_id, 2) : null,
          effComm ? getSubjectTermGrade(effComm.subject_id, 3) : null,
        ];
        const mabT: [number | null, number | null, number | null] = [
          mabKom ? getSubjectTermGrade(mabKom.subject_id, 1) : null,
          mabKom ? getSubjectTermGrade(mabKom.subject_id, 2) : null,
          mabKom ? getSubjectTermGrade(mabKom.subject_id, 3) : null,
        ];

        const combT = [0, 1, 2].map((i) => {
          const e = effT[i] ?? null;
          const m = mabT[i] ?? null;
          if (e !== null && m !== null) return Math.round((e + m) / 2);
          return e ?? m ?? null;
        });

        const validComb = combT.filter((v): v is number => v !== null);
        const finalComb =
          validComb.length > 0
            ? Math.round(validComb.reduce((a, b) => a + b, 0) / validComb.length)
            : null;
        const { remarks } = getSF9PerformanceDescriptor(finalComb, false);

        rows.push({
          key: "sshs-comm-combined",
          subjectCode: "EFFCOMM+MABISANGKOM",
          label: "Effective Communication / Mabisang Komunikasyon",
          group: "Core",
          units: 6,
          t1: combT[0] ?? null,
          t2: combT[1] ?? null,
          t3: combT[2] ?? null,
          finalGrade: finalComb,
          remarks,
        });

        if (effComm) {
          rows.push({
            key: `sub-${effComm.subject_id}`,
            subjectId: effComm.subject_id,
            subjectCode: effComm.subject?.subject_code || "EFFCOMM-11",
            label: "Effective Communication",
            group: "Core",
            isSubRow: true,
            units: 0,
            t1: effT[0],
            t2: effT[1],
            t3: effT[2],
            finalGrade: null,
            remarks: "",
          });
        }
        if (mabKom) {
          rows.push({
            key: `sub-${mabKom.subject_id}`,
            subjectId: mabKom.subject_id,
            subjectCode: mabKom.subject?.subject_code || "MABISANGKOM-11",
            label: "Mabisang Komunikasyon",
            group: "Core",
            isSubRow: true,
            units: 0,
            t1: mabT[0],
            t2: mabT[1],
            t3: mabT[2],
            finalGrade: null,
            remarks: "",
          });
        }
      }

      // Remaining Core + Elective subjects
      for (const ss of sectionSubjects) {
        if (ss === effComm || ss === mabKom || !ss.subject) continue;
        const t1 = getSubjectTermGrade(ss.subject_id, 1);
        const t2 = getSubjectTermGrade(ss.subject_id, 2);
        const t3 = getSubjectTermGrade(ss.subject_id, 3);
        const valid = [t1, t2, t3].filter((v): v is number => v !== null);
        const finalGrade =
          valid.length > 0 ? Math.round(valid.reduce((a, b) => a + b, 0) / valid.length) : null;
        const { remarks } = getSF9PerformanceDescriptor(finalGrade, false);

        const isCore = ss.subject.category === "Core" || ss.curriculum_type === "SSHS Core";
        // Units in SF9 report show full-year units (e.g. 2/term -> 6; 4/term -> 12; elective -> 3 or 3*terms)
        const perTermUnits = Number(ss.units) || (isCore ? 2 : variant === "SSHS_TECHPRO" ? 4 : 3);
        const displayUnits = isCore ? perTermUnits * 3 : variant === "SSHS_TECHPRO" ? perTermUnits * 3 : perTermUnits;

        rows.push({
          key: ss.subject_id,
          subjectId: ss.subject_id,
          subjectCode: ss.subject.subject_code,
          label: ss.subject.subject_name.replace(/\s+11$/, ""),
          group: isCore ? "Core" : "Elective",
          units: displayUnits,
          t1,
          t2,
          t3,
          finalGrade,
          remarks,
        });
      }
    } else {
      // Grades 7-10 MATATAG JHS OR Grade 12 Old SHS (dynamic based on connected subjects!)
      for (const ss of sectionSubjects) {
        if (!ss.subject) continue;
        const t1 = getSubjectTermGrade(ss.subject_id, 1);
        const t2 = getSubjectTermGrade(ss.subject_id, 2);
        const t3 = getSubjectTermGrade(ss.subject_id, 3);
        const valid = [t1, t2, t3].filter((v): v is number => v !== null);
        const finalGrade =
          valid.length > 0 ? Math.round(valid.reduce((a, b) => a + b, 0) / valid.length) : null;
        const { remarks } = getSF9PerformanceDescriptor(finalGrade, isOldShs);

        let group: SF9SubjectGradeRow["group"] = "JHS";
        if (isOldShs) {
          if (ss.subject.category === "Core") group = "Core";
          else if (ss.subject.category === "Applied") group = "Applied";
          else group = "Specialized";
        }

        rows.push({
          key: ss.subject_id,
          subjectId: ss.subject_id,
          subjectCode: ss.subject.subject_code,
          label: ss.subject.subject_name,
          group,
          units: Number(ss.units) || 1,
          t1,
          t2,
          t3,
          finalGrade,
          remarks,
        });
      }
    }

    // General Average (unit-weighted for SSHS, simple average for JHS / Old SHS)
    const gradedRows = rows.filter((r) => !r.isSubRow && r.finalGrade !== null);
    let generalAverage: number | null = null;
    if (gradedRows.length > 0) {
      if (variant === "SSHS_ACADEMIC" || variant === "SSHS_TECHPRO") {
        const totalW = gradedRows.reduce((s, r) => s + (r.units || 1), 0);
        const weightedSum = gradedRows.reduce((s, r) => s + (r.finalGrade || 0) * (r.units || 1), 0);
        generalAverage = totalW > 0 ? Math.round(weightedSum / totalW) : null;
      } else {
        generalAverage = Math.round(
          gradedRows.reduce((s, r) => s + (r.finalGrade || 0), 0) / gradedRows.length
        );
      }
    }

    const totalUnits = rows
      .filter((r) => !r.isSubRow)
      .reduce((sum, r) => sum + (r.units || 0), 0);

    const { remarks: generalRemarks } = getSF9PerformanceDescriptor(generalAverage, isOldShs);

    // Attendance summary across months (SF2 sessions + optional adviser manual override)
    const adviserRecord = adviserRecMap.get(learner.id) || null;
    const manualAtt = adviserRecord?.manual_attendance || {};
    const attendanceByMonth: Record<string, SF9MonthlyAttendanceCell> = {};

    // Count recorded SF2 days per month
    const sf2MonthTotals = new Map<string, { classDays: number; present: number; absent: number }>();
    for (const sess of sessions) {
      const dt = new Date(`${sess.attendance_date.slice(0, 10)}T00:00:00`);
      const mKey = MONTH_INDEX_TO_KEY[dt.getMonth()];
      if (!mKey) continue;
      const bucket = sf2MonthTotals.get(mKey) || { classDays: 0, present: 0, absent: 0 };
      bucket.classDays += 1;
      const stRec = (sess.students || []).find(
        (st) =>
          st.student_lrn === learner.lrn ||
          normalizeText(st.student_name) === normalizeText(learner.full_name)
      );
      if (stRec) {
        if (stRec.status === "Present" || stRec.status === "Tardy") {
          bucket.present += 1;
        } else if (stRec.status === "Absent") {
          bucket.absent += 1;
        }
      }
      sf2MonthTotals.set(mKey, bucket);
    }

    let totalClassDays = 0;
    let totalPresent = 0;
    let totalAbsent = 0;

    for (const mKey of SF9_MONTH_KEYS) {
      const override = manualAtt[mKey];
      const sf2 = sf2MonthTotals.get(mKey);
      const classDays = override?.classDays ?? (sf2 ? sf2.classDays : DEFAULT_SF9_CLASS_DAYS[mKey] ?? 0);
      const present = override?.present ?? (sf2 ? sf2.present : 0);
      const absent = override?.absent ?? Math.max(0, classDays - present);
      attendanceByMonth[mKey] = { classDays, present, absent };
      totalClassDays += classDays;
      totalPresent += present;
      totalAbsent += absent;
    }

    return {
      learner,
      age: computeAge(learner.birthdate),
      rows,
      generalAverage,
      generalRemarks,
      totalUnits,
      adviserRecord,
      attendanceByMonth,
      totalClassDays,
      totalPresent,
      totalAbsent,
    };
  });

  return {
    section,
    schoolYear,
    variant,
    learners,
    sectionSubjects,
    reports,
  };
}

export async function saveSF9AdviserRecord(payload: {
  sectionId: string;
  learnerId: string;
  term1_remarks?: string | null;
  term2_remarks?: string | null;
  term3_remarks?: string | null;
  admitted_to_grade?: string | null;
  eligible_for_grade?: string | null;
  transfer_school?: string | null;
  transfer_date?: string | null;
  manual_attendance?: Record<string, SF9MonthlyAttendanceCell>;
  updated_by: string;
}): Promise<SF9AdviserRecord> {
  const { data, error } = await supabase
    .from("sf9_adviser_records")
    .upsert(
      {
        section_id: payload.sectionId,
        learner_id: payload.learnerId,
        term1_remarks: payload.term1_remarks ?? null,
        term2_remarks: payload.term2_remarks ?? null,
        term3_remarks: payload.term3_remarks ?? null,
        admitted_to_grade: payload.admitted_to_grade ?? null,
        eligible_for_grade: payload.eligible_for_grade ?? null,
        transfer_school: payload.transfer_school ?? null,
        transfer_date: payload.transfer_date || null,
        manual_attendance: payload.manual_attendance ?? {},
        updated_by: payload.updated_by,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "section_id,learner_id" }
    )
    .select()
    .single();

  if (error) throw error;
  return data as SF9AdviserRecord;
}
