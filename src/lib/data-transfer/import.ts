import { CSV_COLUMNS, type CsvColumn } from "./csv.ts";
import { MEASUREMENT_VALUE_FIELDS } from "../measurements/fields.ts";
import {
  parseMeasurementInput,
  type MeasurementInput,
  type MeasurementIssue,
  type ParsedMeasurement,
} from "../measurements/validation.ts";
import { HEIGHT_CM_MAX, HEIGHT_CM_MIN } from "../profile/fields.ts";
import { parseHeightCm, roundHeightCm } from "../profile/validation.ts";

/**
 * Importing measurements from the CSV format the export writes (./csv.ts).
 *
 * Shared by the browser, for an immediate preview, and the server action,
 * which runs it again before writing anything - the browser's result is a
 * convenience, not a guarantee.
 *
 * Every row goes through `parseMeasurementInput`, the same rules as the form.
 * Two additions belong to importing:
 *
 * - `heightCmAtMeasurement` is taken from the row when present, so a history
 *   exported elsewhere keeps the height each reading was taken at and its BMI
 *   does not move. A row without it gets the profile's current height, as a
 *   new measurement would.
 * - A row whose instant matches an existing measurement is skipped, so
 *   importing the same export twice changes nothing.
 *
 * An import is all or nothing: one bad row and nothing is written, and every
 * problem is reported with its line number.
 *
 * This module is pure: no Prisma, no React, no environment access.
 */

/** More rows than years of daily readings; anything beyond is not a measurement log. */
export const IMPORT_MAX_ROWS = 5000;

/**
 * About 100 bytes a row, with room to spare - and below the 1 MB Next allows
 * a server action request body by default, so the limit never needs raising
 * on a 2 GB Raspberry Pi.
 */
export const IMPORT_MAX_BYTES = 900_000;

export type ImportIssueCode =
  | "FILE_EMPTY"
  | "FILE_TOO_LARGE"
  | "TOO_MANY_ROWS"
  | "MALFORMED"
  | "MISSING_MEASURED_AT_COLUMN"
  | "UNKNOWN_COLUMN"
  | "DUPLICATE_COLUMN"
  | "WRONG_CELL_COUNT"
  | "HEIGHT_INVALID"
  | "HEIGHT_REQUIRED"
  | "DUPLICATE_IN_FILE"
  | MeasurementIssue["code"];

export type ImportIssue = {
  /** 1-based line in the file; 0 for problems with the file as a whole. */
  line: number;
  code: ImportIssueCode;
  /** The column or field concerned, when there is one. */
  field?: string;
};

export type ImportRow = ParsedMeasurement & { heightCmAtMeasurement: number };

export type ImportPlan =
  | { status: "invalid"; issues: ImportIssue[] }
  | {
      status: "ready";
      /** New measurements, oldest first. */
      rows: ImportRow[];
      /** Rows matching a measurement that already exists. */
      skippedDuplicates: number;
    };

// ---------------------------------------------------------------------------
// RFC 4180 reader
// ---------------------------------------------------------------------------

/**
 * Splits CSV text into records of cells, with each record's starting line.
 *
 * Handles quoted cells (with doubled quotes and embedded line breaks), CRLF or
 * LF endings, and a UTF-8 byte order mark. Returns null for an unterminated
 * quote, the one thing that cannot be read at all.
 */
export function readCsv(
  text: string,
  delimiter: string,
): Array<{ line: number; cells: string[] }> | null {
  const source = text.startsWith("﻿") ? text.slice(1) : text;
  const records: Array<{ line: number; cells: string[] }> = [];
  let cells: string[] = [];
  let cell = "";
  let quoted = false;
  let line = 1;
  let recordLine = 1;

  for (let i = 0; i < source.length; i++) {
    const char = source[i];
    if (quoted) {
      if (char === '"') {
        if (source[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          quoted = false;
        }
      } else {
        if (char === "\n") line++;
        cell += char;
      }
      continue;
    }
    if (char === '"' && cell.length === 0) {
      quoted = true;
    } else if (char === delimiter) {
      cells.push(cell);
      cell = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && source[i + 1] === "\n") i++;
      cells.push(cell);
      records.push({ line: recordLine, cells });
      cells = [];
      cell = "";
      line++;
      recordLine = line;
    } else {
      cell += char;
    }
  }
  if (quoted) {
    return null;
  }
  if (cell.length > 0 || cells.length > 0) {
    cells.push(cell);
    records.push({ line: recordLine, cells });
  }
  // Blank lines carry nothing; a trailing one is normal.
  return records.filter(
    (record) => !(record.cells.length === 1 && record.cells[0]?.trim() === ""),
  );
}

/**
 * `,` as the export writes; `;` as spreadsheets in comma-decimal locales
 * (Portuguese among them) save CSV. Decided by the header line.
 */
export function detectDelimiter(text: string): "," | ";" {
  const header = text.split(/\r?\n/, 1)[0] ?? "";
  return header.split(";").length > header.split(",").length ? ";" : ",";
}

