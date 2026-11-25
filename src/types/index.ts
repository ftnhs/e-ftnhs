export type UserRole = "Super Admin" | "School Head" | "Teacher" | "Non-Teaching";
export type UserStatus = "Pending" | "Approved" | "Rejected";

export interface Profile {
  id: string;
  email: string;
  username?: string | null;
  full_name: string;
  first_name?: string | null;
  middle_name?: string | null;
  last_name?: string | null;
  role: UserRole;
  status: UserStatus;
  department: string | null;
  designation: string | null;
  avatar_url: string | null;
  phone?: string | null;
  personal_email?: string | null;
  gender?: string | null;
  birthdate?: string | null;
  civil_status?: string | null;
  home_address?: string | null;
  emergency_contact_name?: string | null;
  emergency_contact_number?: string | null;
  emergency_contact_relationship?: string | null;
  bio?: string | null;
  // Official DepEd 201 File Information
  employee_id?: string | null;
  plantilla_number?: string | null;
  tin_number?: string | null;
  gsis_bp_number?: string | null;
  philhealth_number?: string | null;
  pagibig_mid_number?: string | null;
  highest_educational_attainment?: string | null;
  degree_course?: string | null;
  major_specialization?: string | null;
  civil_service_eligibility?: string | null;
  date_of_original_appointment?: string | null;
  years_in_deped?: number | null;
  station_school_id?: string | null;
  station_school_name?: string | null;
  division?: string | null;
  region?: string | null;
  is_teaching?: boolean;
  created_at: string;
  updated_at: string;
}

export interface AcademicTerm {
  id: string;
  school_year: string;
  term_number: 1 | 2 | 3;
  is_active: boolean;
  start_date: string | null;
  end_date: string | null;
  created_at?: string;
}

export interface SchoolSettings {
  id: string;
  school_name: string;
  school_id: string;
  region: string;
  division: string;
  district: string;
  address: string;
  principal_name: string;
  principal_designation: string;
  psds_name?: string;
  psds_designation?: string;
  sds_name?: string;
  sds_designation?: string;
  jhs_coordinator_name?: string;
  jhs_coordinator_designation?: string;
  shs_coordinator_name?: string;
  shs_coordinator_designation?: string;
  updated_at?: string;
}

export interface Department {
  id: string;
  dept_code: string;
  dept_name: string;
  dept_head_id?: string | null;
  description?: string | null;
  is_active: boolean;
  sort_order: number;
  created_at?: string;
  dept_head?: {
    id: string;
    full_name: string;
    email: string;
  } | null;
}

export type ModuleId =
  | "M1" // Admin & Control Panel (RBAC & School Profile)
  | "M2" // Lesson Log (DLL/DLP) Hub (DO 42 s. 2016)
  | "M3" // Faculty Loading & Timetable (SF7)
  | "M4" // Online Exam & Item Analysis (MPS Engine)
  | "M5" // School Memos Broadcast Center
  | "M6" // Coordinatorships & Ancillary Document Vault
  | "M7" // Automated E-Class Record (DO 8 s. 2015)
  | "M8" // RPMS Portfolio MOV Vault & COT Scheduler
  | "M9" // Leave Application & Class Relief Matrix
  | "M10"; // School Calendar & SF2 Daily Attendance

export type LessonPlanStatus = "Submitted" | "Under Review" | "Approved" | "Needs Revision";

export interface LessonPlanAttachment {
  file_url: string;
  file_name: string;
  file_size: number | null;
  mime_type: string | null;
}

export interface LessonPlan {
  id: string;
  teacher_id: string;
  term_id?: string | null;
  subject_name: string;
  grade_level: number;
  section_name: string;
  department: string;
  week_number: number;
  title: string;
  learning_competencies?: string | null;
  file_url?: string | null;
  file_name?: string | null;
  file_size?: number | null;
  mime_type?: string | null;
  attachments?: LessonPlanAttachment[] | null;
  status: LessonPlanStatus;
  submission_date: string;
  is_late: boolean;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  reviewer_feedback?: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  teacher?: {
    id: string;
    full_name: string;
    email: string;
    department?: string | null;
    avatar_url?: string | null;
  };
  reviewer?: {
    id: string;
    full_name: string;
    role: string;
  };
}

