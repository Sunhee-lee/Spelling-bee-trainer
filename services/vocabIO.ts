/**
 * Import/export helpers for vocabulary.
 *
 * Import accepts one entry per line in either format:
 *   Format A — number,english,korean   e.g.  1,add,더하다
 *   Format B — english,korean          e.g.  add,더하다
 * When the number is omitted it is auto-assigned later by the store.
 *
 * Export is CSV with a `number,word,meaning` header.
 */

export interface ParsedEntry {
  /** Explicit number from Format A, or undefined to auto-assign. */
  number?: number;
  word: string;
  meaning: string;
}

export interface ParseResult {
  /** Well-formed entries, in file order. */
  entries: ParsedEntry[];
  /** Number of blank lines that were ignored. */
  skippedEmpty: number;
  /** Line numbers (1-based) that could not be parsed. */
  invalidLines: number[];
}

/** A non-negative integer string like "17" (no signs, decimals, or spaces). */
function parseLeadingNumber(field: string): number | null {
  return /^\d+$/.test(field) ? Number(field) : null;
}

/**
 * Parse pasted bulk-import text into entries.
 * - Empty/whitespace-only lines are ignored.
 * - A line with 3+ fields whose first field is an integer is Format A
 *   (number, word, meaning). Otherwise it is Format B (word, meaning).
 * - All fields are trimmed; a missing word or meaning marks the line invalid.
 */
export function parseImportText(text: string): ParseResult {
  const entries: ParsedEntry[] = [];
  const invalidLines: number[] = [];
  let skippedEmpty = 0;

  const lines = text.split(/\r?\n/);
  lines.forEach((line, index) => {
    if (line.trim() === "") {
      skippedEmpty++;
      return;
    }

    const fields = line.split(",").map((f) => f.trim());
    let number: number | undefined;
    let word: string;
    let meaning: string;

    const leading = fields.length >= 3 ? parseLeadingNumber(fields[0]) : null;
    if (leading !== null) {
      // Format A: number, word, meaning (meaning may itself contain commas).
      number = leading;
      word = fields[1];
      meaning = fields.slice(2).join(",").trim();
    } else {
      // Format B: word, meaning.
      word = fields[0];
      meaning = fields.slice(1).join(",").trim();
    }

    if (word === "" || meaning === "") {
      invalidLines.push(index + 1);
      return;
    }
    entries.push({ number, word, meaning });
  });

  return { entries, skippedEmpty, invalidLines };
}

/** Escape a single CSV field per RFC 4180. */
function csvField(value: string): string {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export interface CsvRow {
  number: number;
  word: string;
  meaning: string;
}

/** Serialize rows to CSV with a `number,word,meaning` header. */
export function toCsv(rows: CsvRow[]): string {
  const body = rows.map(
    (r) => `${r.number},${csvField(r.word)},${csvField(r.meaning)}`
  );
  return ["number,word,meaning", ...body].join("\n");
}
