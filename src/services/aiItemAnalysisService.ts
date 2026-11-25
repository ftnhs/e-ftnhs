import type { Assessment, AssessmentItemAnalysis } from "../types";

export interface LeastLearnedIntervention {
  itemNumber: number;
  competency: string;
  difficultyIndex: number;
  correctCount: number;
  totalExaminees: number;
  action: AssessmentItemAnalysis["action_recommendation"];
  diagnosticNote: string;
  remediationStrategy: string;
}

export interface AIItemAnalysisReport {
  modelLabel: string;
  generatedAt: string;
  executiveSummary: string;
  distributionInsight: string;
  testQualityAudit: {
    retainCount: number;
    reviseCount: number;
    rejectCount: number;
    auditNarrative: string;
  };
  keyStrengths: string[];
  leastLearnedInterventions: LeastLearnedIntervention[];
  remediationPlan: string[];
}

const QUESTION_TAIL_PATTERNS: RegExp[] = [
  /\bwhich (?:of the following |utility |statement |option |code |approach |method |evaluation |conclusion |answer )?.*?\??$/i,
  /\bwhat (?:is the most |would |will |happens |does |output |value |best ).*?\??$/i,
  /\bwhy (?:is |does |did |are |should ).*?\??$/i,
  /\bhow (?:does |do |can |would |many |should ).*?\??$/i,
  /\bselect the best.*$/i,
  /\bchoose the correct.*$/i,
];

const BLOOMS_VERBS: Array<{ pattern: RegExp; verb: string }> = [
  { pattern: /\bevaluat|most accurate|best justification|valid|assess|critique\b/i, verb: "Evaluate" },
  { pattern: /\bcompar|differ|contrast|distinguish|identical|vs\.?\b/i, verb: "Differentiate" },
  { pattern: /\banalyz|output|trace|debug|predict|behavior|why does\b/i, verb: "Analyze" },
  { pattern: /\bimplement|write|code|use|apply|solve|compute|calculate|convert\b/i, verb: "Apply" },
  { pattern: /\bdesign|construct|create|formulate|verify\b/i, verb: "Formulate" },
  { pattern: /\bexplain|describe|interpret|summariz\b/i, verb: "Explain" },
];

const STOP_WORDS = new Set([
  "a", "an", "the", "and", "or", "but", "in", "on", "at", "to", "for", "of",
  "with", "by", "from", "as", "is", "are", "was", "were", "be", "been", "this",
  "that", "these", "those", "it", "its", "they", "their", "them", "we", "you",
  "must", "can", "could", "should", "would", "will", "what", "which", "who",
  "when", "where", "why", "how", "following", "statement", "statements",
  "accurate", "most", "best", "correct", "appropriate", "option", "question",
  "student", "students", "programmer", "writes", "claims", "given", "below",
  "code", "evaluation", "scenario", "situation", "because", "both",
]);

const TECHNICAL_EXCLUDE = new Set([
  "which", "what", "why", "how", "when", "where", "while", "whose",
  "this", "that", "these", "those", "there", "their", "they",
  "true", "false", "both", "each", "only", "none", "some", "many",
  "most", "best", "first", "second", "third", "final", "following",
  "programmer", "student", "students", "teacher", "system", "school",
  "class", "method", "code", "example", "item", "test", "mythread",
  "incorrect", "correct", "accurate", "appropriate", "evaluation",
]);

/**
 * Extracts a concise DepEd-style learning competency statement directly from a raw
 * Google Forms / quiz question prompt, stripping multi-line code blocks and question boilerplate.
 */
