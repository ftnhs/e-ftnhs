import React, { useState, useMemo } from "react";
import type {
  Profile,
  Section,
  TimeSlot,
  TimeSlotOverride,
  ScheduleEntry,
  TeacherSubjectLoad,
  AcademicTerm,
  SchoolSettings,
} from "../../types";
import {
  resolveTimeSlotForSection,
  resolveScheduleEntryTime,
  getVisibleSlotsForSection,
  computeLoadPlottedStats,
} from "../../services/timetableService";
import {
  ScheduleSignatories,
  resolveCoordinatorLevelForTeacher,
} from "./ScheduleSignatories";
import {
  DepEdDocumentHeader,
  DepEdDocumentFooter,
  PrintPageSizeStyle,
  PAPER_SIZE_CONFIG,
  formatScheduleTimeRange,
  buildMergedScheduleMatrix,
  type PaperSize,
} from "./DepEdPrintChrome";
import { Printer } from "lucide-react";

interface DepEdSF7PrintViewProps {
  teachers: Profile[];
  sections?: Section[];
  timeSlots: TimeSlot[];
  timeSlotOverrides?: TimeSlotOverride[];
  scheduleEntries: ScheduleEntry[];
  loads: TeacherSubjectLoad[];
  activeTerm: AcademicTerm | null;
  schoolSettings: SchoolSettings | null;
}

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"] as const;

function formatHours(mins: number): string {
  const hrs = mins / 60;
  return Number.isInteger(hrs) ? String(hrs) : hrs.toFixed(1);
}

