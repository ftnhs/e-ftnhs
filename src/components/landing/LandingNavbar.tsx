import React, { useEffect, useRef, useState } from "react";
import { Menu, X, LogIn, LogOut, LayoutDashboard, ArrowRight } from "lucide-react";

interface LandingNavbarProps {
  isAuthenticated?: boolean;
  userName?: string | null;
  onEnterPortal?: () => void;
  onSignIn: () => void;
  onSignOut?: () => void;
}

const NAV_LINKS = [
  { href: "#ecosystem", label: "Ecosystem" },
  { href: "#interactive-stage", label: "Interactive Stage" },
  { href: "#bulletin", label: "Bulletin" },
  { href: "#school-info", label: "School Info" },
];

export const LandingNavbar: React.FC<LandingNavbarProps> = ({
  isAuthenticated = false,
  userName,
  onEnterPortal,
  onSignIn,
  onSignOut,
}) => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const sheetRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (drawerOpen) {
      if (!dialog.open) {
        dialog.showModal();
      }
    } else if (dialog.open) {
      dialog.close();
    }
  }, [drawerOpen]);

  // Light-dismiss backdrop handler on <dialog> without JSX non-interactive click props
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    let pressedBackdrop = false;
    const isOutsideSheet = (e: PointerEvent) => {
      const sheet = sheetRef.current;
      if (!sheet) return false;
      const r = sheet.getBoundingClientRect();
      return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
    };

    const onPointerDown = (e: PointerEvent) => {
      pressedBackdrop = isOutsideSheet(e);
    };
    const onPointerUp = (e: PointerEvent) => {
      if (pressedBackdrop && isOutsideSheet(e)) {
        setDrawerOpen(false);
      }
      pressedBackdrop = false;
    };

    dialog.addEventListener("pointerdown", onPointerDown);
    dialog.addEventListener("pointerup", onPointerUp);
    return () => {
      dialog.removeEventListener("pointerdown", onPointerDown);
      dialog.removeEventListener("pointerup", onPointerUp);
    };
  }, []);

  const handleNavClick = (href: string) => {
    setDrawerOpen(false);
    const target = document.querySelector(href);
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <>
      <header className="sticky top-0 z-40 bg-[#0F3D2E]/95 backdrop-blur-md text-[#F4F1EA] border-b border-[#246A52]/70">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Left: FTNHS Seal & Brand Identity */}
          <a
            href="#top"
            className="flex items-center gap-3 min-w-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F4F1EA] rounded-lg"
          >
            <div className="w-9 h-9 rounded-full bg-[#F4F1EA] p-1 flex items-center justify-center shrink-0">
              <img
                src="/images/Official Logos/Fermin_logo.png"
                alt="Fermin Tayabas National High School Seal"
                className="w-full h-full object-contain"
              />
            </div>
            <div className="flex items-center gap-2 min-w-0">
              <span className="font-bold text-base sm:text-lg tracking-tight text-[#F4F1EA] font-display whitespace-nowrap">
                e-FTNHS
              </span>
              <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-md bg-[#18523F] border border-[#246A52] font-mono text-[11px] font-medium text-[#B8CEC5] whitespace-nowrap">
                ID 302851
              </span>
            </div>
          </a>

          {/* Center: Desktop Anchor Navigation */}
          <nav aria-label="Landing Page Sections" className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="px-3.5 py-2 rounded-lg text-sm font-medium text-[#B8CEC5] hover:text-[#F4F1EA] hover:bg-[#18523F] transition-colors whitespace-nowrap"
              >
                {link.label}
              </a>
            ))}
          </nav>

          {/* Right: Portal / Sign In CTA & Mobile Drawer Trigger */}
          <div className="flex items-center gap-2 shrink-0">
            {isAuthenticated ? (
              <>
                <button
                  type="button"
                  onClick={onEnterPortal || onSignIn}
                  className="hidden sm:inline-flex items-center gap-2 px-4 py-2 min-h-[44px] rounded-lg bg-[#F4F1EA] hover:bg-[#FFFFFF] text-[#0F3D2E] text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap shadow-xs"
                >
                  <LayoutDashboard className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span>Faculty Portal</span>
                </button>
                {onSignOut && (
                  <button
                    type="button"
                    onClick={onSignOut}
                    aria-label="Sign out of e-FTNHS"
                    title="Sign out"
                    className="hidden sm:inline-flex items-center justify-center min-w-[44px] min-h-[44px] p-2 rounded-lg bg-[#18523F] hover:bg-[#9E1B32] border border-[#246A52] text-[#F4F1EA] transition-colors cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" aria-hidden="true" />
                  </button>
                )}
              </>
            ) : (
              <button
                type="button"
                onClick={onSignIn}
                className="hidden sm:inline-flex items-center gap-2 px-4 py-2 min-h-[44px] rounded-lg bg-[#F4F1EA] hover:bg-[#FFFFFF] text-[#0F3D2E] text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap shadow-xs"
              >
                <LogIn className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>Faculty Sign In</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              aria-label="Open navigation menu"
              aria-expanded={drawerOpen}
              aria-controls="landing-mobile-drawer"
              className="md:hidden inline-flex items-center justify-center min-w-[44px] min-h-[44px] p-2 rounded-lg bg-[#18523F] border border-[#246A52] text-[#F4F1EA] hover:bg-[#1F664F] transition-colors cursor-pointer"
            >
              <Menu className="w-5 h-5" aria-hidden="true" />
            </button>
          </div>
        </div>
      </header>

      {/* Native Modal Navigation Drawer for Mobile (< 768px) */}
      <dialog
        ref={dialogRef}
        id="landing-mobile-drawer"
        aria-label="Mobile Navigation Menu"
        onClose={() => setDrawerOpen(false)}
        className="md:hidden fixed inset-0 m-0 p-0 max-w-none max-h-none w-screen h-dvh bg-transparent backdrop:bg-[#1C2420]/60 backdrop:backdrop-blur-xs"
      >
        <div
          ref={sheetRef}
          className="ml-auto w-[min(86vw,22rem)] h-full bg-[#0F3D2E] text-[#F4F1EA] border-l border-[#246A52] flex flex-col justify-between p-5 shadow-2xl"
        >
          <div className="space-y-6">
            <div className="flex items-center justify-between gap-3 pb-4 border-b border-[#18523F]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-[#F4F1EA] p-0.5 flex items-center justify-center shrink-0">
                  <img
                    src="/images/Official Logos/Fermin_logo.png"
                    alt="FTNHS Seal"
                    className="w-full h-full object-contain"
                  />
                </div>
                <div>
                  <span className="font-bold text-sm block text-[#F4F1EA]">e-FTNHS</span>
                  <span className="font-mono text-[11px] text-[#B8CEC5]">ID 302851</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                aria-label="Close navigation menu"
                className="inline-flex items-center justify-center min-w-[44px] min-h-[44px] rounded-lg text-[#B8CEC5] hover:text-[#F4F1EA] hover:bg-[#18523F] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>

            <nav aria-label="Mobile Section Links" className="flex flex-col gap-1.5">
              {NAV_LINKS.map((link) => (
                <button
                  key={link.href}
                  type="button"
                  onClick={() => handleNavClick(link.href)}
                  className="w-full min-h-[44px] px-3.5 py-2.5 rounded-lg text-left text-sm font-medium text-[#F4F1EA] hover:bg-[#18523F] transition-colors flex items-center justify-between cursor-pointer"
                >
                  <span>{link.label}</span>
                  <ArrowRight className="w-4 h-4 text-[#B8CEC5]" aria-hidden="true" />
                </button>
              ))}
            </nav>
          </div>

          <div className="pt-4 border-t border-[#18523F] space-y-3">
            {isAuthenticated ? (
              <>
                {userName && (
                  <p className="text-xs text-[#B8CEC5] text-center truncate">
                    Signed in as <strong className="text-[#F4F1EA]">{userName}</strong>
                  </p>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setDrawerOpen(false);
                    (onEnterPortal || onSignIn)();
                  }}
                  className="w-full min-h-[44px] px-4 py-3 rounded-lg bg-[#F4F1EA] hover:bg-[#FFFFFF] text-[#0F3D2E] text-sm font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <LayoutDashboard className="w-4 h-4" aria-hidden="true" />
                  <span>Enter Faculty Portal</span>
                </button>
                {onSignOut && (
                  <button
                    type="button"
                    onClick={() => {
                      setDrawerOpen(false);
                      onSignOut();
                    }}
                    className="w-full min-h-[44px] px-4 py-2.5 rounded-lg bg-[#9E1B32] hover:bg-[#7F1528] text-[#FFFFFF] text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" aria-hidden="true" />
                    <span>Sign Out</span>
                  </button>
                )}
              </>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setDrawerOpen(false);
                  onSignIn();
                }}
                className="w-full min-h-[44px] px-4 py-3 rounded-lg bg-[#F4F1EA] hover:bg-[#FFFFFF] text-[#0F3D2E] text-sm font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <LogIn className="w-4 h-4" aria-hidden="true" />
                <span>Faculty Sign In</span>
              </button>
            )}
            <p className="text-[11px] text-[#B8CEC5] text-center">
              Cabayugan, Calape, Bohol • DepEd Region VII
            </p>
          </div>
        </div>
      </dialog>
    </>
  );
};
