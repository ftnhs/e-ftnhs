import React from "react";
import type { Profile, ScheduleEntry, SchoolSettings, TeacherSubjectLoad } from "../../types";

export type CoordinatorLevel = "JHS" | "SHS" | "BOTH";

/**
 * Determines whether a teacher's program falls under JHS or SHS coordination
 * based on their department or majority of assigned teaching minutes/entries.
 */
export function resolveCoordinatorLevelForTeacher(
  teacher: Profile | null,
  loads: TeacherSubjectLoad[],
  entries: ScheduleEntry[]
): "JHS" | "SHS" {
  const dept = (teacher?.department || "").toLowerCase();
  if (dept.includes("senior high") || dept.includes("shs")) {
    return "SHS";
  }
  if (dept.includes("junior high") || dept.includes("jhs")) {
    return "JHS";
  }

  let shsMinutes = 0;
  let jhsMinutes = 0;

  for (const load of loads) {
    const grade = load.section?.grade_level ?? load.subject?.grade_level ?? 0;
    const mins = load.teaching_minutes_weekly || 0;
    if (grade >= 11) shsMinutes += mins;
    else if (grade > 0) jhsMinutes += mins;
  }

  if (shsMinutes === 0 && jhsMinutes === 0) {
    for (const entry of entries) {
      const grade = entry.section?.grade_level ?? entry.subject?.grade_level ?? 0;
      if (grade >= 11) shsMinutes += 1;
      else if (grade > 0) jhsMinutes += 1;
    }
  }

  return shsMinutes > jhsMinutes ? "SHS" : "JHS";
}

interface ScheduleSignatoriesProps {
  schoolSettings: SchoolSettings | null;
  level: CoordinatorLevel;
  supervisorLabel?: "Noted by:" | "Reviewed by:";
}

export const ScheduleSignatories: React.FC<ScheduleSignatoriesProps> = ({
  schoolSettings,
  level,
  supervisorLabel = "Reviewed by:",
}) => {
  const jhsName = schoolSettings?.jhs_coordinator_name || "MAURINE D. CUARIO";
  const jhsDesig =
    schoolSettings?.jhs_coordinator_designation || "JHS Coordinator";

  const shsName = schoolSettings?.shs_coordinator_name || "DELLIE T. VIGONTE";
  const shsDesig =
    schoolSettings?.shs_coordinator_designation || "SHS Coordinator";

  const schoolHeadName = schoolSettings?.principal_name || "Pee Jay Baslan, EdD";
  const schoolHeadDesig = schoolSettings?.principal_designation || "School-in-Charge";

  const psdsName = schoolSettings?.psds_name || "MA. TERESITA I. ALAMPAYAN, PhD";
  const psdsDesig =
    schoolSettings?.psds_designation || "Public Schools District Supervisor";

  const sdsName = schoolSettings?.sds_name || "FAY C. LUAREZ EdD, PhD TM, CESO V";
  const sdsDesig =
    schoolSettings?.sds_designation || "Schools Division Superintendent";

  return (
    <div className="mt-4 pt-2 space-y-5 text-[10.5px] text-slate-900">
      {/* Row 1: Prepared by (JHS / SHS Coordinator) & Noted/Reviewed by (School Head) */}
      <div className="grid grid-cols-2 gap-10">
        <div>
          <p className="text-[10px] text-slate-800 mb-5">Prepared by:</p>
          {level === "BOTH" ? (
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <div className="font-bold text-slate-900 uppercase">
                  {jhsName}
                </div>
                <p className="text-[9.5px] text-slate-700">{jhsDesig}</p>
              </div>
              <div>
                <div className="font-bold text-slate-900 uppercase">
                  {shsName}
                </div>
                <p className="text-[9.5px] text-slate-700">{shsDesig}</p>
              </div>
            </div>
          ) : (
            <div className="text-center pr-6">
              <div className="font-bold text-slate-900 uppercase">
                {level === "SHS" ? shsName : jhsName}
              </div>
              <p className="text-[10px] text-slate-700">
                {level === "SHS" ? shsDesig : jhsDesig}
              </p>
            </div>
          )}
        </div>

        <div>
          <p className="text-[10px] text-slate-800 mb-5">{supervisorLabel}</p>
          <div className="text-center pr-6">
            <div className="font-bold text-slate-900 uppercase">
              {schoolHeadName}
            </div>
            <p className="text-[10px] text-slate-700">{schoolHeadDesig}</p>
          </div>
        </div>
      </div>

      {/* Row 2: Recommending Approval (PSDS) & Approved (SDS) */}
      <div className="grid grid-cols-2 gap-10">
        <div>
          <p className="text-[10px] text-slate-800 mb-5">Recommending Approval:</p>
          <div className="text-center pr-6">
            <div className="font-bold text-slate-900 uppercase">
              {psdsName}
            </div>
            <p className="text-[10px] text-slate-700">{psdsDesig}</p>
          </div>
        </div>

        <div>
          <p className="text-[10px] text-slate-800 mb-5">Approved:</p>
          <div className="text-center pr-6">
            <div className="font-bold text-slate-900 uppercase">
              {sdsName}
            </div>
            <p className="text-[10px] text-slate-700">{sdsDesig}</p>
          </div>
        </div>
      </div>
    </div>
  );
};
