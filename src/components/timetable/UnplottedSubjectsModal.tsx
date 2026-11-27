import React, { useEffect, useMemo, useRef, useState } from "react";
import type { Section, TeacherSubjectLoad } from "../../types";
import type { LoadScheduleCoverage } from "../../services/timetableService";
import {
  AlertTriangle,
  CalendarPlus,
  CheckCircle2,
  ListChecks,
  Search,
  X,
} from "lucide-react";

interface UnplottedSubjectsModalProps {
  isOpen: boolean;
  termLabel: string;
  loads: TeacherSubjectLoad[];
  sections: Section[];
  coverageByLoadId: Map<string, LoadScheduleCoverage>;
  isPrivileged: boolean;
  onScheduleLoad?: (load: TeacherSubjectLoad) => void;
  onClose: () => void;
}

type StatusFilter = "all" | "not_plotted" | "partial";

function formatMins(mins: number): string {
  const safe = Math.max(0, Math.round(mins));
  if (safe < 60) {
    return `${safe}m`;
  }
  const hrs = Math.floor(safe / 60);
  const rem = safe % 60;
  return rem === 0 ? `${hrs}h (${safe}m)` : `${hrs}h ${rem}m (${safe}m)`;
}

export const UnplottedSubjectsModal: React.FC<UnplottedSubjectsModalProps> = ({
  isOpen,
  termLabel,
  loads,
  sections,
  coverageByLoadId,
  isPrivileged,
  onScheduleLoad,
  onClose,
}) => {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sectionFilter, setSectionFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      if (!dialog.open) {
        dialog.showModal();
        closeBtnRef.current?.focus();
      }
    } else if (dialog.open) {
      dialog.returnValue = "";
      dialog.close();
    }
  }, [isOpen]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || "closedBy" in HTMLDialogElement.prototype) return;

    const handleClick = (e: MouseEvent) => {
      if (e.target === dialog) {
        onClose();
      }
    };
    dialog.addEventListener("click", handleClick);
    return () => dialog.removeEventListener("click", handleClick);
  }, [onClose]);

  const sortedSections = useMemo(() => {
    return [...sections].sort((a, b) => {
      if (a.grade_level !== b.grade_level) return a.grade_level - b.grade_level;
      return a.section_name.localeCompare(b.section_name);
    });
  }, [sections]);

  const allIncompleteItems = useMemo(() => {
    return loads
      .map((load) => {
        const fallbackTarget = load.target_minutes_weekly ?? load.teaching_minutes_weekly ?? 0;
        const cov = coverageByLoadId.get(load.id) || {
          plottedMinutes: 0,
          plottedSlots: 0,
          sectionSubjectPlottedMinutes: 0,
          targetMinutes: fallbackTarget,
          lackingMinutes: fallbackTarget,
          isUnassigned: fallbackTarget > 0,
          isIncomplete: fallbackTarget > 0,
        };
        return { load, cov };
      })
      .filter(({ cov }) => cov.isIncomplete)
      .sort((a, b) => {
        // Not plotted first, then by grade level, section, subject code
        if (a.cov.isUnassigned !== b.cov.isUnassigned) {
          return a.cov.isUnassigned ? -1 : 1;
        }
        const gradeA = a.load.section?.grade_level ?? 99;
        const gradeB = b.load.section?.grade_level ?? 99;
        if (gradeA !== gradeB) return gradeA - gradeB;
        const secA = a.load.section?.section_name || "";
        const secB = b.load.section?.section_name || "";
        const secCmp = secA.localeCompare(secB);
        if (secCmp !== 0) return secCmp;
        return (a.load.subject?.subject_code || "").localeCompare(
          b.load.subject?.subject_code || ""
        );
      });
  }, [loads, coverageByLoadId]);

  const notPlottedCount = useMemo(
    () => allIncompleteItems.filter(({ cov }) => cov.isUnassigned).length,
    [allIncompleteItems]
  );

  const partialCount = allIncompleteItems.length - notPlottedCount;
  const fullyPlottedCount = Math.max(0, loads.length - allIncompleteItems.length);

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return allIncompleteItems.filter(({ load, cov }) => {
      if (statusFilter === "not_plotted" && !cov.isUnassigned) return false;
      if (statusFilter === "partial" && cov.isUnassigned) return false;
      if (sectionFilter !== "all" && load.section_id !== sectionFilter) return false;

      if (!q) return true;
      const code = (load.subject?.subject_code || "").toLowerCase();
      const name = (load.subject?.subject_name || "").toLowerCase();
      const teacher = (load.teacher?.full_name || "").toLowerCase();
      const sec = load.section
        ? `grade ${load.section.grade_level} ${load.section.section_name}`.toLowerCase()
        : "";
      return code.includes(q) || name.includes(q) || teacher.includes(q) || sec.includes(q);
    });
  }, [allIncompleteItems, statusFilter, sectionFilter, searchQuery]);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="unplotted-tracker-title"
      onClose={onClose}
      {...({ closedby: "any" } as Record<string, string>)}
      className="m-auto w-[min(96vw,56rem)] max-h-[88vh] rounded-2xl border border-[#E3DDD1] bg-[#FFFFFF] p-0 text-[#1C2420] shadow-2xl backdrop:bg-[#1C2420]/55 backdrop:backdrop-blur-xs"
    >
      <div className="flex flex-col max-h-[88vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#E3DDD1] bg-[#FAF8F5] flex items-start justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#FBECEF] border border-[#F3B8C2] text-[#9E1B32] flex items-center justify-center shrink-0">
              <ListChecks className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <h2 id="unplotted-tracker-title" className="text-base font-bold text-[#1C2420]">
                Unplotted Subjects Tracker
              </h2>
              <p className="text-xs text-[#5C6660] mt-0.5">
                {termLabel} • Tracks assigned faculty loads missing or lacking slots in the Schedule Grid
              </p>
            </div>
          </div>
          <button
            ref={closeBtnRef}
            type="button"
            onClick={onClose}
            aria-label="Close tracker"
            className="p-2 rounded-lg text-[#5C6660] hover:bg-[#E3DDD1]/50 hover:text-[#1C2420] cursor-pointer"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        {/* Summary Counters + Filters */}
        <div className="px-6 py-4 border-b border-[#E3DDD1] space-y-3 shrink-0 bg-white">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div className="px-3.5 py-2.5 rounded-xl border border-[#F3B8C2] bg-[#FBECEF] flex items-center justify-between">
              <span className="text-xs font-semibold text-[#7F1528]">Not Plotted Yet (0 slots)</span>
              <span className="text-base font-bold text-[#9E1B32] tabular-nums">{notPlottedCount}</span>
            </div>
            <div className="px-3.5 py-2.5 rounded-xl border border-[#F59E0B]/40 bg-[#FEF3C7]/60 flex items-center justify-between">
              <span className="text-xs font-semibold text-[#92400E]">Partially Plotted (Lacking)</span>
              <span className="text-base font-bold text-[#B45309] tabular-nums">{partialCount}</span>
            </div>
            <div className="px-3.5 py-2.5 rounded-xl border border-[#B8CEC5] bg-[#E6EFEA]/70 flex items-center justify-between">
              <span className="text-xs font-semibold text-[#0F3D2E]">Fully Plotted Loads</span>
              <span className="text-base font-bold text-[#0F3D2E] tabular-nums">
                {fullyPlottedCount} / {loads.length}
              </span>
            </div>
          </div>

          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5">
            {/* Status filter tabs */}
            <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Filter by plot status">
              <button
                type="button"
                onClick={() => setStatusFilter("all")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                  statusFilter === "all"
                    ? "bg-[#0F3D2E] text-white"
                    : "bg-[#FAF8F5] border border-[#E3DDD1] text-[#404B45] hover:bg-[#F2F7F4]"
                }`}
              >
                All Pending ({allIncompleteItems.length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("not_plotted")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                  statusFilter === "not_plotted"
                    ? "bg-[#9E1B32] text-white"
                    : "bg-[#FAF8F5] border border-[#E3DDD1] text-[#404B45] hover:bg-[#FBECEF]"
                }`}
              >
                Not Plotted Yet ({notPlottedCount})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("partial")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                  statusFilter === "partial"
                    ? "bg-[#B45309] text-white"
                    : "bg-[#FAF8F5] border border-[#E3DDD1] text-[#404B45] hover:bg-[#FEF3C7]/60"
                }`}
              >
                Partially Plotted ({partialCount})
              </button>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <div className="relative">
                <Search
                  className="w-3.5 h-3.5 text-[#5C6660] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                  aria-hidden="true"
                />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search subject, section, teacher..."
                  aria-label="Search unplotted subjects"
                  className="w-full sm:w-56 pl-8 pr-3 py-1.5 rounded-lg border border-[#E3DDD1] bg-[#FAF8F5] text-xs text-[#1C2420] placeholder:text-[#5C6660]/70"
                />
              </div>

              <select
                value={sectionFilter}
                onChange={(e) => setSectionFilter(e.target.value)}
                aria-label="Filter by class section"
                className="py-1.5 px-2.5 rounded-lg border border-[#E3DDD1] bg-[#FAF8F5] text-xs text-[#1C2420] cursor-pointer"
              >
                <option value="all">All Sections</option>
                {sortedSections.map((sec) => (
                  <option key={sec.id} value={sec.id}>
                    Grade {sec.grade_level} - {sec.section_name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Body List */}
        <div className="overflow-y-auto flex-1 px-6 py-4">
          {allIncompleteItems.length === 0 ? (
            <div className="py-10 text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-[#E6EFEA] border border-[#B8CEC5] text-[#0F3D2E] flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" aria-hidden="true" />
              </div>
              <h3 className="text-sm font-bold text-[#1C2420]">
                All Subjects Are Fully Plotted
              </h3>
              <p className="text-xs text-[#5C6660] max-w-md mx-auto">
                Every assigned faculty subject load for {termLabel} meets its required weekly minutes on the Schedule Grid.
              </p>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="py-10 text-center text-xs text-[#5C6660]">
              No unplotted or incomplete subject loads match your current filter.
            </div>
          ) : (
            <div className="border border-[#E3DDD1] rounded-xl overflow-hidden">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#FAF8F5] border-b border-[#E3DDD1] text-[#5C6660] uppercase text-[11px] font-semibold">
                    <th className="py-2.5 px-3.5">Subject</th>
                    <th className="py-2.5 px-3.5">Class Section</th>
                    <th className="py-2.5 px-3.5">Faculty Member</th>
                    <th className="py-2.5 px-3.5">Grid Coverage</th>
                    {isPrivileged && onScheduleLoad && (
                      <th className="py-2.5 px-3.5 text-right">Action</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E3DDD1] bg-white">
                  {filteredItems.map(({ load, cov }) => {
                    const isUnassigned = cov.isUnassigned;
                    return (
                      <tr key={load.id} className="hover:bg-[#FAF8F5]/70 transition-colors">
                        <td className="py-2.5 px-3.5 align-top">
                          <div className="font-bold text-[#1C2420]">
                            {load.subject?.subject_code || "SUBJ"}
                          </div>
                          <div className="text-[11px] text-[#5C6660] line-clamp-1">
                            {load.subject?.subject_name || "Subject"}
                          </div>
                        </td>
                        <td className="py-2.5 px-3.5 align-top whitespace-nowrap font-medium text-[#1C2420]">
                          {load.section
                            ? `Grade ${load.section.grade_level} - ${load.section.section_name}`
                            : "Unassigned Section"}
                        </td>
                        <td className="py-2.5 px-3.5 align-top text-[#404B45]">
                          {load.teacher?.full_name || "Unassigned Teacher"}
                        </td>
                        <td className="py-2.5 px-3.5 align-top">
                          <div className="flex flex-col gap-1 items-start">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
                                isUnassigned
                                  ? "bg-[#FBECEF] border-[#F3B8C2] text-[#9E1B32]"
                                  : "bg-[#FEF3C7] border-[#F59E0B]/40 text-[#92400E]"
                              }`}
                            >
                              <AlertTriangle className="w-3 h-3 shrink-0" aria-hidden="true" />
                              <span>
                                {isUnassigned
                                  ? "Not Plotted Yet (0 slots)"
                                  : `Partial (${cov.plottedSlots} ${cov.plottedSlots === 1 ? "slot" : "slots"})`}
                              </span>
                            </span>
                            <span className="text-[11px] text-[#5C6660] tabular-nums">
                              Plotted: {formatMins(cov.sectionSubjectPlottedMinutes)} /{" "}
                              {formatMins(cov.targetMinutes)} •{" "}
                              <strong className="text-[#9E1B32]">
                                Lacks {formatMins(cov.lackingMinutes)}
                              </strong>
                            </span>
                          </div>
                        </td>
                        {isPrivileged && onScheduleLoad && (
                          <td className="py-2.5 px-3.5 align-top text-right whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => {
                                onClose();
                                onScheduleLoad(load);
                              }}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0F3D2E] hover:bg-[#0A2E22] text-white text-[11px] font-semibold cursor-pointer transition-colors"
                            >
                              <CalendarPlus className="w-3.5 h-3.5" aria-hidden="true" />
                              <span>Plot Slot</span>
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-[#E3DDD1] bg-[#FAF8F5] flex items-center justify-between gap-3 shrink-0">
          <span className="text-xs text-[#5C6660]">
            Showing <strong>{filteredItems.length}</strong> of{" "}
            <strong>{allIncompleteItems.length}</strong> pending subject load
            {allIncompleteItems.length === 1 ? "" : "s"}.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-[#E3DDD1] bg-white hover:bg-[#FAF8F5] text-xs font-semibold text-[#1C2420] cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </dialog>
  );
};
