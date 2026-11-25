import React, { useRef, useState } from "react";
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  useScroll,
  AnimatePresence,
} from "motion/react";
import { useReducedMotion } from "../../hooks/useReducedMotion";
import { transmuteInitialGrade } from "../../services/transmutationEngine";
import {
  TIMETABLE_CONFLICT_ROWS,
  TIMETABLE_SOLVED_ROWS,
  LEAVE_RELIEF_SIMULATION,
} from "./landingData";
import {
  Calendar,
  BarChart3,
  Send,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  RotateCcw,
} from "lucide-react";

type StageMode = "timetable" | "grading" | "leave";

const STAGE_TABS: { id: StageMode; label: string; shortLabel: string; icon: React.ReactNode }[] = [
  {
    id: "timetable",
    label: "Timetable Auto-Solver",
    shortLabel: "Timetable",
    icon: <Calendar className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />,
  },
  {
    id: "grading",
    label: "DO No. 8 Grading & MPS",
    shortLabel: "DO 8 & MPS",
    icon: <BarChart3 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />,
  },
  {
    id: "leave",
    label: "Leave & Class Relief",
    shortLabel: "Leave & Relief",
    icon: <Send className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />,
  },
];

export const LivingSystemStage: React.FC = () => {
  const shouldReduceMotion = useReducedMotion();
  const stageRef = useRef<HTMLDivElement | null>(null);

  const [activeMode, setActiveMode] = useState<StageMode>("timetable");
  const [isTimetableSolved, setIsTimetableSolved] = useState<boolean>(false);
  const [rawScore, setRawScore] = useState<number>(38);
  const [selectedItemPreset, setSelectedItemPreset] = useState<"retain" | "revise" | "reject">("retain");
  const [leaveDispatched, setLeaveDispatched] = useState<boolean>(false);

  // Scroll-linked subtle vertical parallax
  const { scrollYProgress } = useScroll({
    target: stageRef,
    offset: ["start end", "end start"],
  });
  const scrollParallaxY = useTransform(scrollYProgress, [0, 1], [18, -18]);

  // Pointer-driven subtle 3D tilt (GPU transform only)
  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  const springConfig = { stiffness: 180, damping: 24, mass: 0.6 };
  const rotateX = useSpring(useTransform(pointerY, [-0.5, 0.5], [4.5, -4.5]), springConfig);
  const rotateY = useSpring(useTransform(pointerX, [-0.5, 0.5], [-5.5, 5.5]), springConfig);

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (shouldReduceMotion || e.pointerType === "touch") return;
    const rect = e.currentTarget.getBoundingClientRect();
    const nx = (e.clientX - rect.left) / rect.width - 0.5;
    const ny = (e.clientY - rect.top) / rect.height - 0.5;
    pointerX.set(nx);
    pointerY.set(ny);
  };

  const handlePointerLeave = () => {
    pointerX.set(0);
    pointerY.set(0);
  };

  const handleTabKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>, currentIndex: number) => {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      const next = STAGE_TABS[(currentIndex + 1) % STAGE_TABS.length];
      if (next) setActiveMode(next.id);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      const prev = STAGE_TABS[(currentIndex - 1 + STAGE_TABS.length) % STAGE_TABS.length];
      if (prev) setActiveMode(prev.id);
    }
  };

  // Simulated DO No. 8 / SY 2026-2027 Calculation
  const totalItems = 50;
  const percentageScore = (rawScore / totalItems) * 100;
  const transmutedGrade = transmuteInitialGrade(percentageScore);
  const masteryCategory =
    percentageScore >= 86
      ? "Closely Approximating Mastery"
      : percentageScore >= 75
        ? "Moving Towards Mastery"
        : percentageScore >= 60
          ? "Average Mastery"
          : "Low Mastery (Intervention)";

  const itemPresetStats =
    selectedItemPreset === "retain"
      ? { itemNo: "Item #18", difficulty: "0.58", status: "Retain", note: "0.21–0.80 range: Retain" }
      : selectedItemPreset === "revise"
        ? { itemNo: "Item #04", difficulty: "0.88", status: "Revise", note: "Over 0.80: Revise distractors" }
        : { itemNo: "Item #39", difficulty: "0.14", status: "Reject", note: "Under 0.20: Reject — reteach" };

  const activeRows = isTimetableSolved ? TIMETABLE_SOLVED_ROWS : TIMETABLE_CONFLICT_ROWS;

  return (
    <motion.div
      id="interactive-stage"
      ref={stageRef}
      style={shouldReduceMotion ? undefined : { y: scrollParallaxY }}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      className="relative"
    >
      {/* Perspective Container */}
      <div className="lg:[perspective:1100px]">
        <motion.div
          style={
            shouldReduceMotion
              ? undefined
              : {
                  rotateX,
                  rotateY,
                  transformStyle: "preserve-3d",
                }
          }
          className="bg-[#FFFFFF] rounded-2xl border border-[#E3DDD1] shadow-[0_24px_60px_-18px_rgba(15,61,46,0.16)] overflow-hidden"
        >
          {/* Stage Window Chrome */}
          <div className="bg-[#0F3D2E] text-[#F4F1EA] px-4 py-3 border-b border-[#18523F] flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#9E1B32] ring-1 ring-[#F4F1EA]/50" aria-hidden="true" />
              <span className="font-mono text-xs font-medium tracking-tight text-[#F4F1EA]">
                e-FTNHS // WORKFLOW SIMULATOR
              </span>
            </div>
            <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-[#18523F] text-[#B8CEC5] border border-[#246A52]">
              Interactive Preview
            </span>
          </div>

          {/* Workflow Switcher Tablist */}
          <div className="p-3 bg-[#FAF8F5] border-b border-[#E3DDD1]">
            <div
              role="tablist"
              aria-label="Simulated platform workflows"
              className="flex items-center gap-1.5 overflow-x-auto no-scrollbar"
            >
              {STAGE_TABS.map((tab, index) => {
                const isSelected = activeMode === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    id={`stage-tab-${tab.id}`}
                    aria-selected={isSelected}
                    tabIndex={isSelected ? 0 : -1}
                    onClick={() => setActiveMode(tab.id)}
                    onKeyDown={(e) => handleTabKeyDown(e, index)}
                    className={`relative flex items-center gap-2 px-3 py-2 min-h-[40px] rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                      isSelected
                        ? "text-[#FFFFFF]"
                        : "text-[#5C6660] hover:text-[#1C2420] hover:bg-[#FFFFFF]/70"
                    }`}
                  >
                    {isSelected && (
                      <motion.span
                        layoutId={shouldReduceMotion ? undefined : "stage-tab-pill"}
                        transition={{ type: "spring", stiffness: 360, damping: 30 }}
                        className="absolute inset-0 rounded-lg bg-[#0F3D2E]"
                        aria-hidden="true"
                      />
                    )}
                    <span className="relative z-10 flex items-center gap-1.5">
                      {tab.icon}
                      <span className="hidden sm:inline">{tab.label}</span>
                      <span className="sm:hidden">{tab.shortLabel}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Stage Viewport Body */}
          <div className="p-4 sm:p-5 min-h-[340px] flex flex-col justify-between bg-[#FFFFFF]">
            <AnimatePresence mode="wait">
              {activeMode === "timetable" && (
                <motion.div
                  key="timetable"
                  role="tabpanel"
                  aria-labelledby="stage-tab-timetable"
                  initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: -8 }}
                  transition={{ duration: 0.18 }}
                  className="space-y-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2.5">
                    <div>
                      <h3 className="text-sm font-bold text-[#1C2420]">
                        {isTimetableSolved
                          ? "Conflict-Free Term 2 Matrix (SF7 Ready)"
                          : "Detected Schedule Collision (Tue / Thu 13:00)"}
                      </h3>
                      <p className="text-xs text-[#5C6660]">
                        JHS 50-min afternoon blocks • Magna Carta cap check
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setIsTimetableSolved((prev) => !prev)}
                      className={`inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[40px] rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                        isTimetableSolved
                          ? "bg-[#FAF8F5] border border-[#E3DDD1] text-[#1C2420] hover:bg-[#E6EFEA]"
                          : "bg-[#0F3D2E] hover:bg-[#0A2E22] text-[#FFFFFF]"
                      }`}
                    >
                      {isTimetableSolved ? (
                        <>
                          <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>Reset Conflict</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>Resolve Conflicts</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Responsive 5-day compact timetable preview */}
                  <div className="overflow-x-auto rounded-xl border border-[#E3DDD1]">
                    <table className="w-full min-w-[520px] table-fixed border-collapse text-left text-[11px]">
                      <thead>
                        <tr className="bg-[#FAF8F5] border-b border-[#E3DDD1] text-[#5C6660] uppercase font-semibold tracking-wider">
                          <th className="py-2 px-2.5 w-24 border-r border-[#E3DDD1]">Slot</th>
                          <th className="py-2 px-2 border-r border-[#E3DDD1] text-center">Mon</th>
                          <th className="py-2 px-2 border-r border-[#E3DDD1] text-center">Tue</th>
                          <th className="py-2 px-2 border-r border-[#E3DDD1] text-center">Wed</th>
                          <th className="py-2 px-2 border-r border-[#E3DDD1] text-center">Thu</th>
                          <th className="py-2 px-2 text-center">Fri</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E3DDD1]">
                        {activeRows.map((row) => (
                          <tr key={row.period} className="divide-x divide-[#E3DDD1]">
                            <td className="py-2.5 px-2.5 bg-[#FAF8F5]/70">
                              <div className="font-semibold text-[#1C2420]">{row.period}</div>
                              <div className="font-mono text-[10px] text-[#5C6660]">{row.time}</div>
                            </td>
                            {[
                              { key: "mon", text: row.mon, conflict: false },
                              { key: "tue", text: row.tue, conflict: Boolean(row.hasConflict) },
                              { key: "wed", text: row.wed, conflict: false },
                              { key: "thu", text: row.thu, conflict: Boolean(row.hasConflict) },
                              { key: "fri", text: row.fri, conflict: false },
                            ].map((cell) => (
                              <td key={cell.key} className="p-1.5 align-middle">
                                <div
                                  className={`px-2 py-1.5 rounded-md font-medium leading-snug ${
                                    cell.conflict
                                      ? "bg-[#FBECEF] border border-[#F3B8C2] text-[#9E1B32] font-semibold"
                                      : "bg-[#E6EFEA]/75 border border-[#B8CEC5]/60 text-[#0F3D2E]"
                                  }`}
                                >
                                  {cell.text}
                                </div>
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div
                    className={`p-2.5 rounded-lg border text-xs flex items-center justify-between gap-2 ${
                      isTimetableSolved
                        ? "bg-[#E6EFEA] border-[#B8CEC5] text-[#0F3D2E]"
                        : "bg-[#FBECEF] border-[#F3B8C2] text-[#9E1B32]"
                    }`}
                  >
                    <div className="flex items-center gap-2 font-medium">
                      {isTimetableSolved ? (
                        <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 shrink-0" aria-hidden="true" />
                      )}
                      <span>
                        {isTimetableSolved
                          ? "0 collisions detected • G9-Peace shifted cleanly to PM Block 2 (13:50–14:40)"
                          : "Conflict: Grade 8–Love & Grade 9–Peace overlap in Tue/Thu 13:00–13:50"}
                      </span>
                    </div>
                  </div>
                </motion.div>
              )}

              {activeMode === "grading" && (
                <motion.div
                  key="grading"
                  role="tabpanel"
                  aria-labelledby="stage-tab-grading"
                  initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: -8 }}
                  transition={{ duration: 0.18 }}
                  className="space-y-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-bold text-[#1C2420]">
                        DO No. 8 Grading &amp; Item Analysis Simulator
                      </h3>
                      <p className="text-xs text-[#5C6660]">
                        Adjust score — see live DO 8 transmutation.
                      </p>
                    </div>
                    <span className="font-mono text-xs font-semibold px-2.5 py-1 rounded-md bg-[#E6EFEA] text-[#0F3D2E]">
                      {rawScore} / {totalItems} Items
                    </span>
                  </div>

                  {/* Interactive Score Slider */}
                  <div className="p-3.5 rounded-xl bg-[#FAF8F5] border border-[#E3DDD1] space-y-2.5">
                    <div className="flex items-center justify-between text-xs">
                      <label htmlFor="demo-raw-score" className="font-semibold text-[#1C2420]">
                        Learner / Class Mean Score
                      </label>
                      <span className="font-mono text-[#5C6660]">
                        Initial: {percentageScore.toFixed(1)}%
                      </span>
                    </div>
                    <input
                      id="demo-raw-score"
                      type="range"
                      min={15}
                      max={50}
                      value={rawScore}
                      onChange={(e) => setRawScore(Number(e.target.value))}
                      className="w-full accent-[#0F3D2E] cursor-pointer h-2 rounded-lg"
                    />
                  </div>

                  {/* Live Calculated Metrics */}
                  <div className="grid grid-cols-3 gap-2.5">
                    <div className="p-3 rounded-xl bg-[#FAF8F5] border border-[#E3DDD1]">
                      <div className="text-[11px] font-medium text-[#5C6660]">Transmuted</div>
                      <div className="font-mono text-2xl font-bold text-[#0F3D2E] mt-0.5 tabular-nums">
                        {transmutedGrade}
                      </div>
                    </div>
                    <div className="p-3 rounded-xl bg-[#FAF8F5] border border-[#E3DDD1]">
                      <div className="text-[11px] font-medium text-[#5C6660]">MPS Score</div>
                      <div
                        className={`font-mono text-2xl font-bold mt-0.5 tabular-nums ${
                          percentageScore >= 75 ? "text-[#0F3D2E]" : "text-[#9E1B32]"
                        }`}
                      >
                        {percentageScore.toFixed(1)}%
                      </div>
                    </div>
                    <div className="p-3 rounded-xl bg-[#FAF8F5] border border-[#E3DDD1]">
                      <div className="text-[11px] font-medium text-[#5C6660]">Mastery</div>
                      <div className="text-xs font-semibold text-[#1C2420] mt-1 leading-snug">
                        {masteryCategory}
                      </div>
                    </div>
                  </div>

                  {/* Interactive Competency Item Classifier */}
                  <div className="pt-2 border-t border-[#E3DDD1] space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-[#1C2420]">
                        Test Item Difficulty Index ($D_j = R_j / N$):
                      </span>
                      <div className="flex items-center gap-1.5">
                        {(["retain", "revise", "reject"] as const).map((preset) => (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => setSelectedItemPreset(preset)}
                            className={`px-2.5 py-1 rounded-md text-[11px] font-semibold capitalize cursor-pointer transition-colors ${
                              selectedItemPreset === preset
                                ? preset === "reject"
                                  ? "bg-[#9E1B32] text-[#FFFFFF]"
                                  : "bg-[#0F3D2E] text-[#FFFFFF]"
                                : "bg-[#FAF8F5] border border-[#E3DDD1] text-[#5C6660] hover:text-[#1C2420]"
                            }`}
                          >
                            {preset}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-[#FAF8F5] border border-[#E3DDD1] text-xs">
                      <span className="font-mono font-semibold text-[#1C2420]">
                        {itemPresetStats.itemNo} • Dj = {itemPresetStats.difficulty}
                      </span>
                      <span
                        className={`font-semibold ${
                          selectedItemPreset === "reject" ? "text-[#9E1B32]" : "text-[#0F3D2E]"
                        }`}
                      >
                        {itemPresetStats.status} — {itemPresetStats.note}
                      </span>
                    </div>
                  </div>
                </motion.div>
              )}

              {activeMode === "leave" && (
                <motion.div
                  key="leave"
                  role="tabpanel"
                  aria-labelledby="stage-tab-leave"
                  initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: -8 }}
                  transition={{ duration: 0.18 }}
                  className="space-y-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2.5">
                    <div>
                      <h3 className="text-sm font-bold text-[#1C2420]">
                        Period Interception &amp; Substitute Routing
                      </h3>
                      <p className="text-xs text-[#5C6660]">
                        {LEAVE_RELIEF_SIMULATION.applicant} • {LEAVE_RELIEF_SIMULATION.inclusiveDates}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setLeaveDispatched((prev) => !prev)}
                      className={`inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[40px] rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                        leaveDispatched
                          ? "bg-[#E6EFEA] border border-[#B8CEC5] text-[#0F3D2E]"
                          : "bg-[#0F3D2E] hover:bg-[#0A2E22] text-[#FFFFFF]"
                      }`}
                    >
                      {leaveDispatched ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>Conforme Routed</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>Intercept &amp; Route Relief</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div className="space-y-2.5">
                    {LEAVE_RELIEF_SIMULATION.affectedPeriods.map((period) => (
                      <div
                        key={period.dayTime}
                        className="p-3 rounded-xl border border-[#E3DDD1] bg-[#FAF8F5] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                      >
                        <div>
                          <div className="font-mono text-[11px] font-semibold text-[#9E1B32]">
                            {period.dayTime} • {period.room}
                          </div>
                          <div className="font-semibold text-[#1C2420] mt-0.5">
                            {period.classLabel}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <ArrowRight className="w-3.5 h-3.5 text-[#5C6660] hidden sm:inline" aria-hidden="true" />
                          <span
                            className={`px-2.5 py-1 rounded-full font-semibold text-[11px] ${
                              leaveDispatched
                                ? "bg-[#E6EFEA] text-[#0F3D2E] border border-[#B8CEC5]"
                                : "bg-[#FFFFFF] text-[#5C6660] border border-[#E3DDD1]"
                            }`}
                          >
                            {leaveDispatched
                              ? `Accepted: ${period.reliever}`
                              : `Candidate: ${period.reliever}`}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="p-3 rounded-xl bg-[#FAF8F5] border border-[#E3DDD1] flex items-center justify-between text-xs">
                    <span className="text-[#5C6660]">
                      {leaveDispatched
                        ? "All affected classes covered • Ready for School Head PDF approval."
                        : "Click 'Intercept & Route Relief' to notify vacant faculty automatically."}
                    </span>
                    <span className="font-mono font-semibold text-[#0F3D2E]">
                      {leaveDispatched ? "2/2 Accepted" : "Form 6"}
                    </span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};