export interface LessonPlanAnalyticsData {
  totalSubmissions: number;
  onTimeRate: number;
  pendingReviewCount: number;
  approvedCount: number;
  needsRevisionCount: number;
  weeklyTrend: Array<{
    week: string;
    submitted: number;
    approved: number;
    late: number;
  }>;
  departmentCompliance: Array<{
    department: string;
    submissionRate: number;
    submittedCount: number;
    totalExpected: number;
  }>;
  statusDistribution: Array<{
    name: string;
    value: number;
    color: string;
  }>;
}

export interface NavigationItem {
  id: ModuleId;
  name: string;
  shortName: string;
  description: string;
  iconName: string;
  category: "Core" | "Instructional" | "Administrative" | "Compliance";
  requiresApproval: boolean;
  rolesAllowed?: UserRole[];
}

// ============================================================================
// TIMETABLE & FACULTY LOADING TYPES (PHASE 3 / MODULE 3)
// ============================================================================

export type DayOfWeek = "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday";

export type SubjectCategory = "Core" | "Applied" | "Specialized" | "TVL";

export type SubjectCurriculumVersion = "JHS MATATAG" | "SSHS" | "Old SHS";

export interface Subject {
  id: string;
  subject_code: string;
  subject_name: string;
  grade_level: number;
  track_strand?: string | null;
  category: SubjectCategory;
  curriculum_version?: SubjectCurriculumVersion;
  minutes_per_week: number;
  requires_lab: boolean;
  created_at?: string;
}

export interface Room {
  id: string;
  room_number: string;
  room_name: string;
  room_type: "Standard Classroom" | "Science Laboratory" | "Computer Laboratory" | "TVL Workshop" | "Covered Court";
  capacity: number;
  is_specialized: boolean;
  created_at?: string;
}

export interface Section {
  id: string;
  term_id: string;
  grade_level: number;
  section_name: string;
  track_strand?: string | null;
  adviser_id?: string | null;
  room_id?: string | null;
  created_at?: string;
  adviser?: {
    id: string;
    full_name: string;
    email: string;
  };
  room?: Room;
}

export interface TimeSlot {
  id: string;
  slot_number: number;
  slot_label: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  slot_type: "Academic" | "Flag Ceremony" | "Recess" | "Lunch" | "Homeroom";
  sort_order: number;
}

export type TimeSlotScopeType = "JHS" | "SHS" | "SECTION";

export interface TimeSlotOverride {
  id: string;
  time_slot_id: string;
  scope_type: TimeSlotScopeType;
  section_id: string | null;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  slot_label?: string | null;
  slot_type?: TimeSlot["slot_type"] | null;
  created_at?: string;
  updated_at?: string;
}

export interface ResolvedTimeSlot extends TimeSlot {
  override_scope?: TimeSlotScopeType | null;
  override_id?: string | null;
  is_overridden?: boolean;
}

export interface TeacherSubjectLoad {
  id: string;
  term_id: string;
  teacher_id: string;
  subject_id: string;
  section_id: string;
  teaching_minutes_weekly: number;
  ancillary_minutes_weekly: number;
  ancillary_description?: string | null;
  status: "Draft" | "Assigned" | "Locked";
  created_at?: string;
  plotted_minutes_weekly?: number;
  plotted_slot_count?: number;
  teacher?: {
    id: string;
    full_name: string;
    email: string;
    department?: string | null;
    designation?: string | null;
  };
  subject?: Subject;
  section?: Section;
}

export interface ScheduleEntry {
  id: string;
  term_id: string;
  load_id?: string | null;
  teacher_id?: string | null;
  guest_instructor_name?: string | null;
  section_id: string;
  subject_id: string;
  time_slot_id: string;
  room_id?: string | null;
  day_of_week: DayOfWeek;
  created_at?: string;
  teacher?: {
    id: string;
    full_name: string;
    email: string;
  } | null;
  subject?: Subject;
  section?: Section;
  time_slot?: TimeSlot;
  room?: Room;
}

