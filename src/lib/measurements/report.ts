import type { PeriodKey } from "../periods/periods.ts";
import { compareReadings, type MetricComparison } from "./comparison.ts";
import { METRICS, type MeasurementSnapshot, type Metric } from "./metrics.ts";
import { buildMetricSeries, type SeriesPoint } from "./series.ts";
import { summarizeSeries, type SeriesSummary } from "./stats.ts";

/**
 * The printable summary of a period: one row per metric that has readings
 * in it, with the same figures the dashboard shows - first and last reading,
 * the change between them, and the period statistics.
 *
 * It is a record of what was measured, for the reader to keep or to show
 * someone. It carries no interpretation: no bands are coloured, no change is
 * called good or bad, and nothing is projected past the period.
 *
 * This module is pure: no Prisma, no React, no environment access.
 */

export type ReportRow = {
  metric: Metric;
  first: SeriesPoint;
  last: SeriesPoint;
  /** Between the first and last reading; null with a single reading. */
  change: MetricComparison | null;
  summary: SeriesSummary;
};

/** Rows in canonical metric order; metrics without a reading are left out. */
export function buildReport(
  measurements: readonly MeasurementSnapshot[],
  period: PeriodKey,
  now: Date,
): ReportRow[] {
  const rows: ReportRow[] = [];
  for (const metric of METRICS) {
    const series = buildMetricSeries(measurements, metric, period, now);
    const summary = summarizeSeries(series.points);
    if (series.first === null || series.current === null || summary === null) {
      continue;
    }
    rows.push({
      metric,
      first: series.first,
      last: series.current,
      change:
        series.points.length < 2
          ? null
          : compareReadings(
              metric,
              { at: series.first.measuredAt, value: series.first.value },
              { at: series.current.measuredAt, value: series.current.value },
            ),
      summary,
    });
  }
  return rows;
}
