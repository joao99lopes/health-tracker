import type { SeriesPoint } from "./series.ts";

/**
 * Descriptive statistics of one metric over one period: what the readings
 * were, summarised. No target, no judgement, no forecast.
 *
 * The weekly trend is the slope of a least-squares line through the
 * readings, in the metric's unit per week. A slope rather than "last minus
 * first, divided by the weeks": a single unusual first or last reading would
 * otherwise decide the whole number. It describes the past period only and
 * is never extended beyond it.
 *
 * This module is pure: no Prisma, no React, no environment access.
 */

export type SeriesSummary = {
  count: number;
  min: number;
  max: number;
  mean: number;
  /**
   * Change per week along the fitted line, or null when the readings do not
   * span long enough for a weekly figure to mean anything (see
   * `MIN_TREND_SPAN_DAYS`).
   */
  weeklyTrend: number | null;
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const MS_PER_WEEK = 7 * MS_PER_DAY;

/**
 * A weekly rate from readings a few days apart would extrapolate a few days
 * to a week; below this span the trend is left out.
 */
export const MIN_TREND_SPAN_DAYS = 7;

/** The summary of a series, or null when it holds no readings. */
export function summarizeSeries(
  points: readonly SeriesPoint[],
): SeriesSummary | null {
  if (points.length === 0) {
    return null;
  }
  const values = points.map((point) => point.value);
  const count = values.length;
  const mean = values.reduce((sum, value) => sum + value, 0) / count;

  return {
    count,
    min: Math.min(...values),
    max: Math.max(...values),
    mean,
    weeklyTrend: weeklyTrend(points),
  };
}

function weeklyTrend(points: readonly SeriesPoint[]): number | null {
  if (points.length < 2) {
    return null;
  }
  const times = points.map((point) => point.time);
  const span = Math.max(...times) - Math.min(...times);
  if (span < MIN_TREND_SPAN_DAYS * MS_PER_DAY) {
    return null;
  }
  // Time in weeks from the first reading keeps the numbers small.
  const origin = Math.min(...times);
  const xs = times.map((time) => (time - origin) / MS_PER_WEEK);
  const ys = points.map((point) => point.value);
  const meanX = xs.reduce((sum, x) => sum + x, 0) / xs.length;
  const meanY = ys.reduce((sum, y) => sum + y, 0) / ys.length;
  let covariance = 0;
  let variance = 0;
  xs.forEach((x, index) => {
    const dx = x - meanX;
    covariance += dx * ((ys[index] ?? meanY) - meanY);
    variance += dx * dx;
  });
  return variance === 0 ? null : covariance / variance;
}
