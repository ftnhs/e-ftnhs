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
} from "lucide-react";

export interface NavModuleDef {
  id: ModuleId;
  name: string;
  icon: React.ReactNode;
}

export interface NavGroupDef {
  title: string;
  modules: NavModuleDef[];
}

export const NAV_GROUPS: NavGroupDef[] = [
  {
    title: "Academic",
    modules: [
      { id: "M2", name: "Lesson Plans", icon: <FileText className="w-4 h-4" /> },
      { id: "M3", name: "Schedule", icon: <Calendar className="w-4 h-4" /> },
      { id: "M4", name: "Item Analysis", icon: <BarChart3 className="w-4 h-4" /> },
      { id: "M7", name: "Classes, ECR & SF9", icon: <GraduationCap className="w-4 h-4" /> },
    ],
  },
  {
    title: "Personnel",
    modules: [
      { id: "M8", name: "RPMS & COT", icon: <Award className="w-4 h-4" /> },
      { id: "M9", name: "Leave & Relief", icon: <Send className="w-4 h-4" /> },
      { id: "M6", name: "Organizations", icon: <Briefcase className="w-4 h-4" /> },
    ],
  },
  {
    title: "Admin",
    modules: [
      { id: "M1", name: "Admin & Settings", icon: <Shield className="w-4 h-4" /> },
      { id: "M5", name: "School Memos", icon: <Bell className="w-4 h-4" /> },
      { id: "M10", name: "Calendar & SF2", icon: <CalendarCheck2 className="w-4 h-4" /> },
    ],
  },
];

export const MODULES: NavModuleDef[] = NAV_GROUPS.flatMap((g) => g.modules);

export function getModuleById(id: ModuleId): NavModuleDef | undefined {
  return MODULES.find((m) => m.id === id);
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
          { id: "M5", name: "School Memos", icon: <Bell className="w-4 h-4" /> },
          { id: "M10", name: "Calendar & SF2", icon: <CalendarCheck2 className="w-4 h-4" /> },
          { id: "M1", name: "My Profile", icon: <Shield className="w-4 h-4" /> },
        ],
      },
      {
        title: "Personnel",
        modules: [
          { id: "M6", name: "Organizations", icon: <Briefcase className="w-4 h-4" /> },
          { id: "M9", name: "Leave & Relief", icon: <Send className="w-4 h-4" /> },
        ],
      },
    ];
  }

  if (role === "Teacher") {
    return [
      {
        title: "Academic",
        modules: [
          { id: "M2", name: "Lesson Plans", icon: <FileText className="w-4 h-4" /> },
          { id: "M3", name: "Schedule", icon: <Calendar className="w-4 h-4" /> },
          { id: "M4", name: "Item Analysis", icon: <BarChart3 className="w-4 h-4" /> },
          { id: "M7", name: "Classes, ECR & SF9", icon: <GraduationCap className="w-4 h-4" /> },
        ],
      },
      {
        title: "Personnel",
        modules: [
          { id: "M8", name: "RPMS & COT", icon: <Award className="w-4 h-4" /> },
          { id: "M9", name: "Leave & Relief", icon: <Send className="w-4 h-4" /> },
          { id: "M6", name: "Organizations", icon: <Briefcase className="w-4 h-4" /> },
        ],
      },
      {
        title: "Admin",
        modules: [
          { id: "M1", name: "My Profile", icon: <Shield className="w-4 h-4" /> },
          { id: "M5", name: "School Memos", icon: <Bell className="w-4 h-4" /> },
          { id: "M10", name: "Calendar & SF2", icon: <CalendarCheck2 className="w-4 h-4" /> },
        ],
      },
    ];
  }

  // Super Admin and School Head
  return NAV_GROUPS;
}
