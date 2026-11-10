import assert from "node:assert/strict";
import { test } from "node:test";
import { toLocalInputValue } from "./datetime.ts";
import {
  emptyFormValues,
  formValuesFrom,
  primaryFields,
  toMeasurementInput,
} from "./form.ts";
import {
  MEASUREMENT_VALUE_FIELDS,
  type MeasurementValueField,
} from "./fields.ts";
import { parseMeasurementInput } from "./validation.ts";

test("a blank form has no values", () => {
  const values = emptyFormValues();
  assert.equal(values.weightKg, "");
});

test("an existing measurement becomes editable text", () => {
  const values = formValuesFrom({
    weightKg: 81.4,
    bodyFatPercent: null,
    visceralFat: 7,
  });
  assert.equal(values.weightKg, "81.4");
  assert.equal(values.bodyFatPercent, "");
  assert.equal(values.visceralFat, "7");
});

test("form state converts to an instant validation accepts", () => {
  const measuredAt = new Date(2026, 8, 18, 8, 30);
  const input = toMeasurementInput(
    toLocalInputValue(measuredAt),
    formValuesFrom({ weightKg: 81.4 }),
  );
  const result = parseMeasurementInput(input, new Date(2026, 8, 18, 12, 0));
  assert.deepEqual(result.issues, []);
  assert.equal(result.measurement?.measuredAt.getTime(), measuredAt.getTime());
  assert.equal(result.measurement?.values.weightKg, 81.4);
});

test("an unreadable date reaches validation unchanged, and is rejected", () => {
  const input = toMeasurementInput("not a date", emptyFormValues());
  assert.equal(input.measuredAt, "not a date");
  assert.deepEqual(
    parseMeasurementInput(input).issues.map((issue) => issue.code),
    ["MEASURED_AT_INVALID", "NO_VALUES"],
  );
});

test("the note typed in the form reaches validation", () => {
  const input = toMeasurementInput(
    toLocalInputValue(new Date(2026, 8, 18, 8, 30)),
    formValuesFrom({ weightKg: 81.4 }),
    " fasted ",
  );
  const result = parseMeasurementInput(input, new Date(2026, 8, 18, 12, 0));
  assert.equal(result.measurement?.note, "fasted");
});

// --- which fields lead the form ------------------------------------------------

function recorded(
  values: Partial<Record<MeasurementValueField, number>>,
): Record<MeasurementValueField, number | null> {
  const all = {} as Record<MeasurementValueField, number | null>;
  for (const field of MEASUREMENT_VALUE_FIELDS) {
    all[field] = values[field] ?? null;
  }
  return all;
}

test("with no history every field is shown", () => {
  assert.deepEqual(
    primaryFields(recorded({}), emptyFormValues()),
    [...MEASUREMENT_VALUE_FIELDS],
  );
});

test("the fields a user records lead, in canonical order", () => {
  assert.deepEqual(
    primaryFields(
      recorded({ abdominalCircumferenceCm: 91, weightKg: 79.6 }),
      emptyFormValues(),
    ),
    ["weightKg", "abdominalCircumferenceCm"],
  );
});

test("a field that already holds a value is never hidden", () => {
  const values = { ...emptyFormValues(), visceralFat: "9" };
  assert.deepEqual(
    primaryFields(recorded({ weightKg: 79.6 }), values),
    ["weightKg", "visceralFat"],
  );
});
