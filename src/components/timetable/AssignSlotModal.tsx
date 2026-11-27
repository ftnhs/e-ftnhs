import React, { useState, useMemo } from"react";
import type {
  TeacherSubjectLoad,
  Subject,
  Room,
  Section,
  TimeSlot,
  TimeSlotOverride,
  ScheduleEntry,
  DayOfWeek,
} from"../../types";
import {
  detectScheduleConflicts,
  createScheduleEntry,
  updateScheduleEntry,
  findOrCreateRoomByNumber,
  getVisibleSlotsForSection,
  computeLoadPlottedStats,
  resolveScheduleEntryTime,
  computeTimeRangeDurationMinutes,
  getDefaultDurationForSubjectAndSlot,
  minutesToTimeString,
} from"../../services/timetableService";
import { AlertTriangle, X, Check, Calendar, Edit2, Clock, RotateCcw } from"lucide-react";

interface AssignSlotModalProps {
  isOpen: boolean;
  onClose: () => void;
  termId: string;
  loads: TeacherSubjectLoad[];
  subjects?: Subject[];
  rooms: Room[];
  sections?: Section[];
  timeSlots: TimeSlot[];
  timeSlotOverrides?: TimeSlotOverride[];
  existingEntries: ScheduleEntry[];
  editingEntry?: ScheduleEntry | null;
  preselectedSectionId?: string;
  preselectedTeacherId?: string;
  preselectedLoadId?: string;
  preselectedDay?: DayOfWeek;
  preselectedTimeSlotId?: string;
  preselectedStartTime?: string;
  preselectedEndTime?: string;
  onSlotScheduled: (newEntry: ScheduleEntry) => void;
  onSlotUpdated?: (updatedEntry: ScheduleEntry) => void;
  onRoomCreated?: (newRoom: Room) => void;
}

function addMinutesToHHMM(hhmm: string, deltaMinutes: number): string {
  const parts = hhmm.split(":").map(Number);
  const mins = (parts[0] ?? 0) * 60 + (parts[1] ?? 0);
  return minutesToTimeString(mins + deltaMinutes);
}

