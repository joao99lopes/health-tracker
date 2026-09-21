"use client";

import type { ReactNode } from "react";
import { ArrowDownIcon, ArrowUpIcon, MinusIcon } from "lucide-react";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useI18n } from "@/lib/i18n/context";
import { useHydrated } from "@/hooks/use-hydrated";
import type { MeasurementComparison } from "@/lib/measurements/comparison";
import {
  formatDate,
  formatMetricDelta,
  formatMetricValue,
  formatPercentChange,
} from "@/lib/measurements/format";
import { metricLabel } from "@/lib/measurements/messages";
import {
  changeTone,
  type DirectionPreferences,
} from "@/lib/preferences/direction";
import { TONE_TEXT_CLASS } from "@/components/tone";
import { cn } from "@/lib/utils";

/**
 * One comparison between two measurements, metric by metric.
 *
 * Only metrics present on both sides appear - a difference against a value
 * that was never recorded is not a difference. When there is no second
 * measurement to compare with, the card says so instead of drawing zeroes.
 *
 * The arrow states which way the number moved, and the number says how far.
 * Where the reader has said which way they would like a metric to go, the two
 * are tinted as with or against that - a presentation preference, not a
 * judgement of the value. With no preference stated the row is neutral, as it
 * was before. Nothing here suggests what to do about any of it.
 */

const DIRECTION_ICONS = {
  up: ArrowUpIcon,
  down: ArrowDownIcon,
  same: MinusIcon,
} as const;

export function ComparisonCard({
  title,
  comparison,
  directions,
  action,
}: {
  title: string;
  comparison: MeasurementComparison | null;
  /** The reader's direction preference per metric; presentation only. */
  directions: DirectionPreferences;
  /** Optional control in the header, such as the period picker. */
  action?: ReactNode;
}) {
  const { t, language } = useI18n();
  // The reader's time zone is only known in the browser; UTC is what the
  // server pass and the hydration pass can both agree on. See `useHydrated`.
  const hydrated = useHydrated();

  if (comparison === null || comparison.metrics.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          {action !== undefined && <CardAction>{action}</CardAction>}
        </CardHeader>
        <CardContent>
          <div className="border-border text-muted-foreground rounded-lg border border-dashed px-4 py-6 text-center text-sm">
            {t.dashboard.notEnoughData}
          </div>
        </CardContent>
      </Card>
    );
  }

  const earlierDate = formatDate(
    comparison.earlier.measuredAt,
    language,
    hydrated ? undefined : "UTC",
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>
          {t.dashboard.comparedWith(earlierDate)}
        </CardDescription>
        {action !== undefined && <CardAction>{action}</CardAction>}
      </CardHeader>
      <CardContent>
        <ul className="flex flex-col">
          {comparison.metrics.map((metric) => {
            const Icon = DIRECTION_ICONS[metric.direction];
            const percent = formatPercentChange(metric.percentChange, language);
            const tone = TONE_TEXT_CLASS[
              changeTone(directions[metric.metric], metric.direction)
            ];
            return (
              <li
                key={metric.metric}
                className="border-border flex items-center justify-between gap-4 border-b py-3 first:pt-0 last:border-0 last:pb-0"
              >
                <div className="flex min-w-0 flex-col gap-0.5">
                  <span className="truncate text-sm font-medium">
                    {metricLabel(t, metric.metric)}
                  </span>
                  <span className="text-muted-foreground text-xs tabular-nums">
                    {formatMetricValue(metric.metric, metric.from, language)}
                    {" → "}
                    {formatMetricValue(metric.metric, metric.to, language)}
                  </span>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {percent !== null && (
                    <span className="text-muted-foreground text-xs tabular-nums">
                      {percent}
                    </span>
                  )}
                  <span
                    className={cn(
                      "bg-muted flex items-center gap-1 rounded-full px-2 py-1 text-sm font-medium tabular-nums",
                      tone,
                    )}
                  >
                    <Icon className="size-3.5" aria-hidden />
                    {formatMetricDelta(metric.metric, metric.delta, language)}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
