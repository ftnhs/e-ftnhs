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

export function minutesToTimeString(totalMinutes: number): string {
  const clamped = Math.max(0, Math.min(23 * 60 + 59, Math.round(totalMinutes)));
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function addMinutesToHHMM(hhmm: string, addedMinutes: number): string {
  const [h = 0, m = 0] = hhmm.split(":").map(Number);
  const total = h * 60 + m + addedMinutes;
  return minutesToTimeString(total);
}

export function computeTimeRangeDurationMinutes(
  startTime?: string | null,
  endTime?: string | null
): number {
  if (!startTime || !endTime) return 0;
  return Math.max(0, timeStringToMinutes(endTime) - timeStringToMinutes(startTime));
}

function extractErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error && err.message) return err.message;
  if (err && typeof err === "object" && "message" in err && typeof err.message === "string") {
    return err.message;
  }
  return fallback;
}

export function getDefaultDurationForSubjectAndSlot(
  subject?: Pick<Subject, "minutes_per_week" | "grade_level"> | null,
  slot?: Pick<ResolvedTimeSlot, "slot_number" | "duration_minutes"> | null,
  sessionMinutes?: number | null
): number {
  if (sessionMinutes && sessionMinutes > 0) {
    return sessionMinutes;
  }
  if (slot?.slot_number === 11 && slot.duration_minutes) {
    return slot.duration_minutes;
  }
  const weekly = subject?.minutes_per_week || 0;
  const isJhsSubject = !subject?.grade_level || subject.grade_level <= 10;
  // JHS subjects whose weekly target is strictly a 50-min multiple (e.g. 50, 100, 200, 250) default to 50m
  if (isJhsSubject && weekly > 0 && weekly % 50 === 0 && weekly % 60 !== 0) {
    return 50;
  }
  if (slot?.duration_minutes === 50) {
    return 50;
  }
  if (weekly > 0 && weekly % 60 === 0) {
    return 60;
  }
  return slot?.duration_minutes || 60;
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
 * Resolves the effective start_time, end_time, and duration_minutes of a schedule entry
 * (preferring explicit per-entry custom times when set, otherwise falling back to slot/overrides).
 */
export function resolveScheduleEntryTime(
  entry: Pick<
    ScheduleEntry,
    | "time_slot_id"
    | "section_id"
    | "time_slot"
    | "section"
    | "custom_start_time"
    | "custom_end_time"
    | "custom_duration_minutes"
  >,
  timeSlots: TimeSlot[],
  overrides: TimeSlotOverride[] = [],
  sections: Section[] = []
): {
  start_time: string;
  end_time: string;
  duration_minutes: number;
  is_custom_time: boolean;
} {
  const baseSlot =
    entry.time_slot || timeSlots.find((s) => s.id === entry.time_slot_id);
  const sec =
    entry.section || sections.find((s) => s.id === entry.section_id) || null;
  const slotResolved = baseSlot
    ? resolveTimeSlotForSection(baseSlot, overrides, sec)
    : null;

  if (entry.custom_start_time && entry.custom_end_time) {
    const duration =
      entry.custom_duration_minutes && entry.custom_duration_minutes > 0
        ? entry.custom_duration_minutes
        : computeTimeRangeDurationMinutes(
            entry.custom_start_time,
            entry.custom_end_time
          );
    const differsFromSlot =
      !slotResolved ||
      entry.custom_start_time.slice(0, 5) !== slotResolved.start_time.slice(0, 5) ||
      entry.custom_end_time.slice(0, 5) !== slotResolved.end_time.slice(0, 5);

    return {
      start_time: entry.custom_start_time,
      end_time: entry.custom_end_time,
      duration_minutes: duration || slotResolved?.duration_minutes || 60,
      is_custom_time: differsFromSlot,
    };
  }

  return {
    start_time: slotResolved?.start_time || "08:00:00",
    end_time: slotResolved?.end_time || "09:00:00",
    duration_minutes: slotResolved?.duration_minutes || 0,
    is_custom_time: false,
  };
}

/**
 * Computes the resolved duration in minutes of a single plotted schedule entry.
 */
export function computeScheduleEntryDuration(
  entry: Pick<
    ScheduleEntry,
    | "time_slot_id"
    | "section_id"
    | "time_slot"
    | "section"
    | "custom_start_time"
    | "custom_end_time"
    | "custom_duration_minutes"
  >,
  timeSlots: TimeSlot[],
  overrides: TimeSlotOverride[],
  sections: Section[] = []
): number {
  return resolveScheduleEntryTime(entry, timeSlots, overrides, sections)
    .duration_minutes;
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

export interface LoadScheduleCoverage {
  plottedMinutes: number;
  plottedSlots: number;
  sectionSubjectPlottedMinutes: number;
  targetMinutes: number;
  lackingMinutes: number;
  isUnassigned: boolean;
  isIncomplete: boolean;
}

/**
 * Evaluates whether a faculty subject load has been fully plotted onto the Schedule Grid
 * relative to its required weekly hours/minutes.
 */
export function computeLoadScheduleCoverage(
  load: TeacherSubjectLoad,
  scheduleEntries: ScheduleEntry[],
  timeSlots: TimeSlot[],
  overrides: TimeSlotOverride[] = [],
  sections: Section[] = []
): LoadScheduleCoverage {
  const { plottedMinutes, slotCount } = computeLoadPlottedStats(
    load.id,
    scheduleEntries,
    timeSlots,
    overrides,
    sections
  );

  // Sum plotted minutes across all teachers sharing this exact section + subject
  // (e.g. ARAL Reading split between two faculty members in the same section).
  let sectionSubjectPlottedMinutes = 0;
  for (const entry of scheduleEntries) {
    if (entry.section_id === load.section_id && entry.subject_id === load.subject_id) {
      sectionSubjectPlottedMinutes += computeScheduleEntryDuration(
        entry,
        timeSlots,
        overrides,
        sections
      );
    }
  }

  const loadTarget =
    load.target_minutes_weekly && load.target_minutes_weekly > 0
      ? load.target_minutes_weekly
      : load.teaching_minutes_weekly && load.teaching_minutes_weekly > 0
        ? load.teaching_minutes_weekly
        : 0;
  const catalogMinutes = load.subject?.minutes_per_week || 0;
  const targetMinutes = loadTarget > 0 ? loadTarget : catalogMinutes;

  let lackingMinutes = 0;
  if (targetMinutes > 0) {
    if (slotCount === 0) {
      lackingMinutes = targetMinutes;
    } else if (sectionSubjectPlottedMinutes < targetMinutes) {
      lackingMinutes = Math.max(0, targetMinutes - sectionSubjectPlottedMinutes);
    }
  }

  return {
    plottedMinutes,
    plottedSlots: slotCount,
    sectionSubjectPlottedMinutes,
    targetMinutes,
    lackingMinutes,
    isUnassigned: slotCount === 0,
    isIncomplete: slotCount === 0 || lackingMinutes > 0,
  };
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
      termSubjectMeta,
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
      schoolReferenceService.fetchTermSubjectIds(effectiveTermId),
      supabase.from("rooms_catalog").select("*").order("room_number"),
      supabase.from("sections").select("*, adviser:profiles(id, full_name, email), room:rooms_catalog(*)").eq("term_id", effectiveTermId).order("grade_level, section_name"),
      supabase.from("time_slots").select("*").order("sort_order"),
      schoolReferenceService.fetchTimeSlotOverrides(),
      supabase
        .from("teacher_subject_loads")
        .select("*, teacher:profiles(id, full_name, email, department, designation), subject:subjects_catalog(*), section:sections(*, room:rooms_catalog(*))")
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

    const roomsList = (roomsRes.data as Room[]) || [];
    const entriesList = (entriesRes.data as ScheduleEntry[]) || [];
    const loadsList = ((loadsRes.data as TeacherSubjectLoad[]) || []).map((load) => {
      const entryRoomId =
        entriesList.find((e) => e.load_id === load.id && e.room_id)?.room_id || null;
      const effectiveRoomId = load.room_id ?? entryRoomId ?? load.section?.room_id ?? null;
      const resolvedRoom = effectiveRoomId
        ? roomsList.find((r) => r.id === effectiveRoomId) || load.section?.room
        : load.section?.room;
      return {
        ...load,
        room_id: load.room_id ?? entryRoomId ?? null,
        room: resolvedRoom,
      };
    });

    const allCatalogSubjects = (subjectsRes.data as Subject[]) || [];
    const termSubjectIdSet = new Set(termSubjectMeta.subjectIds);
    const scopedSubjects =
      !termSubjectMeta.tableMissing && termSubjectIdSet.size > 0
        ? allCatalogSubjects.filter((s) => termSubjectIdSet.has(s.id))
        : allCatalogSubjects;

    return {
      activeTerm: currentTerm,
      schoolSettings,
      subjects: scopedSubjects,
      rooms: roomsList,
      sections: (sectionsRes.data as Section[]) || [],
      timeSlots: (timeSlotsRes.data as TimeSlot[]) || [],
      timeSlotOverrides,
      loads: loadsList,
      scheduleEntries: entriesList,
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
    custom_start_time?: string | null;
    custom_end_time?: string | null;
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
  const candidateStartTime = candidate.custom_start_time || candidateResolved?.start_time || null;
  const candidateEndTime = candidate.custom_end_time || candidateResolved?.end_time || null;
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
    let hasResolvedTimes = false;
    let timesOverlap = false;

    const entryBaseSlot =
      entry.time_slot || options?.timeSlots?.find((s) => s.id === entry.time_slot_id);
    const entrySection =
      entry.section || options?.sections?.find((s) => s.id === entry.section_id);

    if (
      candidateStartTime &&
      candidateEndTime &&
      (entryBaseSlot || (entry.custom_start_time && entry.custom_end_time))
    ) {
      hasResolvedTimes = true;
      const entryTime = resolveScheduleEntryTime(
        entry,
        options?.timeSlots || [],
        overrides,
        options?.sections || []
      );
      timesOverlap = doTimeRangesOverlap(
        candidateStartTime,
        candidateEndTime,
        entryTime.start_time,
        entryTime.end_time
      );
    }

    // Compare by true clock-time overlap when times are resolved (allows split non-overlapping
    // periods like 08:00-08:30 + 08:30-09:00 inside the same Academic Period); otherwise compare slot IDs.
    if (hasResolvedTimes ? timesOverlap : sameSlotId) {
      const entryTime = resolveScheduleEntryTime(
        entry,
        options?.timeSlots || [],
        overrides,
        options?.sections || []
      );
      const periodDetails = entryTime.is_custom_time
        ? `Time: ${entryTime.start_time.slice(0, 5)}–${entryTime.end_time.slice(0, 5)}`
        : entryBaseSlot
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
        target_minutes_weekly:
          load.target_minutes_weekly && load.target_minutes_weekly > 0
            ? load.target_minutes_weekly
            : load.teaching_minutes_weekly || undefined,
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
    custom_start_time?: string | null;
    custom_end_time?: string | null;
    custom_duration_minutes?: number | null;
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
    const insertPayload: Record<string, unknown> = {
      term_id: entryData.term_id,
      load_id: cleanGuest ? null : entryData.load_id || null,
      teacher_id: cleanGuest ? null : entryData.teacher_id || null,
      guest_instructor_name: cleanGuest,
      section_id: entryData.section_id,
      subject_id: entryData.subject_id,
      time_slot_id: entryData.time_slot_id,
      room_id: entryData.room_id || null,
      day_of_week: entryData.day_of_week,
    };

    if (entryData.custom_start_time && entryData.custom_end_time) {
      insertPayload.custom_start_time = entryData.custom_start_time;
      insertPayload.custom_end_time = entryData.custom_end_time;
      insertPayload.custom_duration_minutes =
        entryData.custom_duration_minutes ||
        computeTimeRangeDurationMinutes(entryData.custom_start_time, entryData.custom_end_time);
    }

    const { data, error } = await supabase
      .from("schedule_entries")
      .insert(insertPayload)
      .select("*, teacher:profiles(id, full_name, email), subject:subjects_catalog(*), section:sections(*), time_slot:time_slots(*), room:rooms_catalog(*)")
      .single();

    if (error) throw error;
    return { success: true, data: data as ScheduleEntry };
  } catch (err: unknown) {
    console.error("[timetableService] DB Insert Error:", err);
    const msg = extractErrorMessage(err, "Failed to create schedule entry.");
    if (msg.toLowerCase().includes("custom_start_time") || msg.toLowerCase().includes("custom_duration_minutes")) {
      return {
        success: false,
        error: "Database migration 030 (custom_start_time) must be applied to Supabase before saving custom class start/finish times.",
      };
    }
    return { success: false, error: msg };
  }
}

/**
 * Finds an existing room by room_number (case-insensitive) or creates one in rooms_catalog.
 */
export async function findOrCreateRoomByNumber(
  roomNumber: string,
  existingRooms: Room[] = []
): Promise<{ room: Room | null; created: boolean; error?: string }> {
  const cleaned = roomNumber.trim();
  if (!cleaned) {
    return { room: null, created: false, error: "Room number cannot be empty." };
  }

  const normalizedUpper = cleaned.toUpperCase();
  const localMatch = existingRooms.find(
    (r) => r.room_number.trim().toUpperCase() === normalizedUpper
  );
  if (localMatch) {
    return { room: localMatch, created: false };
  }

  try {
    const { data: dbMatches } = await supabase
      .from("rooms_catalog")
      .select("*")
      .ilike("room_number", cleaned)
      .limit(1);

    if (dbMatches && dbMatches.length > 0) {
      return { room: dbMatches[0] as Room, created: false };
    }

    const createdRoom = await schoolReferenceService.createRoom({
      room_number: cleaned,
      room_name: cleaned,
      room_type: "Standard Classroom",
      capacity: 45,
      is_specialized: false,
    });
    return { room: createdRoom, created: true };
  } catch (err: unknown) {
    console.error("[timetableService] findOrCreateRoomByNumber Error:", err);
    const msg = err instanceof Error ? err.message : "Failed to save room number.";
    return { room: null, created: false, error: msg };
  }
}

/**
 * Updates an existing schedule slot entry (e.g. changing room, day, or period)
 * after executing hard-constraint conflict verification (ignoring self).
 */
export async function updateScheduleEntry(
  entryId: string,
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
    custom_start_time?: string | null;
    custom_end_time?: string | null;
    custom_duration_minutes?: number | null;
  },
  existingEntries: ScheduleEntry[],
  conflictOptions?: {
    timeSlots?: TimeSlot[];
    timeSlotOverrides?: TimeSlotOverride[];
    sections?: Section[];
    allowConflicts?: boolean;
  }
): Promise<{ success: boolean; data?: ScheduleEntry; error?: string }> {
  const conflicts = detectScheduleConflicts(
    { id: entryId, ...entryData },
    existingEntries,
    conflictOptions
  );
  if (conflicts.length > 0 && !conflictOptions?.allowConflicts) {
    return {
      success: false,
      error: conflicts.map((c) => c.message).join("\n"),
    };
  }

  try {
    const cleanGuest = entryData.guest_instructor_name?.trim() || null;
    const existingEntry = existingEntries.find((e) => e.id === entryId);
    const updatePayload: Record<string, unknown> = {
      term_id: entryData.term_id,
      load_id: cleanGuest ? null : entryData.load_id || null,
      teacher_id: cleanGuest ? null : entryData.teacher_id || null,
      guest_instructor_name: cleanGuest,
      section_id: entryData.section_id,
      subject_id: entryData.subject_id,
      time_slot_id: entryData.time_slot_id,
      room_id: entryData.room_id || null,
      day_of_week: entryData.day_of_week,
    };

    if (entryData.custom_start_time && entryData.custom_end_time) {
      updatePayload.custom_start_time = entryData.custom_start_time;
      updatePayload.custom_end_time = entryData.custom_end_time;
      updatePayload.custom_duration_minutes =
        entryData.custom_duration_minutes ||
        computeTimeRangeDurationMinutes(entryData.custom_start_time, entryData.custom_end_time);
    } else if (existingEntry?.custom_start_time || existingEntry?.custom_end_time) {
      updatePayload.custom_start_time = null;
      updatePayload.custom_end_time = null;
      updatePayload.custom_duration_minutes = null;
    }

    const { data, error } = await supabase
      .from("schedule_entries")
      .update(updatePayload)
      .eq("id", entryId)
      .select(
        "*, teacher:profiles(id, full_name, email), subject:subjects_catalog(*), section:sections(*), time_slot:time_slots(*), room:rooms_catalog(*)"
      )
      .single();

    if (error) throw error;
    return { success: true, data: data as ScheduleEntry };
  } catch (err: unknown) {
    console.error("[timetableService] DB Update Error:", err);
    const msg = extractErrorMessage(err, "Failed to update schedule entry.");
    if (msg.toLowerCase().includes("custom_start_time") || msg.toLowerCase().includes("custom_duration_minutes")) {
      return {
        success: false,
        error: "Database migration 030 (custom_start_time) must be applied to Supabase before saving custom class start/finish times.",
      };
    }
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

function buildEntryTargetTiming(
  entry: ScheduleEntry,
  targetSlot: ResolvedTimeSlot,
  timeSlots: TimeSlot[],
  overrides: TimeSlotOverride[],
  sections: Section[],
  explicitStartTime?: string | null,
  explicitEndTime?: string | null
): {
  custom_start_time: string | null;
  custom_end_time: string | null;
  custom_duration_minutes: number | null;
} {
  const entryDuration = resolveScheduleEntryTime(
    entry,
    timeSlots,
    overrides,
    sections
  ).duration_minutes;

  if (explicitStartTime && explicitEndTime) {
    const startNorm = explicitStartTime.length === 5 ? `${explicitStartTime}:00` : explicitStartTime;
    const endNorm = explicitEndTime.length === 5 ? `${explicitEndTime}:00` : explicitEndTime;
    const dur = computeTimeRangeDurationMinutes(startNorm, endNorm) || entryDuration;
    const matchesSlot =
      startNorm.slice(0, 5) === targetSlot.start_time.slice(0, 5) &&
      endNorm.slice(0, 5) === targetSlot.end_time.slice(0, 5);
    return matchesSlot
      ? { custom_start_time: null, custom_end_time: null, custom_duration_minutes: null }
      : { custom_start_time: startNorm, custom_end_time: endNorm, custom_duration_minutes: dur };
  }

  if (entryDuration > 0 && entryDuration !== targetSlot.duration_minutes) {
    const slotStart = targetSlot.start_time.slice(0, 5);
    const slotEnd = addMinutesToHHMM(slotStart, entryDuration);
    return {
      custom_start_time: `${slotStart}:00`,
      custom_end_time: `${slotEnd}:00`,
      custom_duration_minutes: entryDuration,
    };
  }

  return {
    custom_start_time: null,
    custom_end_time: null,
    custom_duration_minutes: null,
  };
}

/**
 * Moves a schedule entry via drag-and-drop onto an empty slot (preserving duration & checking conflicts).
 */
export async function moveScheduleEntry(
  entry: ScheduleEntry,
  targetDay: DayOfWeek,
  targetTimeSlotId: string,
  existingEntries: ScheduleEntry[],
  options: {
    timeSlots: TimeSlot[];
    timeSlotOverrides: TimeSlotOverride[];
    sections: Section[];
    explicitStartTime?: string | null;
    explicitEndTime?: string | null;
  }
): Promise<{ success: boolean; data?: ScheduleEntry; error?: string }> {
  const locked = await isTermScheduleLocked(entry.term_id);
  if (locked) {
    return { success: false, error: "Schedule grid is locked. Unlock the grid before moving classes." };
  }

  const baseSlot = options.timeSlots.find((s) => s.id === targetTimeSlotId);
  const sec =
    options.sections.find((s) => s.id === entry.section_id) || entry.section || null;
  if (!baseSlot) {
    return { success: false, error: "Target time slot not found." };
  }

  const resolvedTargetSlot = resolveTimeSlotForSection(
    baseSlot,
    options.timeSlotOverrides,
    sec
  );

  const timing = buildEntryTargetTiming(
    entry,
    resolvedTargetSlot,
    options.timeSlots,
    options.timeSlotOverrides,
    options.sections,
    options.explicitStartTime,
    options.explicitEndTime
  );

  return updateScheduleEntry(
    entry.id,
    {
      term_id: entry.term_id,
      load_id: entry.load_id,
      teacher_id: entry.teacher_id,
      guest_instructor_name: entry.guest_instructor_name,
      section_id: entry.section_id,
      subject_id: entry.subject_id,
      time_slot_id: targetTimeSlotId,
      room_id: entry.room_id,
      day_of_week: targetDay,
      custom_start_time: timing.custom_start_time,
      custom_end_time: timing.custom_end_time,
      custom_duration_minutes: timing.custom_duration_minutes,
    },
    existingEntries,
    {
      timeSlots: options.timeSlots,
      timeSlotOverrides: options.timeSlotOverrides,
      sections: options.sections,
      allowConflicts: true,
    }
  );
}

/**
 * Atomically swaps two schedule entries when one subject card is dropped onto another.
 * Validates hard constraints for both entries against all other classes before persisting.
 */
export async function swapScheduleEntries(
  entryA: ScheduleEntry,
  entryB: ScheduleEntry,
  existingEntries: ScheduleEntry[],
  options: {
    timeSlots: TimeSlot[];
    timeSlotOverrides: TimeSlotOverride[];
    sections: Section[];
  }
): Promise<{ success: boolean; updatedEntries?: ScheduleEntry[]; error?: string }> {
  if (entryA.id === entryB.id) {
    return { success: true, updatedEntries: [] };
  }

  const locked = await isTermScheduleLocked(entryA.term_id);
  if (locked) {
    return { success: false, error: "Schedule grid is locked. Unlock the grid before swapping classes." };
  }

  const secA = options.sections.find((s) => s.id === entryA.section_id) || entryA.section || null;
  const secB = options.sections.find((s) => s.id === entryB.section_id) || entryB.section || null;

  const baseSlotA = options.timeSlots.find((s) => s.id === entryA.time_slot_id);
  const baseSlotB = options.timeSlots.find((s) => s.id === entryB.time_slot_id);
  if (!baseSlotA || !baseSlotB) {
    return { success: false, error: "Time slot definition missing for one of the classes." };
  }

  // Same cell split-slot swap (exchanging custom times inside the same period & day)
  const sameCell =
    entryA.day_of_week === entryB.day_of_week && entryA.time_slot_id === entryB.time_slot_id;

  const resolvedSlotForAAtB = resolveTimeSlotForSection(
    baseSlotB,
    options.timeSlotOverrides,
    secA
  );
  const resolvedSlotForBAtA = resolveTimeSlotForSection(
    baseSlotA,
    options.timeSlotOverrides,
    secB
  );

  const timingA = sameCell
    ? buildEntryTargetTiming(
        entryA,
        resolvedSlotForAAtB,
        options.timeSlots,
        options.timeSlotOverrides,
        options.sections,
        entryB.custom_start_time,
        entryB.custom_end_time
      )
    : buildEntryTargetTiming(
        entryA,
        resolvedSlotForAAtB,
        options.timeSlots,
        options.timeSlotOverrides,
        options.sections
      );

  const timingB = sameCell
    ? buildEntryTargetTiming(
        entryB,
        resolvedSlotForBAtA,
        options.timeSlots,
        options.timeSlotOverrides,
        options.sections,
        entryA.custom_start_time,
        entryA.custom_end_time
      )
    : buildEntryTargetTiming(
        entryB,
        resolvedSlotForBAtA,
        options.timeSlots,
        options.timeSlotOverrides,
        options.sections
      );

  const candidateA = {
    id: entryA.id,
    term_id: entryA.term_id,
    load_id: entryA.load_id,
    teacher_id: entryA.teacher_id,
    guest_instructor_name: entryA.guest_instructor_name,
    section_id: entryA.section_id,
    subject_id: entryA.subject_id,
    room_id: entryA.room_id,
    day_of_week: entryB.day_of_week,
    time_slot_id: entryB.time_slot_id,
    custom_start_time: timingA.custom_start_time,
    custom_end_time: timingA.custom_end_time,
    custom_duration_minutes: timingA.custom_duration_minutes,
  };

  const candidateB = {
    id: entryB.id,
    term_id: entryB.term_id,
    load_id: entryB.load_id,
    teacher_id: entryB.teacher_id,
    guest_instructor_name: entryB.guest_instructor_name,
    section_id: entryB.section_id,
    subject_id: entryB.subject_id,
    room_id: entryB.room_id,
    day_of_week: entryA.day_of_week,
    time_slot_id: entryA.time_slot_id,
    custom_start_time: timingB.custom_start_time,
    custom_end_time: timingB.custom_end_time,
    custom_duration_minutes: timingB.custom_duration_minutes,
  };

  const others = existingEntries.filter((e) => e.id !== entryA.id && e.id !== entryB.id);
  const conflictOpts = {
    timeSlots: options.timeSlots,
    timeSlotOverrides: options.timeSlotOverrides,
    sections: options.sections,
  };

  const conflictsA = detectScheduleConflicts(candidateA, others, conflictOpts);
  const conflictsB = detectScheduleConflicts(candidateB, others, conflictOpts);
  const mutualConflict = detectScheduleConflicts(
    candidateA,
    [
      {
        ...entryB,
        day_of_week: candidateB.day_of_week,
        time_slot_id: candidateB.time_slot_id,
        custom_start_time: candidateB.custom_start_time,
        custom_end_time: candidateB.custom_end_time,
        custom_duration_minutes: candidateB.custom_duration_minutes,
      },
    ],
    conflictOpts
  );

  const allConflicts = [...conflictsA, ...conflictsB, ...mutualConflict];
  // Allow swapping even when temporary Teacher, Section, or Room conflicts result;
  // conflicts are surfaced visually in red on the Schedule Grid for resolution.
  void allConflicts;

  const selectCols =
    "*, teacher:profiles(id, full_name, email), subject:subjects_catalog(*), section:sections(*), time_slot:time_slots(*), room:rooms_catalog(*)";

  try {
    // 1. Prefer atomic Postgres RPC if deployed
    const rpcRes = await supabase.rpc("swap_schedule_entries", {
      p_entry_a_id: entryA.id,
      p_a_day: candidateA.day_of_week,
      p_a_time_slot_id: candidateA.time_slot_id,
      p_a_custom_start: candidateA.custom_start_time,
      p_a_custom_end: candidateA.custom_end_time,
      p_a_custom_duration: candidateA.custom_duration_minutes,
      p_entry_b_id: entryB.id,
      p_b_day: candidateB.day_of_week,
      p_b_time_slot_id: candidateB.time_slot_id,
      p_b_custom_start: candidateB.custom_start_time,
      p_b_custom_end: candidateB.custom_end_time,
      p_b_custom_duration: candidateB.custom_duration_minutes,
    });

    if (!rpcRes.error) {
      const { data: fetched, error: fetchErr } = await supabase
        .from("schedule_entries")
        .select(selectCols)
        .in("id", [entryA.id, entryB.id]);
      if (fetchErr) throw fetchErr;
      return { success: true, updatedEntries: (fetched as ScheduleEntry[]) || [] };
    }

    // 2. Rollback-safe 3-step swap fallback if RPC isn't present in DB yet
    const origBPayload = {
      id: entryB.id,
      term_id: entryB.term_id,
      load_id: entryB.load_id || null,
      teacher_id: entryB.teacher_id || null,
      guest_instructor_name: entryB.guest_instructor_name || null,
      section_id: entryB.section_id,
      subject_id: entryB.subject_id,
      room_id: entryB.room_id || null,
      day_of_week: entryB.day_of_week,
      time_slot_id: entryB.time_slot_id,
      custom_start_time: entryB.custom_start_time || null,
      custom_end_time: entryB.custom_end_time || null,
      custom_duration_minutes: entryB.custom_duration_minutes || null,
    };

    const { error: delBErr } = await supabase
      .from("schedule_entries")
      .delete()
      .eq("id", entryB.id);
    if (delBErr) throw delBErr;

    const { data: updatedA, error: updAErr } = await supabase
      .from("schedule_entries")
      .update({
        day_of_week: candidateA.day_of_week,
        time_slot_id: candidateA.time_slot_id,
        custom_start_time: candidateA.custom_start_time,
        custom_end_time: candidateA.custom_end_time,
        custom_duration_minutes: candidateA.custom_duration_minutes,
      })
      .eq("id", entryA.id)
      .select(selectCols)
      .single();

    if (updAErr) {
      // Restore B
      await supabase.from("schedule_entries").insert(origBPayload);
      throw updAErr;
    }

    const { data: insertedB, error: insBErr } = await supabase
      .from("schedule_entries")
      .insert({
        ...origBPayload,
        day_of_week: candidateB.day_of_week,
        time_slot_id: candidateB.time_slot_id,
        custom_start_time: candidateB.custom_start_time,
        custom_end_time: candidateB.custom_end_time,
        custom_duration_minutes: candidateB.custom_duration_minutes,
      })
      .select(selectCols)
      .single();

    if (insBErr) {
      // Restore A and B
      await supabase
        .from("schedule_entries")
        .update({
          day_of_week: entryA.day_of_week,
          time_slot_id: entryA.time_slot_id,
          custom_start_time: entryA.custom_start_time || null,
          custom_end_time: entryA.custom_end_time || null,
          custom_duration_minutes: entryA.custom_duration_minutes || null,
        })
        .eq("id", entryA.id);
      await supabase.from("schedule_entries").insert(origBPayload);
      throw insBErr;
    }

    return {
      success: true,
      updatedEntries: [updatedA as ScheduleEntry, insertedB as ScheduleEntry],
    };
  } catch (err: unknown) {
    console.error("[timetableService] swapScheduleEntries Error:", err);
    return {
      success: false,
      error: extractErrorMessage(err, "Failed to swap class slots."),
    };
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
  room_id?: string | null;
  session_minutes?: number | null;
  teaching_minutes_weekly: number;
  ancillary_minutes_weekly?: number;
  ancillary_description?: string;
}): Promise<{ data: TeacherSubjectLoad | null; error?: string }> {
  const selectCols =
    "*, teacher:profiles(id, full_name, email, department, designation), subject:subjects_catalog(*), section:sections(*, room:rooms_catalog(*))";

  try {
    const basePayload: Record<string, unknown> = {
      term_id: loadData.term_id,
      teacher_id: loadData.teacher_id,
      subject_id: loadData.subject_id,
      section_id: loadData.section_id,
      teaching_minutes_weekly: loadData.teaching_minutes_weekly,
      target_minutes_weekly: loadData.teaching_minutes_weekly,
      session_minutes: loadData.session_minutes ?? null,
      ancillary_minutes_weekly: loadData.ancillary_minutes_weekly || 0,
      ancillary_description: loadData.ancillary_description || null,
    };

    if (loadData.room_id) {
      basePayload.room_id = loadData.room_id;
    }

    let res = await supabase
      .from("teacher_subject_loads")
      .insert(basePayload)
      .select(selectCols)
      .single();

    // Graceful fallback if optional columns (031 room_id / 034 target_minutes_weekly) aren't applied yet
    if (
      res.error &&
      (res.error.message.toLowerCase().includes("room_id") ||
        res.error.message.toLowerCase().includes("target_minutes_weekly"))
    ) {
      const retryPayload = { ...basePayload };
      if (res.error.message.toLowerCase().includes("room_id")) {
        delete retryPayload.room_id;
      }
      if (res.error.message.toLowerCase().includes("target_minutes_weekly")) {
        delete retryPayload.target_minutes_weekly;
      }
      res = await supabase
        .from("teacher_subject_loads")
        .insert(retryPayload)
        .select(selectCols)
        .single();
      if (
        res.error &&
        (res.error.message.toLowerCase().includes("room_id") ||
          res.error.message.toLowerCase().includes("target_minutes_weekly"))
      ) {
        delete retryPayload.room_id;
        delete retryPayload.target_minutes_weekly;
        res = await supabase
          .from("teacher_subject_loads")
          .insert(retryPayload)
          .select(selectCols)
          .single();
      }
    }

    if (res.error) throw res.error;
    const saved = res.data as TeacherSubjectLoad;
    return {
      data: {
        ...saved,
        room_id: saved.room_id ?? loadData.room_id ?? null,
        target_minutes_weekly: saved.target_minutes_weekly ?? loadData.teaching_minutes_weekly,
      },
    };
  } catch (err: unknown) {
    console.error("[timetableService] createTeacherLoad Error:", err);
    const msg = extractErrorMessage(err, "Failed to assign load.");
    return { data: null, error: msg };
  }
}

/**
 * Updates an existing teacher subject load (teacher, subject, section, room, minutes, ancillary duties)
 * and keeps any already-plotted schedule_entries for this load synchronized cleanly.
 */
export async function updateTeacherLoad(
  loadId: string,
  updates: {
    teacher_id?: string;
    subject_id?: string;
    section_id?: string;
    room_id?: string | null;
    session_minutes?: number | null;
    teaching_minutes_weekly: number;
    ancillary_minutes_weekly?: number;
    ancillary_description?: string | null;
  },
  syncOptions?: {
    existingEntries?: ScheduleEntry[];
    timeSlots?: TimeSlot[];
    timeSlotOverrides?: TimeSlotOverride[];
    sections?: Section[];
  }
): Promise<{
  data: TeacherSubjectLoad | null;
  updatedEntries?: ScheduleEntry[];
  error?: string;
}> {
  const selectCols =
    "*, teacher:profiles(id, full_name, email, department, designation), subject:subjects_catalog(*), section:sections(*, room:rooms_catalog(*))";

  try {
    const existingEntries = syncOptions?.existingEntries || [];
    const linkedEntries = existingEntries.filter((e) => e.load_id === loadId);

    // Validate hard-constraint conflicts on all plotted schedule slots before applying changes
    if (linkedEntries.length > 0) {
      for (const entry of linkedEntries) {
        const nextTeacherId = updates.teacher_id ?? entry.teacher_id;
        const nextSectionId = updates.section_id ?? entry.section_id;
        const nextRoomId =
          updates.room_id !== undefined ? updates.room_id : entry.room_id ?? null;

        const conflicts = detectScheduleConflicts(
          {
            id: entry.id,
            term_id: entry.term_id,
            day_of_week: entry.day_of_week,
            time_slot_id: entry.time_slot_id,
            teacher_id: nextTeacherId,
            section_id: nextSectionId,
            room_id: nextRoomId,
            custom_start_time: entry.custom_start_time,
            custom_end_time: entry.custom_end_time,
          },
          existingEntries,
          {
            timeSlots: syncOptions?.timeSlots,
            timeSlotOverrides: syncOptions?.timeSlotOverrides,
            sections: syncOptions?.sections,
          }
        );

        if (conflicts.length > 0) {
          return {
            data: null,
            error: `Cannot update load because a plotted slot conflicts:\n${conflicts
              .map((c) => c.message)
              .join("\n")}`,
          };
        }
      }
    }

    const updatePayload: Record<string, unknown> = {
      teaching_minutes_weekly: updates.teaching_minutes_weekly,
      target_minutes_weekly: updates.teaching_minutes_weekly,
      ancillary_minutes_weekly: updates.ancillary_minutes_weekly ?? 0,
      ancillary_description: updates.ancillary_description || null,
    };
    if (updates.session_minutes !== undefined) updatePayload.session_minutes = updates.session_minutes;
    if (updates.teacher_id) updatePayload.teacher_id = updates.teacher_id;
    if (updates.subject_id) updatePayload.subject_id = updates.subject_id;
    if (updates.section_id) updatePayload.section_id = updates.section_id;
    if (updates.room_id !== undefined) updatePayload.room_id = updates.room_id || null;

    let res = await supabase
      .from("teacher_subject_loads")
      .update(updatePayload)
      .eq("id", loadId)
      .select(selectCols)
      .single();

    if (
      res.error &&
      (res.error.message.toLowerCase().includes("room_id") ||
        res.error.message.toLowerCase().includes("target_minutes_weekly"))
    ) {
      const retryPayload = { ...updatePayload };
      if (res.error.message.toLowerCase().includes("room_id")) {
        delete retryPayload.room_id;
      }
      if (res.error.message.toLowerCase().includes("target_minutes_weekly")) {
        delete retryPayload.target_minutes_weekly;
      }
      res = await supabase
        .from("teacher_subject_loads")
        .update(retryPayload)
        .eq("id", loadId)
        .select(selectCols)
        .single();
      if (
        res.error &&
        (res.error.message.toLowerCase().includes("room_id") ||
          res.error.message.toLowerCase().includes("target_minutes_weekly"))
      ) {
        delete retryPayload.room_id;
        delete retryPayload.target_minutes_weekly;
        res = await supabase
          .from("teacher_subject_loads")
          .update(retryPayload)
          .eq("id", loadId)
          .select(selectCols)
          .single();
      }
    }

    if (res.error) throw res.error;
    const savedLoad = {
      ...(res.data as TeacherSubjectLoad),
      target_minutes_weekly:
        (res.data as TeacherSubjectLoad).target_minutes_weekly ??
        updates.teaching_minutes_weekly,
    };

    // Propagate teacher / subject / section / room updates to plotted schedule entries
    let updatedEntries: ScheduleEntry[] | undefined;
    if (
      linkedEntries.length > 0 &&
      (updates.teacher_id ||
        updates.subject_id ||
        updates.section_id ||
        updates.room_id !== undefined)
    ) {
      const entryPatch: Record<string, unknown> = {};
      if (updates.teacher_id) entryPatch.teacher_id = updates.teacher_id;
      if (updates.subject_id) entryPatch.subject_id = updates.subject_id;
      if (updates.section_id) entryPatch.section_id = updates.section_id;
      if (updates.room_id !== undefined) entryPatch.room_id = updates.room_id || null;

      const { data: syncedEntries, error: syncErr } = await supabase
        .from("schedule_entries")
        .update(entryPatch)
        .eq("load_id", loadId)
        .select(
          "*, teacher:profiles(id, full_name, email), subject:subjects_catalog(*), section:sections(*), time_slot:time_slots(*), room:rooms_catalog(*)"
        );

      if (syncErr) throw syncErr;
      updatedEntries = (syncedEntries || []) as ScheduleEntry[];
    }

    return {
      data: {
        ...savedLoad,
        room_id:
          updates.room_id !== undefined
            ? updates.room_id || null
            : savedLoad.room_id ?? null,
      },
      updatedEntries,
    };
  } catch (err: unknown) {
    console.error("[timetableService] updateTeacherLoad Error:", err);
    const msg = extractErrorMessage(
      err,
      "Failed to update subject load. Ensure this teacher, subject, and section combination is not duplicated in this term."
    );
    return { data: null, error: msg };
  }
}

/**
 * Clears all faculty subject loads and schedule grid entries for a specific academic term.
 */
export async function clearTermLoadsAndSchedule(termId: string): Promise<{
  success: boolean;
  deletedLoadsCount: number;
  deletedScheduleCount: number;
  error?: string;
}> {
  if (!termId) {
    return {
      success: false,
      deletedLoadsCount: 0,
      deletedScheduleCount: 0,
      error: "Target academic term is required.",
    };
  }

  try {
    const { data: termRow } = await supabase
      .from("academic_terms")
      .select("is_schedule_locked")
      .eq("id", termId)
      .maybeSingle();
    if (termRow?.is_schedule_locked) {
      return {
        success: false,
        deletedLoadsCount: 0,
        deletedScheduleCount: 0,
        error: "Schedule grid for this term is locked. Unlock the grid before clearing.",
      };
    }

    const { data: deletedEntries, error: entriesErr } = await supabase
      .from("schedule_entries")
      .delete()
      .eq("term_id", termId)
      .select("id");

    if (entriesErr) throw entriesErr;

    const { data: deletedLoads, error: loadsErr } = await supabase
      .from("teacher_subject_loads")
      .delete()
      .eq("term_id", termId)
      .select("id");

    if (loadsErr) throw loadsErr;

    return {
      success: true,
      deletedLoadsCount: (deletedLoads || []).length,
      deletedScheduleCount: (deletedEntries || []).length,
    };
  } catch (err: unknown) {
    console.error("[timetableService] clearTermLoadsAndSchedule Error:", err);
    const msg =
      err instanceof Error
        ? err.message
        : "Failed to clear faculty loads and schedule entries.";
    return {
      success: false,
      deletedLoadsCount: 0,
      deletedScheduleCount: 0,
      error: msg,
    };
  }
}

interface SourceSectionMeta {
  id: string;
  grade_level: number;
  section_name: string;
  track_strand?: string | null;
  adviser_id: string | null;
  room_id: string | null;
}

/**
 * Copies all faculty subject loads AND their plotted schedule grid entries
 * (with per-term section ID mapping and collision checks) from a source term
 * into a target term. Optionally clears target term loads & schedule first.
 */
export async function copyTeacherLoadsFromTerm(
  sourceTermId: string,
  targetTermId: string,
  options?: { clearExisting?: boolean; includeScheduleGrid?: boolean }
): Promise<{
  success: boolean;
  insertedCount: number;
  skippedCount: number;
  insertedScheduleCount: number;
  skippedScheduleCount: number;
  excludedByTermSubjectsCount?: number;
  clearedLoadsCount?: number;
  clearedScheduleCount?: number;
  error?: string;
}> {
  if (!sourceTermId || !targetTermId) {
    return {
      success: false,
      insertedCount: 0,
      skippedCount: 0,
      insertedScheduleCount: 0,
      skippedScheduleCount: 0,
      error: "Both source and target academic terms are required.",
    };
  }
  if (sourceTermId === targetTermId) {
    return {
      success: false,
      insertedCount: 0,
      skippedCount: 0,
      insertedScheduleCount: 0,
      skippedScheduleCount: 0,
      error: "Source term and target term must be different.",
    };
  }

  try {
    const includeScheduleGrid = options?.includeScheduleGrid ?? true;
    if (includeScheduleGrid) {
      const { data: targetTermRow } = await supabase
        .from("academic_terms")
        .select("is_schedule_locked")
        .eq("id", targetTermId)
        .maybeSingle();
      if (targetTermRow?.is_schedule_locked) {
        return {
          success: false,
          insertedCount: 0,
          skippedCount: 0,
          insertedScheduleCount: 0,
          skippedScheduleCount: 0,
          error: "Target term's schedule grid is locked. Unlock it first before populating schedule slots.",
        };
      }
    }

    const targetTermSubjectsMeta = await schoolReferenceService.fetchTermSubjectIds(targetTermId);
    const hasTermSubjectFilter = !targetTermSubjectsMeta.tableMissing;
    const allowedTargetSubjectIds = hasTermSubjectFilter
      ? new Set(targetTermSubjectsMeta.subjectIds)
      : null;

    if (allowedTargetSubjectIds && allowedTargetSubjectIds.size === 0) {
      return {
        success: false,
        insertedCount: 0,
        skippedCount: 0,
        insertedScheduleCount: 0,
        skippedScheduleCount: 0,
        error:
          "This target term has no subjects in its Term Subject List. Please add or populate Term Subjects in Admin & Settings first.",
      };
    }

    let clearedLoadsCount = 0;
    let clearedScheduleCount = 0;

    if (options?.clearExisting) {
      const clearRes = await clearTermLoadsAndSchedule(targetTermId);
      if (!clearRes.success) {
        return {
          success: false,
          insertedCount: 0,
          skippedCount: 0,
          insertedScheduleCount: 0,
          skippedScheduleCount: 0,
          error: clearRes.error || "Failed to clear existing target term loads.",
        };
      }
      clearedLoadsCount = clearRes.deletedLoadsCount;
      clearedScheduleCount = clearRes.deletedScheduleCount;
    }

    const [
      sourceLoadsRes,
      sourceEntriesRes,
      targetSectionsRes,
      existingTargetLoadsRes,
      existingTargetEntriesRes,
      sectionOverridesRes,
    ] = await Promise.all([
      supabase
        .from("teacher_subject_loads")
        .select(
          "teacher_id, subject_id, section_id, teaching_minutes_weekly, session_minutes, ancillary_minutes_weekly, ancillary_description, section:sections(id, grade_level, section_name, track_strand, adviser_id, room_id)"
        )
        .eq("term_id", sourceTermId),
      supabase
        .from("schedule_entries")
        .select(
          "*, section:sections(id, grade_level, section_name, track_strand, adviser_id, room_id)"
        )
        .eq("term_id", sourceTermId),
      supabase
        .from("sections")
        .select("id, grade_level, section_name")
        .eq("term_id", targetTermId),
      supabase
        .from("teacher_subject_loads")
        .select("id, teacher_id, subject_id, section_id")
        .eq("term_id", targetTermId),
      supabase
        .from("schedule_entries")
        .select("day_of_week, time_slot_id, teacher_id, guest_instructor_name, section_id, room_id")
        .eq("term_id", targetTermId),
      supabase
        .from("time_slot_overrides")
        .select("time_slot_id, section_id, start_time, end_time, duration_minutes, slot_label, slot_type")
        .eq("scope_type", "SECTION"),
    ]);

    if (sourceLoadsRes.error) throw sourceLoadsRes.error;
    if (sourceEntriesRes.error) throw sourceEntriesRes.error;
    if (targetSectionsRes.error) throw targetSectionsRes.error;
    if (existingTargetLoadsRes.error) throw existingTargetLoadsRes.error;
    if (existingTargetEntriesRes.error) throw existingTargetEntriesRes.error;

    const rawSourceLoads = (sourceLoadsRes.data || []) as Array<{
      teacher_id: string;
      subject_id: string;
      section_id: string;
      teaching_minutes_weekly: number;
      session_minutes?: number | null;
      ancillary_minutes_weekly: number;
      ancillary_description: string | null;
      section: SourceSectionMeta | SourceSectionMeta[] | null;
    }>;

    const rawSourceEntries = (sourceEntriesRes.data || []) as Array<{
      load_id: string | null;
      teacher_id: string | null;
      guest_instructor_name: string | null;
      section_id: string;
      subject_id: string;
      time_slot_id: string;
      room_id: string | null;
      day_of_week: DayOfWeek;
      custom_start_time?: string | null;
      custom_end_time?: string | null;
      custom_duration_minutes?: number | null;
      section: SourceSectionMeta | SourceSectionMeta[] | null;
    }>;

    if (rawSourceLoads.length === 0 && (!includeScheduleGrid || rawSourceEntries.length === 0)) {
      return {
        success: false,
        insertedCount: 0,
        skippedCount: 0,
        insertedScheduleCount: 0,
        skippedScheduleCount: 0,
        error: includeScheduleGrid
          ? "The selected source term has no subject loads or schedule entries to copy."
          : "The selected source term has no faculty subject loads to copy.",
      };
    }

    // Filter out subjects not present in the target term's Term Subject List
    const sourceLoads = allowedTargetSubjectIds
      ? rawSourceLoads.filter((l) => allowedTargetSubjectIds.has(l.subject_id))
      : rawSourceLoads;
    const excludedByTermSubjectsCount = rawSourceLoads.length - sourceLoads.length;

    const sourceEntries = allowedTargetSubjectIds
      ? rawSourceEntries.filter((e) => allowedTargetSubjectIds.has(e.subject_id))
      : rawSourceEntries;

    if (sourceLoads.length === 0 && (!includeScheduleGrid || sourceEntries.length === 0)) {
      return {
        success: false,
        insertedCount: 0,
        skippedCount: 0,
        insertedScheduleCount: 0,
        skippedScheduleCount: 0,
        excludedByTermSubjectsCount,
        error:
          "None of the source term's loads belong to the target term's Term Subject List.",
      };
    }

    const sectionKey = (grade: number, name: string) =>
      `${grade}__${name.trim().toLowerCase()}`;

    const targetSectionMap = new Map<string, string>();
    for (const sec of targetSectionsRes.data || []) {
      targetSectionMap.set(sectionKey(sec.grade_level, sec.section_name), sec.id);
    }

    const sectionOverrides = (sectionOverridesRes.data || []) as Array<{
      time_slot_id: string;
      section_id: string;
      start_time: string;
      end_time: string;
      duration_minutes: number;
      slot_label: string | null;
      slot_type: TimeSlot["slot_type"] | null;
    }>;
    const targetOverrideKeys = new Set<string>(
      sectionOverrides.map((ov) => `${ov.time_slot_id}__${ov.section_id}`)
    );
    const copiedSectionPairs = new Set<string>();

    const ensureTargetSectionId = async (
      rawSection: SourceSectionMeta | SourceSectionMeta[] | null
    ): Promise<string | null> => {
      const srcSection = Array.isArray(rawSection) ? rawSection[0] : rawSection;
      if (!srcSection) return null;

      const key = sectionKey(srcSection.grade_level, srcSection.section_name);
      let resolvedSectionId = targetSectionMap.get(key);

      if (!resolvedSectionId) {
        const { data: createdSec, error: secErr } = await supabase
          .from("sections")
          .insert({
            term_id: targetTermId,
            grade_level: srcSection.grade_level,
            section_name: srcSection.section_name,
            track_strand: srcSection.track_strand || null,
            adviser_id: srcSection.adviser_id || null,
            room_id: srcSection.room_id || null,
          })
          .select("id")
          .single();

        if (secErr || !createdSec?.id) {
          return null;
        }
        resolvedSectionId = String(createdSec.id);
        targetSectionMap.set(key, resolvedSectionId);
      }

      // Copy section-specific time slot overrides (e.g. Grade 12 HUMSS 12:30-1:00 PM HOPE 3)
      const pairKey = `${srcSection.id}__${resolvedSectionId}`;
      if (!copiedSectionPairs.has(pairKey)) {
        copiedSectionPairs.add(pairKey);
        const matchingOverrides = sectionOverrides.filter(
          (ov) =>
            ov.section_id === srcSection.id &&
            !targetOverrideKeys.has(`${ov.time_slot_id}__${resolvedSectionId}`)
        );
        if (matchingOverrides.length > 0) {
          const overrideRows = matchingOverrides.map((ov) => {
            targetOverrideKeys.add(`${ov.time_slot_id}__${resolvedSectionId}`);
            return {
              time_slot_id: ov.time_slot_id,
              scope_type: "SECTION" as const,
              section_id: resolvedSectionId,
              start_time: ov.start_time,
              end_time: ov.end_time,
              duration_minutes: ov.duration_minutes,
              slot_label: ov.slot_label,
              slot_type: ov.slot_type,
            };
          });
          await supabase.from("time_slot_overrides").insert(overrideRows);
        }
      }

      return resolvedSectionId;
    };

    const targetLoadMap = new Map<string, string>();
    for (const ex of existingTargetLoadsRes.data || []) {
      targetLoadMap.set(`${ex.teacher_id}__${ex.subject_id}__${ex.section_id}`, ex.id);
    }

    const rowsToInsert: Array<{
      term_id: string;
      teacher_id: string;
      subject_id: string;
      section_id: string;
      teaching_minutes_weekly: number;
      target_minutes_weekly: number;
      session_minutes: number | null;
      ancillary_minutes_weekly: number;
      ancillary_description: string | null;
      status: "Assigned";
    }> = [];

    let skippedCount = 0;

    for (const load of sourceLoads) {
      const resolvedSectionId = await ensureTargetSectionId(load.section);
      if (!resolvedSectionId) {
        skippedCount += 1;
        continue;
      }

      const dedupKey = `${load.teacher_id}__${load.subject_id}__${resolvedSectionId}`;
      if (targetLoadMap.has(dedupKey)) {
        skippedCount += 1;
        continue;
      }

      // Reserve key to avoid duplicates within sourceLoads
      targetLoadMap.set(dedupKey, "__pending__");
      rowsToInsert.push({
        term_id: targetTermId,
        teacher_id: load.teacher_id,
        subject_id: load.subject_id,
        section_id: resolvedSectionId,
        teaching_minutes_weekly: load.teaching_minutes_weekly,
        target_minutes_weekly: load.teaching_minutes_weekly,
        session_minutes: load.session_minutes ?? null,
        ancillary_minutes_weekly: load.ancillary_minutes_weekly || 0,
        ancillary_description: load.ancillary_description || null,
        status: "Assigned",
      });
    }

    if (rowsToInsert.length > 0) {
      const { data: insertedLoads, error: insertError } = await supabase
        .from("teacher_subject_loads")
        .insert(rowsToInsert)
        .select("id, teacher_id, subject_id, section_id");

      if (insertError) throw insertError;

      for (const created of insertedLoads || []) {
        targetLoadMap.set(
          `${created.teacher_id}__${created.subject_id}__${created.section_id}`,
          created.id
        );
      }
    }

    if (!includeScheduleGrid) {
      return {
        success: true,
        insertedCount: rowsToInsert.length,
        skippedCount,
        insertedScheduleCount: 0,
        skippedScheduleCount: 0,
        excludedByTermSubjectsCount,
        clearedLoadsCount,
        clearedScheduleCount,
      };
    }

    // Track occupied slots in target term so batch schedule insertion satisfies all DB unique constraints
    const occupiedTeacherSlots = new Set<string>();
    const occupiedSectionSlots = new Set<string>();
    const occupiedRoomSlots = new Set<string>();
    const occupiedGuestSlots = new Set<string>();

    for (const ex of existingTargetEntriesRes.data || []) {
      if (ex.teacher_id) {
        occupiedTeacherSlots.add(`${ex.day_of_week}__${ex.time_slot_id}__${ex.teacher_id}`);
      }
      if (ex.guest_instructor_name?.trim()) {
        occupiedGuestSlots.add(
          `${ex.day_of_week}__${ex.time_slot_id}__${ex.guest_instructor_name.trim().toUpperCase()}`
        );
      }
      occupiedSectionSlots.add(`${ex.day_of_week}__${ex.time_slot_id}__${ex.section_id}`);
      if (ex.room_id) {
        occupiedRoomSlots.add(`${ex.day_of_week}__${ex.time_slot_id}__${ex.room_id}`);
      }
    }

    const hasCustomEntryTimes = sourceEntries.some(
      (e) => Boolean(e.custom_start_time && e.custom_end_time)
    );

    const entriesToInsert: Array<Record<string, unknown>> = [];

    let skippedScheduleCount = 0;

    for (const entry of sourceEntries) {
      const resolvedSectionId = await ensureTargetSectionId(entry.section);
      if (!resolvedSectionId) {
        skippedScheduleCount += 1;
        continue;
      }

      const cleanGuest = entry.guest_instructor_name?.trim() || null;
      let targetLoadId: string | null = null;
      const targetTeacherId: string | null = entry.teacher_id || null;

      if (cleanGuest && !targetTeacherId) {
        targetLoadId = null;
      } else if (targetTeacherId) {
        const loadKey = `${targetTeacherId}__${entry.subject_id}__${resolvedSectionId}`;
        const mappedLoadId = targetLoadMap.get(loadKey);
        if (!mappedLoadId || mappedLoadId === "__pending__") {
          skippedScheduleCount += 1;
          continue;
        }
        targetLoadId = mappedLoadId;
      } else {
        skippedScheduleCount += 1;
        continue;
      }

      const secSlotKey = `${entry.day_of_week}__${entry.time_slot_id}__${resolvedSectionId}`;
      const teacherSlotKey = targetTeacherId
        ? `${entry.day_of_week}__${entry.time_slot_id}__${targetTeacherId}`
        : null;
      const guestSlotKey = cleanGuest
        ? `${entry.day_of_week}__${entry.time_slot_id}__${cleanGuest.toUpperCase()}`
        : null;
      const roomSlotKey = entry.room_id
        ? `${entry.day_of_week}__${entry.time_slot_id}__${entry.room_id}`
        : null;

      if (
        occupiedSectionSlots.has(secSlotKey) ||
        (teacherSlotKey && occupiedTeacherSlots.has(teacherSlotKey)) ||
        (guestSlotKey && occupiedGuestSlots.has(guestSlotKey)) ||
        (roomSlotKey && occupiedRoomSlots.has(roomSlotKey))
      ) {
        skippedScheduleCount += 1;
        continue;
      }

      occupiedSectionSlots.add(secSlotKey);
      if (teacherSlotKey) occupiedTeacherSlots.add(teacherSlotKey);
      if (guestSlotKey) occupiedGuestSlots.add(guestSlotKey);
      if (roomSlotKey) occupiedRoomSlots.add(roomSlotKey);

      const entryPayload: Record<string, unknown> = {
        term_id: targetTermId,
        load_id: targetLoadId,
        teacher_id: targetTeacherId,
        guest_instructor_name: cleanGuest,
        section_id: resolvedSectionId,
        subject_id: entry.subject_id,
        time_slot_id: entry.time_slot_id,
        room_id: entry.room_id || null,
        day_of_week: entry.day_of_week,
      };
      if (hasCustomEntryTimes) {
        entryPayload.custom_start_time = entry.custom_start_time || null;
        entryPayload.custom_end_time = entry.custom_end_time || null;
        entryPayload.custom_duration_minutes = entry.custom_duration_minutes || null;
      }
      entriesToInsert.push(entryPayload);
    }

    if (entriesToInsert.length > 0) {
      const { error: entriesInsertErr } = await supabase
        .from("schedule_entries")
        .insert(entriesToInsert);

      if (entriesInsertErr) throw entriesInsertErr;
    }

    return {
      success: true,
      insertedCount: rowsToInsert.length,
      skippedCount,
      insertedScheduleCount: entriesToInsert.length,
      skippedScheduleCount,
      excludedByTermSubjectsCount,
      clearedLoadsCount,
      clearedScheduleCount,
    };
  } catch (err: unknown) {
    console.error("[timetableService] copyTeacherLoadsFromTerm Error:", err);
    const msg = err instanceof Error ? err.message : "Failed to copy subject loads and schedule from selected term.";
    return {
      success: false,
      insertedCount: 0,
      skippedCount: 0,
      insertedScheduleCount: 0,
      skippedScheduleCount: 0,
      error: msg,
    };
  }
}

/**
 * Deletes a teacher subject load and explicitly removes all assigned slots from schedule_entries.
 */
export async function deleteTeacherLoad(loadId: string): Promise<boolean> {
  try {
    const { data: loadRow } = await supabase
      .from("teacher_subject_loads")
      .select("id, term_id, teacher_id, subject_id, section_id")
      .eq("id", loadId)
      .maybeSingle();

    const { error: byLoadErr } = await supabase
      .from("schedule_entries")
      .delete()
      .eq("load_id", loadId);
    if (byLoadErr) throw byLoadErr;

    if (loadRow) {
      const { error: byCompositeErr } = await supabase
        .from("schedule_entries")
        .delete()
        .eq("term_id", loadRow.term_id)
        .eq("teacher_id", loadRow.teacher_id)
        .eq("subject_id", loadRow.subject_id)
        .eq("section_id", loadRow.section_id);
      if (byCompositeErr) throw byCompositeErr;
    }

    const { error } = await supabase
      .from("teacher_subject_loads")
      .delete()
      .eq("id", loadId);
    if (error) throw error;
    return true;
  } catch (err) {
    console.error("[timetableService] deleteTeacherLoad Error:", err);
    return false;
  }
}

export interface AutoPopulateGridOptions {
  termId: string;
  scopeSectionId?: string | null; // If specified, only populates for this section; if null/empty, populates all sections in term
  clearExistingFirst?: boolean;
}

export async function isTermScheduleLocked(termId: string): Promise<boolean> {
  if (!termId) return false;
  const { data } = await supabase
    .from("academic_terms")
    .select("is_schedule_locked")
    .eq("id", termId)
    .maybeSingle();
  return Boolean(data?.is_schedule_locked);
}

export async function setScheduleGridLock(
  termId: string,
  locked: boolean,
  userId?: string
): Promise<{ success: boolean; term?: AcademicTerm; error?: string }> {
  if (!termId) {
    return { success: false, error: "Academic term is required." };
  }

  try {
    const payload = locked
      ? {
          is_schedule_locked: true,
          schedule_locked_at: new Date().toISOString(),
          schedule_locked_by: userId || null,
        }
      : {
          is_schedule_locked: false,
          schedule_locked_at: null,
          schedule_locked_by: null,
        };

    const { data, error } = await supabase
      .from("academic_terms")
      .update(payload)
      .eq("id", termId)
      .select("*")
      .single();

    if (error) throw error;
    return { success: true, term: data as AcademicTerm };
  } catch (err: unknown) {
    console.error("[timetableService] setScheduleGridLock Error:", err);
    return {
      success: false,
      error: extractErrorMessage(err, "Failed to update schedule grid lock status."),
    };
  }
}

export async function clearScheduleGrid(
  termId: string,
  sectionIds?: string[] | null
): Promise<{
  success: boolean;
  deletedCount: number;
  error?: string;
}> {
  if (!termId) {
    return {
      success: false,
      deletedCount: 0,
      error: "Academic term is required to clear the schedule grid.",
    };
  }

  try {
    const locked = await isTermScheduleLocked(termId);
    if (locked) {
      return {
        success: false,
        deletedCount: 0,
        error: "Schedule grid is locked. Unlock the grid first before clearing slots.",
      };
    }

    let query = supabase.from("schedule_entries").delete().eq("term_id", termId);
    if (sectionIds && sectionIds.length > 0) {
      query = query.in("section_id", sectionIds);
    }

    const { data: deletedRows, error } = await query.select("id");
    if (error) throw error;

    return {
      success: true,
      deletedCount: (deletedRows || []).length,
    };
  } catch (err: unknown) {
    console.error("[timetableService] clearScheduleGrid Error:", err);
    return {
      success: false,
      deletedCount: 0,
      error: extractErrorMessage(err, "Failed to clear schedule grid."),
    };
  }
}

export interface AutoPopulateGridResult {
  success: boolean;
  totalLoadsConsidered: number;
  totalSlotsPlotted: number;
  fullyAssignedLoads: number;
  partiallyAssignedLoads: number;
  unassignedLoads: number;
  unassignedLoadDetails?: Array<{
    loadId: string;
    subjectCode: string;
    sectionName: string;
    teacherName: string;
    requiredSessions: number;
    assignedSessions: number;
    reason: string;
  }>;
  createdEntries: ScheduleEntry[];
  error?: string;
}

/**
 * Intelligent AI-assisted Timetable Auto-Solver
 * Populates the Schedule Grid across sections while adhering strictly to:
 * 1. Hard physical constraints:
 *    - Teacher collision isolation (a teacher can only teach 1 class per time slot)
 *    - Section collision isolation (a section can only have 1 subject per time slot)
 *    - Room/Lab collision isolation (rooms/labs cannot be double-booked)
 * 2. Pedagogical DepEd scheduling rules:
 *    - 50-minute vs 60-minute session duration alignment based on load configuration
 *    - Equal weekly distribution: exactly 1 session per day across Monday-Friday for loads <= 5 sessions/wk
 *    - Same regular time slot across days within the week whenever possible
 *    - Consecutive multi-period block scheduling for intensive subjects (> 5 sessions/wk, e.g. SHS TVL/Specialized)
 */
export async function autoPopulateScheduleGrid(
  options: AutoPopulateGridOptions,
  contextData?: {
    loads?: TeacherSubjectLoad[];
    sections?: Section[];
    timeSlots?: TimeSlot[];
    timeSlotOverrides?: TimeSlotOverride[];
    existingEntries?: ScheduleEntry[];
    rooms?: Room[];
  }
): Promise<AutoPopulateGridResult> {
  const { termId, scopeSectionId, clearExistingFirst = false } = options;

  try {
    const locked = await isTermScheduleLocked(termId);
    if (locked) {
      return {
        success: false,
        totalLoadsConsidered: 0,
        totalSlotsPlotted: 0,
        fullyAssignedLoads: 0,
        partiallyAssignedLoads: 0,
        unassignedLoads: 0,
        createdEntries: [],
        error: "Schedule grid is locked. Unlock the grid first before re-populating.",
      };
    }

    // 1. Fetch complete term state if not fully supplied in contextData
    let loads = contextData?.loads;
    let sections = contextData?.sections;
    let timeSlots = contextData?.timeSlots;
    let timeSlotOverrides = contextData?.timeSlotOverrides;
    let existingEntries = contextData?.existingEntries;
    let rooms = contextData?.rooms;

    if (!loads || !sections || !timeSlots || !timeSlotOverrides || !existingEntries || !rooms) {
      const fullData = await fetchTimetableData(termId);
      loads = fullData.loads;
      sections = fullData.sections;
      timeSlots = fullData.timeSlots;
      timeSlotOverrides = fullData.timeSlotOverrides;
      existingEntries = fullData.scheduleEntries;
      rooms = fullData.rooms;
    }

    // Filter by term
    const termLoads = loads.filter((l) => l.term_id === termId);
    const targetSections = scopeSectionId
      ? sections.filter((s) => s.id === scopeSectionId)
      : sections.filter((s) => s.term_id === termId);

    if (termLoads.length === 0 || targetSections.length === 0) {
      return {
        success: false,
        totalLoadsConsidered: 0,
        totalSlotsPlotted: 0,
        fullyAssignedLoads: 0,
        partiallyAssignedLoads: 0,
        unassignedLoads: 0,
        createdEntries: [],
        error: "No faculty loads found for this academic term to schedule.",
      };
    }

    // 2. Clear existing entries if requested
    let workingEntries: ScheduleEntry[] = [...existingEntries];
    if (clearExistingFirst) {
      let deleteQuery = supabase.from("schedule_entries").delete().eq("term_id", termId);
      if (scopeSectionId) {
        deleteQuery = deleteQuery.eq("section_id", scopeSectionId);
        workingEntries = workingEntries.filter(
          (e) => !(e.term_id === termId && e.section_id === scopeSectionId)
        );
      } else {
        workingEntries = workingEntries.filter((e) => e.term_id !== termId);
      }
      const { error: delErr } = await deleteQuery;
      if (delErr) throw delErr;
    }

    const DAYS_ORDER: DayOfWeek[] = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
    const DAY_INDEX: Record<DayOfWeek, number> = {
      Monday: 0,
      Tuesday: 1,
      Wednesday: 2,
      Thursday: 3,
      Friday: 4,
    };

    const getSubjectCategoryKind = (load: TeacherSubjectLoad) => {
      const code = (load.subject?.subject_code || "").toUpperCase();
      const name = (load.subject?.subject_name || "").toUpperCase();
      const isHGP = code.startsWith("HGP") || name.includes("HOMEROOM GUIDANCE");
      const isRemedial = code.startsWith("REM-") || name.includes("REMEDIAL");
      const isCAT = code.startsWith("CAT-") || name.includes("CITIZENSHIP ADVANCEMENT");
      const isAralRead = code.startsWith("ARAL-READ") || name.includes("ARAL READING");
      const isAralMath = code.startsWith("ARAL-MATH") || name.includes("ARAL MATH");
      const isAral = isAralRead || isAralMath;
      return { isHGP, isRemedial, isCAT, isAralRead, isAralMath, isAral };
    };

    // 3. Prepare loads to schedule and teacher workload maps
    const loadsToSchedule = termLoads.filter((l) => {
      if (scopeSectionId && l.section_id !== scopeSectionId) return false;
      return true;
    });

    interface LoadSessionPlan {
      targetWeekly: number;
      sessionDurations: number[]; // length = number of sessions needed per week
      primaryDuration: number;
      isUniformDuration: boolean;
    }

    const computeLoadSessionPlan = (load: TeacherSubjectLoad): LoadSessionPlan => {
      const sectionObj = sections?.find((s) => s.id === load.section_id) || load.section;
      const grade = sectionObj?.grade_level || load.subject?.grade_level || 7;
      const isJHS = grade <= 10;

      const targetWeekly =
        load.target_minutes_weekly && load.target_minutes_weekly > 0
          ? load.target_minutes_weekly
          : load.teaching_minutes_weekly && load.teaching_minutes_weekly > 0
            ? load.teaching_minutes_weekly
            : load.subject?.minutes_per_week || 240;

      // Special DepEd JHS ARAL Reading case (110 mins = 1x 60m morning + 1x 50m afternoon)
      if (isJHS && targetWeekly === 110) {
        return {
          targetWeekly,
          sessionDurations: [60, 50],
          primaryDuration: 60,
          isUniformDuration: false,
        };
      }

      let sessionMins =
        load.session_minutes && load.session_minutes > 0
          ? load.session_minutes
          : isJHS
            ? targetWeekly % 60 === 0
              ? 60
              : 50
            : 60;

      // Guard against stale default 60 on strict 50-min JHS subjects
      if (isJHS && sessionMins === 60 && targetWeekly % 50 === 0 && targetWeekly % 60 !== 0) {
        sessionMins = 50;
      }

      const sessionCount = Math.max(1, Math.round(targetWeekly / sessionMins));
      return {
        targetWeekly,
        sessionDurations: Array.from({ length: sessionCount }, () => sessionMins),
        primaryDuration: sessionMins,
        isUniformDuration: true,
      };
    };

    const planByLoadId = new Map<string, LoadSessionPlan>();
    const teacherWeeklyTargetMap = new Map<string, number>();
    for (const l of termLoads) {
      const plan = computeLoadSessionPlan(l);
      planByLoadId.set(l.id, plan);
      teacherWeeklyTargetMap.set(
        l.teacher_id,
        (teacherWeeklyTargetMap.get(l.teacher_id) || 0) + plan.targetWeekly
      );
    }

    // Track each teacher's scheduled minutes per day across Mon-Fri
    const teacherDailyMinutes = new Map<string, Record<DayOfWeek, number>>();
    const ensureTeacherDayMap = (teacherId: string): Record<DayOfWeek, number> => {
      let rec = teacherDailyMinutes.get(teacherId);
      if (!rec) {
        rec = { Monday: 0, Tuesday: 0, Wednesday: 0, Thursday: 0, Friday: 0 };
        teacherDailyMinutes.set(teacherId, rec);
      }
      return rec;
    };

    for (const entry of workingEntries) {
      if (entry.term_id !== termId || !entry.teacher_id) continue;
      const dur = resolveScheduleEntryTime(entry, timeSlots, timeSlotOverrides, sections).duration_minutes;
      const rec = ensureTeacherDayMap(entry.teacher_id);
      rec[entry.day_of_week] = (rec[entry.day_of_week] || 0) + dur;
    }

    const addTeacherDailyMinutes = (teacherId: string, day: DayOfWeek, mins: number) => {
      const rec = ensureTeacherDayMap(teacherId);
      rec[day] = (rec[day] || 0) + mins;
    };

    // Helper: generate all k-sized combinations from array
    const getDayCombinations = (days: DayOfWeek[], k: number): DayOfWeek[][] => {
      const results: DayOfWeek[][] = [];
      const backtrack = (start: number, current: DayOfWeek[]) => {
        if (current.length === k) {
          results.push([...current]);
          return;
        }
        for (let i = start; i < days.length; i++) {
          const d = days[i];
          if (!d) continue;
          current.push(d);
          backtrack(i + 1, current);
          current.pop();
        }
      };
      backtrack(0, []);
      return results;
    };

    // Helper: evaluate teacher daily balance cost if `addedByDay` is added to teacher's schedule.
    // Returns null if any day exceeds `maxDailyCap`.
    const evaluateTeacherBalanceCost = (
      teacherId: string,
      addedByDay: Partial<Record<DayOfWeek, number>>,
      maxDailyCap: number
    ): number | null => {
      const curr = ensureTeacherDayMap(teacherId);
      const weeklyTotal = teacherWeeklyTargetMap.get(teacherId) || 900;
      const idealDaily = Math.max(185, Math.min(300, weeklyTotal / 5));

      let variance = 0;
      let penalty = 0;
      let maxAfter = 0;
      let minAfter = Number.POSITIVE_INFINITY;

      for (const day of DAYS_ORDER) {
        const nextVal = (curr[day] || 0) + (addedByDay[day] || 0);
        if (nextVal > maxDailyCap) return null;
        if (nextVal > 300) {
          penalty += (nextVal - 300) * 1000;
        }
        if (weeklyTotal >= 920 && nextVal > 0 && nextVal <= 180) {
          penalty += (185 - nextVal) * 20;
        }
        const diff = nextVal - idealDaily;
        variance += diff * diff;
        if (nextVal > maxAfter) maxAfter = nextVal;
        if (nextVal < minAfter) minAfter = nextVal;
      }

      return variance + (maxAfter - minAfter) * 25 + penalty;
    };

    // Helper: check if slot fits the session duration & JHS morning/afternoon rule
    const isSlotExactFitForSession = (
      resolved: ResolvedTimeSlot,
      isJHS: boolean,
      sessionMins: number
    ): boolean => {
      if (resolved.duration_minutes !== sessionMins) return false;
      if (!isJHS) return true;
      const startMins = timeStringToMinutes(resolved.start_time);
      if (sessionMins >= 60) {
        return startMins < 12 * 60; // JHS 60m sessions in morning
      }
      if (sessionMins <= 50) {
        return startMins >= 12 * 60; // JHS 50m sessions in afternoon
      }
      return true;
    };

    const getSlotPreferencePenalty = (
      load: TeacherSubjectLoad,
      sectionObj: Section,
      day: DayOfWeek | null,
      resolved: ResolvedTimeSlot,
      isJHS: boolean,
      sessionMins: number
    ): number => {
      const startMins = timeStringToMinutes(resolved.start_time);
      const { isHGP, isRemedial, isCAT } = getSubjectCategoryKind(load);
      let pen = resolved.sort_order * 15;

      if (resolved.duration_minutes !== sessionMins) {
        pen += 50000 + Math.abs(resolved.duration_minutes - sessionMins) * 200;
      }
      if (isJHS) {
        if (sessionMins >= 60 && startMins >= 12 * 60) pen += 40000;
        if (sessionMins <= 50 && startMins < 12 * 60) pen += 40000;
      }

      // Reference Term 1 & 2 rules:
      // 1. JHS HGP goes to Monday Period 1; SHS HGP goes to Period 10 (Mon/Fri)
      if (isHGP) {
        if (isJHS) {
          if (resolved.slot_number === 1 && day === "Monday") pen -= 300000;
          else if (resolved.slot_number === 1) pen -= 50000;
        } else {
          if (resolved.slot_number === 10 && (day === "Monday" || day === "Friday")) pen -= 300000;
          else if (resolved.slot_number === 10) pen -= 100000;
        }
      }

      // 2. Remedials (REM-*) & CAT-10 go to Friday whenever possible
      if ((isRemedial || isCAT) && day) {
        if (day === "Friday") {
          pen -= 250000;
        } else {
          // Slight preference for Thursday/Wednesday if Friday isn't possible
          pen += (4 - DAY_INDEX[day]) * 5000;
        }
      }

      // 3. For 1-2 session specials (REM, ARAL, CAT, HGP), prefer periods in this section that do NOT
      // already hold a 1-day/2-day slot so remaining periods keep 4 clean days for 4-day Core subjects
      const plan = planByLoadId.get(load.id);
      if (plan && plan.sessionDurations.length <= 2) {
        const entriesInThisSectionSlot = workingEntries.filter(
          (e) => e.section_id === sectionObj.id && e.time_slot_id === resolved.id
        );
        if (entriesInThisSectionSlot.length > 0) {
          pen += entriesInThisSectionSlot.length * 60000;
        }
      }

      return pen;
    };

    // Helper: enforce non-consecutive days for same ARAL Reading / ARAL Math subjects in the same section
    const hasAralConsecutiveConflict = (
      load: TeacherSubjectLoad,
      candidateDays: DayOfWeek[]
    ): boolean => {
      const { isAral } = getSubjectCategoryKind(load);
      if (!isAral) return false;

      const existingDays = workingEntries
        .filter((e) => e.section_id === load.section_id && e.subject_id === load.subject_id)
        .map((e) => e.day_of_week);

      // Check candidate days against each other
      for (let i = 0; i < candidateDays.length; i++) {
        for (let j = i + 1; j < candidateDays.length; j++) {
          const dA = candidateDays[i];
          const dB = candidateDays[j];
          if (dA && dB && Math.abs(DAY_INDEX[dA] - DAY_INDEX[dB]) < 2) {
            return true;
          }
        }
      }

      // Check candidate days against existing plotted sessions for the same ARAL subject in this section
      for (const candD of candidateDays) {
        for (const prevD of existingDays) {
          if (Math.abs(DAY_INDEX[candD] - DAY_INDEX[prevD]) < 2) {
            return true;
          }
        }
      }
      return false;
    };

    // Scheduling Tier Order (matching Term 1 & 2 reference layouts):
    // 0: HGP (reserves Monday P1 in JHS / P10 in SHS cleanly first)
    // 1: 5+ session subjects (full-week subjects like ESP-7/8/9, SHS 5-10/wk blocks, labs, section overrides)
    // 2: Remedials (REM-*) & CAT-10 (claim open Friday slots before 4-day subjects scatter)
    // 3: ARAL Reading & ARAL Math (claim non-consecutive days cleanly without fragmenting all periods)
    // 4: Core 4-day subjects (fill each remaining period's 4 free days at the exact same time slot)
    const getLoadSchedulingTier = (load: TeacherSubjectLoad): number => {
      const { isHGP, isRemedial, isCAT, isAral } = getSubjectCategoryKind(load);
      const plan = planByLoadId.get(load.id);
      const sessionCount = plan?.sessionDurations.length || 0;

      if (isHGP) return 0;
      if (sessionCount >= 5 || load.subject?.requires_lab) return 1;
      if (isRemedial || isCAT) return 2;
      if (isAral) return 3;
      return 4;
    };

    const sortedLoads = [...loadsToSchedule].sort((a, b) => {
      const tierA = getLoadSchedulingTier(a);
      const tierB = getLoadSchedulingTier(b);
      if (tierA !== tierB) return tierA - tierB;

      const tTotalA = teacherWeeklyTargetMap.get(a.teacher_id) || 0;
      const tTotalB = teacherWeeklyTargetMap.get(b.teacher_id) || 0;
      if (tTotalA !== tTotalB) return tTotalB - tTotalA;

      const planA = planByLoadId.get(a.id);
      const planB = planByLoadId.get(b.id);
      return (planB?.sessionDurations.length || 0) - (planA?.sessionDurations.length || 0);
    });

    const newEntriesToInsert: Array<{
      term_id: string;
      load_id: string;
      teacher_id: string;
      subject_id: string;
      section_id: string;
      room_id: string | null;
      day_of_week: DayOfWeek;
      time_slot_id: string;
      custom_start_time: string | null;
      custom_end_time: string | null;
      custom_duration_minutes: number | null;
    }> = [];

    // Helper to check collision with existing & newly scheduled entries in real time
    const hasCollision = (candidate: {
      term_id: string;
      day_of_week: DayOfWeek;
      time_slot_id: string;
      teacher_id: string;
      section_id: string;
      room_id: string | null;
      custom_start_time?: string | null;
      custom_end_time?: string | null;
    }) => {
      const conflicts = detectScheduleConflicts(candidate, workingEntries, {
        timeSlots,
        timeSlotOverrides,
        sections,
      });
      return conflicts.length > 0;
    };

    const commitSlotEntry = (
      load: TeacherSubjectLoad,
      sectionObj: Section,
      day: DayOfWeek,
      slot: ResolvedTimeSlot,
      sessionMins: number,
      defaultRoomId: string | null
    ) => {
      const resolved = resolveTimeSlotForSection(slot, timeSlotOverrides, sectionObj);
      const slotStart = resolved.start_time.slice(0, 5);
      const slotEnd = addMinutesToHHMM(slotStart, sessionMins);
      const isCustom = resolved.duration_minutes !== sessionMins;

      const newEntry = {
        term_id: termId,
        load_id: load.id,
        teacher_id: load.teacher_id,
        subject_id: load.subject_id,
        section_id: load.section_id,
        room_id: defaultRoomId,
        day_of_week: day,
        time_slot_id: slot.id,
        custom_start_time: isCustom ? `${slotStart}:00` : null,
        custom_end_time: isCustom ? `${slotEnd}:00` : null,
        custom_duration_minutes: isCustom ? sessionMins : null,
      };

      newEntriesToInsert.push(newEntry);
      workingEntries.push({
        id: `temp_${Math.random().toString(36).substring(2, 9)}`,
        created_at: new Date().toISOString(),
        ...newEntry,
      } as ScheduleEntry);
      addTeacherDailyMinutes(load.teacher_id, day, sessionMins);
    };

    const buildCandidate = (
      load: TeacherSubjectLoad,
      sectionObj: Section,
      day: DayOfWeek,
      slot: ResolvedTimeSlot,
      sessionMins: number,
      defaultRoomId: string | null
    ) => {
      const resolved = resolveTimeSlotForSection(slot, timeSlotOverrides, sectionObj);
      const slotStart = resolved.start_time.slice(0, 5);
      const slotEnd = addMinutesToHHMM(slotStart, sessionMins);
      const isCustom = resolved.duration_minutes !== sessionMins;
      return {
        term_id: termId,
        day_of_week: day,
        time_slot_id: slot.id,
        teacher_id: load.teacher_id,
        section_id: load.section_id,
        room_id: defaultRoomId,
        custom_start_time: isCustom ? `${slotStart}:00` : null,
        custom_end_time: isCustom ? `${slotEnd}:00` : null,
      };
    };

    const getRemainingDurations = (load: TeacherSubjectLoad, plan: LoadSessionPlan): number[] => {
      const plotted = workingEntries.filter((e) => e.load_id === load.id);
      if (plotted.length === 0) return [...plan.sessionDurations];

      const remaining = [...plan.sessionDurations];
      for (const entry of plotted) {
        const dur = resolveScheduleEntryTime(entry, timeSlots, timeSlotOverrides, sections).duration_minutes;
        const exactIdx = remaining.indexOf(dur);
        if (exactIdx !== -1) {
          remaining.splice(exactIdx, 1);
        } else if (remaining.length > 0) {
          remaining.shift();
        }
      }
      return remaining;
    };

    // 4. Multi-Pass Solver Pipeline:
    // Pass 1: Strict duration & JHS Morning/Afternoon fit + <= 300m (5h/day) cap + Friday remedials + non-consecutive ARAL
    // Pass 2: Strict duration & JHS fit + <= 360m (6h Magna Carta max)/day cap + non-consecutive ARAL
    // Pass 3: Fallback allowing duration mismatch / relaxed spacing if mathematically required
    const passes: Array<{
      allowMismatch: boolean;
      maxDailyCap: number;
      allowConsecutiveAral: boolean;
    }> = [
      { allowMismatch: false, maxDailyCap: 300, allowConsecutiveAral: false },
      { allowMismatch: false, maxDailyCap: 360, allowConsecutiveAral: false },
      { allowMismatch: true, maxDailyCap: 360, allowConsecutiveAral: true },
    ];

    for (const pass of passes) {
      for (const load of sortedLoads) {
        const sectionObj = sections.find((s) => s.id === load.section_id) || load.section;
        if (!sectionObj) continue;

        const plan = planByLoadId.get(load.id);
        if (!plan) continue;

        const remainingDurations = getRemainingDurations(load, plan);
        if (remainingDurations.length === 0) continue;

        const isJHS = sectionObj.grade_level <= 10;
        const defaultRoomId = load.room_id || sectionObj.room_id || null;

        const rawSlots = getVisibleSlotsForSection(
          timeSlots,
          timeSlotOverrides,
          sectionObj,
          workingEntries.filter((e) => e.section_id === sectionObj.id)
        ).filter((s) => s.slot_type === "Academic");

        const academicSlots = [...rawSlots].sort((a, b) => a.sort_order - b.sort_order);
        const alreadyPlotted = workingEntries.filter((e) => e.load_id === load.id);

        // Case A: Uniform sessions <= 5/wk with nothing plotted yet -> place ALL sessions at the SAME time slot
        if (
          plan.isUniformDuration &&
          plan.sessionDurations.length <= 5 &&
          alreadyPlotted.length === 0 &&
          remainingDurations.length === plan.sessionDurations.length
        ) {
          const sessionMins = plan.primaryDuration;
          const neededCount = remainingDurations.length;

          let bestChoice: {
            slot: ResolvedTimeSlot;
            days: DayOfWeek[];
            score: number;
          } | null = null;

          for (const slot of academicSlots) {
            const resolved = resolveTimeSlotForSection(slot, timeSlotOverrides, sectionObj);
            if (!pass.allowMismatch && !isSlotExactFitForSession(resolved, isJHS, sessionMins)) {
              continue;
            }

            const availableDays: DayOfWeek[] = [];
            for (const day of DAYS_ORDER) {
              const cand = buildCandidate(load, sectionObj, day, slot, sessionMins, defaultRoomId);
              if (!hasCollision(cand)) {
                availableDays.push(day);
              }
            }

            if (availableDays.length < neededCount) continue;

            const combos = getDayCombinations(availableDays, neededCount);

            for (const combo of combos) {
              if (!pass.allowConsecutiveAral && hasAralConsecutiveConflict(load, combo)) {
                continue;
              }

              const added: Partial<Record<DayOfWeek, number>> = {};
              for (const d of combo) added[d] = sessionMins;

              const balanceCost = evaluateTeacherBalanceCost(
                load.teacher_id,
                added,
                pass.maxDailyCap
              );
              if (balanceCost === null) continue;

              // Sum slot preferences across chosen days (captures Friday remedial, Mon P1 HGP, etc.)
              let slotDayPenSum = 0;
              for (const d of combo) {
                slotDayPenSum += getSlotPreferencePenalty(load, sectionObj, d, resolved, isJHS, sessionMins);
              }
              const avgSlotPen = slotDayPenSum / combo.length;
              const totalScore = balanceCost + avgSlotPen * 50;

              if (!bestChoice || totalScore < bestChoice.score) {
                bestChoice = { slot, days: combo, score: totalScore };
              }
            }
          }

          if (bestChoice) {
            for (const day of bestChoice.days) {
              commitSlotEntry(load, sectionObj, day, bestChoice.slot, sessionMins, defaultRoomId);
            }
            continue;
          }
        }

        // Case B: Intensive loads (> 5 sessions/wk, e.g. 6, 8, or 10 sessions/wk in SHS)
        if (plan.isUniformDuration && plan.sessionDurations.length > 5) {
          const sessionMins = plan.primaryDuration;
          let rem = remainingDurations.length;

          const totalWeeklySessions = plan.sessionDurations.length;
          const doubleDaysCount = totalWeeklySessions >= 10 ? 5 : Math.max(0, totalWeeklySessions - 5);

          let existingDoubleDays = 0;
          for (const d of DAYS_ORDER) {
            if (workingEntries.filter((e) => e.load_id === load.id && e.day_of_week === d).length >= 2) {
              existingDoubleDays++;
            }
          }

          const neededDoubleBlocks = Math.max(0, doubleDaysCount - existingDoubleDays);
          for (let b = 0; b < neededDoubleBlocks && rem >= 2; b++) {
            let bestPair: {
              day: DayOfWeek;
              slotA: ResolvedTimeSlot;
              slotB: ResolvedTimeSlot;
              score: number;
            } | null = null;

            for (const day of DAYS_ORDER) {
              const currDayEntries = workingEntries.filter(
                (e) => e.load_id === load.id && e.day_of_week === day
              );
              if (currDayEntries.length > 0) continue;

              const balanceCost = evaluateTeacherBalanceCost(
                load.teacher_id,
                { [day]: sessionMins * 2 },
                pass.maxDailyCap
              );
              if (balanceCost === null) continue;

              for (let idx = 0; idx < academicSlots.length - 1; idx++) {
                const slotA = academicSlots[idx];
                const slotB = academicSlots[idx + 1];
                if (!slotA || !slotB) continue;

                const resA = resolveTimeSlotForSection(slotA, timeSlotOverrides, sectionObj);
                const resB = resolveTimeSlotForSection(slotB, timeSlotOverrides, sectionObj);

                if (resA.end_time.slice(0, 5) !== resB.start_time.slice(0, 5)) continue;

                if (!pass.allowMismatch) {
                  if (
                    !isSlotExactFitForSession(resA, isJHS, sessionMins) ||
                    !isSlotExactFitForSession(resB, isJHS, sessionMins)
                  ) {
                    continue;
                  }
                }

                const candA = buildCandidate(load, sectionObj, day, slotA, sessionMins, defaultRoomId);
                const candB = buildCandidate(load, sectionObj, day, slotB, sessionMins, defaultRoomId);
                if (hasCollision(candA) || hasCollision(candB)) continue;

                const slotPen =
                  getSlotPreferencePenalty(load, sectionObj, day, resA, isJHS, sessionMins) +
                  getSlotPreferencePenalty(load, sectionObj, day, resB, isJHS, sessionMins);
                const totalScore = balanceCost + slotPen * 25;
                if (!bestPair || totalScore < bestPair.score) {
                  bestPair = { day, slotA, slotB, score: totalScore };
                }
              }
            }

            if (bestPair) {
              commitSlotEntry(load, sectionObj, bestPair.day, bestPair.slotA, sessionMins, defaultRoomId);
              commitSlotEntry(load, sectionObj, bestPair.day, bestPair.slotB, sessionMins, defaultRoomId);
              rem -= 2;
            } else {
              break;
            }
          }

          while (rem > 0) {
            let bestSingle: {
              day: DayOfWeek;
              slot: ResolvedTimeSlot;
              score: number;
            } | null = null;

            for (const day of DAYS_ORDER) {
              const currDayEntries = workingEntries.filter(
                (e) => e.load_id === load.id && e.day_of_week === day
              );
              if (currDayEntries.length >= 2) continue;

              const balanceCost = evaluateTeacherBalanceCost(
                load.teacher_id,
                { [day]: sessionMins },
                pass.maxDailyCap
              );
              if (balanceCost === null) continue;

              for (let idx = 0; idx < academicSlots.length; idx++) {
                const slot = academicSlots[idx];
                if (!slot) continue;
                const resolved = resolveTimeSlotForSection(slot, timeSlotOverrides, sectionObj);
                if (!pass.allowMismatch && !isSlotExactFitForSession(resolved, isJHS, sessionMins)) {
                  continue;
                }

                let preferDayPen = 0;
                if (currDayEntries.length === 1 && currDayEntries[0]) {
                  const prevRes = resolveScheduleEntryTime(
                    currDayEntries[0],
                    timeSlots,
                    timeSlotOverrides,
                    sections
                  );
                  const isAdjacent =
                    prevRes.end_time.slice(0, 5) === resolved.start_time.slice(0, 5) ||
                    resolved.end_time.slice(0, 5) === prevRes.start_time.slice(0, 5);
                  if (!isAdjacent) continue;
                  preferDayPen = 15000;
                }

                const cand = buildCandidate(load, sectionObj, day, slot, sessionMins, defaultRoomId);
                if (hasCollision(cand)) continue;

                const totalScore =
                  balanceCost +
                  preferDayPen +
                  getSlotPreferencePenalty(load, sectionObj, day, resolved, isJHS, sessionMins) * 25;
                if (!bestSingle || totalScore < bestSingle.score) {
                  bestSingle = { day, slot, score: totalScore };
                }
              }
            }

            if (bestSingle) {
              commitSlotEntry(load, sectionObj, bestSingle.day, bestSingle.slot, sessionMins, defaultRoomId);
              rem -= 1;
            } else {
              break;
            }
          }
          continue;
        }

        // Case C: Mixed / split durations (e.g. JHS 110m ARAL Reading [60, 50]) or fallback when uniform period wasn't free
        for (const sessionMins of remainingDurations) {
          let bestPlacement: {
            day: DayOfWeek;
            slot: ResolvedTimeSlot;
            score: number;
          } | null = null;

          const usedSlotIdsForLoad = new Set(
            workingEntries.filter((e) => e.load_id === load.id).map((e) => e.time_slot_id)
          );

          for (const day of DAYS_ORDER) {
            const currDayEntries = workingEntries.filter(
              (e) => e.load_id === load.id && e.day_of_week === day
            );
            if (plan.sessionDurations.length <= 5 && currDayEntries.length >= 1) {
              if (!pass.allowMismatch || plan.isUniformDuration) {
                continue;
              }
            }

            if (!pass.allowConsecutiveAral && hasAralConsecutiveConflict(load, [day])) {
              continue;
            }

            const balanceCost = evaluateTeacherBalanceCost(
              load.teacher_id,
              { [day]: sessionMins },
              pass.maxDailyCap
            );
            if (balanceCost === null) continue;

            for (const slot of academicSlots) {
              const resolved = resolveTimeSlotForSection(slot, timeSlotOverrides, sectionObj);
              if (!pass.allowMismatch && !isSlotExactFitForSession(resolved, isJHS, sessionMins)) {
                continue;
              }

              const cand = buildCandidate(load, sectionObj, day, slot, sessionMins, defaultRoomId);
              if (hasCollision(cand)) continue;

              const consistencyBonus = usedSlotIdsForLoad.has(slot.id) ? -25000 : 0;
              const slotPen = getSlotPreferencePenalty(
                load,
                sectionObj,
                day,
                resolved,
                isJHS,
                sessionMins
              );
              const totalScore = balanceCost + slotPen * 25 + consistencyBonus;

              if (!bestPlacement || totalScore < bestPlacement.score) {
                bestPlacement = { day, slot, score: totalScore };
              }
            }
          }

          if (bestPlacement) {
            commitSlotEntry(
              load,
              sectionObj,
              bestPlacement.day,
              bestPlacement.slot,
              sessionMins,
              defaultRoomId
            );
          }
        }
      }
    }

    // Summarize completion across all considered loads
    const unassignedDetails: AutoPopulateGridResult["unassignedLoadDetails"] = [];
    let fullyAssignedCount = 0;
    let partiallyAssignedCount = 0;
    let unassignedCount = 0;

    for (const load of sortedLoads) {
      const sectionObj = sections.find((s) => s.id === load.section_id) || load.section;
      const plan = planByLoadId.get(load.id);
      if (!sectionObj || !plan) continue;

      const requiredCount = plan.sessionDurations.length;
      const finalPlottedCount = workingEntries.filter((e) => e.load_id === load.id).length;

      if (finalPlottedCount >= requiredCount) {
        fullyAssignedCount++;
      } else if (finalPlottedCount > 0) {
        partiallyAssignedCount++;
        unassignedDetails.push({
          loadId: load.id,
          subjectCode: load.subject?.subject_code || "Subject",
          sectionName: sectionObj.section_name,
          teacherName: load.teacher?.full_name || "Faculty",
          requiredSessions: requiredCount,
          assignedSessions: finalPlottedCount,
          reason: `Lacks available conflict-free time slots (${finalPlottedCount}/${requiredCount} sessions plotted).`,
        });
      } else {
        unassignedCount++;
        unassignedDetails.push({
          loadId: load.id,
          subjectCode: load.subject?.subject_code || "Subject",
          sectionName: sectionObj.section_name,
          teacherName: load.teacher?.full_name || "Faculty",
          requiredSessions: requiredCount,
          assignedSessions: 0,
          reason: "Teacher or Section completely booked during all available academic slots.",
        });
      }
    }

    // 5. Bulk insert created entries into database
    const createdResultEntries: ScheduleEntry[] = [];
    if (newEntriesToInsert.length > 0) {
      const selectCols =
        "*, teacher:profiles(id, full_name, email), subject:subjects_catalog(*), section:sections(*), time_slot:time_slots(*), room:rooms_catalog(*)";

      // Insert in batches of 50 to maintain fast execution and avoid network payload caps
      const BATCH_SIZE = 50;
      for (let i = 0; i < newEntriesToInsert.length; i += BATCH_SIZE) {
        const chunk = newEntriesToInsert.slice(i, i + BATCH_SIZE);
        const { data: insertedChunk, error: insErr } = await supabase
          .from("schedule_entries")
          .insert(chunk)
          .select(selectCols);

        if (insErr) {
          console.error("[autoPopulateScheduleGrid] Insert batch error:", insErr);
          throw insErr;
        }

        if (insertedChunk) {
          createdResultEntries.push(...(insertedChunk as ScheduleEntry[]));
        }
      }
    }

    return {
      success: true,
      totalLoadsConsidered: loadsToSchedule.length,
      totalSlotsPlotted: createdResultEntries.length,
      fullyAssignedLoads: fullyAssignedCount,
      partiallyAssignedLoads: partiallyAssignedCount,
      unassignedLoads: unassignedCount,
      unassignedLoadDetails: unassignedDetails,
      createdEntries: createdResultEntries,
    };
  } catch (err: unknown) {
    console.error("[autoPopulateScheduleGrid] Fatal solver error:", err);
    const msg = extractErrorMessage(err, "Failed to auto-populate schedule grid.");
    return {
      success: false,
      totalLoadsConsidered: 0,
      totalSlotsPlotted: 0,
      fullyAssignedLoads: 0,
      partiallyAssignedLoads: 0,
      unassignedLoads: 0,
      createdEntries: [],
      error: msg,
    };
  }
}
