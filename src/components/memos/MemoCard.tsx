import React from"react";
import type { SchoolMemo } from"../../types";
import {
  Calendar,
  Users,
  Paperclip,
  CheckCircle,
  Clock,
  ChevronRight,
  Trash2,
} from"lucide-react";

interface MemoCardProps {
  memo: SchoolMemo;
  onSelect: (memo: SchoolMemo) => void;
  onDelete?: (memoId: string) => void;
  isPrivileged: boolean;
}

export const MemoCard: React.FC<MemoCardProps> = ({
  memo,
  onSelect,
  onDelete,
  isPrivileged,
}) => {
  const getPriorityStyle = (priority: string) => {
    switch (priority) {
      case"Urgent":
        return"bg-crimson-100 text-crimson-800 border-crimson-300";
      case"Standard":
        return"bg-cyprus-100 text-cyprus-800 border-cyprus-300";
      case"FYI":
        return"bg-sand-100 text-sand-800 border-sand-300";
      default:
        return"bg-sand-100 text-sand-800 border-sand-300";
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect(memo)}
      onKeyDown={(e) => {
        if (e.key ==="Enter" || e.key ==="") {
          e.preventDefault();
          onSelect(memo);
        }
      }}
      className="group bg-white rounded-2xl border border-sand-200 p-5 shadow-xs hover:border-cyprus-400 transition-all cursor-pointer flex flex-col justify-between gap-4 focus:outline-hidden focus:ring-2 focus:ring-cyprus-700"
    >
      <div className="space-y-3">
        {/* Header Tags */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <span
              className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${getPriorityStyle(
                memo.priority
              )}`}
            >
              {memo.priority}
            </span>
            <span className="text-xs font-semibold text-sand-600">
              {memo.memo_number}
            </span>
          </div>

          {memo.is_acknowledged ? (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#0F3D2E] bg-[#E6EFEA] px-2 py-0.5 rounded-full border border-[#B8CEC5]">
              <CheckCircle className="w-3 h-3 text-[#0F3D2E]" />
              <span>Acknowledged</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#9E1B32] bg-[#FBECEF] px-2 py-0.5 rounded-full border border-[#F3B8C2]">
              <Clock className="w-3 h-3 text-[#9E1B32]" />
              <span>Pending Read</span>
            </span>
          )}
        </div>

        {/* Title & Preview Content */}
        <div>
          <h3 className="text-base font-bold text-cyprus-900 font-display group-hover:text-crimson-600 transition-colors line-clamp-2">
            {memo.title}
          </h3>
          <p className="mt-1 text-xs text-sand-700 line-clamp-2 leading-relaxed">
            {memo.content}
          </p>
        </div>
      </div>

      {/* Footer Info & Actions */}
      <div className="pt-3 border-t border-sand-200 flex items-center justify-between gap-2 text-xs text-sand-600">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" />
            <span>{new Date(memo.published_at).toLocaleDateString()}</span>
          </span>
          <span className="flex items-center gap-1">
            <Users className="w-3.5 h-3.5" />
            <span>{memo.target_audience}</span>
          </span>
          {memo.attachment_url && (
            <span className="flex items-center gap-1 text-cyprus-800 font-medium">
              <Paperclip className="w-3.5 h-3.5" />
              <span>PDF Attached</span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          {isPrivileged && onDelete && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (window.confirm(`Delete"${memo.memo_number}"?`)) {
                  onDelete(memo.id);
                }
              }}
              title="Delete Memo"
              aria-label="Delete Memo"
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
