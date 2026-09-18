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
 * Everything here is arithmetic and reported as a fact - a difference, a
 * percentage and a direction. No metric is called good or bad, and nothing
 * derives a recommendation.
 *
 * "Not enough data" is expressed as null, never as a zero, so the interface
 * can say so instead of drawing a meaningless change of 0.
 *
 * This module is pure: no Prisma, no React, no environment access.
 */

/** Which way a value moved. `"same"` means exactly unchanged. */
export type ChangeDirection = "up" | "down" | "same";

export type MetricComparison = {
  metric: Metric;
  from: number;
  to: number;
  /** `to - from`. Negative when the value went down. */
  delta: number;
  /** `delta / from` as a percentage, or null when `from` is 0. */
  percentChange: number | null;
  direction: ChangeDirection;
};

export type MeasurementComparison = {
  earlier: MeasurementSnapshot;
  later: MeasurementSnapshot;
  /** Only the metrics present on both sides; an unmeasured metric is absent. */
  metrics: MetricComparison[];
};

function direction(delta: number): ChangeDirection {
  if (delta > 0) return "up";
  if (delta < 0) return "down";
  return "same";
}

/** A single metric across two measurements, or null when either side lacks it. */
export function compareMetric(
  earlier: MeasurementSnapshot,
  later: MeasurementSnapshot,
  metric: Metric,
): MetricComparison | null {
  const from = metricValue(earlier, metric);
  const to = metricValue(later, metric);
  if (from === null || to === null) {
    return null;
  }

  const delta = to - from;
  return {
    metric,
    from,
    to,
    delta,
    // A change from zero has no defined percentage; null rather than Infinity.
    percentChange: from === 0 ? null : (delta / from) * 100,
    direction: direction(delta),
  };
}

/** Every metric the two measurements have in common. */
export function compareMeasurements(
  earlier: MeasurementSnapshot,
  later: MeasurementSnapshot,
): MeasurementComparison {
  const metrics = METRICS.map((metric) =>
    compareMetric(earlier, later, metric),
  ).filter((comparison): comparison is MetricComparison => comparison !== null);

  return { earlier, later, metrics };
}

/** The ends of a list, or null when there are fewer than two measurements. */
function compareEnds(
  sorted: readonly MeasurementSnapshot[],
  earlierIndex: number,
): MeasurementComparison | null {
  const later = sorted[sorted.length - 1];
  const earlier = sorted[earlierIndex];
  if (!later || !earlier || earlier === later) {
    return null;
  }
  return compareMeasurements(earlier, later);
}

/** The most recent measurement against the one before it. */
export function compareLatestToPrevious(
  measurements: readonly MeasurementSnapshot[],
): MeasurementComparison | null {
  const sorted = sortByMeasuredAt(measurements);
  return compareEnds(sorted, sorted.length - 2);
}

/** The most recent measurement against the very first one. */
export function compareLatestToFirst(
  measurements: readonly MeasurementSnapshot[],
): MeasurementComparison | null {
  const sorted = sortByMeasuredAt(measurements);
  return compareEnds(sorted, 0);
}

/**
 * The first and last measurements inside a period.
 *
 * Null when the period contains fewer than two, which is the "Not enough data
 * yet" case.
 */
export function compareOverPeriod(
  measurements: readonly MeasurementSnapshot[],
  period: PeriodKey,
  now: Date = new Date(),
): MeasurementComparison | null {
  const inPeriod = filterByPeriod(
    sortByMeasuredAt(measurements),
    period,
    (measurement) => measurement.measuredAt,
    now,
  );
  return compareEnds(inPeriod, 0);
}
