import assert from "node:assert/strict";
import { test } from "node:test";
import {
  compareLatestToFirst,
  compareLatestToPrevious,
  compareOverPeriod,
  compareReadings,
  type MetricComparison,
} from "./comparison.ts";
import type { MeasurementSnapshot } from "./metrics.ts";

const NOW = new Date("2026-09-18T12:00:00.000Z");

function snapshot(
  iso: string,
  values: Partial<MeasurementSnapshot> = {},
): MeasurementSnapshot {
  return {
    measuredAt: new Date(iso),
    heightCmAtMeasurement: 175,
    ...values,
  };
}

function metric(
  comparison: { metrics: MetricComparison[] } | null,
  name: string,
): MetricComparison | undefined {
  return comparison?.metrics.find((entry) => entry.metric === name);
}

const at = (iso: string) => new Date(iso);

// --- one pair of readings -------------------------------------------------------

test("a comparison reports delta, percentage, direction and both instants", () => {
  const result = compareReadings(
    "weightKg",
    { at: at("2026-09-01T08:00:00Z"), value: 80 },
    { at: at("2026-09-18T08:00:00Z"), value: 78 },
  );
  assert.equal(result.delta, -2);
  assert.equal(result.percentChange, -2.5);
  assert.equal(result.direction, "down");
  assert.equal(result.fromAt.toISOString(), "2026-09-01T08:00:00.000Z");
  assert.equal(result.toAt.toISOString(), "2026-09-18T08:00:00.000Z");
});

test("an unchanged value is neither up nor down", () => {
  const result = compareReadings(
    "weightKg",
    { at: at("2026-09-01T08:00:00Z"), value: 80 },
    { at: at("2026-09-02T08:00:00Z"), value: 80 },
  );
  assert.equal(result.direction, "same");
  assert.equal(result.delta, 0);
});

test("a change from zero has no percentage", () => {
  const result = compareReadings(
    "visceralFat",
    { at: at("2026-09-01T08:00:00Z"), value: 0 },
    { at: at("2026-09-02T08:00:00Z"), value: 2 },
  );
  assert.equal(result.percentChange, null);
});

// --- per metric ---------------------------------------------------------------

const SERIES: MeasurementSnapshot[] = [
  snapshot("2026-01-10T08:00:00.000Z", { weightKg: 82 }),
  snapshot("2026-07-10T08:00:00.000Z", { weightKg: 80 }),
  snapshot("2026-09-10T08:00:00.000Z", { weightKg: 79 }),
  snapshot("2026-09-17T08:00:00.000Z", { weightKg: 78.5 }),
];

test("latest against previous", () => {
  const weight = metric(compareLatestToPrevious(SERIES), "weightKg");
  assert.equal(weight?.fromAt.toISOString(), "2026-09-10T08:00:00.000Z");
  assert.equal(weight?.toAt.toISOString(), "2026-09-17T08:00:00.000Z");
  assert.equal(weight?.delta, -0.5);
});

test("latest against first", () => {
  const weight = metric(compareLatestToFirst(SERIES), "weightKg");
  assert.equal(weight?.fromAt.toISOString(), "2026-01-10T08:00:00.000Z");
  assert.equal(weight?.delta, -3.5);
});

test("unordered input is sorted before comparing", () => {
  const shuffled = [SERIES[3], SERIES[0], SERIES[2], SERIES[1]] as MeasurementSnapshot[];
  assert.deepEqual(compareLatestToPrevious(shuffled), compareLatestToPrevious(SERIES));
  assert.deepEqual(compareLatestToFirst(shuffled), compareLatestToFirst(SERIES));
});

test("fewer than two readings is not enough data", () => {
  assert.equal(compareLatestToPrevious([]), null);
  assert.equal(compareLatestToFirst([]), null);
  assert.equal(compareLatestToPrevious(SERIES.slice(0, 1)), null);
  assert.equal(compareLatestToFirst(SERIES.slice(0, 1)), null);
});

