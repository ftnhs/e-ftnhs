import { supabase } from "../lib/supabase";
import { schoolReferenceService } from "./schoolReferenceService";
import {
  doTimeRangesOverlap,
  resolveTimeSlotForSection,
} from "./timetableService";
import type {
  LeaveApplication,
  LeaveType,
  DayOfWeek,
  AffectedScheduleSlot,
  Profile,
  TimeSlot,
  TimeSlotOverride,
  Subject,
  Section,
} from "../types";

const DAY_NAMES: DayOfWeek[] = [
  "Sunday" as DayOfWeek,
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday" as DayOfWeek,
];

function formatLocalDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

const LEAVE_APP_SELECT_QUERY = `
  *,
  teacher:profiles!leave_applications_teacher_id_fkey(*),
  school_head:profiles!leave_applications_school_head_id_fkey(*),
  reliefs:leave_class_reliefs(
    *,
    time_slot:time_slots(*),
    subject:subjects_catalog(*),
    section:sections(*),
    reliever:profiles!leave_class_reliefs_reliever_teacher_id_fkey(*)
  )
`;

/**
 * Fetch leave applications with full relational details
 */
export async function fetchLeaveApplications(
  _userId?: string,
  _userRole?: string
): Promise<LeaveApplication[]> {
  try {
    const { data, error } = await supabase
      .from("leave_applications")
      .select(LEAVE_APP_SELECT_QUERY)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return (data || []) as LeaveApplication[];
  } catch (err) {
    console.error("Error in fetchLeaveApplications:", err);
    return [];
  }
}

/**
 * Calculate dates and identify affected teaching periods from schedule_entries
 * with JHS/SHS/Section-resolved clock times.
 */
export async function computeAffectedScheduleSlots(
  teacherId: string,
  startDateStr: string,
  endDateStr: string,
  termId: string
): Promise<AffectedScheduleSlot[]> {
  try {
    const start = new Date(`${startDateStr.slice(0, 10)}T00:00:00`);
    const end = new Date(`${endDateStr.slice(0, 10)}T00:00:00`);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return [];
    const affectedSlots: AffectedScheduleSlot[] = [];

    const [{ data: scheduleEntries, error }, overrides] = await Promise.all([
      supabase
        .from("schedule_entries")
        .select(
          `
          id,
          term_id,
          teacher_id,
          day_of_week,
          time_slot_id,
          subject_id,
          section_id,
          time_slot:time_slots(*),
          subject:subjects_catalog(*),
          section:sections(*)
        `
        )
        .eq("term_id", termId)
        .eq("teacher_id", teacherId),
      schoolReferenceService.fetchTimeSlotOverrides(),
    ]);

    if (error) throw error;
    if (!scheduleEntries || scheduleEntries.length === 0) return [];

    // Iterate each calendar date between start and end (local date, no UTC shift)
    const current = new Date(start);
    while (current <= end) {
      const dayIndex = current.getDay();
      if (dayIndex >= 1 && dayIndex <= 5) {
        const dayOfWeek = DAY_NAMES[dayIndex] as DayOfWeek;
        const dateStr = formatLocalDate(current);

        const dayEntries = scheduleEntries.filter(
          (entry) => entry.day_of_week === dayOfWeek
        );

        for (const entry of dayEntries) {
          const rawTimeSlot = (Array.isArray(entry.time_slot) ? entry.time_slot[0] : entry.time_slot) as TimeSlot | undefined;
          const rawSubject = (Array.isArray(entry.subject) ? entry.subject[0] : entry.subject) as Subject | undefined;
          const rawSection = (Array.isArray(entry.section) ? entry.section[0] : entry.section) as Section | undefined;

          if (rawTimeSlot && rawSubject && rawSection) {
            const resolvedSlot = resolveTimeSlotForSection(rawTimeSlot, overrides, rawSection);
            if (resolvedSlot.slot_type !== "Academic") {
              continue;
            }
            affectedSlots.push({
              date: dateStr,
              dayOfWeek,
              timeSlot: resolvedSlot,
              subject: rawSubject,
              section: rawSection,
              scheduleEntryId: entry.id,
            });
          }
        }
      }
      current.setDate(current.getDate() + 1);
    }

    affectedSlots.sort((a, b) => {
      const dateDiff = a.date.localeCompare(b.date);
      if (dateDiff !== 0) return dateDiff;
      return a.timeSlot.sort_order - b.timeSlot.sort_order;
    });

    return affectedSlots;
  } catch (err) {
    console.error("Error computing affected schedule slots:", err);
    return [];
  }
}

