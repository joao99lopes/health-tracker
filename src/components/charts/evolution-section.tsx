"use client";

import { useMemo, useState } from "react";
import { LineChartIcon } from "lucide-react";
import { MetricChart } from "@/components/charts/metric-chart";
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
import { useI18n } from "@/lib/i18n/context";
import { formatMetricValue } from "@/lib/measurements/format";
import { metricLabel } from "@/lib/measurements/messages";
import { METRICS, isMetric, type Metric } from "@/lib/measurements/metrics";
import type { Measurement } from "@/lib/measurements/queries";
import type { DirectionPreferences } from "@/lib/preferences/direction";
import {
  buildMetricSeries,
  hasAnyPoints,
  hasEnoughPoints,
  type SeriesPoint,
} from "@/lib/measurements/series";
import {
  DEFAULT_PERIOD,
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

/** The metric shown before the user picks one. */
const DEFAULT_METRIC: Metric = "weightKg";

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
}: {
  measurements: Measurement[];
  /** The reader's direction preference per metric; presentation only. */
  directions: DirectionPreferences;
  /** Fixed by the server for this request; see the note above. */
  now: Date;
}) {
  const { t } = useI18n();
  const [metric, setMetric] = useState<Metric>(DEFAULT_METRIC);
  const [period, setPeriod] = useState<PeriodKey>(DEFAULT_PERIOD);

  const series = useMemo(
    () => buildMetricSeries(measurements, metric, period, now),
    [measurements, metric, period, now],
  );

  // The first reading is the current one when there is only one; showing it
  // twice would suggest a comparison that does not exist.
  const showFirst = series.first !== null && series.first !== series.current;

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <SectionHeader
          title={t.charts.title}
          description={t.charts.description}
        />

        <div className="grid shrink-0 grid-cols-2 gap-3 sm:flex sm:items-end">
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
                <SelectValue />
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
                <SelectValue />
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
              <MetricChart series={series} direction={directions[metric]} />
              {/* One reading is worth drawing, but it is not an evolution.
                  Say which of the two this is. */}
              {!hasEnoughPoints(series) && (
                <p className="text-muted-foreground text-xs">
                  {t.charts.singlePoint}
                </p>
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
