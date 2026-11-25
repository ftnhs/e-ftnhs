import React, { useState, useMemo } from"react";
import type {
  AcademicTerm,
  TeacherSubjectLoad,
  Profile,
  ScheduleEntry,
  TimeSlot,
  TimeSlotOverride,
  Section,
} from"../../types";
import { computeTeacherLoadingSummaries, deleteTeacherLoad } from"../../services/timetableService";
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
} from"lucide-react";

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
  onCopyFromTerm?: (sourceTermId: string) => Promise<{
    success: boolean;
    insertedCount: number;
    skippedCount: number;
    error?: string;
  }>;
}

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
  onCopyFromTerm,
}) => {
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedDepartment, setSelectedDepartment] = useState<string>("All");
  const [isCopyModalOpen, setIsCopyModalOpen] = useState<boolean>(false);
  const [sourceTermId, setSourceTermId] = useState<string>("");
  const [isCopying, setIsCopying] = useState<boolean>(false);
  const [copyStatus, setCopyStatus] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const otherTerms = useMemo(() => {
    return terms.filter((t) => t.id !== currentTerm?.id);
  }, [terms, currentTerm?.id]);

  const handleOpenCopyModal = () => {
    const preferred =
      otherTerms.find((t) => t.is_active) ||
      otherTerms.find((t) => currentTerm && t.term_number < currentTerm.term_number) ||
      otherTerms[0];
    setSourceTermId(preferred?.id || "");
    setCopyStatus(null);
    setIsCopyModalOpen(true);
  };

  const handleConfirmCopy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sourceTermId || !onCopyFromTerm) return;

    setIsCopying(true);
    setCopyStatus(null);
    try {
      const res = await onCopyFromTerm(sourceTermId);
      if (!res.success) {
        setCopyStatus({
          type: "error",
          text: res.error || "Unable to copy subject loads from the selected term.",
        });
        return;
      }

      const src = otherTerms.find((t) => t.id === sourceTermId);
      const srcLabel = src ? `SY ${src.school_year} • Term ${src.term_number}` : "selected term";
      const skippedText =
        res.skippedCount > 0 ? ` (${res.skippedCount} existing skipped)` : "";
      setCopyStatus({
        type: "success",
        text: `Populated ${res.insertedCount} subject loads from ${srcLabel}${skippedText}.`,
      });
      setIsCopyModalOpen(false);
    } finally {
      setIsCopying(false);
    }
  };

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

  const departments = useMemo(() => {
    const set = new Set<string>();
    teachers.forEach((t) => {
      if (t.department) set.add(t.department);
    });
    return ["All", ...Array.from(set)];
  }, [teachers]);

  const filteredSummaries = useMemo(() => {
    return summaries.filter((s) => {
      if (selectedDepartment !=="All" && s.department !== selectedDepartment) return false;
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
  }, [summaries, selectedDepartment, searchQuery]);

  // Overall statistics
  const stats = useMemo(() => {
    const totalTeachers = summaries.length;
    const compliantCount = summaries.filter((s) => s.is_magna_carta_compliant).length;
    const totalTeachingMins = summaries.reduce((acc, s) => acc + s.total_teaching_minutes, 0);
    const assignedTeachers = summaries.filter((s) => s.loads.length > 0).length;

    return { totalTeachers, compliantCount, totalTeachingMins, assignedTeachers };
  }, [summaries]);

  const handleDeleteLoad = async (loadId: string) => {
    if (!window.confirm("Are you sure you want to remove this subject load? Associated schedule entries will be removed.")) {
      return;
    }
    const ok = await deleteTeacherLoad(loadId);
    if (ok) {
      onLoadDeleted(loadId);
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

        {isPrivileged && (
          <div className="flex flex-wrap items-center gap-2 shrink-0">
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

            <button
              type="button"
              onClick={() => onOpenAssignLoad()}
              className="px-4 py-2.5 rounded-xl bg-[#0F3D2E] hover:bg-[#0A2E22] text-white text-xs font-semibold shadow-xs flex items-center justify-center gap-2 cursor-pointer transition-colors shrink-0 whitespace-nowrap"
            >
              <PlusCircle className="w-4 h-4 shrink-0" />
              <span>Assign Subject Load</span>
            </button>
          </div>
        )}
      </div>

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
                      <div className="space-y-1.5">
                        {summary.loads.map((load) => (
                          <div
                            key={load.id}
                            className="p-2 rounded-lg bg-sand-50 border border-sand-200 flex items-center justify-between text-xs"
                          >
                            <div>
                              <span className="font-semibold text-cyprus-900">
                                {load.subject?.subject_code}: {load.subject?.subject_name}
                              </span>
                              <span className="block text-[11px] text-sand-600">
                                Grade {load.section?.grade_level} - {load.section?.section_name} ({load.teaching_minutes_weekly} mins/wk
                                {typeof load.plotted_slot_count === "number"
                                  ? ` • ${load.plotted_slot_count} ${load.plotted_slot_count === 1 ? "slot" : "slots"}`
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
                                  onClick={() => handleDeleteLoad(load.id)}
                                  className="p-1 text-sand-400 hover:text-crimson-600 rounded-md cursor-pointer"
                                  title="Remove load"
                                  aria-label={`Remove load ${load.subject?.subject_code}`}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                          </div>
                        ))}
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
                            ?"bg-crimson-600"
                            :"bg-emerald-600"
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
                      {summary.loads.find((l) => l.ancillary_description)?.ancillary_description ||"Standard prep & checking"}
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
                    Copy loads into{" "}
                    <strong className="text-[#1C2420]">
                      {currentTerm
                        ? `SY ${currentTerm.school_year} • Term ${currentTerm.term_number}`
                        : "Current Term"}
                    </strong>
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
                  Copy Faculty Subject Loads From:
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

              <div className="p-3 rounded-xl bg-[#FAF8F5] border border-[#E3DDD1] text-xs text-[#5C6660] leading-relaxed">
                This copies all teacher subject loads, weekly minutes, and ancillary duties into the
                selected term. Any loads already in{" "}
                <strong className="text-[#1C2420]">
                  Term {currentTerm?.term_number || ""}
                </strong>{" "}
                are preserved. Afterwards, click the edit icon on any subject to adjust its weekly
                minutes or remove subjects not offered this term.
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E3DDD1]">
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
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-[#0F3D2E] hover:bg-[#0A2E22] text-white cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{isCopying ? "Populating..." : "Populate Term Loads"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