interface TermScheduleSlotRow {
  teacher_id: string;
  day_of_week: DayOfWeek;
  time_slot_id: string;
  time_slot: TimeSlot | TimeSlot[] | null;
  section: Section | Section[] | null;
}

interface ActiveReliefRow {
  reliever_teacher_id: string;
  relief_date: string;
  time_slot_id: string;
  time_slot: TimeSlot | TimeSlot[] | null;
  section: Section | Section[] | null;
}

function isTeacherVacantForWindow(
  teacherId: string,
  dayOfWeek: DayOfWeek,
  reliefDate: string,
  targetSlotId: string,
  targetStart: string,
  targetEnd: string,
  termEntries: TermScheduleSlotRow[],
  activeReliefs: ActiveReliefRow[],
  overrides: TimeSlotOverride[]
): boolean {
  for (const entry of termEntries) {
    if (entry.teacher_id !== teacherId || entry.day_of_week !== dayOfWeek) continue;
    if (entry.time_slot_id === targetSlotId) return false;

    const rawSlot = Array.isArray(entry.time_slot) ? entry.time_slot[0] : entry.time_slot;
    const rawSec = Array.isArray(entry.section) ? entry.section[0] : entry.section;
    if (!rawSlot) continue;

    const resolved = resolveTimeSlotForSection(rawSlot, overrides, rawSec || null);
    if (doTimeRangesOverlap(targetStart, targetEnd, resolved.start_time, resolved.end_time)) {
      return false;
    }
  }

  for (const relief of activeReliefs) {
    if (relief.reliever_teacher_id !== teacherId || relief.relief_date !== reliefDate) continue;
    if (relief.time_slot_id === targetSlotId) return false;

    const rawSlot = Array.isArray(relief.time_slot) ? relief.time_slot[0] : relief.time_slot;
    const rawSec = Array.isArray(relief.section) ? relief.section[0] : relief.section;
    if (!rawSlot) continue;

    const resolved = resolveTimeSlotForSection(rawSlot, overrides, rawSec || null);
    if (doTimeRangesOverlap(targetStart, targetEnd, resolved.start_time, resolved.end_time)) {
      return false;
    }
  }

  return true;
}

/**
 * Returns strictly vacant (free) teachers per affected slot key (`date_slotId`),
 * evaluating JHS/SHS/Section-resolved clock overlaps and existing active reliefs.
 */
export async function computeVacantRelieversBySlot(
  termId: string,
  affectedSlots: Array<{
    date: string;
    dayOfWeek: DayOfWeek;
    timeSlot: TimeSlot;
    section?: Pick<Section, "id" | "grade_level"> | null;
  }>,
  requestingTeacherId: string,
  allTeachers: Profile[]
): Promise<Record<string, Profile[]>> {
  const result: Record<string, Profile[]> = {};
  if (affectedSlots.length === 0) return result;

  try {
    const uniqueDates = Array.from(new Set(affectedSlots.map((s) => s.date)));

    const [entriesRes, overrides, reliefsRes] = await Promise.all([
      supabase
        .from("schedule_entries")
        .select("teacher_id, day_of_week, time_slot_id, time_slot:time_slots(*), section:sections(id, grade_level)")
        .eq("term_id", termId),
      schoolReferenceService.fetchTimeSlotOverrides(),
      supabase
        .from("leave_class_reliefs")
        .select("reliever_teacher_id, relief_date, time_slot_id, time_slot:time_slots(*), section:sections(id, grade_level)")
        .in("relief_date", uniqueDates)
        .in("conforme_status", ["Pending", "Accepted"]),
    ]);

    if (entriesRes.error) throw entriesRes.error;
    const termEntries = (entriesRes.data || []) as unknown as TermScheduleSlotRow[];
    const activeReliefs = (reliefsRes.data || []) as unknown as ActiveReliefRow[];

    const candidateTeachers = allTeachers
      .filter(
        (t) =>
          t.id !== requestingTeacherId &&
          t.status === "Approved" &&
          (t.is_teaching ?? (t.role === "Teacher" || t.role === "Super Admin"))
      )
      .sort((a, b) => a.full_name.localeCompare(b.full_name));

    for (const slot of affectedSlots) {
      const key = `${slot.date}_${slot.timeSlot.id}`;
      const resolvedTarget = resolveTimeSlotForSection(
        slot.timeSlot,
        overrides,
        slot.section || null
      );

      result[key] = candidateTeachers.filter((teacher) =>
        isTeacherVacantForWindow(
          teacher.id,
          slot.dayOfWeek,
          slot.date,
          slot.timeSlot.id,
          resolvedTarget.start_time,
          resolvedTarget.end_time,
          termEntries,
          activeReliefs,
          overrides
        )
      );
    }

    return result;
  } catch (err) {
    console.error("Error computing vacant relievers:", err);
    return result;
  }
}

