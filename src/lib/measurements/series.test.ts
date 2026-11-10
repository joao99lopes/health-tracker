import assert from "node:assert/strict";
import { test } from "node:test";
import type { MeasurementSnapshot } from "./metrics.ts";
import {
  buildChartRows,
  buildMetricSeries,
  buildMovingAverage,
  hasAnyPoints,
  hasEnoughPoints,
  metricAxis,
} from "./series.ts";

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

test("a series holds one point per recorded value, oldest first", () => {
  const series = buildMetricSeries(
    [
      snapshot("2026-09-18T08:00:00.000Z", { weightKg: 78 }),
      snapshot("2026-09-10T08:00:00.000Z", { weightKg: 79 }),
      snapshot("2026-09-02T08:00:00.000Z", { weightKg: 80 }),
    ],
    "weightKg",
    "1m",
    NOW,
  );

  assert.deepEqual(
    series.points.map((point) => point.value),
    [80, 79, 78],
  );
  assert.equal(series.first?.value, 80);
  assert.equal(series.previous?.value, 79);
  assert.equal(series.current?.value, 78);
  assert.equal(hasEnoughPoints(series), true);
});

test("a measurement without the metric is left out, never plotted as zero", () => {
  const series = buildMetricSeries(
    [
      snapshot("2026-09-02T08:00:00.000Z", { weightKg: 80 }),
      // Recorded, but not this metric.
      snapshot("2026-09-10T08:00:00.000Z", { bodyFatPercent: 22 }),
      snapshot("2026-09-18T08:00:00.000Z", { weightKg: 78 }),
    ],
    "weightKg",
    "1m",
    NOW,
  );

  assert.deepEqual(
    series.points.map((point) => point.value),
    [80, 78],
  );
  assert.ok(series.points.every((point) => point.value !== 0));
  assert.deepEqual(
    series.points.map((point) => point.measuredAt.toISOString()),
    ["2026-09-02T08:00:00.000Z", "2026-09-18T08:00:00.000Z"],
  );
});

test("the x value of a point is the instant it was measured", () => {
  const series = buildMetricSeries(
    [snapshot("2026-09-18T08:00:00.000Z", { weightKg: 78 })],
    "weightKg",
    "1m",
    NOW,
  );

  assert.equal(
    series.points[0]?.time,
    new Date("2026-09-18T08:00:00.000Z").getTime(),
  );
});

test("BMI uses the height stored with each measurement", () => {
  const series = buildMetricSeries(
    [
      snapshot("2026-09-02T08:00:00.000Z", {
        weightKg: 80,
        heightCmAtMeasurement: 200,
      }),
      snapshot("2026-09-18T08:00:00.000Z", {
        weightKg: 80,
        // Same weight, taller: the earlier point must not move with it.
        heightCmAtMeasurement: 250,
      }),
    ],
    "bmi",
    "1m",
    NOW,
  );

  assert.deepEqual(
    series.points.map((point) => point.value),
    [20, 12.8],
  );
});

test("a measurement with no weight has no BMI point", () => {
  const series = buildMetricSeries(
    [
      snapshot("2026-09-02T08:00:00.000Z", { bodyFatPercent: 22 }),
      snapshot("2026-09-18T08:00:00.000Z", { weightKg: 80 }),
    ],
    "bmi",
    "1m",
    NOW,
  );

  assert.equal(series.points.length, 1);
  assert.equal(hasEnoughPoints(series), false);
});

test("the period narrows the series", () => {
  const measurements = [
    snapshot("2026-01-05T08:00:00.000Z", { weightKg: 84 }),
    snapshot("2026-09-16T08:00:00.000Z", { weightKg: 79 }),
    snapshot("2026-09-17T08:00:00.000Z", { weightKg: 78 }),
  ];

  assert.deepEqual(
    buildMetricSeries(measurements, "weightKg", "3d", NOW).points.map(
      (point) => point.value,
    ),
    [79, 78],
  );
  assert.deepEqual(
    buildMetricSeries(measurements, "weightKg", "all", NOW).points.map(
      (point) => point.value,
    ),
    [84, 79, 78],
  );
});

