import {
  METRICS,
  metricValue,
  sortByMeasuredAt,
  type MeasurementSnapshot,
  type Metric,
} from "./metrics.ts";

/**
 * What the dashboard reads from a history: the latest measurement, and the
 * most recent value of each metric.
 *
 * A metric the user has never recorded is simply absent, so the interface can
 * leave it out instead of drawing an empty card. A metric that was recorded
 * before but not in the latest measurement is still reported, together with
 * the date it was taken - hiding it would lose data, and dating it to the
 * latest measurement would claim something that was never measured.
 *
 * Nothing here judges a value. Everything is the number, its metric and when
 * it was taken.
 *
 * This module is pure: no Prisma, no React, no environment access.
 */

export type MetricReading = {
  metric: Metric;
  value: number;
  measuredAt: Date;
  /** Whether it comes from the latest measurement rather than an older one. */
  current: boolean;
};

/** The most recent measurement, or null when there are none. */
export function latestMeasurement<T extends { measuredAt: Date }>(
  measurements: readonly T[],
): T | null {
  const sorted = sortByMeasuredAt(measurements);
  return sorted[sorted.length - 1] ?? null;
}

/**
 * The most recent recorded value of one metric, or null when it has never
 * been recorded.
 */
export function latestMetricReading(
  measurements: readonly MeasurementSnapshot[],
  metric: Metric,
): MetricReading | null {
  const sorted = sortByMeasuredAt(measurements);
  const latest = sorted[sorted.length - 1];
  if (!latest) {
    return null;
  }

  for (let index = sorted.length - 1; index >= 0; index -= 1) {
    const snapshot = sorted[index];
    if (!snapshot) {
      continue;
    }
    const value = metricValue(snapshot, metric);
    if (value !== null) {
      return {
        metric,
        value,
        measuredAt: snapshot.measuredAt,
        current: snapshot === latest,
      };
    }
  }
  return null;
}

/**
 * Every metric that has ever been recorded, in the canonical metric order,
 * each at its most recent value.
 */
export function latestMetricReadings(
  measurements: readonly MeasurementSnapshot[],
): MetricReading[] {
  return METRICS.map((metric) =>
    latestMetricReading(measurements, metric),
  ).filter((reading): reading is MetricReading => reading !== null);
}
