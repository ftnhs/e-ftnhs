# e-FTNHS: AI Agents & Autonomous Workflows Specification

## 1. Executive Summary & Agent Architecture

The **e-FTNHS** platform incorporates specialized autonomous AI agents to assist administrators, department heads, and teachers in processing complex workflows, analyzing compliance metrics, preventing schedule collisions, calculating assessment statistics, and drafting official DepEd communications.

All agents operate within strict role-based boundaries, ensuring data privacy, institutional alignment, and compliance with Philippine Department of Education (DepEd) standards.

```
+-----------------------------------------------------------------------------------+
|                           AGENT SYSTEM ORCHESTRATOR                              |
|                         (e-FTNHS Task Routing Core)                               |
+-----------------------------------------------------------------------------------+
       |                   |                   |                   |
       v                   v                   v                   v
+--------------+    +--------------+    +--------------+    +--------------+
| INSTRUCTIONAL|    | TIMETABLE &  |    | ASSESSMENT & |    | LEAVE RELIEF |
| SUPERVISION  |    | FACULTY LOAD |    | ITEM ANALYSIS|    | & ANCILLARY  |
| AGENT        |    | AGENT        |    | AGENT        |    | AGENT        |
+--------------+    +--------------+    +--------------+    +--------------+
       |                   |                   |                   |
       +-------------------+-------------------+-------------------+
                                   |
                                   v
+-----------------------------------------------------------------------------------+
|                           SUPABASE BACKEND & MCP ENGINE                           |
|        PostgreSQL Database | Storage Buckets | Motion MCP | 21st.dev MCP          |
+-----------------------------------------------------------------------------------+

```

## 2. Core Autonomous AI Agents

### 2.1 Instructional Supervision & Compliance Agent

* **Agent Identifier:** `agent-instructional-supervision`

* **Target Users:** School Heads / Principals.

* **Primary Purpose:** Audits weekly Lesson Log (DLL/DLP) submissions across Weeks 1–10, checks alignment with DepEd Curriculum Learning Competencies, detects late/missing uploads, and drafts constructive feedback for teachers.

* **Operational Capabilities:**

  * **Document Parsing:** Extracts text, objectives, learning tasks, and evaluation strategies from `.pdf` and `.docx` uploads in the `dll-uploads` storage bucket.

  * **Curriculum Competency Alignment Check:** Compares lesson objectives against stored grade-level DepEd curriculum learning competencies.

  * **Compliance Matrix Generation:** Generates real-time compliance reports per department showing on-time, late, and unsubmitted lesson logs.

  * **Feedback Verification Drafting:** Pre-fills the verification approval dialog ("NOTED BY: [School Head]") with suggested qualitative comments.

#### Agent Input/Output Pipeline

```
[Teacher Submits DLL File]
          │
          ▼
[Trigger: agent-instructional-supervision]
          │
          ├── 1. Parse File Content via Storage Bucket Stream
          ├── 2. Extract Learning Objectives & Assessment Tasks
          ├── 3. Compare with DepEd Curriculum Learning Competencies
          └── 4. Calculate Timeliness Status (On-Time vs Late based on Cutoff Timer)
          │
          ▼
[Generate Review Summary & Draft Verification Badge] ──> [School Head Approval Queue]

```

### 2.2 Faculty Loading & Timetable Solver Agent

* **Agent Identifier:** `agent-faculty-loading`

* **Target Users:** Super Admins, School Heads.

* **Primary Purpose:** Solves teacher subject loading combinations and generates conflict-free timetables across 10 modules while adhering to hard physical constraints.

* **Hard Constraints Enforced:**

  1. **Teacher Multi-Assignment Isolation:** $\sum \text{Assignments}(t, s) \le 1$ at any time slot $s$.

  2. **Section Double-Booking Isolation:** $\sum \text{Subjects}(c, s) \le 1$ at any time slot $s$.

  3. **Specialized Lab Capacity:** Specialized laboratories (e.g., Science Lab, Computer Lab, TVL Workshops) cannot exceed single-class allocations.

  4. **Max Daily Teaching Load:** Enforces maximum consecutive teaching hours per faculty member as mandated by Magna Carta for Public School Teachers.

* **Operational Capabilities:**

  * Solves multi-section schedule grids using a constraint satisfaction search algorithm.

  * Highlights conflicting slots in red on visual drag-and-drop grids during manual adjustments.

  * Formats data for automatic population into **School Form 7 (SF7)**, **Class Programs**, and **Master Schedules**.

### 2.3 Assessment Statistics & Item Analysis Agent

* **Agent Identifier:** `agent-item-analysis`

* **Target Users:** Subject Teachers, School Head.

* **Primary Purpose:** Ingests raw online assessment outputs (`.csv` / `.xlsx` / LMS quiz exports), executes statistical calculations, computes item difficulty indices, categorizes DepEd mastery levels, and suggests test item revisions.

