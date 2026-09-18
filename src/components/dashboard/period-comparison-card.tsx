"use client";

import { useMemo, useState } from "react";
import { ComparisonCard } from "@/components/dashboard/comparison-card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useI18n } from "@/lib/i18n/context";
import { compareOverPeriod } from "@/lib/measurements/comparison";
import type { Measurement } from "@/lib/measurements/queries";
import {
  DEFAULT_PERIOD,
  PERIOD_KEYS,
  isPeriodKey,
  type PeriodKey,
} from "@/lib/periods/periods";

/**
 * The third comparison: the ends of a period the reader chooses.
 *
 * `compareOverPeriod` takes the first and last measurement inside the period,
 * so this answers "what changed over the last three months" rather than
 * "what changed between the last two weigh-ins". Fewer than two measurements
 * in the period is the "Not enough data yet." case, which `ComparisonCard`
 * already renders.
 *
 * The period list comes from the module that defines it once, so this cannot
 * drift from the chart's picker.
 *
 * `now` is fixed by the server for the whole request; deriving it here would
 * let the server pass and the hydration pass disagree about which
 * measurements fall inside the period.
 */
export function PeriodComparisonCard({
  measurements,
  now,
}: {
  measurements: Measurement[];
  now: Date;
}) {
  const { t } = useI18n();
  const [period, setPeriod] = useState<PeriodKey>(DEFAULT_PERIOD);

  const comparison = useMemo(
    () => compareOverPeriod(measurements, period, now),
    [measurements, period, now],
  );

  return (
    <ComparisonCard
      title={t.dashboard.vsPeriod}
      comparison={comparison}
      action={
        <Select
          value={period}
          onValueChange={(value) => {
            if (isPeriodKey(value)) {
              setPeriod(value);
            }
          }}
        >
          <SelectTrigger
            size="sm"
            aria-label={t.charts.period}
            className="w-36"
          >
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
      }
    />
  );
}
