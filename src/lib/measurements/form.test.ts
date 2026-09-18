import assert from "node:assert/strict";
import { test } from "node:test";
import { toLocalInputValue } from "./datetime.ts";
import {
  emptyFormValues,
  formValuesFrom,
  toMeasurementInput,
} from "./form.ts";
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
