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
 * The derived metrics are not stored fields, so they are not in the field
 * catalogue; they are named here so callers can treat every metric alike.
 */
export function metricLabel(t: Dictionary, metric: Metric): string {
  if (metric === "bmi") {
    return t.measurements.bmi;
  }
  if (metric === "waistToHeightRatio") {
    return t.measurements.waistToHeightRatio;
  }
  return t.measurements.fields[metric];
}

/**
 * How to take a field's measurement consistently, for the fields that have
 * such guidance. Null for the rest.
 */
export function measurementFieldHelp(
  t: Dictionary,
  field: MeasurementValueField,
): string | null {
  return field === "abdominalCircumferenceCm"
    ? t.measurements.abdominalCircumferenceHelp
    : null;
}
