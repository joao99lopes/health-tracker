"use client";

import { LocalDateTime } from "@/components/measurements/local-date-time";
import { useI18n } from "@/lib/i18n/context";
import { formatMetricValue } from "@/lib/measurements/format";
import { metricLabel } from "@/lib/measurements/messages";
import type { MetricSeries } from "@/lib/measurements/series";

/**
 * The chart's readings as a table: the same points, for anyone who cannot or
 * would rather not read them off a line - a screen reader, a keyboard, or
 * someone checking an exact value. A second metric, when one is compared,
 * gets its own column; a row where it was not recorded says so with a dash.
 */
export function SeriesTable({
  id,
  series,
  secondary,
}: {
  id: string;
  series: MetricSeries;
  secondary: MetricSeries | null;
}) {
  const { t, language } = useI18n();
  const secondaryByTime = new Map(
    (secondary?.points ?? []).map((point) => [point.time, point.value]),
  );
  // Every instant either series has, oldest first, like the chart.
  const times = [
    ...new Set([
      ...series.points.map((point) => point.time),
      ...(secondary?.points.map((point) => point.time) ?? []),
    ]),
  ].sort((a, b) => a - b);
  const primaryByTime = new Map(
    series.points.map((point) => [point.time, point.value]),
  );
  const dash = <span className="text-muted-foreground">—</span>;

  return (
    <div id={id} className="max-h-80 overflow-auto rounded-lg border">
      <table className="w-full text-sm">
        <caption className="sr-only">
          {metricLabel(t, series.metric)} — {t.periods[series.period]}
        </caption>
        <thead className="bg-muted/60 text-muted-foreground sticky top-0">
          <tr>
            <th scope="col" className="px-4 py-2 text-left text-xs font-medium">
              {t.measurements.measuredAt}
            </th>
            <th scope="col" className="px-4 py-2 text-right text-xs font-medium">
              {metricLabel(t, series.metric)}
            </th>
            {secondary !== null && (
              <th scope="col" className="px-4 py-2 text-right text-xs font-medium">
                {metricLabel(t, secondary.metric)}
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {times.map((time) => {
            const primary = primaryByTime.get(time);
            const other = secondaryByTime.get(time);
            return (
              <tr key={time} className="border-border border-t">
                <th scope="row" className="px-4 py-2 text-left font-normal">
                  <LocalDateTime value={new Date(time)} />
                </th>
                <td className="px-4 py-2 text-right tabular-nums">
                  {primary === undefined
                    ? dash
                    : formatMetricValue(series.metric, primary, language)}
                </td>
                {secondary !== null && (
                  <td className="px-4 py-2 text-right tabular-nums">
                    {other === undefined
                      ? dash
                      : formatMetricValue(secondary.metric, other, language)}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