export function extractCompetencyFromQuestion(
  questionPrompt: string,
  itemNumber: number,
  subjectHint?: string
): string {
  const normalized = (questionPrompt || "").replace(/\r\n/g, "\n").trim();
  if (!normalized || /^item\s*\d+$/i.test(normalized) || /^q\d+$/i.test(normalized)) {
    return subjectHint
      ? `Demonstrate mastery of ${subjectHint} competency (Item ${itemNumber})`
      : `Learning Competency for Item ${itemNumber}`;
  }

  // Detect Bloom's action verb from full prompt before stripping stems
  let verb = "Identify";
  for (const rule of BLOOMS_VERBS) {
    if (rule.pattern.test(normalized)) {
      verb = rule.verb;
      break;
    }
  }

  // Collapse code snippets inside the prompt while preserving recognizable API/class tokens
  const lines = normalized
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  // Extract technical/domain identifiers (CamelCase, PascalCase, snake_case, dotted calls like t.run())
  const technicalTokens = Array.from(
    new Set(
      (
        normalized.match(
          /\b(?:[A-Z][a-z0-9]+[A-Z][a-zA-Z0-9]*|[a-z]+\.[a-zA-Z0-9_]+\(\)|[a-z]+_[a-z0-9_]+)\b/g
        ) || []
      ).filter((tok) => {
        const lower = tok.toLowerCase();
        return tok.length >= 3 && !TECHNICAL_EXCLUDE.has(lower);
      })
    )
  ).slice(0, 3);

  // Use prose lines (avoid raw brace-only or assignment-only code lines) to build topic phrase
  const proseLines = lines.filter(
    (line) => !/^[{};()[\]]+$/.test(line) && !/^[A-Za-z0-9_<>[\]]+\s+[a-zA-Z0-9_]+\s*=\s*new\b/.test(line)
  );
  const baseText = (proseLines.join(" ") || lines.join(" "))
    .replace(/\s+/g, " ")
    .trim();

  let cleaned = baseText
    .replace(/^(?:a|an|the)\s+(?:programmer|student|teacher|developer|user|grading\s+system)\s+(?:writes|claims|observes|wants\s+to|needs\s+to|displays)\s*:?\s*(?:that\s+)?/i, "")
    .replace(/^(?:given|consider|suppose|assuming)\s+(?:that\s+)?/i, "")
    .trim();

  for (const tailRegex of QUESTION_TAIL_PATTERNS) {
    const stripped = cleaned.replace(tailRegex, "").trim();
    if (stripped.length >= 8) {
      cleaned = stripped;
    }
  }

  cleaned = cleaned
    .replace(/^is\s+the\s+most\s+accurate\s+evaluation.*$/i, "")
    .replace(/[:;,.?!]+$/, "")
    .trim();

  // If stripped prose is very short (e.g., pure code snippet question like "t.run();"), lean on extracted tokens
  if (cleaned.length < 14 && technicalTokens.length > 0) {
    cleaned = `behavior and usage of ${technicalTokens.join(", ")}`;
  }

  // If stripped prose is still too long, distill salient terms while keeping meaning
  if (cleaned.length > 88) {
    const words = cleaned
      .split(/\s+/)
      .filter((w) => {
        const cleanWord = w.toLowerCase().replace(/[^a-z0-9_-]/g, "");
        return cleanWord.length > 2 && !STOP_WORDS.has(cleanWord);
      });
    const condensed = words.slice(0, 10).join(" ");
    cleaned = condensed.length >= 12 ? condensed : cleaned.slice(0, 85).trim();
  }

  if (technicalTokens.length > 0) {
    const missingTokens = technicalTokens.filter(
      (tok) => !cleaned.toLowerCase().includes(tok.toLowerCase())
    );
    if (missingTokens.length > 0 && cleaned.length < 75) {
      cleaned = `${cleaned} (${missingTokens.slice(0, 2).join(", ")})`;
    }
  }

  if (!cleaned) {
    return `Demonstrate concept mastery for Item ${itemNumber}`;
  }

  const preserveLeadingCase = /^[A-Z][a-z0-9]+[A-Z]/.test(cleaned) || /^[A-Z]{2,}/.test(cleaned);
  const formattedBody = preserveLeadingCase
    ? cleaned
    : cleaned.charAt(0).toLowerCase() + cleaned.slice(1);
  const full = `${verb} ${formattedBody}`;
  return full.length > 110 ? `${full.slice(0, 107).trim()}...` : full;
}

/**
 * Generates an automated DepEd-compliant Item Analysis & Intervention Report
 * grounded in exact statistics (Mean, SD, MPS, Dj, and DO 8 s. 2015 mastery bands).
 */
