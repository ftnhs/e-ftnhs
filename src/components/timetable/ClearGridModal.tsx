import React, { useState, useMemo } from "react";
import type { AcademicTerm, Section, ScheduleEntry } from "../../types";
import { clearScheduleGrid } from "../../services/timetableService";
import {
  Trash2,
  X,
  AlertTriangle,
  Layers,
  CheckSquare,
  CheckCircle2,
} from "lucide-react";

interface ClearGridModalProps {
  isOpen: boolean;
  onClose: () => void;
  termId: string;
  activeTerm?: AcademicTerm | null;
  sections: Section[];
  scheduleEntries: ScheduleEntry[];
  defaultSelectedSectionId?: string;
  onCleared: (clearedSectionIds: string[] | null, deletedCount: number) => void;
}

export const ClearGridModal: React.FC<ClearGridModalProps> = ({
  isOpen,
  onClose,
  termId,
  activeTerm,
  sections,
  scheduleEntries,
  defaultSelectedSectionId,
  onCleared,
}) => {
  const [clearScope, setClearScope] = useState<"all" | "selected">("all");
  const [selectedSectionIds, setSelectedSectionIds] = useState<string[]>(() =>
    defaultSelectedSectionId ? [defaultSelectedSectionId] : []
  );
  const [isClearing, setIsClearing] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [clearedResult, setClearedResult] = useState<number | null>(null);

  React.useEffect(() => {
    if (!isOpen) return;
    setErrorMsg(null);
    setClearedResult(null);
    setClearScope("all");
    setSelectedSectionIds(defaultSelectedSectionId ? [defaultSelectedSectionId] : []);
  }, [isOpen, defaultSelectedSectionId]);

  const entryCountBySection = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of scheduleEntries) {
      map.set(e.section_id, (map.get(e.section_id) || 0) + 1);
    }
    return map;
  }, [scheduleEntries]);

  const targetEntryCount = useMemo(() => {
    if (clearScope === "all") return scheduleEntries.length;
    const set = new Set(selectedSectionIds);
    return scheduleEntries.filter((e) => set.has(e.section_id)).length;
  }, [clearScope, selectedSectionIds, scheduleEntries]);

  if (!isOpen) return null;

  const currentTermLabel = activeTerm
    ? `SY ${activeTerm.school_year} • Term ${activeTerm.term_number}`
    : "Active Term";

  const toggleSection = (sectionId: string) => {
    setSelectedSectionIds((prev) =>
      prev.includes(sectionId) ? prev.filter((id) => id !== sectionId) : [...prev, sectionId]
    );
  };

  const handleConfirmClear = async () => {
    if (clearScope === "selected" && selectedSectionIds.length === 0) {
      setErrorMsg("Please select at least one section to clear.");
      return;
    }

    setIsClearing(true);
    setErrorMsg(null);

    try {
      const targetIds = clearScope === "all" ? null : selectedSectionIds;
      const res = await clearScheduleGrid(termId, targetIds);
      if (!res.success) {
        setErrorMsg(res.error || "Failed to clear schedule grid.");
        return;
      }

      setClearedResult(res.deletedCount);
      onCleared(targetIds, res.deletedCount);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error clearing schedule grid.";
      setErrorMsg(msg);
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-[#1C2420]/60 backdrop-blur-xs transition-opacity"
        onClick={() => {
          if (!isClearing) onClose();
        }}
        aria-hidden="true"
      />

      {/* Dialog */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="clear-grid-title"
        className="relative bg-white w-full max-w-lg rounded-2xl border border-sand-200 shadow-2xl p-6 overflow-hidden space-y-5 z-10"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-sand-200 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#FBECEF] text-[#9E1B32] flex items-center justify-center font-bold">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h2 id="clear-grid-title" className="text-base font-bold text-cyprus-900 font-display">
                Clear Schedule Grid
              </h2>
              <p className="text-xs text-sand-600">
                Remove plotted grid slots in {currentTermLabel} without deleting faculty loads.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isClearing}
            className="p-1.5 text-sand-500 hover:text-cyprus-900 rounded-lg cursor-pointer disabled:opacity-40"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div
            role="alert"
            className="p-3 bg-[#FBECEF] border border-[#F3B8C2] text-[#9E1B32] text-xs rounded-xl flex items-start gap-2"
          >
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {clearedResult !== null ? (
          <div className="space-y-4">
            <div className="p-4 bg-[#E6EFEA] border border-[#0F3D2E]/20 rounded-xl flex items-start gap-3 text-xs">
              <CheckCircle2 className="w-5 h-5 text-[#0F3D2E] shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold text-[#0F3D2E] text-sm">Schedule Grid Cleared</p>
                <p className="text-sand-700">
                  Removed <strong>{clearedResult} plotted schedule slot(s)</strong>. Your faculty
                  subject loads and weekly minute targets remain preserved.
                </p>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-sand-200">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2 text-xs font-semibold rounded-xl bg-[#0F3D2E] text-white hover:bg-[#0A2E22] cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Scope Selection */}
            <div>
              <span className="block text-xs font-semibold text-cyprus-900 mb-1.5">
                Select What to Clear
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setClearScope("all")}
                  className={`p-3 rounded-xl border text-left text-xs font-medium cursor-pointer transition-colors flex items-center gap-2.5 ${
                    clearScope === "all"
                      ? "bg-[#FBECEF] border-[#9E1B32] text-[#9E1B32]"
                      : "bg-white border-sand-300 text-sand-700 hover:bg-sand-50"
                  }`}
                >
                  <Layers className="w-4 h-4 shrink-0" />
                  <div>
                    <div className="font-semibold">All Sections</div>
                    <div className="text-[10px] opacity-80">
                      Clear all {scheduleEntries.length} plotted slots
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setClearScope("selected")}
                  className={`p-3 rounded-xl border text-left text-xs font-medium cursor-pointer transition-colors flex items-center gap-2.5 ${
                    clearScope === "selected"
                      ? "bg-[#FBECEF] border-[#9E1B32] text-[#9E1B32]"
                      : "bg-white border-sand-300 text-sand-700 hover:bg-sand-50"
                  }`}
                >
                  <CheckSquare className="w-4 h-4 shrink-0" />
                  <div>
                    <div className="font-semibold">Specific Section(s)</div>
                    <div className="text-[10px] opacity-80">Choose which sections to clear</div>
                  </div>
                </button>
              </div>
            </div>

            {/* Section Checkboxes when Specific Section(s) selected */}
            {clearScope === "selected" && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-cyprus-900">
                    Sections ({selectedSectionIds.length} selected)
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedSectionIds(sections.map((s) => s.id))}
                      className="text-[11px] font-semibold text-[#0F3D2E] hover:underline cursor-pointer"
                    >
                      Select All
                    </button>
                    <span className="text-sand-300">|</span>
                    <button
                      type="button"
                      onClick={() => setSelectedSectionIds([])}
                      className="text-[11px] font-semibold text-sand-600 hover:underline cursor-pointer"
                    >
                      Clear Selection
                    </button>
                  </div>
                </div>

                <div className="max-h-48 overflow-y-auto border border-sand-200 rounded-xl divide-y divide-sand-100 bg-sand-50/50">
                  {sections.map((sec) => {
                    const count = entryCountBySection.get(sec.id) || 0;
                    const checked = selectedSectionIds.includes(sec.id);
                    return (
                      <label
                        key={sec.id}
                        htmlFor={`clear-sec-${sec.id}`}
                        className="flex items-center justify-between px-3 py-2 text-xs cursor-pointer hover:bg-white transition-colors"
                      >
                        <span className="flex items-center gap-2.5 text-cyprus-900 font-medium">
                          <input
                            id={`clear-sec-${sec.id}`}
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleSection(sec.id)}
                            className="rounded text-[#9E1B32] focus:ring-[#9E1B32]"
                          />
                          <span>
                            Grade {sec.grade_level} - {sec.section_name}
                          </span>
                        </span>
                        <span className="text-[11px] text-sand-500 tabular-nums">
                          {count} {count === 1 ? "slot" : "slots"}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Warning Notice */}
            <div className="p-3 rounded-xl bg-[#FBECEF] border border-[#F3B8C2] text-xs text-[#9E1B32] flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">
                  This will remove {targetEntryCount} plotted schedule{" "}
                  {targetEntryCount === 1 ? "entry" : "entries"}.
                </p>
                <p className="text-[11px] opacity-90 mt-0.5">
                  Faculty Subject Loads in the &ldquo;Faculty Loading&rdquo; tab will NOT be
                  deleted, so you can re-populate the grid anytime.
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-sand-200">
              <button
                type="button"
                onClick={onClose}
                disabled={isClearing}
                className="px-4 py-2 text-xs font-semibold rounded-xl border border-sand-300 text-sand-700 hover:bg-sand-100 cursor-pointer disabled:opacity-40"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleConfirmClear}
                disabled={isClearing || targetEntryCount === 0}
                className="px-5 py-2 text-xs font-semibold rounded-xl bg-[#9E1B32] hover:bg-[#7D1527] text-white shadow-xs focus-visible:ring-2 focus-visible:ring-[#9E1B32] cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                {isClearing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Clearing...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Clear Grid ({targetEntryCount})</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
