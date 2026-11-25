import { supabase } from "../lib/supabase";
import { schoolReferenceService } from "./schoolReferenceService";
import type {
  AcademicTerm,
  Subject,
  Room,
  Section,
  TimeSlot,
  TimeSlotOverride,
  ResolvedTimeSlot,
  TeacherSubjectLoad,
  ScheduleEntry,
  ScheduleConflict,
  TeacherLoadingSummary,
  DayOfWeek,
  Profile,
  SchoolSettings,
} from "../types";

export interface TimetableDataState {
  activeTerm: AcademicTerm | null;
  schoolSettings: SchoolSettings | null;
  subjects: Subject[];
  rooms: Room[];
  sections: Section[];
  timeSlots: TimeSlot[];
  timeSlotOverrides: TimeSlotOverride[];
  loads: TeacherSubjectLoad[];
  scheduleEntries: ScheduleEntry[];
  teachers: Profile[];
}

function timeStringToMinutes(timeStr?: string | null): number {
  if (!timeStr) return 0;
  const parts = timeStr.split(":").map(Number);
  const hours = parts[0] ?? 0;
  const mins = parts[1] ?? 0;
  return hours * 60 + mins;
}

export function doTimeRangesOverlap(
  startA: string,
  endA: string,
  startB: string,
  endB: string
): boolean {
  const sA = timeStringToMinutes(startA);
  const eA = timeStringToMinutes(endA);
  const sB = timeStringToMinutes(startB);
  const eB = timeStringToMinutes(endB);
  return sA < eB && sB < eA;
}

export function resolveTimeSlotForSection(
  slot: TimeSlot,
  overrides: TimeSlotOverride[],
  section?: Pick<Section, "id" | "grade_level"> | null
): ResolvedTimeSlot {
  if (section) {
    const sectionOverride = overrides.find(
      (ov) =>
        ov.time_slot_id === slot.id &&
        ov.scope_type === "SECTION" &&
        ov.section_id === section.id
    );
    if (sectionOverride) {
      return {
        ...slot,
        start_time: sectionOverride.start_time,
        end_time: sectionOverride.end_time,
        duration_minutes: sectionOverride.duration_minutes,
        slot_label: sectionOverride.slot_label || slot.slot_label,
        slot_type: sectionOverride.slot_type || slot.slot_type,
        override_scope: "SECTION",
        override_id: sectionOverride.id,
        is_overridden: true,
      };
    }

    const levelScope = section.grade_level >= 11 ? "SHS" : "JHS";
    const levelOverride = overrides.find(
      (ov) =>
        ov.time_slot_id === slot.id &&
        ov.scope_type === levelScope &&
        !ov.section_id
    );
    if (levelOverride) {
      return {
        ...slot,
        start_time: levelOverride.start_time,
        end_time: levelOverride.end_time,
        duration_minutes: levelOverride.duration_minutes,
        slot_label: levelOverride.slot_label || slot.slot_label,
        slot_type: levelOverride.slot_type || slot.slot_type,
        override_scope: levelScope,
        override_id: levelOverride.id,
        is_overridden: true,
      };
    }
  }

  return {
    ...slot,
    override_scope: null,
    override_id: null,
    is_overridden: false,
  };
}

export function resolveTimeSlotsForSection(
  timeSlots: TimeSlot[],
  overrides: TimeSlotOverride[],
  section?: Pick<Section, "id" | "grade_level"> | null
): ResolvedTimeSlot[] {
  return [...timeSlots]
    .map((slot) => resolveTimeSlotForSection(slot, overrides, section))
    .sort((a, b) => a.sort_order - b.sort_order || a.start_time.localeCompare(b.start_time));
}

/**
 * Resolves and filters time slots relevant to a section (or teacher view):
 * - Slot 9 (3:10-4:00 JHS) is hidden for SHS unless overridden or populated.
 * - Slot 11 (12:30-1:00 Midday / HOPE 3) is hidden unless overridden (e.g. 12-HUMSS) or populated.
 */
