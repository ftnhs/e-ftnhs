import React, { useState } from "react";
import type { AcademicTerm, Section, ScheduleEntry } from "../../types";
import {
  autoPopulateScheduleGrid,
  type AutoPopulateGridResult,
} from "../../services/timetableService";
import {
  Sparkles,
  X,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Layers,
  ArrowRight,
  Clock,
} from "lucide-react";

interface AutoPopulateGridModalProps {
  isOpen: boolean;
  onClose: () => void;
  termId: string;
  activeTerm?: AcademicTerm | null;
  sections: Section[];
  existingEntriesCount: number;
  onSuccess: (
    result: AutoPopulateGridResult,
    newlyAddedEntries: ScheduleEntry[],
    appliedOptions?: { clearExisting: boolean; scopeSectionId: string | null }
  ) => void;
}

export const AutoPopulateGridModal: React.FC<AutoPopulateGridModalProps> = ({
  isOpen,
  onClose,
  termId,
  activeTerm,
  sections,
  existingEntriesCount,
  onSuccess,
}) => {
  const [targetScope, setTargetScope] = useState<"all" | "section">("all");
  const [selectedSectionId, setSelectedSectionId] = useState<string>(sections[0]?.id || "");
  const [clearExisting, setClearExisting] = useState<boolean>(true);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [resultSummary, setResultSummary] = useState<AutoPopulateGridResult | null>(null);

  React.useEffect(() => {
    if (!isOpen) return;
    setErrorMsg(null);
    setResultSummary(null);
  }, [isOpen]);

  if (!isOpen) return null;

  const currentTermLabel = activeTerm
    ? `SY ${activeTerm.school_year} • Term ${activeTerm.term_number}`
    : "Active Term";

  const handleStartAutoPopulation = async () => {
    setIsProcessing(true);
    setErrorMsg(null);
    setResultSummary(null);

    try {
      const scopeSec = targetScope === "section" && selectedSectionId ? selectedSectionId : null;
      const res = await autoPopulateScheduleGrid({
        termId,
        scopeSectionId: scopeSec,
        clearExistingFirst: clearExisting,
      });

      if (!res.success) {
        setErrorMsg(res.error || "Failed to auto-populate timetable grid.");
        return;
      }

      setResultSummary(res);
      onSuccess(res, res.createdEntries, {
        clearExisting,
        scopeSectionId: scopeSec,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error executing auto-populate solver.";
      setErrorMsg(msg);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-[#0F3D2E]/60 backdrop-blur-xs transition-opacity"
        onClick={() => {
          if (!isProcessing) onClose();
        }}
        aria-hidden="true"
      />

      {/* Dialog */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="auto-populate-title"
        className="relative bg-white w-full max-w-lg rounded-2xl border border-sand-200 shadow-2xl p-6 overflow-hidden space-y-5 z-10 transition-colors"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-sand-200 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#0F3D2E] text-white flex items-center justify-center font-bold shadow-xs">
              <Sparkles className="w-5 h-5 text-sand-100" />
            </div>
            <div>
              <h2
                id="auto-populate-title"
                className="text-base font-bold text-cyprus-900 font-display flex items-center gap-1.5"
              >
                <span>AI Timetable Auto-Solver</span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-[#E6EFEA] text-[#0F3D2E]">
                  DepEd DO 8 / Magna Carta
                </span>
              </h2>
              <p className="text-xs text-sand-600">
                Populate schedule grid slots from term faculty loads automatically.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            className="p-1.5 text-sand-500 hover:text-cyprus-900 rounded-lg cursor-pointer disabled:opacity-40"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div
            role="alert"
            className="p-3 bg-crimson-50 border border-crimson-200 text-crimson-700 text-xs rounded-xl flex items-start gap-2"
          >
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Scheduling Error</p>
              <p className="whitespace-pre-line">{errorMsg}</p>
            </div>
          </div>
        )}

        {resultSummary ? (
          /* Completion State */
          <div className="space-y-4">
            <div className="p-4 bg-[#E6EFEA] border border-[#0F3D2E]/20 rounded-xl space-y-2">
              <div className="flex items-center gap-2 text-[#0F3D2E] font-bold text-sm">
                <CheckCircle2 className="w-5 h-5 text-[#0F3D2E]" />
                <span>Timetable Grid Successfully Populated!</span>
              </div>
              <p className="text-xs text-sand-700">
                Plotted <strong>{resultSummary.totalSlotsPlotted} slots</strong> across{" "}
                <strong>{resultSummary.fullyAssignedLoads} loads</strong> in {currentTermLabel}.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="p-3 bg-sand-50 border border-sand-200 rounded-xl">
                <span className="block text-lg font-bold text-cyprus-900">
                  {resultSummary.totalSlotsPlotted}
                </span>
                <span className="text-[11px] text-sand-600 font-medium">Slots Plotted</span>
              </div>
              <div className="p-3 bg-sand-50 border border-sand-200 rounded-xl">
                <span className="block text-lg font-bold text-[#0F3D2E]">
                  {resultSummary.fullyAssignedLoads}
                </span>
                <span className="text-[11px] text-sand-600 font-medium">Fully Assigned</span>
              </div>
              <div className="p-3 bg-sand-50 border border-sand-200 rounded-xl">
                <span className="block text-lg font-bold text-[#9E1B32]">
                  {resultSummary.partiallyAssignedLoads + resultSummary.unassignedLoads}
                </span>
                <span className="text-[11px] text-sand-600 font-medium">Lacks Available Slot</span>
              </div>
            </div>

            {resultSummary.unassignedLoadDetails && resultSummary.unassignedLoadDetails.length > 0 && (
              <div className="max-h-36 overflow-y-auto space-y-1.5 p-2 bg-sand-50 rounded-xl border border-sand-200 text-[11px]">
                <p className="font-semibold text-sand-700">Notes & Unassigned Loads:</p>
                {resultSummary.unassignedLoadDetails.map((det, idx) => (
                  <div key={idx} className="text-sand-600 flex items-start gap-1">
                    <span className="text-[#9E1B32] font-semibold">• {det.subjectCode}</span>
                    <span>({det.sectionName}): {det.reason}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end pt-2 border-t border-sand-200">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2 text-xs font-semibold rounded-xl bg-[#0F3D2E] text-white hover:bg-[#0A2E22] cursor-pointer"
              >
                Close & View Grid
              </button>
            </div>
          </div>
        ) : (
          /* Configuration State */
          <div className="space-y-4">
            {/* Rule Callout */}
            <div className="p-3.5 bg-sand-50 border border-sand-200 rounded-xl space-y-2 text-xs text-sand-700">
              <div className="flex items-center gap-1.5 font-semibold text-cyprus-900">
                <Clock className="w-4 h-4 text-[#0F3D2E]" />
                <span>Autonomous Placement Rules Enforced:</span>
              </div>
              <ul className="space-y-1 list-disc pl-4 text-[11px] text-sand-600">
                <li>
                  <strong>JHS Time Slot Fit:</strong> 60-min subjects placed in <em>Morning (P1–P4)</em>; 50-min subjects placed in <em>Afternoon (P6–P9)</em> with HGP on Monday P1.
                </li>
                <li>
                  <strong>Remedial &amp; ARAL Rules:</strong> Remedials prioritized on <em>Friday</em> (moved only if unavoidable); same ARAL Reading / ARAL Math subjects are never placed on consecutive days.
                </li>
                <li>
                  <strong>Weekly Uniformity &amp; Consecutive Blocks:</strong> Same time slot across weekdays (&le;5/wk); intensive SHS loads (&gt;5/wk) paired consecutively.
                </li>
                <li>
                  <strong>Balanced Faculty Workload:</strong> Distributed evenly across Mon–Fri (&le;5 hrs/day cap) with zero teacher, section, or room collisions.
                </li>
              </ul>
            </div>

            {/* Target Scope */}
            <div>
              <span className="block text-xs font-semibold text-cyprus-900 mb-1.5">
                Population Target Scope
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setTargetScope("all")}
                  className={`p-3 rounded-xl border text-left text-xs font-medium cursor-pointer transition-colors flex items-center gap-2.5 ${
                    targetScope === "all"
                      ? "bg-[#E6EFEA] border-[#0F3D2E] text-[#0F3D2E]"
                      : "bg-white border-sand-300 text-sand-700 hover:bg-sand-50"
                  }`}
                >
                  <Layers className="w-4 h-4 shrink-0" />
                  <div>
                    <div className="font-semibold">All Sections</div>
                    <div className="text-[10px] text-sand-500">Whole school ({sections.length} sections)</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setTargetScope("section")}
                  className={`p-3 rounded-xl border text-left text-xs font-medium cursor-pointer transition-colors flex items-center gap-2.5 ${
                    targetScope === "section"
                      ? "bg-[#E6EFEA] border-[#0F3D2E] text-[#0F3D2E]"
                      : "bg-white border-sand-300 text-sand-700 hover:bg-sand-50"
                  }`}
                >
                  <Calendar className="w-4 h-4 shrink-0" />
                  <div>
                    <div className="font-semibold">Specific Section</div>
                    <div className="text-[10px] text-sand-500">Single class grid</div>
                  </div>
                </button>
              </div>
            </div>

            {/* If Single Section Chosen */}
            {targetScope === "section" && (
              <div>
                <label
                  htmlFor="auto-populate-section-select"
                  className="block text-xs font-semibold text-cyprus-900 mb-1"
                >
                  Select Class Section
                </label>
                <select
                  id="auto-populate-section-select"
                  value={selectedSectionId}
                  onChange={(e) => setSelectedSectionId(e.target.value)}
                  className="w-full py-2 px-3 rounded-xl border border-sand-300 bg-white text-xs sm:text-sm text-cyprus-900 focus-visible:ring-2 focus-visible:ring-[#0F3D2E]"
                >
                  {sections.map((sec) => (
                    <option key={sec.id} value={sec.id}>
                      Grade {sec.grade_level} - {sec.section_name} ({sec.room?.room_number || "Room TBD"})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Clear Existing Checkbox */}
            <div className="p-3 rounded-xl bg-sand-50 border border-sand-200">
              <label
                htmlFor="auto-populate-clear-checkbox"
                className="flex items-start gap-2.5 cursor-pointer text-xs"
              >
                <input
                  id="auto-populate-clear-checkbox"
                  type="checkbox"
                  checked={clearExisting}
                  onChange={(e) => setClearExisting(e.target.checked)}
                  className="mt-0.5 rounded text-[#0F3D2E] focus:ring-[#0F3D2E]"
                />
                <span className="text-xs text-sand-600 leading-relaxed">
                  <strong className="block text-cyprus-900">
                    Replace existing grid slots first
                  </strong>
                  {clearExisting
                    ? `Removes existing plotted slots ${
                        targetScope === "section" ? "for this section" : "across the selected term"
                      } (${existingEntriesCount} currently plotted) before calculating conflict-free slots.`
                    : "Appends new slots into remaining empty periods without removing existing slots."}
                </span>
              </label>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-sand-200">
              <button
                type="button"
                onClick={onClose}
                disabled={isProcessing}
                className="px-4 py-2 text-xs font-semibold rounded-xl border border-sand-300 text-sand-700 hover:bg-sand-100 cursor-pointer disabled:opacity-40"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleStartAutoPopulation}
                disabled={isProcessing}
                className="px-5 py-2 text-xs font-semibold rounded-xl bg-[#0F3D2E] hover:bg-[#0A2E22] text-white shadow-xs focus-visible:ring-2 focus-visible:ring-[#0F3D2E] cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                {isProcessing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Solving Timetable...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-sand-100" />
                    <span>Populate Grid</span>
                    <ArrowRight className="w-3.5 h-3.5" />
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