test("an empty period has no points, no ends and no domain", () => {
  const series = buildMetricSeries(
    [snapshot("2026-01-05T08:00:00.000Z", { weightKg: 84 })],
    "weightKg",
    "3d",
    NOW,
  );

  assert.deepEqual(series.points, []);
  assert.equal(series.current, null);
  assert.equal(series.previous, null);
  assert.equal(series.first, null);
  assert.equal(series.axis, null);
  assert.equal(hasAnyPoints(series), false);
  assert.equal(hasEnoughPoints(series), false);
});

test("a single point is drawable, but is not an evolution", () => {
  const series = buildMetricSeries(
    [snapshot("2026-09-18T08:00:00.000Z", { weightKg: 78 })],
    "weightKg",
    "1m",
    NOW,
  );

  assert.equal(hasAnyPoints(series), true);
  assert.equal(hasEnoughPoints(series), false);
  assert.equal(series.axis !== null, true);
  assert.equal(series.current?.value, 78);
  assert.equal(series.previous, null);
  assert.equal(series.first?.value, 78);
});

test("the domain is padded around the data, not anchored at zero", () => {
  const series = buildMetricSeries(
    [
      snapshot("2026-09-02T08:00:00.000Z", { weightKg: 80 }),
      snapshot("2026-09-18T08:00:00.000Z", { weightKg: 78 }),
    ],
    "weightKg",
    "1m",
    NOW,
  );

  // 78-80 kg, padded, widened to round one-kilo ticks.
  assert.deepEqual(series.axis?.domain, [77, 81]);
  assert.deepEqual(series.axis?.ticks, [77, 78, 79, 80, 81]);
});

test("small noise does not fill the chart: the axis has a minimum span", () => {
  // A month of weights within 0.6 kg, as on a real scale.
  const axis = metricAxis("weightKg", [79.13, 79.47, 79.18, 79.72, 79.22, 79.61]);
  assert.ok(axis !== null);
  const [low, high] = axis.domain;
  assert.ok(high - low >= 2, `span ${high - low} must be at least 2 kg`);
  assert.ok(low <= 79.13 && high >= 79.72, "every reading stays inside");
});

test("ticks are round, evenly spaced and never finer than the metric", () => {
  for (const [metric, values] of [
    ["weightKg", [79.13, 79.72]],
    ["bodyFatPercent", [21.1, 24.8]],
    ["visceralFat", [9, 11]],
    ["waistToHeightRatio", [0.515, 0.54]],
    ["bmi", [25.6, 27.1]],
  ] as const) {
    const axis = metricAxis(metric, values);
    assert.ok(axis !== null);
    const steps = axis.ticks.slice(1).map((tick, i) => tick - (axis.ticks[i] ?? 0));
    const first = steps[0] ?? 0;
    for (const step of steps) {
      assert.ok(Math.abs(step - first) < 1e-9, `${metric}: uneven ticks ${axis.ticks.join(", ")}`);
    }
    if (metric === "visceralFat") {
      assert.ok(axis.ticks.every(Number.isInteger), "a whole-number index gets whole ticks");
    }
    assert.ok(axis.ticks.length >= 3 && axis.ticks.length <= 8, `${metric}: ${axis.ticks.length} ticks`);
  }
});

test("the axis never goes below zero", () => {
  const axis = metricAxis("visceralFat", [1, 1]);
  assert.ok(axis !== null && axis.domain[0] >= 0);
});

test("identical values still get a readable range", () => {
  const series = buildMetricSeries(
    [
      snapshot("2026-09-02T08:00:00.000Z", { weightKg: 80 }),
      snapshot("2026-09-18T08:00:00.000Z", { weightKg: 80 }),
    ],
    "weightKg",
    "1m",
    NOW,
  );

  const [min, max] = series.axis?.domain ?? [0, 0];
  assert.ok(min < 80 && max > 80, "the flat line must not sit on the frame");
});

test("the waist-to-height ratio uses each measurement's own height", () => {
  const series = buildMetricSeries(
    [
      snapshot("2026-09-02T08:00:00.000Z", {
        abdominalCircumferenceCm: 90,
        heightCmAtMeasurement: 180,
      }),
      snapshot("2026-09-18T08:00:00.000Z", {
        abdominalCircumferenceCm: 90,
        // Same waist, taller: the earlier point must not move with it.
        heightCmAtMeasurement: 200,
      }),
    ],
    "waistToHeightRatio",
    "1m",
    NOW,
  );

  assert.deepEqual(
    series.points.map((point) => point.value),
    [0.5, 0.45],
  );
});