export const AssignSlotModal: React.FC<AssignSlotModalProps> = ({
  isOpen,
  onClose,
  termId,
  loads,
  subjects = [],
  rooms,
  sections = [],
  timeSlots,
  timeSlotOverrides = [],
  existingEntries,
  editingEntry = null,
  preselectedSectionId,
  preselectedTeacherId,
  preselectedLoadId,
  preselectedDay ="Monday",
  preselectedTimeSlotId,
  preselectedStartTime,
  preselectedEndTime,
  onSlotScheduled,
  onSlotUpdated,
  onRoomCreated,
}) => {
  const isEditing = Boolean(editingEntry);

  const [assignmentMode, setAssignmentMode] = useState<"load" | "guest">("load");
  const [selectedLoadId, setSelectedLoadId] = useState<string>("");
  const [guestSectionId, setGuestSectionId] = useState<string>(preselectedSectionId || "");
  const [guestSubjectId, setGuestSubjectId] = useState<string>("");
  const [guestInstructorName, setGuestInstructorName] = useState<string>("");
  const [dayOfWeek, setDayOfWeek] = useState<DayOfWeek>(preselectedDay);
  const [timeSlotId, setTimeSlotId] = useState<string>(preselectedTimeSlotId ||"");
  const [startTimeInput, setStartTimeInput] = useState<string>("08:00");
  const [endTimeInput, setEndTimeInput] = useState<string>("09:00");
  const [hasManualTimeEdit, setHasManualTimeEdit] = useState<boolean>(false);
  const [hasManualEndEdit, setHasManualEndEdit] = useState<boolean>(false);
  const [roomId, setRoomId] = useState<string>("");
  const [isCustomRoom, setIsCustomRoom] = useState<boolean>(false);
  const [customRoomNumber, setCustomRoomNumber] = useState<string>("");
  const [hasManualRoomEdit, setHasManualRoomEdit] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const allowGuestMode =
    !isEditing && !preselectedTeacherId && subjects.length > 0 && sections.length > 0;

  // Filter loads based on preselected section or teacher if provided
  const filteredLoads = useMemo(() => {
    if (isEditing) return loads;
    return loads.filter((load) => {
      if (preselectedSectionId && load.section_id !== preselectedSectionId) return false;
      if (preselectedTeacherId && load.teacher_id !== preselectedTeacherId) return false;
      return true;
    });
  }, [loads, isEditing, preselectedSectionId, preselectedTeacherId]);

  // Selected load object
  const activeLoad = useMemo(() => {
    return loads.find((l) => l.id === selectedLoadId) || null;
  }, [loads, selectedLoadId]);

  const activeGuestSection = useMemo(() => {
    return sections.find((s) => s.id === guestSectionId) || null;
  }, [sections, guestSectionId]);

  // Always resolve full section metadata (including section.room) from sections list
  const targetSection = useMemo(() => {
    if (assignmentMode === "guest") return activeGuestSection;
    if (!activeLoad) return null;
    return sections.find((s) => s.id === activeLoad.section_id) || activeLoad.section || null;
  }, [assignmentMode, activeGuestSection, activeLoad, sections]);

  const defaultSectionRoom = useMemo(() => {
    const preferredRoomId =
      assignmentMode === "load" && activeLoad?.room_id
        ? activeLoad.room_id
        : targetSection?.room_id;
    if (!preferredRoomId) return targetSection?.room || null;
    return rooms.find((r) => r.id === preferredRoomId) || targetSection?.room || null;
  }, [assignmentMode, activeLoad?.room_id, targetSection, rooms]);

  // Resolve academic slots for the target section (JHS / SHS / 12-HUMSS custom slots)
  const academicSlots = useMemo(() => {
    const sectionEntries = targetSection
      ? existingEntries.filter((e) => e.section_id === targetSection.id)
      : existingEntries;
    return getVisibleSlotsForSection(
      timeSlots,
      timeSlotOverrides,
      targetSection,
      sectionEntries
    ).filter((s) => s.slot_type === "Academic");
  }, [timeSlots, timeSlotOverrides, targetSection, existingEntries]);

  const selectedSlot = useMemo(() => {
    return academicSlots.find((s) => s.id === timeSlotId) || null;
  }, [academicSlots, timeSlotId]);

  const activeSubject = useMemo(() => {
    if (assignmentMode === "guest") {
      return subjects.find((s) => s.id === guestSubjectId) || null;
    }
    if (!activeLoad) return null;
    return activeLoad.subject || subjects.find((s) => s.id === activeLoad.subject_id) || null;
  }, [assignmentMode, guestSubjectId, activeLoad, subjects]);

  const defaultDurationMinutes = useMemo(() => {
    return getDefaultDurationForSubjectAndSlot(
      activeSubject,
      selectedSlot,
      assignmentMode === "load" ? activeLoad?.session_minutes : null
    );
  }, [activeSubject, selectedSlot, assignmentMode, activeLoad]);

  const computedDurationMinutes = useMemo(() => {
    return computeTimeRangeDurationMinutes(startTimeInput, endTimeInput);
  }, [startTimeInput, endTimeInput]);

  const isTimeRangeInvalid = !startTimeInput || !endTimeInput || computedDurationMinutes <= 0;

  const matchesSlotDefault = useMemo(() => {
    if (!selectedSlot) return false;
    return (
      startTimeInput === selectedSlot.start_time.slice(0, 5) &&
      endTimeInput === selectedSlot.end_time.slice(0, 5)
    );
  }, [selectedSlot, startTimeInput, endTimeInput]);

  const activeLoadStats = useMemo(() => {
    if (!activeLoad || assignmentMode !== "load") return null;
    return computeLoadPlottedStats(
      activeLoad.id,
      existingEntries,
      timeSlots,
      timeSlotOverrides,
      sections
    );
  }, [activeLoad, assignmentMode, existingEntries, timeSlots, timeSlotOverrides, sections]);

  // Initialize form state when modal opens (supports both new slot and editing an existing slot)
  React.useEffect(() => {
    if (!isOpen) return;

    setErrorMessage(null);
    setIsCustomRoom(false);
    setCustomRoomNumber("");

    if (editingEntry) {
      const isGuestEntry =
        Boolean(editingEntry.guest_instructor_name?.trim()) && !editingEntry.teacher_id;
      setAssignmentMode(isGuestEntry ? "guest" : "load");
      setSelectedLoadId(editingEntry.load_id || "");
      setGuestSectionId(editingEntry.section_id);
      setGuestSubjectId(editingEntry.subject_id);
      setGuestInstructorName(editingEntry.guest_instructor_name || "");
      setDayOfWeek(editingEntry.day_of_week);
      setTimeSlotId(editingEntry.time_slot_id);

      const resolvedTime = resolveScheduleEntryTime(
        editingEntry,
        timeSlots,
        timeSlotOverrides,
        sections
      );
      setStartTimeInput(resolvedTime.start_time.slice(0, 5));
      setEndTimeInput(resolvedTime.end_time.slice(0, 5));
      setHasManualTimeEdit(resolvedTime.is_custom_time);
      setHasManualEndEdit(resolvedTime.is_custom_time);

      const entrySec =
        sections.find((s) => s.id === editingEntry.section_id) || editingEntry.section || null;
      const initialRoom = editingEntry.room_id || entrySec?.room_id || "";
      setRoomId(initialRoom);
      setHasManualRoomEdit(Boolean(editingEntry.room_id && editingEntry.room_id !== entrySec?.room_id));
      return;
    }

    setAssignmentMode("load");
    const nextLoadId =
      preselectedLoadId && filteredLoads.some((l) => l.id === preselectedLoadId)
        ? preselectedLoadId
        : filteredLoads[0]?.id || "";
    setSelectedLoadId(nextLoadId);

    const nextGuestSectionId = preselectedSectionId || sections[0]?.id || "";
    setGuestSectionId(nextGuestSectionId);
    const nextGuestSubjectId = subjects[0]?.id || "";
    setGuestSubjectId(nextGuestSubjectId);
    setGuestInstructorName("");

    const matchedLoad = loads.find((l) => l.id === nextLoadId) || null;
    const initialSection = matchedLoad
      ? sections.find((s) => s.id === matchedLoad.section_id) || matchedLoad.section || null
      : sections.find((s) => s.id === nextGuestSectionId) || null;

    const initialSectionEntries = initialSection
      ? existingEntries.filter((e) => e.section_id === initialSection.id)
      : existingEntries;
    const initialSlots = getVisibleSlotsForSection(
      timeSlots,
      timeSlotOverrides,
      initialSection,
      initialSectionEntries
    ).filter((s) => s.slot_type === "Academic");

    const nextSlotId = preselectedTimeSlotId || initialSlots[0]?.id || "";
    const initialSlot = initialSlots.find((s) => s.id === nextSlotId) || initialSlots[0] || null;
    const initialSubject =
      matchedLoad?.subject ||
      subjects.find((s) => s.id === (matchedLoad?.subject_id || nextGuestSubjectId)) ||
      null;
    const initialDefaultDur = getDefaultDurationForSubjectAndSlot(
      initialSubject,
      initialSlot,
      matchedLoad?.session_minutes
    );
    const initialStart = preselectedStartTime || initialSlot?.start_time.slice(0, 5) || "08:00";
    const initialEnd =
      preselectedStartTime && preselectedEndTime
        ? preselectedEndTime
        : addMinutesToHHMM(initialStart, initialDefaultDur);

    setTimeSlotId(nextSlotId);
    setStartTimeInput(initialStart);
    setEndTimeInput(initialEnd);
    setHasManualTimeEdit(Boolean(preselectedStartTime && preselectedEndTime));
    setHasManualEndEdit(Boolean(preselectedStartTime && preselectedEndTime));
    setDayOfWeek(preselectedDay || "Monday");
    setRoomId(matchedLoad?.room_id || initialSection?.room_id || "");
    setHasManualRoomEdit(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, editingEntry]);

  // Keep default time range synced to period start + 1hr/50min subject default until manually edited
  React.useEffect(() => {
    if (!isOpen || isEditing || hasManualTimeEdit || !selectedSlot) return;
    const slotStart = selectedSlot.start_time.slice(0, 5);
    setStartTimeInput(slotStart);
    setEndTimeInput(addMinutesToHHMM(slotStart, defaultDurationMinutes));
  }, [isOpen, isEditing, hasManualTimeEdit, selectedSlot, defaultDurationMinutes]);

  // Keep default room synced to the chosen load/section room until admin explicitly changes it
  React.useEffect(() => {
    if (!isOpen || isEditing || hasManualRoomEdit || isCustomRoom) return;
    setRoomId(
      (assignmentMode === "load" ? activeLoad?.room_id : null) ||
        targetSection?.room_id ||
        ""
    );
  }, [
    isOpen,
    isEditing,
    hasManualRoomEdit,
    isCustomRoom,
    assignmentMode,
    activeLoad?.room_id,
    targetSection?.id,
    targetSection?.room_id,
  ]);

  // Match typed custom room number to an existing rooms_catalog record when available
  const matchedCustomRoom = useMemo(() => {
    const cleaned = customRoomNumber.trim().toUpperCase();
    if (!cleaned) return null;
    return rooms.find((r) => r.room_number.trim().toUpperCase() === cleaned) || null;
  }, [customRoomNumber, rooms]);

  const resolvedCandidateRoomId = useMemo(() => {
    if (isCustomRoom) {
      return matchedCustomRoom?.id || null;
    }
    return roomId || targetSection?.room_id || null;
  }, [isCustomRoom, matchedCustomRoom, roomId, targetSection?.room_id]);

  // Real-time constraint conflict evaluation
  const activeConflicts = useMemo(() => {
    if (!timeSlotId) return [];

    if (assignmentMode === "guest") {
      if (!activeGuestSection || !guestInstructorName.trim()) return [];
      return detectScheduleConflicts(
        {
          id: editingEntry?.id,
          term_id: termId,
          day_of_week: dayOfWeek,
          time_slot_id: timeSlotId,
          teacher_id: null,
          guest_instructor_name: guestInstructorName.trim(),
          section_id: activeGuestSection.id,
          room_id: resolvedCandidateRoomId,
          custom_start_time: startTimeInput ? `${startTimeInput}:00` : null,
          custom_end_time: endTimeInput ? `${endTimeInput}:00` : null,
        },
        existingEntries,
        { timeSlots, timeSlotOverrides, sections }
      );
    }

    if (!activeLoad) return [];

    return detectScheduleConflicts(
      {
        id: editingEntry?.id,
        term_id: termId,
        day_of_week: dayOfWeek,
        time_slot_id: timeSlotId,
        teacher_id: activeLoad.teacher_id,
        section_id: activeLoad.section_id,
        room_id: resolvedCandidateRoomId,
        custom_start_time: startTimeInput ? `${startTimeInput}:00` : null,
        custom_end_time: endTimeInput ? `${endTimeInput}:00` : null,
      },
      existingEntries,
      { timeSlots, timeSlotOverrides, sections }
    );
  }, [
    assignmentMode,
    activeLoad,
    activeGuestSection,
    guestInstructorName,
    editingEntry?.id,
    timeSlotId,
    dayOfWeek,
    startTimeInput,
    endTimeInput,
    resolvedCandidateRoomId,
    termId,
    existingEntries,
    timeSlots,
    timeSlotOverrides,
    sections,
  ]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!timeSlotId) {
      setErrorMessage("Please select an academic time slot.");
      return;
    }

    if (assignmentMode === "guest") {
      if (!activeGuestSection || !guestSubjectId || !guestInstructorName.trim()) {
        setErrorMessage("Please select a section, subject, and enter the guest instructor's name.");
        return;
      }
    } else if (!activeLoad) {
      setErrorMessage("Please select a teacher subject load.");
      return;
    }

    if (isCustomRoom && !customRoomNumber.trim()) {
      setErrorMessage("Please enter a room number or switch back to the room list.");
      return;
    }

    if (isTimeRangeInvalid) {
      setErrorMessage("Time Finish must be later than Time Start.");
      return;
    }

    if (activeConflicts.length > 0) {
      setErrorMessage("Cannot save schedule: hard collision detected. Please adjust slot or room.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      let finalRoomId: string | null = resolvedCandidateRoomId;

      if (isCustomRoom && customRoomNumber.trim()) {
        const roomLookup = await findOrCreateRoomByNumber(customRoomNumber, rooms);
        if (!roomLookup.room) {
          setErrorMessage(roomLookup.error || "Unable to save custom room number.");
          return;
        }
        if (roomLookup.created) {
          onRoomCreated?.(roomLookup.room);
        }
        finalRoomId = roomLookup.room.id;
      }

      const customTimeFields = matchesSlotDefault
        ? {
            custom_start_time: null,
            custom_end_time: null,
            custom_duration_minutes: null,
          }
        : {
            custom_start_time: `${startTimeInput}:00`,
            custom_end_time: `${endTimeInput}:00`,
            custom_duration_minutes: computedDurationMinutes,
          };

      const payload =
        assignmentMode === "guest" && activeGuestSection
          ? {
              term_id: termId,
              load_id: null,
              teacher_id: null,
              guest_instructor_name: guestInstructorName.trim(),
              section_id: activeGuestSection.id,
              subject_id: guestSubjectId,
              time_slot_id: timeSlotId,
              room_id: finalRoomId,
              day_of_week: dayOfWeek,
              ...customTimeFields,
            }
          : {
              term_id: termId,
              load_id: activeLoad!.id,
              teacher_id: activeLoad!.teacher_id,
              section_id: activeLoad!.section_id,
              subject_id: activeLoad!.subject_id,
              time_slot_id: timeSlotId,
              room_id: finalRoomId,
              day_of_week: dayOfWeek,
              ...customTimeFields,
            };

      if (isEditing && editingEntry) {
        const result = await updateScheduleEntry(
          editingEntry.id,
          payload,
          existingEntries,
          { timeSlots, timeSlotOverrides, sections }
        );

        if (!result.success || !result.data) {
          setErrorMessage(result.error || "Failed to update schedule slot.");
          return;
        }

        onSlotUpdated?.(result.data);
        onClose();
        return;
      }

      const result = await createScheduleEntry(
        payload,
        existingEntries,
        { timeSlots, timeSlotOverrides, sections }
      );

      if (!result.success || !result.data) {
        setErrorMessage(result.error ||"Failed to schedule slot.");
        return;
      }

      onSlotScheduled(result.data);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message :"Error saving schedule entry.";
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-cyprus-950/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Dialog */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="assign-slot-title"
        className="relative bg-white w-full max-w-lg rounded-2xl border border-sand-200 shadow-2xl p-6 overflow-hidden space-y-5 transition-colors z-10"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-sand-200 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-cyprus-100 text-cyprus-900 flex items-center justify-center font-bold">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h2
                id="assign-slot-title"
                className="text-base font-bold text-cyprus-900 font-display"
              >
                {isEditing ? "Edit Scheduled Class Slot" : "Schedule Class Period"}
              </h2>
              <p className="text-xs text-sand-600">
                {isEditing
                  ? "Update the room number, day, or period for this class."
                  : "Allocate a teacher subject load into an academic time slot."}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-sand-500 hover:text-cyprus-900 rounded-lg cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Conflict Alert (Real-time warning) */}
        {activeConflicts.length > 0 && (
          <div
            role="alert"
            className="p-3 bg-crimson-50 border border-crimson-300 rounded-xl space-y-1"
          >
            <div className="flex items-center gap-2 text-crimson-800 font-bold text-xs">
              <AlertTriangle className="w-4 h-4 shrink-0 text-crimson-600" />
              <span>Hard Constraint Collision Detected!</span>
            </div>
            {activeConflicts.map((c, i) => (
              <p key={i} className="text-[11px] text-crimson-700 pl-6 leading-tight">
                • {c.message}
              </p>
            ))}
          </div>
        )}

        {errorMessage && (
          <div
            role="alert"
            className="p-3 bg-crimson-50 border border-crimson-200 text-crimson-700 text-xs rounded-lg"
          >
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {allowGuestMode && (
            <div className="flex items-center gap-1 p-1 bg-sand-50 border border-sand-200 rounded-xl">
              <button
                type="button"
                onClick={() => setAssignmentMode("load")}
                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  assignmentMode === "load"
                    ? "bg-[#0F3D2E] text-white"
                    : "text-sand-700 hover:text-cyprus-900"
                }`}
              >
                Faculty Subject Load
              </button>
              <button
                type="button"
                onClick={() => setAssignmentMode("guest")}
                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  assignmentMode === "guest"
                    ? "bg-[#0F3D2E] text-white"
                    : "text-sand-700 hover:text-cyprus-900"
                }`}
              >
                Guest / Volunteer (e.g. Religion)
              </button>
            </div>
          )}

          {/* 1. Subject Load or Guest Instructor Selection */}
          {assignmentMode === "guest" ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="guest-section-select"
                    className="block text-xs font-semibold text-cyprus-900 mb-1"
                  >
                    Section
                  </label>
                  <select
                    id="guest-section-select"
                    value={guestSectionId}
                    onChange={(e) => setGuestSectionId(e.target.value)}
                    required
                    className="w-full py-2 px-3 rounded-xl border border-sand-300 bg-white text-xs sm:text-sm text-cyprus-900"
                  >
                    {sections.map((sec) => (
                      <option key={sec.id} value={sec.id}>
                        Grade {sec.grade_level} - {sec.section_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label
                    htmlFor="guest-subject-select"
                    className="block text-xs font-semibold text-cyprus-900 mb-1"
                  >
                    Subject
                  </label>
                  <select
                    id="guest-subject-select"
                    value={guestSubjectId}
                    onChange={(e) => setGuestSubjectId(e.target.value)}
                    required
                    className="w-full py-2 px-3 rounded-xl border border-sand-300 bg-white text-xs sm:text-sm text-cyprus-900"
                  >
                    {subjects
                      .filter(
                        (s) => !activeGuestSection || s.grade_level === activeGuestSection.grade_level
                      )
                      .map((sub) => (
                        <option key={sub.id} value={sub.id}>
                          {sub.subject_code} — {sub.subject_name}
                        </option>
                      ))}
                  </select>
                </div>
              </div>
              <div>
                <label
                  htmlFor="guest-instructor-input"
                  className="block text-xs font-semibold text-cyprus-900 mb-1"
                >
                  Guest / Volunteer Instructor Name
                </label>
                <input
                  id="guest-instructor-input"
                  type="text"
                  value={guestInstructorName}
                  onChange={(e) => setGuestInstructorName(e.target.value)}
                  placeholder="e.g., F. Narisma"
                  required
                  className="w-full py-2 px-3 rounded-xl border border-sand-300 bg-white text-xs sm:text-sm text-cyprus-900"
                />
              </div>
            </div>
          ) : (
          <div>
            <label
              htmlFor="load-select"
              className="block text-xs font-semibold text-cyprus-900 mb-1"
            >
              Teacher & Subject Load
            </label>
            <select
              id="load-select"
              value={selectedLoadId}
              onChange={(e) => setSelectedLoadId(e.target.value)}
              required
              className="w-full py-2 px-3 rounded-xl border border-sand-300 bg-white text-xs sm:text-sm text-cyprus-900 focus-visible:ring-2 focus-visible:ring-crimson-600"
            >
              {filteredLoads.map((load) => (
                <option key={load.id} value={load.id}>
                  {load.subject?.subject_name} ({load.subject?.subject_code}) — Section {load.section?.section_name} • {load.teacher?.full_name}
                </option>
              ))}
            </select>
            {filteredLoads.length === 0 && (
              <span className="text-[11px] text-sand-500 mt-1 block">
                No teacher subject loads found for this filter. Please assign a load first in the Faculty Loading desk.
              </span>
            )}
            {activeLoadStats && selectedSlot && (
              <div className="mt-1.5 px-3 py-1.5 rounded-lg bg-[#F2F7F4] border border-[#B8CEC5] text-[11px] text-[#0F3D2E] font-medium">
                {(() => {
                  const slotDur = computedDurationMinutes > 0 ? computedDurationMinutes : defaultDurationMinutes;
                  const previousDur =
                    isEditing && editingEntry
                      ? resolveScheduleEntryTime(editingEntry, timeSlots, timeSlotOverrides, sections)
                          .duration_minutes
                      : 0;
                  const projected = activeLoadStats.plottedMinutes - previousDur + slotDur;
                  return (
                    <>
                      Plotted weekly total: <strong>{activeLoadStats.plottedMinutes} mins</strong> ({activeLoadStats.slotCount}{" "}
                      {activeLoadStats.slotCount === 1 ? "slot" : "slots"}) →{" "}
                      {isEditing ? "after update" : `after adding +${slotDur}m`}:{" "}
                      <strong>{projected} mins/wk</strong>
                      {(() => {
                        const requiredMins =
                          activeLoad?.target_minutes_weekly ||
                          activeLoad?.teaching_minutes_weekly ||
                          activeLoad?.subject?.minutes_per_week ||
                          0;
                        return requiredMins > 0 ? (
                          <span className="text-[#5C6660]">
                            {" "}
                            / {requiredMins}m required
                          </span>
                        ) : null;
                      })()}
                    </>
                  );
                })()}
              </div>
            )}
          </div>
          )}

          {/* 2. Day of the Week & Academic Period */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="day-select"
                className="block text-xs font-semibold text-cyprus-900 mb-1"
              >
                Day of Week
              </label>
              <select
                id="day-select"
                value={dayOfWeek}
                onChange={(e) => setDayOfWeek(e.target.value as DayOfWeek)}
                className="w-full py-2 px-3 rounded-xl border border-sand-300 bg-white text-xs sm:text-sm text-cyprus-900 focus-visible:ring-2 focus-visible:ring-crimson-600"
              >
                <option value="Monday">Monday</option>
                <option value="Tuesday">Tuesday</option>
                <option value="Wednesday">Wednesday</option>
                <option value="Thursday">Thursday</option>
                <option value="Friday">Friday</option>
              </select>
            </div>

            {/* 3. Academic Period Anchor */}
            <div>
              <label
                htmlFor="slot-select"
                className="block text-xs font-semibold text-cyprus-900 mb-1"
              >
                Academic Period
              </label>
              <select
                id="slot-select"
                value={timeSlotId}
                onChange={(e) => setTimeSlotId(e.target.value)}
                required
                className="w-full py-2 px-3 rounded-xl border border-sand-300 bg-white text-xs sm:text-sm text-cyprus-900 focus-visible:ring-2 focus-visible:ring-crimson-600"
              >
                {academicSlots.map((slot) => (
                  <option key={slot.id} value={slot.id}>
                    {slot.slot_number === 11 ? "Midday" : `P${slot.slot_number}`} — {slot.start_time.slice(0, 5)}–{slot.end_time.slice(0, 5)} ({slot.duration_minutes}m)
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 3b. Manual Time Start to Time Finish (defaults to 1hr or 50mins by subject) */}
          <div className="p-3 rounded-xl bg-[#FAF8F5] border border-[#E3DDD1] space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1C2420]">
                <Clock className="w-3.5 h-3.5 text-[#0F3D2E]" aria-hidden="true" />
                <span>Class Time (Start – Finish)</span>
              </span>
              <div className="flex items-center gap-2">
                <span
                  className={`font-mono text-[11px] font-semibold px-2 py-0.5 rounded-md ${
                    isTimeRangeInvalid
                      ? "bg-[#FBECEF] text-[#9E1B32]"
                      : "bg-[#E6EFEA] text-[#0F3D2E]"
                  }`}
                >
                  {isTimeRangeInvalid
                    ? "Invalid range"
                    : computedDurationMinutes === 60
                      ? "1 hr (60 mins)"
                      : `${computedDurationMinutes} mins`}
                </span>
                {hasManualTimeEdit && selectedSlot && (
                  <button
                    type="button"
                    onClick={() => {
                      const slotStart = selectedSlot.start_time.slice(0, 5);
                      setStartTimeInput(slotStart);
                      setEndTimeInput(addMinutesToHHMM(slotStart, defaultDurationMinutes));
                      setHasManualTimeEdit(false);
                      setHasManualEndEdit(false);
                    }}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#0F3D2E] hover:text-[#9E1B32] cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" aria-hidden="true" />
                    <span>Default ({defaultDurationMinutes}m)</span>
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="class-start-time"
                  className="block text-[11px] font-medium text-[#5C6660] mb-1"
                >
                  Time Start
                </label>
                <input
                  id="class-start-time"
                  type="time"
                  value={startTimeInput}
                  onChange={(e) => {
                    const nextStart = e.target.value;
                    setStartTimeInput(nextStart);
                    setHasManualTimeEdit(true);
                    if (nextStart && !hasManualEndEdit) {
                      setEndTimeInput(addMinutesToHHMM(nextStart, defaultDurationMinutes));
                    }
                  }}
                  required
                  className="w-full py-1.5 px-2.5 rounded-lg border border-[#E3DDD1] bg-white text-xs font-mono text-[#1C2420] focus-visible:ring-2 focus-visible:ring-[#0F3D2E]"
                />
              </div>

              <div>
                <label
                  htmlFor="class-end-time"
                  className="block text-[11px] font-medium text-[#5C6660] mb-1"
                >
                  Time Finish
                </label>
                <input
                  id="class-end-time"
                  type="time"
                  value={endTimeInput}
                  onChange={(e) => {
                    setEndTimeInput(e.target.value);
                    setHasManualTimeEdit(true);
                    setHasManualEndEdit(true);
                  }}
                  required
                  className="w-full py-1.5 px-2.5 rounded-lg border border-[#E3DDD1] bg-white text-xs font-mono text-[#1C2420] focus-visible:ring-2 focus-visible:ring-[#0F3D2E]"
                />
              </div>
            </div>

            <p className="text-[11px] text-[#5C6660]">
              Defaults to <strong>{defaultDurationMinutes === 60 ? "1 hour (60 mins)" : `${defaultDurationMinutes} mins`}</strong> for this subject/period. Edit start or finish times manually if needed.
            </p>
          </div>

          {/* 4. Classroom / Laboratory (defaults to Section room, editable for room changes) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <label
                htmlFor={isCustomRoom ? "custom-room-input" : "room-select"}
                className="block text-xs font-semibold text-cyprus-900"
              >
                Room Number / Laboratory
              </label>

              <button
                type="button"
                onClick={() => {
                  if (isCustomRoom) {
                    setIsCustomRoom(false);
                    setCustomRoomNumber("");
                    if (!roomId && defaultSectionRoom?.id) {
                      setRoomId(defaultSectionRoom.id);
                      setHasManualRoomEdit(false);
                    }
                  } else {
                    const currentRoom =
                      rooms.find((r) => r.id === (roomId || defaultSectionRoom?.id)) ||
                      defaultSectionRoom;
                    setCustomRoomNumber(currentRoom?.room_number || "");
                    setIsCustomRoom(true);
                    setHasManualRoomEdit(true);
                  }
                }}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#0F3D2E] hover:text-[#9E1B32] cursor-pointer"
              >
                <Edit2 className="w-3 h-3" aria-hidden="true" />
                <span>{isCustomRoom ? "Choose from room list" : "Edit / Type room #"}</span>
              </button>
            </div>

            {isCustomRoom ? (
              <div className="space-y-1.5">
                <input
                  id="custom-room-input"
                  type="text"
                  value={customRoomNumber}
                  onChange={(e) => {
                    setCustomRoomNumber(e.target.value);
                    setHasManualRoomEdit(true);
                  }}
                  placeholder={
                    defaultSectionRoom
                      ? `Section default: ${defaultSectionRoom.room_number} — enter room # (e.g. RM-105)`
                      : "Enter room number (e.g. RM-105, SCI-LAB)"
                  }
                  required
                  className="w-full py-2 px-3 rounded-xl border border-[#0F3D2E] bg-white text-xs sm:text-sm text-cyprus-900 focus-visible:ring-2 focus-visible:ring-[#0F3D2E]"
                />
                <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-sand-600">
                  <span>
                    {matchedCustomRoom
                      ? `Matches catalog room: ${matchedCustomRoom.room_number} (${matchedCustomRoom.room_name})`
                      : "New room number will be added to the school room list automatically."}
                  </span>
                  {defaultSectionRoom && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsCustomRoom(false);
                        setCustomRoomNumber("");
                        setRoomId(defaultSectionRoom.id);
                        setHasManualRoomEdit(false);
                      }}
                      className="text-[#0F3D2E] hover:underline font-medium cursor-pointer"
                    >
                      Use section room ({defaultSectionRoom.room_number})
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-1">
                <select
                  id="room-select"
                  value={roomId}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === "__custom__") {
                      const currentRoom =
                        rooms.find((r) => r.id === (roomId || defaultSectionRoom?.id)) ||
                        defaultSectionRoom;
                      setCustomRoomNumber(currentRoom?.room_number || "");
                      setIsCustomRoom(true);
                      setHasManualRoomEdit(true);
                      return;
                    }
                    setRoomId(val);
                    setHasManualRoomEdit(val !== (defaultSectionRoom?.id || ""));
                  }}
                  className="w-full py-2 px-3 rounded-xl border border-sand-300 bg-white text-xs sm:text-sm text-cyprus-900 focus-visible:ring-2 focus-visible:ring-crimson-600"
                >
                  {defaultSectionRoom ? (
                    <option value={defaultSectionRoom.id}>
                      {defaultSectionRoom.room_number}: {defaultSectionRoom.room_name} (Section Default)
                    </option>
                  ) : (
                    <option value="">Default Section Homeroom (Unassigned)</option>
                  )}
                  {rooms
                    .filter((r) => r.id !== defaultSectionRoom?.id)
                    .map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.room_number}: {r.room_name} ({r.room_type})
                      </option>
                    ))}
                  <option value="__custom__">+ Enter another room number...</option>
                </select>
                {defaultSectionRoom && (
                  <p className="text-[11px] text-sand-600">
                    Defaults to section room <strong>{defaultSectionRoom.room_number}</strong>. Select another room or click <strong>Edit / Type room #</strong> if this class meets elsewhere.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-sand-200">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold rounded-xl border border-sand-300 text-sand-700 hover:bg-sand-100 cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={
                isSubmitting ||
                activeConflicts.length > 0 ||
                isTimeRangeInvalid ||
                (isCustomRoom && !customRoomNumber.trim()) ||
                (assignmentMode === "load"
                  ? !activeLoad
                  : !activeGuestSection || !guestSubjectId || !guestInstructorName.trim())
              }
              className="px-5 py-2 text-xs font-semibold rounded-xl bg-crimson-600 hover:bg-crimson-700 text-white shadow-xs focus-visible:ring-2 focus-visible:ring-crimson-500 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>
                {isSubmitting
                  ? "Verifying & Saving..."
                  : isEditing
                    ? "Save Slot Changes"
                    : "Confirm Schedule Slot"}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
