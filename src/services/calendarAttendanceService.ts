import { supabase } from "../lib/supabase";
import type {
  SchoolCalendarEvent,
  DailyAttendanceSession,
  StudentDailyAttendance,
  Section,
  SF2MonthlySummary,
} from "../types";
import { computeSF2MonthlySummary } from "./sf2MathEngine";

// ============================================================================
// 1. SCHOOL CALENDAR EVENTS SERVICE
// ============================================================================

export async function fetchCalendarEvents(termId?: string): Promise<SchoolCalendarEvent[]> {
  try {
    let query = supabase
      .from("school_calendar_events")
      .select(`
        *,
        creator:profiles!school_calendar_events_created_by_fkey(*)
      `)
      .order("start_date", { ascending: true });

    if (termId) {
      query = query.eq("term_id", termId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data || []) as SchoolCalendarEvent[];
  } catch (err) {
    console.error("Error fetching calendar events:", err);
    return [];
  }
}

export async function createCalendarEvent(
  event: Omit<SchoolCalendarEvent, "id" | "created_at" | "updated_at" | "creator">
): Promise<SchoolCalendarEvent | null> {
  try {
    const { data, error } = await supabase
      .from("school_calendar_events")
      .insert({
        term_id: event.term_id,
        title: event.title,
        description: event.description,
        start_date: event.start_date,
        end_date: event.end_date,
        event_type: event.event_type,
        target_audience: event.target_audience,
        created_by: event.created_by,
      })
      .select(`
        *,
        creator:profiles!school_calendar_events_created_by_fkey(*)
      `)
      .single();

    if (error) throw error;
    return data as SchoolCalendarEvent;
  } catch (err) {
    console.error("Error creating calendar event:", err);
    throw err;
  }
}

export async function deleteCalendarEvent(eventId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("school_calendar_events")
      .delete()
      .eq("id", eventId);

    if (error) throw error;
    return true;
  } catch (err) {
    console.error("Error deleting calendar event:", err);
    return false;
  }
}

// ============================================================================
// 2. DAILY ATTENDANCE & SF2 SERVICE
// ============================================================================

export async function fetchAttendanceSessions(
  sectionId?: string,
  startDate?: string,
  endDate?: string
): Promise<DailyAttendanceSession[]> {
  try {
    let query = supabase
      .from("daily_attendance_sessions")
      .select(`
        *,
        section:sections(*),
        recorder:profiles!daily_attendance_sessions_recorded_by_fkey(*),
        students:student_daily_attendance(*)
      `)
      .order("attendance_date", { ascending: false });

    if (sectionId) {
      query = query.eq("section_id", sectionId);
    }
    if (startDate) {
      query = query.gte("attendance_date", startDate);
    }
    if (endDate) {
      query = query.lte("attendance_date", endDate);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data || []) as DailyAttendanceSession[];
  } catch (err) {
    console.error("Error fetching attendance sessions:", err);
    return [];
  }
}

/**
 * Retrieves the student roster for a section (from official learners masterlist first,
 * then past attendance or class records)
 */
