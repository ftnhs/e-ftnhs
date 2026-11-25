import React from "react";
import { LogIn, LayoutDashboard, MapPin, Building2 } from "lucide-react";

interface LandingFooterProps {
  isAuthenticated?: boolean;
  onEnterPortal?: () => void;
  onSignIn: () => void;
}

export const LandingFooter: React.FC<LandingFooterProps> = ({
  isAuthenticated = false,
  onEnterPortal,
  onSignIn,
}) => {
  return (
    <footer
      id="school-info"
      className="bg-[#0F3D2E] text-[#F4F1EA] border-t border-[#246A52]"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-14 space-y-10">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
          {/* Institutional Seal & Identity */}
          <div className="md:col-span-6 space-y-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-full bg-[#F4F1EA] p-1 flex items-center justify-center shrink-0">
                <img
                  src="/images/Official Logos/Fermin_logo.png"
                  alt="Fermin Tayabas National High School Seal"
                  className="w-full h-full object-contain"
                />
              </div>
              <div>
                <h2 className="font-editorial text-xl font-semibold text-[#F4F1EA]">
                  Fermin Tayabas National High School
                </h2>
                <p className="font-mono text-xs text-[#B8CEC5]">
                  School ID: 302851 • e-FTNHS Portal
                </p>
              </div>
            </div>

            <div className="space-y-1.5 text-xs sm:text-sm text-[#B8CEC5]">
              <p className="flex items-center gap-2">
                <MapPin className="w-4 h-4 shrink-0 text-[#B8CEC5]" aria-hidden="true" />
                <span>Cabayugan, Calape, Bohol, Philippines</span>
              </p>
              <p className="flex items-center gap-2">
                <Building2 className="w-4 h-4 shrink-0 text-[#B8CEC5]" aria-hidden="true" />
                <span>Department of Education • Region VII (Central Visayas) • Division of Bohol</span>
              </p>
            </div>
          </div>

          {/* Official Emblems Strip (Clean Linen Frame — No Yellow/Amber Borders) */}
          <div className="md:col-span-3 space-y-3">
            <span className="font-mono text-[11px] uppercase tracking-wider text-[#B8CEC5] block">
              Institutional Alignment
            </span>
            <div className="flex items-center gap-2.5 flex-wrap">
              {[
                { src: "/images/Official Logos/Deped_Seal.png", alt: "DepEd Seal" },
                { src: "/images/Official Logos/Region7_logo.png", alt: "DepEd Region VII" },
                { src: "/images/Official Logos/sdoBohol_logo.png", alt: "SDO Bohol" },
              ].map((logo) => (
                <div
                  key={logo.src}
                  className="w-10 h-10 rounded-full bg-[#F4F1EA] p-1 flex items-center justify-center border border-[#246A52]"
                >
                  <img
                    src={logo.src}
                    alt={logo.alt}
                    className="w-full h-full object-contain"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Faculty Portal Entry */}
          <div className="md:col-span-3 space-y-3 md:text-right">
            <span className="font-mono text-[11px] uppercase tracking-wider text-[#B8CEC5] block">
              Authorized Personnel
            </span>
            <button
              type="button"
              onClick={isAuthenticated ? (onEnterPortal || onSignIn) : onSignIn}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 min-h-[44px] rounded-xl bg-[#F4F1EA] hover:bg-[#FFFFFF] text-[#0F3D2E] text-sm font-semibold transition-colors cursor-pointer"
            >
              {isAuthenticated ? (
                <>
                  <LayoutDashboard className="w-4 h-4" aria-hidden="true" />
                  <span>Enter Faculty Portal</span>
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" aria-hidden="true" />
                  <span>Faculty Sign In</span>
                </>
              )}
            </button>
          </div>
        </div>

        <div className="pt-6 border-t border-[#18523F] flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-[#B8CEC5]">
          <span>
            Fermin Tayabas National High School • School ID: 302851
          </span>
          <span className="font-mono">
            Grades 7–12 • JHS MATATAG &amp; SHS
          </span>
        </div>
      </div>
    </footer>
  );
};
