import assert from "node:assert/strict";
import { test } from "node:test";
import {
  MeasurementValidationError,
  assertAtLeastOneValue,
  hasAtLeastOneValue,
  parseMeasurementInput,
  suppliedValueFields,
  type MeasurementInput,
  type MeasurementIssue,
} from "./validation.ts";
import { NOTE_MAX_LENGTH } from "./fields.ts";

test("rejects a measurement with no values", () => {
  assert.equal(hasAtLeastOneValue({}), false);
});

test("rejects a measurement whose values are all null or undefined", () => {
  assert.equal(
    hasAtLeastOneValue({ weightKg: null, bodyFatPercent: undefined }),
    false,
  );
});

test("accepts a measurement with a single value", () => {
  assert.equal(hasAtLeastOneValue({ weightKg: 81.4 }), true);
});

test("accepts zero as a supplied value", () => {
  // 0 is falsy but a legitimate reading - a truthiness check would drop it.
  assert.equal(hasAtLeastOneValue({ visceralFat: 0 }), true);
});

test("reports which fields were supplied", () => {
  assert.deepEqual(
    suppliedValueFields({ weightKg: 81.4, musclePercent: null, visceralFat: 7 }),
    ["weightKg", "visceralFat"],
  );
});

test("assertAtLeastOneValue throws NO_VALUES on an empty measurement", () => {
  assert.throws(
    () => assertAtLeastOneValue({}),
    (error: unknown) =>
      error instanceof MeasurementValidationError && error.code === "NO_VALUES",
  );
});

test("assertAtLeastOneValue passes a measurement with a value", () => {
  assert.doesNotThrow(() => assertAtLeastOneValue({ boneMassKg: 3.2 }));
});

// ---------------------------------------------------------------------------
// parseMeasurementInput
// ---------------------------------------------------------------------------

const NOW = new Date("2026-09-18T12:00:00.000Z");

/** A blank submission; each test overrides only what it is about. */
function input(overrides: Partial<MeasurementInput> = {}): MeasurementInput {
  return {
    measuredAt: "2026-09-18T08:30:00.000Z",
    weightKg: "",
    bodyFatPercent: "",
    hydrationPercent: "",
    musclePercent: "",
    boneMassKg: "",
    visceralFat: "",
    abdominalCircumferenceCm: "",
    ...overrides,
  };
}

function codes(result: { issues: readonly MeasurementIssue[] }): string[] {
  return result.issues.map((issue) => `${issue.field}:${issue.code}`);
}

test("parses a measurement with a single value", () => {
  const result = parseMeasurementInput(input({ weightKg: "81.45" }), NOW);
  assert.deepEqual(result.issues, []);
  assert.equal(result.measurement?.values.weightKg, 81.45);
  assert.equal(result.measurement?.values.bodyFatPercent, null);
  assert.equal(
    result.measurement?.measuredAt.toISOString(),
    "2026-09-18T08:30:00.000Z",
  );
});

test("rejects a submission with a date but no values", () => {
  assert.deepEqual(codes(parseMeasurementInput(input(), NOW)), [
    "form:NO_VALUES",
  ]);
});

test("accepts a comma as the decimal separator", () => {
  const result = parseMeasurementInput(input({ boneMassKg: "3,25" }), NOW);
  assert.equal(result.measurement?.values.boneMassKg, 3.25);
});

test("rounds a value to the precision its column stores", () => {
  const result = parseMeasurementInput(input({ weightKg: "81.456" }), NOW);
  assert.equal(result.measurement?.values.weightKg, 81.46);
});

test("rounds an integer field rather than accepting a fraction", () => {
  const result = parseMeasurementInput(input({ visceralFat: "7.4" }), NOW);
  assert.equal(result.measurement?.values.visceralFat, 7);
});

test("rejects a value that is not a number", () => {
  assert.deepEqual(codes(parseMeasurementInput(input({ weightKg: "heavy" }), NOW)), [
    "weightKg:VALUE_INVALID",
  ]);
});

test("rejects a value outside its plausible range", () => {
  assert.deepEqual(
    codes(parseMeasurementInput(input({ bodyFatPercent: "120" }), NOW)),
    ["bodyFatPercent:VALUE_OUT_OF_RANGE"],
  );
});

test("reports a bad value rather than also reporting no values", () => {
  // The user did supply a value; calling it missing as well would be wrong.
  assert.deepEqual(codes(parseMeasurementInput(input({ weightKg: "x" }), NOW)), [
    "weightKg:VALUE_INVALID",
  ]);
});

test("reports every bad value at once", () => {
  assert.deepEqual(
    codes(
      parseMeasurementInput(
        input({ weightKg: "x", visceralFat: "900" }),
        NOW,
      ),
    ),
    ["weightKg:VALUE_INVALID", "visceralFat:VALUE_OUT_OF_RANGE"],
  );
});