export interface ScheduleConflict {
  type: "TEACHER_COLLISION" | "SECTION_COLLISION" | "ROOM_COLLISION" | "MAGNA_CARTA_OVERLOAD";
  message: string;
  details?: string;
  conflictingEntry?: ScheduleEntry;
}

export interface TeacherLoadingSummary {
  teacher_id: string;
  full_name: string;
  email: string;
  department: string;
  designation: string;
  total_teaching_minutes: number;
  total_ancillary_minutes: number;
  total_combined_minutes: number;
  is_magna_carta_compliant: boolean; // <= 360 mins direct teaching / day (1800 mins/week)
  loads: TeacherSubjectLoad[];
}

export type AssessmentType = "Diagnostic" | "Summative" | "Quarterly Exam" | "Formative";
export type GradingPeriod = "T1" | "T2" | "T3";
export type AssessmentStatus = "Draft" | "Analyzed" | "Locked";
export type DifficultyInterpretation = "Difficult" | "Average" | "Easy";
export type ActionRecommendation = "Retain" | "Revise" | "Reject";

export type DepEdMasteryLevel =
  | "Mastered"
  | "Closely Approximating Mastery"
  | "Moving Towards Mastery"
  | "Average Mastery"
  | "Low Mastery"
  | "Very Low Mastery"
  | "Absolutely No Mastery"
  | "Pending Analysis";

export interface StudentScoreRecord {
  student_name: string;
  student_lrn?: string;
  raw_score: number;
  percentage: number;
  item_scores: number[]; // 1 for correct, 0 for incorrect
}

export interface AssessmentItemAnalysis {
  id: string;
  assessment_id: string;
  item_number: number;
  learning_competency: string;
  correct_responses_count: number;
  total_examinees: number;
  difficulty_index: number;
  difficulty_interpretation: DifficultyInterpretation;
  action_recommendation: ActionRecommendation;
  is_least_learned: boolean;
  created_at?: string;
}

export interface Assessment {
  id: string;
  term_id: string;
  teacher_id: string;
  subject_id?: string | null;
  section_id?: string | null;
  title: string;
  assessment_type: AssessmentType;
  grading_period: GradingPeriod;
  total_items: number;
  passing_score: number;
  test_date: string;
  examinee_count: number;
  mean_score: number;
  standard_deviation: number;
  mean_percentage_score: number;
  mastery_level: DepEdMasteryLevel;
  status: AssessmentStatus;
  raw_scores: StudentScoreRecord[];
  created_at?: string;
  updated_at?: string;
  teacher?: {
    id: string;
    full_name: string;
    email: string;
    department?: string | null;
  };
  subject?: Subject;
  section?: Section;
  items?: AssessmentItemAnalysis[];
}

export interface StatisticalSummary {
  examinee_count: number;
  total_items: number;
  highest_score: number;
  lowest_score: number;
  mean_score: number;
  standard_deviation: number;
  mean_percentage_score: number;
  mastery_level: DepEdMasteryLevel;
  passing_rate: number;
}

export type MemoPriority = "Urgent" | "Standard" | "FYI";
export type MemoStatus = "Draft" | "Published" | "Archived";

export interface MemoAcknowledgment {
  id: string;
  memo_id: string;
  teacher_id: string;
  acknowledged_at: string;
  teacher?: {
    id: string;
    full_name: string;
    email: string;
    department?: string | null;
  };
}

export interface SchoolMemo {
  id: string;
  author_id: string;
  memo_number: string;
  title: string;
  priority: MemoPriority;
  target_audience: string;
  content: string;
  attachment_url?: string | null;
  attachment_name?: string | null;
  attachment_size?: number;
  published_at: string;
  status: MemoStatus;
  created_at?: string;
  updated_at?: string;
  author?: {
    id: string;
    full_name: string;
    email: string;
  };
  acknowledgments?: MemoAcknowledgment[];
  is_acknowledged?: boolean;
  acknowledgment_count?: number;
}

