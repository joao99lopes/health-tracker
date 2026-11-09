import { filterByPeriod, type PeriodKey } from "../periods/periods.ts";
import {
  METRICS,
  metricValue,
  sortByMeasuredAt,
  type MeasurementSnapshot,
  type Metric,
} from "./metrics.ts";

/**
 * Comparing measurements: latest against previous, latest against first, and
 * the ends of a selected period.
 *
 * Comparisons are **per metric**. Every field of a measurement is optional, so
 * the latest measurement may hold only a waist and the one before only a
 * weight. Comparing whole measurements would then compare nothing; instead
 * each metric is compared between its own readings - the latest weight with
 * the weight before it, wherever those were recorded - and each comparison
 * carries the instants of the two readings it is made of.
 *
 * Everything here is arithmetic and reported as a fact - a difference, a
 * percentage and a direction. No metric is called good or bad, and nothing
 * derives a recommendation.
 *
 * "Not enough data" is expressed by absence, never as a zero: a metric with
 * fewer than two readings is left out, and a comparison with no metric left is
 * null, so the interface can say so instead of drawing a change of 0.
 *
 * This module is pure: no Prisma, no React, no environment access.
 */

/** Which way a value moved. `"same"` means exactly unchanged. */
export type ChangeDirection = "up" | "down" | "same";

export type MetricComparison = {
  metric: Metric;
  from: number;
  to: number;
  /** When the `from` and `to` readings were taken. */
  fromAt: Date;
  toAt: Date;
  /** `to - from`. Negative when the value went down. */
  delta: number;
  /** `delta / from` as a percentage, or null when `from` is 0. */
  percentChange: number | null;
  direction: ChangeDirection;
};

export type MetricComparisons = {
  /** One entry per metric with two readings to compare, in `METRICS` order. */
  metrics: MetricComparison[];
};

type Reading = { at: Date; value: number };

function direction(delta: number): ChangeDirection {
  if (delta > 0) return "up";
  if (delta < 0) return "down";
  return "same";
}

/** Two readings of one metric, compared. */
export function compareReadings(
  metric: Metric,
  earlier: Reading,
  later: Reading,
): MetricComparison {
  const delta = later.value - earlier.value;
  return {
    metric,
    from: earlier.value,
    to: later.value,
    fromAt: earlier.at,
    toAt: later.at,
    delta,
    // A change from zero has no defined percentage; null rather than Infinity.
    percentChange: earlier.value === 0 ? null : (delta / earlier.value) * 100,
    direction: direction(delta),
  };
}

/** Every recorded value of one metric, oldest first. */
function readingsOf(
  sorted: readonly MeasurementSnapshot[],
  metric: Metric,
): Reading[] {
  const readings: Reading[] = [];
  for (const snapshot of sorted) {
    const value = metricValue(snapshot, metric);
    if (value !== null) {
      readings.push({ at: snapshot.measuredAt, value });
    }
  }
  return readings;
}

/**
 * For each metric, its latest reading against the one `pick` chooses from
 * that metric's own history. Null when no metric has two readings.
 */
function comparePerMetric(
  measurements: readonly MeasurementSnapshot[],
  pick: (readings: Reading[]) => Reading | undefined,
): MetricComparisons | null {
  const sorted = sortByMeasuredAt(measurements);
  const metrics: MetricComparison[] = [];
  for (const metric of METRICS) {
    const readings = readingsOf(sorted, metric);
    const later = readings[readings.length - 1];
    const earlier = readings.length >= 2 ? pick(readings) : undefined;
    if (later && earlier) {
      metrics.push(compareReadings(metric, earlier, later));
    }
  }
  return metrics.length > 0 ? { metrics } : null;
}

/** Each metric's latest reading against the one before it. */
export function compareLatestToPrevious(
  measurements: readonly MeasurementSnapshot[],
): MetricComparisons | null {
  return comparePerMetric(measurements, (readings) => readings[readings.length - 2]);
}

/** Each metric's latest reading against its very first one. */
export function compareLatestToFirst(
  measurements: readonly MeasurementSnapshot[],
): MetricComparisons | null {
  return comparePerMetric(measurements, (readings) => readings[0]);
}

/**
 * Each metric's first and last reading inside a period.
 *
 * Null when no metric has two readings in the period, which is the "Not
 * enough data yet" case.
 */
export function compareOverPeriod(
  measurements: readonly MeasurementSnapshot[],
  period: PeriodKey,
  now: Date = new Date(),
): MetricComparisons | null {
  const inPeriod = filterByPeriod(
    sortByMeasuredAt(measurements),
    period,
    (measurement) => measurement.measuredAt,
    now,
  );
  return compareLatestToFirst(inPeriod);
}
