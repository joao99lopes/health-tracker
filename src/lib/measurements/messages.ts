import type { Dictionary } from "@/lib/i18n/dictionary";
import {
  MEASUREMENT_FIELD_SPECS,
  type MeasurementValueField,
} from "@/lib/measurements/fields";
import type { Metric } from "@/lib/measurements/metrics";
import type { MeasurementIssue } from "@/lib/measurements/validation";

/**
 * Validation codes rendered in the current language.
 *
 * Kept out of the form so no user-facing string lives in JSX, and so the
 * bounds quoted in a message can only come from the module that enforces
 * them.
 */
export function measurementIssueMessage(
  t: Dictionary,
  issue: MeasurementIssue,
): string {
  const messages = t.measurements.issues;
  switch (issue.code) {
    case "VALUE_OUT_OF_RANGE": {
      const spec = MEASUREMENT_FIELD_SPECS[issue.field as MeasurementValueField];
      return messages.VALUE_OUT_OF_RANGE(spec.min, spec.max);
    }
    default:
      return messages[issue.code];
  }
}

/**
 * A metric's name in the current language.
 *
 * BMI is not a stored field, so it is not in the field catalogue; it is named
 * here so callers can treat every metric alike.
 */
export function metricLabel(t: Dictionary, metric: Metric): string {
  return metric === "bmi"
    ? t.measurements.bmi
    : t.measurements.fields[metric];
}
