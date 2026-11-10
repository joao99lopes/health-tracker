"use client";

import Link from "next/link";
import {
  ArrowDownIcon,
  ArrowRightIcon,
  ArrowUpIcon,
  LineChartIcon,
  MinusIcon,
} from "lucide-react";
import { EvolutionSection } from "@/components/charts/evolution-section";
import { ComparisonCard } from "@/components/dashboard/comparison-card";
import { PeriodComparisonCard } from "@/components/dashboard/period-comparison-card";
import { EmptyState } from "@/components/empty-state";
import { AddMeasurementButton } from "@/components/measurements/add-measurement-fab";
import { LocalDateTime } from "@/components/measurements/local-date-time";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useHydrated } from "@/hooks/use-hydrated";
import { ageInYears } from "@/lib/health/age";
import {
  classifyBmi,
  isAdultBmiApplicable,
} from "@/lib/health/bmi-classification";
import { classifyWaistToHeightRatio } from "@/lib/health/waist-to-height-classification";
import { useI18n } from "@/lib/i18n/context";
import {
  compareLatestToFirst,
  compareLatestToPrevious,
  type MetricComparison,
} from "@/lib/measurements/comparison";
import {
  formatDate,
  formatMetricDelta,
  formatMetricValue,
} from "@/lib/measurements/format";
import { metricLabel } from "@/lib/measurements/messages";
import type { Measurement } from "@/lib/measurements/queries";
import { metricValue, type Metric } from "@/lib/measurements/metrics";
import {
  changeTone,
  type DirectionPreferences,
} from "@/lib/preferences/direction";
import { METRIC_ICONS } from "@/components/metric-icons";
import { TONE_TEXT_CLASS } from "@/components/tone";
import { cn } from "@/lib/utils";
import {
  latestMeasurement,
  latestMetricReadings,
  type MetricReading,
} from "@/lib/measurements/summary";

/**
 * The dashboard: the latest measurement, the current value of every metric
 * that has ever been recorded, and two comparisons.
 *
 * A metric the user has never recorded has no card - an empty tile would be
 * an invitation to record something, and this page reports rather than
 * suggests. A value carried over from an older measurement says which day it
 * came from, so nothing on the page claims to be more recent than it is.
 *
 * Each card carries its own change against that metric's previous reading,
 * wherever it was recorded. A metric recorded only once shows the value alone:
 * a difference against something that was never measured would be an
 * invention. Comparison availability is therefore per metric, not per card
 * set.
 *
 * Where the reader has said which way they would like a metric to move, that
 * change is tinted as with or against what they asked for. It is a
 * presentation preference and no more: the arrow and the number carry the
 * meaning on their own, and no value is called good or bad.
 *
 * BMI comes from the weight and the height stored with each measurement, so
 * it is stable, and its WHO band is shown only where those cut-off points
 * apply. The band is set in neutral type: it names where the number falls and
 * is not coloured as good or bad. The waist-to-height ratio is derived the
 * same way, from the waist and the height stored with each measurement, and
 * its card carries its reference band in the same neutral type.
 */

/** BMI leads the page; the stored values follow in their canonical order. */
function partitionReadings(readings: MetricReading[]): {
  bmi: MetricReading | null;
  values: MetricReading[];
} {
  return {
    bmi: readings.find((reading) => reading.metric === "bmi") ?? null,
    values: readings.filter((reading) => reading.metric !== "bmi"),
  };
}

const DIRECTION_ICONS = {
  up: ArrowUpIcon,
  down: ArrowDownIcon,
  same: MinusIcon,
} as const;

/**
 * Each metric's change against its own previous reading.
 *
 * Only metrics recorded at least twice are in the map, so a card that finds
 * nothing here simply has nothing to compare with.
 */
function previousChanges(
  measurements: readonly Measurement[],
): Map<Metric, MetricComparison> {
  const comparison = compareLatestToPrevious(measurements);
  return new Map(
    (comparison?.metrics ?? []).map((metric) => [metric.metric, metric]),
  );
}

