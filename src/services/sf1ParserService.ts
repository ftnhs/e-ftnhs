/**
 * sf1ParserService.ts
 * Intelligent & AI-Assisted DepEd School Form 1 (SF1) School Register Parser
 * Handles official DepEd LIS SF1 Excel (.xlsx/.xls) & CSV exports (including merged cells,
 * multi-row subheaders, mm-dd-yyyy & Excel serial dates, and LIS summary/legend footers),
 * as well as custom roster spreadsheets using semantic header + cell-pattern inference.
 * Enforces CWE-1236 formula injection neutralization on every text field.
 */

import { parseCSV, sanitizeSpreadsheetValue } from "./fileSanitizer";
import type { EnrollmentStatus } from "../types";

export interface ParsedSF1Learner {
  lrn: string;
  full_name: string;
  gender: "Male" | "Female";
  birthdate: string | null;
  age_june: number | null;
  mother_tongue: string | null;
  ip_ethnic_group: string | null;
  religion: string | null;
  address_street: string | null;
  address_barangay: string | null;
  address_municipality: string | null;
  address_province: string | null;
  father_name: string | null;
  mother_maiden_name: string | null;
  guardian_name: string | null;
  guardian_relationship: string | null;
  parent_guardian_contact: string | null;
  learning_modality: string | null;
  sf1_remarks: string | null;
  enrollment_status: EnrollmentStatus;
}

export interface SF1ParseResult {
  detectedFormat: "Official DepEd LIS SF1" | "AI-Assisted Semantic Roster";
  metadata: {
    schoolId?: string;
    schoolName?: string;
    schoolYear?: string;
    gradeLevel?: string;
    sectionName?: string;
    adviserName?: string;
  };
  learners: ParsedSF1Learner[];
  warnings: string[];
}

