export interface HeroMetric {
  code: string;
  label: string;
}

export interface EcosystemPillar {
  id: string;
  title: string;
  modules: string[];
  summary: string;
}

export type RolePerspectiveId = "school_head" | "teacher" | "admin";

export interface RolePerspective {
  id: RolePerspectiveId;
  label: string;
  badge: string;
  headline: string;
  capabilities: {
    module: string;
    detail: string;
  }[];
}

export interface DepEdFormPreview {
  code: string;
  title: string;
  tag: string;
  summary: string;
  highlights: { label: string; value: string }[];
}

export interface CampusAdvisory {
  id: string;
  category: "Urgent" | "Academic" | "General";
  memoNumber: string;
  date: string;
  title: string;
  audience: string;
  excerpt: string;
  body: string[];
}

export interface AcademicMilestone {
  id: string;
  term: string;
  dateRange: string;
  title: string;
  status: "Active" | "Completed" | "Upcoming";
  isDeadline?: boolean;
}

export const HERO_METRICS: HeroMetric[] = [
  {
    code: "ID 302851",
    label: "Fermin Tayabas NHS • Bohol",
  },
  {
    code: "Grades 7–12",
    label: "JHS MATATAG & SHS Tracks",
  },
  {
    code: "10 Modules",
    label: "Instruction, Personnel & Admin",
  },
];

export const ECOSYSTEM_PILLARS: EcosystemPillar[] = [
  {
    id: "instruction",
    title: "Academic & Instruction",
    modules: ["Lesson Plans", "Schedule & SF7", "Item Analysis", "Classes, ECR & SF9"],
    summary: "DLL audits, SF7 scheduling, item analysis, E-Class Records.",
  },
  {
    id: "personnel",
    title: "Faculty & Personnel",
    modules: ["RPMS & COT", "Leave & Relief", "Organizations"],
    summary: "COT cycles, leave routing, KRA portfolio indexing.",
  },
  {
    id: "administration",
    title: "School Administration",
    modules: ["Admin & Settings", "School Memos", "Calendar & SF2"],
    summary: "Memos, term setup, SF2 daily attendance.",
  },
];

export const ROLE_PERSPECTIVES: RolePerspective[] = [
  {
    id: "school_head",
    label: "School Head",
    badge: "Supervisory Authority",
    headline: "Real-time oversight and approvals across all 10 modules.",
    capabilities: [
      {
        module: "Instructional Supervision",
        detail: "Audit DLL compliance and stamp verified logs.",
      },
      {
        module: "Leave & Relief Queue",
        detail: "Approve Form 6 after relievers confirm coverage.",
      },
      {
        module: "RPMS-PPST & COT",
        detail: "Score COT rubrics and track KRA completion.",
      },
      {
        module: "School Broadcasts",
        detail: "Publish memos and confirm read acknowledgments.",
      },
    ],
  },
  {
    id: "teacher",
    label: "Classroom Teacher",
    badge: "Instructional Focus",
    headline: "Eliminate manual spreadsheets for grading and roll-calls.",
    capabilities: [
      {
        module: "E-Class Record & SF9",
        detail: "Auto-transmute scores into consolidated report cards.",
      },
      {
        module: "Item Analysis Engine",
        detail: "Calculate Mean, SD, MPS, and Least Learned Competencies.",
      },
      {
        module: "My Class Schedule",
        detail: "View JHS 50-min afternoon & SHS morning slots.",
      },
      {
        module: "One-Click Leave Relief",
        detail: "Auto-detect periods and match vacant colleagues.",
      },
    ],
  },
  {
    id: "admin",
    label: "ICT / Admin",
    badge: "System Governance",
    headline: "Enforce clean terms, loads, and access controls.",
    capabilities: [
      {
        module: "Faculty Loading Solver",
        detail: "Prevent double-booking and Magna Carta overloads.",
      },
      {
        module: "SF1 Learner Bulk Sync",
        detail: "Import SF1 rosters across Grades 7–12 sections.",
      },
      {
        module: "Account Verification",
        detail: "Approve faculty with fail-closed RLS role isolation.",
      },
      {
        module: "Institutional Settings",
        detail: "Manage terms, subjects, rooms, and advisories.",
      },
    ],
  },
];

