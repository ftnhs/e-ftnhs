import React, { useState } from"react";
import type { ClassRecord, StudentGrade } from"../../types";
import { addStudentToClassRecord } from"../../services/classRecordService";
import { UserPlus, X, AlertTriangle } from"lucide-react";

interface AddStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: ClassRecord;
  onStudentAdded: (newGrade: StudentGrade) => void;
}

export const AddStudentModal: React.FC<AddStudentModalProps> = ({
  isOpen,
  onClose,
  record,
  onStudentAdded,
}) => {
  const [studentName, setStudentName] = useState<string>("");
  const [studentLrn, setStudentLrn] = useState<string>("");
  const [gender, setGender] = useState<"Male" |"Female">("Male");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentName.trim()) {
      setErrorMessage("Please enter the student's full name (Last Name, First Name).");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const result = await addStudentToClassRecord(
        record.id,
        record,
        studentName.trim(),
        studentLrn.trim(),
        gender
      );

      if (!result.success || !result.data) {
        setErrorMessage(result.error ||"Failed to enroll student.");
        return;
      }

      onStudentAdded(result.data);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message :"Error enrolling student.";
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white border border-sand-200 rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-6 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-4 border-b border-sand-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyprus-900 text-white flex items-center justify-center shadow-xs">
              <UserPlus className="w-5 h-5 text-sand-300" />
            </div>
            <div>
              <h2 className="text-base font-bold text-cyprus-900 font-display">
                Enroll Student in ECR
              </h2>
              <p className="text-xs text-sand-700">
                Grade {record.section?.grade_level} - {record.section?.section_name}
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

        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-crimson-50 border border-crimson-200 text-crimson-900 text-xs flex items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 shrink-0 text-crimson-600" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="student-name-input" className="block text-xs font-semibold text-cyprus-900 mb-1">
              Learner Full Name (Last Name, First Name M.I.)
            </label>
            <input
              id="student-name-input"
              type="text"
              required
              value={studentName}
              onChange={(e) => setStudentName(e.target.value)}
              placeholder="e.g. Abarquez, Juan Carlos M."
              className="w-full px-3.5 py-2.5 rounded-xl border border-sand-300 bg-white text-cyprus-900 text-xs focus:outline-hidden focus:ring-2 focus:ring-cyprus-700"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="student-lrn-input" className="block text-xs font-semibold text-cyprus-900 mb-1">
                Learner Reference No. (LRN)
              </label>
              <input
                id="student-lrn-input"
                type="text"
                value={studentLrn}
                onChange={(e) => setStudentLrn(e.target.value)}
                placeholder="12-digit DepEd LRN"
                maxLength={12}
                className="w-full px-3.5 py-2.5 rounded-xl border border-sand-300 bg-white text-cyprus-900 text-xs focus:outline-hidden focus:ring-2 focus:ring-cyprus-700"
              />
            </div>

            <div>
              <label htmlFor="student-gender-select" className="block text-xs font-semibold text-cyprus-900 mb-1">
                Gender
              </label>
              <select
                id="student-gender-select"
                value={gender}
                onChange={(e) => setGender(e.target.value as"Male" |"Female")}
                className="w-full px-3 py-2.5 rounded-xl border border-sand-300 bg-white text-cyprus-900 text-xs focus:outline-hidden focus:ring-2 focus:ring-cyprus-700"
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
            </div>
          </div>

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
              className="px-5 py-2 rounded-xl text-xs font-semibold bg-crimson-600 hover:bg-crimson-700 disabled:opacity-50 text-white shadow-xs transition-colors cursor-pointer"
            >
              {isSubmitting ?"Enrolling..." :"Enroll Student"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
