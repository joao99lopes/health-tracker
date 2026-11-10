"use client";

import { useId, useMemo, useState } from "react";
import { LineChartIcon, MaximizeIcon, TableIcon } from "lucide-react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { CHART_HEIGHT } from "@/components/charts/chart-size";
import { PeriodSummary } from "@/components/charts/period-summary";
import { SeriesTable } from "@/components/charts/series-table";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import { SectionHeader } from "@/components/page-header";
import { LocalDateTime } from "@/components/measurements/local-date-time";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { metricViewSearch } from "@/lib/dashboard/metric-view";
import type { DashboardView } from "@/lib/dashboard/view";
import { summarizeSeries } from "@/lib/measurements/stats";
import { useI18n } from "@/lib/i18n/context";
import { formatMetricValue } from "@/lib/measurements/format";
import { metricLabel, metricName } from "@/lib/measurements/messages";
import {
  METRICS,
  isMetric,
  type MeasurementSnapshot,
  type Metric,
} from "@/lib/measurements/metrics";
import type { DirectionPreferences } from "@/lib/preferences/direction";
import {
  MOVING_AVERAGE_WINDOWS,
  buildMetricSeries,
  buildMovingAverage,
  hasAnyPoints,
  hasEnoughPoints,
  isMovingAverageWindow,
  type MovingAverageWindow,
  type SeriesPoint,
} from "@/lib/measurements/series";
import {
  PERIOD_KEYS,
  isPeriodKey,
  type PeriodKey,
} from "@/lib/periods/periods";

/**
 * The evolution of one metric over one period.
 *
 * The metric list and the period list both come from the modules that define
 * them once, so this section cannot drift from the rest of the application.
 *
 * `now` is fixed by the server for the whole request. Deriving it here would
 * let the server pass and the hydration pass disagree about whether a
 * measurement is still inside the period, which React reports as a mismatch.
 */

/**
 * Recharts is most of the dashboard's JavaScript (about 110 KB gzipped). It
 * is fetched only when there is a line to draw - not for an account with no
 * readings, a period with none, or the table view - and the chart was never
 * server-rendered anyway (it needs the reader's time zone), so nothing is
 * lost by not rendering it on the server.
 */
const MetricChart = dynamic(
  () => import("@/components/charts/metric-chart").then((m) => m.MetricChart),
  { ssr: false, loading: () => <div className={CHART_HEIGHT} aria-hidden /> },
);

/** Select value for "no moving average" and "no comparison". */
const OFF = "off";

function Reading({
  label,
  point,
  metric,
}: {
  label: string;
  point: SeriesPoint | null;
  metric: Metric;
}) {
  const { language } = useI18n();
  if (point === null) {
    return null;
  }
  return (
    <div className="flex flex-col gap-0.5">
      <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
        {label}
      </p>
      <p className="text-lg font-semibold tabular-nums">
        {formatMetricValue(metric, point.value, language)}
      </p>
      <p className="text-muted-foreground text-xs">
        <LocalDateTime value={point.measuredAt} mode="date" />
      </p>
    </div>
  );
}

