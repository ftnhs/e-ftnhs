import { supabase } from "../lib/supabase";
import { schoolReferenceService } from "./schoolReferenceService";
import type {
  AcademicTerm,
  Department,
  LessonPlan,
  LessonPlanAnalyticsData,
  LessonPlanAttachment,
  LessonPlanStatus,
  Section,
  Subject,
} from "../types";

/**
 * Fetches lesson plans based on user role:
 * - Super Admins & School Head: All faculty lesson plans
 * - Teachers: Strictly their own DLL submissions
 */
export async function fetchAllLessonPlans(
  currentUserId?: string,
  userRole?: string
): Promise<LessonPlan[]> {
  const isPrivileged = userRole === "Super Admin" || userRole === "School Head";

  let query = supabase
    .from("lesson_plans")
    .select(`
      *,
      teacher:profiles!lesson_plans_teacher_id_fkey(id, full_name, email, department, avatar_url),
      reviewer:profiles!lesson_plans_reviewed_by_fkey(id, full_name, role)
    `)
    .order("week_number", { ascending: false })
    .order("submission_date", { ascending: false });

  if (!isPrivileged && currentUserId) {
    query = query.eq("teacher_id", currentUserId);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[LessonPlanService] Error fetching lesson plans:", error);
    // If foreign key join fails due to PostgREST schema cache, fallback to simple select
    let fallbackQuery = supabase
      .from("lesson_plans")
      .select("*")
      .order("week_number", { ascending: false });

    if (!isPrivileged && currentUserId) {
      fallbackQuery = fallbackQuery.eq("teacher_id", currentUserId);
    }

    const { data: fallbackData } = await fallbackQuery;
    return (fallbackData || []) as LessonPlan[];
  }

  return (data || []) as LessonPlan[];
}

/**
 * Fetches lesson plans submitted by a specific teacher
 */
export async function fetchTeacherLessonPlans(teacherId: string): Promise<LessonPlan[]> {
  const { data, error } = await supabase
    .from("lesson_plans")
    .select("*")
    .eq("teacher_id", teacherId)
    .order("week_number", { ascending: false });

  if (error) {
    console.error("[LessonPlanService] Error fetching teacher lesson plans:", error);
    return [];
  }

  return (data || []) as LessonPlan[];
}

export interface NewLessonPlanPayload {
  teacher_id: string;
  term_id?: string | null;
  subject_name: string;
  grade_level: number;
  section_name: string;
  department: string;
  week_number: number;
  title: string;
  learning_competencies?: string;
  file_url?: string | null;
  file_name?: string | null;
  file_size?: number | null;
  mime_type?: string | null;
  attachments?: LessonPlanAttachment[];
  is_late?: boolean;
}

export interface LessonPlanModalCatalogs {
  activeTerm: AcademicTerm | null;
  departments: Department[];
  sections: Section[];
  subjects: Subject[];
  teacherLoadPairs: Array<{ subject_id: string; section_id: string }>;
}

/**
 * Normalizes a lesson plan's attachments list, preserving backwards compatibility
 * with legacy single-file columns.
 */
export function getLessonPlanAttachments(plan: LessonPlan): LessonPlanAttachment[] {
  if (Array.isArray(plan.attachments) && plan.attachments.length > 0) {
    return plan.attachments.filter((a) => Boolean(a?.file_url));
  }
  if (plan.file_url) {
    return [
      {
        file_url: plan.file_url,
        file_name: plan.file_name || "Lesson Plan Document",
        file_size: plan.file_size ?? null,
        mime_type: plan.mime_type ?? null,
      },
    ];
  }
  return [];
}

/**
 * Fetches live database catalogs scoped to the active academic term for the DLL submit modal.
 */
