import React, { useState, useEffect } from"react";
import type {
  LeaveType,
  Profile,
  AcademicTerm,
  AffectedScheduleSlot,
  LeaveApplication,
} from"../../types";
import {
  computeAffectedScheduleSlots,
  computeVacantRelieversBySlot,
  createLeaveApplication,
} from"../../services/leaveReliefService";
import { Send, X, AlertTriangle, Calendar, Clock, CheckCircle2, UserCheck } from"lucide-react";

interface NewLeaveApplicationModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeTerm: AcademicTerm | null;
  currentUser: Profile;
  teachers: Profile[];
  onApplicationCreated: (app: LeaveApplication) => void;
}

const LEAVE_TYPES: LeaveType[] = [
"Vacation Leave",
"Mandatory/Forced Leave",
"Sick Leave",
"Maternity Leave",
"Paternity Leave",
"Special Privilege Leave",
"Solo Parent Leave",
"Study Leave",
"10-Day VAWC Leave",
"Rehabilitation Privilege",
"Special Leave Benefits for Women",
"Special Emergency Leave",
"Adoption Leave",
];

export const NewLeaveApplicationModal: React.FC<NewLeaveApplicationModalProps> = ({
  isOpen,
  onClose,
  activeTerm,
  currentUser,
  teachers,
  onApplicationCreated,
}) => {
  const [leaveType, setLeaveType] = useState<LeaveType>("Vacation Leave");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [reason, setReason] = useState<string>("");
  const [totalDays, setTotalDays] = useState<number>(1);

  const [affectedSlots, setAffectedSlots] = useState<AffectedScheduleSlot[]>([]);
  const [vacantBySlot, setVacantBySlot] = useState<Record<string, Profile[]>>({});
  const [selectedRelievers, setSelectedRelievers] = useState<Record<string, string>>({});
  const [isIntercepting, setIsIntercepting] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Initialize dates to tomorrow
  useEffect(() => {
    if (isOpen) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const y = tomorrow.getFullYear();
      const m = String(tomorrow.getMonth() + 1).padStart(2, "0");
      const d = String(tomorrow.getDate()).padStart(2, "0");
      const tomorrowStr = `${y}-${m}-${d}`;
      setStartDate(tomorrowStr);
      setEndDate(tomorrowStr);
      setReason("");
      setSelectedRelievers({});
      setErrorMessage(null);
    }
  }, [isOpen]);

  // Intercept schedule & vacant relievers when dates or active term change
  useEffect(() => {
    if (!isOpen || !startDate || !endDate || !activeTerm) return;

    const start = new Date(`${startDate}T00:00:00`);
    const end = new Date(`${endDate}T00:00:00`);
    if (end < start) {
      setErrorMessage("End date cannot be earlier than start date.");
      setAffectedSlots([]);
      setVacantBySlot({});
      return;
    }

    let daysCount = 0;
    const cur = new Date(start);
    while (cur <= end) {
      const day = cur.getDay();
      if (day !== 0 && day !== 6) daysCount++;
      cur.setDate(cur.getDate() + 1);
    }
    setTotalDays(Math.max(1, daysCount));
    setErrorMessage(null);

    let cancelled = false;
    setIsIntercepting(true);
    computeAffectedScheduleSlots(currentUser.id, startDate, endDate, activeTerm.id)
      .then(async (slots) => {
        if (cancelled) return;
        setAffectedSlots(slots);
        const vacancyMap = await computeVacantRelieversBySlot(
          activeTerm.id,
          slots,
          currentUser.id,
          teachers
        );
        if (cancelled) return;
        setVacantBySlot(vacancyMap);

        setSelectedRelievers((prev) => {
          const updated: Record<string, string> = {};
          slots.forEach((slot, idx) => {
            const key = `${slot.date}_${slot.timeSlot.id}`;
            const vacantList = vacancyMap[key] || [];
            const prevChoice = prev[key];
            if (prevChoice && vacantList.some((v) => v.id === prevChoice)) {
              updated[key] = prevChoice;
            } else if (vacantList.length > 0) {
              const candidate = vacantList[idx % vacantList.length];
              if (candidate) {
                updated[key] = candidate.id;
              }
            }
          });
          return updated;
        });
      })
      .finally(() => {
        if (!cancelled) setIsIntercepting(false);
      });

    return () => {
      cancelled = true;
    };
  }, [startDate, endDate, activeTerm, currentUser.id, isOpen, teachers]);

  if (!isOpen) return null;

  const handleRelieverChange = (dateSlotKey: string, relieverId: string) => {
    setSelectedRelievers((prev) => ({
      ...prev,
      [dateSlotKey]: relieverId,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!startDate || !endDate) {
      setErrorMessage("Please specify valid inclusive dates.");
      return;
    }
    if (!reason.trim()) {
      setErrorMessage("Please provide a reason for the leave application.");
      return;
    }
    if (!activeTerm) {
      setErrorMessage("No active academic term found.");
      return;
    }

    // Verify all affected slots have assigned relievers
    for (const slot of affectedSlots) {
      const key = `${slot.date}_${slot.timeSlot.id}`;
      if (!selectedRelievers[key]) {
        setErrorMessage(
          `Please designate a relieving teacher for ${slot.subject.subject_name} (${slot.date}).`
        );
        return;
      }
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      // Deduplicate relief assignments by date+timeSlotId (unique constraint guard)
      const seenKeys = new Set<string>();
      const reliefAssignments = affectedSlots
        .map((slot) => {
          const key = `${slot.date}_${slot.timeSlot.id}`;
          return {
            key,
            scheduleEntryId: slot.scheduleEntryId,
            reliefDate: slot.date,
            dayOfWeek: slot.dayOfWeek,
            timeSlotId: slot.timeSlot.id,
            subjectId: slot.subject.id,
            sectionId: slot.section.id,
            relieverTeacherId: selectedRelievers[key] || "",
          };
        })
        .filter(({ key }) => {
          if (seenKeys.has(key)) return false;
          seenKeys.add(key);
          return true;
        })
        .map(({ key: _key, ...rest }) => rest);

      const newApp = await createLeaveApplication({
        teacherId: currentUser.id,
        termId: activeTerm.id,
        leaveType,
        startDate,
        endDate,
        totalDays,
        reason: reason.trim(),
        reliefAssignments,
      });

      if (newApp) {
        onApplicationCreated(newApp);
        onClose();
      }
    } catch (err: unknown) {
      let msg = "Failed to submit leave application.";
      if (err instanceof Error) {
        msg = err.message;
      } else if (typeof err === "object" && err !== null) {
        const pgErr = err as { message?: unknown; details?: unknown; code?: unknown };
        if (typeof pgErr.message === "string" && pgErr.message) {
          msg = pgErr.message;
          if (typeof pgErr.details === "string" && pgErr.details) {
            msg += ` — ${pgErr.details}`;
          }
        }
      }
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="new-leave-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-cyprus-950/60 backdrop-blur-xs overflow-y-auto"
    >
      <div className="bg-white border border-sand-300 rounded-2xl max-w-3xl w-full shadow-2xl overflow-hidden my-8 transition-colors">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-cyprus-900 text-white flex items-center justify-between border-b border-cyprus-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-crimson-600/20 border border-crimson-500/40 flex items-center justify-center text-crimson-400">
              <Send className="w-4 h-4" />
            </div>
            <div>
              <h2 id="new-leave-modal-title" className="text-base font-bold font-display text-white">
                File Leave Application & Class Relief
              </h2>
              <p className="text-xs text-sand-300">
                Fermin Tayabas National High School • DepEd Form 6 Workflow
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

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {errorMessage && (
            <div
              role="alert"
              className="p-3 rounded-xl bg-crimson-50 border border-crimson-200 text-crimson-800 text-xs flex items-center gap-2"
            >
              <AlertTriangle className="w-4 h-4 shrink-0 text-crimson-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Form Fields Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="leave-type-select"
                className="block text-xs font-semibold text-cyprus-900 mb-1"
              >
                Type of Leave
              </label>
              <select
                id="leave-type-select"
                value={leaveType}
                onChange={(e) => setLeaveType(e.target.value as LeaveType)}
                className="w-full px-3 py-2 rounded-xl border border-sand-300 bg-white text-cyprus-900 text-xs focus:outline-hidden focus:ring-2 focus:ring-cyprus-700"
              >
                {LEAVE_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label
                  htmlFor="leave-start-date"
                  className="block text-xs font-semibold text-cyprus-900 mb-1"
                >
                  Start Date
                </label>
                <input
                  id="leave-start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-xl border border-sand-300 bg-white text-cyprus-900 text-xs focus:outline-hidden focus:ring-2 focus:ring-cyprus-700"
                />
              </div>
              <div>
                <label
                  htmlFor="leave-end-date"
                  className="block text-xs font-semibold text-cyprus-900 mb-1"
                >
                  End Date
                </label>
                <input
                  id="leave-end-date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-xl border border-sand-300 bg-white text-cyprus-900 text-xs focus:outline-hidden focus:ring-2 focus:ring-cyprus-700"
                />
              </div>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-sand-50 border border-sand-200 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-sand-800">
              <Calendar className="w-4 h-4 text-cyprus-700" />
              <span>
                Working Days Applied:{""}
                <strong className="text-cyprus-900 font-bold">
                  {totalDays} {totalDays === 1 ?"day" :"days"}
                </strong>{""}
                (weekends automatically excluded)
              </span>
            </div>
          </div>

          <div>
            <label
              htmlFor="leave-reason"
              className="block text-xs font-semibold text-cyprus-900 mb-1"
            >
              Detailed Reason / Specific Purpose
            </label>
            <textarea
              id="leave-reason"
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Attending family emergency in Tagbilaran / Medical checkup..."
              required
              className="w-full px-3 py-2 rounded-xl border border-sand-300 bg-white text-cyprus-900 text-xs focus:outline-hidden focus:ring-2 focus:ring-cyprus-700"
            />
          </div>

          {/* Schedule Interception Preview & Conforme Designation */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-cyprus-900 uppercase tracking-wider flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-crimson-600" />
                  Affected Teaching Schedule & Reliever Designation
                </h3>
                <p className="text-[11px] text-sand-700">
                  Classes intercepted from your official master timetable requiring substitute coverage.
                </p>
              </div>
              {isIntercepting && (
                <span className="text-[11px] text-cyprus-700 animate-pulse">
                  Detecting schedule slots...
                </span>
              )}
            </div>

            {affectedSlots.length === 0 ? (
              <div className="p-4 rounded-xl border border-dashed border-sand-300 text-center text-xs text-sand-600">
                {isIntercepting
                  ?"Scanning timetable..."
                  :"No teaching schedule conflicts detected for these inclusive dates."}
              </div>
            ) : (
              <div className="border border-sand-200 rounded-xl overflow-hidden shadow-xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-sand-100 text-cyprus-900 text-[11px] font-bold border-b border-sand-200">
                    <tr>
                      <th className="py-2.5 px-3">Date & Day</th>
                      <th className="py-2.5 px-3">Period & Time</th>
                      <th className="py-2.5 px-3">Subject & Section</th>
                      <th className="py-2.5 px-3">Designated Reliever</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-sand-200">
                    {affectedSlots.map((slot) => {
                      const key = `${slot.date}_${slot.timeSlot.id}`;
                      const selectedRelieverId = selectedRelievers[key] ||"";
                      return (
                        <tr
                          key={key}
                          className="hover:bg-sand-50/60 transition-colors"
                        >
                          <td className="py-2 px-3 font-semibold text-cyprus-900 whitespace-nowrap">
                            {slot.date} ({slot.dayOfWeek})
                          </td>
                          <td className="py-2 px-3 text-sand-700 whitespace-nowrap">
                            Slot {slot.timeSlot.slot_number} ({slot.timeSlot.start_time.slice(0, 5)} -{""}
                            {slot.timeSlot.end_time.slice(0, 5)})
                          </td>
                          <td className="py-2 px-3">
                            <div className="font-semibold text-cyprus-900">
                              {slot.subject.subject_name}
                            </div>
                            <div className="text-[11px] text-sand-600">
                              Grade {slot.section.grade_level} - {slot.section.section_name}
                            </div>
                          </td>
                          <td className="py-2 px-3">
                            <div className="flex items-center gap-2">
                              <select
                                value={selectedRelieverId}
                                onChange={(e) => handleRelieverChange(key, e.target.value)}
                                className="w-full px-2.5 py-1.5 rounded-lg border border-sand-300 bg-white text-cyprus-900 text-xs focus:ring-1 focus:ring-cyprus-700"
                              >
                                <option value="">
                                  {(vacantBySlot[key] || []).length === 0
                                    ? "-- No vacant teacher at this time --"
                                    : "-- Choose Relieving Teacher --"}
                                </option>
                                {(vacantBySlot[key] || []).map((teacher) => (
                                  <option key={teacher.id} value={teacher.id}>
                                    {teacher.full_name}
                                  </option>
                                ))}
                              </select>
                              {selectedRelieverId && (
                                <UserCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Modal Footer */}
          <div className="pt-3 border-t border-sand-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-xl border border-sand-300 text-cyprus-900 text-xs font-semibold hover:bg-sand-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || affectedSlots.some((s) => !selectedRelievers[`${s.date}_${s.timeSlot.id}`])}
              className="px-5 py-2.5 rounded-xl bg-crimson-600 hover:bg-crimson-700 disabled:opacity-50 text-white text-xs font-bold shadow-md transition-all flex items-center gap-2 cursor-pointer"
            >
              {isSubmitting ? (
                <span>Routing to Relievers...</span>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Submit & Route Conforme</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
