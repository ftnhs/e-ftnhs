import React, { useState, useEffect } from "react";
import type { ModuleId } from "../../types";
import { supabase } from "../../lib/supabase";
import { SkipToContent } from "../common/SkipToContent";
import { OfflineBanner } from "../common/OfflineBanner";
import { TopNavbar } from "../navigation/TopNavbar";
import { DesktopSidebar } from "../navigation/DesktopSidebar";
import { MobileDrawer } from "../navigation/MobileDrawer";
import { MobileBottomNav } from "../navigation/MobileBottomNav";

interface AppShellProps {
  activeModule: ModuleId;
  onSelectModule: (id: ModuleId) => void;
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({
  activeModule,
  onSelectModule,
  children,
}) => {
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [activeTermLabel, setActiveTermLabel] = useState<string>("SY 2026-2027 • Term 2");

  useEffect(() => {
    let mounted = true;
    const loadActiveTerm = async () => {
      try {
        const { data } = await supabase
          .from("academic_terms")
          .select("school_year, term_number")
          .eq("is_active", true)
          .limit(1)
          .single();
        if (mounted && data) {
          setActiveTermLabel(`SY ${data.school_year} • Term ${data.term_number}`);
        }
      } catch {
        // Retain fallback label if offline
      }
    };
    loadActiveTerm();
    return () => {
      mounted = false;
    };
  }, [activeModule]);

  return (
    <div className="min-h-screen md:h-screen md:overflow-hidden bg-linen-textured text-[#1C2420] flex flex-col antialiased print:min-h-0 print:h-auto print:overflow-visible print:bg-white">
      <SkipToContent />
      <OfflineBanner />

      {/* 1. Global Header / Top Navbar */}
      <TopNavbar
        onOpenMobileDrawer={() => setMobileDrawerOpen(true)}
        onNavigateToProfile={() => onSelectModule("M1")}
        activeTermLabel={activeTermLabel}
      />

      {/* 2. Middle Body Layout */}
      <div className="flex-1 min-h-0 flex overflow-hidden print:block print:overflow-visible">
        {/* Desktop Sidebar (260px) */}
        <DesktopSidebar
          activeModule={activeModule}
          onSelectModule={onSelectModule}
        />

        {/* Main Content Landmark */}
        <main
          id="main-content"
          tabIndex={-1}
          className="flex-1 overflow-y-auto pb-24 md:pb-8 focus:outline-none print:overflow-visible print:pb-0"
        >
          {children}
        </main>
      </div>

      {/* 3. Mobile Slide-Over Drawer Navigation */}
      <MobileDrawer
        isOpen={mobileDrawerOpen}
        onClose={() => setMobileDrawerOpen(false)}
        activeModule={activeModule}
        onSelectModule={onSelectModule}
      />

      {/* 4. Mobile Bottom Navigation Bar (44x44px touch targets) */}
      <MobileBottomNav
        activeModule={activeModule}
        onSelectModule={onSelectModule}
        onOpenMore={() => setMobileDrawerOpen(true)}
      />
    </div>
  );
};
