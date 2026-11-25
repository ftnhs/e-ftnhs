import React, { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { useReducedMotion } from "../../hooks/useReducedMotion";
import {
  CAMPUS_ADVISORIES,
  ACADEMIC_MILESTONES,
  type CampusAdvisory,
} from "./landingData";
import { Bell, Calendar, ArrowUpRight, X } from "lucide-react";

export const BulletinMilestonesSection: React.FC = () => {
  const shouldReduceMotion = useReducedMotion();
  const [selectedAdvisory, setSelectedAdvisory] = useState<CampusAdvisory | null>(null);
  const dialogRef = useRef<HTMLDialogElement | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (selectedAdvisory) {
      if (!dialog.open) {
        dialog.showModal();
      }
    } else if (dialog.open) {
      dialog.close();
    }
  }, [selectedAdvisory]);

  // Light-dismiss backdrop pointer check (fallback where native closedby="any" is unsupported)
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || "closedBy" in HTMLDialogElement.prototype) return;

    let pressedOutside = false;
    const isOutside = (e: PointerEvent) => {
      const r = dialog.getBoundingClientRect();
      return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
    };

    const onPointerDown = (e: PointerEvent) => {
      pressedOutside = isOutside(e);
    };
    const onPointerUp = (e: PointerEvent) => {
      if (pressedOutside && isOutside(e)) {
        setSelectedAdvisory(null);
      }
      pressedOutside = false;
    };

    dialog.addEventListener("pointerdown", onPointerDown);
    dialog.addEventListener("pointerup", onPointerUp);
    return () => {
      dialog.removeEventListener("pointerdown", onPointerDown);
      dialog.removeEventListener("pointerup", onPointerUp);
    };
  }, []);

  return (
    <section id="bulletin" className="py-16 sm:py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        <motion.div
          initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#E3DDD1] pb-5"
        >
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 text-xs font-mono font-semibold uppercase tracking-wider text-[#9E1B32]">
              <Bell className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Campus Bulletin &amp; Calendar</span>
            </div>
            <h2 className="font-editorial text-3xl sm:text-4xl font-semibold text-[#1C2420]">
              Official Advisories &amp; Term Milestones
            </h2>
          </div>
          <span className="font-mono text-xs text-[#5C6660] bg-[#FFFFFF] border border-[#E3DDD1] px-3 py-1.5 rounded-lg w-fit">
            School Year 2026–2027
          </span>
        </motion.div>

        {/* Split Layout: Left 7 Cols Bulletin Advisories | Right 5 Cols Academic Milestones */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left: Public Advisories */}
          <div className="lg:col-span-7 space-y-4">
            {CAMPUS_ADVISORIES.map((advisory, idx) => (
              <motion.article
                key={advisory.id}
                initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{
                  duration: 0.45,
                  delay: shouldReduceMotion ? 0 : idx * 0.06,
                  ease: [0.22, 1, 0.36, 1],
                }}
                className="bg-[#FFFFFF] rounded-2xl border border-[#E3DDD1] p-5 sm:p-6 hover:border-[#0F3D2E]/50 transition-colors shadow-2xs"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                        advisory.category === "Urgent"
                          ? "bg-[#FBECEF] text-[#9E1B32] border border-[#F3B8C2]"
                          : advisory.category === "Academic"
                            ? "bg-[#E6EFEA] text-[#0F3D2E] border border-[#B8CEC5]"
                            : "bg-[#FAF8F5] text-[#5C6660] border border-[#E3DDD1]"
                      }`}
                    >
                      {advisory.category}
                    </span>
                    <span className="font-mono text-xs text-[#5C6660]">
                      {advisory.memoNumber}
                    </span>
                  </div>
                  <span className="font-mono text-xs text-[#5C6660]">{advisory.date}</span>
                </div>

                <h3 className="text-base sm:text-lg font-bold text-[#1C2420] leading-snug">
                  {advisory.title}
                </h3>
                <p className="text-sm text-[#5C6660] mt-2 leading-relaxed">
                  {advisory.excerpt}
                </p>

                <div className="mt-4 pt-3 border-t border-[#E3DDD1] flex items-center justify-between gap-3">
                  <span className="text-xs font-medium text-[#5C6660]">
                    Audience: <strong className="text-[#1C2420]">{advisory.audience}</strong>
                  </span>

                  <button
                    type="button"
                    onClick={() => setSelectedAdvisory(advisory)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[38px] rounded-lg bg-[#FAF8F5] hover:bg-[#E6EFEA] border border-[#E3DDD1] text-xs font-semibold text-[#0F3D2E] transition-colors cursor-pointer shrink-0"
                  >
                    <span>Read Memo</span>
                    <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>
                </div>
              </motion.article>
            ))}
          </div>

          {/* Right: SY 2026-2027 Term Milestones */}
          <motion.div
            initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="lg:col-span-5 bg-[#FFFFFF] rounded-2xl border border-[#E3DDD1] p-6 space-y-5 h-fit shadow-2xs"
          >
            <div className="flex items-center justify-between border-b border-[#E3DDD1] pb-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#0F3D2E]" aria-hidden="true" />
                <h3 className="text-base font-bold text-[#1C2420]">
                  3-Term Academic Milestones
                </h3>
              </div>
              <span className="font-mono text-[11px] font-semibold text-[#9E1B32]">
                Term 2 Live
              </span>
            </div>

            <ol className="space-y-4 relative before:content-[''] before:absolute before:left-[9px] before:top-2 before:bottom-2 before:w-px before:bg-[#E3DDD1]">
              {ACADEMIC_MILESTONES.map((milestone) => (
                <li key={milestone.id} className="relative pl-7 space-y-1">
                  <span
                    aria-hidden="true"
                    className={`absolute left-0 top-1.5 w-[19px] h-[19px] rounded-full border-2 flex items-center justify-center bg-[#FFFFFF] ${
                      milestone.isDeadline
                        ? "border-[#9E1B32]"
                        : milestone.status === "Completed"
                          ? "border-[#0F3D2E]"
                          : "border-[#E3DDD1]"
                    }`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full ${
                        milestone.isDeadline
                          ? "bg-[#9E1B32]"
                          : milestone.status === "Completed"
                            ? "bg-[#0F3D2E]"
                            : "bg-[#B8CEC5]"
                      }`}
                    />
                  </span>

                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-[11px] font-semibold text-[#0F3D2E]">
                      {milestone.term}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        milestone.status === "Active"
                          ? "bg-[#FBECEF] text-[#9E1B32]"
                          : milestone.status === "Completed"
                            ? "bg-[#E6EFEA] text-[#0F3D2E]"
                            : "bg-[#FAF8F5] text-[#5C6660] border border-[#E3DDD1]"
                      }`}
                    >
                      {milestone.status}
                    </span>
                  </div>

                  <h4 className="text-sm font-semibold text-[#1C2420] leading-snug">
                    {milestone.title}
                  </h4>
                  <p className="font-mono text-[11px] text-[#5C6660]">
                    {milestone.dateRange}
                  </p>
                </li>
              ))}
            </ol>
          </motion.div>
        </div>
      </div>

      {/* Native Accessible Advisory Modal Dialog */}
      <dialog
        ref={dialogRef}
        aria-labelledby="advisory-dialog-title"
        onClose={() => setSelectedAdvisory(null)}
        {...({ closedby: "any" } as Record<string, string>)}
        className="m-auto w-[min(92vw,38rem)] rounded-2xl border border-[#E3DDD1] bg-[#FFFFFF] p-0 text-[#1C2420] shadow-2xl backdrop:bg-[#1C2420]/55 backdrop:backdrop-blur-xs"
      >
        {selectedAdvisory && (
          <div className="p-6 sm:p-7 space-y-5">
            <div className="flex items-start justify-between gap-4 border-b border-[#E3DDD1] pb-4">
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                      selectedAdvisory.category === "Urgent"
                        ? "bg-[#FBECEF] text-[#9E1B32]"
                        : "bg-[#E6EFEA] text-[#0F3D2E]"
                    }`}
                  >
                    {selectedAdvisory.category}
                  </span>
                  <span className="font-mono text-xs text-[#5C6660]">
                    {selectedAdvisory.memoNumber} • {selectedAdvisory.date}
                  </span>
                </div>
                <h2
                  id="advisory-dialog-title"
                  className="font-editorial text-xl font-semibold text-[#1C2420] leading-snug"
                >
                  {selectedAdvisory.title}
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setSelectedAdvisory(null)}
                aria-label="Close advisory"
                className="inline-flex items-center justify-center min-w-[40px] min-h-[40px] rounded-lg border border-[#E3DDD1] bg-[#FAF8F5] text-[#5C6660] hover:text-[#1C2420] cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>

            <div className="space-y-3 text-sm text-[#1C2420] leading-relaxed">
              {selectedAdvisory.body.map((paragraph, index) => (
                <p key={index} className="text-[#5C6660]">
                  {paragraph}
                </p>
              ))}
            </div>

            <div className="pt-4 border-t border-[#E3DDD1] flex items-center justify-between text-xs text-[#5C6660]">
              <span>Fermin Tayabas National High School • ID 302851</span>
              <button
                type="button"
                onClick={() => setSelectedAdvisory(null)}
                className="px-4 py-2 min-h-[40px] rounded-lg bg-[#0F3D2E] hover:bg-[#0A2E22] text-[#FFFFFF] font-semibold cursor-pointer transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </dialog>
    </section>
  );
};
