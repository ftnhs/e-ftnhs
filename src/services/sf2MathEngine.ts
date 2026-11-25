import type {
  DailyAttendanceSession,
  Section,
  SF2MonthlySummary,
  StudentAttendanceSummary,
} from "../types";

/**
 * Computes official DepEd School Form 2 (SF2) statistics for a section over a month
 */
export function computeSF2MonthlySummary(
  section: Section,
  monthYearStr: string,
  sessions: DailyAttendanceSession[]
): SF2MonthlySummary {
  // Sort sessions chronologically
  const sortedSessions = [...sessions].sort((a, b) =>
    a.attendance_date.localeCompare(b.attendance_date)
  );

  const totalSchoolDays = sortedSessions.length;

  // Track each unique student across all sessions in this month
  const studentMap = new Map<
    string,
    {
      student_name: string;
      student_lrn: string;
      gender: "Male" | "Female";
      statuses: Array<{ date: string; status: "Present" | "Absent" | "Tardy"; remarks?: string }>;
    }
  >();

  sortedSessions.forEach((session) => {
    session.students?.forEach((record) => {
      if (!studentMap.has(record.student_lrn)) {
        studentMap.set(record.student_lrn, {
          student_name: record.student_name,
          student_lrn: record.student_lrn,
          gender: record.gender,
          statuses: [],
        });
      }
      studentMap.get(record.student_lrn)!.statuses.push({
        date: session.attendance_date,
        status: record.status,
        remarks: record.remarks || undefined,
      });
    });
  });

  const studentSummaries: StudentAttendanceSummary[] = [];
  let registeredMale = 0;
  let registeredFemale = 0;

  let totalPresentMale = 0;
  let totalPresentFemale = 0;
  let totalAbsentMale = 0;
  let totalAbsentFemale = 0;
  let totalTardyMale = 0;
  let totalTardyFemale = 0;
  let sardoCount = 0;

  studentMap.forEach((student) => {
    if (student.gender === "Male") registeredMale++;
    else registeredFemale++;

    let daysPresent = 0;
    let daysAbsent = 0;
    let daysTardy = 0;
    let maxConsecutiveAbsences = 0;
    let currentConsecutiveAbsences = 0;
    let lastRemarks = "";

    // Chronological analysis
    student.statuses.forEach((st) => {
      if (st.status === "Present") {
        daysPresent++;
        currentConsecutiveAbsences = 0;
      } else if (st.status === "Tardy") {
        daysPresent++; // Under DepEd rules, tardy students are considered present in ADA count
        daysTardy++;
        currentConsecutiveAbsences = 0;
      } else if (st.status === "Absent") {
        daysAbsent++;
        currentConsecutiveAbsences++;
        if (currentConsecutiveAbsences > maxConsecutiveAbsences) {
          maxConsecutiveAbsences = currentConsecutiveAbsences;
        }
      }
      if (st.remarks) {
        lastRemarks = st.remarks;
      }
    });

    const isSardo = maxConsecutiveAbsences >= 5;
    if (isSardo) sardoCount++;

    if (student.gender === "Male") {
      totalPresentMale += daysPresent;
      totalAbsentMale += daysAbsent;
      totalTardyMale += daysTardy;
    } else {
      totalPresentFemale += daysPresent;
      totalAbsentFemale += daysAbsent;
      totalTardyFemale += daysTardy;
    }

    studentSummaries.push({
      student_name: student.student_name,
      student_lrn: student.student_lrn,
      gender: student.gender,
      totalDaysPresent: daysPresent,
      totalDaysAbsent: daysAbsent,
      totalDaysTardy: daysTardy,
      consecutiveAbsences: maxConsecutiveAbsences,
      isSardo,
      remarks: lastRemarks || (isSardo ? "SARDO: 5+ consecutive absences" : undefined),
    });
  });

  // Sort: Males first alphabetical, then Females alphabetical (Standard DepEd format)
  studentSummaries.sort((a, b) => {
    if (a.gender !== b.gender) {
      return a.gender === "Male" ? -1 : 1;
    }
    return a.student_name.localeCompare(b.student_name);
  });

  const totalRegistered = registeredMale + registeredFemale;
  const totalPresentAll = totalPresentMale + totalPresentFemale;
  const totalAbsentAll = totalAbsentMale + totalAbsentFemale;
  const totalTardyAll = totalTardyMale + totalTardyFemale;

  // Average Daily Attendance (ADA) = Total Present / Total School Days
  const adaMale = totalSchoolDays > 0 ? Number((totalPresentMale / totalSchoolDays).toFixed(2)) : 0;
  const adaFemale = totalSchoolDays > 0 ? Number((totalPresentFemale / totalSchoolDays).toFixed(2)) : 0;
  const adaTotal = totalSchoolDays > 0 ? Number((totalPresentAll / totalSchoolDays).toFixed(2)) : 0;

  // Percentage of Attendance (PA) = (ADA / Registered) * 100
  const paMale = registeredMale > 0 ? Number(((adaMale / registeredMale) * 100).toFixed(2)) : 0;
  const paFemale = registeredFemale > 0 ? Number(((adaFemale / registeredFemale) * 100).toFixed(2)) : 0;
  const paTotal = totalRegistered > 0 ? Number(((adaTotal / totalRegistered) * 100).toFixed(2)) : 0;

  return {
    monthYear: monthYearStr,
    section,
    totalSchoolDays,
    registeredMale,
    registeredFemale,
    totalRegistered,
    totalPresentMale,
    totalPresentFemale,
    totalPresentAll,
    totalAbsentMale,
    totalAbsentFemale,
    totalAbsentAll,
    totalTardyMale,
    totalTardyFemale,
    totalTardyAll,
    adaMale,
    adaFemale,
    adaTotal,
    paMale,
    paFemale,
    paTotal,
    sardoCount,
    studentSummaries,
  };
}
