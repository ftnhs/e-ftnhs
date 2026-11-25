import React, { useState, useEffect, useCallback, useMemo } from "react";
import type {
  Section,
  Profile,
  AcademicTerm,
  SchoolSettings,
  SF9LearnerReport,
  SF9SubjectGradeRow,
} from "../../types";
import { fetchClassesWithStats, type ClassOverviewItem } from "../../services/classManagementService";
import {
  fetchConsolidatedSF9ForSection,
  saveSF9AdviserRecord,
  SF9_MONTH_KEYS,
  type ConsolidatedSectionData,
} from "../../services/sf9Service";
import { schoolReferenceService } from "../../services/schoolReferenceService";
import { sanitizeSpreadsheetValue } from "../../services/fileSanitizer";
import {
  Printer,
  FileSpreadsheet,
  Award,
  RefreshCw,
  Save,
  CheckCircle2,
  AlertTriangle,
  Download,
  Users,
} from "lucide-react";

interface ConsolidatedSF9PanelProps {
  activeTerm: AcademicTerm | null;
  currentUser: Profile;
  isPrivileged: boolean;
}

const SF9CardSheet: React.FC<{
  data: ConsolidatedSectionData;
  report: SF9LearnerReport;
  schoolSettings: SchoolSettings;
  isBatchLast?: boolean;
}> = ({ data, report, schoolSettings, isBatchLast = false }) => {
  const { section, schoolYear, variant } = data;
  const { learner, age, rows, generalAverage, generalRemarks, totalUnits, adviserRecord, attendanceByMonth, totalClassDays, totalPresent, totalAbsent } = report;

  const isSSHS = variant === "SSHS_ACADEMIC" || variant === "SSHS_TECHPRO";
  const isOldShs = variant === "OLD_SHS";
  const trackDisplay = section.track_strand || (isSSHS ? (variant === "SSHS_TECHPRO" ? "TechPro Track" : "Academic Track") : isOldShs ? (section.section_name.includes("ICT") ? "TVL - ICT" : "Academic - HUMSS") : "");

  const coreRows = rows.filter((r) => r.group === "Core");
  const electiveRows = rows.filter((r) => r.group === "Elective");
  const appliedRows = rows.filter((r) => r.group === "Applied");
  const specializedRows = rows.filter((r) => r.group === "Specialized");
  const jhsRows = rows.filter((r) => r.group === "JHS");

  const renderGradeRow = (r: SF9SubjectGradeRow) => (
    <tr key={r.key} className="border-b border-zinc-400">
      <td className={`py-1 px-2 border-r border-zinc-400 ${r.isSubRow ? "pl-5 italic text-zinc-700" : "font-medium text-zinc-900"}`}>
        {r.label}
      </td>
      <td className="py-1 px-1.5 text-center border-r border-zinc-400 font-mono">
        {r.t1 !== null ? r.t1 : ""}
      </td>
      <td className="py-1 px-1.5 text-center border-r border-zinc-400 font-mono">
        {r.t2 !== null ? r.t2 : ""}
      </td>
      <td className="py-1 px-1.5 text-center border-r border-zinc-400 font-mono">
        {r.t3 !== null ? r.t3 : ""}
      </td>
      {isSSHS && (
        <td className="py-1 px-1.5 text-center border-r border-zinc-400 font-mono">
          {!r.isSubRow && r.units > 0 ? r.units : ""}
        </td>
      )}
      <td className="py-1 px-1.5 text-center border-r border-zinc-400 font-mono font-bold">
        {!r.isSubRow && r.finalGrade !== null ? r.finalGrade : ""}
      </td>
      <td className="py-1 px-2 text-center text-[10px] font-semibold">
        {!r.isSubRow ? (r.remarks === "—" ? "" : r.remarks) : ""}
      </td>
    </tr>
  );

  return (
    <div
      className={`bg-white text-zinc-950 p-6 sm:p-8 border border-zinc-300 rounded-xl shadow-xs print:border-none print:shadow-none print:p-2 text-[11px] leading-tight ${
        !isBatchLast ? "print:break-after-page" : ""
      }`}
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 print:grid-cols-2 gap-6">
        {/* LEFT COLUMN: Header, Learner Info, Report on Learning Progress & Descriptors */}
        <div className="space-y-3">
          {/* Official DepEd Header */}
          <div className="text-center space-y-0.5 border-b border-zinc-800 pb-2">
            <div className="text-[10px] uppercase">Republic of the Philippines</div>
            <div className="text-[11px] font-bold uppercase">Department of Education</div>
            <div className="text-[10px] uppercase">{schoolSettings.region}</div>
            <div className="text-[10px] font-semibold uppercase">{schoolSettings.division}</div>
            <div className="text-[10px]">{schoolSettings.district} • {schoolSettings.address}</div>
            <div className="text-xs font-extrabold uppercase tracking-wide pt-0.5">
              {schoolSettings.school_name}
            </div>
            <div className="text-[10px] text-zinc-600">School ID: {schoolSettings.school_id}</div>
          </div>

          <div className="text-center">
            <div className="text-xs font-extrabold uppercase tracking-wide">
              LEARNER&apos;S PERFORMANCE REPORT (SF9)
            </div>
            <div className="text-[10px] font-semibold text-zinc-700">
              School Year {schoolYear}
              {variant === "SSHS_ACADEMIC" && " • Strengthened SHS (Academic Track)"}
              {variant === "SSHS_TECHPRO" && " • Strengthened SHS (TechPro Track)"}
              {variant === "JHS_MATATAG" && " • MATATAG Curriculum (Junior High School)"}
              {variant === "OLD_SHS" && " • K-12 Senior High School Curriculum"}
            </div>
          </div>

          {/* Learner Info */}
          <div className="border border-zinc-700 p-2 space-y-1 text-[10.5px]">
            <div className="flex justify-between gap-2">
              <div><span className="font-semibold">Name:</span> <span className="font-bold uppercase">{learner.full_name}</span></div>
              <div><span className="font-semibold">Age:</span> {age ?? "—"} <span className="ml-2 font-semibold">Sex:</span> {learner.gender}</div>
            </div>
            <div className="flex justify-between gap-2">
              <div><span className="font-semibold">LRN:</span> <span className="font-mono font-bold">{learner.lrn}</span></div>
              <div><span className="font-semibold">Grade &amp; Section:</span> Grade {section.grade_level} - {section.section_name}</div>
            </div>
            {(isSSHS || isOldShs) && (
              <div>
                <span className="font-semibold">Track / Strand:</span> {trackDisplay}
              </div>
            )}
          </div>

          {/* Learning Progress & Achievement Table */}
          <div>
            <div className="text-[10.5px] font-bold uppercase mb-1">
              LEARNING PROGRESS AND ACHIEVEMENT
            </div>
            <table className="w-full border border-zinc-800 border-collapse text-[10.5px]">
              <thead>
                <tr className="bg-zinc-100 border-b border-zinc-800 font-bold text-center">
                  <th rowSpan={2} className="py-1.5 px-2 text-left border-r border-zinc-600">
                    Learning Areas
                  </th>
                  <th colSpan={3} className="py-1 px-1 border-r border-zinc-600 border-b border-zinc-400">
                    TERM
                  </th>
                  {isSSHS && (
                    <th rowSpan={2} className="py-1 px-1.5 border-r border-zinc-600 w-10">
                      Units
                    </th>
                  )}
                  <th rowSpan={2} className="py-1 px-1.5 border-r border-zinc-600 w-14">
                    Final Grade
                  </th>
                  <th rowSpan={2} className="py-1 px-1.5 w-16">
                    Remarks
                  </th>
                </tr>
                <tr className="bg-zinc-100 border-b border-zinc-800 font-bold text-center">
                  <th className="py-0.5 px-1.5 border-r border-zinc-400 w-9">T1</th>
                  <th className="py-0.5 px-1.5 border-r border-zinc-400 w-9">T2</th>
                  <th className="py-0.5 px-1.5 border-r border-zinc-600 w-9">T3</th>
                </tr>
              </thead>
              <tbody>
                {isSSHS && (
                  <>
                    <tr className="bg-zinc-100/70 border-b border-zinc-400 font-bold">
                      <td colSpan={7} className="py-1 px-2">Core Subjects</td>
                    </tr>
                    {coreRows.map(renderGradeRow)}
                    <tr className="bg-zinc-100/70 border-b border-zinc-400 font-bold">
                      <td colSpan={7} className="py-1 px-2">Elective Subjects</td>
                    </tr>
                    {electiveRows.length > 0 ? (
                      electiveRows.map(renderGradeRow)
                    ) : (
                      <tr className="border-b border-zinc-400">
                        <td colSpan={7} className="py-1.5 px-2 italic text-zinc-500">
                          No elective subjects connected yet.
                        </td>
                      </tr>
                    )}
                  </>
                )}

                {isOldShs && (
                  <>
                    {coreRows.length > 0 && (
                      <>
                        <tr className="bg-zinc-100/70 border-b border-zinc-400 font-bold">
                          <td colSpan={6} className="py-1 px-2">Core Subjects</td>
                        </tr>
                        {coreRows.map(renderGradeRow)}
                      </>
                    )}
                    {appliedRows.length > 0 && (
                      <>
                        <tr className="bg-zinc-100/70 border-b border-zinc-400 font-bold">
                          <td colSpan={6} className="py-1 px-2">Applied Subjects</td>
                        </tr>
                        {appliedRows.map(renderGradeRow)}
                      </>
                    )}
                    {specializedRows.length > 0 && (
                      <>
                        <tr className="bg-zinc-100/70 border-b border-zinc-400 font-bold">
                          <td colSpan={6} className="py-1 px-2">Specialized Subjects</td>
                        </tr>
                        {specializedRows.map(renderGradeRow)}
                      </>
                    )}
                  </>
                )}

                {variant === "JHS_MATATAG" && jhsRows.map(renderGradeRow)}

                {/* General Average Row */}
                <tr className="bg-zinc-100 font-extrabold border-t-2 border-zinc-800">
                  <td colSpan={4} className="py-1.5 px-2 text-right border-r border-zinc-600">
                    General Average
                  </td>
                  {isSSHS && (
                    <td className="py-1.5 px-1.5 text-center border-r border-zinc-600 font-mono">
                      {totalUnits}
                    </td>
                  )}
                  <td className="py-1.5 px-1.5 text-center border-r border-zinc-600 font-mono text-xs">
                    {generalAverage !== null ? generalAverage : ""}
                  </td>
                  <td className="py-1.5 px-1.5 text-center text-[10px]">
                    {generalRemarks === "—" ? "" : generalRemarks}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Performance Descriptors */}
          <div className="border border-zinc-500 p-2 text-[9.5px]">
            <div className="font-bold uppercase mb-1">PERFORMANCE DESCRIPTORS</div>
            {isOldShs ? (
              <div className="grid grid-cols-3 gap-x-2">
                <span><strong>90–100</strong> Outstanding (Passed)</span>
                <span><strong>85–89</strong> Very Satisfactory (Passed)</span>
                <span><strong>80–84</strong> Satisfactory (Passed)</span>
                <span><strong>75–79</strong> Fairly Satisfactory (Passed)</span>
                <span className="col-span-2"><strong>Below 75</strong> Did Not Meet Expectations (Failed)</span>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-x-2">
                <span><strong>90–100</strong> Advancing (Passed)</span>
                <span><strong>80–89</strong> Benchmarking (Passed)</span>
                <span><strong>75–79</strong> Connecting (Passed)</span>
                <span><strong>65–74</strong> Developing (Failed)</span>
                <span><strong>0–64</strong> Emerging (Failed)</span>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Attendance Record, Comments, Parent Signatures, Certificate of Transfer */}
        <div className="space-y-3">
          {/* Monthly Attendance Table */}
          <div>
            <div className="text-[10.5px] font-bold uppercase mb-1">ATTENDANCE RECORD</div>
            <table className="w-full border border-zinc-800 border-collapse text-[9.5px] text-center">
              <thead>
                <tr className="bg-zinc-100 border-b border-zinc-800 font-bold">
                  <th className="py-1 px-1.5 text-left border-r border-zinc-500">Month</th>
                  {SF9_MONTH_KEYS.map((m) => (
                    <th key={m} className="py-1 px-0.5 border-r border-zinc-400">{m}</th>
                  ))}
                  <th className="py-1 px-1">Total</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-zinc-400">
                  <td className="py-1 px-1.5 text-left font-semibold border-r border-zinc-500">No. of School Days</td>
                  {SF9_MONTH_KEYS.map((m) => (
                    <td key={m} className="py-1 px-0.5 border-r border-zinc-400 font-mono">
                      {attendanceByMonth[m]?.classDays ?? 0}
                    </td>
                  ))}
                  <td className="py-1 px-1 font-mono font-bold">{totalClassDays}</td>
                </tr>
                <tr className="border-b border-zinc-400">
                  <td className="py-1 px-1.5 text-left font-semibold border-r border-zinc-500">No. of Days Present</td>
                  {SF9_MONTH_KEYS.map((m) => (
                    <td key={m} className="py-1 px-0.5 border-r border-zinc-400 font-mono">
                      {attendanceByMonth[m]?.present ?? 0}
                    </td>
                  ))}
                  <td className="py-1 px-1 font-mono font-bold">{totalPresent}</td>
                </tr>
                <tr>
                  <td className="py-1 px-1.5 text-left font-semibold border-r border-zinc-500">No. of Days Absent</td>
                  {SF9_MONTH_KEYS.map((m) => (
                    <td key={m} className="py-1 px-0.5 border-r border-zinc-400 font-mono">
                      {attendanceByMonth[m]?.absent ?? 0}
                    </td>
                  ))}
                  <td className="py-1 px-1 font-mono font-bold">{totalAbsent}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Teacher's Comments / Remarks */}
          <div className="border border-zinc-600 p-2 space-y-1.5 text-[10px]">
            <div className="font-bold uppercase">TEACHER&apos;S COMMENTS / REMARKS</div>
            <div>
              <span className="font-semibold">Term 1:</span>{" "}
              <span className="border-b border-zinc-400 inline-block min-w-[75%]">
                {adviserRecord?.term1_remarks || "\u00A0"}
              </span>
            </div>
            <div>
              <span className="font-semibold">Term 2:</span>{" "}
              <span className="border-b border-zinc-400 inline-block min-w-[75%]">
                {adviserRecord?.term2_remarks || "\u00A0"}
              </span>
            </div>
            <div>
              <span className="font-semibold">Term 3:</span>{" "}
              <span className="border-b border-zinc-400 inline-block min-w-[75%]">
                {adviserRecord?.term3_remarks || "\u00A0"}
              </span>
            </div>
          </div>

          {/* Parent/Guardian Signature */}
          <div className="border border-zinc-600 p-2 space-y-2 text-[10px]">
            <div className="font-bold uppercase">PARENT&apos;S / GUARDIAN&apos;S SIGNATURE</div>
            <div className="grid grid-cols-3 gap-2 pt-2">
              <div className="text-center">
                <div className="border-b border-zinc-600 h-4" />
                <div className="text-[9px] mt-0.5">Term 1</div>
              </div>
              <div className="text-center">
                <div className="border-b border-zinc-600 h-4" />
                <div className="text-[9px] mt-0.5">Term 2</div>
              </div>
              <div className="text-center">
                <div className="border-b border-zinc-600 h-4" />
                <div className="text-[9px] mt-0.5">Term 3</div>
              </div>
            </div>
          </div>

          {/* Certificate of Transfer */}
          <div className="border border-zinc-700 p-2.5 space-y-1.5 text-[10px]">
            <div className="font-bold uppercase text-center">CERTIFICATE OF TRANSFER</div>
            <p className="text-[9.5px] leading-snug">
              This is to certify that the above-named learner has satisfactorily completed the requirements for the grade level indicated.
            </p>
            <div className="grid grid-cols-2 gap-2 pt-0.5">
              <div>
                <span className="font-semibold">Admitted to Grade:</span>{" "}
                <span className="underline">{adviserRecord?.admitted_to_grade || "______"}</span>
              </div>
              <div>
                <span className="font-semibold">Eligible for Admission to Grade:</span>{" "}
                <span className="underline">{adviserRecord?.eligible_for_grade || "______"}</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 pt-4 text-center">
              <div>
                <div className="font-bold uppercase border-b border-zinc-700 pb-0.5">
                  {section.adviser?.full_name || "Class Adviser"}
                </div>
                <div className="text-[9px]">Adviser</div>
              </div>
              <div>
                <div className="font-bold uppercase border-b border-zinc-700 pb-0.5">
                  {schoolSettings.principal_name}
                </div>
                <div className="text-[9px]">{schoolSettings.principal_designation}</div>
              </div>
            </div>
          </div>

          {/* Cancellation of Eligibility to Transfer */}
          <div className="border border-zinc-500 p-2 space-y-1.5 text-[10px]">
            <div className="font-bold uppercase text-center text-[9.5px]">
              CANCELLATION OF ELIGIBILITY TO TRANSFER
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="font-semibold">Admitted in:</span>{" "}
                <span className="underline">{adviserRecord?.transfer_school || "____________"}</span>
              </div>
              <div>
                <span className="font-semibold">Date:</span>{" "}
                <span className="underline">{adviserRecord?.transfer_date || "__________"}</span>
              </div>
            </div>
            <div className="pt-3 text-right">
              <span className="inline-block text-center min-w-[160px]">
                <div className="font-bold uppercase border-b border-zinc-700 pb-0.5">
                  {schoolSettings.principal_name}
                </div>
                <div className="text-[9px]">School Head</div>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const ConsolidatedSF9Panel: React.FC<ConsolidatedSF9PanelProps> = ({
  activeTerm,
  currentUser,
  isPrivileged,
}) => {
  const [classes, setClasses] = useState<ClassOverviewItem[]>([]);
  const [selectedSectionId, setSelectedSectionId] = useState<string>("");
  const [consolidated, setConsolidated] = useState<ConsolidatedSectionData | null>(null);
  const [schoolSettings, setSchoolSettings] = useState<SchoolSettings>({
    id: "default",
    school_name: "FERMIN TAYABAS NATIONAL HIGH SCHOOL",
    school_id: "302851",
    region: "REGION VII",
    division: "DIVISION OF BOHOL",
    district: "DISTRICT OF CALAPE",
    address: "Cabayugan, Calape, Bohol",
    principal_name: "Pee Jay Baslan, EdD",
    principal_designation: "School-in-Charge",
  });

  const [viewMode, setViewMode] = useState<"summary" | "sf9">("sf9");
  const [summaryTerm, setSummaryTerm] = useState<"t1" | "t2" | "t3" | "finalGrade">("finalGrade");
  const [selectedLearnerId, setSelectedLearnerId] = useState<string>("");
  const [isBatchPrinting, setIsBatchPrinting] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Editable SF9 remarks form
  const [t1Remark, setT1Remark] = useState<string>("");
  const [t2Remark, setT2Remark] = useState<string>("");
  const [t3Remark, setT3Remark] = useState<string>("");
  const [admittedTo, setAdmittedTo] = useState<string>("");
  const [eligibleFor, setEligibleFor] = useState<string>("");
  const [isSavingRemarks, setIsSavingRemarks] = useState<boolean>(false);
  const [toast, setToast] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const loadInitial = useCallback(async () => {
    if (!activeTerm?.id) return;
    setIsLoading(true);
    try {
      const [list, settings] = await Promise.all([
        fetchClassesWithStats(activeTerm.id),
        schoolReferenceService.fetchSchoolSettings(),
      ]);
      const visible = isPrivileged
        ? list
        : list.filter((c) => c.section.adviser_id === currentUser.id);
      setClasses(visible);
      setSchoolSettings(settings);
      setSelectedSectionId((prev) => {
        if (prev && visible.some((v) => v.section.id === prev)) return prev;
        return visible[0]?.section.id || "";
      });
    } finally {
      setIsLoading(false);
    }
  }, [activeTerm?.id, isPrivileged, currentUser.id]);

  useEffect(() => {
    loadInitial();
  }, [loadInitial]);

  const selectedSection = useMemo(
    () => classes.find((c) => c.section.id === selectedSectionId)?.section || null,
    [classes, selectedSectionId]
  );

  const loadConsolidated = useCallback(async (sec: Section) => {
    setIsLoading(true);
    try {
      const data = await fetchConsolidatedSF9ForSection(sec);
      setConsolidated(data);
      setSelectedLearnerId((prev) => {
        if (prev && data.learners.some((l) => l.id === prev)) return prev;
        return data.learners[0]?.id || "";
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedSection) {
      loadConsolidated(selectedSection);
    } else {
      setConsolidated(null);
    }
  }, [selectedSection, loadConsolidated]);

  const selectedReport = useMemo(
    () => consolidated?.reports.find((r) => r.learner.id === selectedLearnerId) || null,
    [consolidated, selectedLearnerId]
  );

  useEffect(() => {
    const rec = selectedReport?.adviserRecord;
    setT1Remark(rec?.term1_remarks || "");
    setT2Remark(rec?.term2_remarks || "");
    setT3Remark(rec?.term3_remarks || "");
    setAdmittedTo(rec?.admitted_to_grade || "");
    setEligibleFor(rec?.eligible_for_grade || "");
  }, [selectedReport]);

  const summaryColumns = useMemo(() => {
    if (!consolidated || consolidated.reports.length === 0) return [];
    const first = consolidated.reports[0];
    if (!first) return [];
    return first.rows.filter((r) => !r.isSubRow);
  }, [consolidated]);

  const summaryRankedReports = useMemo(() => {
    if (!consolidated) return [];
    const scores = consolidated.reports.map((rep) => {
      const vals = summaryColumns
        .map((col) => {
          const row = rep.rows.find((r) => r.key === col.key);
          return row ? row[summaryTerm] : null;
        })
        .filter((v): v is number => v !== null);
      const avg =
        summaryTerm === "finalGrade"
          ? rep.generalAverage
          : vals.length > 0
            ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length)
            : null;
      return { rep, avg };
    });

    const sortedAvgs = Array.from(
      new Set(scores.map((s) => s.avg).filter((v): v is number => v !== null))
    ).sort((a, b) => b - a);

    return scores.map(({ rep, avg }) => ({
      rep,
      avg,
      rank: avg !== null ? sortedAvgs.indexOf(avg) + 1 : null,
    }));
  }, [consolidated, summaryColumns, summaryTerm]);

  const handleSaveRemarks = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSection || !selectedReport) return;
    setIsSavingRemarks(true);
    try {
      await saveSF9AdviserRecord({
        sectionId: selectedSection.id,
        learnerId: selectedReport.learner.id,
        term1_remarks: t1Remark.trim() || null,
        term2_remarks: t2Remark.trim() || null,
        term3_remarks: t3Remark.trim() || null,
        admitted_to_grade: admittedTo.trim() || null,
        eligible_for_grade: eligibleFor.trim() || null,
        updated_by: currentUser.id,
      });
      setToast({ text: "SF9 adviser comments & transfer info saved.", type: "success" });
      setTimeout(() => setToast(null), 4000);
      await loadConsolidated(selectedSection);
    } catch (err) {
      console.error(err);
      setToast({ text: "Failed to save adviser comments.", type: "error" });
    } finally {
      setIsSavingRemarks(false);
    }
  };

  const handleExportSummaryCSV = () => {
    if (!consolidated) return;
    const headers = [
      "Learner Name",
      "LRN",
      "Sex",
      ...summaryColumns.map((c) => c.label),
      "General Average",
      "Rank",
    ];
    const csvRows = [headers.map((h) => `"${sanitizeSpreadsheetValue(h).replace(/"/g, '""')}"`).join(",")];

    summaryRankedReports.forEach(({ rep, avg, rank }) => {
      const cells = [
        rep.learner.full_name,
        rep.learner.lrn,
        rep.learner.gender,
        ...summaryColumns.map((c) => {
          const row = rep.rows.find((r) => r.key === c.key);
          const v = row ? row[summaryTerm] : null;
          return v !== null ? String(v) : "";
        }),
        avg !== null ? String(avg) : "",
        rank !== null ? String(rank) : "",
      ];
      csvRows.push(
        cells.map((cell) => `"${sanitizeSpreadsheetValue(cell).replace(/"/g, '""')}"`).join(",")
      );
    });

    const blob = new Blob([csvRows.join("\r\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Class_Summary_Gr${consolidated.section.grade_level}_${consolidated.section.section_name}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const triggerPrint = (batchAll: boolean) => {
    setIsBatchPrinting(batchAll);
    setTimeout(() => {
      window.print();
    }, 100);
  };

  if (classes.length === 0 && !isLoading) {
    return (
      <div className="bg-white rounded-2xl border border-sand-200 p-10 text-center space-y-3">
        <Award className="w-10 h-10 mx-auto text-sand-400" />
        <h3 className="text-sm font-bold text-cyprus-900">
          No Advisory Class Assigned for SF9 Consolidation
        </h3>
        <p className="text-xs text-sand-600 max-w-md mx-auto">
          Class Summary and SF9 generation are available for Class Advisers (on their assigned section) and School Heads / Admins.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {toast && (
        <div
          role="status"
          className={`print:hidden p-3 rounded-xl border text-xs flex items-center gap-2 ${
            toast.type === "error"
              ? "bg-crimson-50 border-crimson-200 text-crimson-900"
              : "bg-emerald-50 border-emerald-200 text-emerald-900"
          }`}
        >
          {toast.type === "error" ? (
            <AlertTriangle className="w-4 h-4 shrink-0 text-crimson-600" />
          ) : (
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          )}
          <span>{toast.text}</span>
        </div>
      )}

      {/* Top Controls (Hidden on Print) */}
      <div className="print:hidden bg-white rounded-2xl border border-[#E3DDD1] p-4 shadow-xs flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <label htmlFor="sf9-section-select" className="block text-[11px] font-semibold text-sand-700 mb-0.5">
              Advisory Class / Section
            </label>
            <select
              id="sf9-section-select"
              value={selectedSectionId}
              onChange={(e) => setSelectedSectionId(e.target.value)}
              className="px-3 py-2 rounded-xl border border-sand-300 bg-[#FAF8F5] text-cyprus-900 text-xs font-bold"
            >
              {classes.map((c) => (
                <option key={c.section.id} value={c.section.id}>
                  Grade {c.section.grade_level} - {c.section.section_name} ({c.learnerCount} learners)
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5 pt-4">
            <button
              type="button"
              onClick={() => setViewMode("sf9")}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer ${
                viewMode === "sf9"
                  ? "bg-cyprus-900 text-white"
                  : "bg-sand-100 text-sand-800 hover:bg-sand-200"
              }`}
            >
              <Award className="w-3.5 h-3.5" />
              <span>SF9 Report Cards</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("summary")}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer ${
                viewMode === "summary"
                  ? "bg-cyprus-900 text-white"
                  : "bg-sand-100 text-sand-800 hover:bg-sand-200"
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Consolidated Class Summary</span>
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {selectedSection && (
            <button
              type="button"
              onClick={() => loadConsolidated(selectedSection)}
              className="px-3 py-2 rounded-xl border border-sand-300 text-xs font-semibold text-cyprus-900 hover:bg-sand-50 flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Recalculate</span>
            </button>
          )}
          {viewMode === "summary" && consolidated && consolidated.learners.length > 0 && (
            <>
              <button
                type="button"
                onClick={handleExportSummaryCSV}
                className="px-3.5 py-2 rounded-xl border border-sand-300 text-xs font-semibold text-cyprus-900 hover:bg-sand-50 flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-emerald-700" />
                <span>Export CSV</span>
              </button>
              <button
                type="button"
                onClick={() => triggerPrint(false)}
                className="px-4 py-2 rounded-xl bg-crimson-600 hover:bg-crimson-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Class Summary</span>
              </button>
            </>
          )}
          {viewMode === "sf9" && consolidated && consolidated.learners.length > 0 && (
            <>
              <button
                type="button"
                onClick={() => triggerPrint(false)}
                disabled={!selectedReport}
                className="px-3.5 py-2 rounded-xl bg-[#0F3D2E] hover:bg-[#0A2E22] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Learner SF9</span>
              </button>
              <button
                type="button"
                onClick={() => triggerPrint(true)}
                className="px-4 py-2 rounded-xl bg-crimson-600 hover:bg-crimson-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print All SF9 ({consolidated.learners.length})</span>
              </button>
            </>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="py-14 text-center text-xs text-sand-600 space-y-2">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto text-cyprus-800" />
          <p>Consolidating Term 1, Term 2, Term 3 class records and SF2 attendance...</p>
        </div>
      ) : !consolidated || consolidated.learners.length === 0 ? (
        <div className="bg-white rounded-2xl border border-sand-200 p-10 text-center space-y-2">
          <Users className="w-8 h-8 mx-auto text-sand-400" />
          <p className="text-xs font-semibold text-cyprus-900">
            No learners enrolled in this section yet.
          </p>
          <p className="text-[11px] text-sand-600">
            Open the &ldquo;Class Management&rdquo; tab to enroll learners and connect subjects first.
          </p>
        </div>
      ) : viewMode === "summary" ? (
        /* CONSOLIDATED CLASS SUMMARY VIEW */
        <div className="bg-white rounded-2xl border border-sand-200 p-5 shadow-xs space-y-4 print:border-none print:shadow-none print:p-0">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-sand-200 pb-3">
            <div>
              <h3 className="text-sm font-bold text-cyprus-900 font-display uppercase">
                CLASS SUMMARY — Grade {consolidated.section.grade_level} {consolidated.section.section_name}
              </h3>
              <p className="text-xs text-sand-600">
                SY {consolidated.schoolYear} • Adviser: {consolidated.section.adviser?.full_name || "Unassigned"}
                {consolidated.section.track_strand ? ` • ${consolidated.section.track_strand}` : ""}
              </p>
            </div>
            <div className="print:hidden flex items-center gap-1.5">
              {(
                [
                  { id: "t1", label: "First Term" },
                  { id: "t2", label: "Second Term" },
                  { id: "t3", label: "Third Term" },
                  { id: "finalGrade", label: "Final Rating" },
                ] as const
              ).map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setSummaryTerm(t.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${
                    summaryTerm === t.id
                      ? "bg-cyprus-900 text-white"
                      : "bg-sand-100 text-sand-700 hover:bg-sand-200"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-[11px] border border-sand-300">
              <thead>
                <tr className="bg-sand-100 border-b border-sand-300 font-bold text-cyprus-900">
                  <th className="py-2 px-2 border-r border-sand-300 w-8 text-center">#</th>
                  <th className="py-2 px-2 border-r border-sand-300 min-w-[170px]">Learner&apos;s Name</th>
                  <th className="py-2 px-2 border-r border-sand-300">LRN</th>
                  <th className="py-2 px-2 border-r border-sand-300 text-center">Sex</th>
                  {summaryColumns.map((col) => (
                    <th key={col.key} className="py-2 px-2 border-r border-sand-300 text-center min-w-[72px]">
                      <div>{col.label}</div>
                      {consolidated.variant !== "JHS_MATATAG" && (
                        <div className="text-[9px] font-normal text-sand-600">{col.units}u</div>
                      )}
                    </th>
                  ))}
                  <th className="py-2 px-2 border-r border-sand-300 text-center bg-sand-200/70">Average</th>
                  <th className="py-2 px-2 text-center bg-sand-200/70">Rank</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sand-200">
                {(["Male", "Female"] as const).map((sex) => {
                  const groupRows = summaryRankedReports.filter((item) => item.rep.learner.gender === sex);
                  return (
                    <React.Fragment key={sex}>
                      <tr className="bg-sand-50 font-bold text-cyprus-900">
                        <td colSpan={summaryColumns.length + 6} className="py-1.5 px-2">
                          {sex.toUpperCase()} ({groupRows.length})
                        </td>
                      </tr>
                      {groupRows.map(({ rep, avg, rank }, idx) => (
                        <tr key={rep.learner.id} className="hover:bg-sand-50/70">
                          <td className="py-1.5 px-2 border-r border-sand-200 text-center font-mono">{idx + 1}</td>
                          <td className="py-1.5 px-2 border-r border-sand-200 font-semibold text-cyprus-900">
                            {rep.learner.full_name}
                          </td>
                          <td className="py-1.5 px-2 border-r border-sand-200 font-mono text-sand-700">
                            {rep.learner.lrn}
                          </td>
                          <td className="py-1.5 px-2 border-r border-sand-200 text-center">
                            {sex === "Male" ? "M" : "F"}
                          </td>
                          {summaryColumns.map((col) => {
                            const row = rep.rows.find((r) => r.key === col.key);
                            const v = row ? row[summaryTerm] : null;
                            return (
                              <td
                                key={col.key}
                                className={`py-1.5 px-2 border-r border-sand-200 text-center font-mono ${
                                  v !== null && v < 75 ? "text-crimson-600 font-bold" : "text-cyprus-900"
                                }`}
                              >
                                {v !== null ? v : "—"}
                              </td>
                            );
                          })}
                          <td className="py-1.5 px-2 border-r border-sand-200 text-center font-mono font-extrabold bg-sand-50">
                            {avg !== null ? avg : "—"}
                          </td>
                          <td className="py-1.5 px-2 text-center font-mono font-bold bg-sand-50">
                            {rank !== null ? rank : "—"}
                          </td>
                        </tr>
                      ))}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* SF9 REPORT CARDS VIEW */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Learner Selector Sidebar (Hidden on Print) */}
          <div className="print:hidden lg:col-span-3 space-y-4">
            <div className="bg-white rounded-2xl border border-sand-200 p-3 shadow-xs space-y-2 max-h-[540px] overflow-y-auto">
              <div className="text-xs font-bold text-cyprus-900 px-2 pb-1 border-b border-sand-200">
                Learners ({consolidated.reports.length})
              </div>
              {consolidated.reports.map((rep) => {
                const active = rep.learner.id === selectedLearnerId;
                return (
                  <button
                    key={rep.learner.id}
                    type="button"
                    onClick={() => {
                      setIsBatchPrinting(false);
                      setSelectedLearnerId(rep.learner.id);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs transition-colors cursor-pointer flex items-center justify-between gap-2 ${
                      active
                        ? "bg-cyprus-900 text-white"
                        : "hover:bg-sand-100 text-cyprus-900"
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="font-bold truncate">{rep.learner.full_name}</div>
                      <div className={`text-[10px] font-mono ${active ? "text-sand-300" : "text-sand-600"}`}>
                        {rep.learner.lrn} • {rep.learner.gender === "Male" ? "M" : "F"}
                      </div>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-md font-mono font-bold text-[11px] shrink-0 ${
                        active
                          ? "bg-white/15 text-white"
                          : rep.generalAverage !== null && rep.generalAverage >= 75
                            ? "bg-emerald-50 text-emerald-800"
                            : "bg-sand-100 text-sand-700"
                      }`}
                    >
                      {rep.generalAverage ?? "—"}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Adviser Comments & Transfer Editor */}
            {selectedReport && (
              <form
                onSubmit={handleSaveRemarks}
                className="bg-white rounded-2xl border border-sand-200 p-4 shadow-xs space-y-3"
              >
                <div className="text-xs font-bold text-cyprus-900 border-b border-sand-200 pb-1.5">
                  Adviser SF9 Comments &amp; Transfer
                </div>
                <div>
                  <label htmlFor="sf9-t1-rem" className="block text-[11px] font-semibold text-cyprus-900 mb-0.5">
                    Term 1 Comment
                  </label>
                  <input
                    id="sf9-t1-rem"
                    type="text"
                    value={t1Remark}
                    onChange={(e) => setT1Remark(e.target.value)}
                    placeholder="Shows commendable progress..."
                    className="w-full px-2.5 py-1.5 rounded-lg border border-sand-300 text-xs"
                  />
                </div>
                <div>
                  <label htmlFor="sf9-t2-rem" className="block text-[11px] font-semibold text-cyprus-900 mb-0.5">
                    Term 2 Comment
                  </label>
                  <input
                    id="sf9-t2-rem"
                    type="text"
                    value={t2Remark}
                    onChange={(e) => setT2Remark(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-sand-300 text-xs"
                  />
                </div>
                <div>
                  <label htmlFor="sf9-t3-rem" className="block text-[11px] font-semibold text-cyprus-900 mb-0.5">
                    Term 3 Comment
                  </label>
                  <input
                    id="sf9-t3-rem"
                    type="text"
                    value={t3Remark}
                    onChange={(e) => setT3Remark(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-sand-300 text-xs"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label htmlFor="sf9-admitted" className="block text-[11px] font-semibold text-cyprus-900 mb-0.5">
                      Admitted to Grade
                    </label>
                    <input
                      id="sf9-admitted"
                      type="text"
                      value={admittedTo}
                      onChange={(e) => setAdmittedTo(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-sand-300 text-xs"
                    />
                  </div>
                  <div>
                    <label htmlFor="sf9-eligible" className="block text-[11px] font-semibold text-cyprus-900 mb-0.5">
                      Eligible for Grade
                    </label>
                    <input
                      id="sf9-eligible"
                      type="text"
                      value={eligibleFor}
                      onChange={(e) => setEligibleFor(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-sand-300 text-xs"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={isSavingRemarks}
                  className="w-full py-2 rounded-xl bg-[#0F3D2E] hover:bg-[#0A2E22] text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isSavingRemarks ? "Saving..." : "Save Comments"}</span>
                </button>
              </form>
            )}
          </div>

          {/* Printable SF9 Card Area */}
          <div className="lg:col-span-9 print:col-span-12 space-y-6">
            {isBatchPrinting ? (
              consolidated.reports.map((rep, idx) => (
                <SF9CardSheet
                  key={rep.learner.id}
                  data={consolidated}
                  report={rep}
                  schoolSettings={schoolSettings}
                  isBatchLast={idx === consolidated.reports.length - 1}
                />
              ))
            ) : (
              selectedReport && (
                <SF9CardSheet
                  data={consolidated}
                  report={selectedReport}
                  schoolSettings={schoolSettings}
                  isBatchLast
                />
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
};
