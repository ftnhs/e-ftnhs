import React, { useState, useMemo } from "react";
import type {
  Section,
  TimeSlot,
  TimeSlotOverride,
  ScheduleEntry,
  AcademicTerm,
  SchoolSettings,
} from "../../types";
import { getVisibleSlotsForSection } from "../../services/timetableService";
import { ScheduleSignatories } from "./ScheduleSignatories";
import {
  PrintPageSizeStyle,
  PAPER_SIZE_CONFIG,
  formatScheduleTimeRange,
  buildMergedScheduleMatrix,
  type PaperSize,
} from "./DepEdPrintChrome";
import { Printer } from "lucide-react";

interface ClassProgramPrintViewProps {
  sections: Section[];
  timeSlots: TimeSlot[];
  timeSlotOverrides?: TimeSlotOverride[];
  scheduleEntries: ScheduleEntry[];
  activeTerm: AcademicTerm | null;
  schoolSettings: SchoolSettings | null;
}

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"] as const;

export const ClassProgramPrintView: React.FC<ClassProgramPrintViewProps> = ({
  sections,
  timeSlots,
  timeSlotOverrides = [],
  scheduleEntries,
  activeTerm,
  schoolSettings,
}) => {
  const [selectedSectionId, setSelectedSectionId] = useState<string>(
    sections[0]?.id || ""
  );
  const [paperSize, setPaperSize] = useState<PaperSize>("folio");

  const paperConfig = PAPER_SIZE_CONFIG[paperSize];

  React.useEffect(() => {
    if (sections.length > 0 && sections[0] && !selectedSectionId) {
      setSelectedSectionId(sections[0].id);
    }
  }, [sections, selectedSectionId]);

  const activeSection = useMemo(() => {
    return sections.find((s) => s.id === selectedSectionId) || null;
  }, [sections, selectedSectionId]);

  const sectionEntries = useMemo(() => {
    return scheduleEntries.filter((e) => e.section_id === selectedSectionId);
  }, [scheduleEntries, selectedSectionId]);

  const isSHS = Boolean(activeSection?.grade_level && activeSection.grade_level >= 11);

  const resolvedSlots = useMemo(() => {
    return getVisibleSlotsForSection(
      timeSlots,
      timeSlotOverrides,
      activeSection,
      sectionEntries
    );
  }, [timeSlots, timeSlotOverrides, activeSection, sectionEntries]);

  const mergedMatrix = useMemo(() => {
    return buildMergedScheduleMatrix(
      resolvedSlots,
      sectionEntries,
      DAYS,
      (e) => `${e.subject_id}__${e.teacher_id || e.guest_instructor_name || ""}`
    );
  }, [resolvedSlots, sectionEntries]);

  const handlePrint = () => {
    window.print();
  };

  const sy = activeTerm?.school_year
    ? activeTerm.school_year.replace("-", " - ")
    : "2026 - 2027";

  return (
    <div className="space-y-6 print:space-y-0">
      <PrintPageSizeStyle paperSize={paperSize} />

      {/* 1. Selector & Print Action Bar (Hidden in Print) */}
      <div className="print:hidden bg-white p-4 sm:p-5 rounded-2xl border border-sand-200 shadow-xs flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 transition-colors">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <label htmlFor="cp-section-select" className="text-xs font-semibold text-sand-700 shrink-0">
              Select Class Section:
            </label>
            <select
              id="cp-section-select"
              value={selectedSectionId}
              onChange={(e) => setSelectedSectionId(e.target.value)}
              className="py-1.5 px-3 rounded-xl border border-sand-300 bg-sand-50 text-xs font-medium text-cyprus-900 focus-visible:ring-2 focus-visible:ring-[#0F3D2E] cursor-pointer min-w-[220px]"
            >
              {sections.map((sec) => (
                <option key={sec.id} value={sec.id}>
                  Grade {sec.grade_level} - {sec.section_name} ({sec.room?.room_name || "Room TBD"})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label htmlFor="cp-paper-select" className="text-xs font-semibold text-sand-700 shrink-0">
              Paper Size:
            </label>
            <select
              id="cp-paper-select"
              value={paperSize}
              onChange={(e) => setPaperSize(e.target.value as PaperSize)}
              className="py-1.5 px-2.5 rounded-xl border border-sand-300 bg-sand-50 text-xs font-medium text-cyprus-900 cursor-pointer"
            >
              {(Object.entries(PAPER_SIZE_CONFIG) as Array<[PaperSize, typeof paperConfig]>).map(
                ([key, cfg]) => (
                  <option key={key} value={key}>
                    {cfg.label}
                  </option>
                )
              )}
            </select>
          </div>
        </div>

        <button
          type="button"
          onClick={handlePrint}
          className="px-5 py-2.5 rounded-xl bg-[#0F3D2E] hover:bg-[#0A2E22] text-white text-xs font-semibold shadow-xs flex items-center justify-center gap-2 cursor-pointer transition-colors whitespace-nowrap shrink-0"
        >
          <Printer className="w-4 h-4 shrink-0" />
          <span>Print Class Program</span>
        </button>
      </div>

      {/* 2. Official Class Program Document Canvas (single page for selected paper size) */}
      <div
        className={`bg-white text-slate-900 p-6 sm:p-8 rounded-2xl border border-sand-200 shadow-lg mx-auto ${paperConfig.previewMaxWidth} ${paperConfig.pageHeightClass} print:border-none print:shadow-none print:rounded-none print:p-0 print:w-full print:max-w-none print:break-inside-avoid`}
      >
        {/* Sample Format Header: Left School Logo | Center Republic/DepEd/FTNHS | Right Division Logo */}
        <div className="flex items-center justify-center gap-6 mb-3">
          <img
            src="/images/Official%20Logos/Fermin_logo.png"
            alt="Fermin Tayabas National High School Logo"
            className="w-16 h-16 object-contain shrink-0"
          />

          <div className="text-center leading-tight text-slate-900">
            <p className="text-[11px]">Republic of the Philippines</p>
            <p className="text-[11px]">Department of Education</p>
            <p className="text-[10.5px]">
              {schoolSettings?.region || "Region VII, Central Visayas"}
            </p>
            <p className="text-[10.5px]">
              {schoolSettings?.division || "Division of Bohol"}
            </p>
            <p className="text-[11px] font-semibold uppercase tracking-wide">
              {schoolSettings?.school_name || "FERMIN TAYABAS NATIONAL HIGH SCHOOL"}
            </p>
            <p className="text-[10.5px]">
              {schoolSettings?.address || "Cabayugan, Calape, Bohol"}
            </p>
          </div>

          <img
            src="/images/Official%20Logos/sdoBohol_logo.png"
            alt="Division of Bohol Logo"
            className="w-16 h-16 object-contain shrink-0"
          />
        </div>

        {/* Title & Grade Section Heading */}
        <div className="text-center mt-4 mb-4 text-slate-900">
          <h1 className="text-xs font-bold uppercase tracking-wide">
            {isSHS ? "SHS CLASS PROGRAM" : "JHS CLASS PROGRAM"}
          </h1>
          <p className="text-[11px] font-bold mt-1 mb-3">SY {sy}</p>
          <p className="text-xs font-bold uppercase my-2.5">
            GRADE {activeSection?.grade_level} - {activeSection?.section_name}
          </p>
          {activeSection?.adviser?.full_name && (
            <p className="text-[10px] text-slate-700 mt-1">
              Class Adviser: <span className="font-semibold">{activeSection.adviser.full_name}</span>
              {activeSection?.room?.room_number ? ` • ${activeSection.room.room_number}` : ""}
            </p>
          )}
        </div>

        {/* Schedule Table (Time | Min | ACTIVITY/LEARNING AREAS -> MONDAY..FRIDAY) */}
        <div className="overflow-x-auto print:overflow-visible">
          <table className="w-full table-fixed border-collapse border border-slate-900 text-[10px] text-slate-900">
            <thead>
              <tr className="bg-slate-50 font-bold text-center">
                <th rowSpan={2} className="border border-slate-900 py-1 px-1 w-[78px] align-middle">
                  Time
                </th>
                <th rowSpan={2} className="border border-slate-900 py-1 px-1 w-[36px] align-middle">
                  Min
                </th>
                <th colSpan={5} className="border border-slate-900 py-1 px-2 uppercase tracking-wide">
                  ACTIVITY/LEARNING AREAS
                </th>
              </tr>
              <tr className="bg-slate-50 font-bold uppercase text-center text-[9.5px]">
                {DAYS.map((day) => (
                  <th key={day} className="border border-slate-900 py-1 px-1">
                    {day}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {resolvedSlots.map((slot) => {
                if (slot.slot_type !== "Academic") {
                  const breakLabel =
                    slot.slot_type === "Flag Ceremony"
                      ? "MORNING PRAYERS AND FLAG RAISING CEREMONY"
                      : slot.slot_type === "Lunch"
                        ? "NOON INTERMISSION"
                        : slot.slot_label.toUpperCase();

                  return (
                    <tr key={slot.id} className="bg-slate-50/70 text-center">
                      <td className="border border-slate-900 py-1 px-1 text-center whitespace-nowrap tabular-nums">
                        {formatScheduleTimeRange(slot.start_time, slot.end_time)}
                      </td>
                      <td className="border border-slate-900 py-1 px-1 text-center tabular-nums">
                        {slot.duration_minutes}
                      </td>
                      <td colSpan={5} className="border border-slate-900 py-1 px-2 font-medium tracking-wide">
                        {breakLabel}
                      </td>
                    </tr>
                  );
                }

                return (
                  <tr key={slot.id}>
                    <td
                      className={`border border-slate-900 ${
                        paperConfig.isCompact ? "py-1" : "py-1.5"
                      } px-1 text-center whitespace-nowrap tabular-nums align-middle`}
                    >
                      {formatScheduleTimeRange(slot.start_time, slot.end_time)}
                    </td>
                    <td
                      className={`border border-slate-900 ${
                        paperConfig.isCompact ? "py-1" : "py-1.5"
                      } px-1 text-center tabular-nums align-middle`}
                    >
                      {slot.duration_minutes}
                    </td>

                    {DAYS.map((day) => {
                      const cell = mergedMatrix[slot.id]?.[day];
                      if (!cell || cell.skip) return null;

                      return (
                        <td
                          key={day}
                          rowSpan={cell.rowSpan}
                          className={`border border-slate-900 ${
                            paperConfig.isCompact ? "py-1" : "py-1.5"
                          } px-1 text-center align-middle leading-tight`}
                        >
                          {cell.entry ? (
                            <div className="space-y-0.5">
                              <div className="font-semibold uppercase text-[9.5px]">
                                {cell.entry.subject?.subject_name}
                              </div>
                              <div className="text-[9.5px] text-slate-800">
                                {cell.entry.teacher?.full_name ||
                                  cell.entry.guest_instructor_name ||
                                  ""}
                              </div>
                            </div>
                          ) : null}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* 4-Tier Official Signatories (Prepared by, Noted by, Recommending Approval, Approved) */}
        <ScheduleSignatories
          schoolSettings={schoolSettings}
          level={isSHS ? "SHS" : "JHS"}
          supervisorLabel="Noted by:"
        />
      </div>
    </div>
  );
};
