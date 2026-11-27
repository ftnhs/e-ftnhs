import React from "react";
import type { ModuleId } from "../../types";
import {
  Shield,
  Calendar,
  FileText,
  BarChart3,
  Bell,
  Briefcase,
  GraduationCap,
  Award,
  Send,
  CalendarCheck2,
  Globe,
} from "lucide-react";

export interface NavModuleDef {
  id: ModuleId;
  name: string;
  path: string;
  icon: React.ReactNode;
}

export interface NavGroupDef {
  title: string;
  modules: NavModuleDef[];
}

export const MODULE_PATHS: Record<ModuleId, string> = {
  M1: "/admin-settings",
  M2: "/lesson-plans",
  M3: "/schedule",
  M4: "/item-analysis",
  M5: "/school-memos",
  M6: "/organizations",
  M7: "/classes-ecr-sf9",
  M8: "/rpms-cot",
  M9: "/leave-relief",
  M10: "/calendar-sf2",
  M11: "/school-portals",
};

export const NAV_GROUPS: NavGroupDef[] = [
  {
    title: "Academic",
    modules: [
      { id: "M2", name: "Lesson Plans", path: MODULE_PATHS.M2, icon: <FileText className="w-4 h-4" /> },
      { id: "M3", name: "Schedule", path: MODULE_PATHS.M3, icon: <Calendar className="w-4 h-4" /> },
      { id: "M4", name: "Item Analysis", path: MODULE_PATHS.M4, icon: <BarChart3 className="w-4 h-4" /> },
      { id: "M7", name: "Classes, ECR & SF9", path: MODULE_PATHS.M7, icon: <GraduationCap className="w-4 h-4" /> },
    ],
  },
  {
    title: "Personnel",
    modules: [
      { id: "M8", name: "RPMS & COT", path: MODULE_PATHS.M8, icon: <Award className="w-4 h-4" /> },
      { id: "M9", name: "Leave & Relief", path: MODULE_PATHS.M9, icon: <Send className="w-4 h-4" /> },
      { id: "M6", name: "Organizations", path: MODULE_PATHS.M6, icon: <Briefcase className="w-4 h-4" /> },
    ],
  },
  {
    title: "Admin",
    modules: [
      { id: "M1", name: "Admin & Settings", path: MODULE_PATHS.M1, icon: <Shield className="w-4 h-4" /> },
      { id: "M5", name: "School Memos", path: MODULE_PATHS.M5, icon: <Bell className="w-4 h-4" /> },
      { id: "M10", name: "Calendar & SF2", path: MODULE_PATHS.M10, icon: <CalendarCheck2 className="w-4 h-4" /> },
    ],
  },
  {
    title: "Portals",
    modules: [
      { id: "M11", name: "School Portals", path: MODULE_PATHS.M11, icon: <Globe className="w-4 h-4" /> },
    ],
  },
];

export const MODULES: NavModuleDef[] = NAV_GROUPS.flatMap((g) => g.modules);

export function getModuleById(id: ModuleId): NavModuleDef | undefined {
  return MODULES.find((m) => m.id === id);
}

export function getRoutePathForModule(id: ModuleId, role?: string): string {
  if (id === "M1" && (role === "Teacher" || role === "Non-Teaching")) {
    return "/my-profile";
  }
  return MODULE_PATHS[id] || "/";
}

export function getModuleTitleForRole(id: ModuleId, role?: string): string {
  if (id === "M1" && (role === "Teacher" || role === "Non-Teaching")) {
    return "My Profile";
  }
  return getModuleById(id)?.name || "e-FTNHS Portal";
}

export type ParsedAppRoute =
  | { pageView: "landing" }
  | { pageView: "login" }
  | { pageView: "portal"; moduleId: ModuleId };

export function resolvePathname(pathname: string): ParsedAppRoute {
  const normalized = pathname.replace(/\/+$/, "").toLowerCase() || "/";
  if (normalized === "/") {
    return { pageView: "landing" };
  }
  if (normalized === "/login" || normalized === "/sign-in") {
    return { pageView: "login" };
  }
  if (normalized === "/my-profile") {
    return { pageView: "portal", moduleId: "M1" };
  }
  const matched = MODULES.find((m) => m.path === normalized);
  if (matched) {
    return { pageView: "portal", moduleId: matched.id };
  }
  return { pageView: "landing" };
}

/**
 * Returns role-appropriate navigation groups.
 * Isolates Non-Teaching Personnel from instructional teaching tasks
 * while preserving full access to Memos, Organizations, Leave, Calendar, and Profile.
 */
export function getNavGroupsForRole(role?: string): NavGroupDef[] {
  if (role === "Non-Teaching") {
    return [
      {
        title: "Admin",
        modules: [
          { id: "M5", name: "School Memos", path: MODULE_PATHS.M5, icon: <Bell className="w-4 h-4" /> },
          { id: "M10", name: "Calendar & SF2", path: MODULE_PATHS.M10, icon: <CalendarCheck2 className="w-4 h-4" /> },
          { id: "M1", name: "My Profile", path: "/my-profile", icon: <Shield className="w-4 h-4" /> },
        ],
      },
      {
        title: "Personnel",
        modules: [
          { id: "M6", name: "Organizations", path: MODULE_PATHS.M6, icon: <Briefcase className="w-4 h-4" /> },
          { id: "M9", name: "Leave & Relief", path: MODULE_PATHS.M9, icon: <Send className="w-4 h-4" /> },
        ],
      },
      {
        title: "Portals",
        modules: [
          { id: "M11", name: "School Portals", path: MODULE_PATHS.M11, icon: <Globe className="w-4 h-4" /> },
        ],
      },
    ];
  }

  if (role === "Teacher") {
    return [
      {
        title: "Academic",
        modules: [
          { id: "M2", name: "Lesson Plans", path: MODULE_PATHS.M2, icon: <FileText className="w-4 h-4" /> },
          { id: "M3", name: "Schedule", path: MODULE_PATHS.M3, icon: <Calendar className="w-4 h-4" /> },
          { id: "M4", name: "Item Analysis", path: MODULE_PATHS.M4, icon: <BarChart3 className="w-4 h-4" /> },
          { id: "M7", name: "Classes, ECR & SF9", path: MODULE_PATHS.M7, icon: <GraduationCap className="w-4 h-4" /> },
        ],
      },
      {
        title: "Personnel",
        modules: [
          { id: "M8", name: "RPMS & COT", path: MODULE_PATHS.M8, icon: <Award className="w-4 h-4" /> },
          { id: "M9", name: "Leave & Relief", path: MODULE_PATHS.M9, icon: <Send className="w-4 h-4" /> },
          { id: "M6", name: "Organizations", path: MODULE_PATHS.M6, icon: <Briefcase className="w-4 h-4" /> },
        ],
      },
      {
        title: "Admin",
        modules: [
          { id: "M1", name: "My Profile", path: "/my-profile", icon: <Shield className="w-4 h-4" /> },
          { id: "M5", name: "School Memos", path: MODULE_PATHS.M5, icon: <Bell className="w-4 h-4" /> },
          { id: "M10", name: "Calendar & SF2", path: MODULE_PATHS.M10, icon: <CalendarCheck2 className="w-4 h-4" /> },
        ],
      },
      {
        title: "Portals",
        modules: [
          { id: "M11", name: "School Portals", path: MODULE_PATHS.M11, icon: <Globe className="w-4 h-4" /> },
        ],
      },
    ];
  }

  // Super Admin and School Head
  return NAV_GROUPS;
}
