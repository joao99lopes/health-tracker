"use client";

import { ArrowDownIcon, ArrowUpIcon, MinusIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslations } from "@/lib/i18n/context";
import { metricLabel } from "@/lib/measurements/messages";
import { METRICS, type Metric } from "@/lib/measurements/metrics";
import {
  METRIC_DIRECTIONS,
  type DirectionPreferences,
  type MetricDirection,
} from "@/lib/preferences/direction";

/**
 * Which way the reader would like each metric to move.
 *
 * A three-position segmented control per metric: it fits one row, needs no
 * typing and shows all three choices at once, which a dropdown would not. The
 * middle position is the default and is worded as "no preference", so the
 * neutral option never looks like an omission.
 *
 * This section sets a presentation preference. It asks for no number, offers
 * no target and says nothing about what any value should be - the hint above
 * it says exactly that, in secondary type.
 */

const DIRECTION_ICONS: Record<MetricDirection, typeof MinusIcon> = {
  decrease: ArrowDownIcon,
  indifferent: MinusIcon,
  increase: ArrowUpIcon,
};

function DirectionControl({
  metric,
  value,
  onChange,
}: {
  metric: Metric;
  value: MetricDirection;
  onChange: (direction: MetricDirection) => void;
}) {
  const t = useTranslations();
  const label = metricLabel(t, metric);

  return (
    <div className="flex items-center justify-between gap-3">
      <span className="min-w-0 truncate text-sm">{label}</span>
      <div
        role="radiogroup"
        aria-label={t.profile.directions.legend(label)}
        className="bg-muted flex shrink-0 rounded-lg p-0.5"
      >
        {METRIC_DIRECTIONS.map((option) => {
          const Icon = DIRECTION_ICONS[option];
          const selected = option === value;
          return (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={selected}
              // The icon alone would leave the choice to colour and shape;
              // the name is what a screen reader announces.
              aria-label={t.profile.directions.values[option]}
              title={t.profile.directions.values[option]}
              onClick={() => onChange(option)}
              className={cn(
                "focus-visible:ring-ring/50 flex size-7 items-center justify-center rounded-[min(var(--radius-md),10px)] transition-colors outline-none focus-visible:ring-3",
                selected
                  ? "bg-card text-foreground shadow-card"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="size-3.5" aria-hidden />
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function DirectionPreferencesSection({
  value,
  onChange,
}: {
  value: DirectionPreferences;
  onChange: (next: DirectionPreferences) => void;
}) {
  const t = useTranslations();

  return (
    <div className="border-border flex flex-col gap-3 border-t pt-6">
      <div className="flex flex-col gap-0.5">
        <p className="text-sm font-medium">{t.profile.directions.title}</p>
        <p className="text-muted-foreground text-xs">
          {t.profile.directions.hint}
        </p>
      </div>
      <div className="grid gap-x-8 gap-y-2 sm:grid-cols-2">
        {METRICS.map((metric) => (
          <DirectionControl
            key={metric}
            metric={metric}
            value={value[metric]}
            onChange={(direction) =>
              onChange({ ...value, [metric]: direction })
            }
          />
        ))}
      </div>
    </div>
  );
}
