import React from "react";
import { motion } from "motion/react";
import { ArrowRight, LogIn, LayoutDashboard } from "lucide-react";
import { useReducedMotion } from "../../hooks/useReducedMotion";
import { HERO_METRICS } from "./landingData";
import { LivingSystemStage } from "./LivingSystemStage";

interface HeroSectionProps {
  isAuthenticated?: boolean;
  onEnterPortal?: () => void;
  onSignIn: () => void;
}

const HEADLINE_LINES = [
  "Institutional Command",
  "for Every Classroom",
  "at Fermin Tayabas.",
];

export const HeroSection: React.FC<HeroSectionProps> = ({
  isAuthenticated = false,
  onEnterPortal,
  onSignIn,
}) => {
  const shouldReduceMotion = useReducedMotion();

  const scrollToEcosystem = () => {
    const el = document.querySelector("#ecosystem");
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <section
      id="top"
      className="relative overflow-hidden border-b border-[#E3DDD1] pt-10 pb-16 sm:pt-14 sm:pb-24"
    >
      {/* Subtle Architectural Linen Hairlines (Pure CSS, Zero Blobs) */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#0F3D2E]/20 to-transparent"
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
          {/* Left Column: Staggered Editorial Typography & Static Metrics */}
          <div className="lg:col-span-6 space-y-7">
            {/* Location Eyebrow */}
            <motion.div
              initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              className="inline-flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-[#E6EFEA] border border-[#B8CEC5] text-xs font-semibold text-[#0F3D2E]"
            >
              <span className="w-2 h-2 rounded-full bg-[#9E1B32]" aria-hidden="true" />
              <span>Cabayugan, Calape, Bohol • DepEd Region VII</span>
            </motion.div>

            {/* Staggered Masked Editorial Serif Display Headline */}
            <h1 className="font-editorial text-4xl sm:text-5xl xl:text-[3.5rem] font-semibold leading-[1.06] tracking-tight text-[#1C2420]">
              {HEADLINE_LINES.map((line, idx) => (
                <span key={line} className="block overflow-hidden">
                  <motion.span
                    className={`block ${idx === 2 ? "italic text-[#0F3D2E]" : ""}`}
                    initial={shouldReduceMotion ? { opacity: 1 } : { y: "105%", opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={
                      shouldReduceMotion
                        ? { duration: 0 }
                        : {
                            duration: 0.62,
                            delay: 0.08 + idx * 0.1,
                            ease: [0.22, 1, 0.36, 1],
                          }
                    }
                  >
                    {line}
                  </motion.span>
                </span>
              ))}
            </h1>

            {/* Institutional Subcopy */}
            <motion.p
              initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={
                shouldReduceMotion
                  ? { duration: 0 }
                  : { duration: 0.55, delay: 0.32, ease: [0.22, 1, 0.36, 1] }
              }
              className="text-base sm:text-lg text-[#5C6660] max-w-xl leading-relaxed"
            >
              Unified scheduling, grading, and school operations for Fermin Tayabas NHS.
            </motion.p>

            {/* Primary & Secondary CTAs */}
            <motion.div
              initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={
                shouldReduceMotion
                  ? { duration: 0 }
                  : { duration: 0.55, delay: 0.4, ease: [0.22, 1, 0.36, 1] }
              }
              className="flex flex-wrap items-center gap-3"
            >
              <button
                type="button"
                onClick={isAuthenticated ? (onEnterPortal || onSignIn) : onSignIn}
                className="inline-flex items-center justify-center gap-2.5 px-6 py-3 min-h-[46px] rounded-xl bg-[#0F3D2E] hover:bg-[#0A2E22] text-[#FFFFFF] text-sm font-semibold shadow-sm transition-colors cursor-pointer"
              >
                {isAuthenticated ? (
                  <>
                    <LayoutDashboard className="w-4 h-4 shrink-0" aria-hidden="true" />
                    <span>Enter Faculty Portal</span>
                  </>
                ) : (
                  <>
                    <LogIn className="w-4 h-4 shrink-0" aria-hidden="true" />
                    <span>Faculty Sign In</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={scrollToEcosystem}
                className="inline-flex items-center justify-center gap-2 px-5 py-3 min-h-[46px] rounded-xl bg-[#FFFFFF] hover:bg-[#FAF8F5] text-[#1C2420] border border-[#E3DDD1] text-sm font-semibold transition-colors cursor-pointer"
              >
                <span>Explore Workflows</span>
                <ArrowRight className="w-4 h-4 text-[#0F3D2E] shrink-0" aria-hidden="true" />
              </button>
            </motion.div>

            {/* 3 Static Institutional Highlights (Zero Live DB Fetches) */}
            <motion.dl
              initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={
                shouldReduceMotion
                  ? { duration: 0 }
                  : { duration: 0.55, delay: 0.48, ease: [0.22, 1, 0.36, 1] }
              }
              className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6 border-t border-[#E3DDD1]"
            >
              {HERO_METRICS.map((metric) => (
                <div
                  key={metric.code}
                  className="bg-[#FFFFFF]/80 border border-[#E3DDD1] rounded-xl px-4 py-3"
                >
                  <dt className="font-mono text-base font-semibold text-[#0F3D2E] tracking-tight">
                    {metric.code}
                  </dt>
                  <dd className="text-xs text-[#5C6660] font-medium mt-0.5">
                    {metric.label}
                  </dd>
                </div>
              ))}
            </motion.dl>
          </div>

          {/* Right Column: Interactive 3D Living System Stage */}
          <motion.div
            initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 20, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={
              shouldReduceMotion
                ? { duration: 0 }
                : { duration: 0.7, delay: 0.2, ease: [0.22, 1, 0.36, 1] }
            }
            className="lg:col-span-6"
          >
            <LivingSystemStage />
          </motion.div>
        </div>
      </div>
    </section>
  );
};