* **Mathematical Calculations Core:**

  * **Mean Score (**$\mu$**):**
    

    $$
    \mu = \frac{\sum_{i=1}^{N} X_i}{N}
    $$

  * **Standard Deviation (**$\text{SD}$**):**
    

    $$
    \text{SD} = \sqrt{\frac{\sum_{i=1}^{N} (X_i - \mu)^2}{N}}
    $$

  * **Mean Percentage Score (**$\text{MPS}$**):**
    

    $$
    \text{MPS} = \left( \frac{\mu}{\text{Total Items}} \right) \times 100
    $$

  * **Index of Difficulty (**$D_j$**) per Item:**
    

    $$
    D_j = \frac{R_j}{N} \quad \longrightarrow \quad \text{Classify: Retain } (0.21 - 0.80), \text{ Revise } (> 0.80), \text{ Reject } (< 0.20)
    $$

* **Operational Capabilities:**

  * Automatically parses Google Forms / Quizizz spreadsheet columns.

  * Generates visual score distribution charts (Recharts integration).

  * Identifies top 3 **Least Learned Competencies** for immediate instructional intervention.

  * Automatically pushes score arrays to the **E-Class Record** Written Works / Quarterly Exam grids.

### 2.4 Class Relief & Leave Processing Agent

* **Agent Identifier:** `agent-leave-relief`

* **Target Users:** Requesting Teachers, Relieving Teachers, Principal / School Head.

* **Primary Purpose:** Manages the end-to-end filing of teacher leave applications, determines affected schedule periods, routes relief requests to available vacant teachers, and formats printable DepEd Leave Letters.

* **Operational Capabilities:**

  * **Schedule Interception:** Matches inclusive leave dates against `schedule_entries` to extract exact daily periods requiring coverage.

  * **Vacant Teacher Identification:** Queries database for faculty with free periods during the affected time slots.

  * **Conforme Workflow Routing:** Dispatches instant in-app alerts to candidate relievers to accept or decline coverage.

  * **Printable Document Generation:** Renders official PDF containing FTNHS header, replacement schedule table, signature placeholders, and approval lines.

### 2.5 RPMS-PPST Portfolio & Observation Coach Agent

* **Agent Identifier:** `agent-rpms-coach`

* **Target Users:** Teachers, School Head (Principal).

* **Primary Purpose:** Assists teachers in organizing Means of Verification (MOVs) for the Results-Based Performance Management System (RPMS), schedules Classroom Observation Tool (COT) sessions, and auto-indexes system documents into portfolio KRAs.

* **Operational Capabilities:**

  * **Auto-Indexing MOVs:** Tags approved DLLs, noted Item Analysis reports, and signed coordinatorship files directly to corresponding RPMS Objectives.

  * **COT Scheduler:** Coordinates mutual availability between the School Head and Teachers for classroom observation dates.

  * **Rubric Guidance:** Provides rating scale descriptors (PPST indicators) during digital observation logging.

## 3. Agent System Prompts & Behavioral Guardrails

### 3.1 System Prompt Framework

All agents operate under strict instruction sets:

```
SYSTEM PROMPT TEMPLATE [e-FTNHS AGENT CORE]:
You are an intelligent administrative agent for Fermin Tayabas National High School (FTNHS), located in Cabayugan, Calape, Bohol (Division of Bohol, School ID: 302851).
Your primary mandate is to streamline DepEd administrative compliance while maintaining strict data privacy, institutional authority, professional courtesy, and modern web engineering excellence.

STRICT OPERATIONAL RULES:
1. DOMAIN & ROLE BOUNDARY: Never perform administrative actions (e.g., approving DLLs, signing leave requests, publishing memos) unless the authenticated user holds the explicit role ('Super Admin' or 'School Head').
2. DEPED STANDARDS: All calculations, form layouts, and terminologies must adhere strictly to DepEd Orders (DepEd Order No. 8 s. 2015 for Grading; DepEd RPMS-PPST guidelines for Observations).
3. FORMULA ACCURACY: Math and statistical outputs must be calculated using exact mathematical definitions. Do not approximate values.
4. TONE & VOICE: Maintain a professional, supportive, constructive, and collaborative administrative tone.
5. NO REWRITES WITHOUT CONSENT: When evaluating teacher submissions or feedback, coach and provide suggestions—do not overwrite original user content without explicit request.
6. ACCESSIBILITY & INCLUSIVE UI GENERATION: All UI components, dialogs, status badges, and data tables generated or configured by agents MUST comply with WCAG 2.2 AA (semantic HTML5, full keyboard accessibility, visible focus rings, explicit ARIA labels for icon-only buttons, 44x44px touch targets on mobile/tablet, and prefers-reduced-motion support).
7. SPREADSHEET FORMULA INJECTION DEFENSE: When processing user-supplied CSV/XLSX assessment records, sanitize all cell values starting with formula trigger characters ('=', '+', '-', '@', '\t', '\r') to neutralize CSV Injection vulnerabilities (CWE-1236).
8. FILE UPLOAD & MIME SANITIZATION: Validate both file MIME type and size limits before processing: .pdf (≤ 25MB), .docx (≤ 15MB), .csv/.xlsx (≤ 5MB), and images (≤ 10MB).
9. ZERO CLIENT SECRETS: Never output or reference backend service role keys in client code or responses; adhere strictly to public anon keys and RLS policies.
```

