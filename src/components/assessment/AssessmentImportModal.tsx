import React, { useState } from"react";
import type {
  Subject,
  Section,
  AssessmentType,
  GradingPeriod,
  Assessment,
} from"../../types";
import { parseAssessmentFile, type ParsedAssessmentOutput } from"../../services/fileSanitizer";
import { createAssessmentWithAnalysis } from"../../services/assessmentService";
import { extractCompetencyFromQuestion } from"../../services/aiItemAnalysisService";
import { computePassingScore } from"../../services/statsEngine";
import {
  UploadCloud,
  FileSpreadsheet,
  AlertTriangle,
  X,
  CheckCircle,
  ShieldCheck,
  Sparkles,
} from"lucide-react";

interface AssessmentImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  termId: string;
  activeTermNumber?: 1 | 2 | 3;
  teacherId: string;
  subjects: Subject[];
  sections: Section[];
  onAssessmentCreated: (newAssessment: Assessment) => void;
}

export const AssessmentImportModal: React.FC<AssessmentImportModalProps> = ({
  isOpen,
  onClose,
  termId,
  activeTermNumber,
  teacherId,
  subjects,
  sections,
  onAssessmentCreated,
}) => {
  const defaultGradingPeriod: GradingPeriod =
    activeTermNumber === 2 ? "T2" : activeTermNumber === 3 ? "T3" : "T1";

  const [title, setTitle] = useState<string>("");
  const [subjectId, setSubjectId] = useState<string>("");
  const [sectionId, setSectionId] = useState<string>("");
  const [assessmentType, setAssessmentType] = useState<AssessmentType>("Summative");
  const [gradingPeriod, setGradingPeriod] = useState<GradingPeriod>(defaultGradingPeriod);
  const [totalItems, setTotalItems] = useState<number>(20);
  const passingScore = computePassingScore(totalItems);
  const [testDate, setTestDate] = useState<string>(new Date().toISOString().split("T")[0] ||"");

  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedAssessmentOutput | null>(null);
  const [isParsing, setIsParsing] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Set defaults when opening
  React.useEffect(() => {
    if (isOpen) {
      if (subjects.length > 0 && subjects[0] && !subjectId) setSubjectId(subjects[0].id);
      if (sections.length > 0 && sections[0] && !sectionId) setSectionId(sections[0].id);
      setGradingPeriod(defaultGradingPeriod);
      setErrorMessage(null);
    }
  }, [isOpen, subjects, sections, subjectId, sectionId, defaultGradingPeriod]);

  if (!isOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploaded = e.target.files?.[0];
    if (!uploaded) return;

    setFile(uploaded);
    setIsParsing(true);
    setErrorMessage(null);

    try {
      const result = await parseAssessmentFile(uploaded);
      setParsedData(result);
      if (result.totalItems > 0) {
        setTotalItems(result.totalItems);
      }
      const upperName = uploaded.name.toUpperCase();
      if (upperName.includes("TERM 1")) setGradingPeriod("T1");
      else if (upperName.includes("TERM 2")) setGradingPeriod("T2");
      else if (upperName.includes("TERM 3")) setGradingPeriod("T3");
      if (!title) {
        const cleanName = uploaded.name.replace(/\.[^/.]+$/,"");
        setTitle(cleanName);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message :"Failed to parse file.";
      setErrorMessage(msg);
      setParsedData(null);
    } finally {
      setIsParsing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMessage("Please enter an assessment title.");
      return;
    }
    if (!parsedData || parsedData.examinees.length === 0) {
      setErrorMessage("Please upload a valid CSV or XLSX assessment file containing student responses.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const selectedSubject = subjects.find((s) => s.id === subjectId);
      const competencies: Record<number, string> = {};
      if (parsedData.questionPrompts && parsedData.questionPrompts.length > 0) {
        parsedData.questionPrompts.forEach((prompt, idx) => {
          competencies[idx + 1] = extractCompetencyFromQuestion(
            prompt,
            idx + 1,
            selectedSubject?.subject_name
          );
        });
      }

      const result = await createAssessmentWithAnalysis({
        term_id: termId,
        teacher_id: teacherId,
        subject_id: subjectId || null,
        section_id: sectionId || null,
        title: title.trim(),
        assessment_type: assessmentType,
        grading_period: gradingPeriod,
        total_items: totalItems,
        passing_score: passingScore,
        test_date: testDate,
        raw_scores: parsedData.examinees,
        competencies,
      });

      if (!result.success || !result.data) {
        setErrorMessage(result.error ||"Failed to save assessment.");
        return;
      }

      onAssessmentCreated(result.data);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message :"Error creating assessment.";
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
              <UploadCloud className="w-5 h-5 text-sand-300" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-cyprus-900 font-display">
                Import Assessment & Item Matrix
              </h2>
              <p className="text-xs text-sand-700">
                Upload Google Forms, Quizizz, or LMS quiz spreadsheets.
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
          {/* File Upload Dropzone */}
          <div>
            <label htmlFor="assessment-file-input" className="block text-xs font-semibold text-cyprus-900 mb-1.5">
              Select Spreadsheet (.csv, .xlsx, Google Forms export)
            </label>
            <div className="border-2 border-dashed border-sand-300 rounded-2xl p-5 text-center bg-sand-50/50 hover:bg-sand-50 transition-colors relative cursor-pointer">
              <input
                id="assessment-file-input"
                type="file"
                accept=".csv,.xlsx,.xls,.tsv"
                onChange={handleFileChange}
                disabled={isParsing || isSubmitting}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <div className="flex flex-col items-center justify-center space-y-2 pointer-events-none">
                <FileSpreadsheet className="w-8 h-8 text-cyprus-700" />
                <div className="text-xs font-semibold text-cyprus-900">
                  {file ? file.name :"Click or drag spreadsheet file here"}
                </div>
                <p className="text-[11px] text-sand-600 max-w-sm">
                  Google Forms CSV with item columns, Quizizz spreadsheet, or simple score roster.
                </p>
              </div>
            </div>

            {/* Formula Injection Defense Badge */}
            <div className="mt-2 flex items-center gap-2 text-[11px] text-emerald-700">
              <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
              <span>CWE-1236 Formula Injection Defense active: trigger characters are neutralized.</span>
            </div>
          </div>

          {/* Parsed File Preview Indicator */}
          {parsedData && (
            <div className="p-3 rounded-xl bg-teal-50 border border-teal-200 text-xs flex items-center justify-between text-teal-900">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-teal-600" />
                <span>
                  Detected: <strong>{parsedData.detectedFormat}</strong> ({parsedData.examinees.length} examinees, {parsedData.totalItems} items)
                </span>
              </div>
              <span className="text-[11px] font-semibold text-teal-700">Ready</span>
            </div>
          )}

          {/* Title */}
          <div>
            <label htmlFor="assessment-title-input" className="block text-xs font-semibold text-cyprus-900 mb-1">
              Assessment Title
            </label>
            <input
              id="assessment-title-input"
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. First Quarter Summative Test in Science 7"
              className="w-full px-3.5 py-2.5 rounded-xl border border-sand-300 bg-white text-cyprus-900 text-xs focus:outline-hidden focus:ring-2 focus:ring-cyprus-700"
            />
          </div>

          {/* Subject & Section Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="assessment-subject-select" className="block text-xs font-semibold text-cyprus-900 mb-1">
                Subject
              </label>
              <select
                id="assessment-subject-select"
                value={subjectId}
                onChange={(e) => setSubjectId(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-sand-300 bg-white text-cyprus-900 text-xs focus:outline-hidden focus:ring-2 focus:ring-cyprus-700"
              >
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.subject_name} ({s.subject_code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="assessment-section-select" className="block text-xs font-semibold text-cyprus-900 mb-1">
                Grade & Section
              </label>
              <select
                id="assessment-section-select"
                value={sectionId}
                onChange={(e) => setSectionId(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-sand-300 bg-white text-cyprus-900 text-xs focus:outline-hidden focus:ring-2 focus:ring-cyprus-700"
              >
                {sections.map((sec) => (
                  <option key={sec.id} value={sec.id}>
                    Grade {sec.grade_level} - {sec.section_name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Type, Period, and Date */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label htmlFor="assessment-type-select" className="block text-xs font-semibold text-cyprus-900 mb-1">
                Assessment Type
              </label>
              <select
                id="assessment-type-select"
                value={assessmentType}
                onChange={(e) => setAssessmentType(e.target.value as AssessmentType)}
                className="w-full px-3 py-2.5 rounded-xl border border-sand-300 bg-white text-cyprus-900 text-xs focus:outline-hidden focus:ring-2 focus:ring-cyprus-700"
              >
                <option value="Summative">Summative Test</option>
                <option value="Diagnostic">Diagnostic Test</option>
                <option value="Quarterly Exam">Quarterly Exam</option>
                <option value="Formative">Formative Assessment</option>
              </select>
            </div>

            <div>
              <label htmlFor="assessment-period-select" className="block text-xs font-semibold text-cyprus-900 mb-1">
                Grading Period
              </label>
              <select
                id="assessment-period-select"
                value={gradingPeriod}
                onChange={(e) => setGradingPeriod(e.target.value as GradingPeriod)}
                className="w-full px-3 py-2.5 rounded-xl border border-sand-300 bg-white text-cyprus-900 text-xs focus:outline-hidden focus:ring-2 focus:ring-cyprus-700"
              >
                <option value="T1">Term 1</option>
                <option value="T2">Term 2</option>
                <option value="T3">Term 3</option>
              </select>
            </div>

            <div>
              <label htmlFor="assessment-date-input" className="block text-xs font-semibold text-cyprus-900 mb-1">
                Test Date
              </label>
              <input
                id="assessment-date-input"
                type="date"
                value={testDate}
                onChange={(e) => setTestDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-sand-300 bg-white text-cyprus-900 text-xs focus:outline-hidden focus:ring-2 focus:ring-cyprus-700"
              />
            </div>
          </div>

          {/* Total Items & Passing Score */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="assessment-total-items-input" className="block text-xs font-semibold text-cyprus-900 mb-1">
                Total Test Items
              </label>
              <input
                id="assessment-total-items-input"
                type="number"
                min="1"
                max="100"
                value={totalItems}
                onChange={(e) => {
                  const val = Math.max(1, parseInt(e.target.value, 10) || 1);
                  setTotalItems(val);
                }}
                className="w-full px-3 py-2.5 rounded-xl border border-sand-300 bg-white text-cyprus-900 text-xs focus:outline-hidden focus:ring-2 focus:ring-cyprus-700"
              />
            </div>

            <div>
              <label htmlFor="assessment-passing-score-input" className="block text-xs font-semibold text-cyprus-900 mb-1">
                Passing Score <span className="font-normal text-sand-600">(Auto 75%, rounded up)</span>
              </label>
              <input
                id="assessment-passing-score-input"
                type="number"
                readOnly
                value={passingScore}
                className="w-full px-3 py-2.5 rounded-xl border border-sand-300 bg-sand-50 text-cyprus-900 font-semibold text-xs focus:outline-hidden"
              />
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
              disabled={isSubmitting || !parsedData}
              className="px-5 py-2 rounded-xl text-xs font-semibold bg-crimson-600 hover:bg-crimson-700 disabled:opacity-50 text-white shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
            >
              {isSubmitting ? (
                <span>Analyzing & Saving...</span>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Run Item Analysis</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
