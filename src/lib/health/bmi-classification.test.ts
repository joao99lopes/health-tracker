import assert from "node:assert/strict";
import { test } from "node:test";
import {
  BMI_ADULT_MIN_AGE_YEARS,
  BMI_BANDS,
  classifyBmi,
  isAdultBmiApplicable,
} from "./bmi-classification.ts";

test("classifies a value inside each band", () => {
  assert.equal(classifyBmi(17), "UNDERWEIGHT");
  assert.equal(classifyBmi(22), "NORMAL");
  assert.equal(classifyBmi(27.5), "PRE_OBESE");
  assert.equal(classifyBmi(32), "OBESE_I");
  assert.equal(classifyBmi(37.2), "OBESE_II");
  assert.equal(classifyBmi(45), "OBESE_III");
});

test("boundaries belong to the band above", () => {
  assert.equal(classifyBmi(18.49), "UNDERWEIGHT");
  assert.equal(classifyBmi(18.5), "NORMAL");
  assert.equal(classifyBmi(24.99), "NORMAL");
  assert.equal(classifyBmi(25), "PRE_OBESE");
  assert.equal(classifyBmi(29.99), "PRE_OBESE");
  assert.equal(classifyBmi(30), "OBESE_I");
  assert.equal(classifyBmi(34.99), "OBESE_I");
  assert.equal(classifyBmi(35), "OBESE_II");
  assert.equal(classifyBmi(39.99), "OBESE_II");
  assert.equal(classifyBmi(40), "OBESE_III");
});

test("the top band is open-ended", () => {
  assert.equal(classifyBmi(120), "OBESE_III");
});

test("returns null when there is nothing to classify", () => {
  assert.equal(classifyBmi(null), null);
  assert.equal(classifyBmi(undefined), null);
  assert.equal(classifyBmi(0), null);
  assert.equal(classifyBmi(-5), null);
  assert.equal(classifyBmi(Number.NaN), null);
  assert.equal(classifyBmi(Number.POSITIVE_INFINITY), null);
});

test("the bands are contiguous and ascending", () => {
  BMI_BANDS.forEach((band, index) => {
    const next = BMI_BANDS[index + 1];
    if (next) {
      assert.equal(band.max, next.min, `${band.category} must meet ${next.category}`);
    } else {
      assert.equal(band.max, null, "the last band must be open-ended");
    }
  });
});

test("the adult thresholds need an adult age", () => {
  assert.equal(isAdultBmiApplicable(BMI_ADULT_MIN_AGE_YEARS), true);
  assert.equal(isAdultBmiApplicable(BMI_ADULT_MIN_AGE_YEARS - 1), false);
  assert.equal(isAdultBmiApplicable(null), false);
});