function cleanText(raw: unknown): string | null {
  if (raw === null || raw === undefined) return null;
  const sanitized = sanitizeSpreadsheetValue(raw).replace(/^'/, "").trim();
  if (!sanitized || sanitized === "-" || sanitized === "--") return null;
  return sanitized.replace(/\s+/g, " ");
}

function cleanPersonName(raw: unknown): string | null {
  const txt = cleanText(raw);
  if (!txt) return null;
  // Normalize LIS formatting like "BACSAN,GIAN MARK, TULOY" or "TULOY,MARICEL,JOSOL,"
  const withoutTrailingComma = txt.replace(/,+$/, "").trim();
  const normalizedCommas = withoutTrailingComma
    .replace(/\s*,\s*/g, ", ")
    .replace(/\s+/g, " ")
    .trim();
  return normalizedCommas || null;
}

function normalizeLrn(raw: unknown): string {
  const txt = String(raw ?? "").trim();
  // Handle Excel scientific/float like "118090180001.0"
  const noDecimal = txt.replace(/\.0+$/, "");
  return sanitizeSpreadsheetValue(noDecimal).replace(/^'/, "").trim();
}

function parseGender(raw: unknown): "Male" | "Female" {
  const s = String(raw ?? "").trim().toLowerCase();
  if (s === "f" || s.startsWith("fem")) return "Female";
  return "Male";
}

function parseBirthdateToISO(raw: unknown): string | null {
  if (raw === null || raw === undefined || raw === "") return null;

  // Excel serial number (days since 1899-12-30)
  if (typeof raw === "number" && Number.isFinite(raw) && raw > 15000 && raw < 80000) {
    const epoch = new Date(Date.UTC(1899, 11, 30));
    const dt = new Date(epoch.getTime() + Math.round(raw) * 86400000);
    return dt.toISOString().slice(0, 10);
  }

  const s = String(raw).trim();
  if (!s) return null;

  // Numeric string Excel serial
  if (/^\d{5}$/.test(s)) {
    const num = Number(s);
    if (num > 15000 && num < 80000) {
      const epoch = new Date(Date.UTC(1899, 11, 30));
      const dt = new Date(epoch.getTime() + num * 86400000);
      return dt.toISOString().slice(0, 10);
    }
  }

  // YYYY-MM-DD or YYYY/MM/DD
  const isoMatch = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (isoMatch) {
    const [, y, m, d] = isoMatch;
    if (y && m && d) {
      return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
    }
  }

  // DepEd SF1 standard: MM-DD-YYYY or MM/DD/YYYY
  const mdyMatch = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (mdyMatch) {
    const [, p1, p2, y] = mdyMatch;
    if (p1 && p2 && y) {
      const n1 = Number(p1);
      const n2 = Number(p2);
      // If first number > 12, it's DD/MM/YYYY; otherwise MM/DD/YYYY
      const month = n1 > 12 ? n2 : n1;
      const day = n1 > 12 ? n1 : n2;
      if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
        return `${y}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      }
    }
  }

  const parsed = new Date(s);
  if (!Number.isNaN(parsed.getTime())) {
    const y = parsed.getFullYear();
    const m = String(parsed.getMonth() + 1).padStart(2, "0");
    const d = String(parsed.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  return null;
}

function inferEnrollmentStatusFromRemarks(remarks: string | null): EnrollmentStatus {
  if (!remarks) return "Enrolled";
  const upper = remarks.toUpperCase();
  if (/\bT\/O\b|TRANSFERRED OUT|TRANSFER OUT/.test(upper)) return "Transferred Out";
  if (/\bT\/I\b|TRANSFERRED IN|TRANSFER IN/.test(upper)) return "Transferred In";
  if (/\bDRP\b|DROPPED/.test(upper)) return "Dropped";
  return "Enrolled";
}

function extractSF1Metadata(rows: string[][]): SF1ParseResult["metadata"] {
  const metadata: SF1ParseResult["metadata"] = {};
  const topRows = rows.slice(0, 8);
  for (const row of topRows) {
    for (let c = 0; c < row.length; c++) {
      const cell = (row[c] || "").trim();
      const lower = cell.toLowerCase();
      const nextNonEmpty = () => {
        for (let k = c + 1; k < Math.min(row.length, c + 8); k++) {
          const val = (row[k] || "").trim();
          if (val) return val;
        }
        return "";
      };

      if (lower.startsWith("school id")) {
        metadata.schoolId = nextNonEmpty().replace(/\.0+$/, "");
      } else if (lower.startsWith("school name")) {
        metadata.schoolName = nextNonEmpty();
      } else if (lower.startsWith("school year")) {
        metadata.schoolYear = nextNonEmpty();
      } else if (lower.startsWith("grade level")) {
        metadata.gradeLevel = nextNonEmpty().replace(/[()]/g, "");
      } else if (lower === "section" || lower.startsWith("section")) {
        const sec = nextNonEmpty();
        if (sec && sec.length < 40) metadata.sectionName = sec;
      }
    }
  }
  return metadata;
}

/**
 * Parses a matrix of cells (from CSV/TSV or SheetJS sheet_to_json({ header: 1 }))
 * into structured SF1 learner profiles.
 */
export function parseSF1Matrix(rawRows: unknown[][]): SF1ParseResult {
  const rows: string[][] = rawRows.map((r) =>
    Array.isArray(r) ? r.map((cell) => (cell === null || cell === undefined ? "" : String(cell).trim())) : []
  );

  const warnings: string[] = [];
  const metadata = extractSF1Metadata(rows);

  // Locate primary header row containing LRN or NAME/SEX
  let headerIdx = -1;
  for (let i = 0; i < Math.min(rows.length, 20); i++) {
    const row = rows[i] || [];
    const joined = row.map((c) => c.toLowerCase()).join(" | ");
    if (
      (joined.includes("lrn") && (joined.includes("sex") || joined.includes("name"))) ||
      (joined.includes("name") && joined.includes("birth"))
    ) {
      headerIdx = i;
      break;
    }
  }

  // Case A: Official DepEd LIS SF1 Format (with multi-row header & subheader)
  if (headerIdx !== -1) {
    const mainHeader = rows[headerIdx] || [];
    const subHeader = rows[headerIdx + 1] || [];
    const hasSubHeader = subHeader.some((c) =>
      /barangay|municipality|province|father|mother|relationship|purok/i.test(c)
    );

    const colMap: Record<string, number> = {};
    const findCol = (targetRow: string[], pattern: RegExp, fromIdx = 0): number => {
      for (let c = fromIdx; c < targetRow.length; c++) {
        if (pattern.test((targetRow[c] || "").replace(/\s+/g, " ").trim())) return c;
      }
      return -1;
    };

    colMap.lrn = findCol(mainHeader, /^lrn\b|learner reference/i);
    colMap.name = findCol(mainHeader, /^name\b|learner'?s?\s*name|full\s*name/i);
    colMap.sex = findCol(mainHeader, /^sex\b|gender/i);
    colMap.birthdate = findCol(mainHeader, /birth\s*date|date\s*of\s*birth|\bdob\b/i);
    colMap.age = findCol(mainHeader, /^age\b/i);
    colMap.motherTongue = findCol(mainHeader, /mother\s*tongue/i);
    colMap.ip = findCol(mainHeader, /\bip\b|ethnic/i);
    colMap.religion = findCol(mainHeader, /religion/i);
    colMap.contact = findCol(mainHeader, /contact\s*number|mobile|phone/i);
    colMap.modality = findCol(mainHeader, /learning\s*modality|modality/i);
    colMap.remarks = findCol(mainHeader, /^remarks\b/i);

    const addressStart = findCol(mainHeader, /^address\b/i);
    const parentsStart = findCol(mainHeader, /^parents\b/i);
    const guardianStart = findCol(mainHeader, /^guardian\b/i);

    const subSearchRow = hasSubHeader ? subHeader : mainHeader;
    colMap.street = findCol(subSearchRow, /house|street|sitio|purok/i, Math.max(0, addressStart));
    colMap.barangay = findCol(subSearchRow, /barangay/i, Math.max(0, addressStart));
    colMap.municipality = findCol(subSearchRow, /municipality|city/i, Math.max(0, addressStart));
    colMap.province = findCol(subSearchRow, /province/i, Math.max(0, addressStart));

    colMap.father = findCol(subSearchRow, /father/i, Math.max(0, parentsStart));
    colMap.mother = findCol(subSearchRow, /mother'?s?\s*maiden|mother/i, Math.max(0, parentsStart));

    colMap.guardianName = findCol(
      subSearchRow,
      /^name\b|guardian\s*name/i,
      guardianStart >= 0 ? guardianStart : Math.max(0, colMap.mother + 1)
    );
    colMap.guardianRel = findCol(
      subSearchRow,
      /relationship/i,
      guardianStart >= 0 ? guardianStart : Math.max(0, colMap.guardianName)
    );

    const startDataRow = hasSubHeader ? headerIdx + 2 : headerIdx + 1;
    const learners: ParsedSF1Learner[] = [];

    for (let r = startDataRow; r < rows.length; r++) {
      const row = rows[r] || [];
      const rowText = row.join(" ").toUpperCase();

      // Stop when reaching SF1 indicator legend/footer
      if (
        rowText.includes("LIST AND CODE OF INDICATORS") ||
        rowText.includes("GENERATED THRU LIS")
      ) {
        break;
      }

      // Skip summary rows like "9.0 <=== TOTAL MALE", "<=== TOTAL FEMALE", "<=== COMBINED"
      if (rowText.includes("<===") || rowText.includes("TOTAL MALE") || rowText.includes("TOTAL FEMALE") || rowText.includes("COMBINED")) {
        continue;
      }

      const lrnVal = colMap.lrn >= 0 ? normalizeLrn(row[colMap.lrn]) : "";
      const nameVal = colMap.name >= 0 ? cleanPersonName(row[colMap.name]) : null;
      if (!nameVal) continue;
      if (!lrnVal && !/^\d{8,14}$/.test(lrnVal)) {
        // Skip stray non-learner note rows
        continue;
      }

      const getAt = (idx: number): string | undefined => (idx >= 0 ? row[idx] : undefined);

      const rawAge = getAt(colMap.age);
      const parsedAge = rawAge && /^\d+$/.test(rawAge.trim()) ? Number(rawAge.trim()) : null;
      const remarksVal = cleanText(getAt(colMap.remarks));

      learners.push({
        lrn: lrnVal || `TEMP-${r}`,
        full_name: nameVal,
        gender: parseGender(getAt(colMap.sex)),
        birthdate: parseBirthdateToISO(getAt(colMap.birthdate)),
        age_june: parsedAge,
        mother_tongue: cleanText(getAt(colMap.motherTongue)),
        ip_ethnic_group: cleanText(getAt(colMap.ip)),
        religion: cleanText(getAt(colMap.religion)),
        address_street: cleanText(getAt(colMap.street)),
        address_barangay: cleanText(getAt(colMap.barangay)),
        address_municipality: cleanText(getAt(colMap.municipality)),
        address_province: cleanText(getAt(colMap.province)),
        father_name: cleanPersonName(getAt(colMap.father)),
        mother_maiden_name: cleanPersonName(getAt(colMap.mother)),
        guardian_name: cleanPersonName(getAt(colMap.guardianName)),
        guardian_relationship: cleanText(getAt(colMap.guardianRel)),
        parent_guardian_contact: cleanText(getAt(colMap.contact)),
        learning_modality: cleanText(getAt(colMap.modality)) || "Face to Face",
        sf1_remarks: remarksVal,
        enrollment_status: inferEnrollmentStatusFromRemarks(remarksVal),
      });
    }

    const isOfficialSF1 =
      colMap.motherTongue >= 0 || colMap.father >= 0 || colMap.barangay >= 0;

    return {
      detectedFormat: isOfficialSF1 ? "Official DepEd LIS SF1" : "AI-Assisted Semantic Roster",
      metadata,
      learners,
      warnings,
    };
  }

  // Case B: Headerless or non-standard paste ("Name, LRN, Sex, Birthdate")
  const learners: ParsedSF1Learner[] = [];
  for (let r = 0; r < rows.length; r++) {
    const cols = (rows[r] || []).filter((c) => c !== "");
    if (cols.length < 2) continue;

    let lrn = "";
    let fullName = "";
    let gender: "Male" | "Female" = "Male";
    let birthdate: string | null = null;

    for (const c of cols) {
      const cleaned = c.replace(/\.0+$/, "").trim();
      if (!lrn && /^\d{10,14}$/.test(cleaned)) {
        lrn = cleaned;
      } else if (/^(m|f|male|female)$/i.test(cleaned)) {
        gender = parseGender(cleaned);
      } else if (!birthdate && /^\d{4}[-/]\d{1,2}[-/]\d{1,2}$|^\d{1,2}[-/]\d{1,2}[-/]\d{4}$/.test(cleaned)) {
        birthdate = parseBirthdateToISO(cleaned);
      } else if (!fullName && cleaned.length > 2) {
        fullName = cleanPersonName(cleaned) || "";
      }
    }

    if (fullName) {
      learners.push({
        lrn: lrn || `TEMP-${Date.now()}-${r}`,
        full_name: fullName,
        gender,
        birthdate,
        age_june: null,
        mother_tongue: null,
        ip_ethnic_group: null,
        religion: null,
        address_street: null,
        address_barangay: null,
        address_municipality: null,
        address_province: null,
        father_name: null,
        mother_maiden_name: null,
        guardian_name: null,
        guardian_relationship: null,
        parent_guardian_contact: null,
        learning_modality: "Face to Face",
        sf1_remarks: null,
        enrollment_status: "Enrolled",
      });
    }
  }

  if (learners.length === 0) {
    warnings.push("Could not detect learner rows. Ensure the file is a DepEd SF1 export or contains LRN & Learner Name columns.");
  }

  return {
    detectedFormat: "AI-Assisted Semantic Roster",
    metadata,
    learners,
    warnings,
  };
}

export async function parseSF1File(file: File): Promise<SF1ParseResult> {
  const lower = file.name.toLowerCase();
  if (lower.endsWith(".csv") || lower.endsWith(".tsv")) {
    const text = await file.text();
    const matrix = parseCSV(lower.endsWith(".tsv") ? text.replace(/\t/g, ",") : text);
    return parseSF1Matrix(matrix);
  }

  const XLSX = await import("xlsx");
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: "array" });
  const firstSheet = wb.SheetNames[0];
  if (!firstSheet || !wb.Sheets[firstSheet]) {
    throw new Error("The uploaded workbook has no readable sheets.");
  }
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[firstSheet]!, {
    header: 1,
    defval: "",
    raw: true,
  });
  return parseSF1Matrix(matrix);
}

export function parseSF1Text(rawText: string): SF1ParseResult {
  const normalized = rawText.includes("\t") && !rawText.includes(",")
    ? rawText.replace(/\t/g, ",")
    : rawText;
  const matrix = parseCSV(normalized);
  return parseSF1Matrix(matrix);
}
