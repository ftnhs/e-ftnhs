import React, { useState } from"react";
import type { SchoolMemo, Profile } from"../../types";
import { acknowledgeMemo } from"../../services/memoService";
import {
  X,
  Calendar,
  Users,
  Paperclip,
  CheckCircle,
  Eye,
  FileDown,
  ShieldCheck,
} from"lucide-react";

interface MemoReaderModalProps {
  isOpen: boolean;
  onClose: () => void;
  memo: SchoolMemo;
  currentUser: Profile | null;
  isPrivileged: boolean;
  onAcknowledged: (memoId: string) => void;
}

export const MemoReaderModal: React.FC<MemoReaderModalProps> = ({
  isOpen,
  onClose,
  memo,
  currentUser,
  isPrivileged,
  onAcknowledged,
}) => {
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<"memo" |"audit">("memo");

  if (!isOpen) return null;

  const handleAcknowledge = async () => {
    if (!currentUser) return;
    setIsSubmitting(true);
    try {
      const ok = await acknowledgeMemo(memo.id, currentUser.id);
      if (ok) {
        onAcknowledged(memo.id);
      }
    } catch (err) {
      console.error("Error acknowledging memo:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const acks = memo.acknowledgments || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white border border-sand-200 rounded-3xl w-full max-w-3xl p-6 shadow-2xl space-y-6 my-8 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-sand-200 gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-cyprus-900 text-white shadow-xs">
                {memo.memo_number}
              </span>
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                  memo.priority ==="Urgent"
                    ?"bg-crimson-100 text-crimson-800 border border-crimson-300"
                    :"bg-sand-100 text-sand-800 border border-sand-300"
                }`}
              >
                {memo.priority}
              </span>
            </div>
            <h2 className="text-xl font-bold text-cyprus-900 font-display">
              {memo.title}
            </h2>
            <div className="flex items-center gap-4 text-xs text-sand-600 flex-wrap">
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                <span>Published {new Date(memo.published_at).toLocaleDateString()}</span>
              </span>
              <span className="flex items-center gap-1">
                <Users className="w-3.5 h-3.5" />
                <span>Audience: {memo.target_audience}</span>
              </span>
              <span>By: {memo.author?.full_name ||"School Head"}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close memo reader"
            className="p-2 rounded-xl text-sand-600 hover:text-cyprus-900 hover:bg-sand-100 transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* View Switcher if School Head / Privileged */}
        {isPrivileged && (
          <div className="flex items-center gap-2 border-b border-sand-200 pb-2">
            <button
              type="button"
              onClick={() => setActiveTab("memo")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab ==="memo"
                  ?"bg-cyprus-900 text-white shadow-xs"
                  :"text-sand-700 hover:text-cyprus-900"
              }`}
            >
              Memorandum Text
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("audit")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab ==="audit"
                  ?"bg-cyprus-900 text-white shadow-xs"
                  :"text-sand-700 hover:text-cyprus-900"
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Read-Receipt Audit ({acks.length})</span>
            </button>
          </div>
        )}

        {/* Main Body */}
        {activeTab ==="memo" ? (
          <div className="space-y-6">
            {/* Memo Directives */}
            <div className="p-5 rounded-2xl bg-sand-50/70 border border-sand-200 text-xs sm:text-sm text-sand-800 leading-relaxed whitespace-pre-line font-sans">
              {memo.content}
            </div>

            {/* Attached PDF Preview Card */}
            {memo.attachment_url && (
              <div className="p-4 rounded-2xl bg-white border border-sand-300 flex items-center justify-between gap-3 shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-crimson-100 text-crimson-700 flex items-center justify-center shrink-0">
                    <Paperclip className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-cyprus-900 line-clamp-1">
                      {memo.attachment_name ||"Official Signed Memo Circular.pdf"}
                    </div>
                    <div className="text-[11px] text-sand-600">
                      PDF Document • Official DepEd Reference
                    </div>
                  </div>
                </div>

                <a
                  href={memo.attachment_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold border border-sand-300 text-cyprus-900 hover:bg-sand-100 transition-colors"
                >
                  <FileDown className="w-4 h-4" />
                  <span>Open PDF</span>
                </a>
              </div>
            )}

            {/* Acknowledgment Action Box */}
            <div className="p-4 rounded-2xl bg-sand-100/70 border border-sand-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="space-y-0.5">
                <div className="text-xs font-bold text-cyprus-900 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-teal-600" />
                  <span>DepEd Institutional Read-Receipt</span>
                </div>
                <p className="text-[11px] text-sand-600">
                  Acknowledging confirms you have read and noted this official memorandum.
                </p>
              </div>

              {memo.is_acknowledged ? (
                <div className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-teal-100 text-teal-800 border border-teal-300 shrink-0">
                  <CheckCircle className="w-4 h-4 text-teal-600" />
                  <span>Acknowledged</span>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleAcknowledge}
                  disabled={isSubmitting || !currentUser}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-crimson-600 hover:bg-crimson-700 disabled:opacity-50 text-white shadow-xs transition-colors cursor-pointer flex items-center gap-1.5 shrink-0"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>{isSubmitting ?"Recording..." :"Acknowledge Memorandum"}</span>
                </button>
              )}
            </div>
          </div>
        ) : (
          /* Read-Receipt Audit Table for School Head */
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs text-sand-600">
              <span>Staff Acknowledgments:</span>
              <span className="font-bold text-cyprus-900">
                {acks.length} faculty members have acknowledged
              </span>
            </div>

            <div className="overflow-x-auto rounded-xl border border-sand-200">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-sand-100/80 border-b border-sand-200 text-cyprus-900 font-semibold">
                    <th className="py-2.5 px-3">Faculty Name</th>
                    <th className="py-2.5 px-3">Department</th>
                    <th className="py-2.5 px-3 text-right">Acknowledged Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-sand-200 bg-white">
                  {acks.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="py-6 text-center text-sand-500">
                        No faculty members have acknowledged this memorandum yet.
                      </td>
                    </tr>
                  ) : (
                    acks.map((ack) => (
                      <tr key={ack.id} className="hover:bg-sand-50">
                        <td className="py-2.5 px-3 font-semibold text-cyprus-900">
                          {ack.teacher?.full_name ||"Faculty Member"}
                        </td>
                        <td className="py-2.5 px-3 text-sand-600">
                          {ack.teacher?.department ||"General"}
                        </td>
                        <td className="py-2.5 px-3 text-right text-sand-600 font-mono">
                          {new Date(ack.acknowledged_at).toLocaleString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
