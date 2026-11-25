import React from"react";
import type { Assessment } from"../../types";
import { formatGradingPeriod } from"../../services/statsEngine";
import {
  Calendar,
  Users,
  ChevronRight,
  Trash2,
  Printer,
} from"lucide-react";

interface AssessmentCardProps {
  assessment: Assessment;
  onSelect: (assessment: Assessment) => void;
  onPrint: (assessment: Assessment) => void;
  onDelete?: (assessmentId: string) => void;
  isOwnerOrPrivileged: boolean;
}

export const AssessmentCard: React.FC<AssessmentCardProps> = ({
  assessment,
  onSelect,
  onPrint,
  onDelete,
  isOwnerOrPrivileged,
}) => {
  const getMasteryColor = (level: string) => {
    switch (level) {
      case"Mastered":
        return"bg-emerald-100 text-emerald-800 border-emerald-300";
      case"Closely Approximating Mastery":
        return"bg-teal-100 text-teal-800 border-teal-300";
      case"Moving Towards Mastery":
        return"bg-cyprus-100 text-cyprus-800 border-cyprus-300";
      case"Average Mastery":
        return"bg-amber-100 text-amber-800 border-amber-300";
      case"Low Mastery":
      case"Very Low Mastery":
        return"bg-orange-100 text-orange-800 border-orange-300";
      default:
        return"bg-crimson-100 text-crimson-800 border-crimson-300";
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect(assessment)}
      onKeyDown={(e) => {
        if (e.key ==="Enter" || e.key ==="") {
          e.preventDefault();
          onSelect(assessment);
        }
      }}
      className="group bg-white rounded-2xl border border-sand-200 p-5 shadow-xs hover:border-cyprus-400 transition-all cursor-pointer flex flex-col justify-between gap-4 focus:outline-hidden focus:ring-2 focus:ring-cyprus-700"
    >
      <div className="space-y-3">
        {/* Header Tags */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-cyprus-900 text-white shadow-xs">
              {formatGradingPeriod(assessment.grading_period)}
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sand-100 text-sand-800 border border-sand-200">
              {assessment.assessment_type}
            </span>
          </div>

          <span
            className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${getMasteryColor(
              assessment.mastery_level
            )}`}
          >
            {assessment.mastery_level}
          </span>
        </div>

        {/* Title & Metadata */}
        <div>
          <h3 className="text-base font-bold text-cyprus-900 font-display group-hover:text-crimson-600 transition-colors line-clamp-2">
            {assessment.title}
          </h3>
          <div className="flex items-center gap-3 mt-1.5 text-xs text-sand-700 flex-wrap">
            {assessment.subject && (
              <span className="font-semibold text-cyprus-800">
                {assessment.subject.subject_name}
              </span>
            )}
            {assessment.section && (
              <span className="bg-sand-100 px-2 py-0.5 rounded-md border border-sand-200">
                Gr. {assessment.section.grade_level} - {assessment.section.section_name}
              </span>
            )}
          </div>
        </div>

        {/* Statistical Metrics Highlight */}
        <div className="grid grid-cols-3 gap-2 p-2.5 rounded-xl bg-sand-50 border border-sand-200/80 text-center">
          <div>
            <div className="text-[10px] uppercase font-bold text-sand-600">
              Mean (μ)
            </div>
            <div className="text-sm font-bold text-cyprus-900">
              {Number(assessment.mean_score || 0).toFixed(1)}
              <span className="text-[10px] text-sand-500 font-normal">/{assessment.total_items}</span>
            </div>
          </div>

          <div>
            <div className="text-[10px] uppercase font-bold text-sand-600">
              Std Dev
            </div>
            <div className="text-sm font-bold text-cyprus-900">
              {Number(assessment.standard_deviation || 0).toFixed(2)}
            </div>
          </div>

          <div>
            <div className="text-[10px] uppercase font-bold text-crimson-600">
              MPS
            </div>
            <div className="text-sm font-bold text-crimson-600">
              {Number(assessment.mean_percentage_score || 0).toFixed(1)}%
            </div>
          </div>
        </div>
      </div>

      {/* Footer Info & Actions */}
      <div className="pt-3 border-t border-sand-200 flex items-center justify-between gap-2 text-xs text-sand-600">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <Users className="w-3.5 h-3.5" />
            <span>{assessment.examinee_count} students</span>
          </span>
          <span className="flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" />
            <span>{assessment.test_date}</span>
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onPrint(assessment);
            }}
            title="Print DepEd Item Analysis Report"
            aria-label="Print DepEd Item Analysis Report"
            className="p-1.5 rounded-lg text-sand-600 hover:text-cyprus-900 hover:bg-sand-100 transition-colors cursor-pointer"
          >
            <Printer className="w-4 h-4" />
          </button>

          {isOwnerOrPrivileged && onDelete && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (window.confirm(`Delete"${assessment.title}"?`)) {
                  onDelete(assessment.id);
                }
              }}
              title="Delete Assessment"
              aria-label="Delete Assessment"
              className="p-1.5 rounded-lg text-sand-500 hover:text-crimson-600 hover:bg-crimson-50 transition-colors cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}

          <div className="p-1.5 rounded-lg text-cyprus-800 group-hover:translate-x-0.5 transition-transform">
            <ChevronRight className="w-4 h-4" />
          </div>
        </div>
      </div>
    </div>
  );
};
