import React from "react";
import { LandingNavbar } from "../components/landing/LandingNavbar";
import { HeroSection } from "../components/landing/HeroSection";
import { EcosystemBentoSection } from "../components/landing/EcosystemBentoSection";
import { BulletinMilestonesSection } from "../components/landing/BulletinMilestonesSection";
import { LandingFooter } from "../components/landing/LandingFooter";

interface LandingPageProps {
  isAuthenticated?: boolean;
  userName?: string | null;
  onEnterPortal?: () => void;
  onSignIn: () => void;
  onSignOut?: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  isAuthenticated = false,
  userName,
  onEnterPortal,
  onSignIn,
  onSignOut,
}) => {
  return (
    <div className="min-h-screen bg-linen-textured text-[#1C2420] flex flex-col overflow-x-clip">
      <a
        href="#landing-main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:px-4 focus:py-2 focus:rounded-lg focus:bg-[#0F3D2E] focus:text-[#FFFFFF] focus:text-sm focus:font-semibold"
      >
        Skip to content
      </a>

      <LandingNavbar
        isAuthenticated={isAuthenticated}
        userName={userName}
        onEnterPortal={onEnterPortal}
        onSignIn={onSignIn}
        onSignOut={onSignOut}
      />

      <main id="landing-main" className="flex-1">
        <HeroSection
          isAuthenticated={isAuthenticated}
          onEnterPortal={onEnterPortal}
          onSignIn={onSignIn}
        />
        <EcosystemBentoSection />
        <BulletinMilestonesSection />
      </main>

      <LandingFooter
        isAuthenticated={isAuthenticated}
        onEnterPortal={onEnterPortal}
        onSignIn={onSignIn}
      />
    </div>
  );
};
