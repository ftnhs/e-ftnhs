import React, { useState, useMemo, useRef } from "react";
import type {
  TimeSlot,
  TimeSlotOverride,
  Section,
  Profile,
  ScheduleEntry,
  DayOfWeek,
  Room,
  AcademicTerm,
  SchoolSettings,
  ScheduleConflict,
} from "../../types";
import {
  deleteScheduleEntry,
  moveScheduleEntry,
  swapScheduleEntries,
  detectScheduleConflicts,
  resolveTimeSlotForSection,
  resolveScheduleEntryTime,
  getVisibleSlotsForSection,
} from "../../services/timetableService";
import {
  ScheduleSignatories,
  resolveCoordinatorLevelForTeacher,
} from "./ScheduleSignatories";
import {
  Calendar,
  Layers,
  User,
  PlusCircle,
  Trash2,
  Building,
  Flag,
  Coffee,
  Utensils,
  Edit2,
  Sparkles,
  Lock,
  Unlock,
  AlertTriangle,
  GripVertical,
  X,
} from "lucide-react";

interface TimetableGridProps {
  timeSlots: TimeSlot[];
  timeSlotOverrides?: TimeSlotOverride[];
  sections: Section[];
  teachers: Profile[];
  rooms: Room[];
  scheduleEntries: ScheduleEntry[];
  activeTerm?: AcademicTerm | null;
  schoolSettings?: SchoolSettings | null;
  isPrivileged: boolean;
  isGridLocked?: boolean;
  isTogglingLock?: boolean;
  onOpenAssignSlot: (prefill?: {
    sectionId?: string;
    teacherId?: string;
    day?: DayOfWeek;
    timeSlotId?: string;
    startTime?: string;
    endTime?: string;
  }) => void;
  onEditSlot?: (entry: ScheduleEntry) => void;
  onEntryDeleted: (entryId: string) => void;
  onOpenAutoPopulate?: () => void;
  onOpenClearGrid?: (activeSectionId?: string) => void;
  onToggleGridLock?: (nextLocked: boolean) => void;
  onEntriesChanged?: (updatedEntries: ScheduleEntry[]) => void;
}

const DAYS: DayOfWeek[] = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

