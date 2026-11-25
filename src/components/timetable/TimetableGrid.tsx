import React, { useState, useMemo } from "react";
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
} from "../../types";
import {
  deleteScheduleEntry,
  resolveTimeSlotForSection,
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
  Printer,
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
  onOpenAssignSlot: (prefill?: {
    sectionId?: string;
    teacherId?: string;
    day?: DayOfWeek;
    timeSlotId?: string;
  }) => void;
  onEntryDeleted: (entryId: string) => void;
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
  onOpenAssignSlot,
  onEntryDeleted,
}) => {
  const [viewMode, setViewMode] = useState<"section" | "teacher" | "master">("section");
  const [selectedSectionId, setSelectedSectionId] = useState<string>(
    sections[0]?.id || ""
  );
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>(
    teachers[0]?.id || ""
  );

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

  const handlePrintSchedule = () => {
    window.print();
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
        <div className="flex flex-wrap items-center justify-between lg:justify-end gap-2.5">
          {viewMode === "section" && (
            <div className="flex items-center gap-2">
              <label htmlFor="grid-section-select" className="text-xs font-semibold text-[#5C6660] whitespace-nowrap">
                Section:
              </label>
              <select
                id="grid-section-select"
                value={selectedSectionId}
                onChange={(e) => setSelectedSectionId(e.target.value)}
                className="py-1.5 px-3 rounded-lg border border-[#E3DDD1] bg-[#FAF8F5] text-xs font-medium text-[#1C2420] cursor-pointer"
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
            <div className="flex items-center gap-2">
              <label htmlFor="grid-teacher-select" className="text-xs font-semibold text-[#5C6660] whitespace-nowrap">
                Teacher:
              </label>
              <select
                id="grid-teacher-select"
                value={selectedTeacherId}
                onChange={(e) => setSelectedTeacherId(e.target.value)}
                className="py-1.5 px-3 rounded-lg border border-[#E3DDD1] bg-[#FAF8F5] text-xs font-medium text-[#1C2420] cursor-pointer"
              >
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.full_name} ({t.designation || "Teacher"})
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            type="button"
            onClick={handlePrintSchedule}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-[#0F3D2E] bg-[#E6EFEA] hover:bg-[#0F3D2E] text-[#0F3D2E] hover:text-[#FFFFFF] text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 shrink-0" />
            <span>Print Schedule</span>
          </button>
        </div>
      </div>

      {/* 2. Visual Context Line */}
      <div className="print:hidden flex items-center justify-between px-1 text-xs text-[#5C6660]">
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
      </div>

      {/* 3. Schedule Grid Table */}
      <div className="bg-[#FFFFFF] rounded-xl border border-[#E3DDD1] overflow-hidden print:rounded-none print:border-slate-400">
        <div className="overflow-x-auto lg:overflow-x-visible print:overflow-visible">
          <table className="w-full table-fixed border-collapse text-left text-xs min-w-[680px] lg:min-w-0 print:min-w-0">
            <thead>
              <tr className="bg-[#FAF8F5] border-b border-[#E3DDD1] text-[#404B45] uppercase text-[11px] font-semibold tracking-wider print:bg-slate-100 print:border-slate-400">
                <th className="py-2.5 px-3 w-36 border-r border-[#E3DDD1] print:border-slate-400">
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
                      const dayEntries = displayedEntries.filter(
                        (e) => e.time_slot_id === slot.id && e.day_of_week === day
                      );

                      return (
                        <td
                          key={day}
                          className="p-1.5 align-top h-24 hover:bg-[#FAF8F5] transition-colors print:h-auto print:p-1.5"
                        >
                          {dayEntries.length > 0 ? (
                            <div className="space-y-1.5 h-full">
                              {dayEntries.map((entry) => {
                                const entryResolved =
                                  viewMode !== "section"
                                    ? resolveTimeSlotForSection(
                                        slot,
                                        timeSlotOverrides,
                                        entry.section
                                      )
                                    : null;
                                const showEntryTimeBadge =
                                  entryResolved !== null &&
                                  (entryResolved.start_time !== slot.start_time ||
                                    entryResolved.end_time !== slot.end_time);

                                return (
                                <div
                                  key={entry.id}
                                  className="p-2 rounded-lg bg-[#F2F7F4] border border-[#B8CEC5]/70 flex flex-col justify-between text-left group transition-all print:bg-white print:border-slate-300 print:rounded-none print:p-1"
                                >
                                  <div>
                                    <div className="flex items-center justify-between gap-1">
                                      <span className="text-xs font-bold text-[#0F3D2E] truncate print:text-slate-900">
                                        {entry.subject?.subject_code}
                                      </span>
                                      {isPrivileged && (
                                        <button
                                          type="button"
                                          onClick={(e) => handleDeleteEntry(entry.id, e)}
                                          className="print:hidden opacity-0 group-hover:opacity-100 text-[#5C6660] hover:text-[#9E1B32] transition-opacity p-0.5 cursor-pointer"
                                          title="Remove from schedule"
                                          aria-label="Remove entry"
                                        >
                                          <Trash2 className="w-3 h-3" />
                                        </button>
                                      )}
                                    </div>
                                    <div className="text-xs text-[#1C2420] font-medium leading-snug line-clamp-2 mt-0.5">
                                      {entry.subject?.subject_name}
                                    </div>
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
                                    {showEntryTimeBadge && entryResolved && (
                                      <div className="text-[10px] font-mono font-semibold text-amber-800">
                                        {entryResolved.start_time.slice(0, 5)}–{entryResolved.end_time.slice(0, 5)}
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
                            </div>
                          ) : (
                            <>
                              {/* Empty Slot Cell (Click to schedule) */}
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
                                className="print:hidden w-full h-full min-h-[5rem] rounded-lg border border-dashed border-[#E3DDD1] hover:border-[#0F3D2E]/50 hover:bg-[#FAF8F5] text-[#5C6660] hover:text-[#0F3D2E] flex flex-col items-center justify-center text-xs font-medium transition-all cursor-pointer p-2"
                                aria-label={`Schedule Period ${slot.slot_number} on ${day}`}
                              >
                                <PlusCircle className="w-4 h-4 mb-0.5" />
                                <span>Assign</span>
                              </button>
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
    </div>
  );
};