export async function fetchLessonPlanModalCatalogs(
  teacherId?: string
): Promise<LessonPlanModalCatalogs> {
  const [terms, allDepartments] = await Promise.all([
    schoolReferenceService.fetchAcademicTerms(),
    schoolReferenceService.fetchDepartments(),
  ]);

  const activeTerm = terms.find((t) => t.is_active) || terms[0] || null;
  const departments = allDepartments.filter((d) => d.is_active !== false);

  if (!activeTerm) {
    const [sections, subjects] = await Promise.all([
      schoolReferenceService.fetchSections(),
      schoolReferenceService.fetchSubjects(),
    ]);
    return { activeTerm: null, departments, sections, subjects, teacherLoadPairs: [] };
  }

  const [sections, loadsRes] = await Promise.all([
    schoolReferenceService.fetchSections(activeTerm.id),
    supabase
      .from("teacher_subject_loads")
      .select("teacher_id, subject_id, section_id, subject:subjects_catalog(*)")
      .eq("term_id", activeTerm.id),
  ]);

  const subjectMap = new Map<string, Subject>();
  const teacherLoadPairs: Array<{ subject_id: string; section_id: string }> = [];

  if (!loadsRes.error && loadsRes.data) {
    for (const row of loadsRes.data as Array<{
      teacher_id: string;
      subject_id: string;
      section_id: string;
      subject: Subject | Subject[] | null;
    }>) {
      const subj = Array.isArray(row.subject) ? row.subject[0] : row.subject;
      if (subj?.id && !subjectMap.has(subj.id)) {
        subjectMap.set(subj.id, subj);
      }
      if (teacherId && row.teacher_id === teacherId) {
        teacherLoadPairs.push({ subject_id: row.subject_id, section_id: row.section_id });
      }
    }
  }

  // Fallback to full catalog only if the active term has no subject loads assigned yet
  const subjects =
    subjectMap.size > 0
      ? Array.from(subjectMap.values()).sort(
          (a, b) => a.grade_level - b.grade_level || a.subject_name.localeCompare(b.subject_name)
        )
      : await schoolReferenceService.fetchSubjects();

  return { activeTerm, departments, sections, subjects, teacherLoadPairs };
}

/**
 * Submits a new lesson plan to Supabase
 */