export const TimetableGrid: React.FC<TimetableGridProps> = ({
  timeSlots,
  timeSlotOverrides = [],
  sections,
  teachers,
  rooms: _rooms,
  scheduleEntries,
  activeTerm,
  schoolSettings = null,
  isPrivileged,
  isGridLocked = false,
  isTogglingLock = false,
  onOpenAssignSlot,
  onEditSlot,
  onEntryDeleted,
  onOpenAutoPopulate,
  onOpenClearGrid,
  onToggleGridLock,
  onEntriesChanged,
}) => {
  const [viewMode, setViewMode] = useState<"section" | "teacher" | "master">("section");
  const [selectedSectionId, setSelectedSectionId] = useState<string>(
    sections[0]?.id || ""
  );
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>(
    teachers[0]?.id || ""
  );
  const [isUnlockConfirmOpen, setIsUnlockConfirmOpen] = useState<boolean>(false);
  const [draggedEntry, setDraggedEntry] = useState<ScheduleEntry | null>(null);
  const draggedEntryRef = useRef<ScheduleEntry | null>(null);
  const [dropCellTarget, setDropCellTarget] = useState<{ day: DayOfWeek; slotId: string } | null>(
    null
  );
  const [dropCardTargetId, setDropCardTargetId] = useState<string | null>(null);
  const [isMovingOrSwapping, setIsMovingOrSwapping] = useState<boolean>(false);
  const [dragErrorMsg, setDragErrorMsg] = useState<string | null>(null);

  const canDragDrop =
    isPrivileged && !isGridLocked && (viewMode === "section" || viewMode === "teacher");

  // Set default or reset selection when term/sections change
  React.useEffect(() => {
    if (sections.length > 0 && sections[0] && !sections.some((s) => s.id === selectedSectionId)) {
      setSelectedSectionId(sections[0].id);
    }
    if (teachers.length > 0 && teachers[0] && !teachers.some((t) => t.id === selectedTeacherId)) {
      setSelectedTeacherId(teachers[0].id);
    }
  }, [sections, teachers, selectedSectionId, selectedTeacherId]);

  const activeSection = useMemo(() => {
    return sections.find((s) => s.id === selectedSectionId) || null;
  }, [sections, selectedSectionId]);

  const activeTeacher = useMemo(() => {
    return teachers.find((t) => t.id === selectedTeacherId) || null;
  }, [teachers, selectedTeacherId]);

  // Filter entries according to active view mode
  const displayedEntries = useMemo(() => {
    if (viewMode === "section") {
      return scheduleEntries.filter((e) => e.section_id === selectedSectionId);
    }
    if (viewMode === "teacher") {
      return scheduleEntries.filter((e) => e.teacher_id === selectedTeacherId);
    }
    return scheduleEntries;
  }, [scheduleEntries, viewMode, selectedSectionId, selectedTeacherId]);

  // Detect active conflicts per entry so dragged/swapped conflicts render in red with warnings
  const conflictsByEntryId = useMemo(() => {
    const map = new Map<string, ScheduleConflict[]>();
    const opts = { timeSlots, timeSlotOverrides, sections };
    for (const entry of scheduleEntries) {
      const conflicts = detectScheduleConflicts(entry, scheduleEntries, opts);
      if (conflicts.length > 0) {
        map.set(entry.id, conflicts);
      }
    }
    return map;
  }, [scheduleEntries, timeSlots, timeSlotOverrides, sections]);

  const activeViewConflicts = useMemo(() => {
    const seen = new Set<string>();
    const messages: string[] = [];
    for (const entry of displayedEntries) {
      const list = conflictsByEntryId.get(entry.id);
      if (!list) continue;
      for (const c of list) {
        if (!seen.has(c.message)) {
          seen.add(c.message);
          messages.push(c.message);
        }
      }
    }
    return messages;
  }, [displayedEntries, conflictsByEntryId]);

  const resolvedGridSlots = useMemo(() => {
    if (viewMode === "section") {
      return getVisibleSlotsForSection(
        timeSlots,
        timeSlotOverrides,
        activeSection,
        displayedEntries
      );
    }
    if (viewMode === "teacher") {
      return timeSlots.filter(
        (slot) =>
          slot.slot_number !== 11 ||
          displayedEntries.some((e) => e.time_slot_id === slot.id)
      );
    }
    return timeSlots;
  }, [viewMode, timeSlots, timeSlotOverrides, activeSection, displayedEntries]);

  const handleDeleteEntry = async (entryId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to remove this class schedule entry?")) {
      return;
    }
    const ok = await deleteScheduleEntry(entryId);
    if (ok) {
      onEntryDeleted(entryId);
    }
  };

  const resetDragState = () => {
    draggedEntryRef.current = null;
    setDraggedEntry(null);
    setDropCellTarget(null);
    setDropCardTargetId(null);
  };

  const handleDropOnEmptyCell = async (
    targetDay: DayOfWeek,
    targetSlotId: string,
    explicitStart?: string | null,
    explicitEnd?: string | null,
    fallbackEntryId?: string
  ) => {
    const source =
      draggedEntryRef.current ||
      draggedEntry ||
      (fallbackEntryId ? scheduleEntries.find((e) => e.id === fallbackEntryId) || null : null);
    if (!source || !canDragDrop || isMovingOrSwapping) return;

    resetDragState();

    if (
      source.day_of_week === targetDay &&
      source.time_slot_id === targetSlotId &&
      !explicitStart
    ) {
      return;
    }

    setIsMovingOrSwapping(true);
    setDragErrorMsg(null);
    try {
      const res = await moveScheduleEntry(source, targetDay, targetSlotId, scheduleEntries, {
        timeSlots,
        timeSlotOverrides,
        sections,
        explicitStartTime: explicitStart,
        explicitEndTime: explicitEnd,
      });

      if (!res.success || !res.data) {
        setDragErrorMsg(res.error || "Failed to move class slot.");
        return;
      }

      onEntriesChanged?.([res.data]);
    } finally {
      setIsMovingOrSwapping(false);
    }
  };

  const handleDropOnCard = async (targetEntry: ScheduleEntry, fallbackEntryId?: string) => {
    const source =
      draggedEntryRef.current ||
      draggedEntry ||
      (fallbackEntryId ? scheduleEntries.find((e) => e.id === fallbackEntryId) || null : null);
    if (!source || !canDragDrop || isMovingOrSwapping) return;

    resetDragState();

    if (source.id === targetEntry.id) return;

    setIsMovingOrSwapping(true);
    setDragErrorMsg(null);
    try {
      const res = await swapScheduleEntries(source, targetEntry, scheduleEntries, {
        timeSlots,
        timeSlotOverrides,
        sections,
      });

      if (!res.success || !res.updatedEntries) {
        setDragErrorMsg(res.error || "Failed to swap class slots.");
        return;
      }

      onEntriesChanged?.(res.updatedEntries);
    } finally {
      setIsMovingOrSwapping(false);
    }
  };

  const termSubtitle = activeTerm
    ? `SY ${activeTerm.school_year} • Term ${activeTerm.term_number}`
    : "SY 2026-2027";

  return (
    <div className="space-y-4 print:space-y-3">
      {/* Print-Only Institutional Header */}
      <div className="hidden print:block border-b-2 border-[#1C2420] pb-3 mb-2">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-wider text-[#5C6660] font-semibold">
              Republic of the Philippines • Department of Education • Region VII • Division of Bohol
            </p>
            <h2 className="text-lg font-bold text-[#1C2420] mt-0.5">
              Fermin Tayabas National High School
            </h2>
            <p className="text-xs text-[#5C6660]">
              Cabayugan, Calape, Bohol • School ID: 302851 • {termSubtitle}
            </p>
          </div>
          <div className="text-right text-xs">
            <div className="font-bold text-[#1C2420] uppercase tracking-wide">
              {viewMode === "section"
                ? `Class Schedule — Grade ${activeSection?.grade_level} - ${activeSection?.section_name}`
                : viewMode === "teacher"
                  ? `Teacher Schedule — ${activeTeacher?.full_name}`
                  : "Master School Schedule"}
            </div>
            {viewMode === "section" && (
              <div className="text-[#5C6660] mt-0.5">
                Adviser: {activeSection?.adviser?.full_name || "Unassigned"} • Room:{" "}
                {activeSection?.room?.room_name || activeSection?.room?.room_number || "TBD"}
              </div>
            )}
            {viewMode === "teacher" && (
              <div className="text-[#5C6660] mt-0.5">
                {activeTeacher?.designation || "Teacher"} • {activeTeacher?.department || "Faculty"}
              </div>
            )}
            <div className="text-[11px] text-[#5C6660] mt-0.5">
              Printed {new Date().toLocaleDateString()}
            </div>
          </div>
        </div>
      </div>

      {/* 1. Header Toolbar & Filters */}
      <div className="print:hidden bg-[#FFFFFF] p-4 rounded-xl border border-[#E3DDD1] flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        {/* View Mode Toggle */}
        <div className="flex items-center gap-1 p-1 bg-[#FAF8F5] border border-[#E3DDD1] rounded-lg w-fit">
          <button
            type="button"
            onClick={() => setViewMode("section")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
              viewMode === "section"
                ? "bg-[#0F3D2E] text-[#FFFFFF]"
                : "text-[#5C6660] hover:text-[#1C2420]"
            }`}
          >
            <Layers className="w-3.5 h-3.5 shrink-0" />
            <span>By Section</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode("teacher")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
              viewMode === "teacher"
                ? "bg-[#0F3D2E] text-[#FFFFFF]"
                : "text-[#5C6660] hover:text-[#1C2420]"
            }`}
          >
            <User className="w-3.5 h-3.5 shrink-0" />
            <span>By Teacher</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode("master")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
              viewMode === "master"
                ? "bg-[#0F3D2E] text-[#FFFFFF]"
                : "text-[#5C6660] hover:text-[#1C2420]"
            }`}
          >
            <Calendar className="w-3.5 h-3.5 shrink-0" />
            <span>Master Grid</span>
          </button>
        </div>

        {/* Dynamic Selector Dropdown & Print Button */}
        <div className="flex items-center justify-between lg:justify-end gap-2.5 overflow-x-auto no-scrollbar">
          {viewMode === "section" && (
            <div className="flex items-center gap-2 shrink-0">
              <label htmlFor="grid-section-select" className="text-xs font-semibold text-[#5C6660] whitespace-nowrap">
                Section:
              </label>
              <select
                id="grid-section-select"
                value={selectedSectionId}
                onChange={(e) => setSelectedSectionId(e.target.value)}
                className="py-1.5 px-3 rounded-lg border border-[#E3DDD1] bg-[#FAF8F5] text-xs font-medium text-[#1C2420] cursor-pointer max-w-[230px]"
              >
                {sections.map((sec) => (
                  <option key={sec.id} value={sec.id}>
                    Grade {sec.grade_level} - {sec.section_name} ({sec.room?.room_name || "Room TBD"})
                  </option>
                ))}
              </select>
            </div>
          )}

          {viewMode === "teacher" && (
            <div className="flex items-center gap-2 shrink-0">
              <label htmlFor="grid-teacher-select" className="text-xs font-semibold text-[#5C6660] whitespace-nowrap">
                Teacher:
              </label>
              <select
                id="grid-teacher-select"
                value={selectedTeacherId}
                onChange={(e) => setSelectedTeacherId(e.target.value)}
                className="py-1.5 px-3 rounded-lg border border-[#E3DDD1] bg-[#FAF8F5] text-xs font-medium text-[#1C2420] cursor-pointer max-w-[230px]"
              >
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.full_name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {isPrivileged && (
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                disabled={isTogglingLock}
                onClick={() => {
                  if (isGridLocked) {
                    setIsUnlockConfirmOpen(true);
                  } else {
                    onToggleGridLock?.(true);
                  }
                }}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer shrink-0 disabled:opacity-50 ${
                  isGridLocked
                    ? "border-[#F59E0B] bg-[#FEF3C7] text-[#92400E] hover:bg-[#FDE68A]"
                    : "border-[#E3DDD1] bg-[#FAF8F5] text-[#404B45] hover:border-[#0F3D2E] hover:text-[#0F3D2E]"
                }`}
                title={
                  isGridLocked
                    ? "Grid is locked. Click to unlock."
                    : "Lock grid to prevent accidental re-population, clearing, or edits"
                }
              >
                {isGridLocked ? (
                  <>
                    <Lock className="w-3.5 h-3.5 shrink-0" />
                    <span>Grid Locked</span>
                  </>
                ) : (
                  <>
                    <Unlock className="w-3.5 h-3.5 shrink-0" />
                    <span>Lock Grid</span>
                  </>
                )}
              </button>

              {scheduleEntries.length > 0 && (
                <button
                  type="button"
                  disabled={isGridLocked}
                  onClick={() => onOpenClearGrid?.(viewMode === "section" ? selectedSectionId : undefined)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#F3B8C2] bg-[#FBECEF] hover:bg-[#9E1B32] text-[#9E1B32] hover:text-[#FFFFFF] text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer shrink-0 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-[#FBECEF] disabled:hover:text-[#9E1B32]"
                  title={
                    isGridLocked
                      ? "Unlock the schedule grid first to clear slots"
                      : "Clear plotted slots from the schedule grid"
                  }
                >
                  <Trash2 className="w-3.5 h-3.5 shrink-0" />
                  <span>Clear Grid</span>
                </button>
              )}

              <button
                type="button"
                disabled={isGridLocked}
                onClick={onOpenAutoPopulate}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-[#0F3D2E] bg-[#E6EFEA] hover:bg-[#0F3D2E] text-[#0F3D2E] hover:text-[#FFFFFF] text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer shrink-0 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-[#E6EFEA] disabled:hover:text-[#0F3D2E]"
                title={
                  isGridLocked
                    ? "Unlock the schedule grid first to populate"
                    : "Automatically populate the schedule grid from faculty loads"
                }
              >
                <Sparkles className="w-3.5 h-3.5 shrink-0" />
                <span>Populate Grid</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Grid Lock Status Banner */}
      {isGridLocked && (
        <div className="print:hidden flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 rounded-xl border border-[#F59E0B]/40 bg-[#FEF3C7]/70 text-xs text-[#92400E]">
          <div className="flex items-center gap-2 font-medium">
            <Lock className="w-4 h-4 shrink-0 text-[#B45309]" />
            <span>
              <strong>Schedule Grid Locked ({termSubtitle}):</strong> Populating, clearing, and
              slot modifications are disabled to protect finalized schedules.
            </span>
          </div>
          {isPrivileged && (
            <button
              type="button"
              disabled={isTogglingLock}
              onClick={() => setIsUnlockConfirmOpen(true)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-[#F59E0B] text-[#92400E] hover:bg-[#FEF3C7] text-[11px] font-semibold cursor-pointer shrink-0 disabled:opacity-50"
            >
              <Unlock className="w-3 h-3" />
              <span>Unlock Grid</span>
            </button>
          )}
        </div>
      )}

      {/* Drag-and-Drop Error Alert */}
      {dragErrorMsg && (
        <div
          role="alert"
          className="print:hidden flex items-start justify-between gap-3 px-4 py-2.5 rounded-xl border border-[#F3B8C2] bg-[#FBECEF] text-xs text-[#9E1B32]"
        >
          <div className="flex items-start gap-2 font-medium">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Could Not Update Schedule Slot</p>
              <p className="whitespace-pre-line mt-0.5">{dragErrorMsg}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setDragErrorMsg(null)}
            className="p-1 text-[#9E1B32]/70 hover:text-[#9E1B32] rounded cursor-pointer shrink-0"
            aria-label="Dismiss alert"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Real-Time Schedule Conflict Warning Banner */}
      {(activeViewConflicts.length > 0 || conflictsByEntryId.size > 0) && (
        <div
          role="alert"
          className="print:hidden flex flex-col sm:flex-row sm:items-start justify-between gap-3 px-4 py-3 rounded-xl border border-[#F3B8C2] bg-[#FBECEF] text-xs text-[#9E1B32]"
        >
          <div className="flex items-start gap-2.5 font-medium">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-[#9E1B32]" aria-hidden="true" />
            <div>
              <p className="font-bold text-[#7F1528]">
                Schedule Conflict Warning: {conflictsByEntryId.size}{" "}
                {conflictsByEntryId.size === 1 ? "class slot has" : "class slots have"} overlapping
                conflicts
              </p>
              {activeViewConflicts.length > 0 ? (
                <ul className="mt-1 space-y-0.5 list-disc list-inside text-[#9E1B32]">
                  {activeViewConflicts.slice(0, 4).map((msg) => (
                    <li key={msg}>{msg}</li>
                  ))}
                  {activeViewConflicts.length > 4 && (
                    <li className="font-semibold">
                      +{activeViewConflicts.length - 4} more conflict warning(s) in this view
                    </li>
                  )}
                </ul>
              ) : (
                <p className="mt-0.5 text-[#9E1B32]">
                  Conflicts exist in another section or teacher view. Switch views or drag
                  highlighted red cards to resolve collisions.
                </p>
              )}
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-full bg-white border border-[#F3B8C2] text-[11px] font-bold text-[#9E1B32] shrink-0 self-start">
            Drag red cards to resolve
          </span>
        </div>
      )}

      {/* 2. Visual Context Line */}
      <div className="print:hidden flex flex-wrap items-center justify-between gap-2 px-1 text-xs text-[#5C6660]">
        <div>
          {viewMode === "section" && (
            <span>
              <strong className="text-[#1C2420]">
                Grade {activeSection?.grade_level} - {activeSection?.section_name}
              </strong>{" "}
              • Adviser: {activeSection?.adviser?.full_name || "Unassigned"}
            </span>
          )}
          {viewMode === "teacher" && (
            <span>
              <strong className="text-[#1C2420]">{activeTeacher?.full_name}</strong> •{" "}
              {activeTeacher?.department}
            </span>
          )}
          {viewMode === "master" && (
            <span>
              <strong className="text-[#1C2420]">Master School Schedule</strong>
            </span>
          )}
        </div>
        {canDragDrop && (
          <div className="flex items-center gap-1.5 text-[11px] text-[#5C6660]">
            <GripVertical className="w-3.5 h-3.5 text-[#0F3D2E]" />
            <span>
              {isMovingOrSwapping
                ? "Updating slot..."
                : "Drag any subject card to move to an empty slot or drop onto another card to swap"}
            </span>
          </div>
        )}
      </div>

      {/* 3. Schedule Grid Table */}
      <div className="bg-[#FFFFFF] rounded-xl border border-[#E3DDD1] overflow-hidden print:rounded-none print:border-slate-400">
        <div className="overflow-x-auto lg:overflow-x-visible print:overflow-visible">
          <table className="w-full table-fixed border-collapse text-left text-xs min-w-[680px] lg:min-w-0 print:min-w-0">
            <thead>
              <tr className="bg-[#FAF8F5] border-b border-[#E3DDD1] text-[#404B45] uppercase text-[11px] font-semibold tracking-wider print:bg-slate-100 print:border-slate-400">
                <th className="py-2.5 px-3 w-28 xl:w-32 border-r border-[#E3DDD1] print:border-slate-400">
                  Time
                </th>
                {DAYS.map((day) => (
                  <th
                    key={day}
                    className="py-2.5 px-2 border-r border-[#E3DDD1] last:border-r-0 text-center font-semibold print:border-slate-400"
                  >
                    {day}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E3DDD1] print:divide-slate-300">
              {resolvedGridSlots.map((slot) => {
                // Non-academic break row (Flag ceremony, Recess, Lunch)
                if (slot.slot_type !== "Academic") {
                  return (
                    <tr
                      key={slot.id}
                      className="bg-[#FAF8F5] text-center print:bg-slate-50"
                    >
                      <td className="py-2.5 px-3 border-r border-[#E3DDD1] print:border-slate-300 text-left text-xs font-medium text-[#404B45] tabular-nums whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          {slot.slot_type === "Flag Ceremony" && (
                            <Flag className="w-3.5 h-3.5 text-[#9E1B32] shrink-0 print:hidden" />
                          )}
                          {slot.slot_type === "Recess" && (
                            <Coffee className="w-3.5 h-3.5 text-[#5C6660] shrink-0 print:hidden" />
                          )}
                          {slot.slot_type === "Lunch" && (
                            <Utensils className="w-3.5 h-3.5 text-[#0F3D2E] shrink-0 print:hidden" />
                          )}
                          <span>
                            {slot.start_time.slice(0, 5)} – {slot.end_time.slice(0, 5)}
                          </span>
                        </div>
                      </td>
                      <td
                        colSpan={5}
                        className="py-2.5 px-3 text-xs font-medium text-[#5C6660] italic"
                      >
                        {slot.slot_label}
                      </td>
                    </tr>
                  );
                }

                // Academic Period Row
                return (
                  <tr key={slot.id} className="divide-x divide-[#E3DDD1] print:divide-slate-300">
                    {/* Time Slot Label Cell */}
                    <td className="py-3 px-3 align-top bg-[#FAF8F5]/60 print:bg-slate-50/50">
                      <div className="font-semibold text-xs text-[#1C2420]">
                        {slot.slot_number === 11 ? "Midday Period" : `Period ${slot.slot_number}`}
                      </div>
                      <div className="text-xs font-medium text-[#404B45] tabular-nums whitespace-nowrap mt-0.5">
                        {slot.start_time.slice(0, 5)} – {slot.end_time.slice(0, 5)}
                      </div>
                      <div className="text-[11px] text-[#5C6660] mt-0.5">
                        {slot.duration_minutes} mins
                      </div>
                    </td>

                    {/* 5 Day Cells */}
                    {DAYS.map((day) => {
                      const dayEntries = displayedEntries
                        .filter((e) => e.time_slot_id === slot.id && e.day_of_week === day)
                        .sort((a, b) => {
                          const tA = resolveScheduleEntryTime(
                            a,
                            timeSlots,
                            timeSlotOverrides,
                            sections
                          ).start_time;
                          const tB = resolveScheduleEntryTime(
                            b,
                            timeSlots,
                            timeSlotOverrides,
                            sections
                          ).start_time;
                          return tA.localeCompare(tB);
                        });

                      const resolvedDayTimes = dayEntries.map((e) =>
                        resolveScheduleEntryTime(e, timeSlots, timeSlotOverrides, sections)
                      );
                      const usedMinutesInSlot = resolvedDayTimes.reduce(
                        (sum, t) => sum + t.duration_minutes,
                        0
                      );
                      let freeGap: { start: string; end: string } | null = null;
                      if (
                        isPrivileged &&
                        viewMode === "section" &&
                        dayEntries.length > 0 &&
                        usedMinutesInSlot < slot.duration_minutes
                      ) {
                        const slotStart = slot.start_time.slice(0, 5);
                        const slotEnd = slot.end_time.slice(0, 5);
                        let cursor = slotStart;
                        for (const t of resolvedDayTimes) {
                          const s = t.start_time.slice(0, 5);
                          const e = t.end_time.slice(0, 5);
                          if (s > cursor) {
                            freeGap = { start: cursor, end: s };
                            break;
                          }
                          if (e > cursor) {
                            cursor = e;
                          }
                        }
                        if (!freeGap && cursor < slotEnd) {
                          freeGap = { start: cursor, end: slotEnd };
                        }
                      }

                      const isCellDropHighlighted =
                        Boolean(draggedEntry) &&
                        dropCellTarget?.day === day &&
                        dropCellTarget?.slotId === slot.id &&
                        dayEntries.length === 0;

                      return (
                        <td
                          key={day}
                          onDragOver={(e) => {
                            if (!canDragDrop || (!draggedEntry && !draggedEntryRef.current)) return;
                            e.preventDefault();
                            e.dataTransfer.dropEffect = "move";
                            if (dayEntries.length === 0) {
                              setDropCellTarget({ day, slotId: slot.id });
                            }
                          }}
                          onDragLeave={() => {
                            if (
                              dropCellTarget?.day === day &&
                              dropCellTarget?.slotId === slot.id
                            ) {
                              setDropCellTarget(null);
                            }
                          }}
                          onDrop={(e) => {
                            if (!canDragDrop) return;
                            const fallbackId = e.dataTransfer.getData("text/plain");
                            if (!draggedEntry && !draggedEntryRef.current && !fallbackId) return;
                            e.preventDefault();
                            if (dayEntries.length === 0) {
                              void handleDropOnEmptyCell(
                                day,
                                slot.id,
                                undefined,
                                undefined,
                                fallbackId
                              );
                            } else if (dayEntries[0]) {
                              void handleDropOnCard(dayEntries[0], fallbackId);
                            }
                          }}
                          className={`p-1.5 align-top h-24 transition-colors print:h-auto print:p-1.5 ${
                            isCellDropHighlighted
                              ? "bg-[#E6EFEA]/70 ring-2 ring-inset ring-[#0F3D2E]"
                              : "hover:bg-[#FAF8F5]"
                          }`}
                        >
                          {dayEntries.length > 0 ? (
                            <div className="space-y-1.5 h-full">
                              {dayEntries.map((entry) => {
                                const entryTime = resolveScheduleEntryTime(
                                  entry,
                                  timeSlots,
                                  timeSlotOverrides,
                                  sections
                                );
                                const entryResolved =
                                  viewMode !== "section"
                                    ? resolveTimeSlotForSection(
                                        slot,
                                        timeSlotOverrides,
                                        entry.section
                                      )
                                    : null;
                                const showEntryTimeBadge =
                                  entryTime.is_custom_time ||
                                  (entryResolved !== null &&
                                    (entryResolved.start_time !== slot.start_time ||
                                      entryResolved.end_time !== slot.end_time));
                                const badgeStart = entryTime.is_custom_time
                                  ? entryTime.start_time
                                  : entryResolved?.start_time || slot.start_time;
                                const badgeEnd = entryTime.is_custom_time
                                  ? entryTime.end_time
                                  : entryResolved?.end_time || slot.end_time;

                                const isBeingDragged = draggedEntry?.id === entry.id;
                                const isSwapTarget =
                                  Boolean(draggedEntry) &&
                                  draggedEntry?.id !== entry.id &&
                                  dropCardTargetId === entry.id;

                                return (
                                <div
                                  key={entry.id}
                                  draggable={canDragDrop && !isMovingOrSwapping}
                                  onDragStart={(e) => {
                                    if (!canDragDrop || isMovingOrSwapping) return;
                                    setDragErrorMsg(null);
                                    draggedEntryRef.current = entry;
                                    setDraggedEntry(entry);
                                    e.dataTransfer.effectAllowed = "move";
                                    e.dataTransfer.setData("text/plain", entry.id);
                                  }}
                                  onDragEnd={() => {
                                    resetDragState();
                                  }}
                                  onDragOver={(e) => {
                                    const activeSourceId =
                                      draggedEntryRef.current?.id || draggedEntry?.id;
                                    if (!canDragDrop || !activeSourceId || activeSourceId === entry.id) {
                                      return;
                                    }
                                    e.preventDefault();
                                    e.stopPropagation();
                                    e.dataTransfer.dropEffect = "move";
                                    setDropCardTargetId(entry.id);
                                    setDropCellTarget(null);
                                  }}
                                  onDragLeave={(e) => {
                                    e.stopPropagation();
                                    if (
                                      !e.currentTarget.contains(e.relatedTarget as Node) &&
                                      dropCardTargetId === entry.id
                                    ) {
                                      setDropCardTargetId(null);
                                    }
                                  }}
                                  onDrop={(e) => {
                                    if (!canDragDrop) return;
                                    const fallbackId = e.dataTransfer.getData("text/plain");
                                    const activeSourceId =
                                      draggedEntryRef.current?.id || draggedEntry?.id || fallbackId;
                                    if (!activeSourceId || activeSourceId === entry.id) {
                                      return;
                                    }
                                    e.preventDefault();
                                    e.stopPropagation();
                                    void handleDropOnCard(entry, fallbackId);
                                  }}
                                  title={
                                    (conflictsByEntryId.get(entry.id)?.length ?? 0) > 0
                                      ? conflictsByEntryId
                                          .get(entry.id)!
                                          .map((c) => c.message)
                                          .join("\n")
                                      : undefined
                                  }
                                  className={`p-2 rounded-lg border flex flex-col justify-between text-left group transition-all print:bg-white print:border-slate-300 print:rounded-none print:p-1 ${
                                    canDragDrop ? "cursor-grab active:cursor-grabbing" : ""
                                  } ${
                                    isBeingDragged
                                      ? "opacity-40 scale-[0.98] bg-[#E6EFEA] border-[#0F3D2E] ring-2 ring-[#0F3D2E]"
                                      : isSwapTarget
                                        ? "bg-[#FEF3C7]/80 border-[#F59E0B] ring-2 ring-[#F59E0B] shadow-sm"
                                        : (conflictsByEntryId.get(entry.id)?.length ?? 0) > 0
                                          ? "bg-[#FBECEF] border-2 border-[#9E1B32] shadow-xs ring-1 ring-[#9E1B32]/20"
                                          : "bg-[#F2F7F4] border-[#B8CEC5]/70"
                                  }`}
                                >
                                  <div>
                                    <div className="flex items-center justify-between gap-1">
                                      <span
                                        className={`text-xs font-bold truncate print:text-slate-900 flex items-center gap-1 ${
                                          (conflictsByEntryId.get(entry.id)?.length ?? 0) > 0
                                            ? "text-[#9E1B32]"
                                            : "text-[#0F3D2E]"
                                        }`}
                                      >
                                        {canDragDrop && (
                                          <GripVertical
                                            className={`w-3 h-3 shrink-0 print:hidden ${
                                              (conflictsByEntryId.get(entry.id)?.length ?? 0) > 0
                                                ? "text-[#9E1B32]/80"
                                                : "text-[#5C6660]/70"
                                            }`}
                                            aria-hidden="true"
                                          />
                                        )}
                                        <span className="truncate">{entry.subject?.subject_code}</span>
                                      </span>
                                      <div className="print:hidden flex items-center gap-0.5 shrink-0">
                                        {(conflictsByEntryId.get(entry.id)?.length ?? 0) > 0 && (
                                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-[#9E1B32] text-white text-[9px] font-bold tracking-tight">
                                            <AlertTriangle className="w-2.5 h-2.5 shrink-0" aria-hidden="true" />
                                            <span>Conflict</span>
                                          </span>
                                        )}
                                        {isPrivileged && !isGridLocked && (
                                          <div className="flex items-center gap-0.5 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100 transition-opacity">
                                            {onEditSlot && (
                                              <button
                                                type="button"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  onEditSlot(entry);
                                                }}
                                                className="text-[#5C6660] hover:text-[#0F3D2E] p-0.5 cursor-pointer rounded"
                                                title="Edit slot or room number"
                                                aria-label={`Edit ${entry.subject?.subject_code || "class"} slot`}
                                              >
                                                <Edit2 className="w-3 h-3" />
                                              </button>
                                            )}
                                            <button
                                              type="button"
                                              onClick={(e) => handleDeleteEntry(entry.id, e)}
                                              className="text-[#5C6660] hover:text-[#9E1B32] p-0.5 cursor-pointer rounded"
                                              title="Remove from schedule"
                                              aria-label="Remove entry"
                                            >
                                              <Trash2 className="w-3 h-3" />
                                            </button>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                    <div className="text-xs text-[#1C2420] font-medium leading-snug line-clamp-2 mt-0.5">
                                      {entry.subject?.subject_name}
                                    </div>
                                    {(conflictsByEntryId.get(entry.id)?.length ?? 0) > 0 && (
                                      <div className="mt-1 px-1.5 py-1 rounded bg-[#FFFFFF]/90 border border-[#F3B8C2] text-[10px] font-semibold text-[#9E1B32] flex items-start gap-1 leading-tight print:hidden">
                                        <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5 text-[#9E1B32]" aria-hidden="true" />
                                        <span className="line-clamp-2">
                                          {conflictsByEntryId.get(entry.id)![0]?.message}
                                          {(conflictsByEntryId.get(entry.id)?.length ?? 0) > 1
                                            ? ` (+${conflictsByEntryId.get(entry.id)!.length - 1} more)`
                                            : ""}
                                        </span>
                                      </div>
                                    )}
                                  </div>

                                  <div className="mt-1.5 pt-1 border-t border-[#E3DDD1] text-[11px] space-y-0.5 print:border-slate-200">
                                    {viewMode === "section" && (
                                      <div className="text-[#0F3D2E] font-medium truncate print:text-slate-800">
                                        {entry.teacher?.full_name ||
                                          entry.guest_instructor_name ||
                                          "Instructor"}
                                      </div>
                                    )}
                                    {viewMode === "teacher" && (
                                      <div className="text-[#0F3D2E] font-medium truncate print:text-slate-800">
                                        Grade {entry.section?.grade_level} - {entry.section?.section_name}
                                      </div>
                                    )}
                                    {viewMode === "master" && (
                                      <div className="text-[#0F3D2E] font-medium truncate print:text-slate-800">
                                        {entry.section?.section_name} •{" "}
                                        {(entry.teacher?.full_name || entry.guest_instructor_name || "")
                                          .split(" ")[0]}
                                      </div>
                                    )}
                                    {showEntryTimeBadge && (
                                      <div className="text-[10px] font-mono font-semibold text-[#9E1B32]">
                                        {badgeStart.slice(0, 5)}–{badgeEnd.slice(0, 5)} ({entryTime.duration_minutes}m)
                                      </div>
                                    )}
                                    <div className="text-[#5C6660] flex items-center gap-1 truncate">
                                      <Building className="w-3 h-3 shrink-0 print:hidden" />
                                      <span>{entry.room?.room_number || "Homeroom"}</span>
                                    </div>
                                  </div>
                                </div>
                                );
                              })}
                              {freeGap && !isGridLocked && (
                                <button
                                  type="button"
                                  onDragOver={(e) => {
                                    if (!canDragDrop || !draggedEntry) return;
                                    e.preventDefault();
                                    e.stopPropagation();
                                  }}
                                  onDrop={(e) => {
                                    if (!canDragDrop || !draggedEntry) return;
                                    e.preventDefault();
                                    e.stopPropagation();
                                    void handleDropOnEmptyCell(
                                      day,
                                      slot.id,
                                      freeGap.start,
                                      freeGap.end
                                    );
                                  }}
                                  onClick={() =>
                                    onOpenAssignSlot({
                                      sectionId: selectedSectionId,
                                      day,
                                      timeSlotId: slot.id,
                                      startTime: freeGap.start,
                                      endTime: freeGap.end,
                                    })
                                  }
                                  className="print:hidden w-full py-1 px-2 rounded-md border border-dashed border-[#B8CEC5] hover:border-[#0F3D2E] hover:bg-[#E6EFEA]/50 text-[10px] font-semibold text-[#0F3D2E] flex items-center justify-center gap-1 transition-colors cursor-pointer"
                                  title={`Add or drop split class (${freeGap.start}–${freeGap.end})`}
                                >
                                  <PlusCircle className="w-3 h-3 shrink-0" />
                                  <span>Add {freeGap.start}–{freeGap.end}</span>
                                </button>
                              )}
                            </div>
                          ) : (
                            <>
                              {/* Empty Slot Cell (Click to schedule unless grid is locked) */}
                              {isGridLocked ? (
                                <div className="print:hidden w-full h-full min-h-[5rem] rounded-lg border border-dashed border-[#E3DDD1] bg-[#FAF8F5]/60 text-[#9CA3AF] flex flex-col items-center justify-center text-[11px] font-medium p-2">
                                  <Lock className="w-3.5 h-3.5 mb-0.5 opacity-60" />
                                  <span>Locked</span>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() =>
                                    onOpenAssignSlot({
                                      sectionId: viewMode === "section" ? selectedSectionId : undefined,
                                      teacherId: viewMode === "teacher" ? selectedTeacherId : undefined,
                                      day,
                                      timeSlotId: slot.id,
                                    })
                                  }
                                  className={`print:hidden w-full h-full min-h-[5rem] rounded-lg border border-dashed flex flex-col items-center justify-center text-xs font-medium transition-all cursor-pointer p-2 ${
                                    isCellDropHighlighted
                                      ? "border-[#0F3D2E] bg-[#E6EFEA] text-[#0F3D2E]"
                                      : "border-[#E3DDD1] hover:border-[#0F3D2E]/50 hover:bg-[#FAF8F5] text-[#5C6660] hover:text-[#0F3D2E]"
                                  }`}
                                  aria-label={`Schedule Period ${slot.slot_number} on ${day}`}
                                >
                                  <PlusCircle className="w-4 h-4 mb-0.5" />
                                  <span>{isCellDropHighlighted ? "Drop to Move" : "Assign"}</span>
                                </button>
                              )}
                              <div className="hidden print:flex items-center justify-center h-10 text-[11px] text-slate-400">
                                —
                              </div>
                            </>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Print-Only Official Signatories */}
      <div className="hidden print:block">
        <ScheduleSignatories
          schoolSettings={schoolSettings}
          level={
            viewMode === "section"
              ? activeSection?.grade_level && activeSection.grade_level >= 11
                ? "SHS"
                : "JHS"
              : viewMode === "teacher"
                ? resolveCoordinatorLevelForTeacher(activeTeacher, [], displayedEntries)
                : "BOTH"
          }
        />
      </div>

      {/* Unlock Confirmation Dialog */}
      {isUnlockConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 print:hidden">
          <div
            className="fixed inset-0 bg-[#1C2420]/60 backdrop-blur-xs"
            onClick={() => setIsUnlockConfirmOpen(false)}
            aria-hidden="true"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="unlock-grid-title"
            className="relative z-10 w-full max-w-md rounded-2xl border border-[#E3DDD1] bg-white p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#FEF3C7] text-[#92400E] flex items-center justify-center shrink-0">
                <Unlock className="w-5 h-5" />
              </div>
              <div>
                <h3 id="unlock-grid-title" className="text-base font-bold text-[#1C2420] font-display">
                  Unlock Schedule Grid?
                </h3>
                <p className="text-xs text-[#5C6660] mt-1 leading-relaxed">
                  Unlocking <strong>{termSubtitle}</strong> will re-enable{" "}
                  <strong>Populate Grid</strong>, <strong>Clear Grid</strong>, and manual slot
                  modifications. You can lock it again anytime.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E3DDD1]">
              <button
                type="button"
                onClick={() => setIsUnlockConfirmOpen(false)}
                className="px-4 py-2 text-xs font-semibold rounded-xl border border-[#E3DDD1] text-[#5C6660] hover:bg-[#FAF8F5] cursor-pointer"
              >
                Keep Locked
              </button>
              <button
                type="button"
                disabled={isTogglingLock}
                onClick={() => {
                  setIsUnlockConfirmOpen(false);
                  onToggleGridLock?.(false);
                }}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-[#0F3D2E] hover:bg-[#0A2E22] text-white cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5"
              >
                <Unlock className="w-3.5 h-3.5" />
                <span>Unlock Grid</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
