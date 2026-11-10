"use client";

import dynamic from "next/dynamic";
import { CHART_HEIGHT } from "@/components/charts/chart-size";
import { buildMetricSeries } from "@/lib/measurements/series";
import type { Metric } from "@/lib/measurements/metrics";
import type { Measurement } from "@/lib/measurements/queries";
import type { PeriodKey } from "@/lib/periods/periods";

const MetricChart = dynamic(
  () => import("@/components/charts/metric-chart").then((m) => m.MetricChart),
  { ssr: false, loading: () => <div className={CHART_HEIGHT} aria-hidden /> },
);

/**
 * The report's one chart: the leading metric over the report's period.
 *
 * Drawn in the neutral colour whatever the reader's direction preference:
 * the report is a record to show someone else, and the tint only means
 * something to the person who chose it.
 */
export function ReportChart({
  measurements,
  metric,
  period,
  now,
}: {
  measurements: Measurement[];
  metric: Metric;
  period: PeriodKey;
  now: Date;
}) {
  const series = buildMetricSeries(measurements, metric, period, now);
  return (
    <div className="break-inside-avoid">
      <MetricChart series={series} direction="indifferent" />
    </div>
  );
}
