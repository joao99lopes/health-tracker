"use client";

import { useId } from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useHydrated } from "@/hooks/use-hydrated";
import { useI18n } from "@/lib/i18n/context";
import type { Dictionary } from "@/lib/i18n/dictionary";
import type { Language } from "@/lib/i18n/languages";
import {
  formatAxisDate,
  formatDateTime,
  formatMetricNumber,
  formatMetricValue,
} from "@/lib/measurements/format";
import { metricLabel } from "@/lib/measurements/messages";
import type { Metric } from "@/lib/measurements/metrics";
import {
  buildChartRows,
  paddedDomain,
  type ChartRow,
  type MetricSeries,
  type MovingAverageWindow,
  type SeriesPoint,
} from "@/lib/measurements/series";
import type { PeriodKey } from "@/lib/periods/periods";
import type { MetricDirection } from "@/lib/preferences/direction";
import { DIRECTION_CHART_COLOR } from "@/components/tone";

/**
 * One metric plotted over time, optionally with its moving average and a
 * second metric for comparison.
 *
 * The series arrives with the unrecorded measurements already removed, so
 * every point on the line is a reading that exists. The y axis is scaled to
 * those readings rather than anchored at zero, which is what makes a two
 * kilo change over a month visible at all. The wash beneath the line is
 * decoration and carries no second value; it fades out well before the axis
 * so it cannot be mistaken for an area measured from zero.
 *
 * The moving average is dashed, in the same colour, with no dots: it is a
 * summary of the readings, never mistaken for one. A second metric has its
 * own axis on the right - two metrics in different units on one scale would
 * flatten one of them - and its own colour, which is not one of the direction
 * colours, so it never seems to carry a preference.
 *
 * Animation is off. A line that slides into place says nothing about the
 * data, and this runs on a Raspberry Pi and on phones.
 *
 * Colours are read from the theme's CSS variables, so the chart follows the
 * light and dark themes without being told about them. Where the reader has
 * said which way they would like this metric to move, the whole line takes a
 * single colour for that direction. It is one flat colour, never graded by
 * magnitude and never split segment by segment: it names the direction the
 * reader picked and claims nothing about health. With no preference the chart
 * keeps the default accent.
 *
 * Recharts measures the DOM, and the axis labels are written in the reader's
 * own time zone, which the server does not know. The chart is therefore drawn
 * after hydration, behind a box of the same height so nothing jumps.
 */

/** Periods long enough for the year to matter on the axis. */
const LONG_PERIODS: readonly PeriodKey[] = ["1y", "2y", "all"];

/** Above this many readings the dots merge into the line; drop them. */
const MAX_DOTS = 24;

/**
 * Half the width of the time window drawn around a lone reading.
 *
 * `["dataMin", "dataMax"]` collapses to a zero-width domain when there is a
 * single point, and Recharts then has nowhere to place it. Widening the axis
 * by half a day either side gives the dot a position without inventing a
 * second reading.
 */
const SINGLE_POINT_PADDING_MS = 12 * 60 * 60 * 1000;

/** One height, used by the chart and by the box that stands in for it. */
const CHART_HEIGHT = "h-60 w-full sm:h-72 lg:h-80";

/** The comparison line's colour: outside the direction palette on purpose. */
const SECONDARY_COLOR = "var(--chart-3)";

export type MovingAverageOverlay = {
  window: MovingAverageWindow;
  points: SeriesPoint[];
};

type TooltipEntry = { payload?: ChartRow };