export function generateAIItemAnalysisReport(
  assessment: Assessment,
  items: AssessmentItemAnalysis[]
): AIItemAnalysisReport {
  const totalItems = Number(assessment.total_items || items.length || 0);
  const rawRecords = Array.isArray(assessment.raw_scores) ? assessment.raw_scores : [];
  const examinees = Number(assessment.examinee_count || rawRecords.length || 0);
  const mean = Number(assessment.mean_score || 0);
  const sd = Number(assessment.standard_deviation || 0);
  const mps = Number(assessment.mean_percentage_score || 0);
  const passingCount = rawRecords.filter(
    (r) => Number(r.raw_score) >= Number(assessment.passing_score || 0)
  ).length;
  const passingRate = examinees > 0 ? (passingCount / examinees) * 100 : 0;

  const retainItems = items.filter((item) => item.action_recommendation === "Retain");
  const reviseItems = items.filter((item) => item.action_recommendation === "Revise");
  const rejectItems = items.filter((item) => item.action_recommendation === "Reject");

  const masteryVerdict =
    mps >= 96
      ? "Mastered"
      : mps >= 86
      ? "Closely Approximating Mastery"
      : mps >= 66
      ? "Moving Towards Mastery"
      : mps >= 35
      ? "Average Mastery"
      : "Low / Unmastered Competency Zone";

  const executiveSummary = [
    `Across N = ${examinees} examinees on this ${totalItems}-item ${assessment.assessment_type}, the class recorded a Mean Score of ${mean.toFixed(2)}/${totalItems} (SD = ${sd.toFixed(2)}) and a Mean Percentage Score (MPS) of ${mps.toFixed(2)}%, classifying overall performance under "${masteryVerdict}" (DepEd Order No. 8 s. 2015).`,
    mps >= 75
      ? `${passingRate.toFixed(1)}% of learners met or exceeded the ${assessment.passing_score}-point (75%) DepEd passing threshold, surpassing the 75% institutional MPS benchmark.`
      : `${passingRate.toFixed(1)}% of learners reached the ${assessment.passing_score}-point (75%) passing score, trailing the 75.00% DepEd MPS target by ${(75 - mps).toFixed(2)} percentage points and requiring targeted reteaching.`,
  ].join(" ");

  const relativeSpread = totalItems > 0 ? (sd / totalItems) * 100 : 0;
  let distributionInsight: string;
  if (examinees === 0) {
    distributionInsight = "No examinee scores are recorded for distribution modeling.";
  } else if (sd === 0 && mean > 0) {
    distributionInsight = "All examinees achieved identical scores (SD = 0.00), showing zero variance across the cohort.";
  } else if (relativeSpread < 12 && mps >= 75) {
    distributionInsight = `Tight score clustering (SD = ${sd.toFixed(2)}, ${relativeSpread.toFixed(1)}% of scale) indicates consistent mastery across most learners with minimal learning gaps.`;
  } else if (relativeSpread >= 18) {
    distributionInsight = `Wide score dispersion (SD = ${sd.toFixed(2)}, ${relativeSpread.toFixed(1)}% of scale) reveals heterogeneous mastery—high-performing learners mastered the material while a lower-scoring subgroup needs small-group scaffolding.`;
  } else {
    distributionInsight = `Moderate dispersion (SD = ${sd.toFixed(2)}) reflects healthy item discrimination between upper and lower proficiency groups.`;
  }

  let auditNarrative: string;
  if (reviseItems.length > retainItems.length && mps >= 85) {
    auditNarrative = `${reviseItems.length} of ${items.length} items scored Dj > 0.80 (Easy / Ceiling Effect), confirming strong content acquisition while signaling that harder higher-order thinking (HOTS) distractors are needed if future versions aim for finer discrimination.`;
  } else if (rejectItems.length > 0) {
    auditNarrative = `${rejectItems.length} item(s) fell below Dj < 0.20 (Reject) and should be inspected for ambiguous phrasing, misaligned answer keys, or untaught competencies before future reuse.`;
  } else {
    auditNarrative = `${retainItems.length} item(s) sit within the optimal discrimination band (Dj 0.21–0.80) and are ready to be banked in the school assessment repository.`;
  }

  const keyStrengths = items
    .filter((i) => Number(i.difficulty_index) >= 0.8)
    .sort((a, b) => Number(b.difficulty_index) - Number(a.difficulty_index))
    .slice(0, 4)
    .map(
      (i) =>
        `Item #${i.item_number} (Dj = ${Number(i.difficulty_index).toFixed(2)}, ${i.correct_responses_count}/${i.total_examinees} correct): ${i.learning_competency}`
    );

  if (keyStrengths.length === 0 && items.length > 0) {
    const topRetained = [...items]
      .sort((a, b) => Number(b.difficulty_index) - Number(a.difficulty_index))
      .slice(0, 3);
    topRetained.forEach((i) => {
      keyStrengths.push(
        `Item #${i.item_number} (Dj = ${Number(i.difficulty_index).toFixed(2)}): ${i.learning_competency}`
      );
    });
  }

  const sortedLowest = [...items].sort(
    (a, b) => Number(a.difficulty_index) - Number(b.difficulty_index)
  );
  const targetInterventions = sortedLowest
    .filter((item, idx) => Number(item.difficulty_index) < 0.85 || idx < 3)
    .slice(0, 5);

  const leastLearnedInterventions: LeastLearnedIntervention[] = targetInterventions.map((item) => {
    const dj = Number(item.difficulty_index);
    const missCount = Math.max(0, item.total_examinees - item.correct_responses_count);
    let diagnosticNote: string;
    let remediationStrategy: string;

    if (dj < 0.2) {
      diagnosticNote = `${missCount} of ${item.total_examinees} students missed this item (Dj = ${dj.toFixed(2)}). High probability of conceptual misconception or overly complex stem/distractor wording.`;
      remediationStrategy = `Conduct direct whole-class reteaching with worked examples, unpack why popular distractors fail, and rewrite the test stem before re-administering.`;
    } else if (dj < 0.55) {
      diagnosticNote = `Only ${(dj * 100).toFixed(0)}% mastery (${item.correct_responses_count}/${item.total_examinees} correct). Learners show partial procedural recall but struggle with application.`;
      remediationStrategy = `Run guided peer-coaching drills and step-by-step trace exercises targeting "${item.learning_competency}" during intervention time.`;
    } else if (dj <= 0.8) {
      diagnosticNote = `Healthy discrimination (Dj = ${dj.toFixed(2)}); ${missCount} student(s) still require reinforcement to close remaining gaps.`;
      remediationStrategy = `Provide targeted formative practice cards or error-analysis reflection for the ${missCount} learner(s) who missed this item.`;
    } else {
      diagnosticNote = `High mastery (Dj = ${dj.toFixed(2)}), though ${missCount} learner(s) missed it—representing the lowest relative score in a high-performing cohort.`;
      remediationStrategy = `Retain concept mastery via enrichment HOTS scenarios and check-in individually with the ${missCount} learner(s) needing clarification.`;
    }

    return {
      itemNumber: item.item_number,
      competency: item.learning_competency,
      difficultyIndex: dj,
      correctCount: item.correct_responses_count,
      totalExaminees: item.total_examinees,
      action: item.action_recommendation,
      diagnosticNote,
      remediationStrategy,
    };
  });

  const remediationPlan: string[] = [];
  if (leastLearnedInterventions[0]) {
    remediationPlan.push(
      `Priority Reteach (Lowest Dj): Begin next session with a 15-minute diagnostic recap on Item #${leastLearnedInterventions[0].itemNumber} ("${leastLearnedInterventions[0].competency}", Dj = ${leastLearnedInterventions[0].difficultyIndex.toFixed(2)}).`
    );
  }
  if (rejectItems.length > 0 || reviseItems.length > 0) {
    remediationPlan.push(
      `Test Bank Curation: Archive ${retainItems.length} optimal item(s); revise ${reviseItems.length} high-Dj item(s) with deeper application prompts${rejectItems.length > 0 ? ` and replace ${rejectItems.length} rejected item(s) (< 0.20)` : ""}.`
    );
  }
  remediationPlan.push(
    passingRate < 100
      ? `Targeted Learner Support: Pair the bottom-scoring learners (${Math.max(1, examinees - Math.round((passingRate / 100) * examinees))} below 75% threshold) with mastery stations or peer mentors before the next summative check.`
      : `Enrichment Extension: With 100% of examinees passing the 75% threshold, transition into synthesis/performance-task challenges aligned with the next curriculum competency.`
  );

  return {
    modelLabel: "e-FTNHS Automated Item Intelligence Engine (DepEd DO 8 s. 2015)",
    generatedAt: new Date().toISOString(),
    executiveSummary,
    distributionInsight,
    testQualityAudit: {
      retainCount: retainItems.length,
      reviseCount: reviseItems.length,
      rejectCount: rejectItems.length,
      auditNarrative,
    },
    keyStrengths,
    leastLearnedInterventions,
    remediationPlan,
  };
}