export function getVisibleSlotsForSection(
  timeSlots: TimeSlot[],
  overrides: TimeSlotOverride[],
  section?: Pick<Section, "id" | "grade_level"> | null,
  entries: ScheduleEntry[] = []
): ResolvedTimeSlot[] {
  const resolved = resolveTimeSlotsForSection(timeSlots, overrides, section);
  const isSHS = Boolean(section?.grade_level && section.grade_level >= 11);

  return resolved.filter((slot) => {
    const hasEntry = entries.some((e) => e.time_slot_id === slot.id);
    if (slot.slot_number === 11 && !slot.is_overridden && !hasEntry) {
      return false;
    }
    if (isSHS && slot.slot_number === 9 && !slot.is_overridden && !hasEntry) {
      return false;
    }
    return true;
  });
}

/**
 * Computes the resolved duration in minutes of a single plotted schedule entry.
 */
export function computeScheduleEntryDuration(
  entry: Pick<ScheduleEntry, "time_slot_id" | "section_id" | "time_slot" | "section">,
  timeSlots: TimeSlot[],
  overrides: TimeSlotOverride[],
  sections: Section[] = []
): number {
  const baseSlot =
    entry.time_slot || timeSlots.find((s) => s.id === entry.time_slot_id);
  if (!baseSlot) return 0;
  const sec =
    entry.section || sections.find((s) => s.id === entry.section_id) || null;
  return resolveTimeSlotForSection(baseSlot, overrides, sec).duration_minutes;
}

/**
 * Computes total plotted weekly minutes and slot count for a specific teacher subject load.
 */
export function computeLoadPlottedStats(
  loadId: string,
  scheduleEntries: ScheduleEntry[],
  timeSlots: TimeSlot[],
  overrides: TimeSlotOverride[],
  sections: Section[] = []
): { plottedMinutes: number; slotCount: number } {
  let plottedMinutes = 0;
  let slotCount = 0;
  for (const entry of scheduleEntries) {
    if (entry.load_id !== loadId) continue;
    slotCount += 1;
    plottedMinutes += computeScheduleEntryDuration(
      entry,
      timeSlots,
      overrides,
      sections
    );
  }
  return { plottedMinutes, slotCount };
}

/**
 * Fetches all timetable metadata and entries for the active term
 */
