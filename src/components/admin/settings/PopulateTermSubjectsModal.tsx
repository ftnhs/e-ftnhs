import React, { useMemo, useState } from "react";
import type { AcademicTerm, Subject } from "../../../types";
import { Copy, Layers, RefreshCw, X } from "lucide-react";

export type PopulateTermSubjectsMode = "from-term" | "from-catalog" | "from-loads";

interface PopulateTermSubjectsModalProps {
  isOpen: boolean;
  targetTerm: AcademicTerm;
  otherTerms: AcademicTerm[];
  allSubjects: Subject[];
  currentTermCount: number;
  isPopulating: boolean;
  onClose: () => void;
  onPopulate: (params: {
    mode: PopulateTermSubjectsMode;
    sourceTermId?: string;
    includeJhs: boolean;
    includeShs: boolean;
    clearExisting: boolean;
  }) => Promise<void>;
}

export const PopulateTermSubjectsModal: React.FC<PopulateTermSubjectsModalProps> = ({
  isOpen,
  targetTerm,
  otherTerms,
  allSubjects,
  currentTermCount,
  isPopulating,
  onClose,
  onPopulate,
}) => {
  const preferredSourceTerm = useMemo(() => {
    return (
      otherTerms.find((t) => t.is_active)?.id ||
      otherTerms.find((t) => t.term_number < targetTerm.term_number)?.id ||
      otherTerms[0]?.id ||
      ""
    );
  }, [otherTerms, targetTerm.term_number]);

  const [mode, setMode] = useState<PopulateTermSubjectsMode>(
    preferredSourceTerm ? "from-term" : "from-catalog"
  );
  const [sourceTermId, setSourceTermId] = useState<string>(preferredSourceTerm);
  const [includeJhs, setIncludeJhs] = useState<boolean>(true);
  const [includeShs, setIncludeShs] = useState<boolean>(true);
  const [clearExisting, setClearExisting] = useState<boolean>(false);

  const catalogCounts = useMemo(() => {
    const jhs = allSubjects.filter((s) => s.grade_level <= 10).length;
    const shs = allSubjects.filter((s) => s.grade_level >= 11).length;
    return { jhs, shs };
  }, [allSubjects]);

  if (!isOpen) return null;

  const targetTermLabel = `SY ${targetTerm.school_year} • Term ${targetTerm.term_number}`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!includeJhs && !includeShs) return;
    if (mode === "from-term" && !sourceTermId) return;

    await onPopulate({
      mode,
      sourceTermId: mode === "from-term" ? sourceTermId : undefined,
      includeJhs,
      includeShs,
      clearExisting,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-[#1C2420]/55 backdrop-blur-xs"
        onClick={() => !isPopulating && onClose()}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="populate-term-subjects-title"
        className="relative z-10 w-full max-w-md bg-white rounded-2xl border border-[#E3DDD1] shadow-2xl p-6 space-y-4"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#E3DDD1] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#E6EFEA] text-[#0F3D2E] flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h2
                id="populate-term-subjects-title"
                className="text-base font-bold text-[#1C2420] font-display"
              >
                Populate Term Subjects
              </h2>
              <p className="text-xs text-[#5C6660]">
                Target: <strong className="text-[#1C2420]">{targetTermLabel}</strong>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => !isPopulating && onClose()}
            disabled={isPopulating}
            aria-label="Close dialog"
            className="p-1.5 rounded-lg text-[#5C6660] hover:bg-[#FAF8F5] cursor-pointer disabled:opacity-50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Source Option */}
          <div className="space-y-2">
            <span className="block text-xs font-semibold text-[#1C2420]">
              Populate Source
            </span>

            {otherTerms.length > 0 && (
              <div
                className={`p-3 rounded-xl border transition-colors ${
                  mode === "from-term"
                    ? "bg-[#E6EFEA]/60 border-[#0F3D2E]"
                    : "bg-[#FAF8F5] border-[#E3DDD1]"
                }`}
              >
                <label
                  htmlFor="populate-mode-from-term"
                  className="flex items-start gap-2.5 cursor-pointer"
                >
                  <input
                    id="populate-mode-from-term"
                    type="radio"
                    name="populate-subject-mode"
                    checked={mode === "from-term"}
                    onChange={() => setMode("from-term")}
                    className="mt-0.5 accent-[#0F3D2E] cursor-pointer"
                  />
                  <span className="text-xs font-semibold text-[#1C2420] flex items-center gap-1.5">
                    <Copy className="w-3.5 h-3.5 text-[#0F3D2E]" />
                    <span>Copy from Another Academic Term</span>
                  </span>
                </label>
                {mode === "from-term" && (
                  <div className="pl-6 pt-2">
                    <select
                      value={sourceTermId}
                      onChange={(e) => setSourceTermId(e.target.value)}
                      aria-label="Source academic term"
                      className="w-full py-1.5 px-2.5 rounded-lg border border-[#E3DDD1] bg-white text-xs font-medium text-[#1C2420]"
                    >
                      {otherTerms.map((t) => (
                        <option key={t.id} value={t.id}>
                          SY {t.school_year} • Term {t.term_number}{" "}
                          {t.is_active ? "(Active)" : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}

            <div
              className={`p-3 rounded-xl border transition-colors ${
                mode === "from-loads"
                  ? "bg-[#E6EFEA]/60 border-[#0F3D2E]"
                  : "bg-[#FAF8F5] border-[#E3DDD1]"
              }`}
            >
              <label
                htmlFor="populate-mode-from-loads"
                className="flex items-center gap-2.5 cursor-pointer text-xs font-semibold text-[#1C2420]"
              >
                <input
                  id="populate-mode-from-loads"
                  type="radio"
                  name="populate-subject-mode"
                  checked={mode === "from-loads"}
                  onChange={() => setMode("from-loads")}
                  className="accent-[#0F3D2E] cursor-pointer"
                />
                <RefreshCw className="w-3.5 h-3.5 text-[#0F3D2E]" />
                <span>Sync from Term {targetTerm.term_number} Loads &amp; Schedule</span>
              </label>
              <p className="text-xs text-[#5C6660] mt-1 pl-6">
                Includes every JHS/SHS subject already assigned to teachers or sections in this term.
              </p>
            </div>

            <div
              className={`p-3 rounded-xl border transition-colors ${
                mode === "from-catalog"
                  ? "bg-[#E6EFEA]/60 border-[#0F3D2E]"
                  : "bg-[#FAF8F5] border-[#E3DDD1]"
              }`}
            >
              <label
                htmlFor="populate-mode-from-catalog"
                className="flex items-center gap-2.5 cursor-pointer text-xs font-semibold text-[#1C2420]"
              >
                <input
                  id="populate-mode-from-catalog"
                  type="radio"
                  name="populate-subject-mode"
                  checked={mode === "from-catalog"}
                  onChange={() => setMode("from-catalog")}
                  className="accent-[#0F3D2E] cursor-pointer"
                />
                <span>Populate from Master Curriculum Catalog</span>
              </label>
              <p className="text-xs text-[#5C6660] mt-1 pl-6">
                Adds catalog defaults ({catalogCounts.jhs} JHS, {catalogCounts.shs} SHS).
              </p>
            </div>
          </div>

          {/* JHS and SHS Level Checkboxes */}
          <div className="space-y-2">
            <span className="block text-xs font-semibold text-[#1C2420]">
              Levels to Include (JHS &amp; SHS)
            </span>
            <div className="grid grid-cols-2 gap-2.5">
              <div
                className={`p-3 rounded-xl border ${
                  includeJhs
                    ? "bg-[#E6EFEA]/70 border-[#0F3D2E]/40"
                    : "bg-[#FAF8F5] border-[#E3DDD1]"
                }`}
              >
                <label
                  htmlFor="populate-include-jhs"
                  className="flex items-center gap-2 cursor-pointer text-xs font-bold text-[#1C2420]"
                >
                  <input
                    id="populate-include-jhs"
                    type="checkbox"
                    checked={includeJhs}
                    onChange={(e) => setIncludeJhs(e.target.checked)}
                    className="rounded border-[#0F3D2E] accent-[#0F3D2E] cursor-pointer"
                  />
                  <span>JHS (Grades 7–10)</span>
                </label>
                <p className="text-[11px] text-[#5C6660] mt-0.5 pl-5">
                  {catalogCounts.jhs} catalog subjects
                </p>
              </div>

              <div
                className={`p-3 rounded-xl border ${
                  includeShs
                    ? "bg-[#FBECEF]/70 border-[#9E1B32]/40"
                    : "bg-[#FAF8F5] border-[#E3DDD1]"
                }`}
              >
                <label
                  htmlFor="populate-include-shs"
                  className="flex items-center gap-2 cursor-pointer text-xs font-bold text-[#1C2420]"
                >
                  <input
                    id="populate-include-shs"
                    type="checkbox"
                    checked={includeShs}
                    onChange={(e) => setIncludeShs(e.target.checked)}
                    className="rounded border-[#9E1B32] accent-[#9E1B32] cursor-pointer"
                  />
                  <span>SHS (Grades 11–12)</span>
                </label>
                <p className="text-[11px] text-[#5C6660] mt-0.5 pl-5">
                  {catalogCounts.shs} catalog subjects
                </p>
              </div>
            </div>
            {!includeJhs && !includeShs && (
              <p className="text-[11px] text-[#9E1B32] font-medium">
                Select at least JHS or SHS to populate.
              </p>
            )}
          </div>

          {currentTermCount > 0 && (
            <label className="flex items-start gap-2.5 p-3 rounded-xl bg-[#FBECEF] border border-[#F3B8C2] cursor-pointer">
              <input
                type="checkbox"
                checked={clearExisting}
                onChange={(e) => setClearExisting(e.target.checked)}
                className="mt-0.5 rounded border-[#9E1B32] accent-[#9E1B32] cursor-pointer"
              />
              <span className="text-xs text-[#7F1528] leading-snug">
                <strong className="block">Clear existing Term {targetTerm.term_number} subjects first</strong>
                Replaces the {currentTermCount} currently selected subject(s) in this term.
              </span>
            </label>
          )}

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E3DDD1]">
            <button
              type="button"
              onClick={onClose}
              disabled={isPopulating}
              className="px-4 py-2 min-h-[40px] rounded-xl border border-[#E3DDD1] text-xs font-semibold text-[#5C6660] hover:bg-[#FAF8F5] cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={
                isPopulating ||
                (!includeJhs && !includeShs) ||
                (mode === "from-term" && !sourceTermId)
              }
              className="px-4 py-2 min-h-[40px] rounded-xl bg-[#0F3D2E] hover:bg-[#0A2E22] text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>{isPopulating ? "Populating..." : "Populate Term Subjects"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