export const DepEdSF7PrintView: React.FC<DepEdSF7PrintViewProps> = ({
  teachers,
  sections = [],
  timeSlots,
  timeSlotOverrides = [],
  scheduleEntries,
  loads,
  activeTerm,
  schoolSettings,
}) => {
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>(
    teachers[0]?.id || ""
  );
  const [coordinatorOverride, setCoordinatorOverride] = useState<"AUTO" | "JHS" | "SHS">("AUTO");
  const [paperSize, setPaperSize] = useState<PaperSize>("folio");

  const paperConfig = PAPER_SIZE_CONFIG[paperSize];

  React.useEffect(() => {
    if (teachers.length > 0 && teachers[0] && !selectedTeacherId) {
      setSelectedTeacherId(teachers[0].id);
    }
  }, [teachers, selectedTeacherId]);

  const activeTeacher = useMemo(() => {
    return teachers.find((t) => t.id === selectedTeacherId) || null;
  }, [teachers, selectedTeacherId]);

  const advisorySection = useMemo(() => {
    return sections.find((s) => s.adviser_id === selectedTeacherId) || null;
  }, [sections, selectedTeacherId]);

  const teacherLoads = useMemo(() => {
    return loads.filter((l) => l.teacher_id === selectedTeacherId);
  }, [loads, selectedTeacherId]);

  const teacherEntries = useMemo(() => {
    return scheduleEntries.filter((e) => e.teacher_id === selectedTeacherId);
  }, [scheduleEntries, selectedTeacherId]);

  const totalTeachingMinutes = useMemo(() => {
    return teacherLoads.reduce((sum, l) => {
      const stats = computeLoadPlottedStats(
        l.id,
        scheduleEntries,
        timeSlots,
        timeSlotOverrides,
        sections
      );
      const mins = stats.slotCount > 0 ? stats.plottedMinutes : l.teaching_minutes_weekly || 0;
      return sum + mins;
    }, 0);
  }, [teacherLoads, scheduleEntries, timeSlots, timeSlotOverrides, sections]);

  const totalAncillaryMinutes = useMemo(() => {
    return teacherLoads.reduce((sum, l) => sum + (l.ancillary_minutes_weekly || 0), 0);
  }, [teacherLoads]);

  const ancillaryDescriptions = useMemo(() => {
    const items = new Set<string>();
    for (const l of teacherLoads) {
      if (l.ancillary_description?.trim()) {
        items.add(l.ancillary_description.trim());
      }
    }
    return Array.from(items);
  }, [teacherLoads]);

  const autoCoordinatorLevel = useMemo(
    () => resolveCoordinatorLevelForTeacher(activeTeacher, teacherLoads, teacherEntries),
    [activeTeacher, teacherLoads, teacherEntries]
  );

  const effectiveCoordinatorLevel =
    coordinatorOverride === "AUTO" ? autoCoordinatorLevel : coordinatorOverride;

  const teacherScopeSection = useMemo(() => {
    const distinctSectionIds = new Set(teacherEntries.map((e) => e.section_id));
    if (distinctSectionIds.size === 1) {
      const onlySectionId = Array.from(distinctSectionIds)[0];
      const matched =
        sections.find((s) => s.id === onlySectionId) ||
        teacherEntries[0]?.section ||
        null;
      if (matched) return matched;
    }
    return effectiveCoordinatorLevel === "SHS"
      ? { id: "__shs__", grade_level: 11 }
      : { id: "__jhs__", grade_level: 7 };
  }, [teacherEntries, sections, effectiveCoordinatorLevel]);

  const resolvedSlots = useMemo(() => {
    return getVisibleSlotsForSection(
      timeSlots,
      timeSlotOverrides,
      teacherScopeSection,
      teacherEntries
    );
  }, [timeSlots, timeSlotOverrides, teacherScopeSection, teacherEntries]);

  const mergedMatrix = useMemo(() => {
    return buildMergedScheduleMatrix(
      resolvedSlots,
      teacherEntries,
      DAYS,
      (e) => `${e.subject_id}__${e.section_id}`
    );
  }, [resolvedSlots, teacherEntries]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 print:space-y-0">
      <PrintPageSizeStyle paperSize={paperSize} />

      {/* 1. Selector & Print Action Bar (Hidden in Print) */}
      <div className="print:hidden bg-white p-4 sm:p-5 rounded-2xl border border-sand-200 shadow-xs flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 transition-colors">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <label htmlFor="sf7-teacher-select" className="text-xs font-semibold text-sand-700 shrink-0">
              Select Faculty Member:
            </label>
            <select
              id="sf7-teacher-select"
              value={selectedTeacherId}
              onChange={(e) => {
                setSelectedTeacherId(e.target.value);
                setCoordinatorOverride("AUTO");
              }}
              className="py-1.5 px-3 rounded-xl border border-sand-300 bg-sand-50 text-xs font-medium text-cyprus-900 focus-visible:ring-2 focus-visible:ring-[#0F3D2E] cursor-pointer min-w-[200px] max-w-full sm:max-w-[280px]"
            >
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.full_name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label htmlFor="sf7-coord-select" className="text-xs font-semibold text-sand-700 shrink-0">
              Prepared by:
            </label>
            <select
              id="sf7-coord-select"
              value={coordinatorOverride}
              onChange={(e) => setCoordinatorOverride(e.target.value as "AUTO" | "JHS" | "SHS")}
              className="py-1.5 px-2.5 rounded-xl border border-sand-300 bg-sand-50 text-xs font-medium text-cyprus-900 cursor-pointer"
            >
              <option value="AUTO">Auto ({autoCoordinatorLevel} Coordinator)</option>
              <option value="JHS">JHS Coordinator</option>
              <option value="SHS">SHS Coordinator</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label htmlFor="sf7-paper-select" className="text-xs font-semibold text-sand-700 shrink-0">
              Paper Size:
            </label>
            <select
              id="sf7-paper-select"
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
          <span>Print Official DepEd SF7</span>
        </button>
      </div>

      {/* 2. Official Printable SF7 Document Canvas (single page, footer pinned to bottom of paper) */}
      <div
        className={`bg-white text-slate-900 p-6 sm:p-8 rounded-2xl border border-sand-200 shadow-lg mx-auto flex flex-col justify-between ${paperConfig.previewMaxWidth} ${paperConfig.pageHeightClass} print:border-none print:shadow-none print:rounded-none print:p-0 print:w-full print:max-w-none print:break-inside-avoid`}
      >
        <div>
          {/* Official DepEd Bohol Letterhead */}
          <DepEdDocumentHeader schoolSettings={schoolSettings} activeTerm={activeTerm} />

          {/* Document Title */}
          <h1
            className={`text-center text-sm font-bold uppercase tracking-wide text-slate-900 ${
              paperConfig.isCompact ? "mt-2 mb-3" : "mt-3 mb-4"
            }`}
          >
            SECONDARY PROGRAM OF TEACHERS
          </h1>

          {/* Teacher Metadata (Word Format) */}
          <div
            className={`text-[11px] leading-snug space-y-0.5 text-slate-900 ${
              paperConfig.isCompact ? "mt-2 mb-3" : "mt-3 mb-4"
            }`}
          >
            <div className="flex gap-2">
              <span className="w-16 font-semibold shrink-0">Teacher:</span>
              <span className="font-bold uppercase">
                {activeTeacher?.full_name || "—"}
              </span>
            </div>
            <div className="flex gap-2">
              <span className="w-16 font-semibold shrink-0">Degree:</span>
              <span className="uppercase">
                {activeTeacher?.degree_course || "BACHELOR OF SECONDARY EDUCATION"}
              </span>
            </div>
            <div className="flex gap-2">
              <span className="w-16 font-semibold shrink-0">Major:</span>
              <span className="uppercase">
                {activeTeacher?.major_specialization || "—"}
              </span>
            </div>
            {advisorySection && (
              <div className="flex gap-2">
                <span className="w-16 font-semibold shrink-0">Adviser:</span>
                <span className="font-semibold uppercase">
                  GRADE {advisorySection.grade_level} - {advisorySection.section_name}
                </span>
              </div>
            )}
          </div>

          {/* Table 1: Weekly Schedule Grid */}
          <div className="overflow-x-auto print:overflow-visible">
            <table className="w-full table-fixed border-collapse border border-slate-900 text-[10px] text-slate-900">
              <thead>
                <tr className="bg-slate-100 font-bold uppercase text-center">
                  <th className="border border-slate-900 py-1 px-1.5 w-[92px]">TIME</th>
                  {DAYS.map((day) => (
                    <th key={day} className="border border-slate-900 py-1 px-1.5">
                      {day.toUpperCase()}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {resolvedSlots.map((slot) => {
                  if (slot.slot_type !== "Academic") {
                    const breakLabel =
                      slot.slot_type === "Flag Ceremony"
                        ? "FLAG CEREMONY"
                        : slot.slot_type === "Lunch"
                          ? "LUNCH BREAK"
                          : slot.slot_label.toUpperCase();

                    return (
                      <tr key={slot.id} className="bg-slate-50 font-semibold text-center">
                        <td className="border border-slate-900 py-1 px-1.5 text-center whitespace-nowrap tabular-nums">
                          {formatScheduleTimeRange(slot.start_time, slot.end_time)}
                        </td>
                        <td colSpan={5} className="border border-slate-900 py-1 px-2 tracking-wide">
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
                        } px-1.5 text-center font-medium whitespace-nowrap tabular-nums align-middle`}
                      >
                        {formatScheduleTimeRange(slot.start_time, slot.end_time)}
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
                            } px-1.5 text-center align-middle leading-tight`}
                          >
                            {cell.entries.length > 0 ? (
                              <div className="space-y-1">
                                {cell.entries.map((entryItem, entryIdx) => {
                                  const entrySlot = resolveTimeSlotForSection(
                                    slot,
                                    timeSlotOverrides,
                                    entryItem.section
                                  );
                                  const entryTime = resolveScheduleEntryTime(
                                    entryItem,
                                    timeSlots,
                                    timeSlotOverrides,
                                    sections
                                  );
                                  const effectiveStart = entryTime.is_custom_time
                                    ? entryTime.start_time
                                    : entrySlot.start_time;
                                  const effectiveEnd = entryTime.is_custom_time
                                    ? entryTime.end_time
                                    : entrySlot.end_time;
                                  const entryDiffersFromRow =
                                    cell.entries.length > 1 ||
                                    effectiveStart.slice(0, 5) !== slot.start_time.slice(0, 5) ||
                                    effectiveEnd.slice(0, 5) !== slot.end_time.slice(0, 5);

                                  return (
                                    <div
                                      key={entryItem.id}
                                      className={
                                        entryIdx > 0
                                          ? "pt-1 border-t border-slate-300 space-y-0.5"
                                          : "space-y-0.5"
                                      }
                                    >
                                      <div className="font-semibold text-[10px]">
                                        {entryItem.subject?.subject_name}
                                      </div>
                                      <div className="text-[9.5px] font-medium">
                                        {entryItem.section?.grade_level} - {entryItem.section?.section_name}
                                      </div>
                                      {entryDiffersFromRow && (
                                        <div className="text-[8.5px] font-medium text-slate-600 tabular-nums">
                                          ({formatScheduleTimeRange(effectiveStart, effectiveEnd)})
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
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

          {/* Table 2: Teaching Load & Ancillary Summary (Word Format) */}
          <table className="w-full border-collapse border border-slate-900 border-t-0 text-[10px] text-slate-900">
            <tbody>
              <tr>
                <td className="border border-slate-900 border-t-0 py-1 px-2 font-semibold w-[28%] align-top">
                  Teaching-Related Assignments
                </td>
                <td className="border border-slate-900 border-t-0 py-1 px-2 w-[47%] align-top">
                  {ancillaryDescriptions.length > 0 ? (
                    <div className="space-y-0.5">
                      {ancillaryDescriptions.map((desc, idx) => (
                        <div key={idx}>{desc}</div>
                      ))}
                    </div>
                  ) : (
                    <span className="text-slate-500">None</span>
                  )}
                </td>
                <td className="border border-slate-900 border-t-0 py-1 px-2 text-center font-semibold w-[25%] align-middle">
                  {formatHours(totalAncillaryMinutes)} hours per week
                </td>
              </tr>
              <tr>
                <td className="border border-slate-900 py-1 px-2 font-semibold">
                  Number of Actual Teaching Loads
                </td>
                <td className="border border-slate-900 py-1 px-2 text-center">
                  {formatHours(totalTeachingMinutes / 5)} hours per day x 5
                </td>
                <td className="border border-slate-900 py-1 px-2 text-center font-semibold">
                  {formatHours(totalTeachingMinutes)} hours per week
                </td>
              </tr>
              <tr>
                <td colSpan={2} className="border border-slate-900 py-1 px-2 font-bold">
                  Total Number of Actual teaching and/or equivalent teaching related activities and duties
                </td>
                <td className="border border-slate-900 py-1 px-2 text-center font-bold">
                  {formatHours(totalTeachingMinutes + totalAncillaryMinutes)} hours per week
                </td>
              </tr>
            </tbody>
          </table>

          {/* 4-Tier Official Signatories */}
          <ScheduleSignatories
            schoolSettings={schoolSettings}
            level={effectiveCoordinatorLevel}
          />
        </div>

        {/* Official Footer pinned at bottom of the paper */}
        <div className="mt-auto pt-3">
          <DepEdDocumentFooter schoolSettings={schoolSettings} />
        </div>
      </div>
    </div>
  );
};