export async function fetchTimetableData(termId?: string): Promise<TimetableDataState> {
  try {
    // 1. Fetch active term if not passed
    let currentTerm: AcademicTerm | null = null;
    if (termId) {
      const { data } = await supabase
        .from("academic_terms")
        .select("*")
        .eq("id", termId)
        .single();
      currentTerm = data;
    } else {
      const { data } = await supabase
        .from("academic_terms")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();
      currentTerm = data;
    }

    const effectiveTermId = currentTerm?.id || "f9e12395-85fc-4958-8829-5d5c991d4c3d";

    // 2. Query catalogs in parallel
    const [
      schoolSettings,
      subjectsRes,
      roomsRes,
      sectionsRes,
      timeSlotsRes,
      timeSlotOverrides,
      loadsRes,
      entriesRes,
      teachersRes,
    ] = await Promise.all([
      schoolReferenceService.fetchSchoolSettings(),
      supabase.from("subjects_catalog").select("*").order("grade_level, subject_code"),
      supabase.from("rooms_catalog").select("*").order("room_number"),
      supabase.from("sections").select("*, adviser:profiles(id, full_name, email), room:rooms_catalog(*)").eq("term_id", effectiveTermId).order("grade_level, section_name"),
      supabase.from("time_slots").select("*").order("sort_order"),
      schoolReferenceService.fetchTimeSlotOverrides(),
      supabase
        .from("teacher_subject_loads")
        .select("*, teacher:profiles(id, full_name, email, department, designation), subject:subjects_catalog(*), section:sections(*)")
        .eq("term_id", effectiveTermId),
      supabase
        .from("schedule_entries")
        .select("*, teacher:profiles(id, full_name, email), subject:subjects_catalog(*), section:sections(*), time_slot:time_slots(*), room:rooms_catalog(*)")
        .eq("term_id", effectiveTermId),
      supabase
        .from("profiles")
        .select("*")
        .eq("status", "Approved")
        .order("full_name"),
    ]);

    // Only include profiles explicitly marked as teaching (is_teaching = true).
    // School Heads with is_teaching = false are excluded from the teaching roster.
    // Super Admins and Teachers default to true only if is_teaching is null/undefined.
    const teachingFaculty = ((teachersRes.data as Profile[]) || []).filter((p) => {
      if (p.is_teaching === true) return true;
      if (p.is_teaching === false) return false;
      // is_teaching is null/undefined — fall back by role (exclude School Head)
      return p.role === "Teacher" || p.role === "Super Admin";
    });

    return {
      activeTerm: currentTerm,
      schoolSettings,
      subjects: (subjectsRes.data as Subject[]) || [],
      rooms: (roomsRes.data as Room[]) || [],
      sections: (sectionsRes.data as Section[]) || [],
      timeSlots: (timeSlotsRes.data as TimeSlot[]) || [],
      timeSlotOverrides,
      loads: (loadsRes.data as TeacherSubjectLoad[]) || [],
      scheduleEntries: (entriesRes.data as ScheduleEntry[]) || [],
      teachers: teachingFaculty,
    };
  } catch (err) {
    console.error("[timetableService] Error loading timetable data:", err);
    return {
      activeTerm: null,
      schoolSettings: null,
      subjects: [],
      rooms: [],
      sections: [],
      timeSlots: [],
      timeSlotOverrides: [],
      loads: [],
      scheduleEntries: [],
      teachers: [],
    };
  }
}

/**
 * Hard-Constraint Conflict Detection Engine:
 * 1. Teacher Collision Guard: a teacher cannot teach two sections at the same day & time slot.
 * 2. Section Collision Guard: a section cannot have two subjects at the same day & time slot.
 * 3. Room Collision Guard: a room cannot be occupied by two classes simultaneously.
 */
