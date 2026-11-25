import React, { useState, useEffect } from"react";
import type { Section, StudentDailyAttendance, AttendanceStatus } from"../../types";
import {
  fetchRosterForSection,
  fetchAttendanceSessions,
  saveDailyAttendanceSession,
} from"../../services/calendarAttendanceService";
import {
  CalendarCheck2,
  X,
  AlertTriangle,
  CheckCircle2,
  Users,
  Check,
  UserX,
  Clock,
} from"lucide-react";

interface DailyRollCallModalProps {
  isOpen: boolean;
  onClose: () => void;
  sections: Section[];
  currentUserId: string;
  onSaveSuccess: () => void;
}

export const DailyRollCallModal: React.FC<DailyRollCallModalProps> = ({
  isOpen,
  onClose,
  sections,
  currentUserId,
  onSaveSuccess,
}) => {
  const [selectedSectionId, setSelectedSectionId] = useState<string>(
    sections[0]?.id ||""
  );
  const [attendanceDate, setAttendanceDate] = useState<string>(
    new Date().toISOString().split("T")[0] ||""
  );
  const [students, setStudents] = useState<StudentDailyAttendance[]>([]);
  const [sessionRemarks, setSessionRemarks] = useState<string>("");
  const [isLoadingRoster, setIsLoadingRoster] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Load roster or existing session when section or date changes
  useEffect(() => {
    if (!isOpen || !selectedSectionId) return;

    let isMounted = true;
    setIsLoadingRoster(true);
    setErrorMessage(null);

    const load = async () => {
      try {
        // Check if an attendance session already exists for this section and date
        const existingSessions = await fetchAttendanceSessions(
          selectedSectionId,
          attendanceDate,
          attendanceDate
        );

        if (!isMounted) return;

        if (existingSessions.length > 0 && existingSessions[0]?.students?.length) {
          const session = existingSessions[0];
          setStudents(session.students || []);
          setSessionRemarks(session.remarks ||"");
        } else {
          // No existing session: load roster and default everyone to Present
          const roster = await fetchRosterForSection(selectedSectionId);
          if (!isMounted) return;
          const defaultList: StudentDailyAttendance[] = roster.map((r) => ({
            student_name: r.student_name,
            student_lrn: r.student_lrn,
            gender: r.gender,
            status:"Present",
            remarks: null,
          }));
          setStudents(defaultList);
          setSessionRemarks("");
        }
      } catch (err) {
        console.error("Error loading roster:", err);
      } finally {
        if (isMounted) setIsLoadingRoster(false);
      }
    };

    load();

    return () => {
      isMounted = false;
    };
  }, [isOpen, selectedSectionId, attendanceDate]);

  if (!isOpen) return null;

  const handleStatusChange = (lrn: string, newStatus: AttendanceStatus) => {
    setStudents((prev) =>
      prev.map((s) => (s.student_lrn === lrn ? { ...s, status: newStatus } : s))
    );
  };

  const handleRemarkChange = (lrn: string, text: string) => {
    setStudents((prev) =>
      prev.map((s) => (s.student_lrn === lrn ? { ...s, remarks: text } : s))
    );
  };

  const handleMarkAllPresent = () => {
    setStudents((prev) => prev.map((s) => ({ ...s, status:"Present" })));
  };

  const maleStudents = students.filter((s) => s.gender ==="Male");
  const femaleStudents = students.filter((s) => s.gender ==="Female");

  // Summary counts
  const presentCount = students.filter((s) => s.status ==="Present" || s.status ==="Tardy").length;
  const absentCount = students.filter((s) => s.status ==="Absent").length;
  const tardyCount = students.filter((s) => s.status ==="Tardy").length;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSectionId || !attendanceDate) {
      setErrorMessage("Please select section and date.");
      return;
    }

    if (students.length === 0) {
      setErrorMessage("No student records to save.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const saved = await saveDailyAttendanceSession({
        sectionId: selectedSectionId,
        attendanceDate,
        recordedBy: currentUserId,
        remarks: sessionRemarks.trim() || undefined,
        students,
      });

      if (saved) {
        onSaveSuccess();
        onClose();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message :"Failed to save attendance.";
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="roll-call-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-cyprus-950/60 backdrop-blur-xs overflow-y-auto"
    >
      <div className="bg-white border border-sand-300 rounded-2xl max-w-3xl w-full shadow-2xl overflow-hidden my-6 transition-colors">
        {/* Header */}
        <div className="px-6 py-4 bg-cyprus-900 text-white flex items-center justify-between border-b border-cyprus-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-600/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <CalendarCheck2 className="w-4 h-4" />
            </div>
            <div>
              <h2 id="roll-call-modal-title" className="text-base font-bold font-display text-white">
                Daily Section Attendance Roll-Call
              </h2>
              <p className="text-xs text-sand-300">
                School Form 2 (SF2) Daily Log Entry
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
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[78vh] overflow-y-auto">
          {errorMessage && (
            <div
              role="alert"
              className="p-3 rounded-xl bg-crimson-50 border border-crimson-200 text-crimson-800 text-xs flex items-center gap-2"
            >
              <AlertTriangle className="w-4 h-4 shrink-0 text-crimson-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Section & Date Selector Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="attendance-section-select"
                className="block text-xs font-semibold text-cyprus-900 mb-1"
              >
                Class Section
              </label>
              <select
                id="attendance-section-select"
                value={selectedSectionId}
                onChange={(e) => setSelectedSectionId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-sand-300 bg-white text-cyprus-900 text-xs focus:ring-2 focus:ring-cyprus-700"
              >
                {sections.map((sec) => (
                  <option key={sec.id} value={sec.id}>
                    Grade {sec.grade_level} - {sec.section_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="attendance-date-input"
                className="block text-xs font-semibold text-cyprus-900 mb-1"
              >
                Attendance Date
              </label>
              <input
                id="attendance-date-input"
                type="date"
                required
                value={attendanceDate}
                onChange={(e) => setAttendanceDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-sand-300 bg-white text-cyprus-900 text-xs focus:ring-2 focus:ring-cyprus-700"
              />
            </div>
          </div>

          {/* Real-time Summary Counters Bar */}
          <div className="p-3 rounded-xl bg-sand-50 border border-sand-200 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5 font-bold text-emerald-700">
                <Check className="w-4 h-4" /> Present: {presentCount}
              </span>
              <span className="flex items-center gap-1.5 font-bold text-crimson-700">
                <UserX className="w-4 h-4" /> Absent: {absentCount}
              </span>
              <span className="flex items-center gap-1.5 font-bold text-amber-700">
                <Clock className="w-4 h-4" /> Tardy: {tardyCount}
              </span>
            </div>

            <button
              type="button"
              onClick={handleMarkAllPresent}
              className="px-2.5 py-1 rounded-lg border border-emerald-300 bg-emerald-50 text-emerald-800 font-semibold text-[11px] hover:bg-emerald-100 transition-colors cursor-pointer"
            >
              ✓ Mark All Present
            </button>
          </div>

          {/* Student Roster Lists */}
          {isLoadingRoster ? (
            <div className="p-8 text-center text-xs text-sand-600">
              Loading student roster...
            </div>
          ) : (
            <div className="space-y-4">
              {/* Male Learners Section */}
              <div className="border border-sand-200 rounded-xl overflow-hidden">
                <div className="bg-sand-100 px-3.5 py-2 border-b border-sand-200 flex items-center justify-between text-xs font-bold text-cyprus-900">
                  <span className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-cyprus-700" />
                    MALE LEARNERS ({maleStudents.length})
                  </span>
                </div>
                <div className="divide-y divide-sand-200">
                  {maleStudents.map((st) => (
                    <div
                      key={st.student_lrn}
                      className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 hover:bg-sand-50/70 transition-colors"
                    >
                      <div className="min-w-0">
                        <div className="font-bold text-xs text-cyprus-900 truncate">
                          {st.student_name}
                        </div>
                        <div className="text-[11px] text-sand-500 font-mono">
                          LRN: {st.student_lrn}
                        </div>
                      </div>

                      {/* Touch-Friendly Action Buttons (>= 44x44px accessible touch bounds) */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleStatusChange(st.student_lrn,"Present")}
                          className={`min-h-[44px] min-w-[44px] px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center ${
                            st.status ==="Present"
                              ?"bg-emerald-600 text-white shadow-xs"
                              :"bg-sand-100 text-sand-700 hover:bg-sand-200"
                          }`}
                        >
                          Present
                        </button>

                        <button
                          type="button"
                          onClick={() => handleStatusChange(st.student_lrn,"Tardy")}
                          className={`min-h-[44px] min-w-[44px] px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center ${
                            st.status ==="Tardy"
                              ?"bg-amber-600 text-white shadow-xs"
                              :"bg-sand-100 text-sand-700 hover:bg-sand-200"
                          }`}
                        >
                          Tardy
                        </button>

                        <button
                          type="button"
                          onClick={() => handleStatusChange(st.student_lrn,"Absent")}
                          className={`min-h-[44px] min-w-[44px] px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center ${
                            st.status ==="Absent"
                              ?"bg-crimson-600 text-white shadow-xs"
                              :"bg-sand-100 text-sand-700 hover:bg-sand-200"
                          }`}
                        >
                          Absent
                        </button>
                      </div>

                      {/* Remarks on Absent/Tardy */}
                      {st.status !=="Present" && (
                        <input
                          type="text"
                          placeholder="Reason (e.g. Fever, Late 10m)..."
                          value={st.remarks ||""}
                          onChange={(e) => handleRemarkChange(st.student_lrn, e.target.value)}
                          className="w-full sm:w-44 px-2.5 py-1.5 text-[11px] rounded-lg border border-sand-300 bg-white text-cyprus-900"
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Female Learners Section */}
              <div className="border border-sand-200 rounded-xl overflow-hidden">
                <div className="bg-sand-100 px-3.5 py-2 border-b border-sand-200 flex items-center justify-between text-xs font-bold text-cyprus-900">
                  <span className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-cyprus-700" />
                    FEMALE LEARNERS ({femaleStudents.length})
                  </span>
                </div>
                <div className="divide-y divide-sand-200">
                  {femaleStudents.map((st) => (
                    <div
                      key={st.student_lrn}
                      className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 hover:bg-sand-50/70 transition-colors"
                    >
                      <div className="min-w-0">
                        <div className="font-bold text-xs text-cyprus-900 truncate">
                          {st.student_name}
                        </div>
                        <div className="text-[11px] text-sand-500 font-mono">
                          LRN: {st.student_lrn}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleStatusChange(st.student_lrn,"Present")}
                          className={`min-h-[44px] min-w-[44px] px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center ${
                            st.status ==="Present"
                              ?"bg-emerald-600 text-white shadow-xs"
                              :"bg-sand-100 text-sand-700 hover:bg-sand-200"
                          }`}
                        >
                          Present
                        </button>

                        <button
                          type="button"
                          onClick={() => handleStatusChange(st.student_lrn,"Tardy")}
                          className={`min-h-[44px] min-w-[44px] px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center ${
                            st.status ==="Tardy"
                              ?"bg-amber-600 text-white shadow-xs"
                              :"bg-sand-100 text-sand-700 hover:bg-sand-200"
                          }`}
                        >
                          Tardy
                        </button>

                        <button
                          type="button"
                          onClick={() => handleStatusChange(st.student_lrn,"Absent")}
                          className={`min-h-[44px] min-w-[44px] px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center ${
                            st.status ==="Absent"
                              ?"bg-crimson-600 text-white shadow-xs"
                              :"bg-sand-100 text-sand-700 hover:bg-sand-200"
                          }`}
                        >
                          Absent
                        </button>
                      </div>

                      {st.status !=="Present" && (
                        <input
                          type="text"
                          placeholder="Reason (e.g. Fever, Late 10m)..."
                          value={st.remarks ||""}
                          onChange={(e) => handleRemarkChange(st.student_lrn, e.target.value)}
                          className="w-full sm:w-44 px-2.5 py-1.5 text-[11px] rounded-lg border border-sand-300 bg-white text-cyprus-900"
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div>
            <label
              htmlFor="session-remarks-input"
              className="block text-xs font-semibold text-cyprus-900 mb-1"
            >
              Session Remarks / School Day Notes (Optional)
            </label>
            <input
              id="session-remarks-input"
              type="text"
              value={sessionRemarks}
              onChange={(e) => setSessionRemarks(e.target.value)}
              placeholder="e.g. Heavy rain in Calape in early morning; clean-up drive in PM..."
              className="w-full px-3 py-2 rounded-xl border border-sand-300 bg-white text-cyprus-900 text-xs focus:ring-2 focus:ring-cyprus-700"
            />
          </div>

          {/* Footer */}
          <div className="pt-3 border-t border-sand-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl border border-sand-300 text-cyprus-900 text-xs font-semibold hover:bg-sand-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || students.length === 0}
              className="px-5 py-2.5 rounded-xl bg-crimson-600 hover:bg-crimson-700 text-white text-xs font-bold shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Save & Submit SF2 Roll-Call</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
