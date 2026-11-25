import React, { useState, useMemo } from"react";
import type { LessonPlan } from"../../types";
import { getLessonPlanAttachments } from "../../services/lessonPlanService";
import {
  Search,
  Filter,
  CheckCircle,
  Clock,
  AlertCircle,
  FileText,
  ExternalLink,
  Award,
  Paperclip,
  Edit,
  Trash2,
} from"lucide-react";

interface LessonPlanListProps {
  plans: LessonPlan[];
  currentUserId?: string;
  onSelectPlan: (plan: LessonPlan) => void;
  onEditPlan?: (plan: LessonPlan) => void;
  onDeletePlan?: (plan: LessonPlan) => void;
  isPrivileged?: boolean;
}

export const LessonPlanList: React.FC<LessonPlanListProps> = ({
  plans,
  currentUserId,
  onSelectPlan,
  onEditPlan,
  onDeletePlan,
  isPrivileged = true,
}) => {
  const [search, setSearch] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [weekFilter, setWeekFilter] = useState<string>("All");

  const filteredPlans = useMemo(() => {
    return plans.filter((p) => {
      const teacherName = p.teacher?.full_name ||"";
      const matchesSearch =
        p.title.toLowerCase().includes(search.toLowerCase()) ||
        p.subject_name.toLowerCase().includes(search.toLowerCase()) ||
        teacherName.toLowerCase().includes(search.toLowerCase());

      const matchesStatus = statusFilter ==="All" || p.status === statusFilter;
      const matchesWeek = weekFilter ==="All" || p.week_number.toString() === weekFilter;

      return matchesSearch && matchesStatus && matchesWeek;
    });
  }, [plans, search, statusFilter, weekFilter]);

  return (
    <div className="bg-white rounded-2xl border border-sand-200 shadow-xs p-5 sm:p-6 space-y-4 transition-colors">
      {/* Header and Filter Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-cyprus-900 font-display">
            {isPrivileged ?"Review Queue & Submissions" :"My Submissions History"}
          </h2>
          <p className="text-xs text-sand-600">
            {filteredPlans.length} {filteredPlans.length === 1 ?"record" :"records"} matching current filters
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Status Filter */}
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-sand-500" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs bg-sand-50 border border-sand-300 rounded-xl px-2.5 py-1.5 text-cyprus-900 focus:outline-none focus:ring-2 focus:ring-crimson-600 cursor-pointer"
            >
              <option value="All">All Statuses</option>
              <option value="Submitted">Submitted (Pending)</option>
              <option value="Under Review">Under Review</option>
              <option value="Approved">Approved (Noted)</option>
              <option value="Needs Revision">Needs Revision</option>
            </select>
          </div>

          {/* Week Filter */}
          <select
            value={weekFilter}
            onChange={(e) => setWeekFilter(e.target.value)}
            className="text-xs bg-sand-50 border border-sand-300 rounded-xl px-2.5 py-1.5 text-cyprus-900 focus:outline-none focus:ring-2 focus:ring-crimson-600 cursor-pointer"
          >
            <option value="All">All Weeks</option>
            {Array.from({ length: 10 }, (_, i) => (
              <option key={i + 1} value={(i + 1).toString()}>
                Week {i + 1}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 text-sand-500 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter by title, subject, or faculty name..."
          className="w-full pl-9 pr-4 py-2 text-xs bg-sand-50 border border-sand-300 rounded-xl text-cyprus-900 placeholder:text-sand-400 focus:outline-none focus:ring-2 focus:ring-crimson-600"
        />
      </div>

      {/* Plans List Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[700px]">
          <thead>
            <tr className="border-b border-sand-200 text-[11px] font-bold text-sand-600 uppercase tracking-wider bg-sand-50/60">
              <th className="py-3 px-3">Week</th>
              <th className="py-3 px-3">Subject & Lesson Title</th>
              <th className="py-3 px-3">Faculty</th>
              <th className="py-3 px-3">Status & Timeliness</th>
              <th className="py-3 px-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-sand-100 text-xs">
            {filteredPlans.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-10 text-center text-sand-500">
                  No lesson logs found matching your filters.
                </td>
              </tr>
            ) : (
              filteredPlans.map((plan) => {
                const isApproved = plan.status ==="Approved";
                const isRevision = plan.status ==="Needs Revision";
                const attachments = getLessonPlanAttachments(plan);
                const singleAttachment = attachments.length === 1 ? attachments[0] : undefined;

                return (
                  <tr
                    key={plan.id}
                    className="hover:bg-sand-50/80 transition-colors"
                  >
                    {/* Week Badge */}
                    <td className="py-3.5 px-3">
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-xl font-mono font-bold text-xs bg-cyprus-50 text-cyprus-900 border border-cyprus-200">
                        W{plan.week_number}
                      </span>
                    </td>

                    {/* Title & Subject */}
                    <td className="py-3.5 px-3">
                      <div className="font-semibold text-cyprus-900 line-clamp-1">
                        {plan.title}
                      </div>
                      <div className="text-[11px] text-sand-600 flex items-center gap-2 mt-0.5">
                        <span className="font-medium text-cyprus-700">
                          {plan.subject_name}
                        </span>
                        <span>•</span>
                        <span>Grade {plan.grade_level} - {plan.section_name}</span>
                      </div>
                    </td>

                    {/* Teacher */}
                    <td className="py-3.5 px-3">
                      <div className="font-semibold text-cyprus-900">
                        {plan.teacher?.full_name ||"Faculty Member"}
                      </div>
                      <div className="text-[10px] text-sand-500">
                        {plan.department}
                      </div>
                    </td>

                    {/* Status & Late */}
                    <td className="py-3.5 px-3">
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold ${
                            isApproved
                              ?"bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : isRevision
                              ?"bg-crimson-50 text-crimson-700 border border-crimson-200"
                              :"bg-sand-100 text-sand-800 border border-sand-300"
                          }`}
                        >
                          {isApproved ? (
                            <CheckCircle className="w-3 h-3" />
                          ) : isRevision ? (
                            <AlertCircle className="w-3 h-3" />
                          ) : (
                            <Clock className="w-3 h-3" />
                          )}
                          <span>{plan.status}</span>
                        </span>

                        {plan.is_late && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-crimson-100 text-crimson-800">
                            Late
                          </span>
                        )}
                      </div>

                      {isApproved && plan.reviewer && (
                        <div className="text-[10px] text-emerald-600 mt-1 flex items-center gap-1">
                          <Award className="w-3 h-3" />
                          <span>Noted by {plan.reviewer.full_name}</span>
                        </div>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {singleAttachment && (
                          <a
                            href={singleAttachment.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-lg text-sand-600 hover:text-crimson-600 hover:bg-sand-100 transition-colors"
                            title={`Inspect ${singleAttachment.file_name}`}
                            aria-label={`Open ${singleAttachment.file_name}`}
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        )}
                        {attachments.length > 1 && (
                          <span
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold bg-[#FAF8F5] border border-[#E3DDD1] text-[#1C2420]"
                            title={attachments.map((a) => a.file_name).join(", ")}
                          >
                            <Paperclip className="w-3 h-3 text-[#0F3D2E]" />
                            <span>{attachments.length} files</span>
                          </span>
                        )}

                        <button
                          type="button"
                          onClick={() => onSelectPlan(plan)}
                          className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-cyprus-50 text-cyprus-900 hover:bg-crimson-600 hover:text-white transition-colors cursor-pointer flex items-center gap-1 border border-cyprus-200"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>{isPrivileged ?"Review & Stamp" :"View Details"}</span>
                        </button>

                        {(isPrivileged || (currentUserId && plan.teacher_id === currentUserId)) && (
                          <>
                            {onEditPlan && (
                              <button
                                type="button"
                                onClick={() => onEditPlan(plan)}
                                className="p-1.5 rounded-lg text-sand-600 hover:text-[#0F3D2E] hover:bg-sand-100 transition-colors cursor-pointer"
                                title="Edit lesson plan"
                                aria-label={`Edit ${plan.title}`}
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                            )}
                            {onDeletePlan && (
                              <button
                                type="button"
                                onClick={() => onDeletePlan(plan)}
                                className="p-1.5 rounded-lg text-crimson-600 hover:text-crimson-700 hover:bg-crimson-50 transition-colors cursor-pointer"
                                title="Delete lesson plan"
                                aria-label={`Delete ${plan.title}`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </>
                        )}
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