function ChartTooltip({
  active,
  payload,
  t,
  language,
  primary,
  secondary,
  averageWindow,
}: {
  active?: boolean;
  payload?: TooltipEntry[];
  t: Dictionary;
  language: Language;
  primary: Metric;
  secondary: Metric | null;
  averageWindow: MovingAverageWindow | null;
}) {
  const row = payload?.[0]?.payload;
  if (!active || !row) {
    return null;
  }
  const entries: Array<[string, string]> = [];
  if (row.primary !== undefined) {
    entries.push([metricLabel(t, primary), formatMetricValue(primary, row.primary, language)]);
  }
  if (row.average !== undefined && averageWindow !== null) {
    entries.push([
      t.charts.movingAverageLegend(averageWindow),
      formatMetricValue(primary, row.average, language),
    ]);
  }
  if (row.secondary !== undefined && secondary !== null) {
    entries.push([
      metricLabel(t, secondary),
      formatMetricValue(secondary, row.secondary, language),
    ]);
  }
  const single = entries.length === 1 && row.primary !== undefined;
  return (
    <div className="bg-popover text-popover-foreground ring-foreground/10 rounded-lg px-3 py-2 text-xs shadow-raised ring-1">
      <p className="text-muted-foreground">
        {formatDateTime(row.measuredAt, language)}
      </p>
      {single ? (
        <p className="text-sm font-semibold tabular-nums">{entries[0]?.[1]}</p>
      ) : (
        <dl className="mt-1 grid grid-cols-[auto_auto] gap-x-3 gap-y-0.5">
          {entries.map(([label, value]) => (
            <div key={label} className="contents">
              <dt className="text-muted-foreground">{label}</dt>
              <dd className="text-right font-semibold tabular-nums">{value}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}

/** A small key under the chart, shown only when it holds more than one line. */
function Legend({
  items,
}: {
  items: Array<{ label: string; color: string; dashed?: boolean }>;
}) {
  return (
    <ul className="text-muted-foreground flex flex-wrap gap-x-5 gap-y-1 text-xs">
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-2">
          <svg width="20" height="8" aria-hidden>
            <line
              x1="0"
              y1="4"
              x2="20"
              y2="4"
              stroke={item.color}
              strokeWidth="2"
              strokeDasharray={item.dashed ? "4 3" : undefined}
            />
          </svg>
          {item.label}
        </li>
      ))}
    </ul>
  );
}

export function MetricChart({
  series,
  direction,
  average = null,
  secondary = null,
}: {
  series: MetricSeries;
  /** The reader's preference for this metric; presentation only. */
  direction: MetricDirection;
  /** The primary metric's moving average, when the reader asked for one. */
  average?: MovingAverageOverlay | null;
  /** A second metric to compare with, when the reader picked one. */
  secondary?: MetricSeries | null;
}) {
  const { t, language } = useI18n();
  const hydrated = useHydrated();
  // Several charts can share a page; the gradient must not be shared with it.
  const gradientId = useId();
  const color = DIRECTION_CHART_COLOR[direction];

  const rows = buildChartRows(
    series.points,
    average?.points ?? null,
    secondary && secondary.points.length > 0 ? secondary.points : null,
  );
  const hasSecondary = secondary !== null && secondary.points.length > 0;

  const withYear = LONG_PERIODS.includes(series.period);
  const only = rows.length === 1 ? rows[0] : undefined;
  const xDomain: [number, number] | [string, string] =
    only === undefined
      ? ["dataMin", "dataMax"]
      : [
          only.time - SINGLE_POINT_PADDING_MS,
          only.time + SINGLE_POINT_PADDING_MS,
        ];

  // The average can sit outside the period's readings - it reaches back
  // before the period - so the left axis spans both.
  const leftDomain =
    paddedDomain([
      ...series.points.map((point) => point.value),
      ...(average?.points.map((point) => point.value) ?? []),
    ]) ?? series.domain;

  const legend = [
    { label: metricLabel(t, series.metric), color },
    ...(average
      ? [
          {
            label: t.charts.movingAverageLegend(average.window),
            color,
            dashed: true,
          },
        ]
      : []),
    ...(hasSecondary && secondary
      ? [{ label: metricLabel(t, secondary.metric), color: SECONDARY_COLOR }]
      : []),
  ];

  if (!hydrated) {
    return <div className={CHART_HEIGHT} aria-hidden />;
  }

  const dot = (stroke: string, count: number) =>
    count <= MAX_DOTS
      ? { r: 3, fill: "var(--card)", stroke, strokeWidth: 2 }
      : false;

  return (
    <div className="flex flex-col gap-3">
      <div
        className={CHART_HEIGHT}
        role="img"
        aria-label={legend.map((item) => item.label).join(", ") + ` — ${t.periods[series.period]}`}
      >
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={rows}
            margin={{ top: 8, right: hasSecondary ? 0 : 8, bottom: 0, left: 0 }}
          >
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.22} />
                <stop offset="100%" stopColor={color} stopOpacity={0} />
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
              domain={xDomain}
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
              yAxisId="primary"
              type="number"
              domain={leftDomain ?? ["dataMin", "dataMax"]}
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
            {hasSecondary && secondary && (
              <YAxis
                yAxisId="secondary"
                orientation="right"
                type="number"
                domain={secondary.domain ?? ["dataMin", "dataMax"]}
                tickFormatter={(value: number) =>
                  formatMetricNumber(secondary.metric, value, language)
                }
                tick={{ fontSize: 11, fill: SECONDARY_COLOR }}
                stroke="var(--border)"
                tickLine={false}
                axisLine={false}
                tickMargin={6}
                width={52}
              />
            )}
            <Tooltip
              content={
                <ChartTooltip
                  t={t}
                  language={language}
                  primary={series.metric}
                  secondary={hasSecondary && secondary ? secondary.metric : null}
                  averageWindow={average?.window ?? null}
                />
              }
              isAnimationActive={false}
              cursor={{ stroke: "var(--muted-foreground)", strokeDasharray: "3 3" }}
            />
            <Area
              yAxisId="primary"
              type="monotone"
              dataKey="primary"
              stroke={color}
              strokeWidth={2}
              fill={`url(#${gradientId})`}
              // Rows from the other lines leave gaps in this one; a reading
              // still joins the next reading, as it did on its own.
              connectNulls
              dot={dot(color, series.points.length)}
              activeDot={{
                r: 5,
                fill: color,
                stroke: "var(--card)",
                strokeWidth: 2,
              }}
              isAnimationActive={false}
            />
            {average && (
              <Line
                yAxisId="primary"
                type="monotone"
                dataKey="average"
                stroke={color}
                strokeWidth={1.5}
                strokeDasharray="5 4"
                dot={false}
                activeDot={false}
                connectNulls
                isAnimationActive={false}
              />
            )}
            {hasSecondary && secondary && (
              <Line
                yAxisId="secondary"
                type="monotone"
                dataKey="secondary"
                stroke={SECONDARY_COLOR}
                strokeWidth={2}
                dot={dot(SECONDARY_COLOR, secondary.points.length)}
                activeDot={{
                  r: 5,
                  fill: SECONDARY_COLOR,
                  stroke: "var(--card)",
                  strokeWidth: 2,
                }}
                connectNulls
                isAnimationActive={false}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      {legend.length > 1 && <Legend items={legend} />}
    </div>
  );
}
