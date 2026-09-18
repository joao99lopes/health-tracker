import assert from "node:assert/strict";
import { test } from "node:test";
import type { MeasurementSnapshot } from "./metrics.ts";
import {
  latestMeasurement,
  latestMetricReading,
  latestMetricReadings,
} from "./summary.ts";

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

test("there is no latest measurement in an empty history", () => {
  assert.equal(latestMeasurement([]), null);
  assert.equal(latestMetricReading([], "weightKg"), null);
  assert.deepEqual(latestMetricReadings([]), []);
});

test("the latest measurement is the most recent, whatever the input order", () => {
  const newest = snapshot("2026-09-18T08:00:00.000Z", { weightKg: 78 });
  const measurements = [
    snapshot("2026-09-01T08:00:00.000Z", { weightKg: 80 }),
    newest,
    snapshot("2026-08-01T08:00:00.000Z", { weightKg: 82 }),
  ];

  assert.equal(latestMeasurement(measurements), newest);
});

test("a metric never recorded is absent rather than zero", () => {
  const readings = latestMetricReadings([
    snapshot("2026-09-18T08:00:00.000Z", { weightKg: 78 }),
  ]);

  assert.deepEqual(
    readings.map((reading) => reading.metric),
    ["weightKg", "bmi"],
  );
  assert.equal(
    readings.find((reading) => reading.metric === "hydrationPercent"),
    undefined,
  );
});

test("BMI is reported as a metric, derived from the height of its own measurement", () => {
  const reading = latestMetricReading(
    [
      snapshot("2026-09-18T08:00:00.000Z", {
        weightKg: 80,
        heightCmAtMeasurement: 200,
      }),
    ],
    "bmi",
  );

  assert.equal(reading?.value, 20);
});

test("a metric missing from the latest measurement falls back to when it was taken", () => {
  const measurements = [
    snapshot("2026-09-01T08:00:00.000Z", { weightKg: 80, musclePercent: 40 }),
    snapshot("2026-09-18T08:00:00.000Z", { weightKg: 78 }),
  ];

  const weight = latestMetricReading(measurements, "weightKg");
  const muscle = latestMetricReading(measurements, "musclePercent");

  assert.deepEqual(weight, {
    metric: "weightKg",
    value: 78,
    measuredAt: new Date("2026-09-18T08:00:00.000Z"),
    current: true,
  });
  assert.deepEqual(muscle, {
    metric: "musclePercent",
    value: 40,
    measuredAt: new Date("2026-09-01T08:00:00.000Z"),
    current: false,
  });
});
