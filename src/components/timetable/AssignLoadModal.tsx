import React, { useState, useMemo } from "react";
import type {
  Subject,
  Section,
  Profile,
  Room,
  TeacherSubjectLoad,
  ScheduleEntry,
  TimeSlot,
  TimeSlotOverride,
} from "../../types";
import {
  createTeacherLoad,
  updateTeacherLoad,
  findOrCreateRoomByNumber,
} from "../../services/timetableService";
import { BookOpen, X, Check, Edit2 } from "lucide-react";

interface AssignLoadModalProps {
  isOpen: boolean;
  onClose: () => void;
  termId: string;
  teachers: Profile[];
  subjects: Subject[];
  sections: Section[];
  rooms: Room[];
  existingEntries?: ScheduleEntry[];
  timeSlots?: TimeSlot[];
  timeSlotOverrides?: TimeSlotOverride[];
  preselectedTeacherId?: string;
  editingLoad?: TeacherSubjectLoad | null;
  onLoadCreated: (newLoad: TeacherSubjectLoad) => void;
  onLoadUpdated?: (
    updatedLoad: TeacherSubjectLoad,
    updatedEntries?: ScheduleEntry[]
  ) => void;
  onRoomCreated?: (newRoom: Room) => void;
}

function inferDefaultSessionMinutes(gradeLevel: number, weeklyMinutes: number): number {
  if (gradeLevel >= 11) return 60;
  if (weeklyMinutes > 0 && weeklyMinutes % 60 === 0) return 60;
  if (weeklyMinutes > 0 && weeklyMinutes % 50 === 0) return 50;
  return 50;
}

