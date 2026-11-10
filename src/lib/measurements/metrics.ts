import { BMI_DISPLAY_DECIMALS, calculateBmi } from "../health/bmi.ts";
import {
  WAIST_TO_HEIGHT_DISPLAY_DECIMALS,
  calculateWaistToHeightRatio,
} from "../health/waist-to-height.ts";
import {
  MEASUREMENT_FIELD_SPECS,
  MEASUREMENT_VALUE_FIELDS,
  type MeasurementValues,
} from "./fields.ts";

/**
 * The metrics a measurement can be read as: the stored value fields plus BMI
 * and the waist-to-height ratio, which are derived on the way out and never
 * stored.
 *
 * Defined once so charts, comparisons and any future summary agree on what can
 * be plotted and compared.
 *
 * This module is pure: no Prisma, no React, no environment access.
 */

/** A measurement reduced to what the calculation layer needs. */
export type MeasurementSnapshot = MeasurementValues & {
  measuredAt: Date;
  /**
   * The height recorded with this measurement. BMI and the waist-to-height
   * ratio use this, never the
   * profile's current height, so history does not move when the user grows or
   * corrects their height.
   */
  heightCmAtMeasurement: number;
};

export const DERIVED_METRICS = ["bmi", "waistToHeightRatio"] as const;

export const METRICS = [...MEASUREMENT_VALUE_FIELDS, ...DERIVED_METRICS] as const;

export type Metric = (typeof METRICS)[number];

export function isMetric(value: string): value is Metric {
  return (METRICS as readonly string[]).includes(value);
}

/** How a metric's numbers are written: its unit and its displayed decimals. */
export type MetricDisplay = {
  unit: "kg" | "%" | "cm" | "none";
  decimals: number;
};

/**
 * The unit and precision of any metric, including the derived BMI and
 * waist-to-height ratio, which have no stored field and so no spec of their
 * own. Everything that prints a metric or decides whether it changed reads
 * this, so "changed" always means "changed at the precision shown".
 */
export function metricDisplay(metric: Metric): MetricDisplay {
  if (metric === "bmi") {
    return { unit: "none", decimals: BMI_DISPLAY_DECIMALS };
  }
  if (metric === "waistToHeightRatio") {
    return { unit: "none", decimals: WAIST_TO_HEIGHT_DISPLAY_DECIMALS };
  }
  const spec = MEASUREMENT_FIELD_SPECS[metric];
  return { unit: spec.unit, decimals: spec.decimals };
}

/** `value` rounded to the precision the metric is displayed at. */
export function roundForDisplay(metric: Metric, value: number): number {
  const rounded = Number(value.toFixed(metricDisplay(metric).decimals));
  // `-0` would print as "-0.0" in some locales; it is simply zero.
  return rounded === 0 ? 0 : rounded;
}

/**
 * One metric of one measurement, or null when it was not recorded (or, for
 * a derived metric, cannot be derived because an input is missing).
 */
export function metricValue(
  snapshot: MeasurementSnapshot,
  metric: Metric,
): number | null {
  if (metric === "bmi") {
    return calculateBmi(snapshot.weightKg, snapshot.heightCmAtMeasurement);
  }
  if (metric === "waistToHeightRatio") {
    return calculateWaistToHeightRatio(
      snapshot.abdominalCircumferenceCm,
      snapshot.heightCmAtMeasurement,
    );
  }
  const value = snapshot[metric];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

/** Ascending by `measuredAt`; the input is never mutated. */
export function sortByMeasuredAt<T extends { measuredAt: Date }>(
  items: readonly T[],
): T[] {
  return [...items].sort(
    (a, b) => a.measuredAt.getTime() - b.measuredAt.getTime(),
  );
}