export async function submitLessonPlan(payload: NewLessonPlanPayload): Promise<LessonPlan | null> {
  const attachments = payload.attachments || [];
  const primary = attachments[0];

  const { data, error } = await supabase
    .from("lesson_plans")
    .insert({
      ...payload,
      file_url: payload.file_url ?? primary?.file_url ?? null,
      file_name: payload.file_name ?? primary?.file_name ?? null,
      file_size: payload.file_size ?? primary?.file_size ?? null,
      mime_type: payload.mime_type ?? primary?.mime_type ?? null,
      attachments,
      status: "Submitted",
      submission_date: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error("[LessonPlanService] Error submitting lesson plan:", error);
    throw error;
  }

  return data as LessonPlan;
}

/**
 * Updates an existing lesson plan submission (teacher edit / CRUD update)
 */
export async function updateLessonPlan(
  planId: string,
  payload: Partial<NewLessonPlanPayload> & { status?: LessonPlanStatus }
): Promise<LessonPlan | null> {
  const attachments = payload.attachments ?? [];
  const primary = attachments[0];

  const updateBody: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (payload.week_number !== undefined) updateBody.week_number = payload.week_number;
  if (payload.department !== undefined) updateBody.department = payload.department;
  if (payload.subject_name !== undefined) updateBody.subject_name = payload.subject_name;
  if (payload.grade_level !== undefined) updateBody.grade_level = payload.grade_level;
  if (payload.section_name !== undefined) updateBody.section_name = payload.section_name;
  if (payload.title !== undefined) updateBody.title = payload.title;
  if (payload.learning_competencies !== undefined) {
    updateBody.learning_competencies = payload.learning_competencies;
  }
  if (payload.status !== undefined) updateBody.status = payload.status;
  if (payload.attachments !== undefined) {
    updateBody.attachments = attachments;
    updateBody.file_url = payload.file_url ?? primary?.file_url ?? null;
    updateBody.file_name = payload.file_name ?? primary?.file_name ?? null;
    updateBody.file_size = payload.file_size ?? primary?.file_size ?? null;
    updateBody.mime_type = payload.mime_type ?? primary?.mime_type ?? null;
  }

  const { data, error } = await supabase
    .from("lesson_plans")
    .update(updateBody)
    .eq("id", planId)
    .select(`
      *,
      teacher:profiles!lesson_plans_teacher_id_fkey(id, full_name, email, department, avatar_url),
      reviewer:profiles!lesson_plans_reviewed_by_fkey(id, full_name, role)
    `)
    .single();

  if (error) {
    console.error("[LessonPlanService] Error updating lesson plan:", error);
    throw error;
  }

  return data as LessonPlan;
}

/**
 * Deletes a lesson plan record and cleans up any files uploaded to dll-uploads.
 */
export async function deleteLessonPlan(plan: LessonPlan): Promise<void> {
  const attachments = getLessonPlanAttachments(plan);
  const storagePaths: string[] = [];

  for (const att of attachments) {
    const marker = "/storage/v1/object/public/dll-uploads/";
    const idx = att.file_url.indexOf(marker);
    if (idx !== -1) {
      const relPath = decodeURIComponent(att.file_url.slice(idx + marker.length));
      if (relPath) storagePaths.push(relPath);
    }
  }

  if (storagePaths.length > 0) {
    try {
      await supabase.storage.from("dll-uploads").remove(storagePaths);
    } catch (err) {
      console.warn("[LessonPlanService] Non-fatal storage cleanup warning:", err);
    }
  }

  const { error } = await supabase.from("lesson_plans").delete().eq("id", plan.id);
  if (error) {
    console.error("[LessonPlanService] Error deleting lesson plan:", error);
    throw error;
  }
}

/**
 * Reviews and stamps a lesson plan (Approved / Needs Revision)
 */
export async function reviewLessonPlan(
  planId: string,
  reviewerId: string,
  status: LessonPlanStatus,
  feedback: string
): Promise<LessonPlan | null> {
  const { data, error } = await supabase
    .from("lesson_plans")
    .update({
      status,
      reviewed_by: reviewerId,
      reviewed_at: new Date().toISOString(),
      reviewer_feedback: feedback,
      updated_at: new Date().toISOString(),
    })
    .eq("id", planId)
    .select()
    .single();

  if (error) {
    console.error("[LessonPlanService] Error reviewing lesson plan:", error);
    throw error;
  }

  return data as LessonPlan;
}

/**
 * Uploads a DLL file (.pdf or .docx) to the Supabase storage bucket 'dll-uploads'
 */
export async function uploadLessonPlanFile(
  file: File,
  teacherId: string,
  weekNumber: number
): Promise<{ fileUrl: string; fileName: string; fileSize: number; mimeType: string }> {
  const fileExt = file.name.split(".").pop() || "pdf";
  const cleanFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
  const filePath = `${teacherId}/W${weekNumber}_${Date.now()}_${cleanFileName}`;

  try {
    const { error: uploadError } = await supabase.storage
      .from("dll-uploads")
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: true,
      });

    if (uploadError) {
      console.warn("[LessonPlanService] Storage upload fallback:", uploadError.message);
      // Fallback local mock URL if storage bucket is not exposed
      return {
        fileUrl: URL.createObjectURL(file),
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type || `application/${fileExt}`,
      };
    }

    const { data: publicUrlData } = supabase.storage
      .from("dll-uploads")
      .getPublicUrl(filePath);

    return {
      fileUrl: publicUrlData.publicUrl,
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type || `application/${fileExt}`,
    };
  } catch (err) {
    console.warn("[LessonPlanService] Storage upload error:", err);
    return {
      fileUrl: URL.createObjectURL(file),
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type || `application/${fileExt}`,
    };
  }
}

