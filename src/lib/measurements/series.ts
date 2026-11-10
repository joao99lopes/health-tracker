import { filterByPeriod, type PeriodKey } from "../periods/periods.ts";
import {
  metricDisplay,
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
  /**
   * The dates the reader picked, start inclusive and end exclusive, when the
   * series covers a chosen range rather than a period counted back from now.
   */
  range: { from: Date; to: Date } | null;
  /** Ascending by time, and only where the metric was actually recorded. */
  points: SeriesPoint[];
  /** The last point of the period, or null when the period holds none. */
  current: SeriesPoint | null;
  /** The one before it, or null when the period holds only one. */
  previous: SeriesPoint | null;
  /** The first point of the period, or null when the period holds none. */
  first: SeriesPoint | null;
  /**
   * The y axis to draw (see `metricAxis`). Null when there is nothing to draw.
   *
   * It is derived from the data, not anchored at zero: a weight that moves
   * between 78 and 80 kg is a readable line here, and a flat one against an
   * axis that starts at zero.
   */
  axis: MetricAxis | null;
};

/** A series needs two readings before there is any evolution to look at. */
export const MIN_SERIES_POINTS = 2;

// ---------------------------------------------------------------------------
// The y axis
// ---------------------------------------------------------------------------

/** A y axis: the range drawn and the round values labelled on it. */
export type MetricAxis = {
  domain: [number, number];
  /** Ascending, evenly spaced, both ends included. */
  ticks: number[];
};

/** How much of the value range to leave above and below the line. */
const DOMAIN_PADDING = 0.05;

/**
 * The smallest range the y axis ever shows, per metric, in the metric's unit.
 *
 * Fitting the axis tightly to the readings makes ordinary scale noise look
 * like an event: a month of weights between 79.1 and 79.7 kg filled the whole
 * chart. With a floor on the span, that month reads as the near-flat line it
 * is, while a real change of several kilos still uses the height it needs.
 *
 * These are presentation choices, not physiological thresholds, and they say
 * nothing about what a change means. Each is roughly what the scale or tape
 * moves between two readings on the same day, a few times over.
 */
const MIN_AXIS_SPAN: Record<Metric, number> = {
  weightKg: 2,
  bodyFatPercent: 2,
  hydrationPercent: 2,
  musclePercent: 2,
  boneMassKg: 0.4,
  visceralFat: 4,
  abdominalCircumferenceCm: 4,
  bmi: 1,
  waistToHeightRatio: 0.04,
};

/** About how many intervals the axis is divided into. */
const TARGET_INTERVALS = 4;

/**
 * A round step near `raw`: 1, 2 or 5 times a power of ten, and never finer
 * than the metric's own precision (no "0.25" on a value shown to one
 * decimal, no fractions on a whole-number index).
 */
function niceStep(raw: number, decimals: number): number {
  const exponent = 10 ** Math.floor(Math.log10(raw));
  const fraction = raw / exponent;
  const nice = fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 5 ? 5 : 10;
  return Math.max(nice * exponent, 10 ** -decimals);
}

/**
 * The y axis for one metric's values: centred on the data, at least
 * `MIN_AXIS_SPAN` tall, widened to round ticks, and never below zero - none
 * of these metrics can be negative.
 *
 * Null when there is nothing to draw.
 */
export function metricAxis(
  metric: Metric,
  values: readonly number[],
): MetricAxis | null {
  if (values.length === 0) {
    return null;
  }
  const { decimals } = metricDisplay(metric);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = Math.max((max - min) * (1 + 2 * DOMAIN_PADDING), MIN_AXIS_SPAN[metric]);

  let low = (min + max) / 2 - span / 2;
  let high = low + span;
  if (low < 0) {
    high -= low;
    low = 0;
  }

  const step = niceStep(span / TARGET_INTERVALS, decimals);
  // Rounding before floor/ceil keeps 78.00000000001 from adding a tick.
  const clean = (value: number) => Number(value.toFixed(decimals + 3));
  const start = Math.floor(clean(low / step)) * step;
  const end = Math.ceil(clean(high / step)) * step;

  const ticks: number[] = [];
  const count = Math.round((end - start) / step);
  for (let index = 0; index <= count; index += 1) {
    ticks.push(Number((start + index * step).toFixed(decimals + 2)));
  }
  return {
    domain: [ticks[0] ?? start, ticks[ticks.length - 1] ?? end],
    ticks,
  };
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
  return seriesOf(inPeriod, metric, period, null);
}

/**
 * Every recorded value of one metric from `start` (inclusive) to `end`
 * (exclusive), oldest first - a range the reader picked by date rather than
 * one of the periods counted back from now.
 *
 * `period` is "all" here: nothing is counted back from now, and the range
 * itself is carried in `range` for whatever labels the series.
 */
export function buildMetricSeriesBetween(
  measurements: readonly MeasurementSnapshot[],
  metric: Metric,
  start: Date,
  end: Date,
): MetricSeries {
  const from = start.getTime();
  const to = end.getTime();
  const inRange = sortByMeasuredAt(measurements).filter((measurement) => {
    const at = measurement.measuredAt.getTime();
    return at >= from && at < to;
  });
  return seriesOf(inRange, metric, "all", { from: start, to: end });
}

function seriesOf(
  snapshots: readonly MeasurementSnapshot[],
  metric: Metric,
  period: PeriodKey,
  range: MetricSeries["range"],
): MetricSeries {
  const points: SeriesPoint[] = [];
  for (const snapshot of snapshots) {
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
    range,
    points,
    current: points[points.length - 1] ?? null,
    previous: points[points.length - 2] ?? null,
    first: points[0] ?? null,
    axis: metricAxis(
      metric,
      points.map((point) => point.value),
    ),
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