export function detectScheduleConflicts(
  candidate: {
    id?: string;
    term_id: string;
    day_of_week: DayOfWeek;
    time_slot_id: string;
    teacher_id?: string | null;
    guest_instructor_name?: string | null;
    section_id: string;
    room_id?: string | null;
  },
  existingEntries: ScheduleEntry[],
  options?: {
    timeSlots?: TimeSlot[];
    timeSlotOverrides?: TimeSlotOverride[];
    sections?: Section[];
  }
): ScheduleConflict[] {
  const conflicts: ScheduleConflict[] = [];
  const overrides = options?.timeSlotOverrides || [];
  const candidateBaseSlot = options?.timeSlots?.find((s) => s.id === candidate.time_slot_id);
  const candidateSection = options?.sections?.find((s) => s.id === candidate.section_id);
  const candidateResolved = candidateBaseSlot
    ? resolveTimeSlotForSection(candidateBaseSlot, overrides, candidateSection)
    : null;
  const candidateGuest = candidate.guest_instructor_name?.trim().toLowerCase() || "";

  for (const entry of existingEntries) {
    // Skip comparing against self when updating
    if (candidate.id && entry.id === candidate.id) {
      continue;
    }

    if (entry.term_id !== candidate.term_id || entry.day_of_week !== candidate.day_of_week) {
      continue;
    }

    const sameSlotId = entry.time_slot_id === candidate.time_slot_id;
    let timesOverlap = false;

    const entryBaseSlot =
      entry.time_slot || options?.timeSlots?.find((s) => s.id === entry.time_slot_id);
    const entrySection =
      entry.section || options?.sections?.find((s) => s.id === entry.section_id);

    if (candidateResolved && entryBaseSlot) {
      const entryResolved = resolveTimeSlotForSection(entryBaseSlot, overrides, entrySection);
      timesOverlap = doTimeRangesOverlap(
        candidateResolved.start_time,
        candidateResolved.end_time,
        entryResolved.start_time,
        entryResolved.end_time
      );
    }

    // Compare within the same term & day when sharing a slot ID or overlapping in clock time
    if (sameSlotId || timesOverlap) {
      const periodDetails = entryBaseSlot
        ? `Period: ${resolveTimeSlotForSection(entryBaseSlot, overrides, entrySection).slot_label}`
        : `Period: ${entry.time_slot_id}`;

      // 1. Teacher Collision (Faculty account or Guest instructor)
      if (candidate.teacher_id && entry.teacher_id === candidate.teacher_id) {
        conflicts.push({
          type: "TEACHER_COLLISION",
          message: `Teacher Collision: Teacher is already teaching ${entry.subject?.subject_name || "another class"} for ${entry.section?.section_name || "another section"} on ${entry.day_of_week}.`,
          details: periodDetails,
          conflictingEntry: entry,
        });
      } else if (
        candidateGuest &&
        (entry.guest_instructor_name?.trim().toLowerCase() || "") === candidateGuest
      ) {
        conflicts.push({
          type: "TEACHER_COLLISION",
          message: `Instructor Collision: ${entry.guest_instructor_name} is already teaching ${entry.subject?.subject_name || "another class"} for ${entry.section?.section_name || "another section"} on ${entry.day_of_week}.`,
          details: periodDetails,
          conflictingEntry: entry,
        });
      }

      // 2. Section Collision
      if (entry.section_id === candidate.section_id) {
        conflicts.push({
          type: "SECTION_COLLISION",
          message: `Section Collision: Section ${entry.section?.section_name || "this section"} already has ${entry.subject?.subject_name || "a subject"} scheduled on ${entry.day_of_week}.`,
          details: periodDetails,
          conflictingEntry: entry,
        });
      }

      // 3. Room Collision (only if room is specified)
      if (
        candidate.room_id &&
        entry.room_id &&
        entry.room_id === candidate.room_id
      ) {
        conflicts.push({
          type: "ROOM_COLLISION",
          message: `Room Collision: ${entry.room?.room_name || "Room"} is already occupied by ${entry.section?.section_name || "another class"} for ${entry.subject?.subject_name || "a subject"}.`,
          details: periodDetails,
          conflictingEntry: entry,
        });
      }
    }
  }

  return conflicts;
}

/**
 * Computes Teacher Loading Summaries & Magna Carta Compliance:
 * When plotted schedule entries and time slots are supplied, weekly minutes are dynamically
 * connected to the exact resolved durations of plotted slots (keeping Faculty Loading,
 * Class Program, and DepEd SF7 unified).
 * Mandated limit: Maximum 6 hours (360 minutes) daily direct teaching load = 1,800 minutes/week.
 */
export function computeTeacherLoadingSummaries(
  teachers: Profile[],
  loads: TeacherSubjectLoad[],
  scheduleEntries?: ScheduleEntry[],
  timeSlots?: TimeSlot[],
  timeSlotOverrides?: TimeSlotOverride[],
  sections?: Section[]
): TeacherLoadingSummary[] {
  const hasScheduleContext = Boolean(scheduleEntries && timeSlots && timeSlots.length > 0);

  return teachers.map((teacher) => {
    const rawLoads = loads.filter((l) => l.teacher_id === teacher.id);
    const enrichedLoads = rawLoads.map((load) => {
      if (!hasScheduleContext || !scheduleEntries || !timeSlots) {
        return load;
      }
      const stats = computeLoadPlottedStats(
        load.id,
        scheduleEntries,
        timeSlots,
        timeSlotOverrides || [],
        sections || []
      );
      return {
        ...load,
        plotted_minutes_weekly: stats.plottedMinutes,
        plotted_slot_count: stats.slotCount,
        teaching_minutes_weekly:
          stats.slotCount > 0 ? stats.plottedMinutes : load.teaching_minutes_weekly || 0,
      };
    });

    const totalTeaching = enrichedLoads.reduce(
      (sum, l) => sum + (l.teaching_minutes_weekly || 0),
      0
    );
    const totalAncillary = enrichedLoads.reduce(
      (sum, l) => sum + (l.ancillary_minutes_weekly || 0),
      0
    );
    const totalCombined = totalTeaching + totalAncillary;

    // Magna Carta DepEd policy: Direct teaching load should not exceed 1,800 minutes/week (360 mins/day)
    const isCompliant = totalTeaching <= 1800;

    return {
      teacher_id: teacher.id,
      full_name: teacher.full_name,
      email: teacher.email,
      department: teacher.department || "General Faculty",
      designation: teacher.designation || "Teacher",
      total_teaching_minutes: totalTeaching,
      total_ancillary_minutes: totalAncillary,
      total_combined_minutes: totalCombined,
      is_magna_carta_compliant: isCompliant,
      loads: enrichedLoads,
    };
  });
}

