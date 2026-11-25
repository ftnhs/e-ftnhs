import React, { useState, useEffect, useMemo } from "react";
import { useAuth } from "../../context/AuthContext";
import {
  fetchLessonPlanModalCatalogs,
  getLessonPlanAttachments,
  submitLessonPlan,
  updateLessonPlan,
  uploadLessonPlanFiles,
} from "../../services/lessonPlanService";
import { validateUploadedFile, UPLOAD_LIMITS } from "../../utils/validators";
import {
  X,
  UploadCloud,
  FileText,
  AlertCircle,
  CheckCircle2,
  Trash2,
  Loader2,
} from "lucide-react";
import type {
  AcademicTerm,
  Department,
  LessonPlan,
  LessonPlanAttachment,
  Section,
  Subject,
} from "../../types";

interface LessonPlanSubmitModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitted: (newPlan: LessonPlan) => void;
  initialData?: LessonPlan | null;
  onUpdated?: (updatedPlan: LessonPlan) => void;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export const LessonPlanSubmitModal: React.FC<LessonPlanSubmitModalProps> = ({
  isOpen,
  onClose,
  onSubmitted,
  initialData = null,
  onUpdated,
}) => {
  const { profile, user } = useAuth();
  const teacherId = profile?.id || user?.id;
  const isEditMode = Boolean(initialData);

  const [activeTerm, setActiveTerm] = useState<AcademicTerm | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [isLoadingCatalogs, setIsLoadingCatalogs] = useState<boolean>(false);

  const [weekNumber, setWeekNumber] = useState<number>(1);
  const [department, setDepartment] = useState<string>("");
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("");
  const [selectedSectionId, setSelectedSectionId] = useState<string>("");
  const [title, setTitle] = useState<string>("");
  const [existingAttachments, setExistingAttachments] = useState<LessonPlanAttachment[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;
    setErrorMessage(null);
    setSelectedFiles([]);

    if (initialData) {
      setWeekNumber(initialData.week_number);
      setTitle(initialData.title);
      setExistingAttachments(getLessonPlanAttachments(initialData));
    } else {
      setWeekNumber(1);
      setTitle("");
      setExistingAttachments([]);
    }

    setIsLoadingCatalogs(true);

    fetchLessonPlanModalCatalogs(initialData?.teacher_id || teacherId)
      .then((catalogs) => {
        if (cancelled) return;

        setActiveTerm(catalogs.activeTerm);
        setDepartments(catalogs.departments);
        setSections(catalogs.sections);
        setSubjects(catalogs.subjects);

        if (initialData) {
          const matchedDept = catalogs.departments.find(
            (d) => d.dept_name === initialData.department
          );
          setDepartment(matchedDept?.dept_name || initialData.department || "");

          const matchedSubj = catalogs.subjects.find(
            (s) =>
              s.subject_name === initialData.subject_name &&
              s.grade_level === initialData.grade_level
          ) || catalogs.subjects.find((s) => s.subject_name === initialData.subject_name);
          setSelectedSubjectId(matchedSubj?.id || catalogs.subjects[0]?.id || "");

          const matchedSec = catalogs.sections.find(
            (sec) =>
              sec.grade_level === initialData.grade_level &&
              sec.section_name === initialData.section_name
          );
          setSelectedSectionId(matchedSec?.id || catalogs.sections[0]?.id || "");
        } else {
          // Default department from user's profile if present in DB catalog, otherwise first DB department
          const matchedDept = catalogs.departments.find(
            (d) => d.dept_name === profile?.department
          );
          setDepartment(
            matchedDept?.dept_name || catalogs.departments[0]?.dept_name || profile?.department || ""
          );

          // Smart-default subject & section from the teacher's active-term loads if available
          const preferredLoad = catalogs.teacherLoadPairs.find(
            (pair) =>
              catalogs.subjects.some((s) => s.id === pair.subject_id) &&
              catalogs.sections.some((sec) => sec.id === pair.section_id)
          );

          setSelectedSubjectId(preferredLoad?.subject_id || catalogs.subjects[0]?.id || "");
          setSelectedSectionId(preferredLoad?.section_id || catalogs.sections[0]?.id || "");
        }
      })
      .catch((err) => {
        if (cancelled) return;
        console.error("[LessonPlanSubmitModal] Failed to load catalogs:", err);
        setErrorMessage("Failed to load departments, subjects, or sections from database.");
      })
      .finally(() => {
        if (!cancelled) setIsLoadingCatalogs(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, teacherId, profile?.department, initialData]);

  const subjectsByGrade = useMemo(() => {
    const groups = new Map<number, Subject[]>();
    for (const subj of subjects) {
      const list = groups.get(subj.grade_level) || [];
      list.push(subj);
      groups.set(subj.grade_level, list);
    }
    return Array.from(groups.entries()).sort((a, b) => a[0] - b[0]);
  }, [subjects]);

  if (!isOpen) return null;

  const selectedSubject = subjects.find((s) => s.id === selectedSubjectId);
  const selectedSection = sections.find((sec) => sec.id === selectedSectionId);

  const processFiles = (incomingList: FileList | File[]) => {
    const incoming = Array.from(incomingList);
    if (incoming.length === 0) return;

    const validToAdd: File[] = [];
    const errors: string[] = [];

    for (const file of incoming) {
      const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
      const allowedMimes = [...UPLOAD_LIMITS.PDF.mimeTypes, ...UPLOAD_LIMITS.DOCX.mimeTypes];
      const maxBytes = isPdf ? UPLOAD_LIMITS.PDF.maxBytes : UPLOAD_LIMITS.DOCX.maxBytes;
      const label = isPdf ? UPLOAD_LIMITS.PDF.label : UPLOAD_LIMITS.DOCX.label;

      const validation = validateUploadedFile(file, allowedMimes, maxBytes, label);
      if (!validation.valid) {
        errors.push(`${file.name}: ${validation.error || "Invalid format or size limit exceeded."}`);
        continue;
      }

      const alreadyAdded =
        selectedFiles.some((f) => f.name === file.name && f.size === file.size) ||
        validToAdd.some((f) => f.name === file.name && f.size === file.size);

      if (!alreadyAdded) {
        validToAdd.push(file);
      }
    }

    if (errors.length > 0) {
      setErrorMessage(errors.join(" "));
    } else {
      setErrorMessage(null);
    }

    if (validToAdd.length > 0) {
      setSelectedFiles((prev) => [...prev, ...validToAdd]);
      const firstFile = validToAdd[0];
      if (!title.trim() && firstFile) {
        const baseName =
          firstFile.name.substring(0, firstFile.name.lastIndexOf(".")) || firstFile.name;
        setTitle(`DLL W${weekNumber}: ${baseName.replace(/[_-]+/g, " ").trim()}`);
      }
    }
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
      e.target.value = "";
    }
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!department) {
      setErrorMessage("Please select an academic department.");
      return;
    }

    if (!selectedSubject) {
      setErrorMessage("Please select a subject for this term.");
      return;
    }

    if (!selectedSection) {
      setErrorMessage("Please select a grade & section.");
      return;
    }

    if (existingAttachments.length + selectedFiles.length === 0) {
      setErrorMessage("Please attach at least one lesson plan document (.pdf or .docx).");
      return;
    }

    if (!title.trim()) {
      setErrorMessage("Please enter a lesson plan title.");
      return;
    }

    if (!teacherId) {
      setErrorMessage("Authenticated user session is required.");
      return;
    }

    setIsSubmitting(true);

    try {
      const ownerId = initialData?.teacher_id || teacherId;
      const uploadedAttachments =
        selectedFiles.length > 0
          ? await uploadLessonPlanFiles(selectedFiles, ownerId, weekNumber)
          : [];
      const mergedAttachments = [...existingAttachments, ...uploadedAttachments];
      const primary = mergedAttachments[0];

      if (initialData) {
        const updatedPlan = await updateLessonPlan(initialData.id, {
          week_number: weekNumber,
          subject_name: selectedSubject.subject_name,
          grade_level: selectedSection.grade_level,
          section_name: selectedSection.section_name,
          department,
          title: title.trim(),
          file_url: primary?.file_url ?? null,
          file_name: primary?.file_name ?? null,
          file_size: primary?.file_size ?? null,
          mime_type: primary?.mime_type ?? null,
          attachments: mergedAttachments,
          status: initialData.status === "Needs Revision" ? "Submitted" : initialData.status,
        });

        if (!updatedPlan) {
          throw new Error("Failed to update lesson plan record.");
        }

        if (onUpdated) {
          onUpdated({
            ...initialData,
            ...updatedPlan,
            attachments: mergedAttachments,
          });
        }
        onClose();
        return;
      }

      const newPlan = await submitLessonPlan({
        teacher_id: teacherId,
        term_id: activeTerm?.id || null,
        week_number: weekNumber,
        subject_name: selectedSubject.subject_name,
        grade_level: selectedSection.grade_level,
        section_name: selectedSection.section_name,
        department,
        title: title.trim(),
        file_url: primary?.file_url ?? null,
        file_name: primary?.file_name ?? null,
        file_size: primary?.file_size ?? null,
        mime_type: primary?.mime_type ?? null,
        attachments: mergedAttachments,
      });

      if (!newPlan) {
        throw new Error("Failed to create lesson plan record.");
      }

      const fullPlan: LessonPlan = {
        ...newPlan,
        attachments: mergedAttachments,
        teacher: {
          id: teacherId,
          full_name: profile?.full_name || "Faculty Member",
          email: profile?.email || user?.email || "",
          department,
          avatar_url: profile?.avatar_url || null,
        },
      };

      onSubmitted(fullPlan);
      onClose();
    } catch (err: unknown) {
      console.error("[Submit DLL Error]:", err);
      const msg = err instanceof Error ? err.message : "Failed to upload and submit lesson plan.";
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="submit-modal-title"
    >
      <div className="relative w-full max-w-xl bg-[#FFFFFF] rounded-2xl shadow-xl border border-[#E3DDD1] overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#E3DDD1] bg-[#FAF8F5]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#0F3D2E] text-[#F4F1EA] flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h2
                id="submit-modal-title"
                className="text-base font-semibold text-[#1C2420] leading-tight"
              >
                {isEditMode ? "Edit Lesson Log (DLL/DLP)" : "Submit Weekly Lesson Log (DLL/DLP)"}
              </h2>
              {activeTerm && (
                <span className="text-xs text-[#5C6660]">
                  SY {activeTerm.school_year} • Term {activeTerm.term_number}
                </span>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#5C6660] hover:text-[#1C2420] hover:bg-[#E3DDD1]/40 cursor-pointer transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4">
          {errorMessage && (
            <div
              role="alert"
              className="p-3 bg-[#FBECEF] border border-[#9E1B32]/30 rounded-xl text-xs text-[#9E1B32] flex items-start gap-2"
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {isLoadingCatalogs ? (
            <div className="py-10 text-center space-y-2">
              <Loader2 className="w-6 h-6 text-[#0F3D2E] animate-spin mx-auto" />
              <p className="text-xs text-[#5C6660]">Loading active term subjects, sections, and departments...</p>
            </div>
          ) : (
            <>
              {/* Row 1: Week Number & Department */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="dll-week" className="block text-xs font-semibold text-[#1C2420] mb-1">
                    Week Number (Weeks 1 to 10) *
                  </label>
                  <select
                    id="dll-week"
                    value={weekNumber}
                    onChange={(e) => setWeekNumber(parseInt(e.target.value, 10))}
                    className="w-full text-xs p-2.5 bg-[#FAF8F5] border border-[#E3DDD1] rounded-xl text-[#1C2420] focus:outline-none focus:ring-2 focus:ring-[#0F3D2E]"
                  >
                    {Array.from({ length: 10 }, (_, i) => (
                      <option key={i + 1} value={i + 1}>
                        Week {i + 1}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="dll-dept" className="block text-xs font-semibold text-[#1C2420] mb-1">
                    Academic Department *
                  </label>
                  <select
                    id="dll-dept"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    required
                    className="w-full text-xs p-2.5 bg-[#FAF8F5] border border-[#E3DDD1] rounded-xl text-[#1C2420] focus:outline-none focus:ring-2 focus:ring-[#0F3D2E]"
                  >
                    {departments.length === 0 ? (
                      <option value="">No active departments found</option>
                    ) : (
                      departments.map((d) => (
                        <option key={d.id} value={d.dept_name}>
                          {d.dept_name}
                        </option>
                      ))
                    )}
                  </select>
                </div>
              </div>

              {/* Row 2: Subject & Section */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="dll-subj" className="block text-xs font-semibold text-[#1C2420] mb-1">
                    Subject Name *
                  </label>
                  <select
                    id="dll-subj"
                    value={selectedSubjectId}
                    onChange={(e) => setSelectedSubjectId(e.target.value)}
                    required
                    className="w-full text-xs p-2.5 bg-[#FAF8F5] border border-[#E3DDD1] rounded-xl text-[#1C2420] focus:outline-none focus:ring-2 focus:ring-[#0F3D2E]"
                  >
                    {subjects.length === 0 ? (
                      <option value="">No subjects in active term</option>
                    ) : (
                      subjectsByGrade.map(([grade, gradeSubjects]) => (
                        <optgroup key={grade} label={`Grade ${grade}`}>
                          {gradeSubjects.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.subject_name} ({s.subject_code})
                            </option>
                          ))}
                        </optgroup>
                      ))
                    )}
                  </select>
                </div>

                <div>
                  <label htmlFor="dll-sec" className="block text-xs font-semibold text-[#1C2420] mb-1">
                    Grade & Section *
                  </label>
                  <select
                    id="dll-sec"
                    value={selectedSectionId}
                    onChange={(e) => setSelectedSectionId(e.target.value)}
                    required
                    className="w-full text-xs p-2.5 bg-[#FAF8F5] border border-[#E3DDD1] rounded-xl text-[#1C2420] focus:outline-none focus:ring-2 focus:ring-[#0F3D2E]"
                  >
                    {sections.length === 0 ? (
                      <option value="">No sections in active term</option>
                    ) : (
                      sections.map((sec) => (
                        <option key={sec.id} value={sec.id}>
                          Grade {sec.grade_level} - {sec.section_name}
                        </option>
                      ))
                    )}
                  </select>
                </div>
              </div>

              {/* Row 3: Lesson Plan Title */}
              <div>
                <label htmlFor="dll-title" className="block text-xs font-semibold text-[#1C2420] mb-1">
                  Lesson Plan Title & Topics *
                </label>
                <input
                  id="dll-title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. DLL Week 4: Internal Structure of the Earth"
                  required
                  className="w-full text-xs p-2.5 bg-[#FAF8F5] border border-[#E3DDD1] rounded-xl text-[#1C2420] placeholder:text-[#5C6660]/70 focus:outline-none focus:ring-2 focus:ring-[#0F3D2E]"
                />
              </div>

              {/* Row 4: Multi-File Drag & Drop Upload */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="block text-xs font-semibold text-[#1C2420]">
                    Attach Lesson Plan Files (.pdf or .docx) *
                  </span>
                  {existingAttachments.length + selectedFiles.length > 0 && (
                    <span className="text-[11px] font-medium text-[#0F3D2E]">
                      {existingAttachments.length + selectedFiles.length}{" "}
                      {existingAttachments.length + selectedFiles.length === 1 ? "file" : "files"} attached
                    </span>
                  )}
                </div>

                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleFileDrop}
                  className={`border-2 border-dashed rounded-xl p-4 text-center transition-colors ${
                    isDragging
                      ? "border-[#0F3D2E] bg-[#E6EFEA]/60"
                      : selectedFiles.length > 0
                        ? "border-[#0F3D2E]/40 bg-[#E6EFEA]/30"
                        : "border-[#E3DDD1] hover:border-[#0F3D2E]/60 bg-[#FAF8F5]"
                  }`}
                >
                  <input
                    id="file-upload"
                    type="file"
                    multiple
                    accept=".pdf,.docx,.doc"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <label htmlFor="file-upload" className="cursor-pointer block">
                    <UploadCloud className="w-7 h-7 mx-auto text-[#5C6660] mb-1" />
                    <p className="text-xs font-medium text-[#1C2420]">
                      Drag & drop files here, or{" "}
                      <span className="text-[#0F3D2E] font-semibold underline">browse</span>
                    </p>
                    <p className="text-[11px] text-[#5C6660] mt-0.5">
                      Multiple files supported • .pdf (≤ 25MB) and .docx (≤ 15MB)
                    </p>
                  </label>
                </div>

                {(existingAttachments.length > 0 || selectedFiles.length > 0) && (
                  <ul className="mt-2.5 space-y-1.5 max-h-40 overflow-y-auto pr-1">
                    {existingAttachments.map((att, idx) => (
                      <li
                        key={`${att.file_url}-${idx}`}
                        className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-[#E6EFEA]/40 border border-[#0F3D2E]/20 text-xs"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <CheckCircle2 className="w-4 h-4 text-[#0F3D2E] shrink-0" />
                          <span className="font-medium text-[#1C2420] truncate">{att.file_name}</span>
                          {att.file_size ? (
                            <span className="text-[11px] text-[#5C6660] shrink-0">
                              ({formatFileSize(att.file_size)})
                            </span>
                          ) : null}
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            setExistingAttachments((prev) => prev.filter((_, i) => i !== idx))
                          }
                          className="p-1 rounded text-[#5C6660] hover:text-[#9E1B32] hover:bg-[#FBECEF] transition-colors cursor-pointer shrink-0"
                          aria-label={`Remove ${att.file_name}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </li>
                    ))}
                    {selectedFiles.map((file, idx) => (
                      <li
                        key={`${file.name}-${file.size}-${idx}`}
                        className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-[#FAF8F5] border border-[#E3DDD1] text-xs"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <CheckCircle2 className="w-4 h-4 text-[#0F3D2E] shrink-0" />
                          <span className="font-medium text-[#1C2420] truncate">{file.name}</span>
                          <span className="text-[11px] text-[#5C6660] shrink-0">
                            ({formatFileSize(file.size)})
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveFile(idx)}
                          className="p-1 rounded text-[#5C6660] hover:text-[#9E1B32] hover:bg-[#FBECEF] transition-colors cursor-pointer shrink-0"
                          aria-label={`Remove ${file.name}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          )}

          {/* Actions */}
          <div className="pt-3 border-t border-[#E3DDD1] flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold text-[#5C6660] hover:text-[#1C2420] hover:bg-[#FAF8F5] rounded-xl cursor-pointer transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isLoadingCatalogs}
              className="px-5 py-2 text-xs font-semibold text-[#FFFFFF] bg-[#0F3D2E] hover:bg-[#0A2E22] focus-visible:ring-2 focus-visible:ring-[#0F3D2E] rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5 whitespace-nowrap"
            >
              <UploadCloud className="w-4 h-4" />
              <span>
                {isSubmitting
                  ? isEditMode
                    ? "Saving Changes..."
                    : "Uploading DLL..."
                  : isEditMode
                  ? "Save Changes"
                  : "Submit for Verification"}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
