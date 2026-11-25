/**
 * e-FTNHS Validation & Security Sanitization Utilities
 */

export interface FileValidationResult {
  valid: boolean;
  error?: string;
}

export const UPLOAD_LIMITS = {
  DOCX: {
    maxBytes: 15 * 1024 * 1024, // 15MB
    label: "15MB",
    mimeTypes: [
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/msword",
    ],
  },
  PDF: {
    maxBytes: 25 * 1024 * 1024, // 25MB
    label: "25MB",
    mimeTypes: ["application/pdf"],
  },
  SPREADSHEET: {
    maxBytes: 5 * 1024 * 1024, // 5MB
    label: "5MB",
    mimeTypes: [
      "text/csv",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
    ],
  },
  IMAGE: {
    maxBytes: 10 * 1024 * 1024, // 10MB
    label: "10MB",
    mimeTypes: ["image/png", "image/jpeg", "image/webp"],
  },
};

/**
 * Validates a file against allowed MIME types and max byte limits (Rule 3.4)
 */
export function validateUploadedFile(
  file: File,
  allowedMimeTypes: string[],
  maxBytes: number,
  sizeLabel: string
): FileValidationResult {
  if (!file) {
    return { valid: false, error: "No file was selected for upload." };
  }

  // Check file size
  if (file.size > maxBytes) {
    return {
      valid: false,
      error: `File size (${(file.size / (1024 * 1024)).toFixed(1)}MB) exceeds maximum allowed limit of ${sizeLabel}.`,
    };
  }

  // Check MIME type
  if (allowedMimeTypes.length > 0 && !allowedMimeTypes.includes(file.type)) {
    return {
      valid: false,
      error: `Unsupported file format (${file.type || "unknown"}). Please upload an authorized format.`,
    };
  }

  return { valid: true };
}

/**
 * Sanitizes cell values to neutralize CSV / Spreadsheet Formula Injection (CWE-1236, Rule 3.5).
 * Characters that trigger formulas in Excel / Calc / Sheets ('=', '+', '-', '@', '\t', '\r')
 * are prepended with an apostrophe.
 */
export function sanitizeSpreadsheetCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  const str = String(value).trim();
  if (str.length === 0) return "";

  const formulaTriggers = ["=", "+", "-", "@", "\t", "\r"];
  if (formulaTriggers.includes(str.charAt(0))) {
    // Prepend single quote to force spreadsheet programs to treat as text
    return `'${str}`;
  }

  return str;
}

/**
 * Validates email format
 */
export function isValidEmail(email: string): boolean {
  if (!email) return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}