/**
 * Inserts a new schedule slot entry after executing constraint verification
 */
export async function createScheduleEntry(
  entryData: {
    term_id: string;
    load_id?: string | null;
    teacher_id?: string | null;
    guest_instructor_name?: string | null;
    section_id: string;
    subject_id: string;
    time_slot_id: string;
    room_id?: string | null;
    day_of_week: DayOfWeek;
  },
  existingEntries: ScheduleEntry[],
  conflictOptions?: {
    timeSlots?: TimeSlot[];
    timeSlotOverrides?: TimeSlotOverride[];
    sections?: Section[];
  }
): Promise<{ success: boolean; data?: ScheduleEntry; error?: string }> {
  // 1. Run hard-constraint solver
  const conflicts = detectScheduleConflicts(entryData, existingEntries, conflictOptions);
  if (conflicts.length > 0) {
    return {
      success: false,
      error: conflicts.map((c) => c.message).join("\n"),
    };
  }

  // 2. Persist to Supabase (DB trigger automatically recalculates teacher_subject_loads.teaching_minutes_weekly)
  try {
    const cleanGuest = entryData.guest_instructor_name?.trim() || null;
    const { data, error } = await supabase
      .from("schedule_entries")
      .insert({
        term_id: entryData.term_id,
        load_id: cleanGuest ? null : entryData.load_id || null,
        teacher_id: cleanGuest ? null : entryData.teacher_id || null,
        guest_instructor_name: cleanGuest,
        section_id: entryData.section_id,
        subject_id: entryData.subject_id,
        time_slot_id: entryData.time_slot_id,
        room_id: entryData.room_id || null,
        day_of_week: entryData.day_of_week,
      })
      .select("*, teacher:profiles(id, full_name, email), subject:subjects_catalog(*), section:sections(*), time_slot:time_slots(*), room:rooms_catalog(*)")
      .single();

    if (error) throw error;
    return { success: true, data: data as ScheduleEntry };
  } catch (err: unknown) {
    console.error("[timetableService] DB Insert Error:", err);
    const msg = err instanceof Error ? err.message : "Failed to create schedule entry.";
    return { success: false, error: msg };
  }
}

/**
 * Deletes a schedule slot entry
 */
export async function deleteScheduleEntry(entryId: string): Promise<boolean> {
  try {
    const { error } = await supabase.from("schedule_entries").delete().eq("id", entryId);
    if (error) throw error;
    return true;
  } catch (err) {
    console.error("[timetableService] DB Delete Error:", err);
    return false;
  }
}

/**
 * Creates or assigns a new teacher subject load
 */
