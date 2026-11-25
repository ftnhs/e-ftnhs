import React, { useState, useMemo } from"react";
import type { LessonPlan } from"../../types";
import { Filter, Search, CheckCircle, Clock, AlertCircle } from"lucide-react";

interface ComplianceMatrixProps {
  plans: LessonPlan[];
  onSelectPlan: (plan: LessonPlan) => void;
  isPrivileged?: boolean;
}

export const ComplianceMatrix: React.FC<ComplianceMatrixProps> = ({
  plans,
  onSelectPlan,
  isPrivileged = true,
}) => {
  const [selectedDept, setSelectedDept] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Extract unique teachers from submissions and known departments
  const teacherRows = useMemo(() => {
    const map = new Map<
      string,
      {
        teacherId: string;
        teacherName: string;
        department: string;
        weeks: Record<number, LessonPlan[]>;
      }
    >();

    plans.forEach((p) => {
      const teacherName = p.teacher?.full_name ||"Faculty Member";
      const dept = p.department ||"General Academics";

      if (!map.has(p.teacher_id)) {
        map.set(p.teacher_id, {
          teacherId: p.teacher_id,
          teacherName,
          department: dept,
          weeks: {},
        });
      }

      const row = map.get(p.teacher_id)!;
      if (!row.weeks[p.week_number]) {
        row.weeks[p.week_number] = [];
      }
      row.weeks[p.week_number]!.push(p);
    });

    return Array.from(map.values());
  }, [plans]);

  // Departments list for filter
  const departments = useMemo(() => {
    const set = new Set<string>();
    teacherRows.forEach((r) => set.add(r.department));
    return ["All", ...Array.from(set)];
  }, [teacherRows]);

  // Filtered rows
  const filteredRows = useMemo(() => {
    return teacherRows.filter((r) => {
      const matchesDept = selectedDept ==="All" || r.department === selectedDept;
      const matchesSearch =
        r.teacherName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.department.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesDept && matchesSearch;
    });
  }, [teacherRows, selectedDept, searchQuery]);

  return (
    <div className="bg-white rounded-2xl border border-sand-200 shadow-xs p-5 sm:p-6 space-y-5 transition-colors">
      {/* Header & Legend */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-cyprus-900 font-display">
            {isPrivileged ?"10-Week Compliance Matrix" :"My 10-Week Submission Progress"}
          </h2>
          <p className="text-xs text-sand-600">
            {isPrivileged
              ?"Faculty submissions across academic departments"
              :"Your weekly lesson log submissions across Weeks 1 to 10"}
          </p>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-md bg-emerald-500" />
            <span className="text-sand-700">Approved</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-md bg-sand-500" />
            <span className="text-sand-700">Review Queue</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-md bg-crimson-600" />
            <span className="text-sand-700">Needs Revision</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-md bg-sand-200 border border-sand-300" />
            <span className="text-sand-500">Unsubmitted</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar (Only for Super Admin & School Head) */}
      {isPrivileged && (
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-sand-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search faculty or subject..."
              className="w-full pl-9 pr-4 py-2 text-xs bg-sand-50 border border-sand-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-crimson-600 text-cyprus-900 placeholder:text-sand-400"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-sand-500 shrink-0" />
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="text-xs bg-sand-50 border border-sand-300 rounded-xl px-3 py-2 text-cyprus-900 focus:outline-none focus:ring-2 focus:ring-crimson-600 cursor-pointer"
            >
              {departments.map((d) => (
                <option key={d} value={d}>
                  Department: {d}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Interactive Matrix Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[760px]">
          <thead>
            <tr className="border-b border-sand-200 text-[11px] font-bold text-sand-600 uppercase tracking-wider bg-sand-50/60">
              <th className="py-3 px-3 w-56">{isPrivileged ?"Faculty & Department" :"Teacher Profile"}</th>
              {Array.from({ length: 10 }, (_, i) => (
                <th key={i} className="py-3 px-2 text-center w-12">
                  W{i + 1}
                </th>
              ))}
              <th className="py-3 px-3 text-right">Progress</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-sand-100 text-xs">
            {filteredRows.length === 0 ? (
              <tr>
                <td colSpan={12} className="py-8 text-center text-sand-500">
                  {isPrivileged
                    ?"No matching faculty submissions found."
                    :"No submissions recorded yet. Click 'Submit Lesson Log' to begin."}
                </td>
              </tr>
            ) : (
              filteredRows.map((row) => {
                const completedCount = Object.values(row.weeks).filter(
                  (weekPlans) =>
                    weekPlans.length > 0 && weekPlans.every((p) => p.status ==="Approved")
                ).length;
                const percentage = Math.round((completedCount / 10) * 100);

                return (
                  <tr
                    key={row.teacherId}
                    className="hover:bg-sand-50/80 transition-colors"
                  >
                    {/* Faculty Info */}
                    <td className="py-3 px-3">
                      <div className="font-semibold text-cyprus-900">
                        {row.teacherName}
                      </div>
                      <div className="text-[10px] text-sand-600">
                        {row.department}
                      </div>
                    </td>

                    {/* Weeks 1 to 10 Cells */}
                    {Array.from({ length: 10 }, (_, i) => {
                      const weekNum = i + 1;
                      const weekPlans = row.weeks[weekNum] || [];

                      if (weekPlans.length === 0) {
                        return (
                          <td key={weekNum} className="py-2.5 px-1.5 text-center">
                            <span
                              className="inline-block w-7 h-7 rounded-lg bg-sand-100 border border-sand-200"
                              title={`Week ${weekNum}: Not submitted`}
                            />
                          </td>
                        );
                      }

                      const hasRevision = weekPlans.some((p) => p.status ==="Needs Revision");
                      const allApproved = weekPlans.every((p) => p.status ==="Approved");
                      const targetPlan =
                        weekPlans.find((p) => p.status ==="Needs Revision") ||
                        weekPlans.find((p) => p.status !== "Approved") ||
                        weekPlans[0]!;

                      let bgClass ="bg-sand-500 text-white";
                      let Icon = Clock;
                      if (allApproved) {
                        bgClass ="bg-emerald-500 text-white shadow-xs";
                        Icon = CheckCircle;
                      } else if (hasRevision) {
                        bgClass ="bg-crimson-600 text-white shadow-xs";
                        Icon = AlertCircle;
                      }

                      return (
                        <td key={weekNum} className="py-2.5 px-1.5 text-center">
                          <button
                            type="button"
                            onClick={() => onSelectPlan(targetPlan)}
                            className={`relative w-7 h-7 rounded-lg inline-flex items-center justify-center transition-transform hover:scale-110 cursor-pointer ${bgClass}`}
                            title={weekPlans.map((p) => `Week ${weekNum}: ${p.title} (${p.status})`).join("\n")}
                          >
                            <Icon className="w-3.5 h-3.5" />
                            {weekPlans.length > 1 && (
                              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-[#0F3D2E] text-white text-[9px] font-bold flex items-center justify-center border border-white">
                                {weekPlans.length}
                              </span>
                            )}
                          </button>
                        </td>
                      );
                    })}

                    {/* Progress Percentage */}
                    <td className="py-3 px-3 text-right">
                      <div className="font-semibold text-cyprus-900">
                        {completedCount}/10 ({percentage}%)
                      </div>
                      <div className="w-20 ml-auto bg-sand-200 h-1.5 rounded-full overflow-hidden mt-1">
                        <div
                          className="bg-emerald-500 h-full rounded-full transition-all"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
