import React, { useState, useMemo, useRef, useEffect } from "react";
import type {
  AcademicTerm,
  TeacherSubjectLoad,
  Profile,
  ScheduleEntry,
  TimeSlot,
  TimeSlotOverride,
  Section,
} from "../../types";
import {
  computeTeacherLoadingSummaries,
  computeLoadScheduleCoverage,
  deleteTeacherLoad,
  type LoadScheduleCoverage,
} from "../../services/timetableService";
import {
  Users,
  ShieldCheck,
  AlertTriangle,
  PlusCircle,
  Search,
  BookOpen,
  Trash2,
  Edit2,
  Clock,
  Copy,
  X,
  CheckCircle2,
  CalendarPlus,
  ListChecks,
} from "lucide-react";
import { UnplottedSubjectsModal } from "./UnplottedSubjectsModal";

interface FacultyLoadingTableProps {
  teachers: Profile[];
  loads: TeacherSubjectLoad[];
  scheduleEntries?: ScheduleEntry[];
  timeSlots?: TimeSlot[];
  timeSlotOverrides?: TimeSlotOverride[];
  sections?: Section[];
  terms?: AcademicTerm[];
  currentTerm?: AcademicTerm | null;
  isPrivileged: boolean;
  onOpenAssignLoad: (teacherId?: string) => void;
  onEditLoad: (load: TeacherSubjectLoad) => void;
  onLoadDeleted: (loadId: string) => void;
  onScheduleLoad?: (load: TeacherSubjectLoad) => void;
  onCopyFromTerm?: (
    sourceTermId: string,
    options?: { clearExisting?: boolean; includeScheduleGrid?: boolean }
  ) => Promise<{
    success: boolean;
    insertedCount: number;
    skippedCount: number;
    insertedScheduleCount: number;
    skippedScheduleCount: number;
    excludedByTermSubjectsCount?: number;
    clearedLoadsCount?: number;
    clearedScheduleCount?: number;
    error?: string;
  }>;
  onClearTermLoads?: () => Promise<{
    success: boolean;
    deletedLoadsCount: number;
    deletedScheduleCount: number;
    error?: string;
  }>;
}

function formatHoursAndMinutes(mins: number): string {
  const safe = Math.max(0, Math.round(mins));
  if (safe < 60) {
    return `${safe} ${safe === 1 ? "min" : "mins"}`;
  }
  const hrs = Math.floor(safe / 60);
  const rem = safe % 60;
  const hrLabel = `${hrs} ${hrs === 1 ? "hr" : "hrs"}`;
  if (rem === 0) {
    return `${hrLabel} (${safe} mins)`;
  }
  return `${hrLabel} ${rem}m (${safe} mins)`;
}

type PendingClearAction =
  | { mode: "clear-only" }
  | { mode: "clear-and-populate"; sourceTermId: string; includeScheduleGrid: boolean };