test("a partial latest measurement does not hide other metrics' changes", () => {
  // The latest measurement holds only a waist: the weight comparison must
  // still use the two most recent weights, wherever they were recorded.
  const measurements = [
    snapshot("2026-09-01T08:00:00.000Z", { weightKg: 80, abdominalCircumferenceCm: 92 }),
    snapshot("2026-09-08T08:00:00.000Z", { weightKg: 79 }),
    snapshot("2026-09-15T08:00:00.000Z", { abdominalCircumferenceCm: 90 }),
  ];
  const previous = compareLatestToPrevious(measurements);
  assert.equal(metric(previous, "weightKg")?.delta, -1);
  assert.equal(metric(previous, "weightKg")?.toAt.toISOString(), "2026-09-08T08:00:00.000Z");
  assert.equal(metric(previous, "abdominalCircumferenceCm")?.delta, -2);
  assert.equal(
    metric(previous, "abdominalCircumferenceCm")?.fromAt.toISOString(),
    "2026-09-01T08:00:00.000Z",
  );
});

test("a metric with a single reading is left out, not compared with zero", () => {
  const measurements = [
    snapshot("2026-09-01T08:00:00.000Z", { weightKg: 80, boneMassKg: 3.1 }),
    snapshot("2026-09-08T08:00:00.000Z", { weightKg: 79, musclePercent: 40 }),
  ];
  const comparison = compareLatestToPrevious(measurements);
  assert.deepEqual(
    comparison?.metrics.map((entry) => entry.metric),
    ["weightKg", "bmi"],
  );
});

test("BMI uses each reading's own height", () => {
  const comparison = compareLatestToFirst([
    { measuredAt: at("2026-01-01T08:00:00Z"), heightCmAtMeasurement: 170, weightKg: 72.25 },
    { measuredAt: at("2026-09-01T08:00:00Z"), heightCmAtMeasurement: 180, weightKg: 72.25 },
  ]);
  const bmi = metric(comparison, "bmi");
  assert.equal(bmi?.from, 72.25 / 1.7 ** 2);
  assert.equal(bmi?.to, 72.25 / 1.8 ** 2);
});

test("the waist-to-height ratio is compared between readings that have a waist", () => {
  const comparison = compareLatestToPrevious([
    snapshot("2026-09-01T08:00:00.000Z", { weightKg: 80, abdominalCircumferenceCm: 92 }),
    snapshot("2026-09-18T08:00:00.000Z", { weightKg: 79, abdominalCircumferenceCm: 90 }),
    snapshot("2026-09-20T08:00:00.000Z", { weightKg: 78 }),
  ]);
  const ratio = metric(comparison, "waistToHeightRatio");
  assert.equal(ratio?.from, 92 / 175);
  assert.equal(ratio?.to, 90 / 175);
  assert.equal(ratio?.direction, "down");
  assert.equal(metric(comparison, "weightKg")?.delta, -1);
});

// --- periods ----------------------------------------------------------------------

test("a period compares each metric's first and last reading inside it", () => {
  const overThreeMonths = metric(compareOverPeriod(SERIES, "3m", NOW), "weightKg");
  assert.equal(overThreeMonths?.fromAt.toISOString(), "2026-07-10T08:00:00.000Z");
  assert.equal(overThreeMonths?.delta, -1.5);
  assert.equal(metric(compareOverPeriod(SERIES, "all", NOW), "weightKg")?.delta, -3.5);
});

test("a period where each metric has under two readings is not enough data", () => {
  assert.equal(compareOverPeriod(SERIES, "3d", NOW), null);
  assert.equal(compareOverPeriod([], "1y", NOW), null);
  // Two measurements in the period, but sharing no metric.
  assert.equal(
    compareOverPeriod(
      [
        snapshot("2026-09-10T08:00:00.000Z", { bodyFatPercent: 21 }),
        snapshot("2026-09-17T08:00:00.000Z", { weightKg: 80 }),
      ],
      "1m",
      NOW,
    ),
    null,
  );
});
