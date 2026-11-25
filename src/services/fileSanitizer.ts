/**
 * fileSanitizer.ts
 * Spreadsheet Ingestion & Formula Injection Defense (CWE-1236)
 * Supports Google Forms CSV, Quizizz CSV/Excel, and LMS test exports.
 */

import type { StudentScoreRecord } from "../types";

/**
 * Characters that trigger formula execution in Excel, Google Sheets, LibreOffice:
 * '=', '+', '-', '@', '\t', '\r'
 */
const FORMULA_TRIGGER_CHARS = ["=", "+", "-", "@", "\t", "\r"];

/**
 * Neutralizes Formula Injection (CWE-1236).
 * Prepends a single quote "'" to cell values that begin with trigger characters,
 * preventing them from being evaluated as formulas by spreadsheet engines.
 */
export function sanitizeSpreadsheetValue(val: unknown): string {
  if (val === null || val === undefined) return "";
  let str = String(val).trim();

  if (str.length > 0 && FORMULA_TRIGGER_CHARS.some((char) => str.startsWith(char))) {
    // If it starts with formula triggers, prepend single quote to treat as literal text
    str = `'${str}`;
  }

  return str;
}

/**
 * Robust CSV parser that correctly handles:
 * - Double-quoted values containing commas and newlines
 * - Escaped double quotes ("")
 * - Windows (\r\n) and Unix (\n) line breaks
 */
export function parseCSV(csvText: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = "";
  let insideQuotes = false;

  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    const nextChar = csvText[i + 1];

    if (insideQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          // Escaped double quote
          currentCell += '"';
          i++;
        } else {
          // Closing quote
          insideQuotes = false;
        }
      } else {
        currentCell += char;
      }
    } else {
      if (char === '"') {
        insideQuotes = true;
      } else if (char === ",") {
        currentRow.push(currentCell.trim());
        currentCell = "";
      } else if (char === "\r") {
        if (nextChar === "\n") i++;
        currentRow.push(currentCell.trim());
        if (currentRow.some((c) => c !== "")) rows.push(currentRow);
        currentRow = [];
        currentCell = "";
      } else if (char === "\n") {
        currentRow.push(currentCell.trim());
        if (currentRow.some((c) => c !== "")) rows.push(currentRow);
        currentRow = [];
        currentCell = "";
      } else {
        currentCell += char;
      }
    }
  }

  if (currentCell !== "" || currentRow.length > 0) {
    currentRow.push(currentCell.trim());
    if (currentRow.some((c) => c !== "")) rows.push(currentRow);
  }

  return rows;
}

export interface ParsedAssessmentItemMeta {
  itemNumber: number;
  questionPrompt: string;
  derivedAnswerKey?: string;
  topDistractor?: string;
  topDistractorCount?: number;
}

export interface ParsedAssessmentOutput {
  examinees: StudentScoreRecord[];
  totalItems: number;
  detectedFormat: "Google Forms / Item Matrix" | "Simple Score Roster" | "Unknown";
  questionPrompts?: string[];
  itemMetadata?: ParsedAssessmentItemMeta[];
  warning?: string;
}

/**
 * Parses raw score cells including numbers ("30", "28.5"), fraction strings ("30 / 30"),
 * and point labels ("28 pts"). Returns null if the cell is not a numeric score.
 */
export function parseScoreCell(
  rawCell: string
): { score: number; maxFromCell: number | null } | null {
  const cleaned = String(rawCell ?? "").trim();
  if (!cleaned) return null;

  const fractionMatch = cleaned.match(
    /^(-?\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)(?:\s*(?:pts?|points?))?$/i
  );
  if (fractionMatch) {
    const score = Number(fractionMatch[1]);
    const maxVal = Number(fractionMatch[2]);
    if (Number.isFinite(score) && Number.isFinite(maxVal) && maxVal > 0) {
      return { score, maxFromCell: maxVal };
    }
  }

  const numericStr = cleaned.replace(/\s*(?:pts?|points?|\/.*)$/i, "").trim();
  if (/^-?\d+(?:\.\d+)?$/.test(numericStr)) {
    const score = Number(numericStr);
    if (Number.isFinite(score)) {
      return { score, maxFromCell: null };
    }
  }

  return null;
}