/** Reverses `neutraliseFormula` from ./csv.ts. */
export function restoreFormula(text: string): string {
  return /^'[=+\-@\t\r]/.test(text) ? text.slice(1) : text;
}

// ---------------------------------------------------------------------------
// Planning an import
// ---------------------------------------------------------------------------

function isCsvColumn(name: string): name is CsvColumn {
  return (CSV_COLUMNS as readonly string[]).includes(name);
}

function parseRowHeight(raw: string): number | null | "invalid" {
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    return null;
  }
  const parsed = parseHeightCm(trimmed);
  if (parsed === null) {
    return "invalid";
  }
  const rounded = roundHeightCm(parsed);
  return rounded < HEIGHT_CM_MIN || rounded > HEIGHT_CM_MAX ? "invalid" : rounded;
}

/**
 * Reads, validates and de-duplicates a CSV file into the rows to insert.
 *
 * @param existing instants (ms) of the user's measurements already stored
 * @param profileHeightCm current profile height, or null without a profile
 * @param now injectable for the "not in the future" rule
 */
export function planImport(
  text: string,
  options: {
    existing: ReadonlySet<number>;
    profileHeightCm: number | null;
    now?: Date;
  },
): ImportPlan {
  const fail = (issues: ImportIssue[]): ImportPlan => ({ status: "invalid", issues });

  if (new TextEncoder().encode(text).length > IMPORT_MAX_BYTES) {
    return fail([{ line: 0, code: "FILE_TOO_LARGE" }]);
  }
  const records = readCsv(text, detectDelimiter(text));
  if (records === null) {
    return fail([{ line: 0, code: "MALFORMED" }]);
  }
  const [header, ...body] = records;
  if (!header || body.length === 0) {
    return fail([{ line: 0, code: "FILE_EMPTY" }]);
  }
  if (body.length > IMPORT_MAX_ROWS) {
    return fail([{ line: 0, code: "TOO_MANY_ROWS" }]);
  }

  // Header: known columns only, each at most once, measuredAt required.
  const columns = header.cells.map((name) => name.trim());
  const headerIssues: ImportIssue[] = [];
  columns.forEach((name, index) => {
    if (!isCsvColumn(name)) {
      headerIssues.push({ line: header.line, code: "UNKNOWN_COLUMN", field: name });
    } else if (columns.indexOf(name) !== index) {
      headerIssues.push({ line: header.line, code: "DUPLICATE_COLUMN", field: name });
    }
  });
  if (!columns.includes("measuredAt")) {
    headerIssues.push({ line: header.line, code: "MISSING_MEASURED_AT_COLUMN" });
  }
  if (headerIssues.length > 0) {
    return fail(headerIssues);
  }

  const issues: ImportIssue[] = [];
  const rows: ImportRow[] = [];
  const seenInFile = new Set<number>();
  let skippedDuplicates = 0;

  for (const record of body) {
    if (record.cells.length !== columns.length) {
      issues.push({ line: record.line, code: "WRONG_CELL_COUNT" });
      continue;
    }
    const cell = (column: CsvColumn): string => {
      const index = columns.indexOf(column);
      return index === -1 ? "" : (record.cells[index] ?? "");
    };

    const input = { measuredAt: cell("measuredAt") } as MeasurementInput;
    for (const field of MEASUREMENT_VALUE_FIELDS) {
      input[field] = cell(field);
    }
    input.note = restoreFormula(cell("note"));

    const parsed = parseMeasurementInput(input, options.now);
    const height = parseRowHeight(cell("heightCmAtMeasurement"));
    const rowIssues: ImportIssue[] = parsed.issues.map((issue) => ({
      line: record.line,
      code: issue.code,
      field: issue.field,
    }));
    if (height === "invalid") {
      rowIssues.push({ line: record.line, code: "HEIGHT_INVALID", field: "heightCmAtMeasurement" });
    } else if (height === null && options.profileHeightCm === null) {
      rowIssues.push({ line: record.line, code: "HEIGHT_REQUIRED", field: "heightCmAtMeasurement" });
    }
    if (rowIssues.length > 0 || !parsed.measurement || height === "invalid") {
      issues.push(...rowIssues);
      continue;
    }

    const instant = parsed.measurement.measuredAt.getTime();
    if (seenInFile.has(instant)) {
      issues.push({ line: record.line, code: "DUPLICATE_IN_FILE", field: "measuredAt" });
      continue;
    }
    seenInFile.add(instant);
    if (options.existing.has(instant)) {
      skippedDuplicates++;
      continue;
    }

    rows.push({
      ...parsed.measurement,
      heightCmAtMeasurement: height ?? (options.profileHeightCm as number),
    });
  }

  if (issues.length > 0) {
    return fail(issues);
  }
  rows.sort((a, b) => a.measuredAt.getTime() - b.measuredAt.getTime());
  return { status: "ready", rows, skippedDuplicates };
}