export function EvolutionSection({
  measurements,
  directions,
  now,
  view,
  onViewChange,
}: {
  measurements: MeasurementSnapshot[];
  /** The reader's direction preference per metric; presentation only. */
  directions: DirectionPreferences;
  /** Fixed by the server for this request; see the note above. */
  now: Date;
  /**
   * What to show, owned by the dashboard (and kept in its address). Both
   * extras default to off: the default chart is the readings and nothing
   * else.
   */
  view: Pick<DashboardView, "metric" | "period" | "average" | "compare">;
  onViewChange: (change: Partial<DashboardView>) => void;
}) {
  const { t, language } = useI18n();
  const { metric, period, average: averageWindow, compare: compareMetric } = view;
  const setMetric = (value: Metric) => onViewChange({ metric: value });
  const setPeriod = (value: PeriodKey) => onViewChange({ period: value });
  const setAverageWindow = (value: MovingAverageWindow | null) =>
    onViewChange({ average: value });
  const setCompareMetric = (value: Metric | null) =>
    onViewChange({ compare: value });
  // Comparing a metric with itself says nothing; picking the compared one as
  // the main metric drops the comparison.
  const secondaryMetric = compareMetric === metric ? null : compareMetric;

  const series = useMemo(
    () => buildMetricSeries(measurements, metric, period, now),
    [measurements, metric, period, now],
  );
  const average = useMemo(
    () =>
      averageWindow === null
        ? null
        : {
            window: averageWindow,
            points: buildMovingAverage(measurements, series, averageWindow),
          },
    [measurements, series, averageWindow],
  );
  const summary = useMemo(() => summarizeSeries(series.points), [series]);
  // The same readings as a table, for whoever cannot or would rather not
  // read them off the line. Not kept in the address: it is a way of reading
  // the chart, not a different chart.
  const [showTable, setShowTable] = useState(false);
  const descriptionId = useId();
  const tableId = useId();
  const secondary = useMemo(
    () =>
      secondaryMetric === null
        ? null
        : buildMetricSeries(measurements, secondaryMetric, period, now),
    [measurements, secondaryMetric, period, now],
  );

  // Carries the period and average over, so the page opens on the same view.
  const metricSearch = metricViewSearch({
    period,
    range: null,
    average: averageWindow,
  });
  const metricPageHref = `/metrics/${metric}${metricSearch === "" ? "" : `?${metricSearch}`}`;

  // The first reading is the current one when there is only one; showing it
  // twice would suggest a comparison that does not exist.
  const showFirst = series.first !== null && series.first !== series.current;

  return (
    <section
      id="evolution"
      // Focusable so a metric card can move the reader here, not only scroll.
      tabIndex={-1}
      className="flex scroll-mt-20 flex-col gap-4 outline-none"
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <SectionHeader
          title={t.charts.title}
          description={t.charts.description}
        />

        <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap sm:items-end lg:shrink-0">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="chart-metric" className="text-xs">
              {t.charts.metric}
            </Label>
            <Select
              value={metric}
              onValueChange={(value) => {
                if (isMetric(value)) {
                  setMetric(value);
                }
              }}
            >
              <SelectTrigger id="chart-metric" className="w-full sm:w-44">
                <SelectValue>{metricLabel(t, metric)}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {METRICS.map((option) => (
                  <SelectItem key={option} value={option}>
                    {metricLabel(t, option)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="chart-period" className="text-xs">
              {t.charts.period}
            </Label>
            <Select
              value={period}
              onValueChange={(value) => {
                if (isPeriodKey(value)) {
                  setPeriod(value);
                }
              }}
            >
              <SelectTrigger id="chart-period" className="w-full sm:w-36">
                <SelectValue>{t.periods[period]}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {PERIOD_KEYS.map((option) => (
                  <SelectItem key={option} value={option}>
                    {t.periods[option]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="chart-average" className="text-xs">
              {t.charts.movingAverage}
            </Label>
            <Select
              value={averageWindow === null ? OFF : String(averageWindow)}
              onValueChange={(value) => {
                const days = Number(value);
                setAverageWindow(isMovingAverageWindow(days) ? days : null);
              }}
            >
              <SelectTrigger id="chart-average" className="w-full sm:w-32">
                <SelectValue>
                  {averageWindow === null
                    ? t.charts.movingAverageOff
                    : t.charts.movingAverageWindow(averageWindow)}
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

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="chart-compare" className="text-xs">
              {t.charts.compareWith}
            </Label>
            <Select
              value={secondaryMetric ?? OFF}
              onValueChange={(value) => {
                setCompareMetric(isMetric(value) ? value : null);
              }}
            >
              <SelectTrigger id="chart-compare" className="w-full sm:w-44">
                <SelectValue>
                  {secondaryMetric === null
                    ? t.charts.compareNone
                    : metricLabel(t, secondaryMetric)}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={OFF}>{t.charts.compareNone}</SelectItem>
                {METRICS.filter((option) => option !== metric).map((option) => (
                  <SelectItem key={option} value={option}>
                    {metricLabel(t, option)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <Card>
        <CardContent className="flex flex-col gap-5">
          {series.current !== null && (
            <div className="flex flex-wrap gap-x-10 gap-y-4">
              <Reading
                label={t.charts.current}
                point={series.current}
                metric={metric}
              />
              <Reading
                label={t.charts.previous}
                point={series.previous}
                metric={metric}
              />
              {showFirst && (
                <Reading
                  label={t.charts.first}
                  point={series.first}
                  metric={metric}
                />
              )}
            </div>
          )}

          {hasAnyPoints(series) ? (
            <>
              {/* What the line shows, in words, for a screen reader; the
                  table below has every value. */}
              <p id={descriptionId} className="sr-only">
                {summary !== null &&
                  series.first !== null &&
                  series.current !== null &&
                  t.charts.describe({
                    metric: metricLabel(t, metric),
                    period: t.periods[period],
                    count: summary.count,
                    first: formatMetricValue(metric, series.first.value, language),
                    last: formatMetricValue(metric, series.current.value, language),
                    min: formatMetricValue(metric, summary.min, language),
                    max: formatMetricValue(metric, summary.max, language),
                  })}
              </p>
              <div className="flex flex-wrap justify-end gap-1 print:hidden">
                {/* The metric on its own page: a full-width chart, a range
                    of dates, and every reading with its change. */}
                <Button asChild variant="ghost" size="sm">
                  <Link href={metricPageHref}>
                    <MaximizeIcon />
                    {t.charts.openMetric(metricName(t, metric))}
                  </Link>
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  aria-expanded={showTable}
                  aria-controls={showTable ? tableId : undefined}
                  onClick={() => setShowTable((shown) => !shown)}
                >
                  {showTable ? <LineChartIcon /> : <TableIcon />}
                  {showTable ? t.charts.showChart : t.charts.showTable}
                </Button>
              </div>
              {showTable ? (
                <SeriesTable
                  id={tableId}
                  series={series}
                  secondary={
                    secondary !== null && hasAnyPoints(secondary)
                      ? secondary
                      : null
                  }
                />
              ) : (
                <MetricChart
                  series={series}
                  direction={directions[metric]}
                  average={average}
                  secondary={secondary}
                  describedBy={descriptionId}
                />
              )}
              {/* A chosen comparison with nothing to draw says so, rather
                  than silently showing one line. */}
              {secondary !== null && !hasAnyPoints(secondary) && (
                <p className="text-muted-foreground text-xs">
                  {t.charts.compareNoData(metricLabel(t, secondary.metric))}
                </p>
              )}
              {/* One reading is worth drawing, but it is not an evolution.
                  Say which of the two this is. */}
              {!hasEnoughPoints(series) && (
                <p className="text-muted-foreground text-xs">
                  {t.charts.singlePoint}
                </p>
              )}
              {/* Two readings at least: one reading has no range or mean
                  worth stating apart from itself. */}
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
    </section>
  );
}