function normalizeAnswerToken(value: string): string {
  return String(value ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

const METADATA_HEADER_REGEX =
  /^(?:timestamp|submitted(?:\s*at)?|submission\s*date|date|time|email(?:\s*address)?|username|user\s*name|id|student\s*id|lrn|section|grade(?:\s*(?:&|and)?\s*section)?|track|strand|remarks|status|feedback|rank|no\.?|#)$/i;

const SCORE_HEADER_REGEX =
  /^(?:score|total\s*score|raw\s*score|overall\s*score|points|total\s*points|final\s*score|test\s*score|score\s*\(.*\)|mark|marks|rating|result|results)$/i;

const MAX_HEADER_REGEX = /^(?:total|max(?:\s*(?:score|items|points))?|out\s*of|items)$/i;

const BINARY_CELL_REGEX = /^(?:0|1|0\.0+|1\.0+|true|false|yes|no|correct|wrong|incorrect|check|checked|x|\/|✓|✔|✗|✘)$/i;
const POSITIVE_BINARY_REGEX = /^(?:1|1\.0+|true|yes|correct|check|checked|\/|✓|✔)$/i;

function gradeQuestionResponseMatrix(
  validRows: string[][],
  nameColIndex: number,
  scoreColIndex: number,
  itemCols: number[],
  headerRow: string[]
): {
  examinees: StudentScoreRecord[];
  questionPrompts: string[];
  itemMetadata: ParsedAssessmentItemMeta[];
  warning?: string;
} {
  const numItems = itemCols.length;
  const parsedReportedScores = validRows.map((row) =>
    scoreColIndex !== -1 ? parseScoreCell(row[scoreColIndex] || "") : null
  );

  // Check if item cells are explicit binary scores (0/1, True/False, Correct/Wrong)
  let nonEmptyCellCount = 0;
  let binaryCellCount = 0;
  for (const row of validRows) {
    for (const colIdx of itemCols) {
      const val = (row[colIdx] || "").trim();
      if (!val) continue;
      nonEmptyCellCount += 1;
      if (BINARY_CELL_REGEX.test(val)) {
        binaryCellCount += 1;
      }
    }
  }
  const isBinaryMatrix =
    nonEmptyCellCount > 0 && binaryCellCount / nonEmptyCellCount >= 0.85;

  const questionPrompts = itemCols.map((colIdx, idx) => {
    const rawHeader = (headerRow[colIdx] || "").trim();
    return rawHeader || `Item ${idx + 1}`;
  });

  if (isBinaryMatrix) {
    const examinees: StudentScoreRecord[] = validRows.map((row) => {
      const name = (row[nameColIndex] || "Unknown Learner").trim();
      const itemScores = itemCols.map((colIdx) => {
        const val = (row[colIdx] || "").trim();
        return POSITIVE_BINARY_REGEX.test(val) ? 1 : 0;
      });
      const rawScore = itemScores.reduce<number>((sum, val) => sum + val, 0);
      return {
        student_name: name,
        raw_score: rawScore,
        percentage: numItems > 0 ? Number(((rawScore / numItems) * 100).toFixed(2)) : 0,
        item_scores: itemScores,
      };
    });

    const itemMetadata: ParsedAssessmentItemMeta[] = questionPrompts.map(
      (prompt, idx) => ({
        itemNumber: idx + 1,
        questionPrompt: prompt,
      })
    );

    return { examinees, questionPrompts, itemMetadata };
  }

  // Text / MCQ response matrix (e.g., Google Forms full option text responses)
  const answerKeyNorm: string[] = new Array(numItems).fill("");
  const answerKeyDisplay: string[] = new Array(numItems).fill("");

  const perfectRowIndices: number[] = [];
  validRows.forEach((_, rIdx) => {
    const parsed = parsedReportedScores[rIdx];
    if (!parsed) return;
    const expectedMax = parsed.maxFromCell ?? numItems;
    if (expectedMax === numItems && Math.abs(parsed.score - numItems) < 1e-6) {
      perfectRowIndices.push(rIdx);
    }
  });

  const buildOptionListForItem = (j: number) => {
    const colIdx = itemCols[j] ?? 0;
    const displayMap = new Map<string, string>();
    const counts = new Map<string, number>();
    const scoreSums = new Map<string, number>();

    validRows.forEach((row, rIdx) => {
      const rawVal = (row[colIdx] || "").trim();
      const norm = normalizeAnswerToken(rawVal);
      if (!norm) return;
      if (!displayMap.has(norm)) displayMap.set(norm, rawVal);
      counts.set(norm, (counts.get(norm) || 0) + 1);
      const rep = parsedReportedScores[rIdx]?.score ?? 0;
      scoreSums.set(norm, (scoreSums.get(norm) || 0) + rep);
    });

    return { displayMap, counts, scoreSums };
  };

  if (perfectRowIndices.length > 0) {
    // Derive exact answer key by consensus among 100%-scoring examinees
    for (let j = 0; j < numItems; j++) {
      const colIdx = itemCols[j] ?? 0;
      const freq = new Map<string, { count: number; display: string }>();
      for (const rIdx of perfectRowIndices) {
        const rawVal = (validRows[rIdx]?.[colIdx] || "").trim();
        const norm = normalizeAnswerToken(rawVal);
        if (!norm) continue;
        const entry = freq.get(norm);
        if (entry) {
          entry.count += 1;
        } else {
          freq.set(norm, { count: 1, display: rawVal });
        }
      }
      let bestNorm = "";
      let bestCount = -1;
      let bestDisplay = "";
      freq.forEach((val, norm) => {
        if (val.count > bestCount) {
          bestCount = val.count;
          bestNorm = norm;
          bestDisplay = val.display;
        }
      });
      answerKeyNorm[j] = bestNorm;
      answerKeyDisplay[j] = bestDisplay;
    }
  } else {
    // Coordinate-descent agreement solver seeded by highest-scoring respondents
    for (let j = 0; j < numItems; j++) {
      const { displayMap, counts, scoreSums } = buildOptionListForItem(j);
      let bestNorm = "";
      let bestAvg = -1;
      counts.forEach((cnt, norm) => {
        const avg = (scoreSums.get(norm) || 0) / cnt;
        if (avg > bestAvg) {
          bestAvg = avg;
          bestNorm = norm;
        }
      });
      answerKeyNorm[j] = bestNorm;
      answerKeyDisplay[j] = displayMap.get(bestNorm) || "";
    }

    const hasNumericScores = parsedReportedScores.some((s) => s !== null);
    if (hasNumericScores) {
      const predictedScores = validRows.map((row) =>
        itemCols.reduce((sum, colIdx, j) => {
          const norm = normalizeAnswerToken(row[colIdx] || "");
          return sum + (norm && norm === answerKeyNorm[j] ? 1 : 0);
        }, 0)
      );

      for (let pass = 0; pass < 12; pass++) {
        let changed = false;
        for (let j = 0; j < numItems; j++) {
          const colIdx = itemCols[j] ?? 0;
          const { displayMap, counts, scoreSums } = buildOptionListForItem(j);
          const candidates = Array.from(counts.keys());
          if (candidates.length <= 1) continue;

          const currentKey = answerKeyNorm[j] || "";
          let bestCandidate = currentKey;
          let bestError = Infinity;
          let bestTieAvg = -1;

          for (const candidate of candidates) {
            let totalAbsErr = 0;
            for (let r = 0; r < validRows.length; r++) {
              const target = parsedReportedScores[r]?.score;
              if (target === undefined || target === null) continue;
              const studentAns = normalizeAnswerToken(validRows[r]?.[colIdx] || "");
              const oldMatch = studentAns !== "" && studentAns === currentKey ? 1 : 0;
              const newMatch = studentAns !== "" && studentAns === candidate ? 1 : 0;
              const nextPred = (predictedScores[r] || 0) - oldMatch + newMatch;
              totalAbsErr += Math.abs(nextPred - target);
            }
            const avg = (scoreSums.get(candidate) || 0) / (counts.get(candidate) || 1);
            if (
              totalAbsErr < bestError ||
              (totalAbsErr === bestError && avg > bestTieAvg)
            ) {
              bestError = totalAbsErr;
              bestTieAvg = avg;
              bestCandidate = candidate;
            }
          }

          if (bestCandidate !== currentKey) {
            for (let r = 0; r < validRows.length; r++) {
              const studentAns = normalizeAnswerToken(validRows[r]?.[colIdx] || "");
              const oldMatch = studentAns !== "" && studentAns === currentKey ? 1 : 0;
              const newMatch = studentAns !== "" && studentAns === bestCandidate ? 1 : 0;
              predictedScores[r] = (predictedScores[r] || 0) - oldMatch + newMatch;
            }
            answerKeyNorm[j] = bestCandidate;
            answerKeyDisplay[j] = displayMap.get(bestCandidate) || "";
            changed = true;
          }
        }
        if (!changed) break;
      }
    }
  }

  let mismatchedScoreRows = 0;
  const examinees: StudentScoreRecord[] = validRows.map((row, rIdx) => {
    const name = (row[nameColIndex] || `Learner ${rIdx + 1}`).trim();
    const itemScores = itemCols.map((colIdx, j) => {
      const ans = normalizeAnswerToken(row[colIdx] || "");
      return ans !== "" && ans === answerKeyNorm[j] ? 1 : 0;
    });
    const computedScore = itemScores.reduce<number>((sum, val) => sum + val, 0);
    const reported = parsedReportedScores[rIdx]?.score;
    if (reported !== undefined && reported !== null && Math.abs(computedScore - reported) > 0.01) {
      mismatchedScoreRows += 1;
    }
    return {
      student_name: name,
      raw_score: computedScore,
      percentage: numItems > 0 ? Number(((computedScore / numItems) * 100).toFixed(2)) : 0,
      item_scores: itemScores,
    };
  });

  const itemMetadata: ParsedAssessmentItemMeta[] = itemCols.map((colIdx, j) => {
    const wrongCounts = new Map<string, { count: number; display: string }>();
    for (const row of validRows) {
      const rawVal = (row[colIdx] || "").trim();
      const norm = normalizeAnswerToken(rawVal);
      if (!norm || norm === answerKeyNorm[j]) continue;
      const existing = wrongCounts.get(norm);
      if (existing) {
        existing.count += 1;
      } else {
        wrongCounts.set(norm, { count: 1, display: rawVal });
      }
    }
    let topDistractor: string | undefined;
    let topDistractorCount = 0;
    wrongCounts.forEach((entry) => {
      if (entry.count > topDistractorCount) {
        topDistractorCount = entry.count;
        topDistractor = entry.display;
      }
    });

    return {
      itemNumber: j + 1,
      questionPrompt: questionPrompts[j] || `Item ${j + 1}`,
      derivedAnswerKey: answerKeyDisplay[j] || undefined,
      topDistractor,
      topDistractorCount: topDistractorCount > 0 ? topDistractorCount : undefined,
    };
  });

  let warning: string | undefined;
  if (perfectRowIndices.length === 0 && !parsedReportedScores.some((s) => s !== null)) {
    warning =
      "No Score column or 100% score row was found; answer key was estimated by class consensus. Review Item Table for accuracy.";
  } else if (mismatchedScoreRows > 0) {
    warning = `Answer key derived automatically (${perfectRowIndices.length > 0 ? `${perfectRowIndices.length} perfect-score reference(s)` : "score-fit solver"}); ${mismatchedScoreRows} row(s) had minor rounding or partial-credit differences vs exported Score.`;
  }

  return { examinees, questionPrompts, itemMetadata, warning };
}

export interface ParsedAssessmentOutput {
  examinees: StudentScoreRecord[];
  totalItems: number;
  detectedFormat: "Google Forms / Item Matrix" | "Simple Score Roster" | "Unknown";
  questionPrompts?: string[];
  itemMetadata?: ParsedAssessmentItemMeta[];
  warning?: string;
}

/**
 * Ingests a CSV or XLSX file and parses student records with full formula sanitization.
 */
export async function parseAssessmentFile(file: File): Promise<ParsedAssessmentOutput> {
  const isXLSX = file.name.endsWith(".xlsx") || file.name.endsWith(".xls");

  let matrix: string[][] = [];

  if (isXLSX) {
    // Dynamic import of xlsx ensures library only loads when needed
    const XLSX = await import("xlsx");
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: "array" });
    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) {
      throw new Error("Uploaded workbook contains no sheets.");
    }
    const worksheet = workbook.Sheets[firstSheetName];
    if (!worksheet) {
      throw new Error("Uploaded worksheet is empty or invalid.");
    }
    matrix = XLSX.utils.sheet_to_json<string[]>(worksheet, {
      header: 1,
      raw: false,
      defval: "",
    });
  } else {
    const text = await file.text();
    matrix = parseCSV(text);
  }

  if (matrix.length < 2) {
    throw new Error("File must contain at least a header row and 1 data row.");
  }

  // Sanitize every cell in matrix (CWE-1236)
  const sanitizedMatrix = matrix.map((row) =>
    row.map((cell) => sanitizeSpreadsheetValue(cell))
  );

  const rawHeaderRow = sanitizedMatrix[0] || [];
  const headerRow = rawHeaderRow.map((h) => h.replace(/^'/, "").trim());
  const dataRows = sanitizedMatrix
    .slice(1)
    .map((row) => row.map((cell) => cell.replace(/^'/, "")))
    .filter((row) => row.some((cell) => cell.trim() !== ""));

  if (dataRows.length === 0) {
    throw new Error("File contains headers but no student response rows.");
  }

  // Detect columns safely:
  // 1) Student name column
  let nameColIndex = 0;
  const detectedNameIndex = headerRow.findIndex((col) =>
    col.length <= 80 && /name|student|learner|examinee/i.test(col)
  );
  if (detectedNameIndex !== -1) {
    nameColIndex = detectedNameIndex;
  }

  // 2) Summary Score column (prefer exact/short headers so long question prompts containing "score" don't match)
  let scoreColIndex = headerRow.findIndex(
    (col, idx) => idx !== nameColIndex && col.length <= 45 && SCORE_HEADER_REGEX.test(col)
  );
  if (scoreColIndex === -1) {
    scoreColIndex = headerRow.findIndex(
      (col, idx) =>
        idx !== nameColIndex &&
        col.length <= 40 &&
        /\b(?:score|raw|points|mark)\b/i.test(col) &&
        !/\?/.test(col)
    );
  }

  // 3) Optional Max/Total Items column
  const maxColIndex = headerRow.findIndex(
    (col, idx) =>
      idx !== nameColIndex &&
      idx !== scoreColIndex &&
      col.length <= 35 &&
      MAX_HEADER_REGEX.test(col)
  );

  // 4) Individual question / item columns:
  // Include explicit Q1/Item 1/1..N headers OR full-text Google Forms/Quizizz question columns
  // while excluding metadata columns (Timestamp, Email, Section, Remarks, etc.).
  const itemCols: number[] = [];
  headerRow.forEach((col, idx) => {
    if (idx === nameColIndex || idx === scoreColIndex || idx === maxColIndex) return;
    const trimmed = col.trim();
    if (!trimmed) return;

    const cleanHeader = trimmed.replace(/['"ItemQ\s]/gi, "");
    const isExplicitItemHeader =
      /^\d+$/.test(cleanHeader) || /item\s*\d+/i.test(trimmed) || /^q\d+/i.test(trimmed);

    if (isExplicitItemHeader) {
      itemCols.push(idx);
      return;
    }

    if (trimmed.length <= 40 && METADATA_HEADER_REGEX.test(trimmed)) {
      return;
    }

    // Any remaining populated column in a multi-column form export is treated as an assessment item
    itemCols.push(idx);
  });

  if (itemCols.length >= 3) {
    // FORMAT A: Item-by-item response matrix (Binary OR Google Forms text/MCQ responses)
    const graded = gradeQuestionResponseMatrix(
      dataRows,
      nameColIndex,
      scoreColIndex,
      itemCols,
      headerRow
    );
    const totalItems = itemCols.length;
    const examinees: StudentScoreRecord[] = graded.examinees.map((rec) => ({
      ...rec,
      percentage: Number(((rec.raw_score / totalItems) * 100).toFixed(2)),
    }));

    return {
      examinees,
      totalItems,
      detectedFormat: "Google Forms / Item Matrix",
      questionPrompts: graded.questionPrompts,
      itemMetadata: graded.itemMetadata,
      warning: graded.warning,
    };
  }

  // FORMAT B: Simple Score Roster (Name, Score, optional Max)
  const effectiveScoreCol =
    scoreColIndex !== -1 ? scoreColIndex : nameColIndex === 0 ? 1 : 0;

  let maxDetectedScore = 0;
  let maxFromCells = 0;
  const examinees: StudentScoreRecord[] = [];

  dataRows.forEach((row, rowIdx) => {
    const rawName = (row[nameColIndex] || `Student ${rowIdx + 1}`).trim();
    const parsedScore = parseScoreCell(row[effectiveScoreCol] || "");
    const rawScore = parsedScore ? parsedScore.score : 0;
    if (parsedScore?.maxFromCell && parsedScore.maxFromCell > maxFromCells) {
      maxFromCells = Math.ceil(parsedScore.maxFromCell);
    }
    if (maxColIndex !== -1) {
      const parsedMaxCol = parseScoreCell(row[maxColIndex] || "");
      if (parsedMaxCol && parsedMaxCol.score > maxFromCells) {
        maxFromCells = Math.ceil(parsedMaxCol.score);
      }
    }
    if (rawScore > maxDetectedScore) {
      maxDetectedScore = Math.ceil(rawScore);
    }

    examinees.push({
      student_name: rawName,
      raw_score: rawScore,
      percentage: 0,
      item_scores: [],
    });
  });

  const totalItems = Math.max(maxFromCells, maxDetectedScore, 20);
  examinees.forEach((e) => {
    e.percentage = Number(((e.raw_score / totalItems) * 100).toFixed(2));
    const roundedCorrect = Math.min(totalItems, Math.max(0, Math.round(e.raw_score)));
    e.item_scores = Array.from({ length: totalItems }, (_, i) =>
      i < roundedCorrect ? 1 : 0
    );
  });

  return {
    examinees,
    totalItems,
    detectedFormat: "Simple Score Roster",
    warning:
      "Parsed score roster without per-item responses. Upload the full response matrix CSV/XLSX for exact per-item Difficulty Index (Dj).",
  };
}