function MetricCard({
  reading,
  change,
  direction,
  category,
}: {
  reading: MetricReading;
  /** Against the previous measurement, or null when there is none. */
  change: MetricComparison | null;
  /** The reader's preference for this metric; presentation only. */
  direction: DirectionPreferences[Metric];
  /** The reference band the value falls into, for metrics that have one. */
  category: string | null;
}) {
  const { t, language } = useI18n();
  const hydrated = useHydrated();
  const MetricIcon = METRIC_ICONS[reading.metric];
  const DirectionIcon = change === null ? null : DIRECTION_ICONS[change.direction];
  const tone =
    change === null
      ? TONE_TEXT_CLASS.neutral
      : TONE_TEXT_CLASS[changeTone(direction, change.direction)];

  return (
    <Card size="sm" className="justify-between">
      <CardContent className="flex flex-col gap-1.5">
        <p className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium">
          <MetricIcon className="text-primary size-3.5 shrink-0" aria-hidden />
          {metricLabel(t, reading.metric)}
        </p>
        <p className="text-xl font-semibold tabular-nums sm:text-2xl">
          {formatMetricValue(reading.metric, reading.value, language)}
        </p>
        {category !== null && (
          <p className="bg-card/70 text-foreground ring-foreground/10 w-fit rounded-full px-2 py-0.5 text-xs font-medium ring-1">
            {category}
          </p>
        )}
        {/* The arrow and the number carry the change; the tint only says
            whether it went the way the reader asked for. Where there is no
            previous value for this metric there is no difference to show -
            never a zero standing in for one. */}
        {change !== null && DirectionIcon !== null && (
          <p
            className={cn(
              "flex items-center gap-1 text-xs tabular-nums",
              tone,
            )}
          >
            <DirectionIcon className="size-3.5 shrink-0" aria-hidden />
            <span>
              {formatMetricDelta(
                change.metric,
                change.delta,
                language,
                t.common.percentagePoints,
              )}
            </span>
          </p>
        )}
        {/* Carried over from an older measurement: say so rather than let it
            pass as part of the latest one. */}
        {!reading.current && (
          <p className="text-muted-foreground text-xs">
            {t.dashboard.fromEarlier(
              formatDate(
                reading.measuredAt,
                language,
                hydrated ? undefined : "UTC",
              ),
            )}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export function Dashboard({
  measurements,
  birthDate,
  directions,
  now,
}: {
  measurements: Measurement[];
  /** From the profile, for the age the WHO BMI bands are defined against. */
  birthDate: string | null;
  /**
   * The reader's direction preference per metric. Presentation only: it
   * changes how a change is coloured and nothing that is stored or computed.
   */
  directions: DirectionPreferences;
  /** Fixed by the server for this request, so period filtering is stable. */
  now: Date;
}) {
  const { t, language } = useI18n();

  const latest = latestMeasurement(measurements);
  if (latest === null) {
    return (
      <Card>
        <CardContent className="p-0">
          <EmptyState
            icon={LineChartIcon}
            title={t.dashboard.empty}
            description={t.dashboard.emptyDescription}
            action={<AddMeasurementButton />}
          />
        </CardContent>
      </Card>
    );
  }

  const { bmi, values } = partitionReadings(latestMetricReadings(measurements));
  /** The waist-to-height band of a reading's own (exact) value. */
  const readingCategory = (reading: MetricReading): string | null => {
    if (reading.metric !== "waistToHeightRatio") {
      return null;
    }
    const band = classifyWaistToHeightRatio(reading.value);
    return band === null ? null : t.measurements.waistToHeightCategories[band];
  };
  const changes = previousChanges(measurements);
  const BmiIcon = METRIC_ICONS.bmi;
  // The band applied at the time of the measurement, from the age then.
  const category = isAdultBmiApplicable(
    ageInYears(birthDate, latest.measuredAt),
  )
    ? classifyBmi(metricValue(latest, "bmi"))
    : null;

  return (
    <div className="flex flex-col gap-8">
      {/* The one thing the page is about, given the weight to match. */}
      <Card className="from-accent/60 to-card bg-gradient-to-br">
        <CardContent className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between sm:gap-8">
          <div className="flex flex-col gap-1">
            <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
              {t.dashboard.latest}
            </p>
            <p className="font-heading text-lg font-semibold">
              <LocalDateTime value={latest.measuredAt} />
            </p>
          </div>

          {bmi !== null && (
            <div className="flex flex-col gap-1 sm:items-end">
              <p className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium tracking-wide uppercase">
                <BmiIcon
                  className="text-primary size-3.5 shrink-0"
                  aria-hidden
                />
                {t.measurements.bmi}
              </p>
              <p className="text-4xl leading-none font-semibold tabular-nums sm:text-5xl">
                {formatMetricValue("bmi", bmi.value, language)}
              </p>
              {category !== null && (
                <p className="bg-card/70 text-foreground ring-foreground/10 mt-1 w-fit rounded-full px-2.5 py-0.5 text-xs font-medium ring-1">
                  {t.measurements.bmiCategories[category]}
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {values.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
            {t.dashboard.latestValues}
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {values.map((reading) => (
              <MetricCard
                key={reading.metric}
                reading={reading}
                change={changes.get(reading.metric) ?? null}
                direction={directions[reading.metric]}
                category={readingCategory(reading)}
              />
            ))}
          </div>
        </section>
      )}

      <EvolutionSection
        measurements={measurements}
        directions={directions}
        now={now}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <ComparisonCard
          title={t.dashboard.vsFirst}
          comparison={compareLatestToFirst(measurements)}
          directions={directions}
        />
        {/* The third comparison: both ends of a period the reader picks. */}
        <PeriodComparisonCard
          measurements={measurements}
          directions={directions}
          now={now}
        />
      </div>

      <Button asChild variant="outline" className="self-start">
        <Link href="/measurements">
          {t.dashboard.viewAll}
          <ArrowRightIcon />
        </Link>
      </Button>
    </div>
  );
}
