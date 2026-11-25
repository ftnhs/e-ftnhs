import React from "react";
import type { AcademicTerm, DayOfWeek, ScheduleEntry, SchoolSettings, TimeSlot } from "../../types";

function to12HourShort(timeStr: string): string {
  const parts = timeStr.split(":");
  const h = parseInt(parts[0] || "0", 10);
  const m = parts[1] || "00";
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${m}`;
}

export function formatScheduleTimeRange(startTime: string, endTime: string): string {
  return `${to12HourShort(startTime)} – ${to12HourShort(endTime)}`;
}

export interface MergedSlotCell {
  entry: ScheduleEntry | undefined;
  rowSpan: number;
  skip: boolean;
}

export type PaperSize = "folio" | "a4" | "letter";

export const PAPER_SIZE_CONFIG: Record<
  PaperSize,
  {
    label: string;
    cssSize: string;
    previewMaxWidth: string;
    pageHeightClass: string;
    isCompact: boolean;
  }
> = {
  folio: {
    label: 'Long / Folio (8.5" × 13")',
    cssSize: "8.5in 13in",
    previewMaxWidth: "max-w-[8.5in]",
    pageHeightClass: "min-h-[11.8in] print:h-[11.8in] print:min-h-[11.8in]",
    isCompact: false,
  },
  a4: {
    label: 'A4 (8.27" × 11.69")',
    cssSize: "8.27in 11.69in",
    previewMaxWidth: "max-w-[8.27in]",
    pageHeightClass: "min-h-[10.48in] print:h-[10.48in] print:min-h-[10.48in]",
    isCompact: true,
  },
  letter: {
    label: 'Short / Letter (8.5" × 11")',
    cssSize: "8.5in 11in",
    previewMaxWidth: "max-w-[8.5in]",
    pageHeightClass: "min-h-[9.8in] print:h-[9.8in] print:min-h-[9.8in]",
    isCompact: true,
  },
};

export const PrintPageSizeStyle: React.FC<{ paperSize: PaperSize }> = ({ paperSize }) => {
  const { cssSize } = PAPER_SIZE_CONFIG[paperSize];
  return (
    <style>{`@media print { @page { size: ${cssSize}; margin: 0.5in; } }`}</style>
  );
};

/**
 * Computes vertical rowSpan merges for consecutive academic slots that share
 * the exact same subject + section + teacher assignment on a given weekday.
 */
export function buildMergedScheduleMatrix(
  timeSlots: TimeSlot[],
  entries: ScheduleEntry[],
  days: readonly DayOfWeek[],
  matchKey: (entry: ScheduleEntry) => string
): Record<string, Record<DayOfWeek, MergedSlotCell>> {
  const matrix: Record<string, Record<DayOfWeek, MergedSlotCell>> = {};

  for (const slot of timeSlots) {
    matrix[slot.id] = {} as Record<DayOfWeek, MergedSlotCell>;
    for (const day of days) {
      const entry =
        slot.slot_type === "Academic"
          ? entries.find((e) => e.time_slot_id === slot.id && e.day_of_week === day)
          : undefined;
      matrix[slot.id]![day] = { entry, rowSpan: 1, skip: false };
    }
  }

  for (const day of days) {
    let i = 0;
    while (i < timeSlots.length) {
      const slot = timeSlots[i]!;
      const cell = matrix[slot.id]![day]!;
      if (slot.slot_type !== "Academic" || !cell.entry) {
        i += 1;
        continue;
      }

      const key = matchKey(cell.entry);
      let span = 1;
      while (i + span < timeSlots.length) {
        const nextSlot = timeSlots[i + span]!;
        const nextCell = matrix[nextSlot.id]![day]!;
        if (
          nextSlot.slot_type === "Academic" &&
          nextCell.entry &&
          matchKey(nextCell.entry) === key
        ) {
          nextCell.skip = true;
          span += 1;
        } else {
          break;
        }
      }
      cell.rowSpan = span;
      i += span;
    }
  }

  return matrix;
}

interface DepEdPrintChromeProps {
  schoolSettings: SchoolSettings | null;
  activeTerm: AcademicTerm | null;
}

export const DepEdDocumentHeader: React.FC<DepEdPrintChromeProps> = ({
  schoolSettings,
  activeTerm,
}) => {
  const sy = activeTerm?.school_year
    ? activeTerm.school_year.replace("-", " - ")
    : "2026 - 2027";

  return (
    <div className="space-y-1">
      <div className="text-center space-y-0.5 leading-tight">
        <img
          src="/images/Official%20Logos/Deped_Seal.png"
          alt="Department of Education Official Seal"
          className="w-11 h-11 mx-auto object-contain mb-0.5"
        />
        <p className="text-[11px] font-serif tracking-wide text-slate-900">
          Republic of the Philippines
        </p>
        <p className="text-[15px] font-serif font-bold text-slate-900">
          Department of Education
        </p>
        <p className="text-[10px] font-serif uppercase tracking-wider text-slate-900">
          {schoolSettings?.region || "Region VII – CENTRAL VISAYAS"}
        </p>
        <p className="text-[10px] font-bold uppercase tracking-wide text-slate-900">
          {schoolSettings?.division || "SCHOOLS DIVISION OF BOHOL"}
        </p>
      </div>

      <div className="border-t-2 border-slate-900 pt-1 text-right">
        <span className="text-[11px] font-serif font-semibold text-slate-900">
          School Year: {sy}
        </span>
      </div>
    </div>
  );
};

export const DepEdDocumentFooter: React.FC<{ schoolSettings: SchoolSettings | null }> = ({
  schoolSettings,
}) => {
  return (
    <div className="mt-4 pt-2 border-t-2 border-slate-900 flex items-center justify-start gap-2 text-left">
      <img
        src="/images/Official%20Logos/Region7_logo.png"
        alt="DepEd Region VII Central Visayas Logo"
        className="w-10 h-10 object-contain shrink-0"
      />
      <img
        src="/images/Official%20Logos/sdoBohol_logo.png"
        alt="Schools Division of Bohol Logo"
        className="w-10 h-10 object-contain shrink-0"
      />
      <img
        src="/images/Official%20Logos/Fermin_logo.png"
        alt="Fermin Tayabas National High School Logo"
        className="w-10 h-10 object-contain shrink-0"
      />
      <div className="text-[9.5px] leading-tight text-slate-900 font-serif pl-1 text-left">
        <div className="font-bold uppercase tracking-wide">
          {schoolSettings?.school_name || "FERMIN TAYABAS NATIONAL HIGH SCHOOL"}
        </div>
        <div>
          Barangay {schoolSettings?.address || "Cabayugan, Calape, 6328 Bohol"}
        </div>
        <div>Contact No.: 0976-116-2786</div>
      </div>
    </div>
  );
};
