/**
 * Import/export helpers for vocabulary.
 *
 * Import format is one entry per line: `english,korean`, e.g.
 *   add,더하다
 *   apple,사과
 * Export format is CSV with a `word,meaning` header.
 */

export interface ParsedEntry {
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

/**
 * Parse pasted bulk-import text into entries.
 * - Empty/whitespace-only lines are ignored.
 * - Each entry splits on the first comma; the rest is the meaning.
 * - Both sides are trimmed; a missing word or meaning marks the line invalid.
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
    const commaAt = line.indexOf(",");
    if (commaAt === -1) {
      invalidLines.push(index + 1);
      return;
    }
    const word = line.slice(0, commaAt).trim();
    const meaning = line.slice(commaAt + 1).trim();
    if (word === "" || meaning === "") {
      invalidLines.push(index + 1);
      return;
    }
    entries.push({ word, meaning });
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

/** Serialize entries to a CSV string with a `word,meaning` header. */
export function toCsv(entries: ParsedEntry[]): string {
  const rows = entries.map(
    (e) => `${csvField(e.word)},${csvField(e.meaning)}`
  );
  return ["word,meaning", ...rows].join("\n");
}