export const DEPED_FORMS_SHOWCASE: DepEdFormPreview[] = [
  {
    code: "SF7",
    title: "School Personnel Assignment List",
    tag: "Faculty & Loads",
    summary: "Weekly minutes auto-synced from plotted teaching loads.",
    highlights: [
      { label: "School ID", value: "302851" },
      { label: "Load Cap", value: "1,800 m/wk" },
      { label: "JHS PM", value: "50 mins" },
    ],
  },
  {
    code: "SF2",
    title: "Daily Attendance Report of Learners",
    tag: "Roll-Call Engine",
    summary: "Daily roll-call logs with monthly attendance and SARDO flags.",
    highlights: [
      { label: "Tracking", value: "Daily Roll" },
      { label: "Alert", value: "SARDO Risk" },
      { label: "Output", value: "Folio Print" },
    ],
  },
  {
    code: "Form 6",
    title: "Application for Leave & Class Relief",
    tag: "Substitute Routing",
    summary: "Intercepts classes and routes substitute teachers automatically.",
    highlights: [
      { label: "Routing", value: "Vacant Staff" },
      { label: "Approval", value: "Principal" },
      { label: "Output", value: "PDF Letter" },
    ],
  },
  {
    code: "DLL",
    title: "Daily Lesson Log Compliance Matrix",
    tag: "Weeks 1–10",
    summary: "Tracks submission timeliness with principal verification stamps.",
    highlights: [
      { label: "Scope", value: "Gr. 7–12" },
      { label: "Audit", value: "Weekly" },
      { label: "Stamp", value: "Noted By" },
    ],
  },
];

export const CAMPUS_ADVISORIES: CampusAdvisory[] = [
  {
    id: "adv-1",
    category: "Academic",
    memoNumber: "School Memo No. 042, s. 2026",
    date: "November 2026",
    title: "Term 2 Consolidated Class Schedule & JHS 50-Minute Period Rollout",
    audience: "All Faculty",
    excerpt:
      "Term 2 schedule updated for 50-minute JHS afternoon blocks synced with SF7 loads.",
    body: [
      "The Term 2 Consolidated Class Schedule is now live inside Module B (Schedule & SF7).",
      "JHS afternoon classes (Grades 7–10) run on uniform 50-minute blocks; Grade 12 HUMSS HOPE 3 is slotted at 12:30–1:00 PM before regular afternoon sessions.",
      "Department coordinators must verify that plotted weekly minutes match official subject loads before printing.",
    ],
  },
  {
    id: "adv-2",
    category: "Urgent",
    memoNumber: "Advisory No. 018, s. 2026",
    date: "November 2026",
    title: "Submission of Term 2 Weeks 1–4 Daily Lesson Logs (DLL/DLP)",
    audience: "Teaching Staff",
    excerpt:
      "Upload weekly DLLs before Monday 8:00 AM for School Head digital review and verification.",
    body: [
      "All subject teachers must upload their DLL/DLP in PDF or DOCX format to the Lesson Plans Hub before Monday 8:00 AM.",
      "Approved submissions receive the official 'NOTED BY: School Head' stamp and may be linked as MOVs in RPMS-PPST portfolios.",
    ],
  },
  {
    id: "adv-3",
    category: "General",
    memoNumber: "ICT Bulletin No. 009, s. 2026",
    date: "October 2026",
    title: "SF1 Learner Roster Verification & E-Class Record Enrollment Sync",
    audience: "Class Advisers",
    excerpt:
      "Import SF1 rosters into Class Management to sync learners across E-Class Records and SF9.",
    body: [
      "Class Advisers for Grades 7–12 may validate learner LRNs, enrollment status, and guardian records using the SF1 bulk parser.",
      "Enrolled learners sync automatically across subject E-Class Records, SF2 Roll-Calls, and Consolidated SF9 Summaries.",
    ],
  },
];

