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
  getVisibleSlotsForSection,
  computeLoadPlottedStats,
} from"../../services/timetableService";
import { AlertTriangle, X, Check, Calendar } from"lucide-react";

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
  preselectedSectionId?: string;
  preselectedTeacherId?: string;
  preselectedDay?: DayOfWeek;
  preselectedTimeSlotId?: string;
  onSlotScheduled: (newEntry: ScheduleEntry) => void;
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
  preselectedSectionId,
  preselectedTeacherId,
  preselectedDay ="Monday",
  preselectedTimeSlotId,
  onSlotScheduled,
}) => {
  const [assignmentMode, setAssignmentMode] = useState<"load" | "guest">("load");
  const [selectedLoadId, setSelectedLoadId] = useState<string>("");
  const [guestSectionId, setGuestSectionId] = useState<string>(preselectedSectionId || "");
  const [guestSubjectId, setGuestSubjectId] = useState<string>("");
  const [guestInstructorName, setGuestInstructorName] = useState<string>("");
  const [dayOfWeek, setDayOfWeek] = useState<DayOfWeek>(preselectedDay);
  const [timeSlotId, setTimeSlotId] = useState<string>(preselectedTimeSlotId ||"");
  const [roomId, setRoomId] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const allowGuestMode = !preselectedTeacherId && subjects.length > 0 && sections.length > 0;

  // Filter loads based on preselected section or teacher if provided
  const filteredLoads = useMemo(() => {
    return loads.filter((load) => {
      if (preselectedSectionId && load.section_id !== preselectedSectionId) return false;
      if (preselectedTeacherId && load.teacher_id !== preselectedTeacherId) return false;
      return true;
    });
  }, [loads, preselectedSectionId, preselectedTeacherId]);

  // Selected load object
  const activeLoad = useMemo(() => {
    return loads.find((l) => l.id === selectedLoadId) || null;
  }, [loads, selectedLoadId]);

  const activeGuestSection = useMemo(() => {
    return sections.find((s) => s.id === guestSectionId) || null;
  }, [sections, guestSectionId]);

  const targetSection =
    assignmentMode === "guest" ? activeGuestSection : activeLoad?.section || null;

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

  // Set default load/guest values and slot when opened
  React.useEffect(() => {
    if (isOpen) {
      setAssignmentMode("load");
      if (filteredLoads.length > 0 && filteredLoads[0] && !selectedLoadId) {
        setSelectedLoadId(filteredLoads[0].id);
      }
      if (preselectedSectionId) {
        setGuestSectionId(preselectedSectionId);
      } else if (sections.length > 0 && sections[0] && !guestSectionId) {
        setGuestSectionId(sections[0].id);
      }
      if (subjects.length > 0 && subjects[0] && !guestSubjectId) {
        setGuestSubjectId(subjects[0].id);
      }
      if (preselectedTimeSlotId) {
        setTimeSlotId(preselectedTimeSlotId);
      } else if (academicSlots.length > 0 && academicSlots[0] && !timeSlotId) {
        setTimeSlotId(academicSlots[0].id);
      }
      if (preselectedDay) {
        setDayOfWeek(preselectedDay);
      }
      setErrorMessage(null);
    }
  }, [
    isOpen,
    filteredLoads,
    academicSlots,
    preselectedSectionId,
    preselectedTimeSlotId,
    preselectedDay,
    selectedLoadId,
    guestSectionId,
    guestSubjectId,
    sections,
    subjects,
    timeSlotId,
  ]);

  // Real-time constraint conflict evaluation
  const activeConflicts = useMemo(() => {
    if (!timeSlotId) return [];

    if (assignmentMode === "guest") {
      if (!activeGuestSection || !guestInstructorName.trim()) return [];
      return detectScheduleConflicts(
        {
          term_id: termId,
          day_of_week: dayOfWeek,
          time_slot_id: timeSlotId,
          teacher_id: null,
          guest_instructor_name: guestInstructorName.trim(),
          section_id: activeGuestSection.id,
          room_id: roomId || activeGuestSection.room_id || null,
        },
        existingEntries,
        { timeSlots, timeSlotOverrides, sections }
      );
    }

    if (!activeLoad) return [];

    return detectScheduleConflicts(
      {
        term_id: termId,
        day_of_week: dayOfWeek,
        time_slot_id: timeSlotId,
        teacher_id: activeLoad.teacher_id,
        section_id: activeLoad.section_id,
        room_id: roomId || activeLoad.section?.room_id || null,
      },
      existingEntries,
      { timeSlots, timeSlotOverrides, sections }
    );
  }, [
    assignmentMode,
    activeLoad,
    activeGuestSection,
    guestInstructorName,
    timeSlotId,
    dayOfWeek,
    roomId,
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

    if (activeConflicts.length > 0) {
      setErrorMessage("Cannot save schedule: hard collision detected. Please adjust slot or room.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
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
              room_id: roomId || activeGuestSection.room_id || null,
              day_of_week: dayOfWeek,
            }
          : {
              term_id: termId,
              load_id: activeLoad!.id,
              teacher_id: activeLoad!.teacher_id,
              section_id: activeLoad!.section_id,
              subject_id: activeLoad!.subject_id,
              time_slot_id: timeSlotId,
              room_id: roomId || activeLoad!.section?.room_id || null,
              day_of_week: dayOfWeek,
            };

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
      const msg = err instanceof Error ? err.message :"Error creating schedule entry.";
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
                Schedule Class Period
              </h2>
              <p className="text-xs text-sand-600">
                Allocate a teacher subject load into an academic time slot.
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
                Plotted weekly total: <strong>{activeLoadStats.plottedMinutes} mins</strong> ({activeLoadStats.slotCount}{" "}
                {activeLoadStats.slotCount === 1 ? "slot" : "slots"}) → after adding{" "}
                <strong>+{selectedSlot.duration_minutes}m</strong>:{" "}
                <strong>{activeLoadStats.plottedMinutes + selectedSlot.duration_minutes} mins/wk</strong>
              </div>
            )}
          </div>
          )}

          {/* 2. Day of the Week */}
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

            {/* 3. Time Slot */}
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

          {/* 4. Classroom / Laboratory */}
          <div>
            <label
              htmlFor="room-select"
              className="block text-xs font-semibold text-cyprus-900 mb-1"
            >
              Room / Laboratory Allocation (Optional)
            </label>
            <select
              id="room-select"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              className="w-full py-2 px-3 rounded-xl border border-sand-300 bg-white text-xs sm:text-sm text-cyprus-900 focus-visible:ring-2 focus-visible:ring-crimson-600"
            >
              <option value="">Default Section Homeroom ({targetSection?.room?.room_name ||"Unassigned"})</option>
              {rooms.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.room_number}: {r.room_name} ({r.room_type})
                </option>
              ))}
            </select>
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
                (assignmentMode === "load"
                  ? !activeLoad
                  : !activeGuestSection || !guestSubjectId || !guestInstructorName.trim())
              }
              className="px-5 py-2 text-xs font-semibold rounded-xl bg-crimson-600 hover:bg-crimson-700 text-white shadow-xs focus-visible:ring-2 focus-visible:ring-crimson-500 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>{isSubmitting ?"Verifying & Saving..." :"Confirm Schedule Slot"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
