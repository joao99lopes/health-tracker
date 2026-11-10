import { BMI_DISPLAY_DECIMALS } from "@/lib/health/bmi";
import { WAIST_TO_HEIGHT_DISPLAY_DECIMALS } from "@/lib/health/waist-to-height";
import type { Language } from "@/lib/i18n/languages";
import {
  MEASUREMENT_FIELD_SPECS,
  type MeasurementValueField,
} from "@/lib/measurements/fields";
import { metricDisplay, type Metric } from "@/lib/measurements/metrics";

/**
 * Presentation of measurement values and instants.
 *
 * Every function takes the language explicitly rather than reading a locale
 * from the environment: the same string then comes out on the server and in
 * the browser, so a decimal comma does not turn into a decimal point at
 * hydration.
 *
 * Instants take the same care one step further. The reader's time zone is
 * known only in the browser, so the zone is a parameter: callers pin it to
 * UTC for the render the server and the hydration pass share, and let it
 * default to the reader's afterwards. See `useHydrated`.
 */

const UNIT_SUFFIX: Record<string, string> = {
  kg: " kg",
  "%": "%",
  cm: " cm",
  none: "",
};

/** A stored value as a number in the reader's language, without its unit. */
export function formatMeasurementNumber(
  field: MeasurementValueField,
  value: number,
  language: Language,
): string {
  const spec = MEASUREMENT_FIELD_SPECS[field];
  return new Intl.NumberFormat(language, {
    minimumFractionDigits: spec.decimals,
    maximumFractionDigits: spec.decimals,
  }).format(value);
}

/** A stored value with its unit, or null when it was not measured. */
export function formatMeasurementValue(
  field: MeasurementValueField,
  value: number | null | undefined,
  language: Language,
): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  const spec = MEASUREMENT_FIELD_SPECS[field];
  return `${formatMeasurementNumber(field, value, language)}${UNIT_SUFFIX[spec.unit] ?? ""}`;
}

/** A derived BMI, or null when there is none to show. */
export function formatBmi(
  bmi: number | null,
  language: Language,
): string | null {
  if (bmi === null) {
    return null;
  }
  return new Intl.NumberFormat(language, {
    minimumFractionDigits: BMI_DISPLAY_DECIMALS,
    maximumFractionDigits: BMI_DISPLAY_DECIMALS,
  }).format(bmi);
}

/** A derived waist-to-height ratio, or null when there is none to show. */
export function formatWaistToHeightRatio(
  ratio: number | null,
  language: Language,
): string | null {
  if (ratio === null) {
    return null;
  }
  return new Intl.NumberFormat(language, {
    minimumFractionDigits: WAIST_TO_HEIGHT_DISPLAY_DECIMALS,
    maximumFractionDigits: WAIST_TO_HEIGHT_DISPLAY_DECIMALS,
  }).format(ratio);
}

/** Height as it was recorded with a measurement. */
export function formatHeightCm(value: number, language: Language): string {
  return `${new Intl.NumberFormat(language, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value)} cm`;
}

/** Date and time, in `timeZone` or the reader's own. */
export function formatDateTime(
  date: Date,
  language: Language,
  timeZone?: string,
): string {
  return new Intl.DateTimeFormat(language, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone,
  }).format(date);
}

/** Date only, for compact lists. */
export function formatDate(
  date: Date,
  language: Language,
  timeZone?: string,
): string {
  return new Intl.DateTimeFormat(language, {
    dateStyle: "medium",
    timeZone,
  }).format(date);
}

/** A metric value as a number, without its unit - for a chart axis. */
export function formatMetricNumber(
  metric: Metric,
  value: number,
  language: Language,
): string {
  const { decimals } = metricDisplay(metric);
  return new Intl.NumberFormat(language, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

/** A metric value with its unit. */
export function formatMetricValue(
  metric: Metric,
  value: number,
  language: Language,
): string {
  const { unit } = metricDisplay(metric);
  return `${formatMetricNumber(metric, value, language)}${UNIT_SUFFIX[unit] ?? ""}`;
}

/**
 * A change in a metric, always carrying its sign so a rise and a fall cannot
 * be confused. The sign is a direction, not a verdict.
 *
 * A change in a percentage is a difference of percentage *points*, written
 * with `pointsUnit` ("pp", "p.p."): body fat going from 24.3% to 21.1% is
 * -3.2 pp, and the relative change printed beside it is -13.2%. Two numbers
 * both ending in "%" would leave the reader to guess which is which.
 */
export function formatMetricDelta(
  metric: Metric,
  delta: number,
  language: Language,
  pointsUnit: string,
): string {
  const { unit, decimals } = metricDisplay(metric);
  const number = new Intl.NumberFormat(language, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
    signDisplay: "exceptZero",
  }).format(delta);
  const suffix = unit === "%" ? ` ${pointsUnit}` : (UNIT_SUFFIX[unit] ?? "");
  return `${number}${suffix}`;
}

/** A relative change, or null when there is none defined (a division by zero). */
export function formatPercentChange(
  percent: number | null,
  language: Language,
): string | null {
  if (percent === null) {
    return null;
  }
  return new Intl.NumberFormat(language, {
    style: "percent",
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
    signDisplay: "exceptZero",
  }).format(percent / 100);
}

/**
 * A compact date for a chart axis, where there is room for a few characters
 * and no more. Long periods carry the year, short ones would only repeat it.
 */
export function formatAxisDate(
  date: Date,
  language: Language,
  withYear: boolean,
): string {
  return new Intl.DateTimeFormat(language, {
    day: withYear ? undefined : "numeric",
    month: "short",
    year: withYear ? "2-digit" : undefined,
  }).format(date);
}
