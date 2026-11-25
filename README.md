# e-FTNHS: Integrated School Management & Faculty Portal

[![React](https://img.shields.io/badge/React-19.3.1-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.3.5-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Motion](https://img.shields.io/badge/Motion-14.14.0-CC66FF?logo=motion&logoColor=white)](https://motion.dev/)
[![PWA Ready](https://img.shields.io/badge/PWA-Installable-5A0FC8?logo=pwa&logoColor=white)](https://web.dev/progressive-web-apps/)
[![WCAG 2.2 AA](https://img.shields.io/badge/Accessibility-WCAG_2.2_AA-008080?logo=w3c&logoColor=white)](https://www.w3.org/WAI/standards-guidelines/wcag/)
[![Core Web Vitals](https://img.shields.io/badge/Core_Web_Vitals-Budgeted-4285F4?logo=googlechrome&logoColor=white)](https://web.dev/vitals/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3FCF8E?logo=supabase&logoColor=white)](https://supabase.com/)
[![DepEd Philippines](https://img.shields.io/badge/DepEd-Aligned-0038A8)](https://www.deped.gov.ph/)

**e-FTNHS** is an enterprise-grade, responsive Progressive Web Application (PWA) and Administrative Automation Platform tailored specifically for **Fermin Tayabas National High School (FTNHS)**, located in Cabayugan, Calape, Bohol (Division of Bohol, Region VII, School ID: 302851). Designed in accordance with Philippine Department of Education (DepEd) standards, e-FTNHS unifies faculty scheduling, lesson plan submissions, automated statistical item analysis, RPMS-PPST performance tracking, leave relief matrices, and class records into a single, conflict-free system.

---

## 🏛️ Executive System Overview

```
+-----------------------------------------------------------------------------------+
|                              e-FTNHS PORTAL CORE                                  |
|     DepEd Google OAuth (@deped.gov.ph) | Role-Based Access Control (RBAC)            |
+-----------------------------------------------------------------------------------+
  ├── Module 1: Auth & Account Approval Queue
  ├── Module 2: Faculty Loading & Conflict-Free Auto-Scheduler (SF7 / Class Programs)
  ├── Module 3: Lesson Log (DLL/DLP) Review & Verification Hub
  ├── Module 4: 3-Term Online Exam Importer & Item Analysis Engine
  ├── Module 5: School Memos Broadcast Center & Read-Receipt Tracker
  ├── Module 6: School Coordinatorships, Organizations & Ancillary Vault
  ├── Module 7: Automated E-Class Record & DepEd Grade Transmutation Engine
  ├── Module 8: RPMS-PPST Portfolio MOV Vault & COT Scheduler
  ├── Module 9: Leave Application, Dynamic Class Relief Matrix & PDF Generator
  └── Module 10: Unified School Calendar & SF2 Daily Attendance Tracker
```

---

## 📦 Tech Stack & Dependencies

* **Frontend Framework:** [React 19.3.1](https://react.dev/) (Vite bundler, React Compiler enabled)
* **Type System:** [TypeScript 5.7+](https://www.typescriptlang.org/) with `"strict": true`
* **Styling Engine:** [Tailwind CSS v4.3.5](https://tailwindcss.com/) (CSS-first configuration using `@import "tailwindcss";` and `@tailwindcss/vite`)
* **Animation Library:** [Motion 14.14.0](https://motion.dev/) (Imported strictly from `"motion/react"` with universal `prefers-reduced-motion` fallbacks)
* **PWA & Offline Worker:** `vite-plugin-pwa` with Workbox runtime caching and Web App Manifest (`manifest.webmanifest`)
* **Performance Telemetry:** `web-vitals` for live Core Web Vitals telemetry tracking
* **Quality & Linting:** ESLint 9 (Flat config with `eslint-plugin-react-hooks` and `eslint-plugin-jsx-a11y`) + Prettier
* **Database & Auth:** [Supabase PostgreSQL](https://supabase.com/) (`https://ndwwoxsgcegdqiyoipvj.supabase.co`) with Row-Level Security (RLS) and OAuth Domain Guards
* **PDF Compilation:** `@react-pdf/renderer` & `react-to-print` (deferred via dynamic chunking)
* **Data Visualization:** Recharts (isolated via code splitting)
* **Iconography:** Lucide React

---

## ⚡ Modern Web Quality, Performance & Accessibility

* **Core Web Vitals Performance Budgets:**
  * **LCP (Largest Contentful Paint):** $< 2.5\text{s}$ on standard broadband, $< 3.5\text{s}$ on 4G networks.
  * **INP (Interaction to Next Paint):** $< 200\text{ms}$ across all interactive views, timetable reordering, and data grids.
  * **CLS (Cumulative Layout Shift):** $< 0.1$ guaranteed by explicit media dimensions, avatar containers, and skeleton loaders.
* **Route-Level Code Splitting:** Dynamic importing (`React.lazy` + `<Suspense>`) for all 10 modules with Vite `manualChunks` isolating heavy vendor packages (`vendor-react`, `vendor-motion`, `vendor-charts`, `vendor-pdf`, `vendor-supabase`).
* **Inclusive Accessibility (WCAG 2.2 AA):**
  * Semantic HTML5 landmarks (`<header>`, `<nav>`, `<main id="main-content">`, `<aside>`, `<footer>`) with Skip-to-Content link.
  * Full keyboard accessibility, visible high-contrast focus rings, and explicit `aria-label`s on icon-only controls.
  * Minimum touch targets of $44 \times 44 \text{ px}$ on mobile/tablet viewports.
  * Vestibular protection via universal `prefers-reduced-motion` compliance across all Motion transitions.
* **PWA & Offline Resilience:**
  * Installable on Android, iOS, Windows, and macOS home screens in standalone mode.
  * Workbox service worker precaches application shell and serves cached timetables and school memos when teachers experience weak school Wi-Fi.
  * Visual offline status banner and optimistic state synchronization upon reconnection.
* **Web Security Hardening:**
  * Strict Content Security Policy (CSP) headers blocking unauthorized scripts and clickjacking (`frame-ancestors 'none'`).
  * Strict file upload validation (MIME-type check and size limits for `.pdf`, `.docx`, `.csv`, `.xlsx`, images).
  * Spreadsheet formula injection defense (sanitizing `=`, `+`, `-`, `@`, `\t`, `\r` on import).
  * Zero exposed backend service role keys in client code.

## 🔑 Key Features & Core Modules

### 1. DepEd Google OAuth Guard & RBAC (Module 1)
* Domain-locked authentication restricting sign-ups strictly to `@deped.gov.ph` accounts.
* Automated PostgreSQL triggers reject unauthorized domains at the database level.
* Real-time user approval queue managed by Super Admins and School Heads.

### 2. Faculty Loading & Timetable Engine (Module 2)
* Conflict-free schedule calculation enforcing strict mathematical isolation rules:
  * **Teacher Collision Guard:** $\sum \text{Schedules}(t, d, s) \le 1$
  * **Section Collision Guard:** $\sum \text{Schedules}(c, d, s) \le 1$
  * **Specialized Facility Guard:** Single-class isolation for Computer Labs, Science Labs, and TVL Workshops.
* Instant generation of official printable **School Form 7 (SF7)** and **Class Programs**.

### 3. Lesson Plan (DLL/DLP) Verification Hub (Module 3)
* Direct upload of `.pdf` and `.docx` weekly lesson logs across Weeks 1–10.
* Automatic cut-off timer tagging submissions as `On-Time` or `Late`.
* Built-in document viewer with School Head verification stamps ("NOTED BY").

### 4. Automated Item Analysis Engine (Module 4)
* Spreadsheet parsing (`.csv` / `.xlsx`) for Google Forms, Quizizz, and LMS quiz results.
* Automatic statistical calculation:
  * **Mean Score ($\mu$):** $\mu = \frac{\sum X}{N}$
  * **Standard Deviation ($\text{SD}$):** $\text{SD} = \sqrt{\frac{\sum (X - \mu)^2}{N}}$
  * **Mean Percentage Score ($\text{MPS}$):** $\text{MPS} = \left( \frac{\mu}{\text{Total Items}} \right) \times 100$
  * **Item Difficulty Index ($D_j$):** $D_j = \frac{R_j}{N}$
* Automated item recommendations (*Retain*, *Revise*, *Reject*) and DepEd 7-tier Mastery Level categorization.

### 5. Leave Application & Reliever Matrix (Module 9)
* Dynamic schedule interception matching leave dates against timetables to extract affected class periods.
* Automatic identification of vacant teachers per period for relief assignment.
* Reliever conforme acceptance workflow and printable DepEd Excuse Letter PDF generator.

---

## 🚀 Quick Start Guide

### Prerequisites
* **Node.js:** `v18.0.0` or higher
* **npm:** `v9.0.0` or higher
* **Supabase Project Access:** Active account with API credentials

### Installation

1. **Clone the Repository:**
   ```bash
   git clone https://github.com/ftnhs-dev/e-ftnhs.git
   cd e-ftnhs
   ```

2. **Install Dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   Create a `.env.local` file in the root directory and append your Supabase keys:
   ```env
   VITE_SUPABASE_URL=https://ndwwoxsgcegdqiyoipvj.supabase.co
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
   ```

4. **Available NPM Scripts:**
   ```bash
   npm run dev        # Launch Vite development server with HMR
   npm run build      # Strict TypeScript check + production bundle with vendor chunking
   npm run preview    # Preview production build locally
   npm run lint       # Run ESLint 9 with React Hooks & JSX A11y rules
   npm run typecheck  # Run tsc --noEmit to verify strict type correctness
   ```

5. **Launch Development Server:**
   ```bash
   npm run dev
   ```
   Open `http://localhost:5173` in your browser.

6. **Build for Production:**
   ```bash
   npm run build
   ```

---

## 📐 Project Directory Layout

```
e-ftnhs/
├── public/
│   ├── manifest.webmanifest   # PWA Web App Manifest
│   ├── favicon.ico            # Institutional favicon
│   └── pwa-icons/             # 192x192, 512x512, and maskable PWA icons
├── src/
│   ├── assets/                # Institutional logos, seals, static media
│   ├── components/            # Reusable UI components
│   │   ├── common/            # Buttons, Modals, Badges, Loaders
│   │   ├── layout/            # Topbar, Sidebar, MobileNav, Shell
│   │   └── modules/           # Module-specific views (M1 - M10)
│   ├── context/               # React Contexts (AuthContext, ScheduleContext)
│   ├── hooks/                 # Custom hooks (useAuth, useSchedule, useReducedMotion)
│   ├── lib/                   # Database clients, math engines, schedule solvers
│   │   ├── supabase.ts        # Supabase JS client setup
│   │   ├── statsEngine.ts     # Math & statistical formulas (μ, SD, MPS, Dj)
│   │   ├── solver.ts          # Timetable constraint validation
│   │   └── webVitals.ts       # Core Web Vitals telemetry reporter
│   ├── services/              # Supabase RPC and query wrappers
│   ├── types/                 # TypeScript interfaces and database schemas
│   ├── views/                 # Core screen entry points per module (React.lazy)
│   ├── App.tsx                # SPA Router, Route Guards & Suspense
│   ├── main.tsx               # React root entry
│   └── index.css              # Tailwind CSS v4 design tokens (@theme)
├── .env.local                 # Environment secrets (Git-ignored)
├── eslint.config.js           # ESLint 9 flat configuration
├── index.html                 # HTML entry point with preconnect & font swap
├── package.json               # Project dependencies & npm scripts
├── tsconfig.json              # TypeScript strict configuration
├── vite.config.ts             # Vite build configuration with manualChunks & PWA
└── README.md                  # System documentation
```

---

## 📜 Documentation Suite Map

This repository is governed by a complete 9-file specification suite:

1. `PRD.md` — Product Requirements Document & Feature Specs
2. `ARCHITECTURE.md` — Database Topology, RLS Policies & Algorithms
3. `DESIGN.md` — Tailwind CSS v4 Tokens, Theme & Motion Specs
4. `SKILLS.md` — Tooling, Integrations & Mathematical Engines
5. `AGENTS.md` — Autonomous AI Agent Operational Workflows
6. `RULES.md` — Engineering Guidelines & Coding Rules
7. `TASKS.md` — Master Implementation Task Roadmap
8. `MEMORY.md` — Persistent Project Decision Log & Architecture Memory
9. `README.md` — Project Overview & Deployment Setup *(This File)*

---

## ⚖️ Governance & License

Developed exclusively for **Fermin Tayabas National High School (FTNHS)**, Cabayugan, Calape, Bohol (School ID 302851) under DepEd ICT governance. All rights reserved. Unauthorized reproduction or external redistribution without institutional authorization is strictly prohibited.#   e - f t n h s  
 