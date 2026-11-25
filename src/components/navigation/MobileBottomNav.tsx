import React from "react";
import type { ModuleId } from "../../types";
import { useAuth } from "../../context/AuthContext";
import { FileText, Calendar, Shield, Bell, Briefcase, Send, CalendarCheck2, MoreHorizontal } from "lucide-react";

interface MobileBottomNavProps {
  activeModule: ModuleId;
  onSelectModule: (id: ModuleId) => void;
  onOpenMore: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeModule,
  onSelectModule,
  onOpenMore,
}) => {
  const { profile } = useAuth();
  const isNonTeaching = profile?.role === "Non-Teaching";

  const btnClass = (isActive: boolean) =>
    `flex flex-col items-center justify-center min-w-[44px] min-h-[44px] p-1 rounded-lg text-[11px] transition-colors cursor-pointer whitespace-nowrap ${
      isActive
        ? "text-[#0F3D2E] font-semibold"
        : "text-[#5C6660] font-medium hover:text-[#1C2420]"
    }`;

  if (isNonTeaching) {
    return (
      <nav
        aria-label="Mobile Navigation Bar"
        className="print:hidden md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#FFFFFF] border-t border-[#E3DDD1] px-2 py-1 flex items-center justify-around shadow-sm"
      >
        <button type="button" onClick={() => onSelectModule("M5")} className={btnClass(activeModule === "M5")} aria-label="School Memos" aria-current={activeModule === "M5" ? "page" : undefined}>
          <Bell className="w-5 h-5 mb-0.5" />
          <span>Memos</span>
        </button>
        <button type="button" onClick={() => onSelectModule("M6")} className={btnClass(activeModule === "M6")} aria-label="Organizations" aria-current={activeModule === "M6" ? "page" : undefined}>
          <Briefcase className="w-5 h-5 mb-0.5" />
          <span>Orgs</span>
        </button>
        <button type="button" onClick={() => onSelectModule("M9")} className={btnClass(activeModule === "M9")} aria-label="Leave & Relief" aria-current={activeModule === "M9" ? "page" : undefined}>
          <Send className="w-5 h-5 mb-0.5" />
          <span>Leave</span>
        </button>
        <button type="button" onClick={() => onSelectModule("M10")} className={btnClass(activeModule === "M10")} aria-label="Calendar & SF2" aria-current={activeModule === "M10" ? "page" : undefined}>
          <CalendarCheck2 className="w-5 h-5 mb-0.5" />
          <span>Calendar</span>
        </button>
        <button type="button" onClick={onOpenMore} className={btnClass(false)} aria-label="Open more navigation modules">
          <MoreHorizontal className="w-5 h-5 mb-0.5" />
          <span>More</span>
        </button>
      </nav>
    );
  }

  return (
    <nav
      aria-label="Mobile Navigation Bar"
      className="print:hidden md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#FFFFFF] border-t border-[#E3DDD1] px-2 py-1 flex items-center justify-around shadow-sm"
    >
      <button type="button" onClick={() => onSelectModule("M2")} className={btnClass(activeModule === "M2")} aria-label="Lesson Plans" aria-current={activeModule === "M2" ? "page" : undefined}>
        <FileText className="w-5 h-5 mb-0.5" />
        <span>Lesson Plans</span>
      </button>
      <button type="button" onClick={() => onSelectModule("M3")} className={btnClass(activeModule === "M3")} aria-label="Schedule" aria-current={activeModule === "M3" ? "page" : undefined}>
        <Calendar className="w-5 h-5 mb-0.5" />
        <span>Schedule</span>
      </button>
      <button type="button" onClick={() => onSelectModule("M1")} className={btnClass(activeModule === "M1")} aria-label="Admin" aria-current={activeModule === "M1" ? "page" : undefined}>
        <Shield className="w-5 h-5 mb-0.5" />
        <span>Admin</span>
      </button>
      <button type="button" onClick={() => onSelectModule("M5")} className={btnClass(activeModule === "M5")} aria-label="School Memos" aria-current={activeModule === "M5" ? "page" : undefined}>
        <Bell className="w-5 h-5 mb-0.5" />
        <span>Memos</span>
      </button>
      <button type="button" onClick={onOpenMore} className={btnClass(false)} aria-label="Open more navigation modules">
        <MoreHorizontal className="w-5 h-5 mb-0.5" />
        <span>More</span>
      </button>
    </nav>
  );
};
