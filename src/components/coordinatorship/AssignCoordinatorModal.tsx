import React, { useState } from"react";
import type { CoordinatorshipUnit, Profile } from"../../types";
import { assignCoordinator } from"../../services/coordinatorshipService";
import { UserCheck, X, AlertTriangle } from"lucide-react";

interface AssignCoordinatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  unit: CoordinatorshipUnit;
  teachers: Profile[];
  onCoordinatorAssigned: (unitId: string, newCoordinatorId: string | null) => void;
}

export const AssignCoordinatorModal: React.FC<AssignCoordinatorModalProps> = ({
  isOpen,
  onClose,
  unit,
  teachers,
  onCoordinatorAssigned,
}) => {
  const [selectedCoordinatorId, setSelectedCoordinatorId] = useState<string>(
    unit.coordinator_id ||""
  );
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    const targetId = selectedCoordinatorId ? selectedCoordinatorId : null;

    try {
      const ok = await assignCoordinator(unit.id, targetId);
      if (ok) {
        onCoordinatorAssigned(unit.id, targetId);
        onClose();
      } else {
        setErrorMessage("Failed to update unit coordinator.");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message :"Error assigning coordinator.";
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white border border-sand-200 rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-6 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-sand-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyprus-900 text-white flex items-center justify-center shadow-xs">
              <UserCheck className="w-5 h-5 text-sand-300" />
            </div>
            <div>
              <h2 className="text-base font-bold text-cyprus-900 font-display">
                Designate Coordinator
              </h2>
              <p className="text-xs text-sand-700 truncate max-w-[200px]">
                {unit.unit_name}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="p-2 rounded-xl text-sand-600 hover:text-cyprus-900 hover:bg-sand-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="p-3 rounded-xl bg-crimson-50 border border-crimson-200 text-crimson-900 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-crimson-600" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="coordinator-select" className="block text-xs font-semibold text-cyprus-900 mb-1">
              Select Faculty Member
            </label>
            <select
              id="coordinator-select"
              value={selectedCoordinatorId}
              onChange={(e) => setSelectedCoordinatorId(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-sand-300 bg-white text-cyprus-900 text-xs focus:outline-hidden focus:ring-2 focus:ring-cyprus-700"
            >
              <option value="">-- No Coordinator (Unassigned) --</option>
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.full_name} {t.department ? `(${t.department})` :""}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-sand-600 mt-1.5">
              The assigned coordinator receives write permissions to upload, manage, and index documents in this vault.
            </p>
          </div>

          <div className="pt-4 border-t border-sand-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl text-xs font-semibold border border-sand-300 text-sand-800 hover:bg-sand-100 transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl text-xs font-semibold bg-crimson-600 hover:bg-crimson-700 disabled:opacity-50 text-white shadow-xs transition-colors cursor-pointer"
            >
              {isSubmitting ?"Saving..." :"Confirm Designation"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
