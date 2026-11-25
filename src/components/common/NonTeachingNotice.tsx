import React from "react";
import type { ModuleId } from "../../types";
import { ShieldAlert, Bell, Briefcase, Send, CalendarCheck2, ArrowRight } from "lucide-react";

interface NonTeachingNoticeProps {
  moduleName: string;
  onSelectModule: (id: ModuleId) => void;
}

export const NonTeachingNotice: React.FC<NonTeachingNoticeProps> = ({
  moduleName,
  onSelectModule,
}) => {
  const links: { id: ModuleId; label: string; icon: React.ReactNode }[] = [
    { id: "M5", label: "School Memos", icon: <Bell className="w-4 h-4" /> },
    { id: "M6", label: "Organizations", icon: <Briefcase className="w-4 h-4" /> },
    { id: "M9", label: "Leave & Relief", icon: <Send className="w-4 h-4" /> },
    { id: "M10", label: "Calendar & SF2", icon: <CalendarCheck2 className="w-4 h-4" /> },
  ];

  return (
    <div className="p-4 sm:p-8 max-w-3xl mx-auto my-6">
      <div className="bg-[#FFFFFF] border border-[#E3DDD1] rounded-xl p-6 sm:p-8 space-y-6">
        <div className="flex items-center gap-4 border-b border-[#E3DDD1] pb-5">
          <div className="w-12 h-12 rounded-xl bg-[#FBECEF] border border-[#F3B8C2] flex items-center justify-center text-[#9E1B32] shrink-0">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-[#1C2420] font-display">
              Instructional Module Restricted
            </h2>
            <p className="text-xs text-[#5C6660] mt-0.5">
              {moduleName} is reserved for instructional faculty.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {links.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectModule(item.id)}
              className="p-3.5 bg-[#FAF8F5] border border-[#E3DDD1] hover:border-[#0F3D2E] rounded-xl flex items-center justify-between text-left cursor-pointer transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[#E6EFEA] text-[#0F3D2E] rounded-lg">
                  {item.icon}
                </div>
                <span className="text-sm font-medium text-[#1C2420]">{item.label}</span>
              </div>
              <ArrowRight className="w-4 h-4 text-[#5C6660] group-hover:text-[#0F3D2E] transition-colors" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
