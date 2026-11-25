import React, { useState, useEffect } from"react";
import type {
  LeaveApplication,
  Profile,
  SchoolSettings,
  TimeSlotOverride,
} from"../../types";
import {
  computeVacantRelieversBySlot,
  reviewLeaveApplication,
  cancelLeaveApplication,
  reassignReliever,
} from"../../services/leaveReliefService";
import {
  FileText,
  X,
  AlertTriangle,
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  Printer,
  UserCheck,
} from"lucide-react";
import { PrintableLeaveLetter } from"./PrintableLeaveLetter";

interface LeaveDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  leaveApp: LeaveApplication;
  currentUser: Profile;
  teachers: Profile[];
  schoolSettings?: SchoolSettings | null;
  timeSlotOverrides?: TimeSlotOverride[];
  onUpdate: () => void;
}

export const LeaveDetailsModal: React.FC<LeaveDetailsModalProps> = ({
  isOpen,
  onClose,
  leaveApp,
  currentUser,
  teachers,
  schoolSettings = null,
  timeSlotOverrides = [],
  onUpdate,
}) => {
  const [remarks, setRemarks] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showPrintModal, setShowPrintModal] = useState<boolean>(false);

  // Reassignment state
  const [reassigningReliefId, setReassigningReliefId] = useState<string | null>(null);
  const [newRelieverId, setNewRelieverId] = useState<string>("");
  const [vacantBySlot, setVacantBySlot] = useState<Record<string, Profile[]>>({});

  useEffect(() => {
    if (!isOpen || !leaveApp.term_id || !leaveApp.reliefs || leaveApp.reliefs.length === 0) {
      return;
    }
    const slotsToCheck = leaveApp.reliefs
      .filter((r) => Boolean(r.time_slot))
      .map((r) => ({
        date: r.relief_date,
        dayOfWeek: r.day_of_week,
        timeSlot: r.time_slot!,
        section: r.section || null,
      }));
    computeVacantRelieversBySlot(leaveApp.term_id, slotsToCheck, leaveApp.teacher_id, teachers)
      .then(setVacantBySlot)
      .catch(console.error);
  }, [isOpen, leaveApp.term_id, leaveApp.teacher_id, leaveApp.reliefs, teachers]);

  if (!isOpen) return null;

  const isSchoolHeadOrAdmin =
    currentUser.role ==="Super Admin" || currentUser.role ==="School Head";
  const isOwner = currentUser.id === leaveApp.teacher_id;

  const handleReviewAction = async (action:"Approved" |"Disapproved") => {
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const ok = await reviewLeaveApplication(
        leaveApp.id,
        action,
        currentUser.id,
        remarks.trim() || undefined
      );

      if (ok) {
        onUpdate();
        onClose();
      } else {
        setErrorMessage(`Failed to ${action.toLowerCase()} leave application.`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message :"Error processing review.";
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = async () => {
    if (!window.confirm("Are you sure you want to cancel this leave application?")) return;
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const ok = await cancelLeaveApplication(leaveApp.id);
      if (ok) {
        onUpdate();
        onClose();
      } else {
        setErrorMessage("Failed to cancel leave application.");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message :"Error cancelling leave.";
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReassignReliever = async (reliefId: string) => {
    if (!newRelieverId) return;
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const ok = await reassignReliever(reliefId, newRelieverId);
      if (ok) {
        setReassigningReliefId(null);
        setNewRelieverId("");
        onUpdate();
      } else {
        setErrorMessage("Failed to reassign relieving teacher.");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message :"Error reassigning reliever.";
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="leave-details-title"
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-cyprus-950/60 backdrop-blur-xs overflow-y-auto"
      >
        <div className="bg-white border border-sand-300 rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden my-8 transition-colors">
          {/* Header */}
          <div className="px-6 py-4 bg-cyprus-900 text-white flex items-center justify-between border-b border-cyprus-800">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-crimson-600/20 border border-crimson-500/40 flex items-center justify-center text-crimson-400">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <h2 id="leave-details-title" className="text-base font-bold font-display text-white">
                  Leave & Class Relief Details
                </h2>
                <p className="text-xs text-sand-300">
                  {leaveApp.teacher?.full_name} • {leaveApp.leave_type}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowPrintModal(true)}
                className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                title="Print DepEd Form"
              >
                <Printer className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Print Form</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg text-sand-300 hover:text-white hover:bg-white/10 transition-colors"
                aria-label="Close dialog"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
            {errorMessage && (
              <div
                role="alert"
                className="p-3 rounded-xl bg-crimson-50 border border-crimson-200 text-crimson-800 text-xs flex items-center gap-2"
              >
                <AlertTriangle className="w-4 h-4 shrink-0 text-crimson-600" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Status & General Info Card */}
            <div className="p-4 rounded-xl bg-sand-50 border border-sand-200 space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-semibold text-sand-600 uppercase">
                    Applicant Information
                  </span>
                  <div className="font-bold text-cyprus-900 text-sm">
                    {leaveApp.teacher?.full_name}
                  </div>
                  <div className="text-[11px] text-sand-700">
                    {leaveApp.teacher?.department ||"Faculty Member"} • {leaveApp.teacher?.email}
                  </div>
                </div>

                <div className="text-right">
                  <span
                    className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${
                      leaveApp.status ==="Approved"
                        ?"bg-emerald-100 text-emerald-800 border border-emerald-300"
                        : leaveApp.status ==="Disapproved"
                        ?"bg-crimson-100 text-crimson-800 border border-crimson-300"
                        : leaveApp.status ==="Pending_Approval"
                        ?"bg-sky-100 text-sky-800 border border-sky-300"
                        :"bg-amber-100 text-amber-800 border border-amber-300"
                    }`}
                  >
                    {leaveApp.status ==="Approved" && <CheckCircle className="w-3.5 h-3.5" />}
                    {leaveApp.status ==="Disapproved" && <XCircle className="w-3.5 h-3.5" />}
                    {leaveApp.status ==="Pending_Approval" && <Clock className="w-3.5 h-3.5" />}
                    {leaveApp.status ==="Pending_Relief" && <UserCheck className="w-3.5 h-3.5" />}
                    {leaveApp.status.replace("_","")}
                  </span>
                </div>
              </div>

              <div className="pt-2 border-t border-sand-200 grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div>
                  <span className="text-[11px] text-sand-600">Leave Type:</span>
                  <div className="font-semibold text-cyprus-900">
                    {leaveApp.leave_type}
                  </div>
                </div>
                <div>
                  <span className="text-[11px] text-sand-600">Inclusive Dates:</span>
                  <div className="font-semibold text-cyprus-900 flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-crimson-600" />
                    {leaveApp.start_date} to {leaveApp.end_date}
                  </div>
                </div>
                <div>
                  <span className="text-[11px] text-sand-600">Total Working Days:</span>
                  <div className="font-semibold text-cyprus-900">
                    {leaveApp.total_days} {leaveApp.total_days === 1 ?"day" :"days"}
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-sand-200">
                <span className="text-[11px] text-sand-600">Reason:</span>
                <p className="text-cyprus-900 italic mt-0.5">{leaveApp.reason}</p>
              </div>

              {leaveApp.school_head_remarks && (
                <div className="pt-2 border-t border-sand-200 bg-sand-100/60 p-2.5 rounded-lg">
                  <span className="text-[11px] font-bold text-cyprus-900">
                    School Head Feedback / Action Note:
                  </span>
                  <p className="text-sand-800 mt-0.5 text-xs">
                    {leaveApp.school_head_remarks}
                  </p>
                </div>
              )}
            </div>

            {/* Class Relief Conforme Matrix */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-cyprus-900 uppercase tracking-wider flex items-center gap-1.5">
                <UserCheck className="w-4 h-4 text-crimson-600" />
                Designated Relievers & Conforme Status
              </h3>

              {(!leaveApp.reliefs || leaveApp.reliefs.length === 0) ? (
                <div className="p-3 rounded-xl border border-sand-200 text-xs text-sand-600 text-center">
                  No teaching classes were intercepted for this leave.
                </div>
              ) : (
                <div className="border border-sand-200 rounded-xl overflow-hidden text-xs">
                  <table className="w-full text-left">
                    <thead className="bg-sand-100 text-cyprus-900 text-[11px] font-bold border-b border-sand-200">
                      <tr>
                        <th className="py-2 px-3">Date & Period</th>
                        <th className="py-2 px-3">Class / Section</th>
                        <th className="py-2 px-3">Reliever</th>
                        <th className="py-2 px-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-sand-200">
                      {leaveApp.reliefs.map((relief) => (
                        <tr key={relief.id} className="hover:bg-sand-50">
                          <td className="py-2 px-3 font-semibold text-cyprus-900">
                            <div>{relief.relief_date}</div>
                            <div className="text-[11px] text-sand-600">
                              Slot {relief.time_slot?.slot_number} ({relief.time_slot?.start_time.slice(0, 5)})
                            </div>
                          </td>
                          <td className="py-2 px-3">
                            <div className="font-semibold text-cyprus-900">
                              {relief.subject?.subject_name}
                            </div>
                            <div className="text-[11px] text-sand-600">
                              Grade {relief.section?.grade_level} - {relief.section?.section_name}
                            </div>
                          </td>
                          <td className="py-2 px-3">
                            {reassigningReliefId === relief.id ? (
                              <div className="flex items-center gap-1.5">
                                <select
                                  value={newRelieverId}
                                  onChange={(e) => setNewRelieverId(e.target.value)}
                                  className="px-2 py-1 rounded-md border border-sand-300 bg-white text-xs text-cyprus-900"
                                >
                                  <option value="">-- Choose New Reliever --</option>
                                  {(vacantBySlot[`${relief.relief_date}_${relief.time_slot_id}`] || []).map((t) => (
                                    <option key={t.id} value={t.id}>
                                      {t.full_name}
                                    </option>
                                  ))}
                                </select>
                                <button
                                  type="button"
                                  onClick={() => handleReassignReliever(relief.id)}
                                  disabled={!newRelieverId || isSubmitting}
                                  className="px-2 py-1 rounded-md bg-crimson-600 text-white text-xs font-bold"
                                >
                                  Save
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setReassigningReliefId(null)}
                                  className="px-2 py-1 rounded-md border border-sand-300 text-xs"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <div>
                                <div className="font-semibold text-cyprus-900">
                                  {relief.reliever?.full_name ||"Assigned Faculty"}
                                </div>
                                {isOwner && relief.conforme_status ==="Declined" && (
                                  <button
                                    type="button"
                                    onClick={() => setReassigningReliefId(relief.id)}
                                    className="text-[11px] text-crimson-600 underline font-semibold mt-0.5"
                                  >
                                    Reassign Reliever
                                  </button>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="py-2 px-3">
                            {relief.conforme_status ==="Accepted" && (
                              <span className="inline-flex items-center gap-1 text-emerald-700 font-bold text-[11px]">
                                <CheckCircle className="w-3.5 h-3.5" />
                                Accepted
                              </span>
                            )}
                            {relief.conforme_status ==="Declined" && (
                              <span className="inline-flex items-center gap-1 text-crimson-700 font-bold text-[11px]" title={relief.reliever_remarks ||""}>
                                <XCircle className="w-3.5 h-3.5" />
                                Declined
                              </span>
                            )}
                            {relief.conforme_status ==="Pending" && (
                              <span className="inline-flex items-center gap-1 text-amber-700 font-bold text-[11px]">
                                <Clock className="w-3.5 h-3.5" />
                                Pending
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* School Head Decision Controls (Only for School Head / Super Admin) */}
            {isSchoolHeadOrAdmin && leaveApp.status !=="Approved" && leaveApp.status !=="Cancelled" && (
              <div className="pt-3 border-t border-sand-200 space-y-3">
                <div>
                  <label
                    htmlFor="sh-remarks-input"
                    className="block text-xs font-semibold text-cyprus-900 mb-1"
                  >
                    School Head Review Remarks / Recommendations
                  </label>
                  <textarea
                    id="sh-remarks-input"
                    rows={2}
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    placeholder="e.g. Approved with pay / Recommend for alternative coverage..."
                    className="w-full px-3 py-2 rounded-xl border border-sand-300 bg-white text-cyprus-900 text-xs focus:outline-hidden focus:ring-2 focus:ring-cyprus-700"
                  />
                </div>

                <div className="flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => handleReviewAction("Disapproved")}
                    disabled={isSubmitting}
                    className="px-4 py-2.5 rounded-xl border border-crimson-300 text-crimson-700 text-xs font-bold hover:bg-crimson-50 transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <XCircle className="w-4 h-4" />
                    <span>Disapprove Leave</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleReviewAction("Approved")}
                    disabled={isSubmitting}
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <CheckCircle className="w-4 h-4" />
                    <span>Approve & Sign Leave</span>
                  </button>
                </div>
              </div>
            )}

            {/* Cancel Option for Requesting Teacher */}
            {isOwner && leaveApp.status ==="Pending_Relief" && (
              <div className="pt-2 border-t border-sand-200 flex justify-end">
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={isSubmitting}
                  className="text-xs text-crimson-600 font-semibold hover:underline"
                >
                  Cancel this Leave Application
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Print Document Modal */}
      <PrintableLeaveLetter
        isOpen={showPrintModal}
        onClose={() => setShowPrintModal(false)}
        leaveApp={leaveApp}
        schoolSettings={schoolSettings}
        timeSlotOverrides={timeSlotOverrides}
      />
    </>
  );
};
