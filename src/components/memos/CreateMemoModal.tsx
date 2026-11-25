import React, { useState } from"react";
import type { SchoolMemo, MemoPriority } from"../../types";
import { createMemo } from"../../services/memoService";
import {
  Bell,
  X,
  AlertTriangle,
  Paperclip,
} from"lucide-react";

interface CreateMemoModalProps {
  isOpen: boolean;
  onClose: () => void;
  authorId: string;
  onMemoCreated: (newMemo: SchoolMemo) => void;
}

export const CreateMemoModal: React.FC<CreateMemoModalProps> = ({
  isOpen,
  onClose,
  authorId,
  onMemoCreated,
}) => {
  const currentYear = new Date().getFullYear();
  const [memoNumber, setMemoNumber] = useState<string>(`School Memo No. 03, s. ${currentYear}`);
  const [title, setTitle] = useState<string>("");
  const [priority, setPriority] = useState<MemoPriority>("Standard");
  const [targetAudience, setTargetAudience] = useState<string>("All Faculty");
  const [content, setContent] = useState<string>("");
  const [attachment, setAttachment] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !=="application/pdf" && !file.name.endsWith(".pdf")) {
        setErrorMessage("Only official PDF memorandum documents are permitted.");
        return;
      }
      if (file.size > 20 * 1024 * 1024) {
        setErrorMessage("PDF attachment exceeds maximum allowed size (20MB).");
        return;
      }
      setAttachment(file);
      setErrorMessage(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!memoNumber.trim() || !title.trim() || !content.trim()) {
      setErrorMessage("Please complete the memorandum number, title, and body content.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const result = await createMemo({
        author_id: authorId,
        memo_number: memoNumber.trim(),
        title: title.trim(),
        priority,
        target_audience: targetAudience,
        content: content.trim(),
        attachment,
      });

      if (!result.success || !result.data) {
        setErrorMessage(result.error ||"Failed to publish memorandum.");
        return;
      }

      onMemoCreated(result.data);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message :"Error publishing memo.";
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white border border-sand-200 rounded-3xl w-full max-w-2xl p-6 shadow-2xl space-y-6 my-8 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-sand-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyprus-900 text-white flex items-center justify-center shadow-xs">
              <Bell className="w-5 h-5 text-sand-300" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-cyprus-900 font-display">
                Broadcast School Memorandum
              </h2>
              <p className="text-xs text-sand-700">
                Official communication to faculty and personnel with read-receipt audit.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="p-2 rounded-xl text-sand-600 hover:text-cyprus-900 hover:bg-sand-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-crimson-50 border border-crimson-200 text-crimson-900 text-xs flex items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 shrink-0 text-crimson-600" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Memo Number & Priority */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="memo-number-input" className="block text-xs font-semibold text-cyprus-900 mb-1">
                Memorandum Reference No.
              </label>
              <input
                id="memo-number-input"
                type="text"
                required
                value={memoNumber}
                onChange={(e) => setMemoNumber(e.target.value)}
                placeholder="e.g. School Memo No. 03, s. 2026"
                className="w-full px-3.5 py-2.5 rounded-xl border border-sand-300 bg-white text-cyprus-900 text-xs focus:outline-hidden focus:ring-2 focus:ring-cyprus-700"
              />
            </div>

            <div>
              <label htmlFor="memo-priority-select" className="block text-xs font-semibold text-cyprus-900 mb-1">
                Urgency Priority
              </label>
              <select
                id="memo-priority-select"
                value={priority}
                onChange={(e) => setPriority(e.target.value as MemoPriority)}
                className="w-full px-3 py-2.5 rounded-xl border border-sand-300 bg-white text-cyprus-900 text-xs focus:outline-hidden focus:ring-2 focus:ring-cyprus-700"
              >
                <option value="Standard">Standard (General School Policy)</option>
                <option value="Urgent">Urgent (Immediate Compliance Required)</option>
                <option value="FYI">FYI (For Your Information / Advisory)</option>
              </select>
            </div>
          </div>

          {/* Title */}
          <div>
            <label htmlFor="memo-title-input" className="block text-xs font-semibold text-cyprus-900 mb-1">
              Subject / Title
            </label>
            <input
              id="memo-title-input"
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Schedule of Faculty Learning Action Cell (SLAC) Sessions"
              className="w-full px-3.5 py-2.5 rounded-xl border border-sand-300 bg-white text-cyprus-900 text-xs focus:outline-hidden focus:ring-2 focus:ring-cyprus-700"
            />
          </div>

          {/* Target Audience */}
          <div>
            <label htmlFor="memo-audience-select" className="block text-xs font-semibold text-cyprus-900 mb-1">
              Target Audience
            </label>
            <select
              id="memo-audience-select"
              value={targetAudience}
              onChange={(e) => setTargetAudience(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-sand-300 bg-white text-cyprus-900 text-xs focus:outline-hidden focus:ring-2 focus:ring-cyprus-700"
            >
              <option value="All Faculty">All Faculty & Staff</option>
              <option value="Junior High School Faculty">Junior High School Faculty</option>
              <option value="Senior High School Faculty">Senior High School Faculty</option>
              <option value="Class Advisers Only">Class Advisers Only</option>
              <option value="Ancillary & Club Coordinators">Ancillary & Club Coordinators</option>
            </select>
          </div>

          {/* Content */}
          <div>
            <label htmlFor="memo-content-textarea" className="block text-xs font-semibold text-cyprus-900 mb-1">
              Memorandum Directives & Details
            </label>
            <textarea
              id="memo-content-textarea"
              required
              rows={5}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="State the purpose, legal bases (DepEd orders), deadlines, and required actions from teachers..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-sand-300 bg-white text-cyprus-900 text-xs focus:outline-hidden focus:ring-2 focus:ring-cyprus-700 leading-relaxed"
            />
          </div>

          {/* PDF Attachment Upload */}
          <div>
            <label htmlFor="memo-pdf-attachment-input" className="block text-xs font-semibold text-cyprus-900 mb-1">
              Official Signed PDF Circular (Optional)
            </label>
            <div className="border border-dashed border-sand-300 rounded-xl p-4 bg-sand-50/50 text-center relative cursor-pointer hover:bg-sand-50 transition-colors">
              <input
                id="memo-pdf-attachment-input"
                type="file"
                accept=".pdf"
                onChange={handleFileChange}
                disabled={isSubmitting}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <div className="flex items-center justify-center gap-2 pointer-events-none text-xs text-sand-700">
                <Paperclip className="w-4 h-4 text-cyprus-700" />
                <span>
                  {attachment ? attachment.name :"Attach signed PDF circular (max 20MB)"}
                </span>
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="pt-4 border-t border-sand-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl text-xs font-semibold border border-sand-300 text-sand-800 hover:bg-sand-100 transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl text-xs font-semibold bg-crimson-600 hover:bg-crimson-700 disabled:opacity-50 text-white shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
            >
              {isSubmitting ? (
                <span>Publishing Memo...</span>
              ) : (
                <>
                  <Bell className="w-3.5 h-3.5" />
                  <span>Publish Memorandum</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
