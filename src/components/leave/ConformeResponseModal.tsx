import React, { useState } from"react";
import type { LeaveClassRelief, LeaveApplication } from"../../types";
import { updateReliefConforme } from"../../services/leaveReliefService";
import { CheckCircle, XCircle, X, AlertTriangle, UserCheck, Calendar } from"lucide-react";

interface ConformeResponseModalProps {
  isOpen: boolean;
  onClose: () => void;
  relief: LeaveClassRelief;
  leaveApp: LeaveApplication;
  onActionComplete: () => void;
}

export const ConformeResponseModal: React.FC<ConformeResponseModalProps> = ({
  isOpen,
  onClose,
  relief,
  leaveApp,
  onActionComplete,
}) => {
  const [remarks, setRemarks] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleAction = async (status:"Accepted" |"Declined") => {
    if (status ==="Declined" && !remarks.trim()) {
      setErrorMessage("Please state a brief reason for declining the class coverage request.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const success = await updateReliefConforme(
        relief.id,
        leaveApp.id,
        status,
        remarks.trim() || (status ==="Accepted" ?"Voluntarily accepted class coverage." :"")
      );

      if (success) {
        onActionComplete();
        onClose();
      } else {
        setErrorMessage("Failed to update relief conforme status.");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message :"Error processing action.";
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="conforme-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-cyprus-950/60 backdrop-blur-xs"
    >
      <div className="bg-white border border-sand-300 rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden transition-colors">
        {/* Header */}
        <div className="px-6 py-4 bg-cyprus-900 text-white flex items-center justify-between border-b border-cyprus-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-600/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <UserCheck className="w-4 h-4" />
            </div>
            <div>
              <h2 id="conforme-modal-title" className="text-base font-bold font-display text-white">
                Class Relief Conforme Action
              </h2>
              <p className="text-xs text-sand-300">
                DepEd Substitute Coverage Agreement
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-sand-300 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {errorMessage && (
            <div
              role="alert"
              className="p-3 rounded-xl bg-crimson-50 border border-crimson-200 text-crimson-800 text-xs flex items-center gap-2"
            >
              <AlertTriangle className="w-4 h-4 shrink-0 text-crimson-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Request Details Card */}
          <div className="p-4 rounded-xl bg-sand-50 border border-sand-200 space-y-2 text-xs">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[11px] font-semibold text-sand-600 uppercase">
                  Requesting Teacher
                </span>
                <div className="font-bold text-cyprus-900 text-sm">
                  {leaveApp.teacher?.full_name ||"Faculty Member"}
                </div>
                <div className="text-[11px] text-sand-700">
                  {leaveApp.teacher?.department ||"Academic Department"}
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-sand-200 text-cyprus-900 font-semibold text-[11px]">
                {leaveApp.leave_type}
              </span>
            </div>

            <div className="pt-2 border-t border-sand-200 grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-[11px] text-sand-600">Class & Section:</span>
                <div className="font-semibold text-cyprus-900">
                  {relief.subject?.subject_name}
                </div>
                <div className="text-[11px] text-sand-700">
                  Grade {relief.section?.grade_level} - {relief.section?.section_name}
                </div>
              </div>

              <div>
                <span className="text-[11px] text-sand-600">Schedule Period:</span>
                <div className="font-semibold text-cyprus-900 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-crimson-600" />
                  {relief.relief_date} ({relief.day_of_week})
                </div>
                <div className="text-[11px] text-sand-700">
                  Slot {relief.time_slot?.slot_number} ({relief.time_slot?.start_time.slice(0, 5)} - {relief.time_slot?.end_time.slice(0, 5)})
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-sand-200 text-[11px] text-sand-700">
              <strong className="text-cyprus-900">Reason for Leave:</strong> {leaveApp.reason}
            </div>
          </div>

          <div>
            <label
              htmlFor="conforme-remarks"
              className="block text-xs font-semibold text-cyprus-900 mb-1"
            >
              Reliever Note / Remarks (Required if Declining)
            </label>
            <textarea
              id="conforme-remarks"
              rows={2}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="e.g. Will administer instructional seatwork / Unable due to prior coaching..."
              className="w-full px-3 py-2 rounded-xl border border-sand-300 bg-white text-cyprus-900 text-xs focus:outline-hidden focus:ring-2 focus:ring-cyprus-700"
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-3 border-t border-sand-200 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => handleAction("Declined")}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-xl border border-crimson-300 text-crimson-700 text-xs font-bold hover:bg-crimson-50 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <XCircle className="w-4 h-4" />
              <span>Decline Coverage</span>
            </button>

            <button
              type="button"
              onClick={() => handleAction("Accepted")}
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <CheckCircle className="w-4 h-4" />
              <span>Accept Conforme</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
