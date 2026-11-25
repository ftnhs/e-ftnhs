import React, { useState } from "react";
import type { Subject, Section, Profile, TeacherSubjectLoad } from "../../types";
import { createTeacherLoad, updateTeacherLoad } from "../../services/timetableService";
import { BookOpen, X, Check } from "lucide-react";

interface AssignLoadModalProps {
  isOpen: boolean;
  onClose: () => void;
  termId: string;
  teachers: Profile[];
  subjects: Subject[];
  sections: Section[];
  preselectedTeacherId?: string;
  editingLoad?: TeacherSubjectLoad | null;
  onLoadCreated: (newLoad: TeacherSubjectLoad) => void;
  onLoadUpdated?: (updatedLoad: TeacherSubjectLoad) => void;
}

export const AssignLoadModal: React.FC<AssignLoadModalProps> = ({
  isOpen,
  onClose,
  termId,
  teachers,
  subjects,
  sections,
  preselectedTeacherId,
  editingLoad = null,
  onLoadCreated,
  onLoadUpdated,
}) => {
  const isEditing = Boolean(editingLoad);

  const [teacherId, setTeacherId] = useState<string>("");
  const [subjectId, setSubjectId] = useState<string>("");
  const [sectionId, setSectionId] = useState<string>("");
  const [teachingMinutes, setTeachingMinutes] = useState<number>(240);
  const [ancillaryMinutes, setAncillaryMinutes] = useState<number>(0);
  const [ancillaryDescription, setAncillaryDescription] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  React.useEffect(() => {
    if (!isOpen) return;

    setErrorMessage(null);

    if (editingLoad) {
      setTeacherId(editingLoad.teacher_id);
      setSubjectId(editingLoad.subject_id);
      setSectionId(editingLoad.section_id);
      setTeachingMinutes(editingLoad.teaching_minutes_weekly || 240);
      setAncillaryMinutes(editingLoad.ancillary_minutes_weekly || 0);
      setAncillaryDescription(editingLoad.ancillary_description || "");
    } else {
      const defaultTeacher = preselectedTeacherId || teachers[0]?.id || "";
      const defaultSubject = subjects[0];
      const defaultSection = sections[0]?.id || "";
      setTeacherId(defaultTeacher);
      setSubjectId(defaultSubject?.id || "");
      setSectionId(defaultSection);
      setTeachingMinutes(defaultSubject?.minutes_per_week || 240);
      setAncillaryMinutes(0);
      setAncillaryDescription("");
    }
  }, [isOpen, editingLoad, preselectedTeacherId, teachers, subjects, sections]);

  if (!isOpen) return null;

  const handleSubjectChange = (newSubjectId: string) => {
    setSubjectId(newSubjectId);
    if (!isEditing) {
      const subj = subjects.find((s) => s.id === newSubjectId);
      if (subj?.minutes_per_week) {
        setTeachingMinutes(subj.minutes_per_week);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teacherId || !subjectId || !sectionId) {
      setErrorMessage("Please select teacher, subject, and section.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      if (isEditing && editingLoad) {
        const updated = await updateTeacherLoad(editingLoad.id, {
          teaching_minutes_weekly: Number(teachingMinutes) || 240,
          ancillary_minutes_weekly: Number(ancillaryMinutes) || 0,
          ancillary_description: ancillaryDescription.trim() || null,
        });

        if (!updated) {
          setErrorMessage("Failed to update subject load.");
          return;
        }

        onLoadUpdated?.(updated);
        onClose();
      } else {
        const result = await createTeacherLoad({
          term_id: termId,
          teacher_id: teacherId,
          subject_id: subjectId,
          section_id: sectionId,
          teaching_minutes_weekly: Number(teachingMinutes) || 240,
          ancillary_minutes_weekly: Number(ancillaryMinutes) || 0,
          ancillary_description: ancillaryDescription.trim() || undefined,
        });

        if (!result) {
          setErrorMessage(
            "Failed to assign load. This teacher may already be assigned to this subject and section in this term."
          );
          return;
        }

        onLoadCreated(result);
        onClose();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error saving load assignment.";
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-cyprus-950/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Dialog */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="assign-load-title"
        className="relative bg-white w-full max-w-lg rounded-2xl border border-sand-200 shadow-2xl p-6 overflow-hidden space-y-5 transition-colors z-10"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-sand-200 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-cyprus-100 text-cyprus-900 flex items-center justify-center font-bold">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2
                id="assign-load-title"
                className="text-base font-bold text-cyprus-900 font-display"
              >
                {isEditing ? "Edit Term Subject Load" : "Assign Faculty Subject Load"}
              </h2>
              <p className="text-xs text-sand-600">
                {isEditing
                  ? "Adjust weekly teaching minutes or ancillary load for this term only."
                  : "Set per-term weekly teaching minutes without changing other terms."}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-sand-500 hover:text-cyprus-900 rounded-lg cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMessage && (
          <div
            role="alert"
            className="p-3 bg-crimson-50 border border-crimson-200 text-crimson-700 text-xs rounded-lg"
          >
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Teacher */}
          <div>
            <label
              htmlFor="teacher-load-select"
              className="block text-xs font-semibold text-cyprus-900 mb-1"
            >
              Faculty Member
            </label>
            <select
              id="teacher-load-select"
              value={teacherId}
              onChange={(e) => setTeacherId(e.target.value)}
              disabled={isEditing}
              required
              className="w-full py-2 px-3 rounded-xl border border-sand-300 bg-white disabled:bg-sand-50 disabled:text-sand-600 text-xs sm:text-sm text-cyprus-900 focus-visible:ring-2 focus-visible:ring-[#0F3D2E]"
            >
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.full_name} ({t.designation || "Teacher"} • {t.department || "General"})
                </option>
              ))}
            </select>
          </div>

          {/* Subject & Section */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="subject-load-select"
                className="block text-xs font-semibold text-cyprus-900 mb-1"
              >
                Subject
              </label>
              <select
                id="subject-load-select"
                value={subjectId}
                onChange={(e) => handleSubjectChange(e.target.value)}
                disabled={isEditing}
                required
                className="w-full py-2 px-3 rounded-xl border border-sand-300 bg-white disabled:bg-sand-50 disabled:text-sand-600 text-xs sm:text-sm text-cyprus-900 focus-visible:ring-2 focus-visible:ring-[#0F3D2E]"
              >
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.subject_code} - {s.subject_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="section-load-select"
                className="block text-xs font-semibold text-cyprus-900 mb-1"
              >
                Class Section
              </label>
              <select
                id="section-load-select"
                value={sectionId}
                onChange={(e) => setSectionId(e.target.value)}
                disabled={isEditing}
                required
                className="w-full py-2 px-3 rounded-xl border border-sand-300 bg-white disabled:bg-sand-50 disabled:text-sand-600 text-xs sm:text-sm text-cyprus-900 focus-visible:ring-2 focus-visible:ring-[#0F3D2E]"
              >
                {sections.map((sec) => (
                  <option key={sec.id} value={sec.id}>
                    Grade {sec.grade_level} - {sec.section_name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Teaching Minutes & Ancillary Minutes */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="teaching-minutes"
                className="block text-xs font-semibold text-cyprus-900 mb-1"
              >
                Weekly Teaching Minutes (This Term)
              </label>
              <input
                id="teaching-minutes"
                type="number"
                min="30"
                max="1800"
                step="10"
                value={teachingMinutes}
                onChange={(e) => setTeachingMinutes(Number(e.target.value))}
                required
                className="w-full py-2 px-3 rounded-xl border border-sand-300 bg-white text-xs sm:text-sm text-cyprus-900 focus-visible:ring-2 focus-visible:ring-[#0F3D2E]"
              />
              <span className="text-[10px] text-sand-500">
                Editable per term ({(teachingMinutes / 60).toFixed(1)} hrs/wk)
              </span>
            </div>

            <div>
              <label
                htmlFor="ancillary-minutes"
                className="block text-xs font-semibold text-cyprus-900 mb-1"
              >
                Ancillary Load Minutes
              </label>
              <input
                id="ancillary-minutes"
                type="number"
                min="0"
                max="600"
                step="30"
                value={ancillaryMinutes}
                onChange={(e) => setAncillaryMinutes(Number(e.target.value))}
                className="w-full py-2 px-3 rounded-xl border border-sand-300 bg-white text-xs sm:text-sm text-cyprus-900 focus-visible:ring-2 focus-visible:ring-[#0F3D2E]"
              />
              <span className="text-[10px] text-sand-500">Advisory / coordinatorship</span>
            </div>
          </div>

          {/* Ancillary Description */}
          <div>
            <label
              htmlFor="ancillary-desc"
              className="block text-xs font-semibold text-cyprus-900 mb-1"
            >
              Ancillary Duty / Designation (Optional)
            </label>
            <input
              id="ancillary-desc"
              type="text"
              value={ancillaryDescription}
              onChange={(e) => setAncillaryDescription(e.target.value)}
              placeholder="e.g., Class Adviser, ICT Coordinator, Science Lab Custodian"
              className="w-full py-2 px-3 rounded-xl border border-sand-300 bg-white text-xs sm:text-sm text-cyprus-900 focus-visible:ring-2 focus-visible:ring-[#0F3D2E]"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-sand-200">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold rounded-xl border border-sand-300 text-sand-700 hover:bg-sand-100 cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-semibold rounded-xl bg-[#0F3D2E] hover:bg-[#0A2E22] text-white shadow-xs focus-visible:ring-2 focus-visible:ring-[#0F3D2E] cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>
                {isSubmitting
                  ? "Saving..."
                  : isEditing
                    ? "Save Term Minutes"
                    : "Confirm Load Assignment"}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