### 3.2 Security, Privacy & Modern Web Guardrails

1. **Authentication Lock:** Agents CANNOT execute database reads or writes without a validated Supabase JWT token from an authorized and approved user profile.

2. **Row-Level Security (RLS) Enforcement:** Agents operate through client RPC calls or database functions that inherit the active user's RLS permissions.

3. **PHI/PII Protection:** Student identifiers are restricted to local section views. Student LRNs and raw scores are never exposed in public school feeds.

4. **Content Security Policy (CSP) & Sanitization:** All agent-generated markup and dynamic text MUST be sanitized against XSS. Direct injection of unsanitized HTML is strictly prohibited.

5. **Offline & PWA Resilience:** Agent workflows must support offline resilience; data fetching operations must gracefully utilize cached timetables and memos when client devices experience weak school Wi-Fi.

## 4. Agent Tooling & MCP Integration Matrix

| Agent Name | Database Access Tools | Storage Bucket Tools | External MCP Integrations | Output Deliverables & Modern Web Standards | 
| ----- | ----- | ----- | ----- | ----- | 
| **Instructional Supervision Agent** | `fetch_dll_list`, `update_dll_status` | `dll-uploads` (Read/Write, MIME-checked) | 21st.dev MCP (Status Badges) | Compliance Matrix, Verification Stamp, WCAG 2.2 AA Badges | 
| **Faculty Loading Agent** | `fetch_schedule_entries`, `insert_schedule_slot` | N/A | Motion MCP (Grid Shifts) | Conflict-Free Timetable, SF7 PDF, Keyboard-Accessible Grid | 
| **Item Analysis Agent** | `fetch_assessment_data`, `save_item_analysis` | `exam-imports` (Read, Formula-Sanitized) | Recharts Visualization | Statistical Summary, $MPS$ Trend Charts, Sanitized CSV Data | 
| **Class Relief & Leave Agent** | `fetch_teacher_availability`, `create_leave_request` | `leave-attachments` (Write, Size-Validated) | `@react-pdf/renderer` | Formatted PDF Leave Excuse Letter, Accessible Conforme UI | 
| **RPMS Portfolio Coach Agent** | `fetch_rpms_kra_list`, `link_mov_document` | `coordinatorship-files` (Role-Restricted) | 21st.dev MCP (Portfolio Cards) | Indexed KRA Vault, COT Schedule, PWA-Cached Portfolio | 

## 5. Decision Loops & Interaction Workflows

### Workflow: Automated Leave Application & Relief Conforme Loop

```
[Teacher Initiates Leave Request]
              │
              ▼
[agent-leave-relief Intercepts Request]
              │
              ├── Query `schedule_entries` for Requesting Teacher's Daily Classes
              ├── Identify Free Teachers per Affected Period
              └── Render Candidate Reliever Options
              │
              ▼
[Teacher Confirms Selected Relievers & Reasons]
              │
              ▼
[Dispatch In-App Notifications to Relieving Teachers]
              │
      ┌───────┴───────┐
      ▼               ▼
[All Relievers]  [Any Reliever]
[Accepted]       [Declined]
      │               │
      │               └──> [Prompt Requesting Teacher to Select Alternative Reliever]
      ▼
[Route to Principal / School Head Queue]
      │
      ▼
[Principal Clicks "Approve Leave"]
              │
              ▼
[agent-leave-relief Generates Final Signed PDF Letter + Locks Timetable Coverages]

```

## 6. Summary of Agent Responsibilities

The e-FTNHS agent ecosystem automates administrative workflows across the 10 core modules:

* **Automated Auditing:** Detects missing DLLs, overdue item analyses, and pending leave requests.

* **Constraint Enforcement:** Ensures zero teacher, section, or laboratory double-bookings.

* **Mathematical Precision:** Computes exact $\mu$, $\text{SD}$, $\text{MPS}$, difficulty indices, and transmuted grades.

* **Document Automation:** Generates print-ready DepEd standard PDF forms with institutional headers.

* **Institutional Compliance:** Enforces role-based permissions and authorized user security across all operations.