export interface CoordinatorshipUnit {
  id: string;
  unit_name: string;
  unit_code: string;
  coordinator_id?: string | null;
  description?: string | null;
  icon_name?: string | null;
  created_at?: string;
  coordinator?: {
    id: string;
    full_name: string;
    email: string;
    department?: string | null;
  };
  file_count?: number;
}

export type FileCategory =
  | "Action Plan"
  | "Accomplishment Report"
  | "Attendance / Minutes"
  | "Photo Documentation"
  | "Financial / Inventory"
  | "Other";

export type FileVisibility = "Public" | "Internal" | "Confidential";

export interface CoordinatorshipFile {
  id: string;
  unit_id: string;
  uploader_id: string;
  file_name: string;
  file_url: string;
  file_type: string;
  file_size: number;
  title: string;
  description?: string | null;
  category: FileCategory;
  visibility: FileVisibility;
  created_at?: string;
  uploader?: {
    id: string;
    full_name: string;
    email: string;
  };
  unit?: CoordinatorshipUnit;
}

export type CurriculumType =
  | "MATATAG JHS"
  | "MATATAG JHS Skill-Based"
  // Legacy Old SHS (kept for backward compatibility)
  | "SHS Core"
  | "SHS Academic"
  | "SHS TVL"
  // Grade 11 — Strengthened SHS (SSHS) Curriculum
  | "SSHS Core"
  | "SSHS Academic Elective"
  | "SSHS Field Exposure"
  | "SSHS Arts Sports Health"
  | "SSHS Research Design"
  | "SSHS TechPro Elective"
  | "SSHS Work Immersion"
  // Grade 12 — Old K-12 SHS Curriculum (2016)
  | "Old SHS Core"
  | "Old SHS Applied"
  | "Old SHS Specialized"
  | "Old SHS TVL"
  | "Old SHS Immersion";

export interface StudentGrade {
  id: string;
  class_record_id: string;
  learner_id?: string | null;
  student_name: string;
  student_lrn?: string | null;
  gender: "Male" | "Female";
  ww_scores: number[];
  pt_scores: number[];
  qa_score: number;
  ww_total: number;
  ww_percentage_score: number;
  ww_weighted_score: number;
  pt_total: number;
  pt_percentage_score: number;
  pt_weighted_score: number;
  qa_percentage_score: number;
  qa_weighted_score: number;
  initial_grade: number;
  transmuted_grade: number;
  remarks: "Passed" | "Failed" | "Did Not Meet Expectations";
  created_at?: string;
  updated_at?: string;
}

export interface ClassRecord {
  id: string;
  term_id: string;
  teacher_id: string;
  subject_id: string;
  section_id: string;
  curriculum_type: CurriculumType;
  subject_category: string;
  term_number: 1 | 2 | 3;
  ww_weight: number;
  pt_weight: number;
  qa_weight: number;
  ww_max_scores: number[];
  pt_max_scores: number[];
  qa_max_score: number;
  status: "Active" | "Locked" | "Submitted";
  created_at?: string;
  updated_at?: string;
  teacher?: {
    id: string;
    full_name: string;
    email: string;
    department?: string | null;
  };
  subject?: Subject;
  section?: Section;
  grades?: StudentGrade[];
}

// ============================================================================
// CLASS MANAGEMENT, LEARNERS MASTERLIST & SF9 CONSOLIDATION TYPES
// ============================================================================

export type EnrollmentStatus = "Enrolled" | "Transferred In" | "Transferred Out" | "Dropped";

export interface Learner {
  id: string;
  term_id: string;
  section_id: string;
  lrn: string;
  full_name: string;
  gender: "Male" | "Female";
  birthdate?: string | null;
  age_june?: number | null;
  mother_tongue?: string | null;
  ip_ethnic_group?: string | null;
  religion?: string | null;
  address_street?: string | null;
  address_barangay?: string | null;
  address_municipality?: string | null;
  address_province?: string | null;
  father_name?: string | null;
  mother_maiden_name?: string | null;
  guardian_name?: string | null;
  guardian_relationship?: string | null;
  parent_guardian_contact?: string | null;
  learning_modality?: string | null;
  sf1_remarks?: string | null;
  enrollment_status: EnrollmentStatus;
  created_at?: string;
  updated_at?: string;
}