export async function fetchRosterForSection(
  sectionId: string
): Promise<Array<{ student_name: string; student_lrn: string; gender: "Male" | "Female" }>> {
  try {
    // 0. Primary source: official enrolled learners masterlist from Class Management
    const { data: enrolledLearners } = await supabase
      .from("learners")
      .select("full_name, lrn, gender")
      .eq("section_id", sectionId)
      .in("enrollment_status", ["Enrolled", "Transferred In"])
      .order("gender", { ascending: false })
      .order("full_name", { ascending: true });

    if (enrolledLearners && enrolledLearners.length > 0) {
      return enrolledLearners.map((l) => ({
        student_name: l.full_name,
        student_lrn: l.lrn,
        gender: l.gender as "Male" | "Female",
      }));
    }

    // 1. First attempt: check latest attendance session for this section
    const { data: latestSession } = await supabase
      .from("daily_attendance_sessions")
      .select("students:student_daily_attendance(*)")
      .eq("section_id", sectionId)
      .order("attendance_date", { ascending: false })
      .limit(1)
      .single();

    if (latestSession && (latestSession as unknown as { students?: StudentDailyAttendance[] }).students?.length) {
      const records = (latestSession as unknown as { students: StudentDailyAttendance[] }).students;
      return records.map((r) => ({
        student_name: r.student_name,
        student_lrn: r.student_lrn,
        gender: r.gender,
      }));
    }

    // 2. Second attempt: check student_grades from class_records for this section
    const { data: classRec } = await supabase
      .from("class_records")
      .select("grades:student_grades(*)")
      .eq("section_id", sectionId)
      .limit(1)
      .single();

    if (classRec && (classRec as unknown as { grades?: Array<{ student_name: string; student_lrn: string; gender: string }> }).grades?.length) {
      const grades = (classRec as unknown as { grades: Array<{ student_name: string; student_lrn: string; gender: string }> }).grades;
      return grades.map((g) => ({
        student_name: g.student_name,
        student_lrn: g.student_lrn,
        gender: g.gender as "Male" | "Female",
      }));
    }

    // 3. Fallback default learners roster if new section without historical logs
    return [
      { student_name: "Abarquez, Juan Carlos", student_lrn: "109283746501", gender: "Male" },
      { student_name: "Bautista, Mark Anthony", student_lrn: "109283746502", gender: "Male" },
      { student_name: "Cañete, Bryan James", student_lrn: "109283746503", gender: "Male" },
      { student_name: "Del Rosario, Maria Elena", student_lrn: "109283746504", gender: "Female" },
      { student_name: "Espina, Chloe Mae", student_lrn: "109283746505", gender: "Female" },
      { student_name: "Flores, Angelica Nicole", student_lrn: "109283746506", gender: "Female" },
    ];
  } catch (err) {
    console.error("Error fetching roster for section:", err);
    return [];
  }
}

/**
 * Saves a daily section attendance session with student roll-call records
 */
export async function saveDailyAttendanceSession(payload: {
  sectionId: string;
  attendanceDate: string;
  recordedBy: string;
  remarks?: string;
  students: StudentDailyAttendance[];
}): Promise<DailyAttendanceSession | null> {
  try {
    let totalPresent = 0;
    let totalAbsent = 0;
    let totalTardy = 0;

    payload.students.forEach((s) => {
      if (s.status === "Present") totalPresent++;
      else if (s.status === "Absent") totalAbsent++;
      else if (s.status === "Tardy") {
        totalPresent++; // In DepEd SF2, tardy is counted in present total
        totalTardy++;
      }
    });

    // 1. Upsert attendance session
    const { data: sessionData, error: sessionError } = await supabase
      .from("daily_attendance_sessions")
      .upsert(
        {
          section_id: payload.sectionId,
          attendance_date: payload.attendanceDate,
          recorded_by: payload.recordedBy,
          total_present: totalPresent,
          total_absent: totalAbsent,
          total_tardy: totalTardy,
          status: "Submitted",
          remarks: payload.remarks || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "section_id,attendance_date" }
      )
      .select()
      .single();

    if (sessionError) throw sessionError;

    // 2. Replace student attendance rows
    await supabase
      .from("student_daily_attendance")
      .delete()
      .eq("session_id", sessionData.id);

    const studentRows = payload.students.map((st) => ({
      session_id: sessionData.id,
      student_name: st.student_name,
      student_lrn: st.student_lrn,
      gender: st.gender,
      status: st.status,
      remarks: st.remarks || null,
    }));

    const { error: studentError } = await supabase
      .from("student_daily_attendance")
      .insert(studentRows);

    if (studentError) throw studentError;

    // 3. Return full updated session
    const [fullSession] = await fetchAttendanceSessions(
      payload.sectionId,
      payload.attendanceDate,
      payload.attendanceDate
    );
    return fullSession || null;
  } catch (err) {
    console.error("Error saving daily attendance session:", err);
    throw err;
  }
}

/**
 * Computes official monthly SF2 summary for a given section and month (YYYY-MM)
 */
export async function getMonthlySF2Summary(
  section: Section,
  yearMonthStr: string // e.g. "2026-11"
): Promise<SF2MonthlySummary> {
  const [year, month] = yearMonthStr.split("-");
  const startDate = `${yearMonthStr}-01`;
  const lastDay = new Date(Number(year), Number(month), 0).getDate();
  const endDate = `${yearMonthStr}-${String(lastDay).padStart(2, "0")}`;

  const sessions = await fetchAttendanceSessions(section.id, startDate, endDate);

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  const monthName = monthNames[Number(month) - 1] || "Month";
  const displayTitle = `${monthName} ${year}`;

  return computeSF2MonthlySummary(section, displayTitle, sessions);
}
