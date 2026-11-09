import assert from "node:assert/strict";
import { test } from "node:test";
import { measurementsToCsv, type ExportableMeasurement } from "./csv.ts";
import {
  IMPORT_MAX_ROWS,
  detectDelimiter,
  planImport,
  readCsv,
  restoreFormula,
} from "./import.ts";

const NOW = new Date("2026-11-09T12:00:00.000Z");
const NONE = new Set<number>();
const HEADER =
  "measuredAt,weightKg,bodyFatPercent,hydrationPercent,musclePercent,boneMassKg,visceralFat,abdominalCircumferenceCm,heightCmAtMeasurement,note";

function plan(text: string, overrides: Partial<Parameters<typeof planImport>[1]> = {}) {
  return planImport(text, { existing: NONE, profileHeightCm: 178, now: NOW, ...overrides });
}

function issueCodes(result: ReturnType<typeof planImport>): string[] {
  assert.equal(result.status, "invalid");
  return result.status === "invalid"
    ? result.issues.map((i) => `${i.line}:${i.code}${i.field ? `:${i.field}` : ""}`)
    : [];
}

function exported(overrides: Partial<ExportableMeasurement>): ExportableMeasurement {
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

// --- reader -----------------------------------------------------------------

test("reads quoted cells with doubled quotes and embedded line breaks", () => {
  assert.deepEqual(readCsv('a,b\r\n1,"x ""y"", z\nw"\r\n', ","), [
    { line: 1, cells: ["a", "b"] },
    { line: 2, cells: ["1", 'x "y", z\nw'] },
  ]);
});

test("ignores a byte order mark and blank lines", () => {
  assert.deepEqual(readCsv("﻿a\n\n1\n", ","), [
    { line: 1, cells: ["a"] },
    { line: 3, cells: ["1"] },
  ]);
});

test("an unterminated quote cannot be read", () => {
  assert.equal(readCsv('a\n"open', ","), null);
});

test("the delimiter is taken from the header", () => {
  assert.equal(detectDelimiter(HEADER), ",");
  assert.equal(detectDelimiter(HEADER.replaceAll(",", ";")), ";");
});

test("a neutralised formula is restored, other text left alone", () => {
  assert.equal(restoreFormula("'=1+1"), "=1+1");
  assert.equal(restoreFormula("'quoted'"), "'quoted'");
});

// --- planning ---------------------------------------------------------------

test("an export imports back to the same measurements", () => {
  const original = [
    exported({ weightKg: 80.25, visceralFat: 9, heightCmAtMeasurement: 177.5 }),
    exported({
      measuredAt: new Date("2026-10-01T07:00:00.000Z"),
      bodyFatPercent: 20.1,
      note: '=after "dinner", tired\nline two',
    }),
  ];
  const result = plan(measurementsToCsv(original));
  assert.equal(result.status, "ready");
  if (result.status !== "ready") return;
  assert.equal(result.skippedDuplicates, 0);
  assert.deepEqual(
    result.rows.map((r) => ({
      at: r.measuredAt.toISOString(),
      weight: r.values.weightKg,
      fat: r.values.bodyFatPercent,
      visceral: r.values.visceralFat,
      height: r.heightCmAtMeasurement,
      note: r.note,
    })),
    [
      { at: "2026-09-18T08:30:00.000Z", weight: 80.25, fat: null, visceral: 9, height: 177.5, note: null },
      { at: "2026-10-01T07:00:00.000Z", weight: null, fat: 20.1, visceral: null, height: 178, note: '=after "dinner", tired\nline two' },
    ],
  );
});

test("a semicolon file with comma decimals is accepted", () => {
  const result = plan("measuredAt;weightKg\n2026-09-18T08:30:00Z;80,4\n");
  assert.equal(result.status, "ready");
  if (result.status === "ready") assert.equal(result.rows[0]?.values.weightKg, 80.4);
});

test("only measuredAt is a required column", () => {
  const result = plan("weightKg,measuredAt\n81,2026-09-18T08:30:00Z\n");
  assert.equal(result.status, "ready");
});

test("a row without a height takes the profile's current height", () => {
  const result = plan("measuredAt,weightKg\n2026-09-18T08:30:00Z,80\n", { profileHeightCm: 181 });
  assert.equal(result.status === "ready" && result.rows[0]?.heightCmAtMeasurement, 181);
});

test("a row without a height needs a profile", () => {
  assert.deepEqual(
    issueCodes(plan("measuredAt,weightKg\n2026-09-18T08:30:00Z,80\n", { profileHeightCm: null })),
    ["2:HEIGHT_REQUIRED:heightCmAtMeasurement"],
  );
});

test("an implausible height is rejected", () => {
  assert.deepEqual(
    issueCodes(plan("measuredAt,weightKg,heightCmAtMeasurement\n2026-09-18T08:30:00Z,80,900\n")),
    ["2:HEIGHT_INVALID:heightCmAtMeasurement"],
  );
});

test("rows already stored are skipped, so a re-import changes nothing", () => {
  const at = new Date("2026-09-18T08:30:00.000Z").getTime();
  const result = plan("measuredAt,weightKg\n2026-09-18T08:30:00Z,80\n2026-09-19T08:30:00Z,81\n", {
    existing: new Set([at]),
  });
  assert.equal(result.status, "ready");
  if (result.status !== "ready") return;
  assert.equal(result.skippedDuplicates, 1);
  assert.equal(result.rows.length, 1);
});

test("the same instant twice in one file is an error", () => {
  assert.deepEqual(
    issueCodes(plan("measuredAt,weightKg\n2026-09-18T08:30:00Z,80\n2026-09-18T08:30:00.000Z,81\n")),
    ["3:DUPLICATE_IN_FILE:measuredAt"],
  );
});

test("rows follow the form's rules, reported with their line numbers", () => {
  assert.deepEqual(
    issueCodes(
      plan(
        "measuredAt,weightKg,bodyFatPercent\n" +
          "2026-09-18T08:30:00Z,80,\n" +
          "2026-09-19T08:30:00Z,,\n" +
          "2026-09-20T08:30:00Z,abc,\n" +
          "2027-01-01T00:00:00Z,80,\n" +
          "2026-09-21T08:30:00Z,80,101\n",
      ),
    ),
    [
      "3:NO_VALUES:form",
      "4:VALUE_INVALID:weightKg",
      "5:MEASURED_AT_IN_FUTURE:measuredAt",
      "6:VALUE_OUT_OF_RANGE:bodyFatPercent",
    ],
  );
});

test("a row with the wrong number of cells is reported", () => {
  assert.deepEqual(issueCodes(plan("measuredAt,weightKg\n2026-09-18T08:30:00Z\n")), [
    "2:WRONG_CELL_COUNT",
  ]);
});

test("unknown and duplicate columns, or no measuredAt, reject the header", () => {
  assert.deepEqual(issueCodes(plan("measuredAt,weight\n2026-09-18T08:30:00Z,80\n")), [
    "1:UNKNOWN_COLUMN:weight",
  ]);
  assert.deepEqual(issueCodes(plan("measuredAt,weightKg,weightKg\nx,1,1\n")), [
    "1:DUPLICATE_COLUMN:weightKg",
  ]);
  assert.deepEqual(issueCodes(plan("weightKg\n80\n")), ["1:MISSING_MEASURED_AT_COLUMN"]);
});

test("empty, unreadable, oversized and overlong files are refused whole", () => {
  assert.deepEqual(issueCodes(plan("")), ["0:FILE_EMPTY"]);
  assert.deepEqual(issueCodes(plan(`${HEADER}\n`)), ["0:FILE_EMPTY"]);
  assert.deepEqual(issueCodes(plan('measuredAt,note\nx,"open')), ["0:MALFORMED"]);
  assert.deepEqual(issueCodes(plan("x".repeat(1_000_001))), ["0:FILE_TOO_LARGE"]);
  const rows = Array.from({ length: IMPORT_MAX_ROWS + 1 }, () => "2026-09-18T08:30:00Z,80");
  assert.deepEqual(issueCodes(plan(`measuredAt,weightKg\n${rows.join("\n")}\n`)), [
    "0:TOO_MANY_ROWS",
  ]);
});
