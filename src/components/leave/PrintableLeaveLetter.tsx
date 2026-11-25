import React, { useState, useMemo } from "react";
import type {
  LeaveApplication,
  LeaveClassRelief,
  SchoolSettings,
  TimeSlotOverride,
} from "../../types";
import { resolveTimeSlotForSection } from "../../services/timetableService";
import {
  DepEdDocumentFooter,
  PrintPageSizeStyle,
  PAPER_SIZE_CONFIG,
  type PaperSize,
} from "../timetable/DepEdPrintChrome";
import { Printer, X } from "lucide-react";

interface PrintableLeaveLetterProps {
  isOpen: boolean;
  onClose: () => void;
  leaveApp: LeaveApplication;
  schoolSettings?: SchoolSettings | null;
  timeSlotOverrides?: TimeSlotOverride[];
}

function to12HourAMPM(timeStr?: string | null): string {
  if (!timeStr) return "";
  const parts = timeStr.split(":");
  const h = parseInt(parts[0] || "0", 10);
  const m = parts[1] || "00";
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${m} ${period}`;
}

function formatLongDate(dateStr?: string | null): string {
  if (!dateStr) return "";
  const d = new Date(`${dateStr.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatShortDate(dateStr?: string | null): string {
  if (!dateStr) return "";
  const d = new Date(`${dateStr.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function buildSchoolHeadSalutation(headName?: string | null): string {
  if (!headName) return "Dear Sir/Madam:";
  const clean = headName.replace(/,?\s*(Ed\.?D\.?|Ph\.?D\.?|CESO.*|TM)$/i, "").trim();
  const tokens = clean.split(/\s+/);
  const lastName = tokens[tokens.length - 1] || clean;
  if (/EdD|PhD|Dr\./i.test(headName)) {
    return `Dear Dr. ${lastName}:`;
  }
  return `Dear Mr./Ms. ${lastName}:`;
}

interface MergedArrangementRow {
  key: string;
  reliefDate: string;
  startTime: string;
  endTime: string;
  subjectLabel: string;
  sectionLabel: string;
  relieverName: string;
  relieverDesignation?: string | null;
  conformeStatuses: string[];
}

export const PrintableLeaveLetter: React.FC<PrintableLeaveLetterProps> = ({
  isOpen,
  onClose,
  leaveApp,
  schoolSettings = null,
  timeSlotOverrides = [],
}) => {
  const [paperSize, setPaperSize] = useState<PaperSize>("letter");
  const paperConfig = PAPER_SIZE_CONFIG[paperSize];

  const mergedArrangements = useMemo<MergedArrangementRow[]>(() => {
    const rawReliefs = [...(leaveApp.reliefs || [])];
    const resolvedItems = rawReliefs.map((r: LeaveClassRelief) => {
      const slot = r.time_slot
        ? resolveTimeSlotForSection(r.time_slot, timeSlotOverrides, r.section || null)
        : null;
      return {
        relief: r,
        startTime: slot?.start_time || "00:00:00",
        endTime: slot?.end_time || "00:00:00",
        sortOrder: slot?.sort_order ?? 0,
      };
    });

    resolvedItems.sort(
      (a, b) =>
        a.relief.relief_date.localeCompare(b.relief.relief_date) ||
        a.sortOrder - b.sortOrder ||
        a.startTime.localeCompare(b.startTime)
    );

    const rows: MergedArrangementRow[] = [];
    for (const item of resolvedItems) {
      const r = item.relief;
      const prev = rows[rows.length - 1];
      const canMerge =
        prev &&
        prev.reliefDate === r.relief_date &&
        prev.endTime.slice(0, 5) === item.startTime.slice(0, 5) &&
        prev.subjectLabel === (r.subject?.subject_name || "Subject") &&
        prev.sectionLabel ===
          (r.section ? `${r.section.grade_level} ${r.section.section_name}` : "Section") &&
        prev.relieverName === (r.reliever?.full_name || "Assigned Substitute");

      if (canMerge && prev) {
        prev.endTime = item.endTime;
        prev.conformeStatuses.push(r.conforme_status);
      } else {
        rows.push({
          key: r.id || `${r.relief_date}_${r.time_slot_id}`,
          reliefDate: r.relief_date,
          startTime: item.startTime,
          endTime: item.endTime,
          subjectLabel: r.subject?.subject_name || "Subject",
          sectionLabel: r.section
            ? `${r.section.grade_level} ${r.section.section_name.toUpperCase()}`
            : "Section",
          relieverName: r.reliever?.full_name || "Assigned Substitute",
          relieverDesignation: r.reliever?.designation || null,
          conformeStatuses: [r.conforme_status],
        });
      }
    }
    return rows;
  }, [leaveApp.reliefs, timeSlotOverrides]);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const isSingleDay = leaveApp.start_date === leaveApp.end_date;
  const formattedInclusiveDates = isSingleDay
    ? formatLongDate(leaveApp.start_date)
    : `${formatLongDate(leaveApp.start_date)} to ${formatLongDate(leaveApp.end_date)}`;

  const filingDate = formatLongDate(
    leaveApp.created_at ? leaveApp.created_at.slice(0, 10) : new Date().toISOString().slice(0, 10)
  );
  const schoolHeadName = schoolSettings?.principal_name || "PEEJAY BASLAN, EDD";
  const schoolHeadDesignation = schoolSettings?.principal_designation || "School-In-Charge";
  const schoolName = schoolSettings?.school_name || "Fermin Tayabas National High School";
  const schoolAddress = schoolSettings?.address || "Cabayugan, Calape, Bohol";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="print-leave-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-cyprus-950/70 backdrop-blur-xs overflow-y-auto print:static print:p-0 print:bg-white"
    >
      <PrintPageSizeStyle paperSize={paperSize} />

      <div
        className={`bg-white text-zinc-900 border border-sand-300 rounded-2xl w-full ${paperConfig.previewMaxWidth} shadow-2xl overflow-hidden my-4 print:my-0 print:border-none print:shadow-none print:rounded-none print:max-w-none print:w-full`}
      >
        {/* Top Control Bar (Hidden during print) */}
        <div className="px-5 py-3 bg-[#0F3D2E] text-white flex flex-wrap items-center justify-between gap-2 print:hidden">
          <div className="flex items-center gap-2">
            <Printer className="w-4 h-4 text-emerald-300" />
            <span id="print-leave-title" className="text-xs font-bold font-display uppercase tracking-wider">
              Leave of Absence &amp; Class Arrangements Letter
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label htmlFor="leave-paper-select" className="text-[11px] text-sand-200">
              Paper Size:
            </label>
            <select
              id="leave-paper-select"
              value={paperSize}
              onChange={(e) => setPaperSize(e.target.value as PaperSize)}
              className="py-1 px-2 rounded-lg bg-white text-cyprus-900 text-xs font-semibold cursor-pointer"
            >
              {(Object.entries(PAPER_SIZE_CONFIG) as Array<[PaperSize, typeof paperConfig]>).map(
                ([key, cfg]) => (
                  <option key={key} value={key}>
                    {cfg.label}
                  </option>
                )
              )}
            </select>
            <button
              type="button"
              onClick={handlePrint}
              className="px-3.5 py-1.5 rounded-lg bg-crimson-600 hover:bg-crimson-700 text-white text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Letter (1 Page)</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-sand-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              aria-label="Close print preview"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Single-Page Official Excuse Letter Sheet (Aligned with Uploaded Reference .docx) */}
        <div
          className={`flex flex-col justify-between p-7 sm:p-10 text-slate-900 font-serif ${paperConfig.pageHeightClass} print:p-0 print:break-inside-avoid print:overflow-hidden`}
        >
          <div className={paperConfig.isCompact ? "space-y-2.5 text-[11.5px] leading-snug" : "space-y-3.5 text-[12.5px] leading-normal"}>
            {/* Official DepEd Header Matching .docx */}
            <div className="flex items-center justify-center gap-5 pb-2 border-b-2 border-slate-900">
              <img
                src="/images/Official%20Logos/Fermin_logo.png"
                alt="FTNHS Logo"
                className="w-14 h-14 object-contain shrink-0"
              />
              <div className="text-center leading-tight">
                <p className="text-[10.5px] text-slate-800">Republic of the Philippines</p>
                <p className="text-[14px] font-bold text-slate-950">Department of Education</p>
                <p className="text-[9.5px] uppercase tracking-wide text-slate-800">
                  {schoolSettings?.region || "Region VII – CENTRAL VISAYAS"}
                </p>
                <p className="text-[9.5px] font-bold uppercase tracking-wide text-slate-900">
                  {schoolSettings?.division || "SCHOOLS DIVISION OF BOHOL"}
                </p>
                <p className="text-[9px] uppercase tracking-wide text-slate-800">
                  {schoolSettings?.district || "DISTRICT OF CALAPE"}
                </p>
                <p className="text-[11px] font-bold uppercase text-slate-950 pt-0.5">
                  {schoolName}
                </p>
                <p className="text-[9.5px] text-slate-700">{schoolAddress}</p>
              </div>
              <img
                src="/images/Official%20Logos/sdoBohol_logo.png"
                alt="Division of Bohol Logo"
                className="w-14 h-14 object-contain shrink-0"
              />
            </div>

            {/* Date Line */}
            <div className="pt-1 font-sans text-[11.5px] text-slate-900">
              {filingDate}
            </div>

            {/* Addressee Block */}
            <div className="font-sans text-[11.5px] leading-snug text-slate-950">
              <div className="font-bold uppercase">{schoolHeadName}</div>
              <div>{schoolHeadDesignation}</div>
              <div>{schoolName}</div>
              <div>{schoolAddress}</div>
            </div>

            {/* Subject */}
            <div className="font-sans text-[11.5px] font-bold text-slate-950 pt-0.5">
              Subject: {leaveApp.leave_type} and Class Arrangements for {formattedInclusiveDates}
            </div>

            {/* Salutation */}
            <div className="font-sans text-[11.5px] text-slate-900">
              {buildSchoolHeadSalutation(schoolHeadName)}
            </div>

            {/* Letter Paragraphs matching .docx template */}
            <p className="text-justify font-sans text-slate-900">
              I am writing to formally request a{" "}
              <span className="font-semibold">{leaveApp.leave_type}</span> for{" "}
              <span className="font-semibold">{formattedInclusiveDates}</span>{" "}
              ({leaveApp.total_days} working {leaveApp.total_days === 1 ? "day" : "days"}).{" "}
              {leaveApp.reason}
            </p>

            <p className="text-justify font-sans text-slate-900">
              To ensure continuity for my scheduled classes, I have coordinated with fellow
              teachers regarding the temporary supervision of my students. The designated
              teachers will oversee the classes and facilitate the activities and instructions
              I have provided in advance, ensuring the students remain properly guided and engaged.
            </p>

            <p className="font-sans text-slate-900">The arrangements are as follows:</p>

            {/* Class Arrangements Table */}
            <table className="w-full border-collapse border border-slate-900 font-sans text-[10.5px]">
              <thead>
                <tr className="bg-slate-100 text-slate-950 font-bold text-left">
                  <th className="border border-slate-900 py-1.5 px-2 whitespace-nowrap">Time</th>
                  <th className="border border-slate-900 py-1.5 px-2">
                    Subject / Grade &amp; Section
                  </th>
                  <th className="border border-slate-900 py-1.5 px-2">
                    Designated Substitute / Proctor
                  </th>
                  <th className="border border-slate-900 py-1.5 px-2 text-center w-28">
                    Signature
                  </th>
                </tr>
              </thead>
              <tbody>
                {mergedArrangements.length > 0 ? (
                  mergedArrangements.map((row) => {
                    const allAccepted = row.conformeStatuses.every((s) => s === "Accepted");
                    const anyDeclined = row.conformeStatuses.some((s) => s === "Declined");
                    const timeWindow = `${to12HourAMPM(row.startTime)} – ${to12HourAMPM(row.endTime)}`;
                    return (
                      <tr key={row.key}>
                        <td className="border border-slate-900 py-1.5 px-2 whitespace-nowrap font-medium tabular-nums">
                          {!isSingleDay ? `${formatShortDate(row.reliefDate)} • ` : ""}
                          {timeWindow}
                        </td>
                        <td className="border border-slate-900 py-1.5 px-2">
                          {row.subjectLabel} – {row.sectionLabel}
                        </td>
                        <td className="border border-slate-900 py-1.5 px-2 font-medium">
                          {row.relieverName}
                          {row.relieverDesignation ? `, ${row.relieverDesignation}` : ""}
                        </td>
                        <td className="border border-slate-900 py-1.5 px-2 text-center text-[9.5px]">
                          {allAccepted ? (
                            <span className="font-bold text-emerald-800">✓ Conforme Signed</span>
                          ) : anyDeclined ? (
                            <span className="font-bold text-crimson-700">Reassign</span>
                          ) : (
                            <span className="text-slate-400">&nbsp;</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td
                      colSpan={4}
                      className="border border-slate-900 py-2 px-2 text-center italic text-slate-600"
                    >
                      No teaching classes affected during the indicated leave date(s).
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            <p className="text-justify font-sans text-slate-900">
              The designated teachers will not be required to conduct a regular lesson. Instead,
              they will simply oversee the class and facilitate the prepared learning tasks. Their
              assistance will ensure that the students remain supervised and that the planned
              activities are carried out accordingly.
            </p>

            <p className="text-justify font-sans text-slate-900">
              I respectfully submit these arrangements for your information and consideration.
              I sincerely appreciate your support and understanding regarding this matter.
            </p>

            <p className="font-sans text-slate-900 pt-0.5">Thank you very much.</p>

            {/* Signature & Approval Block */}
            <div className="pt-4 grid grid-cols-2 gap-8 font-sans text-[11px] items-end">
              <div>
                <div className="border-b border-slate-900 pb-0.5 font-bold uppercase text-slate-950">
                  {leaveApp.teacher?.full_name || "Requesting Teacher"}
                </div>
                <div className="text-[10px] text-slate-700 mt-0.5">
                  {leaveApp.teacher?.designation || "Teacher"}
                </div>
              </div>

              <div className="text-center">
                <div className="text-[10px] text-slate-600 text-left mb-4">
                  Approved / Noted by:
                </div>
                <div className="border-b border-slate-900 pb-0.5 font-bold uppercase text-slate-950">
                  {schoolHeadName}
                </div>
                <div className="text-[10px] text-slate-700 mt-0.5">
                  {schoolHeadDesignation}
                </div>
              </div>
            </div>

            {leaveApp.status === "Approved" && (
              <div className="pt-1 text-center">
                <span className="inline-block border border-emerald-700 text-emerald-800 px-3 py-0.5 rounded font-sans font-bold text-[10px] uppercase tracking-wider">
                  ★ OFFICIALLY APPROVED &amp; NOTED BY SCHOOL HEAD ★
                </span>
              </div>
            )}
          </div>

          {/* Footer anchored cleanly at bottom of single page */}
          <div className="mt-auto">
            <DepEdDocumentFooter schoolSettings={schoolSettings} />
          </div>
        </div>
      </div>
    </div>
  );
};
