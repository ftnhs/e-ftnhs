import React from"react";
import type { Assessment, AssessmentItemAnalysis, Profile } from"../../types";
import { formatGradingPeriod } from"../../services/statsEngine";
import { Printer, ArrowLeft } from"lucide-react";

interface DepEdItemAnalysisPrintViewProps {
  assessment: Assessment;
  items: AssessmentItemAnalysis[];
  principal?: Profile | null;
  onBack: () => void;
}

export const DepEdItemAnalysisPrintView: React.FC<DepEdItemAnalysisPrintViewProps> = ({
  assessment,
  items,
  principal,
  onBack,
}) => {
  const handlePrint = () => {
    window.print();
  };

  const leastLearned = items.filter((i) => i.is_least_learned);

  return (
    <div className="space-y-6">
      {/* 1. Print Toolbar (Hidden in Print) */}
      <div className="print:hidden bg-white p-4 sm:p-5 rounded-2xl border border-sand-200 shadow-xs flex items-center justify-between gap-3 transition-colors">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border border-sand-300 text-sand-800 hover:bg-sand-100 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Assessments</span>
        </button>

        <button
          type="button"
          onClick={handlePrint}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-crimson-600 hover:bg-crimson-700 text-white shadow-xs transition-colors cursor-pointer"
        >
          <Printer className="w-4 h-4" />
          <span>Print Item Analysis (PDF)</span>
        </button>
      </div>

      {/* 2. Official DepEd Document Container */}
      <div className="bg-white text-black p-8 sm:p-12 rounded-2xl border border-sand-200 shadow-sm font-sans max-w-5xl mx-auto print:p-0 print:border-none print:shadow-none print:rounded-none">
        {/* DepEd Standard Header */}
        <div className="text-center space-y-0.5 border-b-2 border-black pb-4">
          <p className="text-[11px] uppercase tracking-wider font-serif">Republic of the Philippines</p>
          <p className="text-xs font-bold uppercase tracking-wide font-serif">Department of Education</p>
          <p className="text-[11px] font-serif">Region VII, Central Visayas</p>
          <p className="text-[11px] font-serif">Division of Bohol • District of Calape</p>
          <h1 className="text-base sm:text-lg font-extrabold uppercase tracking-wide text-black mt-1 font-serif">
            FERMIN TAYABAS NATIONAL HIGH SCHOOL
          </h1>
          <p className="text-[10px] italic">School ID: 302851 • Cabayugan, Calape, Bohol</p>
          <div className="pt-2">
            <span className="inline-block px-3 py-0.5 text-xs font-bold tracking-wider uppercase border border-black">
              ITEM ANALYSIS & MASTERY REPORT
            </span>
          </div>
        </div>

        {/* Assessment Metadata Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs py-4 border-b border-black">
          <div>
            <span className="font-bold">Subject: </span>
            <span>{assessment.subject?.subject_name ||"General"}</span>
          </div>
          <div>
            <span className="font-bold">Grade & Section: </span>
            <span>
              {assessment.section
                ? `Gr. ${assessment.section.grade_level} - ${assessment.section.section_name}`
                :"All Sections"}
            </span>
          </div>
          <div>
            <span className="font-bold">Teacher: </span>
            <span>{assessment.teacher?.full_name ||"Subject Teacher"}</span>
          </div>
          <div>
            <span className="font-bold">Grading Period: </span>
            <span>{formatGradingPeriod(assessment.grading_period)}</span>
          </div>
          <div>
            <span className="font-bold">Test Date: </span>
            <span>{assessment.test_date}</span>
          </div>
          <div>
            <span className="font-bold">Assessment Type: </span>
            <span>{assessment.assessment_type}</span>
          </div>
          <div>
            <span className="font-bold">Total Examinees: </span>
            <span>{assessment.examinee_count}</span>
          </div>
          <div>
            <span className="font-bold">Total Items: </span>
            <span>{assessment.total_items} items</span>
          </div>
        </div>

        {/* Statistical Summary Box */}
        <div className="my-4 p-3 border border-black">
          <div className="text-[11px] font-bold uppercase tracking-wider text-center mb-2">
            Statistical Analysis Summary (DepEd Order No. 8 s. 2015)
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center text-xs">
            <div className="border border-gray-400 p-2">
              <div className="text-[10px] uppercase font-bold text-gray-700">Mean Score (μ)</div>
              <div className="text-base font-extrabold mt-0.5">
                {Number(assessment.mean_score).toFixed(2)}
              </div>
            </div>

            <div className="border border-gray-400 p-2">
              <div className="text-[10px] uppercase font-bold text-gray-700">Standard Deviation (SD)</div>
              <div className="text-base font-extrabold mt-0.5">
                {Number(assessment.standard_deviation).toFixed(2)}
              </div>
            </div>

            <div className="border border-gray-400 p-2">
              <div className="text-[10px] uppercase font-bold text-gray-700">Mean Percentage Score (MPS)</div>
              <div className="text-base font-extrabold mt-0.5 text-black">
                {Number(assessment.mean_percentage_score).toFixed(2)}%
              </div>
            </div>

            <div className="border border-gray-400 p-2">
              <div className="text-[10px] uppercase font-bold text-gray-700">Mastery Level</div>
              <div className="text-xs font-bold mt-1 uppercase">
                {assessment.mastery_level}
              </div>
            </div>
          </div>
        </div>

        {/* Item Analysis Table */}
        <div className="my-4">
          <div className="text-[11px] font-bold uppercase mb-1">
            Item-by-Item Difficulty Index Analysis
          </div>
          <table className="w-full text-left border-collapse text-[10px] border border-black">
            <thead>
              <tr className="bg-gray-100 border-b border-black text-center font-bold">
                <th className="border border-black p-1 w-10">Item #</th>
                <th className="border border-black p-1 text-left">Curriculum Learning Competency</th>
                <th className="border border-black p-1 w-16">Correct (Rj)</th>
                <th className="border border-black p-1 w-16">Examinees (N)</th>
                <th className="border border-black p-1 w-16">Difficulty (Dj)</th>
                <th className="border border-black p-1 w-20">Interpretation</th>
                <th className="border border-black p-1 w-16">Action</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.item_number} className="border-b border-black">
                  <td className="border border-black p-1 text-center font-bold">
                    {item.item_number}
                  </td>
                  <td className="border border-black p-1">
                    <span>{item.learning_competency}</span>
                    {item.is_least_learned && (
                      <span className="ml-1 font-bold italic">[Least Learned]</span>
                    )}
                  </td>
                  <td className="border border-black p-1 text-center">
                    {item.correct_responses_count}
                  </td>
                  <td className="border border-black p-1 text-center">
                    {item.total_examinees || assessment.examinee_count}
                  </td>
                  <td className="border border-black p-1 text-center font-mono font-bold">
                    {Number(item.difficulty_index).toFixed(3)}
                  </td>
                  <td className="border border-black p-1 text-center">
                    {item.difficulty_interpretation}
                  </td>
                  <td className="border border-black p-1 text-center font-bold">
                    {item.action_recommendation}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Top 3 Least Learned Competencies Callout & Intervention */}
        {leastLearned.length > 0 && (
          <div className="my-4 p-3 border border-black text-xs">
            <div className="text-[11px] font-bold uppercase mb-2">
              Top Least Learned Competencies & Instructional Intervention Plan
            </div>
            <div className="space-y-1.5">
              {leastLearned.map((item, idx) => (
                <div key={item.item_number} className="flex items-start gap-2">
                  <span className="font-bold shrink-0">{idx + 1}. Item #{item.item_number} (Dj: {Number(item.difficulty_index).toFixed(3)}):</span>
                  <span>{item.learning_competency} — <em>Action: Targeted Remedial Reteaching & Diagnostic Follow-up</em></span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* DepEd Official Signatures */}
        <div className="mt-12 pt-6 grid grid-cols-2 gap-8 text-xs">
          <div className="text-center">
            <p className="text-[11px] text-gray-600 mb-8">Prepared by:</p>
            <p className="font-bold uppercase tracking-wide border-b border-black pb-1 inline-block min-w-[200px]">
              {assessment.teacher?.full_name ||"Subject Teacher"}
            </p>
            <p className="text-[11px] text-gray-600 mt-1">Subject Teacher</p>
          </div>

          <div className="text-center">
            <p className="text-[11px] text-gray-600 mb-8">Noted by:</p>
            <p className="font-bold uppercase tracking-wide border-b border-black pb-1 inline-block min-w-[200px]">
              {principal?.full_name ||"ANTHONY RIEL DIANGO"}
            </p>
            <p className="text-[11px] text-gray-600 mt-1">School Head / Principal I</p>
          </div>
        </div>
      </div>
    </div>
  );
};
