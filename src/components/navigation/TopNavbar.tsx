import React from "react";
import { useAuth } from "../../context/AuthContext";
import { School, LogOut, Menu } from "lucide-react";

interface TopNavbarProps {
  onOpenMobileDrawer: () => void;
  onNavigateToProfile?: () => void;
  activeTermLabel?: string;
}

export const TopNavbar: React.FC<TopNavbarProps> = ({
  onOpenMobileDrawer,
  onNavigateToProfile,
  activeTermLabel = "SY 2026-2027 • Term 2",
}) => {
  const { profile, logout } = useAuth();

  return (
    <header className="print:hidden sticky top-0 z-40 bg-[#0F3D2E] text-[#F4F1EA] border-b border-[#0A2E22] px-4 sm:px-6 h-14 flex items-center justify-between">
      {/* Brand & Mobile Hamburger */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onOpenMobileDrawer}
          className="md:hidden p-2 rounded-lg text-[#B8CEC5] hover:bg-[#18523F] hover:text-[#F4F1EA] cursor-pointer transition-colors"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#18523F] border border-[#B8CEC5]/20 flex items-center justify-center text-[#F4F1EA]">
            <School className="w-4 h-4" aria-hidden="true" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-bold text-base tracking-tight font-display text-[#F4F1EA]">
              e-FTNHS
            </span>
            <span className="text-xs font-medium text-[#B8CEC5] hidden sm:inline">
              Fermin Tayabas National High School
            </span>
          </div>
        </div>
      </div>

      {/* Center: Active Term Pill */}
      <div className="hidden lg:flex items-center gap-2 px-3 py-1 bg-[#18523F] border border-[#B8CEC5]/25 rounded-full text-xs font-medium text-[#F4F1EA]">
        <span className="w-2 h-2 rounded-full bg-[#9E1B32] ring-1 ring-[#F4F1EA]/70" aria-hidden="true" />
        <span className="whitespace-nowrap">{activeTermLabel}</span>
      </div>

      {/* Right Actions: User Profile & Sign Out */}
      <div className="flex items-center gap-2 sm:gap-3">
        <button
          type="button"
          onClick={onNavigateToProfile}
          className="flex items-center gap-2.5 px-2 py-1 rounded-lg hover:bg-[#18523F] transition-colors cursor-pointer text-left"
          title="View & Edit My Profile"
          aria-label="View and edit my profile details"
        >
          <div className="w-7 h-7 rounded-full bg-[#18523F] border border-[#B8CEC5]/30 text-[#F4F1EA] flex items-center justify-center font-semibold text-xs uppercase shrink-0">
            {profile?.full_name?.charAt(0) || "U"}
          </div>
          <div className="hidden sm:block text-left text-xs leading-tight">
            <span className="font-semibold text-[#F4F1EA] block max-w-[160px] truncate">
              {profile?.full_name || "Faculty"}
            </span>
            <span className="text-[11px] text-[#B8CEC5] font-medium block">
              {profile?.role || "Teacher"}
            </span>
          </div>
        </button>

        <div className="h-5 w-px bg-[#18523F]" aria-hidden="true" />

        <button
          type="button"
          onClick={logout}
          className="p-2 text-[#B8CEC5] hover:text-[#FFFFFF] rounded-lg hover:bg-[#9E1B32] transition-colors cursor-pointer"
          aria-label="Sign out of e-FTNHS"
          title="Sign out"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
