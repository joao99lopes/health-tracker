"use client";

import { useMemo, useState } from "react";
import { ArrowDownIcon, ArrowUpIcon, MinusIcon } from "lucide-react";
import { SectionHeader } from "@/components/page-header";
import { TONE_TEXT_CLASS } from "@/components/tone";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useHydrated } from "@/hooks/use-hydrated";
import { useI18n } from "@/lib/i18n/context";
import {
  compareLatestToFirst,
  compareOverPeriod,
  type MetricComparison,
} from "@/lib/measurements/comparison";
import {
  formatDate,
  formatMetricDelta,
  formatMetricValue,
  formatPercentChange,
} from "@/lib/measurements/format";
import { metricName } from "@/lib/measurements/messages";
import {
  METRICS,
  metricDisplay,
  type MeasurementSnapshot,
  type Metric,
} from "@/lib/measurements/metrics";
import {
  changeTone,
  type DirectionPreferences,
} from "@/lib/preferences/direction";
import {
  PERIOD_KEYS,
  isPeriodKey,
  type PeriodKey,
} from "@/lib/periods/periods";
import { cn } from "@/lib/utils";

/**
 * Two comparisons in one table: each metric's latest reading against its
 * first, and against the start of a period the reader picks.
 *
 * They used to be two cards of nine rows each, which on a phone made the
 * dashboard four and a half screens long. One row per metric holds both, and
 * on a phone the table shows the first few metrics until asked for the rest.
 *
 * Every metric is compared between its own readings (see `comparison.ts`), so
 * each change says which day it is counted from. A metric with fewer than two
 * readings has a dash with "not enough data" for screen readers, never a 0,
 * and with nothing to compare at all the section says "Not enough data yet."
 *
 * The relative change is printed only where it adds something: not for a
 * percentage metric, where "-2.5 pp" and "-7.8%" side by side are two numbers
 * both about percentages, and not where the rounded change is nothing, where
 * a "-0.1%" beside "0.00" would contradict it.
 */

/** Rows visible on a phone before "Show all". */
const COLLAPSED_ROWS = 5;

const DIRECTION_ICONS = {
  up: ArrowUpIcon,
  down: ArrowDownIcon,
  same: MinusIcon,
} as const;

function Change({
  comparison,
  directions,
}: {
  comparison: MetricComparison | undefined;
  directions: DirectionPreferences;
}) {
  const { t, language } = useI18n();
  const hydrated = useHydrated();
  if (comparison === undefined) {
    return (
      <span className="text-muted-foreground">
        <span aria-hidden>—</span>
        <span className="sr-only">{t.dashboard.notEnoughData}</span>
      </span>
    );
  }
  const Icon = DIRECTION_ICONS[comparison.direction];
  const tone =
    TONE_TEXT_CLASS[changeTone(directions[comparison.metric], comparison.direction)];
  const percent =
    comparison.direction === "same" ||
    metricDisplay(comparison.metric).unit === "%"
      ? null
      : formatPercentChange(comparison.percentChange, language);
  return (
    <span className="inline-flex flex-col items-end gap-0.5">
      <span
        className={cn(
          "bg-muted inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-sm font-medium whitespace-nowrap tabular-nums",
          tone,
        )}
      >
        <Icon className="size-3.5" aria-hidden />
        {formatMetricDelta(
          comparison.metric,
          comparison.delta,
          language,
          t.common.percentagePoints,
        )}
      </span>
      <span className="text-muted-foreground text-right text-xs tabular-nums sm:whitespace-nowrap">
        {percent !== null && <>{percent} · </>}
        {t.dashboard.since(
          formatDate(comparison.fromAt, language, hydrated ? undefined : "UTC"),
        )}
      </span>
    </span>
  );
}

export function ComparisonTable({
  measurements,
  directions,
  now,
  period,
  onPeriodChange,
}: {
  measurements: readonly MeasurementSnapshot[];
  /** The reader's direction preference per metric; presentation only. */
  directions: DirectionPreferences;
  /** Fixed by the server for this request, so the period means one thing. */
  now: Date;
  /** Owned by the dashboard, which keeps it in the address. */
  period: PeriodKey;
  onPeriodChange: (period: PeriodKey) => void;
}) {
  const { t, language } = useI18n();
  const [expanded, setExpanded] = useState(false);

  const vsFirst = useMemo(
    () => byMetric(compareLatestToFirst(measurements)?.metrics),
    [measurements],
  );
  const overPeriod = useMemo(
    () => byMetric(compareOverPeriod(measurements, period, now)?.metrics),
    [measurements, period, now],
  );
  // A metric earns a row once it has two readings ever; within the chosen
  // period it may still have fewer, and then that cell says so.
  const rows = METRICS.filter((metric) => vsFirst.has(metric));
  const hiddenOnPhone = expanded ? 0 : Math.max(0, rows.length - COLLAPSED_ROWS);

  return (
    <section className="flex flex-col gap-4">
      <SectionHeader
        title={t.dashboard.comparisons}
        description={t.dashboard.perMetricHint}
        actions={
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="compare-period" className="text-xs">
              {t.charts.period}
            </Label>
            <Select
              value={period}
              onValueChange={(value) => {
                if (isPeriodKey(value)) {
                  onPeriodChange(value);
                }
              }}
            >
              <SelectTrigger id="compare-period" className="w-full sm:w-36">
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
        }
      />

      <Card className="py-0">
        <CardContent className="px-0">
          {rows.length === 0 ? (
            <div className="text-muted-foreground px-6 py-8 text-center text-sm">
              {t.dashboard.notEnoughData}
            </div>
          ) : (
            <table className="w-full table-fixed text-sm sm:table-auto">
              <thead>
                <tr className="border-border text-muted-foreground border-b text-xs font-medium tracking-wide uppercase">
                  <th scope="col" className="px-4 py-3 text-left sm:px-6">
                    {t.charts.metric}
                  </th>
                  <th scope="col" className="px-2 py-3 text-right">
                    {t.dashboard.vsFirst}
                  </th>
                  <th scope="col" className="px-4 py-3 text-right sm:px-6">
                    {t.periods[period]}
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((metric, index) => {
                  const first = vsFirst.get(metric);
                  return (
                    <tr
                      key={metric}
                      className={cn(
                        "border-border border-b last:border-0",
                        !expanded && index >= COLLAPSED_ROWS && "max-sm:hidden",
                      )}
                    >
                      <th
                        scope="row"
                        className="px-4 py-3 text-left align-top font-normal sm:px-6"
                      >
                        <span className="block font-medium">
                          {metricName(t, metric)}
                        </span>
                        {first !== undefined && (
                          <span className="text-muted-foreground block text-xs tabular-nums">
                            {formatMetricValue(metric, first.to, language)}
                          </span>
                        )}
                      </th>
                      <td className="px-2 py-3 text-right align-top">
                        <Change comparison={first} directions={directions} />
                      </td>
                      <td className="px-4 py-3 text-right align-top sm:px-6">
                        <Change
                          comparison={overPeriod.get(metric)}
                          directions={directions}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {hiddenOnPhone > 0 && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="self-start sm:hidden"
          aria-expanded={false}
          onClick={() => setExpanded(true)}
        >
          {t.dashboard.showAllMetrics(rows.length)}
        </Button>
      )}
    </section>
  );
}

function byMetric(
  comparisons: MetricComparison[] | undefined,
): Map<Metric, MetricComparison> {
  return new Map((comparisons ?? []).map((item) => [item.metric, item]));
}
