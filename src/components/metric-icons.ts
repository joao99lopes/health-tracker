import {
  BicepsFlexedIcon,
  BoneIcon,
  CalculatorIcon,
  ChartPieIcon,
  DropletsIcon,
  LayersIcon,
  RulerDimensionLineIcon,
  RulerIcon,
  WeightIcon,
  type LucideIcon,
} from "lucide-react";
import type { Metric } from "@/lib/measurements/metrics";

/**
 * The icon each metric is shown with.
 *
 * Decoration only: every place that uses one also prints the metric's name,
 * so the icons are hidden from screen readers.
 */
export const METRIC_ICONS: Record<Metric, LucideIcon> = {
  weightKg: WeightIcon,
  bodyFatPercent: ChartPieIcon,
  hydrationPercent: DropletsIcon,
  musclePercent: BicepsFlexedIcon,
  boneMassKg: BoneIcon,
  visceralFat: LayersIcon,
  abdominalCircumferenceCm: RulerIcon,
  bmi: CalculatorIcon,
  waistToHeightRatio: RulerDimensionLineIcon,
};

/**
 * The hue each metric's icon is tinted with, from the `--metric-*` tokens.
 *
 * Recognition only, like the icon itself: never the sole carrier of meaning,
 * and unrelated to whether a value is high or low.
 */
export const METRIC_COLORS: Record<Metric, string> = {
  weightKg: "var(--metric-weight)",
  bodyFatPercent: "var(--metric-body-fat)",
  hydrationPercent: "var(--metric-hydration)",
  musclePercent: "var(--metric-muscle)",
  boneMassKg: "var(--metric-bone)",
  visceralFat: "var(--metric-visceral)",
  abdominalCircumferenceCm: "var(--metric-abdominal)",
  bmi: "var(--metric-bmi)",
  waistToHeightRatio: "var(--metric-waist-height)",
};