export interface SectionSubject {
  id: string;
  term_id: string;
  section_id: string;
  subject_id: string;
  teacher_id?: string | null;
  curriculum_type: CurriculumType;
  units: number;
  sort_order: number;
  created_at?: string;
  subject?: Subject;
  teacher?: {
    id: string;
    full_name: string;
    email: string;
    department?: string | null;
    designation?: string | null;
  } | null;
}

export interface SF9MonthlyAttendanceCell {
  classDays: number;
  present: number;
  absent: number;
}

export interface SF9AdviserRecord {
  id: string;
  section_id: string;
  learner_id: string;
  term1_remarks?: string | null;
  term2_remarks?: string | null;
  term3_remarks?: string | null;
  admitted_to_grade?: string | null;
  eligible_for_grade?: string | null;
  transfer_school?: string | null;
  transfer_date?: string | null;
  manual_attendance?: Record<string, SF9MonthlyAttendanceCell>;
  updated_by?: string | null;
  updated_at?: string;
}

export interface SF9SubjectGradeRow {
  key: string;
  subjectId?: string;
  subjectCode: string;
  label: string;
  group: "Core" | "Elective" | "Applied" | "Specialized" | "JHS";
  isSubRow?: boolean;
  units: number;
  t1: number | null;
  t2: number | null;
  t3: number | null;
  finalGrade: number | null;
  remarks: string;
}

export interface SF9LearnerReport {
  learner: Learner;
  age: number | null;
  rows: SF9SubjectGradeRow[];
  generalAverage: number | null;
  generalRemarks: string;
  totalUnits: number;
  adviserRecord: SF9AdviserRecord | null;
  attendanceByMonth: Record<string, SF9MonthlyAttendanceCell>;
  totalClassDays: number;
  totalPresent: number;
  totalAbsent: number;
}

export interface COTObservation {
  id: string;
  term_id: string;
  observer_id: string;
  teacher_id: string;
  subject_id?: string | null;
  section_id?: string | null;
  observation_date: string;
  observation_period: "Observation 1" | "Observation 2" | "Observation 3";
  indicator_ratings: Record<string, number>;
  average_rating: number;
  post_conference_notes?: string | null;
  strengths?: string | null;
  areas_for_improvement?: string | null;
  status: "Scheduled" | "Completed" | "Conferred";
  created_at?: string;
  updated_at?: string;
  teacher?: {
    id: string;
    full_name: string;
    email: string;
    department?: string | null;
  };
  observer?: {
    id: string;
    full_name: string;
    email: string;
  };
  subject?: Subject;
  section?: Section;
}

export interface RPMSPortfolioItem {
  id: string;
  term_id: string;
  teacher_id: string;
  kra_number: 1 | 2 | 3 | 4 | 5;
  objective_number: number;
  objective_description: string;
  mov_type: string;
  linked_document_type?: string | null;
  linked_document_id?: string | null;
  document_url?: string | null;
  document_name?: string | null;
  status: "Draft" | "Submitted" | "Verified";
  created_at?: string;
}

// ============================================================================
// PHASE 7: LEAVE APPLICATION & DYNAMIC CLASS RELIEF MATRIX TYPES
// ============================================================================

export type LeaveType =
  | "Vacation Leave"
  | "Mandatory/Forced Leave"
  | "Sick Leave"
  | "Maternity Leave"
  | "Paternity Leave"
  | "Special Privilege Leave"
  | "Solo Parent Leave"
  | "Study Leave"
  | "10-Day VAWC Leave"
  | "Rehabilitation Privilege"
  | "Special Leave Benefits for Women"
  | "Special Emergency Leave"
  | "Adoption Leave";

export type LeaveStatus =
  | "Pending_Relief"
  | "Pending_Approval"
  | "Approved"
  | "Disapproved"
  | "Cancelled";

export type ConformeStatus = "Pending" | "Accepted" | "Declined";

