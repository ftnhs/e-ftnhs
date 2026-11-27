import React, { useMemo, useState } from "react";
import type { Subject } from "../../../types";
import { Check, CheckSquare, Search, Square, X } from "lucide-react";

type LevelScope = "ALL" | "JHS" | "SHS";

interface SelectTermSubjectsModalProps {
  isOpen: boolean;
  termLabel: string;
  allSubjects: Subject[];
  initialSelectedIds: string[];
  isSaving: boolean;
  onClose: () => void;
  onSave: (subjectIds: string[]) => Promise<void>;
}

export const SelectTermSubjectsModal: React.FC<SelectTermSubjectsModalProps> = ({
  isOpen,
  termLabel,
  allSubjects,
  initialSelectedIds,
  isSaving,
  onClose,
  onSave,
}) => {
  const [selectedSet, setSelectedSet] = useState<Set<string>>(() => new Set(initialSelectedIds));
  const [levelScope, setLevelScope] = useState<LevelScope>("ALL");
  const [gradeFilter, setGradeFilter] = useState<string>("ALL");
  const [search, setSearch] = useState<string>("");

  const counts = useMemo(() => {
    let jhsTotal = 0;
    let jhsSelected = 0;
    let shsTotal = 0;
    let shsSelected = 0;

    for (const s of allSubjects) {
      const isSelected = selectedSet.has(s.id);
      if (s.grade_level <= 10) {
        jhsTotal += 1;
        if (isSelected) jhsSelected += 1;
      } else {
        shsTotal += 1;
        if (isSelected) shsSelected += 1;
      }
    }

    return {
      jhsTotal,
      jhsSelected,
      shsTotal,
      shsSelected,
      totalSelected: selectedSet.size,
    };
  }, [allSubjects, selectedSet]);

  const visibleSubjects = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allSubjects.filter((s) => {
      if (levelScope === "JHS" && s.grade_level > 10) return false;
      if (levelScope === "SHS" && s.grade_level < 11) return false;
      if (gradeFilter !== "ALL" && String(s.grade_level) !== gradeFilter) return false;
      if (q) {
        return (
          s.subject_code.toLowerCase().includes(q) ||
          s.subject_name.toLowerCase().includes(q) ||
          (s.track_strand && s.track_strand.toLowerCase().includes(q)) ||
          (s.curriculum_version && s.curriculum_version.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [allSubjects, levelScope, gradeFilter, search]);

  if (!isOpen) return null;

  const toggleOne = (id: string) => {
    setSelectedSet((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectAllVisible = () => {
    setSelectedSet((prev) => {
      const next = new Set(prev);
      visibleSubjects.forEach((s) => next.add(s.id));
      return next;
    });
  };

  const clearAllVisible = () => {
    const visibleIds = new Set(visibleSubjects.map((s) => s.id));
    setSelectedSet((prev) => {
      const next = new Set(prev);
      visibleIds.forEach((id) => next.delete(id));
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave(Array.from(selectedSet));
  };

  const availableGrades =
    levelScope === "JHS"
      ? [7, 8, 9, 10]
      : levelScope === "SHS"
        ? [11, 12]
        : [7, 8, 9, 10, 11, 12];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-[#1C2420]/55 backdrop-blur-xs"
        onClick={() => !isSaving && onClose()}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="select-term-subjects-title"
        className="relative z-10 w-full max-w-3xl max-h-[88vh] flex flex-col bg-white rounded-2xl border border-[#E3DDD1] shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="p-5 border-b border-[#E3DDD1] flex items-center justify-between gap-3 bg-[#FAF8F5]">
          <div>
            <h2
              id="select-term-subjects-title"
              className="text-base font-bold text-[#1C2420] font-display"
            >
              Select Subjects for {termLabel}
            </h2>
            <p className="text-xs text-[#5C6660] mt-0.5">
              Check the JHS and SHS curriculum subjects offered in this term.
            </p>
          </div>
          <button
            type="button"
            onClick={() => !isSaving && onClose()}
            disabled={isSaving}
            aria-label="Close dialog"
            className="p-1.5 rounded-lg text-[#5C6660] hover:bg-white hover:text-[#1C2420] cursor-pointer disabled:opacity-50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col min-h-0 flex-1">
          {/* Controls */}
          <div className="p-4 border-b border-[#E3DDD1] space-y-3 bg-white">
            {/* Level Pills (All / JHS / SHS) */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-[#F4F1EA] border border-[#E3DDD1]">
                <button
                  type="button"
                  onClick={() => {
                    setLevelScope("ALL");
                    setGradeFilter("ALL");
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                    levelScope === "ALL"
                      ? "bg-[#0F3D2E] text-white"
                      : "text-[#5C6660] hover:text-[#1C2420]"
                  }`}
                >
                  All JHS &amp; SHS ({counts.totalSelected}/{allSubjects.length})
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setLevelScope("JHS");
                    if (gradeFilter !== "ALL" && Number(gradeFilter) > 10) setGradeFilter("ALL");
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                    levelScope === "JHS"
                      ? "bg-[#0F3D2E] text-white"
                      : "text-[#5C6660] hover:text-[#1C2420]"
                  }`}
                >
                  JHS G7–10 ({counts.jhsSelected}/{counts.jhsTotal})
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setLevelScope("SHS");
                    if (gradeFilter !== "ALL" && Number(gradeFilter) < 11) setGradeFilter("ALL");
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                    levelScope === "SHS"
                      ? "bg-[#0F3D2E] text-white"
                      : "text-[#5C6660] hover:text-[#1C2420]"
                  }`}
                >
                  SHS G11–12 ({counts.shsSelected}/{counts.shsTotal})
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={selectAllVisible}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[#0F3D2E]/30 bg-[#E6EFEA] text-[#0F3D2E] hover:bg-[#0F3D2E] hover:text-white text-xs font-semibold cursor-pointer transition-colors"
                >
                  <CheckSquare className="w-3.5 h-3.5" />
                  <span>Select Visible ({visibleSubjects.length})</span>
                </button>
                <button
                  type="button"
                  onClick={clearAllVisible}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[#E3DDD1] bg-white text-[#5C6660] hover:bg-[#FBECEF] hover:text-[#9E1B32] text-xs font-semibold cursor-pointer transition-colors"
                >
                  <Square className="w-3.5 h-3.5" />
                  <span>Clear Visible</span>
                </button>
              </div>
            </div>

            {/* Search & Grade Filter */}
            <div className="flex flex-col sm:flex-row gap-2.5">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#5C6660]" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search subject code, title, track, or curriculum..."
                  className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-[#E3DDD1] bg-[#FAF8F5] text-xs text-[#1C2420] focus:outline-none focus:ring-2 focus:ring-[#0F3D2E]"
                />
              </div>
              <select
                value={gradeFilter}
                onChange={(e) => setGradeFilter(e.target.value)}
                aria-label="Filter subjects by grade"
                className="py-1.5 px-3 rounded-lg border border-[#E3DDD1] bg-[#FAF8F5] text-xs font-semibold text-[#1C2420]"
              >
                <option value="ALL">All Visible Grades</option>
                {availableGrades.map((g) => (
                  <option key={g} value={String(g)}>
                    Grade {g} {g >= 11 ? "(SHS)" : "(JHS)"}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Checklist */}
          <div className="flex-1 overflow-y-auto p-4 space-y-1.5 bg-[#F4F1EA]/40">
            {visibleSubjects.length === 0 ? (
              <div className="py-10 text-center text-xs text-[#5C6660]">
                No catalog subjects match the current filter.
              </div>
            ) : (
              visibleSubjects.map((sub) => {
                const checked = selectedSet.has(sub.id);
                const isShs = sub.grade_level >= 11;
                return (
                  <label
                    key={sub.id}
                    className={`flex items-center justify-between gap-3 px-3.5 py-2.5 min-h-[44px] rounded-xl border cursor-pointer transition-colors ${
                      checked
                        ? "bg-white border-[#0F3D2E]/40 shadow-2xs"
                        : "bg-white/70 border-[#E3DDD1] hover:bg-white"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleOne(sub.id)}
                        className="w-4 h-4 rounded border-[#0F3D2E] accent-[#0F3D2E] cursor-pointer shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="font-mono text-xs font-bold text-[#1C2420]">
                            {sub.subject_code}
                          </span>
                          <span className="text-xs font-semibold text-[#1C2420] truncate">
                            {sub.subject_name}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5 mt-0.5 text-[11px] text-[#5C6660]">
                          <span
                            className={`px-1.5 py-0.5 rounded font-semibold ${
                              isShs
                                ? "bg-[#FBECEF] text-[#9E1B32]"
                                : "bg-[#E6EFEA] text-[#0F3D2E]"
                            }`}
                          >
                            {isShs ? "SHS" : "JHS"} • G{sub.grade_level}
                          </span>
                          {sub.curriculum_version && (
                            <span className="px-1.5 py-0.5 rounded bg-[#FAF8F5] border border-[#E3DDD1]">
                              {sub.curriculum_version}
                            </span>
                          )}
                          <span>
                            {sub.category}
                            {sub.track_strand ? ` • ${sub.track_strand}` : ""}
                          </span>
                        </div>
                      </div>
                    </div>

                    <span className="font-mono text-[11px] text-[#5C6660] whitespace-nowrap shrink-0">
                      {sub.minutes_per_week}m/wk
                    </span>
                  </label>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-[#E3DDD1] bg-white flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs text-[#5C6660]">
              Selected:{" "}
              <strong className="text-[#0F3D2E]">{counts.jhsSelected} JHS</strong> •{" "}
              <strong className="text-[#9E1B32]">{counts.shsSelected} SHS</strong>{" "}
              <span className="font-mono">({counts.totalSelected} total)</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isSaving}
                className="px-4 py-2 min-h-[40px] rounded-xl border border-[#E3DDD1] text-xs font-semibold text-[#5C6660] hover:bg-[#FAF8F5] cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-4 py-2 min-h-[40px] rounded-xl bg-[#0F3D2E] hover:bg-[#0A2E22] text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Check className="w-3.5 h-3.5" />
                <span>{isSaving ? "Saving..." : "Save Term Subjects"}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