/**
 * Identify available (vacant) teachers for a specific time slot and day
 */
export async function getAvailableRelievers(
  termId: string,
  dayOfWeek: DayOfWeek,
  timeSlotId: string,
  requestingTeacherId: string,
  allTeachers: Profile[]
): Promise<{ teacher: Profile; isFree: boolean; conflictReason?: string }[]> {
  try {
    // 1. Fetch all teachers teaching at this specific slot
    const { data: busyEntries, error } = await supabase
      .from("schedule_entries")
      .select("teacher_id, subject:subjects_catalog(subject_name), section:sections(section_name)")
      .eq("term_id", termId)
      .eq("day_of_week", dayOfWeek)
      .eq("time_slot_id", timeSlotId);

    if (error) throw error;

    const busyTeacherMap = new Map<string, string>();
    if (busyEntries) {
      for (const entry of busyEntries as unknown as Array<{
        teacher_id: string;
        subject: { subject_name: string } | null;
        section: { section_name: string } | null;
      }>) {
        const subName = entry.subject?.subject_name || "Class";
        const secName = entry.section?.section_name || "Section";
        busyTeacherMap.set(entry.teacher_id, `Teaching ${subName} (${secName})`);
      }
    }

    return allTeachers
      .filter((t) => t.id !== requestingTeacherId && t.status === "Approved")
      .map((teacher) => {
        const busyDetails = busyTeacherMap.get(teacher.id);
        return {
          teacher,
          isFree: !busyDetails,
          conflictReason: busyDetails,
        };
      })
      .sort((a, b) => {
        if (a.isFree && !b.isFree) return -1;
        if (!a.isFree && b.isFree) return 1;
        return a.teacher.full_name.localeCompare(b.teacher.full_name);
      });
  } catch (err) {
    console.error("Error finding available relievers:", err);
    return [];
  }
}

/**
 * Create a new leave application with assigned class reliefs
 */
export async function createLeaveApplication(payload: {
  teacherId: string;
  termId: string;
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  totalDays: number;
  reason: string;
  reliefAssignments: Array<{
    scheduleEntryId: string;
    reliefDate: string;
    dayOfWeek: DayOfWeek;
    timeSlotId: string;
    subjectId: string;
    sectionId: string;
    relieverTeacherId: string;
  }>;
}): Promise<LeaveApplication | null> {
  try {
    // 1. Insert Leave Application
    const { data: leaveApp, error: appError } = await supabase
      .from("leave_applications")
      .insert({
        teacher_id: payload.teacherId,
        term_id: payload.termId,
        leave_type: payload.leaveType,
        start_date: payload.startDate,
        end_date: payload.endDate,
        total_days: payload.totalDays,
        reason: payload.reason,
        status: payload.reliefAssignments.length === 0 ? "Pending_Approval" : "Pending_Relief",
      })
      .select()
      .single();

    if (appError) throw appError;

    // 2. Insert assigned class reliefs
    if (payload.reliefAssignments.length > 0) {
      const reliefRows = payload.reliefAssignments.map((ra) => ({
        leave_application_id: leaveApp.id,
        schedule_entry_id: ra.scheduleEntryId,
        relief_date: ra.reliefDate,
        day_of_week: ra.dayOfWeek,
        time_slot_id: ra.timeSlotId,
        subject_id: ra.subjectId,
        section_id: ra.sectionId,
        reliever_teacher_id: ra.relieverTeacherId,
        conforme_status: "Pending",
      }));

      const { error: reliefError } = await supabase
        .from("leave_class_reliefs")
        .insert(reliefRows);

      if (reliefError) throw reliefError;
    }

    // 3. Return the full populated record for automatic letter generation
    const { data: fullApp, error: fetchCreatedErr } = await supabase
      .from("leave_applications")
      .select(LEAVE_APP_SELECT_QUERY)
      .eq("id", leaveApp.id)
      .single();

    if (fetchCreatedErr || !fullApp) {
      return leaveApp as LeaveApplication;
    }
    return fullApp as LeaveApplication;
  } catch (err) {
    console.error("Error in createLeaveApplication:", err);
    throw err;
  }
}