export async function createTeacherLoad(loadData: {
  term_id: string;
  teacher_id: string;
  subject_id: string;
  section_id: string;
  teaching_minutes_weekly: number;
  ancillary_minutes_weekly?: number;
  ancillary_description?: string;
}): Promise<TeacherSubjectLoad | null> {
  try {
    const { data, error } = await supabase
      .from("teacher_subject_loads")
      .insert({
        term_id: loadData.term_id,
        teacher_id: loadData.teacher_id,
        subject_id: loadData.subject_id,
        section_id: loadData.section_id,
        teaching_minutes_weekly: loadData.teaching_minutes_weekly,
        ancillary_minutes_weekly: loadData.ancillary_minutes_weekly || 0,
        ancillary_description: loadData.ancillary_description || null,
      })
      .select("*, teacher:profiles(id, full_name, email, department, designation), subject:subjects_catalog(*), section:sections(*)")
      .single();

    if (error) throw error;
    return data as TeacherSubjectLoad;
  } catch (err) {
    console.error("[timetableService] createTeacherLoad Error:", err);
    return null;
  }
}

/**
 * Updates an existing teacher subject load (e.g. per-term weekly minutes or ancillary duties)
 */
export async function updateTeacherLoad(
  loadId: string,
  updates: {
    teaching_minutes_weekly: number;
    ancillary_minutes_weekly?: number;
    ancillary_description?: string | null;
  }
): Promise<TeacherSubjectLoad | null> {
  try {
    const { data, error } = await supabase
      .from("teacher_subject_loads")
      .update({
        teaching_minutes_weekly: updates.teaching_minutes_weekly,
        ancillary_minutes_weekly: updates.ancillary_minutes_weekly ?? 0,
        ancillary_description: updates.ancillary_description || null,
      })
      .eq("id", loadId)
      .select("*, teacher:profiles(id, full_name, email, department, designation), subject:subjects_catalog(*), section:sections(*)")
      .single();

    if (error) throw error;
    return data as TeacherSubjectLoad;
  } catch (err) {
    console.error("[timetableService] updateTeacherLoad Error:", err);
    return null;
  }
}

/**
 * Copies all faculty subject loads (with per-term section ID mapping) from a source term
 * into a target term without overwriting existing loads in the target term.
 */
