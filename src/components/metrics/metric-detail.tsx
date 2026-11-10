"use client";

import dynamic from "next/dynamic";
import { useEffect, useId, useMemo, useState } from "react";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  LineChartIcon,
  MinusIcon,
} from "lucide-react";
import { CHART_HEIGHT } from "@/components/charts/chart-size";
import { PeriodSummary } from "@/components/charts/period-summary";
import { EmptyState } from "@/components/empty-state";
import { LocalDateTime } from "@/components/measurements/local-date-time";
import { TONE_TEXT_CLASS } from "@/components/tone";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useHydrated } from "@/hooks/use-hydrated";
import { metricViewSearch, type MetricView } from "@/lib/dashboard/metric-view";
import { useI18n } from "@/lib/i18n/context";
import { readingChanges } from "@/lib/measurements/comparison";
import { toLocalInputValue } from "@/lib/measurements/datetime";
import {
  formatMetricDelta,
  formatMetricValue,
} from "@/lib/measurements/format";
import { metricLabel, seriesWindowLabel } from "@/lib/measurements/messages";
import type { MeasurementSnapshot, Metric } from "@/lib/measurements/metrics";
import {
  MOVING_AVERAGE_WINDOWS,
  buildMetricSeries,
  buildMetricSeriesBetween,
  buildMovingAverage,
  hasAnyPoints,
  hasEnoughPoints,
  isMovingAverageWindow,
} from "@/lib/measurements/series";
import { summarizeSeries } from "@/lib/measurements/stats";
import {
  changeTone,
  type DirectionPreferences,
} from "@/lib/preferences/direction";
import { PERIOD_KEYS, isPeriodKey } from "@/lib/periods/periods";
import { parseDateRange, rangeBounds } from "@/lib/periods/range";
import { cn } from "@/lib/utils";

/**
 * The page of one metric: a period or a range of days, its chart and
 * figures, and every reading in it with its change from the one before.
 *
 * The view lives in the address, written with `replaceState` as on the
 * dashboard: switching period re-filters what the page already has.
 *
 * A picked range is a range of the reader's calendar days, which only the
 * browser can turn into instants; until hydration the page uses UTC days,
 * which the server can agree with, and then the reader's own.
 */

const MetricChart = dynamic(
  () => import("@/components/charts/metric-chart").then((m) => m.MetricChart),
  { ssr: false, loading: () => <div className={CHART_HEIGHT} aria-hidden /> },
);

/** Select value meaning "a range of dates" rather than a period. */
const RANGE = "range";
/** Select value for "no moving average". */
const OFF = "off";
/** Readings listed at first, and added by each "Show more". */
const PAGE = 30;

const DIRECTION_ICONS = {
  up: ArrowUpIcon,
  down: ArrowDownIcon,
  same: MinusIcon,
} as const;

/** `YYYY-MM-DD` of an instant in the browser's zone. */
function localDay(date: Date): string {
  return toLocalInputValue(date).slice(0, 10);
}