test("one waist circumference is already a point to draw", () => {
  const series = buildMetricSeries(
    [
      snapshot("2026-09-02T08:00:00.000Z", { weightKg: 80 }),
      snapshot("2026-09-18T08:00:00.000Z", { abdominalCircumferenceCm: 88 }),
    ],
    "abdominalCircumferenceCm",
    "1m",
    NOW,
  );

  assert.equal(hasAnyPoints(series), true);
  assert.equal(series.points.length, 1);
  assert.equal(hasEnoughPoints(series), false);
});

// --- moving average ---------------------------------------------------------

test("the moving average is the mean of the readings in the trailing window", () => {
  const measurements = [
    snapshot("2026-09-01T08:00:00.000Z", { weightKg: 80 }),
    snapshot("2026-09-05T08:00:00.000Z", { weightKg: 82 }),
    snapshot("2026-09-09T08:00:00.000Z", { weightKg: 78 }),
  ];
  const series = buildMetricSeries(measurements, "weightKg", "1m", NOW);
  assert.deepEqual(
    buildMovingAverage(measurements, series, 7).map((p) => p.value),
    // Sep 1: itself. Sep 5: Sep 1 + Sep 5. Sep 9: Sep 5 + Sep 9 (Sep 1 is 8 days back).
    [80, 81, 80],
  );
});

test("readings before the period count towards the window", () => {
  const measurements = [
    snapshot("2026-09-10T08:00:00.000Z", { weightKg: 90 }),
    snapshot("2026-09-16T08:00:00.000Z", { weightKg: 80 }),
  ];
  const series = buildMetricSeries(measurements, "weightKg", "3d", NOW);
  assert.deepEqual(series.points.map((p) => p.value), [80]);
  assert.deepEqual(
    buildMovingAverage(measurements, series, 7).map((p) => p.value),
    [85],
  );
});

test("the moving average has one point per reading, at the reading's time", () => {
  const measurements = [
    snapshot("2026-09-01T08:00:00.000Z", { weightKg: 80 }),
    snapshot("2026-09-02T08:00:00.000Z", { bodyFatPercent: 20 }),
    snapshot("2026-09-03T08:00:00.000Z", { weightKg: 82 }),
  ];
  const series = buildMetricSeries(measurements, "weightKg", "1m", NOW);
  const average = buildMovingAverage(measurements, series, 30);
  assert.deepEqual(
    average.map((p) => p.time),
    series.points.map((p) => p.time),
  );
  assert.deepEqual(average.map((p) => p.value), [80, 81]);
});

test("a reading exactly one window old has left the window", () => {
  const measurements = [
    snapshot("2026-09-01T08:00:00.000Z", { weightKg: 70 }),
    snapshot("2026-09-08T08:00:00.000Z", { weightKg: 80 }),
  ];
  const series = buildMetricSeries(measurements, "weightKg", "1m", NOW);
  assert.deepEqual(
    buildMovingAverage(measurements, series, 7).map((p) => p.value),
    [70, 80],
  );
});

// --- chart rows ---------------------------------------------------------------

test("chart rows merge series by instant, leaving gaps where nothing was read", () => {
  const at = (iso: string, value: number) => {
    const measuredAt = new Date(iso);
    return { time: measuredAt.getTime(), measuredAt, value };
  };
  const rows = buildChartRows(
    [at("2026-09-01T08:00:00Z", 80), at("2026-09-03T08:00:00Z", 81)],
    [at("2026-09-01T08:00:00Z", 80), at("2026-09-03T08:00:00Z", 80.5)],
    [at("2026-09-02T08:00:00Z", 20), at("2026-09-03T08:00:00Z", 21)],
  );
  assert.deepEqual(
    rows.map(({ primary, average, secondary }) => ({ primary, average, secondary })),
    [
      { primary: 80, average: 80, secondary: undefined },
      { primary: undefined, average: undefined, secondary: 20 },
      { primary: 81, average: 80.5, secondary: 21 },
    ],
  );
});

test("without extras, chart rows are just the primary series", () => {
  const measuredAt = new Date("2026-09-01T08:00:00Z");
  assert.deepEqual(
    buildChartRows([{ time: measuredAt.getTime(), measuredAt, value: 80 }], null, null),
    [{ time: measuredAt.getTime(), measuredAt, primary: 80 }],
  );
});