export const FacultyLoadingTable: React.FC<FacultyLoadingTableProps> = ({
  teachers,
  loads,
  scheduleEntries,
  timeSlots,
  timeSlotOverrides,
  sections,
  terms = [],
  currentTerm = null,
  isPrivileged,
  onOpenAssignLoad,
  onEditLoad,
  onLoadDeleted,
  onScheduleLoad,
  onCopyFromTerm,
  onClearTermLoads,
}) => {
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedDepartment, setSelectedDepartment] = useState<string>("All");
  const [showIncompleteOnly, setShowIncompleteOnly] = useState<boolean>(false);
  const [isUnplottedModalOpen, setIsUnplottedModalOpen] = useState<boolean>(false);

  const [isCopyModalOpen, setIsCopyModalOpen] = useState<boolean>(false);
  const [sourceTermId, setSourceTermId] = useState<string>("");
  const [includeScheduleGrid, setIncludeScheduleGrid] = useState<boolean>(true);
  const [clearBeforePopulate, setClearBeforePopulate] = useState<boolean>(false);
  const [isCopying, setIsCopying] = useState<boolean>(false);
  const [isClearing, setIsClearing] = useState<boolean>(false);
  const [pendingClearAction, setPendingClearAction] = useState<PendingClearAction | null>(null);
  const [pendingDeleteLoad, setPendingDeleteLoad] = useState<{
    load: TeacherSubjectLoad;
    slotCount: number;
  } | null>(null);
  const [isDeletingSingle, setIsDeletingSingle] = useState<boolean>(false);

  const [copyStatus, setCopyStatus] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const clearDialogRef = useRef<HTMLDialogElement | null>(null);
  const clearCancelBtnRef = useRef<HTMLButtonElement | null>(null);
  const deleteLoadDialogRef = useRef<HTMLDialogElement | null>(null);
  const deleteCancelBtnRef = useRef<HTMLButtonElement | null>(null);

  const otherTerms = useMemo(() => {
    return terms.filter((t) => t.id !== currentTerm?.id);
  }, [terms, currentTerm?.id]);

  const currentTermLabel = currentTerm
    ? `SY ${currentTerm.school_year} • Term ${currentTerm.term_number}`
    : "Current Term";

  const hasCurrentTermData = loads.length > 0 || (scheduleEntries?.length ?? 0) > 0;

  // Manage native modal <dialog> for Clear All Confirmation Pop-up
  useEffect(() => {
    const dialog = clearDialogRef.current;
    if (!dialog) return;

    if (pendingClearAction) {
      if (!dialog.open) {
        dialog.showModal();
        clearCancelBtnRef.current?.focus();
      }
    } else if (dialog.open) {
      dialog.returnValue = "";
      dialog.close();
    }
  }, [pendingClearAction]);

  // Light-dismiss backdrop fallback when closedby is unsupported
  useEffect(() => {
    const dialog = clearDialogRef.current;
    if (!dialog || "closedBy" in HTMLDialogElement.prototype) return;

    let pressedOutside = false;
    const isOutside = (e: PointerEvent) => {
      const r = dialog.getBoundingClientRect();
      return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
    };
    const onPointerDown = (e: PointerEvent) => {
      pressedOutside = isOutside(e);
    };
    const onPointerUp = (e: PointerEvent) => {
      if (pressedOutside && isOutside(e) && !isClearing && !isCopying) {
        setPendingClearAction(null);
      }
      pressedOutside = false;
    };

    dialog.addEventListener("pointerdown", onPointerDown);
    dialog.addEventListener("pointerup", onPointerUp);
    return () => {
      dialog.removeEventListener("pointerdown", onPointerDown);
      dialog.removeEventListener("pointerup", onPointerUp);
    };
  }, [isClearing, isCopying]);

  // Manage native modal <dialog> for Single Load Delete Confirmation Pop-up
  useEffect(() => {
    const dialog = deleteLoadDialogRef.current;
    if (!dialog) return;

    if (pendingDeleteLoad) {
      if (!dialog.open) {
        dialog.showModal();
        deleteCancelBtnRef.current?.focus();
      }
    } else if (dialog.open) {
      dialog.returnValue = "";
      dialog.close();
    }
  }, [pendingDeleteLoad]);

  useEffect(() => {
    const dialog = deleteLoadDialogRef.current;
    if (!dialog || "closedBy" in HTMLDialogElement.prototype) return;

    let pressedOutside = false;
    const isOutside = (e: PointerEvent) => {
      const r = dialog.getBoundingClientRect();
      return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
    };
    const onPointerDown = (e: PointerEvent) => {
      pressedOutside = isOutside(e);
    };
    const onPointerUp = (e: PointerEvent) => {
      if (pressedOutside && isOutside(e) && !isDeletingSingle) {
        setPendingDeleteLoad(null);
      }
      pressedOutside = false;
    };

    dialog.addEventListener("pointerdown", onPointerDown);
    dialog.addEventListener("pointerup", onPointerUp);
    return () => {
      dialog.removeEventListener("pointerdown", onPointerDown);
      dialog.removeEventListener("pointerup", onPointerUp);
    };
  }, [isDeletingSingle]);

  const handleOpenCopyModal = () => {
    const preferred =
      otherTerms.find((t) => t.is_active) ||
      otherTerms.find((t) => currentTerm && t.term_number < currentTerm.term_number) ||
      otherTerms[0];
    setSourceTermId(preferred?.id || "");
    setIncludeScheduleGrid(true);
    setClearBeforePopulate(false);
    setCopyStatus(null);
    setIsCopyModalOpen(true);
  };

  const executeCopyFromTerm = async (
    srcTermId: string,
    clearExisting: boolean,
    withScheduleGrid: boolean
  ) => {
    if (!srcTermId || !onCopyFromTerm) return;

    setIsCopying(true);
    setCopyStatus(null);
    try {
      const res = await onCopyFromTerm(srcTermId, {
        clearExisting,
        includeScheduleGrid: withScheduleGrid,
      });
      if (!res.success) {
        setCopyStatus({
          type: "error",
          text: res.error || "Unable to populate faculty loads and schedule from the selected term.",
        });
        return;
      }

      const src = otherTerms.find((t) => t.id === srcTermId);
      const srcLabel = src ? `SY ${src.school_year} • Term ${src.term_number}` : "selected term";
      const clearedText =
        clearExisting && ((res.clearedLoadsCount || 0) > 0 || (res.clearedScheduleCount || 0) > 0)
          ? `Cleared ${res.clearedLoadsCount || 0} old loads & ${res.clearedScheduleCount || 0} grid slots. `
          : "";
      const skippedText = withScheduleGrid
        ? res.skippedCount > 0 || res.skippedScheduleCount > 0
          ? ` (${res.skippedCount} existing loads, ${res.skippedScheduleCount} conflicting slots skipped)`
          : ""
        : res.skippedCount > 0
          ? ` (${res.skippedCount} existing loads skipped)`
          : "";
      const omittedText =
        res.excludedByTermSubjectsCount && res.excludedByTermSubjectsCount > 0
          ? ` • ${res.excludedByTermSubjectsCount} omitted (not in Term ${currentTerm?.term_number || ""} Subject List)`
          : "";

      setCopyStatus({
        type: "success",
        text: withScheduleGrid
          ? `${clearedText}Populated ${res.insertedCount} subject loads and ${res.insertedScheduleCount} schedule grid slots from ${srcLabel}${skippedText}${omittedText}.`
          : `${clearedText}Populated ${res.insertedCount} faculty subject loads (schedule grid excluded) from ${srcLabel}${skippedText}${omittedText}.`,
      });
      setIsCopyModalOpen(false);
      setPendingClearAction(null);
    } finally {
      setIsCopying(false);
    }
  };

  const handleConfirmCopy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sourceTermId || !onCopyFromTerm) return;

    // Require explicit confirmation pop-up if clearing existing loads & schedule grid first
    if (clearBeforePopulate && hasCurrentTermData) {
      setIsCopyModalOpen(false);
      setPendingClearAction({
        mode: "clear-and-populate",
        sourceTermId,
        includeScheduleGrid,
      });
      return;
    }

    await executeCopyFromTerm(sourceTermId, false, includeScheduleGrid);
  };

  const handleConfirmClearAction = async () => {
    if (!pendingClearAction) return;

    if (pendingClearAction.mode === "clear-and-populate") {
      await executeCopyFromTerm(
        pendingClearAction.sourceTermId,
        true,
        pendingClearAction.includeScheduleGrid
      );
      return;
    }

    if (!onClearTermLoads) return;
    setIsClearing(true);
    setCopyStatus(null);
    try {
      const res = await onClearTermLoads();
      if (!res.success) {
        setCopyStatus({
          type: "error",
          text: res.error || "Unable to clear current term faculty loads.",
        });
        setPendingClearAction(null);
        return;
      }
      setCopyStatus({
        type: "success",
        text: `Cleared ${res.deletedLoadsCount} subject load(s) and ${res.deletedScheduleCount} assigned schedule grid slot(s) for ${currentTermLabel}.`,
      });
      setPendingClearAction(null);
    } finally {
      setIsClearing(false);
    }
  };

  const coverageByLoadId = useMemo(() => {
    const map = new Map<string, LoadScheduleCoverage>();
    const entries = scheduleEntries || [];
    const slots = timeSlots || [];
    const overrides = timeSlotOverrides || [];
    const secs = sections || [];
    for (const load of loads) {
      map.set(load.id, computeLoadScheduleCoverage(load, entries, slots, overrides, secs));
    }
    return map;
  }, [loads, scheduleEntries, timeSlots, timeSlotOverrides, sections]);

  const summaries = useMemo(() => {
    return computeTeacherLoadingSummaries(
      teachers,
      loads,
      scheduleEntries,
      timeSlots,
      timeSlotOverrides,
      sections
    );
  }, [teachers, loads, scheduleEntries, timeSlots, timeSlotOverrides, sections]);

  const { incompleteLoadsCount, incompleteTeacherIds } = useMemo(() => {
    let count = 0;
    const teacherIds = new Set<string>();
    for (const load of loads) {
      const cov = coverageByLoadId.get(load.id);
      if (cov?.isIncomplete) {
        count += 1;
        teacherIds.add(load.teacher_id);
      }
    }
    return { incompleteLoadsCount: count, incompleteTeacherIds: teacherIds };
  }, [loads, coverageByLoadId]);

  const departments = useMemo(() => {
    const set = new Set<string>();
    teachers.forEach((t) => {
      if (t.department) set.add(t.department);
    });
    return ["All", ...Array.from(set)];
  }, [teachers]);

  const filteredSummaries = useMemo(() => {
    return summaries.filter((s) => {
      if (selectedDepartment !== "All" && s.department !== selectedDepartment) return false;
      if (showIncompleteOnly && incompleteLoadsCount > 0 && !incompleteTeacherIds.has(s.teacher_id)) {
        return false;
      }
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        return (
          s.full_name.toLowerCase().includes(query) ||
          s.email.toLowerCase().includes(query) ||
          s.department.toLowerCase().includes(query)
        );
      }
      return true;
    });
  }, [summaries, selectedDepartment, showIncompleteOnly, incompleteLoadsCount, incompleteTeacherIds, searchQuery]);

  // Overall statistics
  const stats = useMemo(() => {
    const totalTeachers = summaries.length;
    const compliantCount = summaries.filter((s) => s.is_magna_carta_compliant).length;
    const totalTeachingMins = summaries.reduce((acc, s) => acc + s.total_teaching_minutes, 0);
    const assignedTeachers = summaries.filter((s) => s.loads.length > 0).length;

    return { totalTeachers, compliantCount, totalTeachingMins, assignedTeachers };
  }, [summaries]);

  const handleRequestDeleteLoad = (load: TeacherSubjectLoad) => {
    const cov = coverageByLoadId.get(load.id);
    setPendingDeleteLoad({
      load,
      slotCount: cov?.plottedSlots ?? load.plotted_slot_count ?? 0,
    });
  };

  const handleConfirmDeleteLoad = async () => {
    if (!pendingDeleteLoad) return;
    setIsDeletingSingle(true);
    try {
      const ok = await deleteTeacherLoad(pendingDeleteLoad.load.id);
      if (ok) {
        onLoadDeleted(pendingDeleteLoad.load.id);
        setPendingDeleteLoad(null);
      }
    } finally {
      setIsDeletingSingle(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Magna Carta Compliance Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-sand-200 rounded-2xl p-5 shadow-xs flex items-center gap-4 transition-colors">
          <div className="w-12 h-12 rounded-xl bg-cyprus-50 border border-cyprus-200 flex items-center justify-center text-cyprus-800 shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-semibold text-sand-700">
              Active Faculty Roster
            </div>
            <div className="text-2xl font-extrabold text-cyprus-900 font-display">
              {stats.assignedTeachers} / {stats.totalTeachers}
            </div>
            <div className="text-[11px] text-sand-600">
              Assigned teaching loads
            </div>
          </div>
        </div>

        <div className="bg-white border border-sand-200 rounded-2xl p-5 shadow-xs flex items-center gap-4 transition-colors">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-semibold text-sand-700">
              Magna Carta Compliant
            </div>
            <div className="text-2xl font-extrabold text-emerald-600 font-display">
              {stats.compliantCount} / {stats.totalTeachers}
            </div>
            <div className="text-[11px] text-sand-600">
              ≤ 6 hours/day direct load
            </div>
          </div>
        </div>

        <div className="bg-white border border-sand-200 rounded-2xl p-5 shadow-xs flex items-center gap-4 transition-colors">
          <div className="w-12 h-12 rounded-xl bg-sand-100 border border-sand-300 flex items-center justify-center text-sand-700 shrink-0">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-semibold text-sand-700">
              School Teaching Hours
            </div>
            <div className="text-2xl font-extrabold text-cyprus-900 font-display">
              {Math.round(stats.totalTeachingMins / 60)} hrs
            </div>
            <div className="text-[11px] text-sand-600">
              {stats.totalTeachingMins.toLocaleString()} weekly minutes
            </div>
          </div>
        </div>

        <div className="bg-white border border-sand-200 rounded-2xl p-5 shadow-xs flex items-center gap-4 transition-colors">
          <div className="w-12 h-12 rounded-xl bg-crimson-50 border border-crimson-200 flex items-center justify-center text-crimson-600 shrink-0">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-semibold text-sand-700">
              Total Subject Loads
            </div>
            <div className="text-2xl font-extrabold text-crimson-600 font-display">
              {loads.length}
            </div>
            <div className="text-[11px] text-sand-600">
              Active assignments
            </div>
          </div>
        </div>
      </div>

      {/* 2. Filter & Controls Bar */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-sand-200 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 transition-colors">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-sand-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search faculty name or department..."
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-sand-300 bg-sand-50 text-xs sm:text-sm text-cyprus-900 placeholder:text-sand-400 focus-visible:ring-2 focus-visible:ring-crimson-600"
            />
          </div>

          <div className="flex items-center gap-2">
            <label htmlFor="dept-filter" className="text-xs font-semibold text-sand-700 shrink-0">
              Department:
            </label>
            <select
              id="dept-filter"
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              className="py-2 px-3 rounded-xl border border-sand-300 bg-sand-50 text-xs text-cyprus-900 focus-visible:ring-2 focus-visible:ring-crimson-600 cursor-pointer"
            >
              {departments.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setIsUnplottedModalOpen(true)}
            className={`px-3.5 py-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap ${
              incompleteLoadsCount > 0
                ? "border-[#F3B8C2] bg-[#FBECEF] hover:bg-[#9E1B32] text-[#9E1B32] hover:text-white"
                : "border-[#B8CEC5] bg-[#E6EFEA] hover:bg-[#0F3D2E] text-[#0F3D2E] hover:text-white"
            }`}
          >
            <ListChecks className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>Track Unplotted ({incompleteLoadsCount})</span>
          </button>

          {isPrivileged && (
            <>
              {onCopyFromTerm && otherTerms.length > 0 && (
                <button
                  type="button"
                  onClick={handleOpenCopyModal}
                  className="px-3.5 py-2.5 rounded-xl border border-[#0F3D2E] bg-[#E6EFEA] hover:bg-[#0F3D2E] text-[#0F3D2E] hover:text-white text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap"
                >
                  <Copy className="w-4 h-4 shrink-0" />
                  <span>Populate from Term...</span>
                </button>
              )}

              {onClearTermLoads && hasCurrentTermData && (
                <button
                  type="button"
                  onClick={() => setPendingClearAction({ mode: "clear-only" })}
                  className="px-3.5 py-2.5 rounded-xl border border-[#F3B8C2] bg-[#FBECEF] hover:bg-[#9E1B32] text-[#9E1B32] hover:text-white text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap"
                >
                  <Trash2 className="w-4 h-4 shrink-0" />
                  <span>Clear Current Loads</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => onOpenAssignLoad()}
                className="px-4 py-2.5 rounded-xl bg-[#0F3D2E] hover:bg-[#0A2E22] text-white text-xs font-semibold shadow-xs flex items-center justify-center gap-2 cursor-pointer transition-colors shrink-0 whitespace-nowrap"
              >
                <PlusCircle className="w-4 h-4 shrink-0" />
                <span>Assign Subject Load</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Schedule Grid Lacking Hours / Unscheduled Notice */}
      {incompleteLoadsCount > 0 && (
        <div
          role="status"
          className="p-4 rounded-2xl border border-[#F3B8C2] bg-[#FBECEF] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
        >
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#FFFFFF] border border-[#F3B8C2] text-[#9E1B32] flex items-center justify-center shrink-0 mt-0.5">
              <AlertTriangle className="w-4 h-4" aria-hidden="true" />
            </div>
            <div>
              <p className="text-xs sm:text-sm font-bold text-[#7F1528]">
                Schedule Grid Notice: {incompleteLoadsCount} subject{" "}
                {incompleteLoadsCount === 1 ? "load is" : "loads are"} not yet fully assigned to the Schedule Grid
              </p>
              <p className="text-xs text-[#9E1B32] mt-0.5">
                {incompleteTeacherIds.size} faculty{" "}
                {incompleteTeacherIds.size === 1 ? "member has" : "members have"} subject loads lacking weekly scheduled hours. Plot the remaining time slots on the Schedule Grid so SF7 and weekly loads match.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setIsUnplottedModalOpen(true)}
              className="px-3.5 py-2 min-h-[38px] rounded-xl text-xs font-semibold border border-[#9E1B32] bg-[#9E1B32] hover:bg-[#7F1528] text-white transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5"
            >
              <ListChecks className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <span>View Unplotted Subjects ({incompleteLoadsCount})</span>
            </button>

            <button
              type="button"
              onClick={() => setShowIncompleteOnly((prev) => !prev)}
              className={`px-3.5 py-2 min-h-[38px] rounded-xl text-xs font-semibold border transition-colors cursor-pointer whitespace-nowrap ${
                showIncompleteOnly
                  ? "bg-[#7F1528] border-[#7F1528] text-white"
                  : "bg-[#FFFFFF] border-[#F3B8C2] text-[#9E1B32] hover:bg-[#9E1B32] hover:text-white"
              }`}
            >
              {showIncompleteOnly
                ? `Showing Incomplete (${incompleteTeacherIds.size}) • Show All`
                : `Filter Incomplete Only (${incompleteTeacherIds.size})`}
            </button>
          </div>
        </div>
      )}

      {copyStatus && (
        <div
          role="status"
          className={`p-3.5 rounded-xl border text-xs font-medium flex items-center justify-between gap-2 ${
            copyStatus.type === "success"
              ? "bg-[#E6EFEA] border-[#B8CEC5] text-[#0F3D2E]"
              : "bg-[#FBECEF] border-[#9E1B32]/30 text-[#9E1B32]"
          }`}
        >
          <div className="flex items-center gap-2">
            {copyStatus.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 shrink-0" />
            )}
            <span>{copyStatus.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setCopyStatus(null)}
            className="p-1 rounded hover:bg-black/5 cursor-pointer"
            aria-label="Dismiss notification"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 3. Detailed Faculty Loads Table */}
      <div className="bg-white rounded-2xl border border-sand-200 shadow-xs overflow-hidden transition-colors">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="bg-sand-50 border-b border-sand-200 text-sand-600 uppercase text-[11px] font-semibold tracking-wider">
                <th className="py-3 px-4">Faculty Member</th>
                <th className="py-3 px-4">Assigned Loads & Sections</th>
                <th className="py-3 px-4">Teaching Minutes</th>
                <th className="py-3 px-4">Ancillary Load</th>
                <th className="py-3 px-4">Magna Carta Status</th>
                {isPrivileged && <th className="py-3 px-4 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-sand-100">
              {filteredSummaries.map((summary) => (
                <tr
                  key={summary.teacher_id}
                  className="hover:bg-sand-50/80 transition-colors"
                >
                  {/* Teacher Profile */}
                  <td className="py-3.5 px-4 align-top">
                    <div className="font-semibold text-cyprus-900">
                      {summary.full_name}
                    </div>
                    <div className="text-sand-600 font-mono text-xs">
                      {summary.email}
                    </div>
                    <div className="text-[11px] text-sand-500 mt-0.5">
                      {summary.designation} • {summary.department}
                    </div>
                  </td>

                  {/* Assigned Loads */}
                  <td className="py-3.5 px-4 align-top">
                    {summary.loads.length === 0 ? (
                      <span className="text-sand-400 italic">No teaching loads assigned</span>
                    ) : (
                      <div className="space-y-2">
                        {summary.loads.map((load) => {
                          const coverage = coverageByLoadId.get(load.id);
                          const isIncomplete = Boolean(coverage?.isIncomplete);
                          const plottedSlots = coverage?.plottedSlots ?? load.plotted_slot_count ?? 0;

                          return (
                            <div
                              key={load.id}
                              className={`p-2.5 rounded-lg border text-xs space-y-1.5 ${
                                isIncomplete
                                  ? "bg-[#FDF5F6] border-[#F3B8C2]"
                                  : "bg-sand-50 border-sand-200"
                              }`}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <span className="font-semibold text-cyprus-900">
                                    {load.subject?.subject_code}: {load.subject?.subject_name}
                                  </span>
                                  <span className="block text-[11px] text-sand-600">
                                    Grade {load.section?.grade_level} - {load.section?.section_name} (
                                    {coverage?.targetMinutes ||
                                      load.target_minutes_weekly ||
                                      load.teaching_minutes_weekly}{" "}
                                    mins/wk
                                    {load.session_minutes ? ` • ${load.session_minutes}m/sess` : ""}
                                    {` • ${plottedSlots} ${plottedSlots === 1 ? "slot" : "slots"}`}
                                    {(load.room?.room_number || load.section?.room?.room_number)
                                      ? ` • ${load.room?.room_number || load.section?.room?.room_number}`
                                      : ""}
                                    )
                                  </span>
                                </div>
                                {isPrivileged && (
                                  <div className="flex items-center gap-1 ml-2 shrink-0">
                                    <button
                                      type="button"
                                      onClick={() => onEditLoad(load)}
                                      className="p-1 text-sand-500 hover:text-[#0F3D2E] rounded-md cursor-pointer"
                                      title="Edit weekly minutes / ancillary"
                                      aria-label={`Edit load ${load.subject?.subject_code}`}
                                    >
                                      <Edit2 className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleRequestDeleteLoad(load)}
                                      className="p-1 text-sand-400 hover:text-crimson-600 rounded-md cursor-pointer"
                                      title="Remove load and assigned schedule slots"
                                      aria-label={`Remove load ${load.subject?.subject_code}`}
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                )}
                              </div>

                              {/* Schedule Grid Coverage Notice */}
                              {coverage && isIncomplete && (
                                <div className="flex flex-wrap items-center justify-between gap-2 pt-1.5 border-t border-[#F3B8C2]/70">
                                  <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#9E1B32]">
                                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                                    <span>
                                      {coverage.isUnassigned
                                        ? `Not yet assigned to Schedule Grid • Lacks ${formatHoursAndMinutes(coverage.lackingMinutes)}`
                                        : `Schedule Grid lacking ${formatHoursAndMinutes(coverage.lackingMinutes)} (${coverage.sectionSubjectPlottedMinutes}/${coverage.targetMinutes}m plotted)`}
                                    </span>
                                  </span>

                                  {isPrivileged && onScheduleLoad && (
                                    <button
                                      type="button"
                                      onClick={() => onScheduleLoad(load)}
                                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#FFFFFF] border border-[#F3B8C2] hover:bg-[#9E1B32] text-[#9E1B32] hover:text-white text-[11px] font-semibold transition-colors cursor-pointer shrink-0"
                                    >
                                      <CalendarPlus className="w-3 h-3 shrink-0" aria-hidden="true" />
                                      <span>Plot Slot</span>
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </td>

                  {/* Teaching Minutes & Progress */}
                  <td className="py-3.5 px-4 align-top">
                    <div className="font-bold text-cyprus-900">
                      {summary.total_teaching_minutes} / 1,800 mins
                    </div>
                    <div className="text-xs text-sand-500">
                      ~{Math.round(summary.total_teaching_minutes / 60)} hrs / week
                    </div>
                    {/* Visual Progress Bar */}
                    <div className="w-28 h-1.5 bg-sand-200 rounded-full mt-1.5 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          summary.total_teaching_minutes > 1800
                            ? "bg-crimson-600"
                            : "bg-emerald-600"
                        }`}
                        style={{
                          width: `${Math.min(100, (summary.total_teaching_minutes / 1800) * 100)}%`,
                        }}
                      />
                    </div>
                  </td>

                  {/* Ancillary Load */}
                  <td className="py-3.5 px-4 align-top">
                    <div className="text-xs font-semibold text-cyprus-900">
                      {summary.total_ancillary_minutes} mins / week
                    </div>
                    <div className="text-[11px] text-sand-600 max-w-[200px] truncate">
                      {summary.loads.find((l) => l.ancillary_description)?.ancillary_description || "Standard prep & checking"}
                    </div>
                  </td>

                  {/* Magna Carta Compliance Badge */}
                  <td className="py-3.5 px-4 align-top">
                    {summary.is_magna_carta_compliant ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>Compliant</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-crimson-50 text-crimson-700 border border-crimson-200">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>Overload (&gt;6h/d)</span>
                      </span>
                    )}
                  </td>

                  {/* Actions */}
                  {isPrivileged && (
                    <td className="py-3.5 px-4 align-top text-right">
                      <button
                        type="button"
                        onClick={() => onOpenAssignLoad(summary.teacher_id)}
                        className="p-1.5 rounded-lg border border-sand-300 text-sand-700 hover:bg-sand-100 cursor-pointer text-xs font-medium whitespace-nowrap"
                      >
                        + Add Load
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Populate from Term Modal */}
      {isCopyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs"
            onClick={() => !isCopying && setIsCopyModalOpen(false)}
            aria-hidden="true"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="copy-term-loads-title"
            className="relative bg-white w-full max-w-md rounded-2xl border border-[#E3DDD1] shadow-2xl p-6 space-y-4 z-10"
          >
            <div className="flex items-center justify-between border-b border-[#E3DDD1] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#E6EFEA] text-[#0F3D2E] flex items-center justify-center">
                  <Copy className="w-4 h-4" />
                </div>
                <div>
                  <h2 id="copy-term-loads-title" className="text-base font-bold text-[#1C2420]">
                    Populate Term Faculty Loads
                  </h2>
                  <p className="text-xs text-[#5C6660]">
                    {includeScheduleGrid
                      ? "Copy loads & schedule grid into "
                      : "Copy faculty loads only into "}
                    <strong className="text-[#1C2420]">{currentTermLabel}</strong>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => !isCopying && setIsCopyModalOpen(false)}
                className="p-1.5 rounded-lg text-[#5C6660] hover:bg-[#FAF8F5] cursor-pointer"
                aria-label="Close dialog"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {copyStatus?.type === "error" && (
              <div
                role="alert"
                className="p-3 rounded-xl bg-[#FBECEF] border border-[#9E1B32]/30 text-xs text-[#9E1B32]"
              >
                {copyStatus.text}
              </div>
            )}

            <form onSubmit={handleConfirmCopy} className="space-y-4">
              <div>
                <label
                  htmlFor="copy-source-term"
                  className="block text-xs font-semibold text-[#1C2420] mb-1"
                >
                  {includeScheduleGrid
                    ? "Copy Faculty Loads & Schedule Grid From:"
                    : "Copy Faculty Loads From:"}
                </label>
                <select
                  id="copy-source-term"
                  value={sourceTermId}
                  onChange={(e) => setSourceTermId(e.target.value)}
                  required
                  className="w-full py-2 px-3 rounded-xl border border-[#E3DDD1] bg-[#FAF8F5] text-xs font-medium text-[#1C2420] focus:outline-none focus:ring-2 focus:ring-[#0F3D2E]"
                >
                  {otherTerms.map((t) => (
                    <option key={t.id} value={t.id}>
                      SY {t.school_year} • Term {t.term_number} {t.is_active ? "(Active)" : ""}
                    </option>
                  ))}
                </select>
              </div>

              <label
                className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition-colors ${
                  includeScheduleGrid
                    ? "bg-[#E6EFEA]/60 border-[#0F3D2E]/30"
                    : "bg-[#FAF8F5] border-[#E3DDD1]"
                }`}
              >
                <input
                  type="checkbox"
                  checked={includeScheduleGrid}
                  onChange={(e) => setIncludeScheduleGrid(e.target.checked)}
                  className="mt-0.5 rounded border-[#0F3D2E] accent-[#0F3D2E] cursor-pointer"
                />
                <span className="text-xs text-[#5C6660] leading-relaxed">
                  <strong className="block text-[#1C2420]">
                    Also populate Schedule Grid slots
                  </strong>
                  {includeScheduleGrid ? (
                    <>
                      Copies matching teacher subject loads, weekly minutes, ancillary duties,{" "}
                      <strong className="text-[#1C2420]">and plotted Schedule Grid slots</strong>{" "}
                      into Term {currentTerm?.term_number || ""} (subjects not in this term&apos;s
                      Term Subject List are excluded).
                    </>
                  ) : (
                    <>
                      Unchecked: populates{" "}
                      <strong className="text-[#1C2420]">faculty subject loads only</strong>{" "}
                      (weekly minutes &amp; ancillary duties) for subjects in this term&apos;s Term
                      Subject List, without copying the Schedule Grid.
                    </>
                  )}
                </span>
              </label>

              {hasCurrentTermData && (
                <label className="flex items-start gap-2.5 p-3 rounded-xl bg-[#FBECEF] border border-[#F3B8C2] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={clearBeforePopulate}
                    onChange={(e) => setClearBeforePopulate(e.target.checked)}
                    className="mt-0.5 rounded border-[#9E1B32] accent-[#9E1B32] cursor-pointer"
                  />
                  <span className="text-xs text-[#7F1528] leading-snug">
                    <strong className="block">Clear current term loads &amp; schedule grid first</strong>
                    Removes all {loads.length} load(s) and {scheduleEntries?.length ?? 0} grid slot(s) in Term {currentTerm?.term_number || ""} before populating (confirmation required).
                  </span>
                </label>
              )}

              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#E3DDD1]">
                {onClearTermLoads && hasCurrentTermData ? (
                  <button
                    type="button"
                    onClick={() => {
                      setIsCopyModalOpen(false);
                      setPendingClearAction({ mode: "clear-only" });
                    }}
                    disabled={isCopying || isClearing}
                    className="px-3 py-2 text-xs font-semibold rounded-xl border border-[#F3B8C2] bg-[#FBECEF] text-[#9E1B32] hover:bg-[#9E1B32] hover:text-white cursor-pointer flex items-center gap-1.5 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Clear Current Loads</span>
                  </button>
                ) : (
                  <span />
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsCopyModalOpen(false)}
                    disabled={isCopying}
                    className="px-4 py-2 text-xs font-semibold rounded-xl border border-[#E3DDD1] text-[#5C6660] hover:bg-[#FAF8F5] cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isCopying || !sourceTermId}
                    className={`px-4 py-2 text-xs font-semibold rounded-xl text-white cursor-pointer disabled:opacity-50 flex items-center gap-1.5 ${
                      clearBeforePopulate && hasCurrentTermData
                        ? "bg-[#9E1B32] hover:bg-[#7F1528]"
                        : "bg-[#0F3D2E] hover:bg-[#0A2E22]"
                    }`}
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>
                      {isCopying
                        ? "Populating..."
                        : clearBeforePopulate && hasCurrentTermData
                          ? "Clear & Populate..."
                          : "Populate Term Loads"}
                    </span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Native Accessible Confirmation Pop-up: Clear Current Term Loads & Schedule Grid */}
      <dialog
        ref={clearDialogRef}
        aria-labelledby="clear-confirm-title"
        onClose={() => {
          if (clearDialogRef.current) clearDialogRef.current.returnValue = "";
          if (!isClearing && !isCopying) {
            setPendingClearAction(null);
          }
        }}
        onCancel={(e) => {
          if (isClearing || isCopying) e.preventDefault();
        }}
        {...({ closedby: isClearing || isCopying ? "none" : "any" } as Record<string, string>)}
        className="m-auto w-[min(92vw,28rem)] rounded-2xl border border-[#E3DDD1] bg-[#FFFFFF] p-0 text-[#1C2420] shadow-2xl backdrop:bg-[#1C2420]/55 backdrop:backdrop-blur-xs"
      >
        {pendingClearAction && (
          <div className="p-6 space-y-4">
            <div className="flex items-start justify-between gap-3 border-b border-[#E3DDD1] pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#FBECEF] border border-[#F3B8C2] text-[#9E1B32] flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5" aria-hidden="true" />
                </div>
                <div>
                  <h1 id="clear-confirm-title" className="text-base font-bold text-[#1C2420]">
                    {pendingClearAction.mode === "clear-and-populate"
                      ? "Warning: Clear All & Repopulate Term?"
                      : "Warning: Clear All Current Term Loads?"}
                  </h1>
                  <p className="text-xs font-mono text-[#5C6660]">{currentTermLabel}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => !isClearing && !isCopying && setPendingClearAction(null)}
                disabled={isClearing || isCopying}
                aria-label="Close confirmation dialog"
                className="p-1.5 rounded-lg text-[#5C6660] hover:bg-[#FAF8F5] cursor-pointer disabled:opacity-50"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-[#FBECEF] border border-[#F3B8C2] text-xs text-[#7F1528] space-y-1.5 leading-relaxed">
              <p className="font-semibold">
                This action will permanently clear ALL faculty subject loads and assigned Schedule Grid entries for {currentTermLabel}:
              </p>
              <ul className="list-disc pl-4 space-y-0.5">
                <li>
                  <strong>{loads.length}</strong> faculty subject{" "}
                  {loads.length === 1 ? "load" : "loads"} will be deleted
                </li>
                <li>
                  <strong>{scheduleEntries?.length ?? 0}</strong> Schedule Grid{" "}
                  {(scheduleEntries?.length ?? 0) === 1 ? "slot" : "slots"} will be deleted
                </li>
              </ul>
              {pendingClearAction.mode === "clear-and-populate" && (
                <p className="pt-1 font-medium">
                  Immediately afterwards,{" "}
                  {pendingClearAction.includeScheduleGrid
                    ? "faculty loads and schedule grid slots"
                    : "faculty loads only (excluding the schedule grid)"}{" "}
                  will be populated from the selected source term.
                </p>
              )}
            </div>

            <p className="text-xs text-[#5C6660]">
              Other academic terms will not be affected. This cannot be undone.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E3DDD1]">
              <button
                ref={clearCancelBtnRef}
                type="button"
                onClick={() => setPendingClearAction(null)}
                disabled={isClearing || isCopying}
                className="px-4 py-2 min-h-[40px] text-xs font-semibold rounded-xl border border-[#E3DDD1] text-[#1C2420] hover:bg-[#FAF8F5] cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmClearAction}
                disabled={isClearing || isCopying}
                className="px-4 py-2 min-h-[40px] text-xs font-semibold rounded-xl bg-[#9E1B32] hover:bg-[#7F1528] text-white cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                <span>
                  {isClearing || isCopying
                    ? pendingClearAction.mode === "clear-and-populate"
                      ? "Clearing & Populating..."
                      : "Clearing All..."
                    : pendingClearAction.mode === "clear-and-populate"
                      ? "Yes, Clear All & Populate"
                      : "Yes, Clear All Loads"}
                </span>
              </button>
            </div>
          </div>
        )}
      </dialog>

      {/* Native Accessible Confirmation Pop-up: Delete Single Faculty Subject Load */}
      <dialog
        ref={deleteLoadDialogRef}
        aria-labelledby="delete-load-confirm-title"
        onClose={() => {
          if (deleteLoadDialogRef.current) deleteLoadDialogRef.current.returnValue = "";
          if (!isDeletingSingle) {
            setPendingDeleteLoad(null);
          }
        }}
        onCancel={(e) => {
          if (isDeletingSingle) e.preventDefault();
        }}
        {...({ closedby: isDeletingSingle ? "none" : "any" } as Record<string, string>)}
        className="m-auto w-[min(92vw,26rem)] rounded-2xl border border-[#E3DDD1] bg-[#FFFFFF] p-0 text-[#1C2420] shadow-2xl backdrop:bg-[#1C2420]/55 backdrop:backdrop-blur-xs"
      >
        {pendingDeleteLoad && (
          <div className="p-6 space-y-4">
            <div className="flex items-start justify-between gap-3 border-b border-[#E3DDD1] pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#FBECEF] border border-[#F3B8C2] text-[#9E1B32] flex items-center justify-center shrink-0">
                  <Trash2 className="w-5 h-5" aria-hidden="true" />
                </div>
                <div>
                  <h1 id="delete-load-confirm-title" className="text-base font-bold text-[#1C2420]">
                    Remove Subject Load?
                  </h1>
                  <p className="text-xs text-[#5C6660]">
                    {pendingDeleteLoad.load.subject?.subject_code}:{" "}
                    {pendingDeleteLoad.load.subject?.subject_name}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => !isDeletingSingle && setPendingDeleteLoad(null)}
                disabled={isDeletingSingle}
                aria-label="Close dialog"
                className="p-1.5 rounded-lg text-[#5C6660] hover:bg-[#FAF8F5] cursor-pointer disabled:opacity-50"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-[#FAF8F5] border border-[#E3DDD1] text-xs text-[#1C2420] space-y-1">
              <div>
                <strong>Faculty:</strong> {pendingDeleteLoad.load.teacher?.full_name || "Assigned Teacher"}
              </div>
              <div>
                <strong>Section:</strong> Grade {pendingDeleteLoad.load.section?.grade_level} -{" "}
                {pendingDeleteLoad.load.section?.section_name}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-[#FBECEF] border border-[#F3B8C2] text-xs text-[#7F1528] leading-relaxed">
              Removing this subject load will also automatically delete{" "}
              <strong>
                {pendingDeleteLoad.slotCount} assigned{" "}
                {pendingDeleteLoad.slotCount === 1 ? "slot" : "slots"}
              </strong>{" "}
              from the Schedule Grid and SF7 timetable.
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E3DDD1]">
              <button
                ref={deleteCancelBtnRef}
                type="button"
                onClick={() => setPendingDeleteLoad(null)}
                disabled={isDeletingSingle}
                className="px-4 py-2 min-h-[40px] text-xs font-semibold rounded-xl border border-[#E3DDD1] text-[#1C2420] hover:bg-[#FAF8F5] cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteLoad}
                disabled={isDeletingSingle}
                className="px-4 py-2 min-h-[40px] text-xs font-semibold rounded-xl bg-[#9E1B32] hover:bg-[#7F1528] text-white cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{isDeletingSingle ? "Removing..." : "Remove Load & Grid Slots"}</span>
              </button>
            </div>
          </div>
        )}
      </dialog>

      <UnplottedSubjectsModal
        isOpen={isUnplottedModalOpen}
        termLabel={currentTermLabel}
        loads={loads}
        sections={sections ?? []}
        coverageByLoadId={coverageByLoadId}
        isPrivileged={isPrivileged}
        onScheduleLoad={onScheduleLoad}
        onClose={() => setIsUnplottedModalOpen(false)}
      />
    </div>
  );
};