/**
 * Reliever confirms or declines class coverage
 */
export async function updateReliefConforme(
  reliefId: string,
  leaveAppId: string,
  status: "Accepted" | "Declined",
  remarks?: string
): Promise<boolean> {
  try {
    // 1. Update the relief row
    const { error } = await supabase
      .from("leave_class_reliefs")
      .update({
        conforme_status: status,
        conforme_acted_at: new Date().toISOString(),
        reliever_remarks: remarks || null,
      })
      .eq("id", reliefId);

    if (error) throw error;

    // 2. Check if all reliefs for this application are now Accepted
    const { data: allReliefs, error: fetchError } = await supabase
      .from("leave_class_reliefs")
      .select("conforme_status")
      .eq("leave_application_id", leaveAppId);

    if (!fetchError && allReliefs && allReliefs.length > 0) {
      const allAccepted = allReliefs.every(
        (r) => r.conforme_status === "Accepted"
      );

      if (allAccepted) {
        // Automatically route to School Head approval queue
        await supabase
          .from("leave_applications")
          .update({
            status: "Pending_Approval",
            updated_at: new Date().toISOString(),
          })
          .eq("id", leaveAppId);
      } else {
        // If any declined, remain in Pending_Relief
        const anyDeclined = allReliefs.some((r) => r.conforme_status === "Declined");
        if (anyDeclined) {
          await supabase
            .from("leave_applications")
            .update({
              status: "Pending_Relief",
              updated_at: new Date().toISOString(),
            })
            .eq("id", leaveAppId);
        }
      }
    }

    return true;
  } catch (err) {
    console.error("Error updating relief conforme:", err);
    return false;
  }
}

/**
 * Reassign an alternative reliever if original reliever declined
 */
export async function reassignReliever(
  reliefId: string,
  newRelieverTeacherId: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("leave_class_reliefs")
      .update({
        reliever_teacher_id: newRelieverTeacherId,
        conforme_status: "Pending",
        conforme_acted_at: null,
        reliever_remarks: null,
      })
      .eq("id", reliefId);

    if (error) throw error;
    return true;
  } catch (err) {
    console.error("Error reassigning reliever:", err);
    return false;
  }
}

/**
 * School Head / Principal action (Approve or Disapprove)
 */
export async function reviewLeaveApplication(
  applicationId: string,
  action: "Approved" | "Disapproved",
  schoolHeadId: string,
  remarks?: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("leave_applications")
      .update({
        status: action,
        school_head_id: schoolHeadId,
        school_head_action_at: new Date().toISOString(),
        school_head_remarks: remarks || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", applicationId);

    if (error) throw error;
    return true;
  } catch (err) {
    console.error("Error in reviewLeaveApplication:", err);
    return false;
  }
}

/**
 * Requesting teacher cancels a pending leave application
 */
export async function cancelLeaveApplication(applicationId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("leave_applications")
      .update({
        status: "Cancelled",
        updated_at: new Date().toISOString(),
      })
      .eq("id", applicationId);

    if (error) throw error;
    return true;
  } catch (err) {
    console.error("Error cancelling leave application:", err);
    return false;
  }
}
