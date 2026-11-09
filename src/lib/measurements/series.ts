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
 * Nothing here extrapolates or forecasts. The series is the readings. The one
 * derived line, the moving average below, is opt-in, drawn apart from the
 * readings and labelled as an average - it never replaces them.
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

export function paddedDomain(values: readonly number[]): [number, number] | null {
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

/** Whether there is anything at all to draw: one reading is already a point. */
export function hasAnyPoints(series: MetricSeries): boolean {
  return series.points.length > 0;
}

/**
 * Whether the series says anything about evolution.
 *
 * A single reading is still drawn - it is data the user recorded - but there
 * is no movement to read out of it, so the section says so rather than
 * implying a trend.
 */
export function hasEnoughPoints(series: MetricSeries): boolean {
  return series.points.length >= MIN_SERIES_POINTS;
}

// ---------------------------------------------------------------------------
// Moving average and the combined chart rows
// ---------------------------------------------------------------------------

/**
 * The moving-average windows offered, in days, defined once.
 *
 * Windows are spans of time, not counts of readings: readings arrive
 * irregularly, and "the last 7 readings" could cover a week or a season.
 */
export const MOVING_AVERAGE_WINDOWS = [7, 30] as const;

export type MovingAverageWindow = (typeof MOVING_AVERAGE_WINDOWS)[number];

export function isMovingAverageWindow(value: number): value is MovingAverageWindow {
  return (MOVING_AVERAGE_WINDOWS as readonly number[]).includes(value);
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * The trailing mean at each of `series`'s points: the average of every
 * recorded value of the metric in the `windowDays` up to and including that
 * reading.
 *
 * Readings from *before* the period count towards the window, so the first
 * points of a short period are averaged over a full window rather than over
 * whatever happens to fall inside the period. It is a plain arithmetic mean of
 * recorded values - no weighting, no interpolation, nothing drawn where there
 * is no reading.
 */
export function buildMovingAverage(
  measurements: readonly MeasurementSnapshot[],
  series: MetricSeries,
  windowDays: MovingAverageWindow,
): SeriesPoint[] {
  const history: Array<{ time: number; value: number }> = [];
  for (const snapshot of sortByMeasuredAt(measurements)) {
    const value = metricValue(snapshot, series.metric);
    if (value !== null) {
      history.push({ time: snapshot.measuredAt.getTime(), value });
    }
  }

  const windowMs = windowDays * MS_PER_DAY;
  let start = 0;
  let end = 0;
  let sum = 0;
  return series.points.map((point) => {
    // Both edges only move forward: points and history are both ascending.
    for (let next = history[end]; next && next.time <= point.time; next = history[end]) {
      sum += next.value;
      end++;
    }
    for (
      let oldest = history[start];
      oldest && start < end && oldest.time <= point.time - windowMs;
      oldest = history[start]
    ) {
      sum -= oldest.value;
      start++;
    }
    return { ...point, value: sum / (end - start) };
  });
}

/** One row of the combined chart; a missing key means nothing at that time. */
export type ChartRow = {
  time: number;
  measuredAt: Date;
  primary?: number;
  average?: number;
  secondary?: number;
};

/**
 * The primary series, its moving average and a second metric merged into one
 * time-ordered table, which is what the chart component plots. Readings taken
 * at the same instant share a row.
 */
export function buildChartRows(
  primary: readonly SeriesPoint[],
  average: readonly SeriesPoint[] | null,
  secondary: readonly SeriesPoint[] | null,
): ChartRow[] {
  const rows = new Map<number, ChartRow>();
  const row = (point: SeriesPoint): ChartRow => {
    let existing = rows.get(point.time);
    if (!existing) {
      existing = { time: point.time, measuredAt: point.measuredAt };
      rows.set(point.time, existing);
    }
    return existing;
  };
  for (const point of primary) row(point).primary = point.value;
  for (const point of average ?? []) row(point).average = point.value;
  for (const point of secondary ?? []) row(point).secondary = point.value;
  return [...rows.values()].sort((a, b) => a.time - b.time);
}
