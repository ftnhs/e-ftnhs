import React, { useState } from"react";
import type { Profile } from"../../types";
import { X, Trash2, UserX, AlertTriangle } from"lucide-react";

interface DeleteUserModalProps {
  isOpen: boolean;
  user: Profile | null;
  currentUserId?: string;
  onClose: () => void;
  onUserDeleted: () => void;
  onDelete: (userId: string) => Promise<void>;
  onDeactivate: (userId: string) => Promise<void>;
}

export const DeleteUserModal: React.FC<DeleteUserModalProps> = ({
  isOpen,
  user,
  currentUserId,
  onClose,
  onUserDeleted,
  onDelete,
  onDeactivate,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen || !user) return null;

  const isSelf = currentUserId === user.id;

  const handleDeactivate = async () => {
    try {
      setIsSubmitting(true);
      setErrorMsg(null);
      await onDeactivate(user.id);
      onUserDeleted();
      onClose();
    } catch (err: unknown) {
      console.error("[DeleteUserModal] Deactivate Error:", err);
      setErrorMsg(err instanceof Error ? err.message :"Failed to deactivate account.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePermanentDelete = async () => {
    try {
      setIsSubmitting(true);
      setErrorMsg(null);
      await onDelete(user.id);
      onUserDeleted();
      onClose();
    } catch (err: unknown) {
      console.error("[DeleteUserModal] Delete Error:", err);
      setErrorMsg(err instanceof Error ? err.message :"Failed to permanently remove user.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-user-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-cyprus-950/60 backdrop-blur-xs"
    >
      <div className="bg-white border border-sand-200 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-sand-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-crimson-100 text-crimson-700 rounded-xl">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h2 id="delete-user-title" className="text-base font-bold text-cyprus-900">
                Manage Account Access
              </h2>
              <p className="text-xs text-sand-600">
                Deactivate or permanently remove personnel account.
              </p>
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

        {/* Error Alert */}
        {errorMsg && (
          <div className="mx-6 mt-4 p-3 bg-crimson-50 border border-crimson-200 text-crimson-700 text-xs rounded-xl">
            {errorMsg}
          </div>
        )}

        {/* Target Profile Card */}
        <div className="p-6 space-y-4">
          <div className="p-4 bg-sand-50 border border-sand-200 rounded-xl space-y-1">
            <div className="text-sm font-bold text-cyprus-900">
              {user.full_name}
            </div>
            <div className="text-xs font-mono text-sand-600">
              {user.email}
            </div>
            <div className="flex flex-wrap gap-2 pt-2">
              <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-sand-200 text-cyprus-900">
                Role: {user.role}
              </span>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-sand-200 text-cyprus-900">
                {user.designation ||"No Designation"}
              </span>
              <span
                className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                  user.status ==="Approved"
                    ?"bg-emerald-100 text-emerald-800"
                    :"bg-amber-100 text-amber-800"
                }`}
              >
                Status: {user.status}
              </span>
            </div>
          </div>

          {isSelf ? (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
              <strong>Action Restricted:</strong> You cannot deactivate or delete your own active Super Administrator session.
            </div>
          ) : (
            <p className="text-xs text-sand-600 leading-relaxed">
              Choose an action below. <strong>Deactivating</strong> revokes system access while retaining past submissions and records. <strong>Permanent Deletion</strong> completely removes the user and authentication record.
            </p>
          )}

          {/* Action Buttons */}
          <div className="pt-2 flex flex-col sm:flex-row gap-2.5 justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold text-sand-700 hover:bg-sand-100 rounded-lg cursor-pointer transition-colors"
            >
              Cancel
            </button>
            {!isSelf && (
              <>
                <button
                  type="button"
                  onClick={handleDeactivate}
                  disabled={isSubmitting}
                  className="px-3.5 py-2 text-xs font-semibold text-amber-900 bg-amber-200 hover:bg-amber-300 rounded-lg cursor-pointer transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  <UserX className="w-3.5 h-3.5" />
                  <span>Deactivate Account</span>
                </button>
                <button
                  type="button"
                  onClick={handlePermanentDelete}
                  disabled={isSubmitting}
                  className="px-3.5 py-2 text-xs font-bold text-white bg-crimson-600 hover:bg-crimson-700 rounded-lg shadow-xs cursor-pointer transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Permanent Delete</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
