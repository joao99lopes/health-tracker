import { isMetric, type Metric } from "../measurements/metrics.ts";
import {
  isMovingAverageWindow,
  type MovingAverageWindow,
} from "../measurements/series.ts";
import { DEFAULT_PERIOD, isPeriodKey, type PeriodKey } from "../periods/periods.ts";

/**
 * What the dashboard is showing: the chart's metric, period and extras, and
 * the period of the "over a period" comparison.
 *
 * It lives in the address (`/?metric=bodyFatPercent&period=3m`), so a reload,
 * the back button and a bookmark keep the reader's choice. Defaults are left
 * out of the address, and anything unreadable in it falls back to them.
 *
 * This module is pure: no Prisma, no React, no environment access.
 */

export type DashboardView = {
  metric: Metric;
  period: PeriodKey;
  /** The moving average, or null when off (the default). */
  average: MovingAverageWindow | null;
  /** A second metric on its own axis, or null when off (the default). */
  compare: Metric | null;
  /** The period of the "over a period" comparison card. */
  comparePeriod: PeriodKey;
};

export const DEFAULT_DASHBOARD_VIEW: DashboardView = {
  metric: "weightKg",
  period: DEFAULT_PERIOD,
  average: null,
  compare: null,
  comparePeriod: DEFAULT_PERIOD,
};

type RawParam = string | string[] | undefined;

function first(value: RawParam): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/** The view an address asks for. */
export function parseDashboardView(params: {
  metric?: RawParam;
  period?: RawParam;
  avg?: RawParam;
  vs?: RawParam;
  cmp?: RawParam;
}): DashboardView {
  const metric = first(params.metric);
  const period = first(params.period);
  const average = Number(first(params.avg));
  const compare = first(params.vs);
  const comparePeriod = first(params.cmp);
  const view: DashboardView = {
    metric: metric !== undefined && isMetric(metric) ? metric : DEFAULT_DASHBOARD_VIEW.metric,
    period: period !== undefined && isPeriodKey(period) ? period : DEFAULT_DASHBOARD_VIEW.period,
    average: isMovingAverageWindow(average) ? average : null,
    compare: compare !== undefined && isMetric(compare) ? compare : null,
    comparePeriod:
      comparePeriod !== undefined && isPeriodKey(comparePeriod)
        ? comparePeriod
        : DEFAULT_DASHBOARD_VIEW.comparePeriod,
  };
  // Comparing a metric with itself says nothing.
  return view.compare === view.metric ? { ...view, compare: null } : view;
}

/** The query string for a view (without "?"); empty for the defaults. */
export function dashboardViewSearch(view: DashboardView): string {
  const params = new URLSearchParams();
  if (view.metric !== DEFAULT_DASHBOARD_VIEW.metric) params.set("metric", view.metric);
  if (view.period !== DEFAULT_DASHBOARD_VIEW.period) params.set("period", view.period);
  if (view.average !== null) params.set("avg", String(view.average));
  if (view.compare !== null && view.compare !== view.metric) params.set("vs", view.compare);
  if (view.comparePeriod !== DEFAULT_DASHBOARD_VIEW.comparePeriod) {
    params.set("cmp", view.comparePeriod);
  }
  return params.toString();
}