export async function copyTeacherLoadsFromTerm(
  sourceTermId: string,
  targetTermId: string
): Promise<{
  success: boolean;
  insertedCount: number;
  skippedCount: number;
  error?: string;
}> {
  if (!sourceTermId || !targetTermId) {
    return {
      success: false,
      insertedCount: 0,
      skippedCount: 0,
      error: "Both source and target academic terms are required.",
    };
  }
  if (sourceTermId === targetTermId) {
    return {
      success: false,
      insertedCount: 0,
      skippedCount: 0,
      error: "Source term and target term must be different.",
    };
  }

  try {
    const [sourceLoadsRes, targetSectionsRes, existingTargetLoadsRes] = await Promise.all([
      supabase
        .from("teacher_subject_loads")
        .select(
          "teacher_id, subject_id, section_id, teaching_minutes_weekly, ancillary_minutes_weekly, ancillary_description, section:sections(id, grade_level, section_name, adviser_id, room_id)"
        )
        .eq("term_id", sourceTermId),
      supabase
        .from("sections")
        .select("id, grade_level, section_name")
        .eq("term_id", targetTermId),
      supabase
        .from("teacher_subject_loads")
        .select("teacher_id, subject_id, section_id")
        .eq("term_id", targetTermId),
    ]);

    if (sourceLoadsRes.error) throw sourceLoadsRes.error;
    if (targetSectionsRes.error) throw targetSectionsRes.error;
    if (existingTargetLoadsRes.error) throw existingTargetLoadsRes.error;

    const sourceLoads = (sourceLoadsRes.data || []) as Array<{
      teacher_id: string;
      subject_id: string;
      section_id: string;
      teaching_minutes_weekly: number;
      ancillary_minutes_weekly: number;
      ancillary_description: string | null;
      section:
        | {
            id: string;
            grade_level: number;
            section_name: string;
            adviser_id: string | null;
            room_id: string | null;
          }
        | Array<{
            id: string;
            grade_level: number;
            section_name: string;
            adviser_id: string | null;
            room_id: string | null;
          }>
        | null;
    }>;

    if (sourceLoads.length === 0) {
      return {
        success: false,
        insertedCount: 0,
        skippedCount: 0,
        error: "The selected source term has no subject loads to copy.",
      };
    }

    const sectionKey = (grade: number, name: string) =>
      `${grade}__${name.trim().toLowerCase()}`;

    const targetSectionMap = new Map<string, string>();
    for (const sec of targetSectionsRes.data || []) {
      targetSectionMap.set(sectionKey(sec.grade_level, sec.section_name), sec.id);
    }

    const existingLoadKeys = new Set<string>();
    for (const ex of existingTargetLoadsRes.data || []) {
      existingLoadKeys.add(`${ex.teacher_id}__${ex.subject_id}__${ex.section_id}`);
    }

    const rowsToInsert: Array<{
      term_id: string;
      teacher_id: string;
      subject_id: string;
      section_id: string;
      teaching_minutes_weekly: number;
      ancillary_minutes_weekly: number;
      ancillary_description: string | null;
      status: "Assigned";
    }> = [];

    let skippedCount = 0;

    for (const load of sourceLoads) {
      const srcSection = Array.isArray(load.section) ? load.section[0] : load.section;
      if (!srcSection) {
        skippedCount += 1;
        continue;
      }

      const key = sectionKey(srcSection.grade_level, srcSection.section_name);
      let resolvedSectionId: string | undefined = targetSectionMap.get(key);

      // Provision matching section in target term if not created yet
      if (!resolvedSectionId) {
        const { data: createdSec, error: secErr } = await supabase
          .from("sections")
          .insert({
            term_id: targetTermId,
            grade_level: srcSection.grade_level,
            section_name: srcSection.section_name,
            adviser_id: srcSection.adviser_id || null,
            room_id: srcSection.room_id || null,
          })
          .select("id")
          .single();

        if (secErr || !createdSec?.id) {
          skippedCount += 1;
          continue;
        }
        const createdId = String(createdSec.id);
        resolvedSectionId = createdId;
        targetSectionMap.set(key, createdId);
      }

      if (!resolvedSectionId) {
        skippedCount += 1;
        continue;
      }

      const dedupKey = `${load.teacher_id}__${load.subject_id}__${resolvedSectionId}`;
      if (existingLoadKeys.has(dedupKey)) {
        skippedCount += 1;
        continue;
      }

      existingLoadKeys.add(dedupKey);
      rowsToInsert.push({
        term_id: targetTermId,
        teacher_id: load.teacher_id,
        subject_id: load.subject_id,
        section_id: resolvedSectionId,
        teaching_minutes_weekly: load.teaching_minutes_weekly,
        ancillary_minutes_weekly: load.ancillary_minutes_weekly || 0,
        ancillary_description: load.ancillary_description || null,
        status: "Assigned",
      });
    }

    if (rowsToInsert.length > 0) {
      const { error: insertError } = await supabase
        .from("teacher_subject_loads")
        .insert(rowsToInsert);

      if (insertError) throw insertError;
    }

    return {
      success: true,
      insertedCount: rowsToInsert.length,
      skippedCount,
    };
  } catch (err: unknown) {
    console.error("[timetableService] copyTeacherLoadsFromTerm Error:", err);
    const msg = err instanceof Error ? err.message : "Failed to copy subject loads from selected term.";
    return {
      success: false,
      insertedCount: 0,
      skippedCount: 0,
      error: msg,
    };
  }
}

/**
 * Deletes a teacher subject load (cascades schedule entries)
 */
export async function deleteTeacherLoad(loadId: string): Promise<boolean> {
  try {
    const { error } = await supabase.from("teacher_subject_loads").delete().eq("id", loadId);
    if (error) throw error;
    return true;
  } catch (err) {
    console.error("[timetableService] deleteTeacherLoad Error:", err);
    return false;
  }
}
