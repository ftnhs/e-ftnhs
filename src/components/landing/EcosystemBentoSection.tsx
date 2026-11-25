import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useReducedMotion } from "../../hooks/useReducedMotion";
import {
  ECOSYSTEM_PILLARS,
  ROLE_PERSPECTIVES,
  DEPED_FORMS_SHOWCASE,
  type RolePerspectiveId,
} from "./landingData";
import {
  Layers,
  UserCheck,
  FileSpreadsheet,
  CheckCircle2,
  BookOpen,
  Users,
  Shield,
} from "lucide-react";

const PILLAR_ICONS: Record<string, React.ReactNode> = {
  instruction: <BookOpen className="w-4 h-4 text-[#F4F1EA]" aria-hidden="true" />,
  personnel: <Users className="w-4 h-4 text-[#F4F1EA]" aria-hidden="true" />,
  administration: <Shield className="w-4 h-4 text-[#F4F1EA]" aria-hidden="true" />,
};

export const EcosystemBentoSection: React.FC = () => {
  const shouldReduceMotion = useReducedMotion();
  const [selectedRole, setSelectedRole] = useState<RolePerspectiveId>("school_head");
  const [selectedFormCode, setSelectedFormCode] = useState<string>("SF7");

  const activeRole =
    ROLE_PERSPECTIVES.find((r) => r.id === selectedRole) ?? ROLE_PERSPECTIVES[0];

  const handleRoleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>, idx: number) => {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      const next = ROLE_PERSPECTIVES[(idx + 1) % ROLE_PERSPECTIVES.length];
      if (next) setSelectedRole(next.id);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      const prev =
        ROLE_PERSPECTIVES[(idx - 1 + ROLE_PERSPECTIVES.length) % ROLE_PERSPECTIVES.length];
      if (prev) setSelectedRole(prev.id);
    }
  };

  return (
    <section id="ecosystem" className="py-16 sm:py-24 border-b border-[#E3DDD1]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        {/* Section Header */}
        <motion.div
          initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="max-w-2xl space-y-3"
        >
          <div className="inline-flex items-center gap-2 text-xs font-mono font-semibold uppercase tracking-wider text-[#9E1B32]">
            <Layers className="w-3.5 h-3.5" aria-hidden="true" />
            <span>10-Module Institutional Architecture</span>
          </div>
          <h2 className="font-editorial text-3xl sm:text-4xl font-semibold text-[#1C2420] leading-tight">
            One workspace for instruction, faculty & admin.
          </h2>
        </motion.div>

        {/* Asymmetric 12-Column Editorial Bento Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Card 1: Deep Bottle Green Anchor Card (Col 1–5) */}
          <motion.div
            initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            className="lg:col-span-5 bg-[#0F3D2E] text-[#F4F1EA] rounded-2xl border border-[#246A52] p-6 sm:p-7 flex flex-col justify-between gap-6 shadow-sm"
          >
            <div className="space-y-5">
              <div className="flex items-center justify-between gap-2 border-b border-[#18523F] pb-4">
                <span className="font-mono text-xs uppercase tracking-wider text-[#B8CEC5]">
                  Core Platform Pillars
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-semibold bg-[#18523F] text-[#F4F1EA] border border-[#246A52]">
                  3 Domains
                </span>
              </div>

              <div className="space-y-5">
                {ECOSYSTEM_PILLARS.map((pillar) => (
                  <div key={pillar.id} className="space-y-2">
                    <div className="flex items-center gap-2.5">
                      <span className="w-7 h-7 rounded-lg bg-[#18523F] border border-[#246A52] flex items-center justify-center shrink-0">
                        {PILLAR_ICONS[pillar.id]}
                      </span>
                      <h3 className="text-base font-semibold text-[#F4F1EA]">
                        {pillar.title}
                      </h3>
                    </div>
                    <p className="text-xs text-[#B8CEC5] leading-relaxed">
                      {pillar.summary}
                    </p>
                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                      {pillar.modules.map((mod) => (
                        <span
                          key={mod}
                          className="px-2 py-0.5 rounded-md bg-[#18523F] border border-[#246A52] text-[11px] font-medium text-[#F4F1EA]"
                        >
                          {mod}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-[#18523F] flex items-center justify-between text-xs text-[#B8CEC5]">
              <span>Role-Gated Supabase RLS</span>
              <span className="font-mono text-[#F4F1EA]">SY 2026–2027</span>
            </div>
          </motion.div>

          {/* Card 2: Interactive Role Switcher (Col 6–12) */}
          <motion.div
            initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.55, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
            className="lg:col-span-7 bg-[#FFFFFF] rounded-2xl border border-[#E3DDD1] p-6 sm:p-7 flex flex-col justify-between gap-6 shadow-xs"
          >
            <div className="space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E3DDD1] pb-4">
                <div className="flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-[#0F3D2E]" aria-hidden="true" />
                  <span className="text-xs font-mono uppercase tracking-wider text-[#5C6660] font-semibold">
                    Role Perspective
                  </span>
                </div>

                {/* Single-row scrollable Role Switcher */}
                <div
                  role="tablist"
                  aria-label="Inspect platform by user role"
                  className="flex items-center gap-1 p-1 rounded-xl bg-[#FAF8F5] border border-[#E3DDD1] overflow-x-auto no-scrollbar max-w-full"
                >
                  {ROLE_PERSPECTIVES.map((role, index) => {
                    const isSelected = selectedRole === role.id;
                    return (
                      <button
                        key={role.id}
                        type="button"
                        role="tab"
                        id={`role-tab-${role.id}`}
                        aria-selected={isSelected}
                        tabIndex={isSelected ? 0 : -1}
                        onClick={() => setSelectedRole(role.id)}
                        onKeyDown={(e) => handleRoleKeyDown(e, index)}
                        className={`relative px-3.5 py-2 min-h-[38px] rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                          isSelected
                            ? "text-[#FFFFFF]"
                            : "text-[#5C6660] hover:text-[#1C2420]"
                        }`}
                      >
                        {isSelected && (
                          <motion.span
                            layoutId={shouldReduceMotion ? undefined : "role-switcher-pill"}
                            transition={{ type: "spring", stiffness: 360, damping: 30 }}
                            className="absolute inset-0 rounded-lg bg-[#0F3D2E]"
                            aria-hidden="true"
                          />
                        )}
                        <span className="relative z-10">{role.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {activeRole && (
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeRole.id}
                    role="tabpanel"
                    aria-labelledby={`role-tab-${activeRole.id}`}
                    initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-5"
                  >
                    <div className="space-y-1.5">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#E6EFEA] text-[#0F3D2E]">
                        {activeRole.badge}
                      </span>
                      <h3 className="text-lg sm:text-xl font-semibold text-[#1C2420] leading-snug">
                        {activeRole.headline}
                      </h3>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      {activeRole.capabilities.map((cap) => (
                        <div
                          key={cap.module}
                          className="p-4 rounded-xl bg-[#FAF8F5] border border-[#E3DDD1] space-y-1.5"
                        >
                          <div className="flex items-center gap-2 text-xs font-bold text-[#0F3D2E]">
                            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                            <span>{cap.module}</span>
                          </div>
                          <p className="text-xs text-[#5C6660] leading-relaxed">
                            {cap.detail}
                          </p>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                </AnimatePresence>
              )}
            </div>

            <div className="pt-4 border-t border-[#E3DDD1] flex flex-wrap items-center justify-between gap-2 text-xs text-[#5C6660]">
              <span>Non-teaching staff cleanly isolated from instructional modules.</span>
              <span className="font-mono text-[#9E1B32] font-semibold">Strict RBAC</span>
            </div>
          </motion.div>

          {/* Card 3: Interactive DepEd Forms Showcase (Full 12-Col Bento Strip) */}
          <motion.div
            initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.15 }}
            transition={{ duration: 0.55, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
            className="lg:col-span-12 bg-[#FFFFFF] rounded-2xl border border-[#E3DDD1] p-6 sm:p-8 space-y-6 shadow-xs"
          >
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 border-b border-[#E3DDD1] pb-4">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-2 text-xs font-mono font-semibold uppercase tracking-wider text-[#0F3D2E]">
                  <FileSpreadsheet className="w-4 h-4" aria-hidden="true" />
                  <span>Print-Ready Official DepEd Paperwork</span>
                </div>
                <h3 className="font-editorial text-2xl font-semibold text-[#1C2420]">
                  Interactive DepEd Forms Showcase
                </h3>
              </div>
              <p className="text-xs text-[#5C6660]">
                Select a form to preview automated output.
              </p>
            </div>

            {/* Hover / Tap Fanned Form Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {DEPED_FORMS_SHOWCASE.map((form, idx) => {
                const isSelected = selectedFormCode === form.code;
                const tiltAngle =
                  shouldReduceMotion ? 0 : idx === 0 ? -1.5 : idx === 1 ? -0.5 : idx === 2 ? 0.5 : 1.5;

                return (
                  <motion.button
                    key={form.code}
                    type="button"
                    onClick={() => setSelectedFormCode(form.code)}
                    onMouseEnter={() => setSelectedFormCode(form.code)}
                    initial={false}
                    animate={
                      shouldReduceMotion
                        ? undefined
                        : isSelected
                          ? { y: -6, rotate: 0, scale: 1.015 }
                          : { y: 0, rotate: tiltAngle, scale: 1 }
                    }
                    transition={{ type: "spring", stiffness: 320, damping: 24 }}
                    aria-pressed={isSelected}
                    className={`text-left rounded-xl p-5 border transition-colors cursor-pointer flex flex-col justify-between gap-4 min-h-[220px] ${
                      isSelected
                        ? "bg-[#FAF8F5] border-[#0F3D2E] shadow-md ring-1 ring-[#0F3D2E]"
                        : "bg-[#FFFFFF] border-[#E3DDD1] hover:border-[#0F3D2E]/50"
                    }`}
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`font-mono text-xs font-bold px-2.5 py-1 rounded-md ${
                            isSelected
                              ? "bg-[#0F3D2E] text-[#FFFFFF]"
                              : "bg-[#E6EFEA] text-[#0F3D2E]"
                          }`}
                        >
                          {form.code}
                        </span>
                        <span className="text-[11px] font-medium text-[#9E1B32]">
                          {form.tag}
                        </span>
                      </div>

                      <div>
                        <h4 className="text-sm font-bold text-[#1C2420] leading-snug">
                          {form.title}
                        </h4>
                        <p className="text-xs text-[#5C6660] mt-1.5 leading-relaxed">
                          {form.summary}
                        </p>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-[#E3DDD1] grid grid-cols-3 gap-2">
                      {form.highlights.map((item) => (
                        <div key={item.label}>
                          <div className="text-[10px] text-[#5C6660] uppercase font-medium truncate">
                            {item.label}
                          </div>
                          <div className="font-mono text-[11px] font-semibold text-[#1C2420] truncate">
                            {item.value}
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};
