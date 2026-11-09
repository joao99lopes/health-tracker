import assert from "node:assert/strict";
import { test } from "node:test";
import {
  CSV_COLUMNS,
  measurementsToCsv,
  neutraliseFormula,
  type ExportableMeasurement,
} from "./csv.ts";

function measurement(
  overrides: Partial<ExportableMeasurement> = {},
): ExportableMeasurement {
  return {
    measuredAt: new Date("2026-09-18T08:30:00.000Z"),
    heightCmAtMeasurement: 178,
    note: null,
    weightKg: null,
    bodyFatPercent: null,
    hydrationPercent: null,
    musclePercent: null,
    boneMassKg: null,
    visceralFat: null,
    abdominalCircumferenceCm: null,
    ...overrides,
  };
}

function lines(csv: string): string[] {
  assert.ok(csv.endsWith("\r\n"), "ends with a line break");
  return csv.slice(0, -2).split("\r\n");
}

test("an empty export is just the header", () => {
  assert.deepEqual(lines(measurementsToCsv([])), [CSV_COLUMNS.join(",")]);
});

test("the header uses the stable field keys", () => {
  assert.equal(
    lines(measurementsToCsv([]))[0],
    "measuredAt,weightKg,bodyFatPercent,hydrationPercent,musclePercent,boneMassKg,visceralFat,abdominalCircumferenceCm,heightCmAtMeasurement,note",
  );
});

test("values are written with a dot, missing ones as empty cells", () => {
  const [, row] = lines(
    measurementsToCsv([measurement({ weightKg: 80.25, visceralFat: 9 })]),
  );
  assert.equal(row, "2026-09-18T08:30:00.000Z,80.25,,,,,9,,178,");
});

test("rows are ordered oldest first", () => {
  const csv = measurementsToCsv([
    measurement({ measuredAt: new Date("2026-09-20T00:00:00Z"), weightKg: 2 }),
    measurement({ measuredAt: new Date("2026-09-10T00:00:00Z"), weightKg: 1 }),
  ]);
  const rows = lines(csv).slice(1);
  assert.ok(rows[0]?.startsWith("2026-09-10"));
  assert.ok(rows[1]?.startsWith("2026-09-20"));
});

test("a note with commas, quotes and line breaks is quoted", () => {
  const csv = measurementsToCsv([
    measurement({ weightKg: 80, note: 'after "dinner", tired\nsecond line' }),
  ]);
  assert.ok(csv.includes(',"after ""dinner"", tired\nsecond line"\r\n'));
});

test("a note that a spreadsheet would run as a formula is neutralised", () => {
  assert.equal(neutraliseFormula("=HYPERLINK(1)"), "'=HYPERLINK(1)");
  assert.equal(neutraliseFormula("-2 kg"), "'-2 kg");
  assert.equal(neutraliseFormula("fine"), "fine");
  const [, row] = lines(
    measurementsToCsv([measurement({ weightKg: 80, note: "=1+1" })]),
  );
  assert.ok(row?.endsWith(",'=1+1"));
});