export interface LeaveClassRelief {
  id: string;
  leave_application_id: string;
  schedule_entry_id?: string | null;
  relief_date: string;
  day_of_week: DayOfWeek;
  time_slot_id: string;
  subject_id: string;
  section_id: string;
  reliever_teacher_id: string;
  conforme_status: ConformeStatus;
  conforme_acted_at?: string | null;
  reliever_remarks?: string | null;
  created_at?: string;
  // Joined relations
  time_slot?: TimeSlot;
  subject?: Subject;
  section?: Section;
  reliever?: Profile;
}

export interface LeaveApplication {
  id: string;
  teacher_id: string;
  term_id?: string | null;
  leave_type: LeaveType;
  start_date: string;
  end_date: string;
  total_days: number;
  reason: string;
  status: LeaveStatus;
  school_head_id?: string | null;
  school_head_action_at?: string | null;
  school_head_remarks?: string | null;
  signed_document_url?: string | null;
  created_at: string;
  updated_at: string;
  // Joined relations
  teacher?: Profile;
  school_head?: Profile;
  reliefs?: LeaveClassRelief[];
}

export interface AffectedScheduleSlot {
  date: string;
  dayOfWeek: DayOfWeek;
  timeSlot: TimeSlot;
  subject: Subject;
  section: Section;
  scheduleEntryId: string;
  suggestedRelieverId?: string;
}

// ============================================================================
// PHASE 8: UNIFIED SCHOOL CALENDAR & SF2 DAILY ATTENDANCE TYPES
// ============================================================================

export type CalendarEventType =
  | "Division Activity"
  | "School Event"
  | "DepEd Holiday"
  | "Exam Period"
  | "Submission Deadline"
  | "Faculty Meeting";

export type TargetAudience =
  | "All"
  | "Teachers"
  | "Students"
  | "Junior High School"
  | "Senior High School";

export interface SchoolCalendarEvent {
  id: string;
  term_id?: string | null;
  title: string;
  description?: string | null;
  start_date: string;
  end_date: string;
  event_type: CalendarEventType;
  target_audience: TargetAudience;
  created_by?: string | null;
  created_at?: string;
  updated_at?: string;
  creator?: Profile;
}

export type AttendanceStatus = "Present" | "Absent" | "Tardy";

export interface StudentDailyAttendance {
  id?: string;
  session_id?: string;
  student_name: string;
  student_lrn: string;
  gender: "Male" | "Female";
  status: AttendanceStatus;
  remarks?: string | null;
  created_at?: string;
}

export interface DailyAttendanceSession {
  id: string;
  section_id: string;
  attendance_date: string;
  recorded_by: string;
  total_present: number;
  total_absent: number;
  total_tardy: number;
  status: "Draft" | "Submitted" | "Locked";
  remarks?: string | null;
  created_at?: string;
  updated_at?: string;
  section?: Section;
  recorder?: Profile;
  students?: StudentDailyAttendance[];
}

export interface StudentAttendanceSummary {
  student_name: string;
  student_lrn: string;
  gender: "Male" | "Female";
  totalDaysPresent: number;
  totalDaysAbsent: number;
  totalDaysTardy: number;
  consecutiveAbsences: number;
  isSardo: boolean; // >= 5 consecutive days absent (SARDO alert)
  remarks?: string;
}

export interface SF2MonthlySummary {
  monthYear: string; // e.g. "November 2026"
  section: Section;
  totalSchoolDays: number;
  registeredMale: number;
  registeredFemale: number;
  totalRegistered: number;
  totalPresentMale: number;
  totalPresentFemale: number;
  totalPresentAll: number;
  totalAbsentMale: number;
  totalAbsentFemale: number;
  totalAbsentAll: number;
  totalTardyMale: number;
  totalTardyFemale: number;
  totalTardyAll: number;
  adaMale: number;
  adaFemale: number;
  adaTotal: number;
  paMale: number;
  paFemale: number;
  paTotal: number;
  sardoCount: number;
  studentSummaries: StudentAttendanceSummary[];
}





