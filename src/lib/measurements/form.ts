import {
  MEASUREMENT_VALUE_FIELDS,
  type MeasurementValueField,
} from "./fields.ts";
import { fromLocalInputValue, toIsoInstant } from "./datetime.ts";
import type { MeasurementInput } from "./validation.ts";

/**
 * The shape the form holds while it is being edited, and the conversion to
 * what validation consumes.
 *
 * The difference between the two is `measuredAt`: the form holds the
 * wall-clock string an `<input type="datetime-local">` produces, while
 * validation and the server take an unambiguous ISO instant. The browser is
 * the only place that knows the user's offset, so the conversion belongs on
 * the way out of the form.
 *
 * This module is pure: no Prisma, no React, no environment access.
 */

/** Every value input, as typed. An empty string means "not measured". */
export type MeasurementFormValues = {
  [K in MeasurementValueField]: string;
};

/** A blank set of value inputs. */
export function emptyFormValues(): MeasurementFormValues {
  const values = {} as MeasurementFormValues;
  for (const field of MEASUREMENT_VALUE_FIELDS) {
    values[field] = "";
  }
  return values;
}

/** An existing measurement's values as text, ready to edit. */
export function formValuesFrom(
  measurement: Partial<Record<MeasurementValueField, number | null>>,
): MeasurementFormValues {
  const values = emptyFormValues();
  for (const field of MEASUREMENT_VALUE_FIELDS) {
    const value = measurement[field];
    values[field] = typeof value === "number" ? String(value) : "";
  }
  return values;
}

/**
 * What the form holds, as the input validation takes.
 *
 * A date this module cannot read is passed through untouched rather than
 * guessed at: it carries no offset, so the validator rejects it as invalid
 * instead of some other time zone being assumed for it.
 */
export function toMeasurementInput(
  measuredAt: string,
  values: MeasurementFormValues,
  note = "",
): MeasurementInput {
  const date = fromLocalInputValue(measuredAt);
  return {
    measuredAt: date === null ? measuredAt.trim() : toIsoInstant(date),
    note,
    ...values,
  };
}
