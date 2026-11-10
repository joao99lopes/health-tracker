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

/**
 * Which fields the form shows straight away; the rest wait behind "More
 * values".
 *
 * A person with a basic scale records a weight and nothing else, and seven
 * empty boxes stand between them and the save button. So the form leads with
 * the fields this user actually records (`recorded`: a field with a recent
 * value) plus any field that already holds something, such as one being
 * edited. Someone who has recorded nothing yet sees everything - there is no
 * habit to go by, and hiding a field would hide that it exists.
 *
 * Order is always the canonical field order, so a field never jumps around.
 */
export function primaryFields(
  recorded: Readonly<Record<MeasurementValueField, number | null>>,
  values: Readonly<MeasurementFormValues>,
): MeasurementValueField[] {
  const anyRecorded = MEASUREMENT_VALUE_FIELDS.some(
    (field) => recorded[field] !== null,
  );
  if (!anyRecorded) {
    return [...MEASUREMENT_VALUE_FIELDS];
  }
  return MEASUREMENT_VALUE_FIELDS.filter(
    (field) => recorded[field] !== null || values[field].trim() !== "",
  );
}
