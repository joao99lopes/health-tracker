import { filterByPeriod, type PeriodKey } from "../periods/periods.ts";
import {
  metricValue,
  sortByMeasuredAt,
  type MeasurementSnapshot,
  type Metric,
} from "./metrics.ts";

/**
 * One metric over one period, ready to be plotted.
 *
 * A measurement that does not carry the metric is left out of the series
 * entirely. It is not a zero and it is not a point on the axis: the user did
 * not weigh themselves that day, so there is nothing to draw. The line
 * therefore joins the readings that exist, and the y axis is scaled to them.
 *
 * BMI is a metric like any other here, and `metricValue` derives it from each
 * measurement's own `heightCmAtMeasurement`, so a change of height today does
 * not bend the curve behind it.
 *
 * Nothing here extrapolates, smooths or forecasts. The series is the readings.
 *
 * This module is pure: no Prisma, no React, no environment access.
 */

export type SeriesPoint = {
  /** Milliseconds since the epoch: the x axis is a real time scale. */
  time: number;
  measuredAt: Date;
  value: number;
};

export type MetricSeries = {
  metric: Metric;
  period: PeriodKey;
  /** Ascending by time, and only where the metric was actually recorded. */
  points: SeriesPoint[];
  /** The last point of the period, or null when the period holds none. */
  current: SeriesPoint | null;
  /** The one before it, or null when the period holds only one. */
  previous: SeriesPoint | null;
  /** The first point of the period, or null when the period holds none. */
  first: SeriesPoint | null;
  /**
   * The y range to draw, padded a little so a point never sits on the frame.
   * Null when there is nothing to draw.
   *
   * It is derived from the data, not anchored at zero: a weight that moves
   * between 78 and 80 kg is a readable line here, and a flat one against an
   * axis that starts at zero.
   */
  domain: [number, number] | null;
};

/** How much of the value range to leave above and below the line. */
const DOMAIN_PADDING = 0.05;

/** A series needs two readings before there is any evolution to look at. */
export const MIN_SERIES_POINTS = 2;

function paddedDomain(values: readonly number[]): [number, number] | null {
  if (values.length === 0) {
    return null;
  }
  const min = Math.min(...values);
  const max = Math.max(...values);
  // One value, or several identical ones, has no range to pad proportionally.
  const padding =
    max === min ? Math.max(Math.abs(max) * DOMAIN_PADDING, 0.5) : (max - min) * DOMAIN_PADDING;
  return [min - padding, max + padding];
}

/** Every recorded value of one metric inside one period, oldest first. */
export function buildMetricSeries(
  measurements: readonly MeasurementSnapshot[],
  metric: Metric,
  period: PeriodKey,
  now: Date = new Date(),
): MetricSeries {
  const inPeriod = filterByPeriod(
    sortByMeasuredAt(measurements),
    period,
    (measurement) => measurement.measuredAt,
    now,
  );

  const points: SeriesPoint[] = [];
  for (const snapshot of inPeriod) {
    const value = metricValue(snapshot, metric);
    // Absent is absent. Substituting a zero would draw a reading that was
    // never taken and would drag the axis down with it.
    if (value !== null) {
      points.push({
        time: snapshot.measuredAt.getTime(),
        measuredAt: snapshot.measuredAt,
        value,
      });
    }
  }

  return {
    metric,
    period,
    points,
    current: points[points.length - 1] ?? null,
    previous: points[points.length - 2] ?? null,
    first: points[0] ?? null,
    domain: paddedDomain(points.map((point) => point.value)),
  };
}

/** Whether there is enough of a series to plot rather than to apologise for. */
export function hasEnoughPoints(series: MetricSeries): boolean {
  return series.points.length >= MIN_SERIES_POINTS;
}
