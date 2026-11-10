"use client";

import { useI18n } from "@/lib/i18n/context";
import {
  formatMetricDelta,
  formatMetricValue,
} from "@/lib/measurements/format";
import type { Metric } from "@/lib/measurements/metrics";
import type { SeriesSummary } from "@/lib/measurements/stats";

/**
 * The selected period in a handful of numbers: how many readings, their
 * lowest, highest and mean, and the weekly trend of a straight line through
 * them. Set in neutral type throughout - these describe the readings and
 * colour would make them sound like a verdict.
 */
export function PeriodSummary({
  metric,
  summary,
}: {
  metric: Metric;
  summary: SeriesSummary;
}) {
  const { t, language } = useI18n();
  const value = (number: number) => formatMetricValue(metric, number, language);

  const entries: Array<[string, string]> = [
    [t.charts.summary.count, new Intl.NumberFormat(language).format(summary.count)],
    [t.charts.summary.min, value(summary.min)],
    [t.charts.summary.max, value(summary.max)],
    [t.charts.summary.mean, value(summary.mean)],
  ];
  if (summary.weeklyTrend !== null) {
    entries.push([
      t.charts.summary.trend,
      t.charts.summary.perWeek(
        formatMetricDelta(
          metric,
          summary.weeklyTrend,
          language,
          t.common.percentagePoints,
        ),
      ),
    ]);
  }

  return (
    <div className="border-border flex flex-col gap-2 border-t pt-4">
      <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
        {t.charts.summary.title}
      </p>
      <dl className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-5">
        {entries.map(([label, text]) => (
          <div key={label} className="flex flex-col gap-0.5">
            <dt className="text-muted-foreground text-xs">{label}</dt>
            <dd className="text-sm font-semibold tabular-nums">{text}</dd>
          </div>
        ))}
      </dl>
      {summary.weeklyTrend !== null && (
        <p className="text-muted-foreground text-xs">{t.charts.summary.trendHint}</p>
      )}
    </div>
  );
}
