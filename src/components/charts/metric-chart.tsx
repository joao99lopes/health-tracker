"use client";

import { useId } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useHydrated } from "@/hooks/use-hydrated";
import { useI18n } from "@/lib/i18n/context";
import type { Language } from "@/lib/i18n/languages";
import {
  formatAxisDate,
  formatDateTime,
  formatMetricNumber,
  formatMetricValue,
} from "@/lib/measurements/format";
import { metricLabel } from "@/lib/measurements/messages";
import type { Metric } from "@/lib/measurements/metrics";
import type { MetricSeries, SeriesPoint } from "@/lib/measurements/series";
import type { PeriodKey } from "@/lib/periods/periods";

/**
 * One metric plotted over time.
 *
 * The series arrives with the unrecorded measurements already removed, so
 * every point on the line is a reading that exists. The y axis is scaled to
 * those readings rather than anchored at zero, which is what makes a two
 * kilo change over a month visible at all. The wash beneath the line is
 * decoration and carries no second value; it fades out well before the axis
 * so it cannot be mistaken for an area measured from zero.
 *
 * Animation is off. A line that slides into place says nothing about the
 * data, and this runs on a Raspberry Pi and on phones.
 *
 * Colours are read from the theme's CSS variables, so the chart follows the
 * light and dark themes without being told about them.
 *
 * Recharts measures the DOM, and the axis labels are written in the reader's
 * own time zone, which the server does not know. The chart is therefore drawn
 * after hydration, behind a box of the same height so nothing jumps.
 */

/** Periods long enough for the year to matter on the axis. */
const LONG_PERIODS: readonly PeriodKey[] = ["1y", "2y", "all"];

/** Above this many readings the dots merge into the line; drop them. */
const MAX_DOTS = 24;

/** One height, used by the chart and by the box that stands in for it. */
const CHART_HEIGHT = "h-60 w-full sm:h-72 lg:h-80";

type TooltipEntry = { payload?: SeriesPoint };

function ChartTooltip({
  active,
  payload,
  metric,
  language,
}: {
  active?: boolean;
  payload?: TooltipEntry[];
  metric: Metric;
  language: Language;
}) {
  const point = payload?.[0]?.payload;
  if (!active || !point) {
    return null;
  }
  return (
    <div className="bg-popover text-popover-foreground ring-foreground/10 rounded-lg px-3 py-2 text-xs shadow-raised ring-1">
      <p className="text-muted-foreground">
        {formatDateTime(point.measuredAt, language)}
      </p>
      <p className="text-sm font-semibold tabular-nums">
        {formatMetricValue(metric, point.value, language)}
      </p>
    </div>
  );
}

export function MetricChart({ series }: { series: MetricSeries }) {
  const { t, language } = useI18n();
  const hydrated = useHydrated();
  // Several charts can share a page; the gradient must not be shared with it.
  const gradientId = useId();

  const withYear = LONG_PERIODS.includes(series.period);

  if (!hydrated) {
    return <div className={CHART_HEIGHT} aria-hidden />;
  }

  return (
    <div
      className={CHART_HEIGHT}
      role="img"
      aria-label={`${metricLabel(t, series.metric)} — ${t.periods[series.period]}`}
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={series.points}
          margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.22} />
              <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            vertical={false}
            stroke="var(--border)"
            strokeDasharray="3 3"
          />
          <XAxis
            dataKey="time"
            type="number"
            scale="time"
            domain={["dataMin", "dataMax"]}
            tickFormatter={(time: number) =>
              formatAxisDate(new Date(time), language, withYear)
            }
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            stroke="var(--border)"
            tickLine={false}
            axisLine={false}
            tickMargin={10}
            // Enough room that labels never overlap on a phone.
            minTickGap={32}
          />
          <YAxis
            type="number"
            domain={series.domain ?? ["dataMin", "dataMax"]}
            tickFormatter={(value: number) =>
              formatMetricNumber(series.metric, value, language)
            }
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            stroke="var(--border)"
            tickLine={false}
            axisLine={false}
            tickMargin={6}
            width={52}
          />
          <Tooltip
            content={
              <ChartTooltip metric={series.metric} language={language} />
            }
            isAnimationActive={false}
            cursor={{ stroke: "var(--muted-foreground)", strokeDasharray: "3 3" }}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke="var(--chart-1)"
            strokeWidth={2}
            fill={`url(#${gradientId})`}
            dot={
              series.points.length <= MAX_DOTS
                ? {
                    r: 3,
                    fill: "var(--card)",
                    stroke: "var(--chart-1)",
                    strokeWidth: 2,
                  }
                : false
            }
            activeDot={{
              r: 5,
              fill: "var(--chart-1)",
              stroke: "var(--card)",
              strokeWidth: 2,
            }}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
