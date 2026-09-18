"use client";

import Link from "next/link";
import { ArrowRightIcon, LineChartIcon } from "lucide-react";
import { EvolutionSection } from "@/components/charts/evolution-section";
import { ComparisonCard } from "@/components/dashboard/comparison-card";
import { PeriodComparisonCard } from "@/components/dashboard/period-comparison-card";
import { EmptyState } from "@/components/empty-state";
import { LocalDateTime } from "@/components/measurements/local-date-time";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useHydrated } from "@/hooks/use-hydrated";
import { ageInYears } from "@/lib/health/age";
import {
  classifyBmi,
  isAdultBmiApplicable,
} from "@/lib/health/bmi-classification";
import { useI18n } from "@/lib/i18n/context";
import {
  compareLatestToFirst,
  compareLatestToPrevious,
} from "@/lib/measurements/comparison";
import { formatDate, formatMetricValue } from "@/lib/measurements/format";
import { metricLabel } from "@/lib/measurements/messages";
import type { Measurement } from "@/lib/measurements/queries";
import { metricValue } from "@/lib/measurements/metrics";
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
 * BMI comes from the weight and the height stored with each measurement, so
 * it is stable, and its WHO band is shown only where those cut-off points
 * apply. The band is set in neutral type: it names where the number falls and
 * is not coloured as good or bad.
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

function MetricCard({ reading }: { reading: MetricReading }) {
  const { t, language } = useI18n();
  const hydrated = useHydrated();

  return (
    <Card size="sm" className="justify-between">
      <CardContent className="flex flex-col gap-1.5">
        <p className="text-muted-foreground text-xs font-medium">
          {metricLabel(t, reading.metric)}
        </p>
        <p className="text-xl font-semibold tabular-nums sm:text-2xl">
          {formatMetricValue(reading.metric, reading.value, language)}
        </p>
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
  now,
}: {
  measurements: Measurement[];
  /** From the profile, for the age the WHO BMI bands are defined against. */
  birthDate: string | null;
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
          />
        </CardContent>
      </Card>
    );
  }

  const { bmi, values } = partitionReadings(latestMetricReadings(measurements));
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
              <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
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
              <MetricCard key={reading.metric} reading={reading} />
            ))}
          </div>
        </section>
      )}

      <EvolutionSection measurements={measurements} now={now} />

      <div className="grid gap-4 lg:grid-cols-2">
        <ComparisonCard
          title={t.dashboard.vsPrevious}
          comparison={compareLatestToPrevious(measurements)}
        />
        <ComparisonCard
          title={t.dashboard.vsFirst}
          comparison={compareLatestToFirst(measurements)}
        />
        {/* The third comparison: both ends of a period the reader picks. */}
        <PeriodComparisonCard measurements={measurements} now={now} />
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
