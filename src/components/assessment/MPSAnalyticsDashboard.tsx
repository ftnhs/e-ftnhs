import React, { useState } from"react";
import type { Assessment, AssessmentItemAnalysis } from"../../types";
import {
  generateAIItemAnalysisReport,
} from"../../services/aiItemAnalysisService";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
  LineChart,
  Line,
  ReferenceLine,
} from"recharts";
import {
  ShieldAlert,
  Sparkles,
  CheckCircle2,
  ClipboardCopy,
  Check,
  TrendingUp,
} from"lucide-react";

interface MPSAnalyticsDashboardProps {
  assessment: Assessment;
  items: AssessmentItemAnalysis[];
}

export const MPSAnalyticsDashboard: React.FC<MPSAnalyticsDashboardProps> = ({
  assessment,
  items,
}) => {
  // 1. Group student raw scores into histogram buckets (0-4, 5-9, 10-14, 15-19, 20+)
  const scoreBuckets = React.useMemo(() => {
    const rawScores = assessment.raw_scores.map((r) => r.raw_score);
    const maxScore = assessment.total_items;
    const bucketSize = Math.max(2, Math.ceil(maxScore / 5));

    const buckets: { range: string; count: number }[] = [];
    for (let start = 0; start <= maxScore; start += bucketSize) {
      const end = Math.min(start + bucketSize - 1, maxScore);
      const label = `${start}-${end}`;
      const count = rawScores.filter((s) => s >= start && s <= end).length;
      buckets.push({ range: label, count });
    }
    return buckets;
  }, [assessment]);

  // 2. Prepare Item Difficulty data for chart
  const difficultyData = React.useMemo(() => {
    return items.map((i) => ({
      item: `#${i.item_number}`,
      difficulty: Number(i.difficulty_index.toFixed(3)),
      interpretation: i.difficulty_interpretation,
      action: i.action_recommendation,
      isLeastLearned: i.is_least_learned,
    }));
  }, [items]);

  // 3. Top 3 Least Learned Competencies
  const leastLearned = React.useMemo(() => {
    return [...items]
      .sort((a, b) => a.difficulty_index - b.difficulty_index)
      .slice(0, 3);
  }, [items]);

  return (
    <div className="space-y-6">
      {/* 1. Executive Statistical KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-[#FFFFFF] rounded-xl border border-[#E3DDD1] p-4">
          <div className="text-xs font-medium text-[#5C6660]">
            Mean Score (μ)
          </div>
          <div className="mt-1.5 text-2xl font-semibold text-[#1C2420] font-mono tabular-nums">
            {Number(assessment.mean_score || 0).toFixed(2)}
            <span className="text-xs text-[#5C6660] font-normal ml-1">
              / {assessment.total_items}
            </span>
          </div>
        </div>

        <div className="bg-[#FFFFFF] rounded-xl border border-[#E3DDD1] p-4">
          <div className="text-xs font-medium text-[#5C6660]">
            Std. Deviation (SD)
          </div>
          <div className="mt-1.5 text-2xl font-semibold text-[#1C2420] font-mono tabular-nums">
            {Number(assessment.standard_deviation || 0).toFixed(2)}
          </div>
        </div>

        <div className="bg-[#FFFFFF] rounded-xl border border-[#E3DDD1] p-4">
          <div className="text-xs font-medium text-[#5C6660]">
            Mean Percentage Score (MPS)
          </div>
          <div className="mt-1.5 text-2xl font-semibold text-[#9E1B32] font-mono tabular-nums">
            {Number(assessment.mean_percentage_score || 0).toFixed(2)}%
          </div>
        </div>

        <div className="bg-[#FFFFFF] rounded-xl border border-[#E3DDD1] p-4">
          <div className="text-xs font-medium text-[#5C6660]">
            Mastery Level
          </div>
          <div className="mt-2 text-sm font-semibold text-[#0F3D2E] line-clamp-2">
            {assessment.mastery_level}
          </div>
        </div>
      </div>

      {/* 2. Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Score Distribution Histogram */}
        <div className="bg-[#FFFFFF] rounded-xl border border-[#E3DDD1] p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[#1C2420] font-display">
              Score Distribution Histogram
            </h3>
            <span className="text-xs text-[#5C6660] font-mono">
              {assessment.examinee_count} examinees
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={scoreBuckets} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E3DDD1" vertical={false} />
                <XAxis dataKey="range" tick={{ fontSize: 11, fill: "#5C6660" }} stroke="#E3DDD1" />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#5C6660" }} stroke="#E3DDD1" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0F3D2E",
                    color: "#F4F1EA",
                    borderRadius: "10px",
                    border: "1px solid #246A52",
                    fontSize: "12px",
                  }}
                />
                <Bar dataKey="count" fill="#0F3D2E" radius={[6, 6, 0, 0]}>
                  {scoreBuckets.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.count > 0 ? "#0F3D2E" : "#E3DDD1"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Item Difficulty Index Curve */}
        <div className="bg-[#FFFFFF] rounded-xl border border-[#E3DDD1] p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[#1C2420] font-display">
              Item Difficulty Index (Dj) Curve
            </h3>
            <span className="text-xs text-[#5C6660] font-mono">
              {items.length} items
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={difficultyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E3DDD1" vertical={false} />
                <XAxis dataKey="item" tick={{ fontSize: 10, fill: "#5C6660" }} stroke="#E3DDD1" />
                <YAxis domain={[0, 1]} ticks={[0, 0.2, 0.5, 0.8, 1]} tick={{ fontSize: 11, fill: "#5C6660" }} stroke="#E3DDD1" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0F3D2E",
                    color: "#F4F1EA",
                    borderRadius: "10px",
                    border: "1px solid #246A52",
                    fontSize: "12px",
                  }}
                />
                {/* Reference line for Difficult (0.20) */}
                <ReferenceLine y={0.2} stroke="#9E1B32" strokeDasharray="3 3" label="Difficult (0.20)" />
                {/* Reference line for Easy (0.80) */}
                <ReferenceLine y={0.8} stroke="#5C6660" strokeDasharray="3 3" label="Easy (0.80)" />
                <Line
                  type="monotone"
                  dataKey="difficulty"
                  stroke="#0F3D2E"
                  strokeWidth={2}
                  dot={(props: { cx?: number; cy?: number; payload?: { isLeastLearned?: boolean } }) => {
                    const isLeast = props.payload?.isLeastLearned;
                    return (
                      <circle
                        key={`dot-${props.cx}-${props.cy}`}
                        cx={props.cx}
                        cy={props.cy}
                        r={isLeast ? 5 : 3}
                        fill={isLeast ? "#9E1B32" : "#0F3D2E"}
                        stroke="#ffffff"
                        strokeWidth={1.5}
                      />
                    );
                  }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* 3. Top 3 Least Learned Competencies Callout Card */}
      <div className="bg-white rounded-2xl border border-sand-200 p-5 shadow-xs space-y-4 transition-colors">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-crimson-100 text-crimson-700 flex items-center justify-center">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-cyprus-900 font-display">
                Top 3 Least Learned Competencies (Instructional Priority)
              </h3>
              <p className="text-xs text-sand-600">
                Identified test items with the lowest Index of Difficulty requiring immediate remedial teaching.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {leastLearned.map((item, idx) => (
            <div
              key={item.item_number}
              className="p-4 rounded-xl bg-sand-50 border border-sand-200 space-y-2 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between text-xs font-bold text-crimson-700">
                  <span>Priority #{idx + 1} • Item #{item.item_number}</span>
                  <span className="font-mono bg-crimson-100 px-2 py-0.5 rounded text-[11px] border border-crimson-200">
                    Dj: {Number(item.difficulty_index).toFixed(3)}
                  </span>
                </div>
                <p className="text-xs text-sand-800 font-medium mt-1.5 leading-relaxed">
                  {item.learning_competency}
                </p>
              </div>

              <div className="pt-2 border-t border-sand-200 text-[11px] text-sand-600 flex items-center justify-between">
                <span>
                  Correct: <strong>{item.correct_responses_count}</strong>/{item.total_examinees}
                </span>
                <span className="text-crimson-600 font-bold uppercase">
                  {item.action_recommendation}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 4. AI Automated Item Analysis & Intervention Summary */}
      <AIItemAnalysisPanel assessment={assessment} items={items} />
    </div>
  );
};

