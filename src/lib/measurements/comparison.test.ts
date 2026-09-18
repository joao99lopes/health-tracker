import assert from "node:assert/strict";
import { test } from "node:test";
import {
  compareLatestToFirst,
  compareLatestToPrevious,
  compareMeasurements,
  compareMetric,
  compareOverPeriod,
  type MetricComparison,
} from "./comparison.ts";
import { metricValue, type MeasurementSnapshot } from "./metrics.ts";

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

test("a metric comparison reports delta, percentage and direction", () => {
  const result = compareMetric(
    snapshot("2026-09-01T08:00:00.000Z", { weightKg: 80 }),
    snapshot("2026-09-18T08:00:00.000Z", { weightKg: 78 }),
    "weightKg",
  );

  assert.deepEqual(result, {
    metric: "weightKg",
    from: 80,
    to: 78,
    delta: -2,
    percentChange: -2.5,
    direction: "down",
  });
});

test("an unchanged value is neither up nor down", () => {
  const result = compareMetric(
    snapshot("2026-09-01T08:00:00.000Z", { bodyFatPercent: 21.4 }),
    snapshot("2026-09-18T08:00:00.000Z", { bodyFatPercent: 21.4 }),
    "bodyFatPercent",
  );

  assert.equal(result?.delta, 0);
  assert.equal(result?.percentChange, 0);
  assert.equal(result?.direction, "same");
});

test("a change from zero has no percentage", () => {
  const result = compareMetric(
    snapshot("2026-09-01T08:00:00.000Z", { visceralFat: 0 }),
    snapshot("2026-09-18T08:00:00.000Z", { visceralFat: 3 }),
    "visceralFat",
  );

  assert.equal(result?.delta, 3);
  assert.equal(result?.percentChange, null);
  assert.equal(result?.direction, "up");
});

test("a metric missing on either side is not comparable", () => {
  const withValue = snapshot("2026-09-18T08:00:00.000Z", { weightKg: 78 });
  const without = snapshot("2026-09-01T08:00:00.000Z", { bodyFatPercent: 20 });

  assert.equal(compareMetric(without, withValue, "weightKg"), null);
  assert.equal(compareMetric(withValue, without, "weightKg"), null);
  assert.equal(compareMetric(withValue, without, "musclePercent"), null);
});

test("BMI is compared as a derived metric, using each measurement's height", () => {
  const earlier = snapshot("2026-01-01T08:00:00.000Z", {
    weightKg: 70,
    heightCmAtMeasurement: 175,
  });
  // A corrected height: the old BMI must not move because of it.
  const later = snapshot("2026-09-18T08:00:00.000Z", {
    weightKg: 70,
    heightCmAtMeasurement: 180,
  });

  const bmi = metric(compareMeasurements(earlier, later), "bmi");
  assert.equal(bmi?.from, metricValue(earlier, "bmi"));
  assert.equal(bmi?.to, metricValue(later, "bmi"));
  assert.equal(bmi?.direction, "down");
});

test("BMI is absent when there is no weight", () => {
  const comparison = compareMeasurements(
    snapshot("2026-01-01T08:00:00.000Z", { bodyFatPercent: 22 }),
    snapshot("2026-09-18T08:00:00.000Z", { bodyFatPercent: 21 }),
  );

  assert.equal(metric(comparison, "bmi"), undefined);
  assert.equal(comparison.metrics.length, 1);
});

test("only the metrics both measurements share are compared", () => {
  const comparison = compareMeasurements(
    snapshot("2026-01-01T08:00:00.000Z", { weightKg: 70, boneMassKg: 3.1 }),
    snapshot("2026-09-18T08:00:00.000Z", { weightKg: 72, musclePercent: 40 }),
  );

  assert.deepEqual(
    comparison.metrics.map((entry) => entry.metric),
    ["weightKg", "bmi"],
  );
});

const SERIES: MeasurementSnapshot[] = [
  snapshot("2026-01-10T08:00:00.000Z", { weightKg: 82 }),
  snapshot("2026-07-10T08:00:00.000Z", { weightKg: 80 }),
  snapshot("2026-09-10T08:00:00.000Z", { weightKg: 79 }),
  snapshot("2026-09-17T08:00:00.000Z", { weightKg: 78.5 }),
];

test("latest against previous", () => {
  const comparison = compareLatestToPrevious(SERIES);
  assert.equal(comparison?.earlier.measuredAt.toISOString(), "2026-09-10T08:00:00.000Z");
  assert.equal(comparison?.later.measuredAt.toISOString(), "2026-09-17T08:00:00.000Z");
  assert.equal(metric(comparison, "weightKg")?.delta, -0.5);
});

test("latest against first", () => {
  const comparison = compareLatestToFirst(SERIES);
  assert.equal(comparison?.earlier.measuredAt.toISOString(), "2026-01-10T08:00:00.000Z");
  assert.equal(metric(comparison, "weightKg")?.delta, -3.5);
});

test("unordered input is sorted before comparing", () => {
  const shuffled = [SERIES[3], SERIES[0], SERIES[2], SERIES[1]];
  assert.deepEqual(compareLatestToPrevious(shuffled), compareLatestToPrevious(SERIES));
  assert.deepEqual(compareLatestToFirst(shuffled), compareLatestToFirst(SERIES));
});

test("fewer than two measurements is not enough data", () => {
  assert.equal(compareLatestToPrevious([]), null);
  assert.equal(compareLatestToFirst([]), null);
  assert.equal(compareLatestToPrevious([SERIES[0]]), null);
  assert.equal(compareLatestToFirst([SERIES[0]]), null);
});

test("a period compares its own first and last measurement", () => {
  const overThreeMonths = compareOverPeriod(SERIES, "3m", NOW);
  assert.equal(
    overThreeMonths?.earlier.measuredAt.toISOString(),
    "2026-07-10T08:00:00.000Z",
  );
  assert.equal(metric(overThreeMonths, "weightKg")?.delta, -1.5);

  const allTime = compareOverPeriod(SERIES, "all", NOW);
  assert.equal(metric(allTime, "weightKg")?.delta, -3.5);
});

test("a period holding fewer than two measurements is not enough data", () => {
  // Only the 17 September measurement falls inside the last three days.
  assert.equal(compareOverPeriod(SERIES, "3d", NOW), null);
  assert.equal(compareOverPeriod([], "1y", NOW), null);
});
