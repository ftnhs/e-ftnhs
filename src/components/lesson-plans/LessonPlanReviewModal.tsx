import React, { useState, useEffect } from"react";
import { useAuth } from"../../context/AuthContext";
import { getLessonPlanAttachments, reviewLessonPlan } from"../../services/lessonPlanService";
import type { LessonPlan } from"../../types";
import {
  X,
  Award,
  CheckCircle,
  RotateCcw,
  FileText,
  User,
  Calendar,
  ExternalLink,
  MessageSquare,
  ShieldCheck,
  Edit,
  Trash2,
} from"lucide-react";

interface LessonPlanReviewModalProps {
  plan: LessonPlan | null;
  isOpen: boolean;
  onClose: () => void;
  onReviewed: (updatedPlan: LessonPlan) => void;
  onEdit?: (plan: LessonPlan) => void;
  onDelete?: (plan: LessonPlan) => void;
}

const FEEDBACK_SUGGESTIONS = [
"Curriculum Aligned and compliant with DepEd learning standards.",
"Well-structured formative assessment items.",
"Include guided practice before independent tasks.",
"Differentiate activities for diverse learner pacing.",
"Good integration of higher-order thinking skills (HOTS).",
];

export const LessonPlanReviewModal: React.FC<LessonPlanReviewModalProps> = ({
  plan,
  isOpen,
  onClose,
  onReviewed,
  onEdit,
  onDelete,
}) => {
  const { profile, user, isAdmin, isSchoolHead } = useAuth();
  const [feedback, setFeedback] = useState<string>(plan?.reviewer_feedback ||"");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    setFeedback(plan?.reviewer_feedback || "");
    setErrorMessage(null);
  }, [plan]);

  if (!isOpen || !plan) return null;

  const attachments = getLessonPlanAttachments(plan);

  const canReview = isAdmin || isSchoolHead;
  const reviewerName = profile?.full_name ||"School Administrator";
  const reviewerRole = profile?.designation || profile?.role ||"Secondary School Principal IV";

  const handleAction = async (status:"Approved" |"Needs Revision") => {
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const reviewerId = profile?.id || user!.id;
      const updated = await reviewLessonPlan(
        plan.id,
        reviewerId,
        status,
        feedback.trim() || (status ==="Approved" ?"Noted with approval." :"Returned for adjustments.")
      );

      if (updated) {
        onReviewed({
          ...plan,
          ...updated,
          reviewer: {
            id: reviewerId,
            full_name: reviewerName,
            role: reviewerRole,
          },
        });
        onClose();
      }
    } catch (err: unknown) {
      console.error("[Review DLL Error]:", err);
      const msg = err instanceof Error ? err.message :"Failed to record review decision.";
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-cyprus-950/60 backdrop-blur-xs overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="review-modal-title"
    >
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-sand-200 overflow-hidden my-8 transition-colors">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-sand-200 bg-sand-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-cyprus-900 text-deped-gold-400 flex items-center justify-center shadow-xs">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 id="review-modal-title" className="text-base font-bold text-cyprus-900 font-display leading-tight">
                Review & Digital Verification Desk
              </h2>
              <span className="text-xs text-sand-600">
                Weekly DLL/DLP Evaluation & DepEd Verification Stamp
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-sand-600 hover:bg-sand-100 cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 space-y-5">
          {errorMessage && (
            <div role="alert" className="p-3 bg-crimson-50 border border-crimson-200 rounded-xl text-xs text-crimson-700">
              {errorMessage}
            </div>
          )}

          {/* Plan Metadata Card */}
          <div className="p-4 bg-sand-50 rounded-xl border border-sand-200 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-cyprus-100 text-cyprus-900 border border-cyprus-200">
                Week {plan.week_number} • {plan.department}
              </span>
              <span
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${
                  plan.status ==="Approved"
                    ?"bg-emerald-100 text-emerald-800"
                    : plan.status ==="Needs Revision"
                    ?"bg-crimson-100 text-crimson-800"
                    :"bg-sand-200 text-sand-800"
                }`}
              >
                {plan.status}
              </span>
            </div>

            <div>
              <h3 className="text-sm font-bold text-cyprus-900">
                {plan.title}
              </h3>
              <p className="text-xs text-sand-700 mt-1">
                Subject: <strong>{plan.subject_name}</strong> • Section: <strong>Grade {plan.grade_level} - {plan.section_name}</strong>
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-sand-700 pt-2 border-t border-sand-200">
              <div className="flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-sand-400" />
                <span>Teacher: <strong>{plan.teacher?.full_name ||"Faculty Member"}</strong></span>
              </div>
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-sand-400" />
                <span>Submitted: <strong>{new Date(plan.submission_date).toLocaleDateString()}</strong> {plan.is_late && <span className="text-crimson-600 font-bold">(Late)</span>}</span>
              </div>
            </div>

            {/* Attached Lesson Plan Document(s) */}
            {attachments.length > 0 ? (
              <div className="pt-2 space-y-2">
                {attachments.map((file, idx) => (
                  <a
                    key={`${file.file_url}-${idx}`}
                    href={file.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex items-center justify-between p-3 rounded-xl bg-sand-100/70 border border-sand-300 text-cyprus-900 hover:bg-sand-200 transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <FileText className="w-5 h-5 text-cyprus-700 shrink-0" />
                      <div className="min-w-0">
                        <div className="font-bold text-xs truncate">
                          {file.file_name || "Lesson Plan Document (.pdf / .docx)"}
                        </div>
                        <div className="text-[10px] text-sand-600">
                          {file.file_size
                            ? `${Math.round(file.file_size / 1024)} KB • `
                            : ""}
                          Curriculum Learning Competencies, Objectives & Procedures
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-xs font-semibold text-crimson-600 shrink-0 ml-2">
                      <span>Open Document</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </div>
                  </a>
                ))}
              </div>
            ) : (
              <div className="text-[11px] text-sand-400 italic pt-2">
                No document file attached.
              </div>
            )}
          </div>

          {/* Feedback & Suggestion Tags */}
          <div className="space-y-2">
            <label htmlFor="review-feedback" className="block text-xs font-bold text-sand-800 flex items-center gap-1.5">
              <MessageSquare className="w-4 h-4 text-cyprus-700" />
              <span>Constructive Evaluator Feedback & Notes</span>
            </label>

            <div className="flex flex-wrap gap-1.5 pb-1">
              {FEEDBACK_SUGGESTIONS.map((sug, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setFeedback((prev) => (prev ? `${prev} ${sug}` : sug))}
                  className="px-2.5 py-1 text-[11px] rounded-lg bg-sand-100 hover:bg-sand-200 text-cyprus-900 border border-sand-300 cursor-pointer"
                >
                  + {sug}
                </button>
              ))}
            </div>

            <textarea
              id="review-feedback"
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Provide constructive feedback, alignment commendations, or revision recommendations..."
              rows={3}
              className="w-full text-xs p-3 bg-sand-50 border border-sand-300 rounded-xl text-cyprus-900 focus:ring-2 focus:ring-crimson-600"
            />
          </div>

          {/* Digital Verification Stamp Preview */}
          <div className="p-4 rounded-xl border border-emerald-300 bg-emerald-50/50 flex items-center gap-3">
            <Award className="w-8 h-8 text-emerald-600 shrink-0" />
            <div className="text-xs">
              <div className="font-extrabold text-emerald-900 uppercase tracking-wide">
                DepEd Verification Stamp Preview
              </div>
              <div className="text-emerald-800">
                NOTED BY: <strong>{reviewerName.toUpperCase()}</strong> • {reviewerRole}
              </div>
              <div className="text-[10px] text-emerald-700/80 font-mono">
                FTNHS System Timestamp: {new Date().toLocaleDateString()} • School ID: 302851
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-5 border-t border-sand-200 bg-sand-50/70 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-sand-700 hover:bg-sand-100 rounded-xl cursor-pointer"
            >
              Close
            </button>
            {(canReview || plan.teacher_id === (profile?.id || user?.id)) && (
              <>
                {onEdit && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onEdit(plan);
                    }}
                    className="px-3 py-2 text-xs font-semibold text-cyprus-900 bg-white hover:bg-sand-100 border border-sand-300 rounded-xl cursor-pointer flex items-center gap-1.5"
                  >
                    <Edit className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </button>
                )}
                {onDelete && (
                  <button
                    type="button"
                    onClick={() => onDelete(plan)}
                    className="px-3 py-2 text-xs font-semibold text-crimson-700 bg-crimson-50 hover:bg-crimson-100 border border-crimson-200 rounded-xl cursor-pointer flex items-center gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </button>
                )}
              </>
            )}
          </div>

          {canReview ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleAction("Needs Revision")}
                disabled={isSubmitting}
                className="px-4 py-2 text-xs font-semibold text-crimson-700 bg-crimson-50 hover:bg-crimson-100 rounded-xl border border-crimson-200 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Return for Revision</span>
              </button>

              <button
                type="button"
                onClick={() => handleAction("Approved")}
                disabled={isSubmitting}
                className="px-5 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-600 rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <CheckCircle className="w-4 h-4" />
                <span>Approve & Apply Stamp</span>
              </button>
            </div>
          ) : (
            <span className="text-xs text-sand-500 italic">
              View-only mode (Checking reserved for Super Admin / School Head).
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