export const ACADEMIC_MILESTONES: AcademicMilestone[] = [
  {
    id: "m1",
    term: "SY 2026–2027 • Term 1",
    dateRange: "June – September 2026",
    title: "Opening of Classes & Term 1 Assessments",
    status: "Completed",
  },
  {
    id: "m2",
    term: "SY 2026–2027 • Term 2",
    dateRange: "October 2026 – January 2027",
    title: "Active Term — DLL Audits & COT Phase I",
    status: "Active",
    isDeadline: true,
  },
  {
    id: "m3",
    term: "Term 2 Checkpoint",
    dateRange: "December 2026",
    title: "Mid-Term Item Analysis & Progress Check",
    status: "Upcoming",
    isDeadline: true,
  },
  {
    id: "m4",
    term: "SY 2026–2027 • Term 3",
    dateRange: "February – May 2027",
    title: "Final Term, RPMS Wrap-up & SF9 Promotion",
    status: "Upcoming",
  },
];

export interface SimulatedScheduleCell {
  period: string;
  time: string;
  mon: string;
  tue: string;
  wed: string;
  thu: string;
  fri: string;
  hasConflict?: boolean;
  conflictNote?: string;
}

export const TIMETABLE_CONFLICT_ROWS: SimulatedScheduleCell[] = [
  {
    period: "AM Block 1",
    time: "07:30–08:30",
    mon: "G12-HUMSS • UCSP",
    tue: "G12-TVL • EAPP",
    wed: "G12-HUMSS • UCSP",
    thu: "G12-TVL • EAPP",
    fri: "G12-HUMSS • UCSP",
  },
  {
    period: "PM Block 1",
    time: "13:00–13:50",
    mon: "G8-Love • Science",
    tue: "G8-Love + G9-Peace (Lab Overlap)",
    wed: "G8-Love • Science",
    thu: "Teacher Double-Booked",
    fri: "G8-Love • Science",
    hasConflict: true,
    conflictNote: "2 sections assigned to Science Lab / same teacher on Tue & Thu 13:00",
  },
  {
    period: "PM Block 2",
    time: "13:50–14:40",
    mon: "G9-Peace • Math",
    tue: "G9-Peace • Math",
    wed: "G9-Peace • Math",
    thu: "G9-Peace • Math",
    fri: "G9-Peace • Math",
  },
];

export const TIMETABLE_SOLVED_ROWS: SimulatedScheduleCell[] = [
  {
    period: "AM Block 1",
    time: "07:30–08:30",
    mon: "G12-HUMSS • UCSP",
    tue: "G12-TVL • EAPP",
    wed: "G12-HUMSS • UCSP",
    thu: "G12-TVL • EAPP",
    fri: "G12-HUMSS • UCSP",
  },
  {
    period: "PM Block 1",
    time: "13:00–13:50",
    mon: "G8-Love • Science",
    tue: "G8-Love • Science",
    wed: "G8-Love • Science",
    thu: "G8-Love • Science",
    fri: "G8-Love • Science",
  },
  {
    period: "PM Block 2",
    time: "13:50–14:40",
    mon: "G9-Peace • Science",
    tue: "G9-Peace • Science",
    wed: "G9-Peace • Science",
    thu: "G9-Peace • Science",
    fri: "G9-Peace • Science",
  },
];

export const LEAVE_RELIEF_SIMULATION = {
  applicant: "Elena B. Lumapas, T-III",
  leaveType: "Sick Leave (Form 6)",
  inclusiveDates: "Mon–Tue (2 Working Days)",
  affectedPeriods: [
    {
      dayTime: "Mon • 13:00–13:50",
      classLabel: "Grade 8 – Love • English 8",
      room: "Rm. 201",
      reliever: "A. Diango, T-I",
      status: "Vacant Match",
    },
    {
      dayTime: "Tue • 14:40–15:30",
      classLabel: "Grade 9 – Peace • English 9",
      room: "Rm. 204",
      reliever: "R. Cabahug, T-II",
      status: "Vacant Match",
    },
  ],
};