/**
 * Uploads multiple DLL files (.pdf or .docx) for a single weekly submission.
 */
export async function uploadLessonPlanFiles(
  files: File[],
  teacherId: string,
  weekNumber: number
): Promise<LessonPlanAttachment[]> {
  const results = await Promise.all(
    files.map((file) => uploadLessonPlanFile(file, teacherId, weekNumber))
  );
  return results.map((res) => ({
    file_url: res.fileUrl,
    file_name: res.fileName,
    file_size: res.fileSize,
    mime_type: res.mimeType,
  }));
}

/**
 * Computes live statistical metrics and Recharts dataset for the Modern Dashboard
 */
export function computeLessonPlanAnalytics(plans: LessonPlan[]): LessonPlanAnalyticsData {
  const total = plans.length;
  if (total === 0) {
    return {
      totalSubmissions: 0,
      onTimeRate: 100,
      pendingReviewCount: 0,
      approvedCount: 0,
      needsRevisionCount: 0,
      weeklyTrend: [],
      departmentCompliance: [],
      statusDistribution: [],
    };
  }

  const approved = plans.filter((p) => p.status === "Approved").length;
  const pending = plans.filter((p) => p.status === "Submitted" || p.status === "Under Review").length;
  const needsRevision = plans.filter((p) => p.status === "Needs Revision").length;
  const onTimeCount = plans.filter((p) => !p.is_late).length;
  const onTimeRate = Math.round((onTimeCount / total) * 100);

  // 1. Weekly Trend (Weeks 1 to 10)
  const weeklyTrend = Array.from({ length: 10 }, (_, i) => {
    const weekNum = i + 1;
    const weekPlans = plans.filter((p) => p.week_number === weekNum);
    return {
      week: `Week ${weekNum}`,
      submitted: weekPlans.length,
      approved: weekPlans.filter((p) => p.status === "Approved").length,
      late: weekPlans.filter((p) => p.is_late).length,
    };
  });

  // 2. Department Compliance Breakdown
  const deptMap = new Map<string, { submitted: number; approved: number }>();
  const DEPTS = [
    "Science & Technology",
    "Mathematics",
    "English",
    "Filipino",
    "TVL Track",
    "Araling Panlipunan",
    "MAPEH",
    "EsP",
  ];

  DEPTS.forEach((d) => deptMap.set(d, { submitted: 0, approved: 0 }));

  plans.forEach((p) => {
    const dept = p.department || "General Academics";
    const current = deptMap.get(dept) || { submitted: 0, approved: 0 };
    current.submitted += 1;
    if (p.status === "Approved") current.approved += 1;
    deptMap.set(dept, current);
  });

  const departmentCompliance = Array.from(deptMap.entries())
    .filter(([_, stats]) => stats.submitted > 0)
    .map(([dept, stats]) => {
      const expectedTarget = 4; // Expected 4 weekly DLLs up to current week
      const complianceRate = Math.min(100, Math.round((stats.submitted / expectedTarget) * 100));
      return {
        department: dept,
        submissionRate: complianceRate,
        submittedCount: stats.submitted,
        totalExpected: expectedTarget,
      };
    })
    .sort((a, b) => b.submissionRate - a.submissionRate);

  // 3. Status Distribution (Donut Chart) - Cyprus, Sand, Crimson aligned
  const statusDistribution = [
    { name: "Approved", value: approved, color: "#10b981" }, // Emerald 500 (Approval)
    { name: "Pending Review", value: pending, color: "#9c8973" }, // Sand 600 (30% Surface Neutral)
    { name: "Needs Revision", value: needsRevision, color: "#c41738" }, // Crimson 600 (10% Accent Alert)
  ].filter((item) => item.value > 0);

  return {
    totalSubmissions: total,
    onTimeRate,
    pendingReviewCount: pending,
    approvedCount: approved,
    needsRevisionCount: needsRevision,
    weeklyTrend,
    departmentCompliance,
    statusDistribution,
  };
}