test("requires a date", () => {
  assert.deepEqual(
    codes(parseMeasurementInput(input({ measuredAt: "", weightKg: "80" }), NOW)),
    ["measuredAt:MEASURED_AT_REQUIRED"],
  );
});

test("rejects a date that does not say which offset it is in", () => {
  // A wall-clock string would mean different instants in the browser and in
  // the server's container.
  assert.deepEqual(
    codes(
      parseMeasurementInput(
        input({ measuredAt: "2026-09-18T08:30", weightKg: "80" }),
        NOW,
      ),
    ),
    ["measuredAt:MEASURED_AT_INVALID"],
  );
});

test("accepts a date carrying an explicit offset", () => {
  const result = parseMeasurementInput(
    input({ measuredAt: "2026-09-18T09:30:00.000+01:00", weightKg: "80" }),
    NOW,
  );
  assert.deepEqual(result.issues, []);
  assert.equal(
    result.measurement?.measuredAt.toISOString(),
    "2026-09-18T08:30:00.000Z",
  );
});

test("accepts a historical date", () => {
  const result = parseMeasurementInput(
    input({ measuredAt: "2019-04-02T07:15:00.000Z", weightKg: "80" }),
    NOW,
  );
  assert.deepEqual(result.issues, []);
});

test("rejects a date in the future", () => {
  assert.deepEqual(
    codes(
      parseMeasurementInput(
        input({ measuredAt: "2026-09-18T12:00:00.001Z", weightKg: "80" }),
        NOW,
      ),
    ),
    ["measuredAt:MEASURED_AT_IN_FUTURE"],
  );
});

test("rejects an implausibly old date", () => {
  assert.deepEqual(
    codes(
      parseMeasurementInput(
        input({ measuredAt: "1899-12-31T00:00:00.000Z", weightKg: "80" }),
        NOW,
      ),
    ),
    ["measuredAt:MEASURED_AT_TOO_OLD"],
  );
});

test("accepts zero for a field whose range allows it", () => {
  const result = parseMeasurementInput(input({ visceralFat: "0" }), NOW);
  assert.deepEqual(result.issues, []);
  assert.equal(result.measurement?.values.visceralFat, 0);
});

test("a measurement may hold only a waist circumference", () => {
  const result = parseMeasurementInput(
    input({ abdominalCircumferenceCm: "84,26" }),
    NOW,
  );
  assert.deepEqual(result.issues, []);
  assert.equal(result.measurement?.values.abdominalCircumferenceCm, 84.3);
  assert.equal(result.measurement?.values.weightKg, null);
});

test("weight and waist circumference are recorded together", () => {
  const result = parseMeasurementInput(
    input({ weightKg: "80", abdominalCircumferenceCm: "90" }),
    NOW,
  );
  assert.equal(result.measurement?.values.weightKg, 80);
  assert.equal(result.measurement?.values.abdominalCircumferenceCm, 90);
});

test("a measurement without a waist circumference leaves it null, not zero", () => {
  const result = parseMeasurementInput(input({ weightKg: "80" }), NOW);
  assert.equal(result.measurement?.values.abdominalCircumferenceCm, null);
});

test("an implausible waist circumference is rejected", () => {
  assert.deepEqual(
    codes(parseMeasurementInput(input({ abdominalCircumferenceCm: "5" }), NOW)),
    ["abdominalCircumferenceCm:VALUE_OUT_OF_RANGE"],
  );
});

// ---------------------------------------------------------------------------
// Notes
// ---------------------------------------------------------------------------

test("a measurement without a note parses with a null note", () => {
  const result = parseMeasurementInput(input({ weightKg: "80" }), NOW);
  assert.equal(result.measurement?.note, null);
});

test("a note is trimmed, and a blank one is stored as no note", () => {
  const trimmed = parseMeasurementInput(
    input({ weightKg: "80", note: "  after dinner \n" }),
    NOW,
  );
  assert.equal(trimmed.measurement?.note, "after dinner");

  const blank = parseMeasurementInput(input({ weightKg: "80", note: "   " }), NOW);
  assert.equal(blank.measurement?.note, null);
});

test("a note alone does not count as a measurement value", () => {
  assert.deepEqual(
    codes(parseMeasurementInput(input({ note: "only a note" }), NOW)),
    ["form:NO_VALUES"],
  );
});

test("a note at the limit is accepted and one past it is rejected", () => {
  const atLimit = parseMeasurementInput(
    input({ weightKg: "80", note: "x".repeat(NOTE_MAX_LENGTH) }),
    NOW,
  );
  assert.deepEqual(atLimit.issues, []);

  assert.deepEqual(
    codes(
      parseMeasurementInput(
        input({ weightKg: "80", note: "x".repeat(NOTE_MAX_LENGTH + 1) }),
        NOW,
      ),
    ),
    ["note:NOTE_TOO_LONG"],
  );
});
