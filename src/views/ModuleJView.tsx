import React, { useState, useEffect, useMemo, useCallback } from"react";
import { useAuth } from"../context/AuthContext";
import type {
  SchoolCalendarEvent,
  DailyAttendanceSession,
  Section,
  AcademicTerm,
  SF2MonthlySummary,
} from"../types";
import {
  fetchCalendarEvents,
  fetchAttendanceSessions,
  getMonthlySF2Summary,
} from"../services/calendarAttendanceService";
import { fetchTimetableData } from"../services/timetableService";
import { PageHeader } from"../components/common/PageHeader";
import { StatCard } from"../components/common/StatCard";
import { NewCalendarEventModal } from"../components/calendar/NewCalendarEventModal";
import { DailyRollCallModal } from"../components/attendance/DailyRollCallModal";
import { PrintableSF2Report } from"../components/attendance/PrintableSF2Report";
import {
  CalendarCheck2,
  Calendar,
  Plus,
  CheckCircle,
  AlertTriangle,
  Clock,
  Printer,
  Filter,
} from"lucide-react";

export const ModuleJView: React.FC = () => {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<"calendar" |"daily_sessions" |"sf2_monthly">("calendar");

  const [events, setEvents] = useState<SchoolCalendarEvent[]>([]);
  const [sessions, setSessions] = useState<DailyAttendanceSession[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [activeTerm, setActiveTerm] = useState<AcademicTerm | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Calendar Filter
  const [eventCategoryFilter, setEventCategoryFilter] = useState<string>("All");

  // SF2 Monthly Report State
  const [selectedSectionId, setSelectedSectionId] = useState<string>("");
  const [selectedMonth, setSelectedMonth] = useState<string>(
    new Date().toISOString().slice(0, 7) // YYYY-MM
  );
  const [monthlySummary, setMonthlySummary] = useState<SF2MonthlySummary | null>(null);
  const [isLoadingSummary, setIsLoadingSummary] = useState<boolean>(false);

  // Modals
  const [isEventModalOpen, setIsEventModalOpen] = useState<boolean>(false);
  const [isRollCallModalOpen, setIsRollCallModalOpen] = useState<boolean>(false);
  const [showPrintModal, setShowPrintModal] = useState<boolean>(false);

  const isSchoolHeadOrAdmin =
    profile?.role ==="Super Admin" || profile?.role ==="School Head";

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [eventsData, timetableData, sessionsData] = await Promise.all([
        fetchCalendarEvents(),
        fetchTimetableData(),
        fetchAttendanceSessions(),
      ]);

      setEvents(eventsData);
      setSections(timetableData.sections);
      setActiveTerm(timetableData.activeTerm);
      setSessions(sessionsData);

      if (timetableData.sections.length > 0 && timetableData.sections[0] && !selectedSectionId) {
        setSelectedSectionId(timetableData.sections[0].id);
      }
    } catch (err) {
      console.error("Error loading calendar and attendance data:", err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedSectionId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Load Monthly SF2 Summary when section or month changes
  useEffect(() => {
    if (!selectedSectionId || !selectedMonth) return;
    const targetSection = sections.find((s) => s.id === selectedSectionId);
    if (!targetSection) return;

    let isMounted = true;
    setIsLoadingSummary(true);
    getMonthlySF2Summary(targetSection, selectedMonth)
      .then((sum) => {
        if (isMounted) setMonthlySummary(sum);
      })
      .catch((err) => console.error("Error loading SF2 summary:", err))
      .finally(() => {
        if (isMounted) setIsLoadingSummary(false);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedSectionId, selectedMonth, sections]);

  // Filter calendar events
  const filteredEvents = useMemo(() => {
    if (eventCategoryFilter ==="All") return events;
    return events.filter((e) => e.event_type === eventCategoryFilter);
  }, [events, eventCategoryFilter]);

  // Countdowns and highlights
  const upcomingDeadlines = useMemo(() => {
    const today = new Date().toISOString().split("T")[0] ||"";
    return events
      .filter((e) => e.end_date >= today)
      .sort((a, b) => a.start_date.localeCompare(b.start_date))
      .slice(0, 3);
  }, [events]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <PageHeader
        title="Calendar & SF2"
        extraActions={
          isSchoolHeadOrAdmin ? (
            <button
              type="button"
              onClick={() => setIsEventModalOpen(true)}
              className="px-3.5 py-2 rounded-lg bg-[#FFFFFF] border border-[#E3DDD1] hover:bg-[#FAF8F5] text-[#1C2420] text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <Calendar className="w-4 h-4 text-[#0F3D2E]" />
              <span>Add Event</span>
            </button>
          ) : undefined
        }
        primaryAction={{
          label:"Daily Roll-Call",
          icon: <Plus className="w-4 h-4" />,
          onClick: () => setIsRollCallModalOpen(true),
        }}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Calendar Events"
          value={events.length}
          icon={<Calendar className="w-4 h-4" />}
        />
        <StatCard
          label="Logged Sessions"
          value={sessions.length}
          icon={<CalendarCheck2 className="w-4 h-4" />}
        />
        <StatCard
          label="Monthly Attendance"
          value={monthlySummary ? `${monthlySummary.paTotal}%` :"98.2%"}
          icon={<CheckCircle className="w-4 h-4" />}
          accent="green"
        />
        <StatCard
          label="SARDO Risk"
          value={monthlySummary ? monthlySummary.sardoCount : 0}
          icon={<AlertTriangle className="w-4 h-4" />}
          accent="crimson"
        />
      </div>

      {/* 3. Upcoming Deadlines & Urgent Calendar Highlights */}
      {upcomingDeadlines.length > 0 && (
        <div className="bg-sand-50 p-4 rounded-2xl border border-sand-300 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-crimson-600 shrink-0" />
            <div>
              <span className="text-xs font-bold text-cyprus-900 uppercase tracking-wider">
                Upcoming DepEd Deadlines & Milestones:
              </span>
              <div className="flex flex-wrap items-center gap-2 mt-1">
                {upcomingDeadlines.map((e) => (
                  <span
                    key={e.id}
                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-white border border-sand-200 text-cyprus-900 shadow-2xs"
                  >
                    <span className="w-2 h-2 rounded-full bg-crimson-600"></span>
                    <strong>{e.title}</strong> ({e.start_date})
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. Tab Navigation Bar */}
      <div className="bg-white rounded-2xl border border-[#E3DDD1] p-4 shadow-2xs space-y-4 transition-colors">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-[#E3DDD1] pb-3">
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#FAF8F5] border border-[#E3DDD1] text-xs max-w-full overflow-x-auto no-scrollbar">
            <button
              type="button"
              onClick={() => setActiveTab("calendar")}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                activeTab === "calendar"
                  ? "bg-[#E6EFEA] text-[#0F3D2E]"
                  : "text-[#5C6660] hover:text-[#1C2420]"
              }`}
            >
              School Calendar ({events.length})
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("daily_sessions")}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                activeTab === "daily_sessions"
                  ? "bg-[#E6EFEA] text-[#0F3D2E]"
                  : "text-[#5C6660] hover:text-[#1C2420]"
              }`}
            >
              Daily Roll-Calls ({sessions.length})
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("sf2_monthly")}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                activeTab === "sf2_monthly"
                  ? "bg-[#E6EFEA] text-[#0F3D2E]"
                  : "text-[#5C6660] hover:text-[#1C2420]"
              }`}
            >
              SF2 Monthly Report
            </button>
          </div>

          {activeTab ==="calendar" && (
            <div className="flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-sand-500" />
              <select
                value={eventCategoryFilter}
                onChange={(e) => setEventCategoryFilter(e.target.value)}
                className="px-2.5 py-1.5 rounded-xl border border-sand-300 bg-sand-50 text-xs text-cyprus-900 font-semibold focus:ring-2 focus:ring-cyprus-700"
              >
                <option value="All">All Event Categories</option>
                <option value="Division Activity">Division Activity</option>
                <option value="School Event">School Event</option>
                <option value="DepEd Holiday">DepEd Holiday</option>
                <option value="Exam Period">Exam Period</option>
                <option value="Submission Deadline">Submission Deadline</option>
                <option value="Faculty Meeting">Faculty Meeting</option>
              </select>
            </div>
          )}
        </div>

        {/* 5. Tab Content: Tab 1 - School Calendar */}
        {activeTab ==="calendar" && (
          <div className="space-y-4">
            {isLoading ? (
              <div className="p-8 text-center text-xs text-sand-600">
                Loading calendar events...
              </div>
            ) : filteredEvents.length === 0 ? (
              <div className="p-8 text-center text-xs text-sand-600">
                No events found for this filter.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                {filteredEvents.map((evt) => (
                  <div
                    key={evt.id}
                    className="p-4 rounded-xl border border-[#E3DDD1] bg-[#FAF8F5] space-y-2 text-xs"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-semibold text-sm text-[#1C2420]">
                        {evt.title}
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold shrink-0 whitespace-nowrap ${
                          evt.event_type ==="Submission Deadline"
                            ?"bg-[#FBECEF] text-[#9E1B32]"
                            : evt.event_type ==="DepEd Holiday"
                            ?"bg-[#E6EFEA] text-[#0F3D2E]"
                            :"bg-[#FFFFFF] text-[#5C6660] border border-[#E3DDD1]"
                        }`}
                      >
                        {evt.event_type}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 text-[#5C6660] text-[11px] font-medium">
                      <Calendar className="w-3.5 h-3.5 text-[#9E1B32]" />
                      <span>
                        {evt.start_date}
                        {evt.end_date !== evt.start_date ? ` – ${evt.end_date}` :""}
                      </span>
                    </div>

                    {evt.description && (
                      <p className="text-[#5C6660] text-xs line-clamp-1">
                        {evt.description}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 2 - Daily Roll-Calls List */}
        {activeTab ==="daily_sessions" && (
          <div className="space-y-4">
            {isLoading ? (
              <div className="p-8 text-center text-xs text-sand-600">
                Loading attendance sessions...
              </div>
            ) : sessions.length === 0 ? (
              <div className="p-8 text-center text-xs text-sand-600">
                No attendance sessions recorded yet. Click &quot;Daily Roll-Call (SF2)&quot; to begin.
              </div>
            ) : (
              <div className="border border-sand-200 rounded-xl overflow-hidden shadow-xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-sand-100 text-cyprus-900 text-[11px] font-bold border-b border-sand-200">
                    <tr>
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Section</th>
                      <th className="py-2.5 px-3">Present</th>
                      <th className="py-2.5 px-3">Absent</th>
                      <th className="py-2.5 px-3">Tardy</th>
                      <th className="py-2.5 px-3">Recorded By</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-sand-200">
                    {sessions.map((sess) => (
                      <tr
                        key={sess.id}
                        className="hover:bg-sand-50/70 transition-colors"
                      >
                        <td className="py-2.5 px-3 font-semibold text-cyprus-900 whitespace-nowrap">
                          {sess.attendance_date}
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-cyprus-900">
                          Grade {sess.section?.grade_level} - {sess.section?.section_name}
                        </td>
                        <td className="py-2.5 px-3 font-bold text-emerald-700">
                          {sess.total_present}
                        </td>
                        <td className="py-2.5 px-3 font-bold text-crimson-700">
                          {sess.total_absent}
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-[#9E1B32]">
                          {sess.total_tardy}
                        </td>
                        <td className="py-2.5 px-3 text-sand-600">
                          {sess.recorder?.full_name ||"Faculty Member"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab 3 - SF2 Monthly Report */}
        {activeTab ==="sf2_monthly" && (
          <div className="space-y-5">
            {/* Controls Bar for Section and Month */}
            <div className="p-3.5 rounded-xl bg-sand-50 border border-sand-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-cyprus-900">
                    Section:
                  </span>
                  <select
                    value={selectedSectionId}
                    onChange={(e) => setSelectedSectionId(e.target.value)}
                    className="px-2.5 py-1.5 rounded-lg border border-sand-300 bg-white text-cyprus-900 text-xs font-semibold focus:ring-1 focus:ring-cyprus-700"
                  >
                    {sections.map((s) => (
                      <option key={s.id} value={s.id}>
                        Grade {s.grade_level} - {s.section_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-cyprus-900">
                    Month:
                  </span>
                  <input
                    type="month"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="px-2.5 py-1.5 rounded-lg border border-sand-300 bg-white text-cyprus-900 text-xs font-semibold focus:ring-1 focus:ring-cyprus-700"
                  >
                  </input>
                </div>
              </div>

              {monthlySummary && (
                <button
                  type="button"
                  onClick={() => setShowPrintModal(true)}
                  className="px-3 py-1.5 rounded-lg bg-crimson-600 hover:bg-crimson-700 text-white font-bold text-xs shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Official SF2 Sheet</span>
                </button>
              )}
            </div>

            {/* Monthly Summary Output */}
            {isLoadingSummary ? (
              <div className="p-8 text-center text-xs text-sand-600">
                Computing School Form 2 statistics...
              </div>
            ) : !monthlySummary ? (
              <div className="p-8 text-center text-xs text-sand-600">
                No attendance logs found for this section and month.
              </div>
            ) : (
              <div className="space-y-4">
                {/* 4 Formula Metrics Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="p-3.5 rounded-xl bg-white border border-sand-200 text-center">
                    <span className="text-[11px] text-sand-600">
                      Total Registered
                    </span>
                    <div className="text-xl font-bold text-cyprus-900 mt-0.5">
                      {monthlySummary.totalRegistered} Learners
                    </div>
                    <div className="text-[10px] text-sand-500">
                      M: {monthlySummary.registeredMale} | F: {monthlySummary.registeredFemale}
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-white border border-sand-200 text-center">
                    <span className="text-[11px] text-sand-600">
                      School Days Logged
                    </span>
                    <div className="text-xl font-bold text-cyprus-900 mt-0.5">
                      {monthlySummary.totalSchoolDays} Days
                    </div>
                    <div className="text-[10px] text-sand-500">In {monthlySummary.monthYear}</div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-white border border-sand-200 text-center">
                    <span className="text-[11px] text-sand-600">
                      Average Daily Attendance (ADA)
                    </span>
                    <div className="text-xl font-bold text-sky-800 mt-0.5">
                      {monthlySummary.adaTotal}
                    </div>
                    <div className="text-[10px] text-sand-500">
                      M: {monthlySummary.adaMale} | F: {monthlySummary.adaFemale}
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-white border border-sand-200 text-center">
                    <span className="text-[11px] text-sand-600">
                      Percentage of Attendance (PA%)
                    </span>
                    <div className="text-xl font-bold text-emerald-800 mt-0.5">
                      {monthlySummary.paTotal}%
                    </div>
                    <div className="text-[10px] text-sand-500">
                      M: {monthlySummary.paMale}% | F: {monthlySummary.paFemale}%
                    </div>
                  </div>
                </div>

                {/* SARDO Alert Banner if any student has >= 5 consecutive absences */}
                {monthlySummary.sardoCount > 0 && (
                  <div className="p-3.5 rounded-xl bg-crimson-50 border border-crimson-300 text-crimson-900 text-xs flex items-center gap-2.5">
                    <AlertTriangle className="w-4 h-4 text-crimson-600 shrink-0" />
                    <div>
                      <strong>Dropout Risk Warning (SARDO):</strong> {monthlySummary.sardoCount}{""}
                      {monthlySummary.sardoCount === 1 ?"learner has" :"learners have"}{""}
                      accumulated 5 or more consecutive days of unexcused absence. DepEd policy mandates immediate home visitation by the class adviser.
                    </div>
                  </div>
                )}

                {/* Learner Roster Table */}
                <div className="border border-sand-200 rounded-xl overflow-hidden shadow-xs">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-sand-100 text-cyprus-900 text-[11px] font-bold border-b border-sand-200">
                      <tr>
                        <th className="py-2.5 px-3">Learner Name</th>
                        <th className="py-2.5 px-3">LRN</th>
                        <th className="py-2.5 px-3">Gender</th>
                        <th className="py-2.5 px-3 text-center">Days Present</th>
                        <th className="py-2.5 px-3 text-center">Days Absent</th>
                        <th className="py-2.5 px-3 text-center">Days Tardy</th>
                        <th className="py-2.5 px-3">Remarks / SARDO</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-sand-200">
                      {monthlySummary.studentSummaries.map((st) => (
                        <tr
                          key={st.student_lrn}
                          className="hover:bg-sand-50/70 transition-colors"
                        >
                          <td className="py-2 px-3 font-semibold text-cyprus-900">
                            {st.student_name}
                          </td>
                          <td className="py-2 px-3 font-mono text-sand-600 text-[11px]">
                            {st.student_lrn}
                          </td>
                          <td className="py-2 px-3 text-sand-700">
                            {st.gender}
                          </td>
                          <td className="py-2 px-3 text-center font-bold text-emerald-700">
                            {st.totalDaysPresent}
                          </td>
                          <td className="py-2 px-3 text-center font-bold text-crimson-700">
                            {st.totalDaysAbsent}
                          </td>
                          <td className="py-2 px-3 text-center font-semibold text-amber-700">
                            {st.totalDaysTardy}
                          </td>
                          <td className="py-2 px-3">
                            {st.isSardo ? (
                              <span className="font-bold text-crimson-700 bg-crimson-50 px-1.5 py-0.5 rounded text-[11px]">
                                ★ SARDO (≥5 consec. absences)
                              </span>
                            ) : (
                              <span className="text-sand-600 text-[11px]">
                                {st.remarks ||"Regular Attendance"}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 6. Modals */}
      {profile && (
        <NewCalendarEventModal
          isOpen={isEventModalOpen}
          onClose={() => setIsEventModalOpen(false)}
          activeTerm={activeTerm}
          userId={profile.id}
          onEventCreated={() => loadData()}
        />
      )}

      {profile && (
        <DailyRollCallModal
          isOpen={isRollCallModalOpen}
          onClose={() => setIsRollCallModalOpen(false)}
          sections={sections}
          currentUserId={profile.id}
          onSaveSuccess={() => loadData()}
        />
      )}

      {monthlySummary && (
        <PrintableSF2Report
          isOpen={showPrintModal}
          onClose={() => setShowPrintModal(false)}
          summary={monthlySummary}
        />
      )}
    </div>
  );
};
