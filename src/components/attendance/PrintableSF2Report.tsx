import React from "react";
import type { SF2MonthlySummary } from "../../types";
import { Printer, X } from "lucide-react";

interface PrintableSF2ReportProps {
  isOpen: boolean;
  onClose: () => void;
  summary: SF2MonthlySummary;
}

export const PrintableSF2Report: React.FC<PrintableSF2ReportProps> = ({
  isOpen,
  onClose,
  summary,
}) => {
  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const maleStudents = summary.studentSummaries.filter((s) => s.gender === "Male");
  const femaleStudents = summary.studentSummaries.filter((s) => s.gender === "Female");

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="print-sf2-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-cyprus-950/70 backdrop-blur-xs overflow-y-auto"
    >
      <div className="bg-white text-zinc-900 border border-sand-300 rounded-2xl max-w-5xl w-full shadow-2xl overflow-hidden my-8">
        {/* Top Control Bar (Hidden when printing) */}
        <div className="px-6 py-3.5 bg-cyprus-900 text-white flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2">
            <Printer className="w-4 h-4 text-crimson-400" />
            <span id="print-sf2-title" className="text-xs font-bold font-display uppercase tracking-wider">
              DepEd School Form 2 (SF2) Daily Attendance Report
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-3.5 py-1.5 rounded-lg bg-crimson-600 hover:bg-crimson-700 text-white text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print SF2 (Landscape/Folio)</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-sand-300 hover:text-white hover:bg-white/10 transition-colors"
              aria-label="Close dialog"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* SF2 Document Body */}
        <div className="p-8 sm:p-12 space-y-5 text-zinc-900 font-sans text-xs leading-tight print:p-0">
          {/* Official DepEd Header */}
          <div className="text-center space-y-0.5 border-b-2 border-zinc-900 pb-3">
            <div className="text-[10px] uppercase tracking-wider text-zinc-600 font-medium">
              Republic of the Philippines • Department of Education
            </div>
            <div className="text-sm font-extrabold uppercase tracking-wide text-zinc-950">
              School Form 2 (SF2) Daily Attendance Report of Learners
            </div>
            <div className="text-[11px] text-zinc-700">
              (Pursuant to DepEd Order No. 4, s. 2014 & DepEd Order No. 58, s. 2017)
            </div>
          </div>

          {/* School & Section Information Grid */}
          <div className="grid grid-cols-4 gap-2 border border-zinc-400 p-2.5 rounded-xs text-[11px] bg-zinc-50">
            <div>
              <span className="text-zinc-600">School Name:</span>
              <div className="font-bold text-zinc-950">FERMIN TAYABAS NHS</div>
            </div>
            <div>
              <span className="text-zinc-600">School ID:</span>
              <div className="font-bold text-zinc-950">302851</div>
            </div>
            <div>
              <span className="text-zinc-600">District / Division:</span>
              <div className="font-bold text-zinc-950">Calape / Bohol (Region VII)</div>
            </div>
            <div>
              <span className="text-zinc-600">Report Month / Days:</span>
              <div className="font-bold text-zinc-950">
                {summary.monthYear} ({summary.totalSchoolDays} school days)
              </div>
            </div>

            <div className="pt-1.5 border-t border-zinc-200">
              <span className="text-zinc-600">Grade Level:</span>
              <div className="font-bold text-zinc-950">Grade {summary.section.grade_level}</div>
            </div>
            <div className="pt-1.5 border-t border-zinc-200">
              <span className="text-zinc-600">Section:</span>
              <div className="font-bold text-zinc-950">{summary.section.section_name}</div>
            </div>
            <div className="pt-1.5 border-t border-zinc-200 col-span-2">
              <span className="text-zinc-600">Class Adviser:</span>
              <div className="font-bold text-zinc-950">
                {summary.section.adviser?.full_name || "Designated Class Adviser"}
              </div>
            </div>
          </div>

          {/* Table of Learners */}
          <div className="border border-zinc-900 overflow-hidden">
            <table className="w-full text-left border-collapse text-[11px]">
              <thead className="bg-zinc-200 border-b border-zinc-900 font-bold text-zinc-900">
                <tr>
                  <th className="py-1.5 px-2 border-r border-zinc-400 w-8 text-center">#</th>
                  <th className="py-1.5 px-2 border-r border-zinc-400">Learner's Name (Last, First, Middle)</th>
                  <th className="py-1.5 px-2 border-r border-zinc-400 w-28 text-center">LRN</th>
                  <th className="py-1.5 px-2 border-r border-zinc-400 w-20 text-center">Days Present</th>
                  <th className="py-1.5 px-2 border-r border-zinc-400 w-20 text-center">Days Absent</th>
                  <th className="py-1.5 px-2 border-r border-zinc-400 w-20 text-center">Days Tardy</th>
                  <th className="py-1.5 px-2 border-r border-zinc-400 w-24 text-center">Max Consec. Abs.</th>
                  <th className="py-1.5 px-2">Remarks / Dropout Risk (SARDO)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-300">
                {/* Male Header */}
                <tr className="bg-zinc-100 font-bold text-zinc-950">
                  <td colSpan={8} className="py-1 px-2 uppercase tracking-wide">
                    MALE LEARNERS ({maleStudents.length})
                  </td>
                </tr>
                {maleStudents.map((st, idx) => (
                  <tr key={st.student_lrn} className="hover:bg-zinc-50">
                    <td className="py-1.5 px-2 border-r border-zinc-300 text-center text-zinc-600 font-mono">
                      {idx + 1}
                    </td>
                    <td className="py-1.5 px-2 border-r border-zinc-300 font-semibold text-zinc-950">
                      {st.student_name}
                    </td>
                    <td className="py-1.5 px-2 border-r border-zinc-300 text-center font-mono">
                      {st.student_lrn}
                    </td>
                    <td className="py-1.5 px-2 border-r border-zinc-300 text-center font-bold text-emerald-800">
                      {st.totalDaysPresent}
                    </td>
                    <td className="py-1.5 px-2 border-r border-zinc-300 text-center font-bold text-crimson-800">
                      {st.totalDaysAbsent}
                    </td>
                    <td className="py-1.5 px-2 border-r border-zinc-300 text-center text-amber-800 font-semibold">
                      {st.totalDaysTardy}
                    </td>
                    <td className="py-1.5 px-2 border-r border-zinc-300 text-center">
                      <span className={st.isSardo ? "font-bold text-crimson-700" : ""}>
                        {st.consecutiveAbsences}
                      </span>
                    </td>
                    <td className="py-1.5 px-2">
                      {st.isSardo ? (
                        <span className="font-bold text-crimson-700 bg-crimson-50 px-1 py-0.2 rounded text-[10px]">
                          ★ SARDO ALERT (Home Visitation Needed)
                        </span>
                      ) : (
                        st.remarks || "-"
                      )}
                    </td>
                  </tr>
                ))}

                {/* Female Header */}
                <tr className="bg-zinc-100 font-bold text-zinc-950">
                  <td colSpan={8} className="py-1 px-2 uppercase tracking-wide">
                    FEMALE LEARNERS ({femaleStudents.length})
                  </td>
                </tr>
                {femaleStudents.map((st, idx) => (
                  <tr key={st.student_lrn} className="hover:bg-zinc-50">
                    <td className="py-1.5 px-2 border-r border-zinc-300 text-center text-zinc-600 font-mono">
                      {idx + 1}
                    </td>
                    <td className="py-1.5 px-2 border-r border-zinc-300 font-semibold text-zinc-950">
                      {st.student_name}
                    </td>
                    <td className="py-1.5 px-2 border-r border-zinc-300 text-center font-mono">
                      {st.student_lrn}
                    </td>
                    <td className="py-1.5 px-2 border-r border-zinc-300 text-center font-bold text-emerald-800">
                      {st.totalDaysPresent}
                    </td>
                    <td className="py-1.5 px-2 border-r border-zinc-300 text-center font-bold text-crimson-800">
                      {st.totalDaysAbsent}
                    </td>
                    <td className="py-1.5 px-2 border-r border-zinc-300 text-center text-amber-800 font-semibold">
                      {st.totalDaysTardy}
                    </td>
                    <td className="py-1.5 px-2 border-r border-zinc-300 text-center">
                      <span className={st.isSardo ? "font-bold text-crimson-700" : ""}>
                        {st.consecutiveAbsences}
                      </span>
                    </td>
                    <td className="py-1.5 px-2">
                      {st.isSardo ? (
                        <span className="font-bold text-crimson-700 bg-crimson-50 px-1 py-0.2 rounded text-[10px]">
                          ★ SARDO ALERT (Home Visitation Needed)
                        </span>
                      ) : (
                        st.remarks || "-"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Official Monthly Attendance Summary Box (DepEd Formula Standards) */}
          <div className="border border-zinc-900 p-3 bg-zinc-50 space-y-2">
            <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-900 border-b border-zinc-300 pb-1">
              Monthly Summary of Attendance (DepEd SF2 Formulas)
            </div>
            <div className="grid grid-cols-4 gap-4 text-center text-[11px]">
              <div className="p-2 border border-zinc-300 bg-white">
                <div className="text-zinc-600 text-[10px]">Total Enrolment</div>
                <div className="font-extrabold text-sm text-zinc-950 mt-0.5">
                  {summary.totalRegistered}
                </div>
                <div className="text-[10px] text-zinc-500">
                  M: {summary.registeredMale} | F: {summary.registeredFemale}
                </div>
              </div>

              <div className="p-2 border border-zinc-300 bg-white">
                <div className="text-zinc-600 text-[10px]">Total Daily Attendance</div>
                <div className="font-extrabold text-sm text-zinc-950 mt-0.5">
                  {summary.totalPresentAll}
                </div>
                <div className="text-[10px] text-zinc-500">
                  M: {summary.totalPresentMale} | F: {summary.totalPresentFemale}
                </div>
              </div>

              <div className="p-2 border border-zinc-300 bg-white">
                <div className="text-zinc-600 text-[10px]">Average Daily Attendance (ADA)</div>
                <div className="font-extrabold text-sm text-zinc-950 mt-0.5">
                  {summary.adaTotal}
                </div>
                <div className="text-[10px] text-zinc-500">
                  M: {summary.adaMale} | F: {summary.adaFemale}
                </div>
              </div>

              <div className="p-2 border border-zinc-300 bg-white">
                <div className="text-zinc-600 text-[10px]">Percentage of Attendance (PA%)</div>
                <div className="font-extrabold text-sm text-emerald-800 mt-0.5">
                  {summary.paTotal}%
                </div>
                <div className="text-[10px] text-zinc-500">
                  M: {summary.paMale}% | F: {summary.paFemale}%
                </div>
              </div>
            </div>
          </div>

          {/* Signature Certification Block */}
          <div className="pt-6 grid grid-cols-2 gap-12 text-xs">
            <div>
              <div className="text-zinc-600 mb-8">Prepared and Submitted by:</div>
              <div className="border-b border-zinc-900 pb-0.5 text-center font-bold text-zinc-950 uppercase tracking-wide">
                {summary.section.adviser?.full_name || "Class Adviser"}
              </div>
              <div className="text-center text-[10px] text-zinc-600">
                Class Adviser, Grade {summary.section.grade_level} - {summary.section.section_name}
              </div>
            </div>

            <div>
              <div className="text-zinc-600 mb-8">Verified and Certified Correct:</div>
              <div className="border-b border-zinc-900 pb-0.5 text-center font-extrabold text-zinc-950 uppercase tracking-wide">
                ANTHONY RIEL DIANGO
              </div>
              <div className="text-center text-[10px] font-semibold text-zinc-800">
                School Head / Principal I
              </div>
              <div className="text-center text-[10px] text-zinc-500">
                Fermin Tayabas National High School • School ID: 302851
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
