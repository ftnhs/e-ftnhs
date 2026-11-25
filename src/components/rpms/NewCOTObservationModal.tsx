import React, { useState } from"react";
import type { Profile, Subject, Section, COTObservation } from"../../types";
import { createCOTObservation } from"../../services/rpmsCotService";
import { Award, X, AlertTriangle } from"lucide-react";

interface NewCOTObservationModalProps {
  isOpen: boolean;
  onClose: () => void;
  termId: string;
  observerId: string;
  teachers: Profile[];
  subjects: Subject[];
  sections: Section[];
  onObservationCreated: (newObs: COTObservation) => void;
}

const PPST_INDICATORS = [
  { id:"1", title:"1. Content Knowledge across Curriculum Areas", desc:"Applied knowledge of content within and across curriculum teaching areas." },
  { id:"2", title:"2. Literacy and Numeracy Strategies", desc:"Used a range of teaching strategies that enhance learner achievement in literacy and numeracy." },
  { id:"3", title:"3. Critical & Creative Thinking (HOTS)", desc:"Applied a range of teaching strategies to develop critical and creative thinking, as well as HOTS." },
  { id:"4", title:"4. Proficient Language Use", desc:"Displayed proficient use of Mother Tongue, Filipino, and English to facilitate teaching and learning." },
  { id:"5", title:"5. Safe & Secure Learning Environment", desc:"Established safe and secure learning environments through consistent implementation of policies." },
  { id:"6", title:"6. Fair, Respectful & Caring Environment", desc:"Maintained learning environments that promote fairness, respect, and care to encourage learning." },
  { id:"7", title:"7. Learner-Centered Cultural & Diversity Strategies", desc:"Established a learner-centered culture responding to linguistic, cultural, and religious backgrounds." },
  { id:"8", title:"8. Indigenous & Diverse Learners Inclusion", desc:"Adapted and used culturally appropriate strategies to address the needs of learners from diverse groups." },
  { id:"9", title:"9. Timely & Constructive Feedback", desc:"Used strategies for providing timely, accurate, and constructive feedback to improve learner performance." },
];

