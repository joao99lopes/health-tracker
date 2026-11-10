import assert from "node:assert/strict";
import { test } from "node:test";
import type { MeasurementSnapshot } from "./metrics.ts";
import { buildReport } from "./report.ts";

const NOW = new Date("2026-11-10T12:00:00Z");

function snapshot(
  iso: string,
  values: Partial<MeasurementSnapshot> = {},
): MeasurementSnapshot {
  return { measuredAt: new Date(iso), heightCmAtMeasurement: 176.5, ...values };
}

const DATA = [
  snapshot("2026-06-01T08:00:00Z", { weightKg: 83 }),
  snapshot("2026-10-15T08:00:00Z", { weightKg: 79.5, abdominalCircumferenceCm: 92 }),
  snapshot("2026-11-07T08:00:00Z", { weightKg: 79.61 }),
];

test("only metrics with readings in the period get a row, in canonical order", () => {
  const rows = buildReport(DATA, "1m", NOW);
  assert.deepEqual(
    rows.map((row) => row.metric),
    ["weightKg", "abdominalCircumferenceCm", "bmi", "waistToHeightRatio"],
  );
});

test("a row compares the first and last reading inside the period", () => {
  const weight = buildReport(DATA, "1m", NOW).find((row) => row.metric === "weightKg");
  assert.equal(weight?.first.value, 79.5);
  assert.equal(weight?.last.value, 79.61);
  assert.equal(weight?.change?.delta, 0.11);
  assert.equal(weight?.summary.count, 2);
});

test("a single reading has a row but no change", () => {
  const waist = buildReport(DATA, "1m", NOW).find(
    (row) => row.metric === "abdominalCircumferenceCm",
  );
  assert.equal(waist?.change, null);
  assert.equal(waist?.summary.count, 1);
});

test("an empty period has no rows", () => {
  assert.deepEqual(buildReport(DATA, "3d", NOW), []);
});
