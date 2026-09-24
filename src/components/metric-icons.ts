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