const AIItemAnalysisPanel: React.FC<{
  assessment: Assessment;
  items: AssessmentItemAnalysis[];
}> = ({ assessment, items }) => {
  const [copied, setCopied] = useState(false);

  const report = React.useMemo(
    () => generateAIItemAnalysisReport(assessment, items),
    [assessment, items]
  );

  const handleCopySummary = async () => {
    const lines = [
      `${assessment.title} — AI Item Analysis & DepEd Intervention Report`,
      `Engine: ${report.modelLabel}`,
      "",
      "EXECUTIVE SUMMARY",
      report.executiveSummary,
      "",
      "SCORE DISTRIBUTION INSIGHT",
      report.distributionInsight,
      "",
      `TEST QUALITY AUDIT (Retain: ${report.testQualityAudit.retainCount} | Revise: ${report.testQualityAudit.reviseCount} | Reject: ${report.testQualityAudit.rejectCount})`,
      report.testQualityAudit.auditNarrative,
      "",
      "PRIORITY INTERVENTION ITEMS",
      ...report.leastLearnedInterventions.map(
        (li) =>
          `- Item #${li.itemNumber} (Dj=${li.difficultyIndex.toFixed(2)}, ${li.correctCount}/${li.totalExaminees}): ${li.competency}\n  Diagnostic: ${li.diagnosticNote}\n  Action: ${li.remediationStrategy}`
      ),
      "",
      "REMEDIATION ACTION PLAN",
      ...report.remediationPlan.map((step, i) => `${i + 1}. ${step}`),
    ];

    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Clipboard API unavailable in restricted contexts
    }
  };

  return (
    <section
      aria-label="Automated AI Item Analysis and Intervention Report"
      className="bg-white rounded-2xl border border-sand-200 p-5 shadow-xs space-y-5 transition-colors"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-sand-200">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-cyprus-900 text-white flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-cyprus-900 font-display">
              AI-Generated Item Analysis & Intervention Report
            </h3>
            <p className="text-xs text-sand-600">{report.modelLabel}</p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleCopySummary}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border border-sand-300 bg-sand-50 hover:bg-sand-100 text-cyprus-900 transition-colors cursor-pointer self-start sm:self-auto"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-700" />
              <span>Copied Summary</span>
            </>
          ) : (
            <>
              <ClipboardCopy className="w-3.5 h-3.5" />
              <span>Copy AI Report</span>
            </>
          )}
        </button>
      </div>

      {/* Executive Summary & Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="p-4 rounded-xl bg-sand-50 border border-sand-200 space-y-1.5">
          <div className="text-[11px] font-bold uppercase tracking-wider text-cyprus-800 flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-crimson-600" />
            Executive Performance Verdict
          </div>
          <p className="text-xs text-sand-800 leading-relaxed">{report.executiveSummary}</p>
        </div>

        <div className="p-4 rounded-xl bg-sand-50 border border-sand-200 space-y-2">
          <div className="text-[11px] font-bold uppercase tracking-wider text-cyprus-800">
            Score Dispersion & Item Quality Audit
          </div>
          <p className="text-xs text-sand-800 leading-relaxed">{report.distributionInsight}</p>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
              Retain (0.21–0.80): {report.testQualityAudit.retainCount}
            </span>
            <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
              Revise (&gt;0.80): {report.testQualityAudit.reviseCount}
            </span>
            <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-crimson-50 text-crimson-700 border border-crimson-200">
              Reject (&lt;0.20): {report.testQualityAudit.rejectCount}
            </span>
          </div>
          <p className="text-[11px] text-sand-700 leading-relaxed">
            {report.testQualityAudit.auditNarrative}
          </p>
        </div>
      </div>

      {/* Least Learned Diagnostics + Strengths */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-2.5">
          <h4 className="text-xs font-bold uppercase tracking-wider text-crimson-700">
            Diagnostic Item Breakdown & Instructional Remediation
          </h4>
          <div className="space-y-2">
            {report.leastLearnedInterventions.map((li) => (
              <div
                key={li.itemNumber}
                className="p-3 rounded-xl border border-sand-200 bg-white space-y-1"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-bold text-cyprus-900">
                    Item #{li.itemNumber}: {li.competency}
                  </span>
                  <span className="text-[11px] font-mono font-semibold text-sand-700 bg-sand-100 px-2 py-0.5 rounded">
                    Dj = {li.difficultyIndex.toFixed(2)} ({li.correctCount}/{li.totalExaminees}) • {li.action}
                  </span>
                </div>
                <p className="text-xs text-sand-700">{li.diagnosticNote}</p>
                <p className="text-xs text-cyprus-900 font-medium">
                  Intervention: {li.remediationStrategy}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200 space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-900 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
              Mastered Competencies
            </h4>
            <ul className="space-y-1.5 text-xs text-emerald-950 list-disc pl-4">
              {report.keyStrengths.map((s, idx) => (
                <li key={idx} className="leading-snug">
                  {s}
                </li>
              ))}
            </ul>
          </div>

          <div className="p-4 rounded-xl bg-cyprus-50/60 border border-cyprus-200 space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-cyprus-900">
              Recommended Next Steps
            </h4>
            <ol className="space-y-1.5 text-xs text-cyprus-900 list-decimal pl-4">
              {report.remediationPlan.map((step, idx) => (
                <li key={idx} className="leading-snug">
                  {step}
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </section>
  );
};
