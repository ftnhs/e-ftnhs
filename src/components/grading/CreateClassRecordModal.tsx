import React, { useState } from"react";
import type { Subject, Section, CurriculumType, ClassRecord } from"../../types";
import { createClassRecord } from"../../services/classRecordService";
import { BookOpen, X, AlertTriangle, Sparkles } from"lucide-react";

interface CreateClassRecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  termId: string;
  teacherId: string;
  subjects: Subject[];
  sections: Section[];
  initialSubjectId?: string;
  initialSectionId?: string;
  initialCurriculumType?: CurriculumType;
  initialTermNumber?: 1 | 2 | 3;
  onRecordCreated: (newRecord: ClassRecord) => void;
}

export const CreateClassRecordModal: React.FC<CreateClassRecordModalProps> = ({
  isOpen,
  onClose,
  termId,
  teacherId,
  subjects,
  sections,
  initialSubjectId,
  initialSectionId,
  initialCurriculumType,
  initialTermNumber,
  onRecordCreated,
}) => {
  const [subjectId, setSubjectId] = useState<string>(initialSubjectId || subjects[0]?.id || "");
  const [sectionId, setSectionId] = useState<string>(initialSectionId || sections[0]?.id || "");
  const [curriculumType, setCurriculumType] = useState<CurriculumType>(initialCurriculumType || "MATATAG JHS");
  const [termNumber, setTermNumber] = useState<1 | 2 | 3>(initialTermNumber || 1);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  React.useEffect(() => {
    if (isOpen) {
      if (initialSubjectId) setSubjectId(initialSubjectId);
      else if (subjects.length > 0 && subjects[0] && !subjectId) setSubjectId(subjects[0].id);

      if (initialSectionId) setSectionId(initialSectionId);
      else if (sections.length > 0 && sections[0] && !sectionId) setSectionId(sections[0].id);

      if (initialCurriculumType) setCurriculumType(initialCurriculumType);
      if (initialTermNumber) setTermNumber(initialTermNumber);
      setErrorMessage(null);
    }
  }, [isOpen, subjects, sections, subjectId, sectionId, initialSubjectId, initialSectionId, initialCurriculumType, initialTermNumber]);

  React.useEffect(() => {
    const sec = sections.find((s) => s.id === sectionId);
    const sub = subjects.find((s) => s.id === subjectId);
    if (!sec) return;
    if (sec.grade_level <= 10) {
      if (sub && /mapeh|tle|epp|music|arts|pe|health/i.test(`${sub.subject_name} ${sub.subject_code}`)) {
        setCurriculumType("MATATAG JHS Skill-Based");
      } else {
        setCurriculumType("MATATAG JHS");
      }
    } else if (sec.grade_level === 11) {
      if (sub?.category === "TVL" || /techpro|ict/i.test(`${sec.section_name} ${sub?.track_strand || ""}`)) {
        setCurriculumType("SSHS TechPro Elective");
      } else if (sub && /immersion/i.test(sub.subject_name)) {
        setCurriculumType("SSHS Work Immersion");
      } else if (sub?.category === "Specialized") {
        setCurriculumType("SSHS Academic Elective");
      } else {
        setCurriculumType("SSHS Core");
      }
    } else {
      if (sub?.category === "TVL" || /tvl|ict/i.test(`${sub?.track_strand || ""}`)) {
        setCurriculumType("Old SHS TVL");
      } else if (sub && /immersion|practical research|inquiries/i.test(sub.subject_name)) {
        setCurriculumType("Old SHS Immersion");
      } else if (sub?.category === "Specialized") {
        setCurriculumType("Old SHS Specialized");
      } else if (sub?.category === "Applied") {
        setCurriculumType("Old SHS Applied");
      } else {
        setCurriculumType("Old SHS Core");
      }
    }
  }, [sectionId, subjectId, sections, subjects]);

  if (!isOpen) return null;

  const deriveSubjectCategory = (ct: CurriculumType): string => {
    if (ct === "MATATAG JHS Skill-Based") return "Skill-Based MAPEH/TLE";
    if (ct === "SSHS Field Exposure") return "SSHS Field Exposure";
    if (ct === "SSHS Arts Sports Health") return "SSHS Arts/Sports/Health";
    if (ct === "SSHS Research Design") return "SSHS Research/Design";
    if (ct === "SSHS TechPro Elective") return "SSHS TechPro";
    if (ct === "SSHS Work Immersion") return "SSHS Work Immersion";
    if (ct === "Old SHS Immersion") return "Old SHS Immersion";
    if (ct === "Old SHS TVL") return "TVL Specialized";
    return "Core Academic";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subjectId || !sectionId) {
      setErrorMessage("Please select a subject and class section.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const result = await createClassRecord({
        term_id: termId,
        teacher_id: teacherId,
        subject_id: subjectId,
        section_id: sectionId,
        curriculum_type: curriculumType,
        subject_category: deriveSubjectCategory(curriculumType),
        term_number: termNumber,
      });

      if (!result.success || !result.data) {
        setErrorMessage(result.error ||"Failed to initialize class record.");
        return;
      }

      onRecordCreated(result.data);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message :"Error creating class record.";
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white border border-sand-200 rounded-3xl w-full max-w-lg p-6 shadow-2xl space-y-6 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-sand-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyprus-900 text-white flex items-center justify-center shadow-xs">
              <BookOpen className="w-5 h-5 text-sand-300" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-cyprus-900 font-display">
                New E-Class Record
              </h2>
              <p className="text-xs text-sand-700">
                Automated 3-term DepEd grading (MATATAG JHS, Grade 11 SSHS &amp; Grade 12 Old SHS)
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
          {/* Subject & Section */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="ecr-subject-select" className="block text-xs font-semibold text-cyprus-900 mb-1">
                Subject
              </label>
              <select
                id="ecr-subject-select"
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
              <label htmlFor="ecr-section-select" className="block text-xs font-semibold text-cyprus-900 mb-1">
                Grade & Section
              </label>
              <select
                id="ecr-section-select"
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

          {/* Curriculum Standard */}
          <div>
            <label htmlFor="ecr-curriculum-select" className="block text-xs font-semibold text-cyprus-900 mb-1">
              Curriculum Standard & Key Stage
            </label>
            <select
              id="ecr-curriculum-select"
              value={curriculumType}
              onChange={(e) => setCurriculumType(e.target.value as CurriculumType)}
              className="w-full px-3 py-2.5 rounded-xl border border-sand-300 bg-white text-cyprus-900 text-xs focus:outline-hidden focus:ring-2 focus:ring-cyprus-700"
            >
              <optgroup label="Grade 11 — Strengthened SHS (SSHS)">
                <option value="SSHS Core">SSHS Core / Other Academic Electives (WW 20%, PT 50%, EX 30%)</option>
                <option value="SSHS Academic Elective">SSHS Academic Elective — ASSH / STEM / BUS-ENT (WW 20%, PT 50%, EX 30%)</option>
                <option value="SSHS Field Exposure">SSHS Field Exposure / Arts Apprenticeship / Creative Prod (WW 15%, PT 70%, EX 15%)</option>
                <option value="SSHS Arts Sports Health">SSHS Arts, Sports &amp; Health/Wellness Electives (WW 20%, PT 60%, EX 20%)</option>
                <option value="SSHS Research Design">SSHS Research Electives &amp; Design/Innovation (WW 40%, PT 60%)</option>
                <option value="SSHS TechPro Elective">SSHS TechPro Electives — ICT / AFA / AWH (WW 15%, PT 65%, EX 20%)</option>
                <option value="SSHS Work Immersion">SSHS Work Immersion (WW 20%, PT 80%)</option>
              </optgroup>
              <optgroup label="Grade 12 — Old K-12 SHS Curriculum (2016)">
                <option value="Old SHS Core">Old SHS Core Subject (WW 25%, PT 50%, QA 25%)</option>
                <option value="Old SHS Applied">Old SHS Applied Subject (WW 25%, PT 45%, QA 30%)</option>
                <option value="Old SHS Specialized">Old SHS Specialized — HUMSS / STEM (WW 25%, PT 45%, QA 30%)</option>
                <option value="Old SHS TVL">Old SHS TVL Track — ICT / HE / IA (WW 20%, PT 60%, QA 20%)</option>
                <option value="Old SHS Immersion">Old SHS Immersion / Research — 3Is / PR2 (WW 35%, PT 40%, QA 25%)</option>
              </optgroup>
              <optgroup label="Junior High School — MATATAG Curriculum">
                <option value="MATATAG JHS">JHS MATATAG Core Academic (WW 20%, PT 50%, QA 30%)</option>
                <option value="MATATAG JHS Skill-Based">JHS MATATAG Skill-Based — MAPEH / TLE (WW 20%, PT 60%, QA 20%)</option>
              </optgroup>
            </select>
          </div>

          {/* Academic Term */}
          <div>
            <label htmlFor="ecr-term-select" className="block text-xs font-semibold text-cyprus-900 mb-1">
              Academic Term (3-Term School Year)
            </label>
            <select
              id="ecr-term-select"
              value={termNumber}
              onChange={(e) => setTermNumber(parseInt(e.target.value) as 1 | 2 | 3)}
              className="w-full px-3 py-2.5 rounded-xl border border-sand-300 bg-white text-cyprus-900 text-xs focus:outline-hidden focus:ring-2 focus:ring-cyprus-700"
            >
              <option value={1}>Term 1 (First 12 Weeks)</option>
              <option value={2}>Term 2 (Second 12 Weeks)</option>
              <option value={3}>Term 3 (Final 12 Weeks)</option>
            </select>
          </div>

          <div className="p-3 rounded-xl bg-[#FAF8F5] border border-[#E3DDD1] text-[11px] text-cyprus-800">
            Enrolled learners from the selected class section will be automatically imported into this E-Class Record.
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
              className="px-5 py-2 rounded-xl text-xs font-semibold bg-crimson-600 hover:bg-crimson-700 disabled:opacity-50 text-white shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isSubmitting ?"Creating..." :"Initialize Record"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