export function MetricDetail({
  metric,
  measurements,
  directions,
  now,
  initialView,
}: {
  metric: Metric;
  measurements: MeasurementSnapshot[];
  /** The reader's direction preference per metric; presentation only. */
  directions: DirectionPreferences;
  /** Fixed by the server for this request. */
  now: Date;
  initialView: MetricView;
}) {
  const { t, language } = useI18n();
  const hydrated = useHydrated();
  const [view, setView] = useState(initialView);
  // What the date inputs hold, which may be half-typed or out of order; the
  // view only takes a range once it reads as one.
  const [typedFrom, setTypedFrom] = useState(initialView.range?.from ?? "");
  const [typedTo, setTypedTo] = useState(initialView.range?.to ?? "");
  const [shown, setShown] = useState(PAGE);
  const descriptionId = useId();

  useEffect(() => {
    const search = metricViewSearch(view);
    const url = search === "" ? window.location.pathname : `?${search}`;
    window.history.replaceState(null, "", url);
  }, [view]);

  const series = useMemo(() => {
    if (view.range === null) {
      return buildMetricSeries(measurements, metric, view.period, now);
    }
    const { start, end } = rangeBounds(view.range, hydrated ? "local" : "utc");
    return buildMetricSeriesBetween(measurements, metric, start, end);
  }, [measurements, metric, view.period, view.range, now, hydrated]);
  const average = useMemo(
    () =>
      view.average === null
        ? null
        : {
            window: view.average,
            points: buildMovingAverage(measurements, series, view.average),
          },
    [measurements, series, view.average],
  );
  const summary = useMemo(() => summarizeSeries(series.points), [series]);

  // Every reading of the metric with its change, narrowed to the window.
  const allReadings = useMemo(
    () => readingChanges(measurements, metric),
    [measurements, metric],
  );
  const inWindow = useMemo(() => {
    const times = new Set(series.points.map((point) => point.time));
    return allReadings.filter((reading) => times.has(reading.at.getTime()));
  }, [allReadings, series]);

  const rangeTyped = typedFrom !== "" && typedTo !== "";
  const rangeInvalid = rangeTyped && parseDateRange(typedFrom, typedTo) === null;

  function chooseWindow(value: string) {
    setShown(PAGE);
    if (value === RANGE) {
      // Start from the last 30 days; the reader adjusts from there.
      const to = localDay(now);
      const from = localDay(new Date(now.getTime() - 29 * 24 * 60 * 60 * 1000));
      setTypedFrom(from);
      setTypedTo(to);
      setView((current) => ({ ...current, range: parseDateRange(from, to) }));
    } else if (isPeriodKey(value)) {
      setView((current) => ({ ...current, period: value, range: null }));
    }
  }

  function typeRange(from: string, to: string) {
    setTypedFrom(from);
    setTypedTo(to);
    const range = parseDateRange(from, to);
    if (range !== null) {
      setShown(PAGE);
      setView((current) => ({ ...current, range }));
    }
  }

  const windowValue = view.range === null ? view.period : RANGE;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="metric-window" className="text-xs">
            {t.charts.period}
          </Label>
          <Select value={windowValue} onValueChange={chooseWindow}>
            <SelectTrigger id="metric-window" className="w-44">
              <SelectValue>
                {view.range === null
                  ? t.periods[view.period]
                  : t.metricPage.customRange}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {PERIOD_KEYS.map((option) => (
                <SelectItem key={option} value={option}>
                  {t.periods[option]}
                </SelectItem>
              ))}
              <SelectItem value={RANGE}>{t.metricPage.customRange}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {view.range !== null && (
          <>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="metric-from" className="text-xs">
                {t.metricPage.from}
              </Label>
              <Input
                id="metric-from"
                type="date"
                className="w-40"
                max={typedTo || undefined}
                aria-invalid={rangeInvalid || undefined}
                aria-describedby={rangeInvalid ? "metric-range-issue" : undefined}
                value={typedFrom}
                onChange={(event) => typeRange(event.target.value, typedTo)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="metric-to" className="text-xs">
                {t.metricPage.to}
              </Label>
              <Input
                id="metric-to"
                type="date"
                className="w-40"
                min={typedFrom || undefined}
                aria-invalid={rangeInvalid || undefined}
                aria-describedby={rangeInvalid ? "metric-range-issue" : undefined}
                value={typedTo}
                onChange={(event) => typeRange(typedFrom, event.target.value)}
              />
            </div>
          </>
        )}

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="metric-average" className="text-xs">
            {t.charts.movingAverage}
          </Label>
          <Select
            value={view.average === null ? OFF : String(view.average)}
            onValueChange={(value) => {
              const days = Number(value);
              setView((current) => ({
                ...current,
                average: isMovingAverageWindow(days) ? days : null,
              }));
            }}
          >
            <SelectTrigger id="metric-average" className="w-32">
              <SelectValue>
                {view.average === null
                  ? t.charts.movingAverageOff
                  : t.charts.movingAverageWindow(view.average)}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={OFF}>{t.charts.movingAverageOff}</SelectItem>
              {MOVING_AVERAGE_WINDOWS.map((days) => (
                <SelectItem key={days} value={String(days)}>
                  {t.charts.movingAverageWindow(days)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      {rangeInvalid && (
        <p id="metric-range-issue" role="alert" className="text-destructive -mt-3 text-sm">
          {t.metricPage.rangeInvalid}
        </p>
      )}

      <Card>
        <CardContent className="flex flex-col gap-5">
          {hasAnyPoints(series) ? (
            <>
              <p id={descriptionId} className="sr-only">
                {summary !== null &&
                  series.first !== null &&
                  series.current !== null &&
                  t.charts.describe({
                    metric: metricLabel(t, metric),
                    period: seriesWindowLabel(t, series, language),
                    count: summary.count,
                    first: formatMetricValue(metric, series.first.value, language),
                    last: formatMetricValue(metric, series.current.value, language),
                    min: formatMetricValue(metric, summary.min, language),
                    max: formatMetricValue(metric, summary.max, language),
                  })}
              </p>
              <MetricChart
                series={series}
                direction={directions[metric]}
                average={average}
                describedBy={descriptionId}
              />
              {!hasEnoughPoints(series) && (
                <p className="text-muted-foreground text-xs">
                  {t.charts.singlePoint}
                </p>
              )}
              {summary !== null && hasEnoughPoints(series) && (
                <PeriodSummary metric={metric} summary={summary} />
              )}
            </>
          ) : (
            <EmptyState
              bordered
              icon={LineChartIcon}
              title={t.charts.noData}
              description={t.charts.noDataDescription}
              className="h-60 sm:h-72 lg:h-80"
            />
          )}
        </CardContent>
      </Card>

      {inWindow.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">{t.metricPage.readings}</h2>
          <Card className="py-0">
            <CardContent className="px-0">
              <table className="w-full text-sm">
                <caption className="sr-only">
                  {metricLabel(t, metric)} — {seriesWindowLabel(t, series, language)}
                </caption>
                <thead>
                  <tr className="border-border text-muted-foreground border-b text-xs font-medium tracking-wide uppercase">
                    <th scope="col" className="px-4 py-3 text-left sm:px-6">
                      {t.measurements.measuredAt}
                    </th>
                    <th scope="col" className="px-2 py-3 text-right">
                      {t.metricPage.value}
                    </th>
                    <th scope="col" className="px-4 py-3 text-right sm:px-6">
                      {t.metricPage.change}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {inWindow.slice(0, shown).map((reading) => {
                    const change = reading.change;
                    const Icon = change ? DIRECTION_ICONS[change.direction] : null;
                    return (
                      <tr
                        key={reading.at.getTime()}
                        className="border-border border-b last:border-0"
                      >
                        <td className="px-4 py-3 sm:px-6">
                          {/* The date is enough on a phone; the time joins it where there is room. */}
                          <span className="sm:hidden">
                            <LocalDateTime value={reading.at} mode="date" />
                          </span>
                          <span className="max-sm:hidden">
                            <LocalDateTime value={reading.at} />
                          </span>
                        </td>
                        <td className="px-2 py-3 text-right font-medium whitespace-nowrap tabular-nums">
                          {formatMetricValue(metric, reading.value, language)}
                        </td>
                        <td className="px-4 py-3 text-right sm:px-6">
                          {change === null || Icon === null ? (
                            <span className="text-muted-foreground text-xs">
                              {t.metricPage.firstReading}
                            </span>
                          ) : (
                            <span
                              className={cn(
                                "inline-flex items-center gap-1 whitespace-nowrap tabular-nums",
                                TONE_TEXT_CLASS[
                                  changeTone(directions[metric], change.direction)
                                ],
                              )}
                            >
                              <Icon className="size-3.5" aria-hidden />
                              {formatMetricDelta(
                                metric,
                                change.delta,
                                language,
                                t.common.percentagePoints,
                              )}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </CardContent>
          </Card>
          {inWindow.length > shown && (
            <Button
              type="button"
              variant="outline"
              className="self-start"
              onClick={() => setShown((count) => count + PAGE)}
            >
              {t.measurements.showMore}
            </Button>
          )}
        </section>
      )}
    </div>
  );
}
