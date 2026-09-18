import assert from "node:assert/strict";
import { test } from "node:test";
import { calculateBmi, roundBmi } from "./bmi.ts";

/** BMI to a few decimals, which is all a comparison needs to be meaningful. */
function approx(actual: number | null, expected: number): void {
  assert.notEqual(actual, null);
  assert.ok(
    Math.abs((actual as number) - expected) < 1e-9,
    `expected ${actual} to be about ${expected}`,
  );
}

test("computes a normal BMI", () => {
  // 70 / 1.75^2 = 22.857...
  approx(calculateBmi(70, 175), 70 / 1.75 ** 2);
  approx(calculateBmi(70, 175), 22.857142857142858);
});

test("BMI of exactly 25 at the reference weight", () => {
  // 1.80 m and 81 kg is exactly 25.
  approx(calculateBmi(81, 180), 25);
});

test("handles decimal weights and heights", () => {
  approx(calculateBmi(62.35, 167.5), 62.35 / 1.675 ** 2);
  approx(calculateBmi(0.5, 50), 2);
});

test("does not round the result", () => {
  const bmi = calculateBmi(70, 175);
  assert.notEqual(bmi, 22.9);
  assert.equal(roundBmi(bmi), 22.9);
});

test("returns null for missing values", () => {
  assert.equal(calculateBmi(null, 175), null);
  assert.equal(calculateBmi(70, null), null);
  assert.equal(calculateBmi(undefined, undefined), null);
});

test("returns null for zero, negative and non-finite values", () => {
  assert.equal(calculateBmi(0, 175), null);
  assert.equal(calculateBmi(70, 0), null);
  assert.equal(calculateBmi(-70, 175), null);
  assert.equal(calculateBmi(70, -175), null);
  assert.equal(calculateBmi(Number.NaN, 175), null);
  assert.equal(calculateBmi(70, Number.POSITIVE_INFINITY), null);
});

test("rounds for display, and passes null through", () => {
  assert.equal(roundBmi(22.849999), 22.8);
  assert.equal(roundBmi(22.86), 22.9);
  assert.equal(roundBmi(22.857142857, 2), 22.86);
  assert.equal(roundBmi(null), null);
});