export const NewCOTObservationModal: React.FC<NewCOTObservationModalProps> = ({
  isOpen,
  onClose,
  termId,
  observerId,
  teachers,
  subjects,
  sections,
  onObservationCreated,
}) => {
  const [teacherId, setTeacherId] = useState<string>(teachers[0]?.id ||"");
  const [subjectId, setSubjectId] = useState<string>(subjects[0]?.id ||"");
  const [sectionId, setSectionId] = useState<string>(sections[0]?.id ||"");
  const [observationPeriod, setObservationPeriod] = useState<"Observation 1" |"Observation 2" |"Observation 3">("Observation 1");
  const [observationDate, setObservationDate] = useState<string>(new Date().toISOString().split("T")[0] ||"");

  // Ratings for 9 indicators (levels 3 to 7: 3=Organizing, 4=Developing, 5=Applying, 6=Consolidating, 7=Integrating)
  const [ratings, setRatings] = useState<Record<string, number>>({
"1": 5,"2": 5,"3": 5,"4": 5,"5": 5,"6": 5,"7": 5,"8": 5,"9": 5,
  });

  const [postConferenceNotes, setPostConferenceNotes] = useState<string>("");
  const [strengths, setStrengths] = useState<string>("");
  const [areasForImprovement, setAreasForImprovement] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  React.useEffect(() => {
    if (isOpen) {
      if (teachers.length > 0 && teachers[0] && !teacherId) setTeacherId(teachers[0].id);
      if (subjects.length > 0 && subjects[0] && !subjectId) setSubjectId(subjects[0].id);
      if (sections.length > 0 && sections[0] && !sectionId) setSectionId(sections[0].id);
      setErrorMessage(null);
    }
  }, [isOpen, teachers, subjects, sections, teacherId, subjectId, sectionId]);

  if (!isOpen) return null;

  const handleRatingChange = (id: string, val: number) => {
    setRatings((prev) => ({ ...prev, [id]: val }));
  };

  const calculatedAverage = Number(
    (
      Object.values(ratings).reduce((sum, r) => sum + r, 0) /
      Object.values(ratings).length
    ).toFixed(2)
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teacherId) {
      setErrorMessage("Please select a teacher for this classroom observation.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const result = await createCOTObservation({
        term_id: termId,
        observer_id: observerId,
        teacher_id: teacherId,
        subject_id: subjectId || null,
        section_id: sectionId || null,
        observation_date: observationDate,
        observation_period: observationPeriod,
        indicator_ratings: ratings,
        post_conference_notes: postConferenceNotes.trim() || undefined,
        strengths: strengths.trim() || undefined,
        areas_for_improvement: areasForImprovement.trim() || undefined,
        status:"Completed",
      });

      if (!result.success || !result.data) {
        setErrorMessage(result.error ||"Failed to log COT observation.");
        return;
      }

      onObservationCreated(result.data);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message :"Error saving observation.";
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white border border-sand-200 rounded-3xl w-full max-w-3xl p-6 shadow-2xl space-y-6 my-8 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-sand-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyprus-900 text-white flex items-center justify-center shadow-xs">
              <Award className="w-5 h-5 text-sand-300" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-cyprus-900 font-display">
                Classroom Observation Tool (COT) Rating Sheet
              </h2>
              <p className="text-xs text-sand-700">
                Philippine Professional Standards for Teachers (PPST) • Levels 3 to 7
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

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Metadata Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label htmlFor="cot-teacher-select" className="block text-xs font-semibold text-cyprus-900 mb-1">
                Teacher Observed
              </label>
              <select
                id="cot-teacher-select"
                value={teacherId}
                onChange={(e) => setTeacherId(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-sand-300 bg-white text-cyprus-900 text-xs focus:outline-hidden focus:ring-2 focus:ring-cyprus-700"
              >
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.full_name} ({t.department ||"General"})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="cot-subject-select" className="block text-xs font-semibold text-cyprus-900 mb-1">
                Subject
              </label>
              <select
                id="cot-subject-select"
                value={subjectId}
                onChange={(e) => setSubjectId(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-sand-300 bg-white text-cyprus-900 text-xs focus:outline-hidden focus:ring-2 focus:ring-cyprus-700"
              >
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.subject_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="cot-section-select" className="block text-xs font-semibold text-cyprus-900 mb-1">
                Class Section
              </label>
              <select
                id="cot-section-select"
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="cot-period-select" className="block text-xs font-semibold text-cyprus-900 mb-1">
                Observation Cycle
              </label>
              <select
                id="cot-period-select"
                value={observationPeriod}
                onChange={(e) => setObservationPeriod(e.target.value as"Observation 1" |"Observation 2" |"Observation 3")}
                className="w-full px-3 py-2.5 rounded-xl border border-sand-300 bg-white text-cyprus-900 text-xs focus:outline-hidden focus:ring-2 focus:ring-cyprus-700"
              >
                <option value="Observation 1">Observation 1 (Term 1 / Mid-Year)</option>
                <option value="Observation 2">Observation 2 (Term 2 / Second Cycle)</option>
                <option value="Observation 3">Observation 3 (Term 3 / Summative Cycle)</option>
              </select>
            </div>

            <div>
              <label htmlFor="cot-date-input" className="block text-xs font-semibold text-cyprus-900 mb-1">
                Observation Date
              </label>
              <input
                id="cot-date-input"
                type="date"
                value={observationDate}
                onChange={(e) => setObservationDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-sand-300 bg-white text-cyprus-900 text-xs focus:outline-hidden focus:ring-2 focus:ring-cyprus-700"
              />
            </div>
          </div>

          {/* 9 PPST Observable Indicators Rating Matrix */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-cyprus-900">
                PPST Observable Indicators (Rating Scale: 3 to 7)
              </h3>
              <div className="text-xs font-bold text-crimson-600">
                Mean Rating: {calculatedAverage.toFixed(2)}
              </div>
            </div>

            <div className="space-y-2 rounded-2xl border border-sand-200 p-4 bg-sand-50/50">
              {PPST_INDICATORS.map((ind) => (
                <div
                  key={ind.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-xl bg-white border border-sand-200/80 text-xs"
                >
                  <div className="max-w-lg">
                    <span className="font-bold text-cyprus-900 block">
                      {ind.title}
                    </span>
                    <span className="text-[11px] text-sand-600 leading-tight block">
                      {ind.desc}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
                    {[3, 4, 5, 6, 7].map((lvl) => (
                      <button
                        key={lvl}
                        type="button"
                        onClick={() => handleRatingChange(ind.id, lvl)}
                        className={`w-7 h-7 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                          ratings[ind.id] === lvl
                            ?"bg-cyprus-900 text-white shadow-xs"
                            :"bg-sand-100 text-sand-700 hover:bg-sand-200 border border-sand-200"
                        }`}
                        title={`Level ${lvl}`}
                      >
                        {lvl}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Qualitative Feedback Blocks */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="cot-strengths-textarea" className="block text-xs font-semibold text-cyprus-900 mb-1">
                Commendable Strengths Observed
              </label>
              <textarea
                id="cot-strengths-textarea"
                rows={2}
                value={strengths}
                onChange={(e) => setStrengths(e.target.value)}
                placeholder="Highlight strong pedagogical practices, mastery of competencies, student engagement..."
                className="w-full px-3 py-2 rounded-xl border border-sand-300 bg-white text-cyprus-900 text-xs focus:outline-hidden focus:ring-2 focus:ring-cyprus-700"
              />
            </div>

            <div>
              <label htmlFor="cot-improvements-textarea" className="block text-xs font-semibold text-cyprus-900 mb-1">
                Areas for Instructional Growth
              </label>
              <textarea
                id="cot-improvements-textarea"
                rows={2}
                value={areasForImprovement}
                onChange={(e) => setAreasForImprovement(e.target.value)}
                placeholder="Suggest targeted mentoring, questioning techniques, or differentiated activities..."
                className="w-full px-3 py-2 rounded-xl border border-sand-300 bg-white text-cyprus-900 text-xs focus:outline-hidden focus:ring-2 focus:ring-cyprus-700"
              />
            </div>
          </div>

          <div>
            <label htmlFor="cot-notes-textarea" className="block text-xs font-semibold text-cyprus-900 mb-1">
              Post-Conference Agreement Notes
            </label>
            <textarea
              id="cot-notes-textarea"
              rows={2}
              value={postConferenceNotes}
              onChange={(e) => setPostConferenceNotes(e.target.value)}
              placeholder="Summary of post-observation conference between rater and ratee..."
              className="w-full px-3 py-2 rounded-xl border border-sand-300 bg-white text-cyprus-900 text-xs focus:outline-hidden focus:ring-2 focus:ring-cyprus-700"
            />
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
              <Award className="w-3.5 h-3.5" />
              <span>{isSubmitting ?"Recording Observation..." :"Submit COT Rating"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
