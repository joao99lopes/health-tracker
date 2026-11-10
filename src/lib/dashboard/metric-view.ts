import {
  isMovingAverageWindow,
  type MovingAverageWindow,
} from "../measurements/series.ts";
import { DEFAULT_PERIOD, isPeriodKey, type PeriodKey } from "../periods/periods.ts";
import { parseDateRange, type DateRange } from "../periods/range.ts";

/**
 * What the page of one metric (`/metrics/[metric]`) is showing: a period
 * counted back from now, or a range of days the reader picked, and the
 * optional moving average.
 *
 * Like the dashboard's, it lives in the address
 * (`/metrics/weightKg?from=2026-08-01&to=2026-08-31`), defaults are left out,
 * and anything unreadable falls back to them. A readable range wins over a
 * period.
 *
 * This module is pure: no Prisma, no React, no environment access.
 */

export type MetricView = {
  period: PeriodKey;
  /** When set, the page shows these days instead of `period`. */
  range: DateRange | null;
  /** The moving average, or null when off (the default). */
  average: MovingAverageWindow | null;
};

export const DEFAULT_METRIC_VIEW: MetricView = {
  period: DEFAULT_PERIOD,
  range: null,
  average: null,
};

type RawParam = string | string[] | undefined;

function first(value: RawParam): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/** The view an address asks for. */
export function parseMetricView(params: {
  period?: RawParam;
  from?: RawParam;
  to?: RawParam;
  avg?: RawParam;
}): MetricView {
  const period = first(params.period);
  const average = Number(first(params.avg));
  return {
    period:
      period !== undefined && isPeriodKey(period)
        ? period
        : DEFAULT_METRIC_VIEW.period,
    range: parseDateRange(first(params.from), first(params.to)),
    average: isMovingAverageWindow(average) ? average : null,
  };
}

/** The query string for a view (without "?"); empty for the defaults. */
export function metricViewSearch(view: MetricView): string {
  const params = new URLSearchParams();
  if (view.range !== null) {
    params.set("from", view.range.from);
    params.set("to", view.range.to);
  } else if (view.period !== DEFAULT_METRIC_VIEW.period) {
    params.set("period", view.period);
  }
  if (view.average !== null) params.set("avg", String(view.average));
  return params.toString();
}
