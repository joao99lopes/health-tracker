import { calculateBmi } from "../health/bmi.ts";
import {
  MEASUREMENT_VALUE_FIELDS,
  type MeasurementValues,
} from "./fields.ts";

/**
 * The metrics a measurement can be read as: the stored value fields plus BMI,
 * which is derived on the way out and never stored.
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
   * The height recorded with this measurement. BMI uses this, never the
   * profile's current height, so history does not move when the user grows or
   * corrects their height.
   */
  heightCmAtMeasurement: number;
};

export const DERIVED_METRICS = ["bmi"] as const;

export const METRICS = [...MEASUREMENT_VALUE_FIELDS, ...DERIVED_METRICS] as const;

export type Metric = (typeof METRICS)[number];

export function isMetric(value: string): value is Metric {
  return (METRICS as readonly string[]).includes(value);
}

/**
 * One metric of one measurement, or null when it was not recorded (or, for
 * BMI, cannot be derived because there is no weight).
 */
export function metricValue(
  snapshot: MeasurementSnapshot,
  metric: Metric,
): number | null {
  if (metric === "bmi") {
    return calculateBmi(snapshot.weightKg, snapshot.heightCmAtMeasurement);
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
