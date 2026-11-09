import {
  MEASUREMENT_VALUE_FIELDS,
  type MeasurementValueField,
} from "../measurements/fields.ts";

/**
 * The measurement CSV format, defined once for both export and import.
 *
 * - One header row with the stable field keys below - never translated, so a
 *   file exported in Portuguese imports in English and vice versa.
 * - `measuredAt` is an ISO 8601 instant in UTC.
 * - Numbers use `.` as the decimal separator and no grouping.
 * - An empty cell means "not recorded".
 * - Quoting follows RFC 4180: a cell containing a comma, quote or line break
 *   is wrapped in double quotes, with inner quotes doubled.
 *
 * BMI and the waist-to-height ratio are not columns: they are derived, and a
 * file that carried them could carry values that disagree with their inputs.
 *
 * This module is pure: no Prisma, no React, no environment access.
 */

export const CSV_COLUMNS = [
  "measuredAt",
  ...MEASUREMENT_VALUE_FIELDS,
  "heightCmAtMeasurement",
  "note",
] as const;

export type CsvColumn = (typeof CSV_COLUMNS)[number];

/** What a measurement must provide to be exported. */
export type ExportableMeasurement = {
  measuredAt: Date;
  heightCmAtMeasurement: number;
  note: string | null;
} & Record<MeasurementValueField, number | null>;

/**
 * Spreadsheet applications execute a cell that starts with one of these as a
 * formula ("CSV injection"). Free text gets a leading apostrophe, which
 * spreadsheets display as text, and which the importer strips again.
 */
const FORMULA_PREFIXES = ["=", "+", "-", "@", "\t", "\r"];

export function neutraliseFormula(text: string): string {
  return FORMULA_PREFIXES.some((prefix) => text.startsWith(prefix))
    ? `'${text}`
    : text;
}

function quote(cell: string): string {
  return /[",\r\n]/.test(cell) ? `"${cell.replaceAll('"', '""')}"` : cell;
}

function cellFor(measurement: ExportableMeasurement, column: CsvColumn): string {
  switch (column) {
    case "measuredAt":
      return measurement.measuredAt.toISOString();
    case "heightCmAtMeasurement":
      return String(measurement.heightCmAtMeasurement);
    case "note":
      return measurement.note === null ? "" : neutraliseFormula(measurement.note);
    default: {
      const value = measurement[column];
      return value === null ? "" : String(value);
    }
  }
}

/**
 * Measurements as CSV text, oldest first, with CRLF line endings (RFC 4180)
 * and a trailing line break.
 */
export function measurementsToCsv(
  measurements: readonly ExportableMeasurement[],
): string {
  const rows = [...measurements]
    .sort((a, b) => a.measuredAt.getTime() - b.measuredAt.getTime())
    .map((measurement) =>
      CSV_COLUMNS.map((column) => quote(cellFor(measurement, column))).join(","),
    );
  return [CSV_COLUMNS.join(","), ...rows].map((line) => `${line}\r\n`).join("");
}