export const AssignLoadModal: React.FC<AssignLoadModalProps> = ({
  isOpen,
  onClose,
  termId,
  teachers,
  subjects,
  sections,
  rooms,
  existingEntries = [],
  timeSlots = [],
  timeSlotOverrides = [],
  preselectedTeacherId,
  editingLoad = null,
  onLoadCreated,
  onLoadUpdated,
  onRoomCreated,
}) => {
  const isEditing = Boolean(editingLoad);

  const [teacherId, setTeacherId] = useState<string>("");
  const [subjectId, setSubjectId] = useState<string>("");
  const [sectionId, setSectionId] = useState<string>("");
  const [roomId, setRoomId] = useState<string>("");
  const [isCustomRoom, setIsCustomRoom] = useState<boolean>(false);
  const [customRoomNumber, setCustomRoomNumber] = useState<string>("");
  const [hasManualRoomEdit, setHasManualRoomEdit] = useState<boolean>(false);
  const [teachingMinutes, setTeachingMinutes] = useState<number>(240);
  const [sessionMinutes, setSessionMinutes] = useState<number>(60);
  const [hasManualSessionEdit, setHasManualSessionEdit] = useState<boolean>(false);
  const [ancillaryMinutes, setAncillaryMinutes] = useState<number>(0);
  const [ancillaryDescription, setAncillaryDescription] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const selectedSection = useMemo(() => {
    return sections.find((s) => s.id === sectionId) || null;
  }, [sections, sectionId]);

  const defaultSectionRoom = useMemo(() => {
    if (!selectedSection?.room_id) return selectedSection?.room || null;
    return rooms.find((r) => r.id === selectedSection.room_id) || selectedSection.room || null;
  }, [selectedSection, rooms]);

  const matchedCustomRoom = useMemo(() => {
    const cleaned = customRoomNumber.trim().toUpperCase();
    if (!cleaned) return null;
    return rooms.find((r) => r.room_number.trim().toUpperCase() === cleaned) || null;
  }, [customRoomNumber, rooms]);

  const linkedPlotCount = useMemo(() => {
    if (!editingLoad) return 0;
    return existingEntries.filter((e) => e.load_id === editingLoad.id).length;
  }, [editingLoad, existingEntries]);

  const selectableSubjects = useMemo(() => {
    if (!editingLoad?.subject || subjects.some((s) => s.id === editingLoad.subject_id)) {
      return subjects;
    }
    return [editingLoad.subject, ...subjects];
  }, [subjects, editingLoad]);

  React.useEffect(() => {
    if (!isOpen) return;

    setErrorMessage(null);
    setIsCustomRoom(false);
    setCustomRoomNumber("");

    if (editingLoad) {
      setTeacherId(editingLoad.teacher_id);
      setSubjectId(editingLoad.subject_id);
      setSectionId(editingLoad.section_id);
      setTeachingMinutes(
        editingLoad.target_minutes_weekly || editingLoad.teaching_minutes_weekly || 240
      );
      const initialSecGrade =
        sections.find((s) => s.id === editingLoad.section_id)?.grade_level ??
        editingLoad.section?.grade_level ??
        11;
      const defaultDuration = initialSecGrade <= 10 ? 50 : 60;
      setSessionMinutes(editingLoad.session_minutes || defaultDuration);
      setHasManualSessionEdit(Boolean(editingLoad.session_minutes && editingLoad.session_minutes !== defaultDuration));
      setAncillaryMinutes(editingLoad.ancillary_minutes_weekly || 0);
      setAncillaryDescription(editingLoad.ancillary_description || "");

      const entrySec =
        sections.find((s) => s.id === editingLoad.section_id) || editingLoad.section || null;
      const linkedEntryRoomId =
        existingEntries.find((e) => e.load_id === editingLoad.id && e.room_id)?.room_id || "";
      const initialRoomId =
        editingLoad.room_id || linkedEntryRoomId || entrySec?.room_id || "";
      setRoomId(initialRoomId);
      setHasManualRoomEdit(
        Boolean(initialRoomId && initialRoomId !== (entrySec?.room_id || ""))
      );
    } else {
      const defaultTeacher = preselectedTeacherId || teachers[0]?.id || "";
      const defaultSubject = subjects[0];
      const defaultSecObj = sections[0] || null;
      setTeacherId(defaultTeacher);
      setSubjectId(defaultSubject?.id || "");
      setSectionId(defaultSecObj?.id || "");
      setRoomId(defaultSecObj?.room_id || "");
      setHasManualRoomEdit(false);
      setTeachingMinutes(defaultSubject?.minutes_per_week || 240);
      const defaultGrade = defaultSecObj?.grade_level ?? defaultSubject?.grade_level ?? 11;
      setSessionMinutes(
        inferDefaultSessionMinutes(defaultGrade, defaultSubject?.minutes_per_week || 240)
      );
      setHasManualSessionEdit(false);
      setAncillaryMinutes(0);
      setAncillaryDescription("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, editingLoad, preselectedTeacherId]);

  // Keep room synced to the chosen section's default room unless admin explicitly selects/types another room
  React.useEffect(() => {
    if (!isOpen || hasManualRoomEdit || isCustomRoom) return;
    setRoomId(selectedSection?.room_id || "");
  }, [isOpen, hasManualRoomEdit, isCustomRoom, selectedSection?.id, selectedSection?.room_id]);

  // Keep session duration synced to grade & subject weekly target (50m/60m JHS, 60m SHS) unless manually edited
  React.useEffect(() => {
    if (!isOpen || hasManualSessionEdit || !selectedSection) return;
    setSessionMinutes(inferDefaultSessionMinutes(selectedSection.grade_level, teachingMinutes));
  }, [isOpen, hasManualSessionEdit, selectedSection, teachingMinutes]);

  if (!isOpen) return null;

  const handleSubjectChange = (newSubjectId: string) => {
    setSubjectId(newSubjectId);
    const subj = subjects.find((s) => s.id === newSubjectId);
    if (subj?.minutes_per_week && (!isEditing || linkedPlotCount === 0)) {
      setTeachingMinutes(subj.minutes_per_week);
      if (!hasManualSessionEdit) {
        const grade = selectedSection?.grade_level ?? subj.grade_level ?? 11;
        setSessionMinutes(inferDefaultSessionMinutes(grade, subj.minutes_per_week));
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teacherId || !subjectId || !sectionId) {
      setErrorMessage("Please select teacher, subject, and section.");
      return;
    }

    if (isCustomRoom && !customRoomNumber.trim()) {
      setErrorMessage("Please enter a room number or switch back to the room list.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      let finalRoomId: string | null = roomId || selectedSection?.room_id || null;
      let resolvedRoomObj: Room | undefined =
        rooms.find((r) => r.id === finalRoomId) || selectedSection?.room;

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
        resolvedRoomObj = roomLookup.room;
      }

      if (isEditing && editingLoad) {
        const res = await updateTeacherLoad(
          editingLoad.id,
          {
            teacher_id: teacherId,
            subject_id: subjectId,
            section_id: sectionId,
            room_id: finalRoomId,
            session_minutes: Number(sessionMinutes) || (selectedSection && selectedSection.grade_level <= 10 ? 50 : 60),
            teaching_minutes_weekly: Number(teachingMinutes) || 240,
            ancillary_minutes_weekly: Number(ancillaryMinutes) || 0,
            ancillary_description: ancillaryDescription.trim() || null,
          },
          {
            existingEntries,
            timeSlots,
            timeSlotOverrides,
            sections,
          }
        );

        if (!res.data) {
          setErrorMessage(res.error || "Failed to update subject load.");
          return;
        }

        onLoadUpdated?.(
          {
            ...res.data,
            room_id: finalRoomId,
            room: resolvedRoomObj,
          },
          res.updatedEntries
        );
        onClose();
      } else {
        const res = await createTeacherLoad({
          term_id: termId,
          teacher_id: teacherId,
          subject_id: subjectId,
          section_id: sectionId,
          room_id: finalRoomId,
          session_minutes: Number(sessionMinutes) || (selectedSection && selectedSection.grade_level <= 10 ? 50 : 60),
          teaching_minutes_weekly: Number(teachingMinutes) || 240,
          ancillary_minutes_weekly: Number(ancillaryMinutes) || 0,
          ancillary_description: ancillaryDescription.trim() || undefined,
        });

        if (!res.data) {
          setErrorMessage(
            res.error ||
              "Failed to assign load. This teacher may already be assigned to this subject and section in this term."
          );
          return;
        }

        onLoadCreated({
          ...res.data,
          room_id: finalRoomId,
          room: resolvedRoomObj,
        });
        onClose();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error saving load assignment.";
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
        aria-labelledby="assign-load-title"
        className="relative bg-white w-full max-w-lg rounded-2xl border border-sand-200 shadow-2xl p-6 overflow-hidden space-y-5 transition-colors z-10"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-sand-200 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-cyprus-100 text-cyprus-900 flex items-center justify-center font-bold">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2
                id="assign-load-title"
                className="text-base font-bold text-cyprus-900 font-display"
              >
                {isEditing ? "Edit Term Subject Load" : "Assign Faculty Subject Load"}
              </h2>
              <p className="text-xs text-sand-600">
                {isEditing
                  ? "Edit faculty member, subject, section, room, or weekly load for this term."
                  : "Set per-term faculty load, room, and weekly minutes without changing other terms."}
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

        {errorMessage && (
          <div
            role="alert"
            className="p-3 bg-crimson-50 border border-crimson-200 text-crimson-700 text-xs rounded-lg"
          >
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Teacher */}
          <div>
            <label
              htmlFor="teacher-load-select"
              className="block text-xs font-semibold text-cyprus-900 mb-1"
            >
              Faculty Member
            </label>
            <select
              id="teacher-load-select"
              value={teacherId}
              onChange={(e) => setTeacherId(e.target.value)}
              required
              className="w-full py-2 px-3 rounded-xl border border-sand-300 bg-white text-xs sm:text-sm text-cyprus-900 focus-visible:ring-2 focus-visible:ring-[#0F3D2E]"
            >
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.full_name}
                </option>
              ))}
            </select>
          </div>

          {/* Subject & Section */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="subject-load-select"
                className="block text-xs font-semibold text-cyprus-900 mb-1"
              >
                Subject
              </label>
              <select
                id="subject-load-select"
                value={subjectId}
                onChange={(e) => handleSubjectChange(e.target.value)}
                required
                className="w-full py-2 px-3 rounded-xl border border-sand-300 bg-white text-xs sm:text-sm text-cyprus-900 focus-visible:ring-2 focus-visible:ring-[#0F3D2E]"
              >
                {selectableSubjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    G{s.grade_level} • {s.subject_code} - {s.subject_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="section-load-select"
                className="block text-xs font-semibold text-cyprus-900 mb-1"
              >
                Class Section
              </label>
              <select
                id="section-load-select"
                value={sectionId}
                onChange={(e) => setSectionId(e.target.value)}
                required
                className="w-full py-2 px-3 rounded-xl border border-sand-300 bg-white text-xs sm:text-sm text-cyprus-900 focus-visible:ring-2 focus-visible:ring-[#0F3D2E]"
              >
                {sections.map((sec) => (
                  <option key={sec.id} value={sec.id}>
                    Grade {sec.grade_level} - {sec.section_name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Room Number / Laboratory (Defaults to Class Section Room) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <label
                htmlFor={isCustomRoom ? "load-custom-room-input" : "load-room-select"}
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
              <div className="space-y-1">
                <input
                  id="load-custom-room-input"
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
                  id="load-room-select"
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
                  className="w-full py-2 px-3 rounded-xl border border-sand-300 bg-white text-xs sm:text-sm text-cyprus-900 focus-visible:ring-2 focus-visible:ring-[#0F3D2E]"
                >
                  {defaultSectionRoom ? (
                    <option value={defaultSectionRoom.id}>
                      {defaultSectionRoom.room_number}: {defaultSectionRoom.room_name} (Section Default)
                    </option>
                  ) : (
                    <option value="">Class Section Homeroom (Unassigned)</option>
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
                    Defaults to section room <strong>{defaultSectionRoom.room_number}</strong>. Change room if needed.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Teaching Minutes, Session Minutes, & Ancillary Minutes */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label
                htmlFor="teaching-minutes"
                className="block text-xs font-semibold text-cyprus-900 mb-1"
              >
                Weekly Teaching Minutes
              </label>
              <input
                id="teaching-minutes"
                type="number"
                min="30"
                max="1800"
                step="10"
                value={teachingMinutes}
                onChange={(e) => setTeachingMinutes(Number(e.target.value))}
                required
                className="w-full py-2 px-3 rounded-xl border border-sand-300 bg-white text-xs sm:text-sm text-cyprus-900 focus-visible:ring-2 focus-visible:ring-[#0F3D2E]"
              />
              <span className="text-[10px] text-sand-500">
                {(teachingMinutes / 60).toFixed(1)} hrs/wk total
              </span>
            </div>

            <div>
              <label
                htmlFor="session-minutes"
                className="block text-xs font-semibold text-cyprus-900 mb-1"
              >
                Minutes per Session
              </label>
              <input
                id="session-minutes"
                type="number"
                min="10"
                max="240"
                step="5"
                value={sessionMinutes}
                onChange={(e) => {
                  setSessionMinutes(Number(e.target.value));
                  setHasManualSessionEdit(true);
                }}
                required
                className="w-full py-2 px-3 rounded-xl border border-sand-300 bg-white text-xs sm:text-sm text-cyprus-900 focus-visible:ring-2 focus-visible:ring-[#0F3D2E]"
              />
              <span className="text-[10px] text-sand-500">
                {sessionMinutes > 0
                  ? `~${(teachingMinutes / sessionMinutes).toFixed(1)} sessions/wk (default ${selectedSection && selectedSection.grade_level <= 10 ? "50m" : "60m"})`
                  : "Session duration"}
              </span>
            </div>

            <div>
              <label
                htmlFor="ancillary-minutes"
                className="block text-xs font-semibold text-cyprus-900 mb-1"
              >
                Ancillary Load Minutes
              </label>
              <input
                id="ancillary-minutes"
                type="number"
                min="0"
                max="600"
                step="30"
                value={ancillaryMinutes}
                onChange={(e) => setAncillaryMinutes(Number(e.target.value))}
                className="w-full py-2 px-3 rounded-xl border border-sand-300 bg-white text-xs sm:text-sm text-cyprus-900 focus-visible:ring-2 focus-visible:ring-[#0F3D2E]"
              />
              <span className="text-[10px] text-sand-500">Advisory / coordinatorship</span>
            </div>
          </div>

          {/* Ancillary Description */}
          <div>
            <label
              htmlFor="ancillary-desc"
              className="block text-xs font-semibold text-cyprus-900 mb-1"
            >
              Ancillary Duty / Designation (Optional)
            </label>
            <input
              id="ancillary-desc"
              type="text"
              value={ancillaryDescription}
              onChange={(e) => setAncillaryDescription(e.target.value)}
              placeholder="e.g., Class Adviser, ICT Coordinator, Science Lab Custodian"
              className="w-full py-2 px-3 rounded-xl border border-sand-300 bg-white text-xs sm:text-sm text-cyprus-900 focus-visible:ring-2 focus-visible:ring-[#0F3D2E]"
            />
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
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-semibold rounded-xl bg-[#0F3D2E] hover:bg-[#0A2E22] text-white shadow-xs focus-visible:ring-2 focus-visible:ring-[#0F3D2E] cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>
                {isSubmitting
                  ? "Saving..."
                  : isEditing
                    ? "Save Load Changes"
                    : "Confirm Load Assignment"}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
