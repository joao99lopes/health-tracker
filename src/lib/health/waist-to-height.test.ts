import assert from "node:assert/strict";
import { test } from "node:test";
import {
  calculateWaistToHeightRatio,
  roundWaistToHeightRatio,
} from "./waist-to-height.ts";

test("divides the waist by the height", () => {
  assert.equal(calculateWaistToHeightRatio(90, 180), 0.5);
  assert.equal(calculateWaistToHeightRatio(84.3, 175), 84.3 / 175);
});

test("does not round the result", () => {
  // 80 / 175 = 0.457142857...
  assert.equal(calculateWaistToHeightRatio(80, 175), 80 / 175);
});

test("no waist circumference means no ratio", () => {
  assert.equal(calculateWaistToHeightRatio(null, 175), null);
  assert.equal(calculateWaistToHeightRatio(undefined, 175), null);
});

test("no height means no ratio", () => {
  assert.equal(calculateWaistToHeightRatio(90, null), null);
  assert.equal(calculateWaistToHeightRatio(90, undefined), null);
});

test("zero, negative or non-finite inputs give no ratio rather than a number", () => {
  assert.equal(calculateWaistToHeightRatio(0, 175), null);
  assert.equal(calculateWaistToHeightRatio(90, 0), null);
  assert.equal(calculateWaistToHeightRatio(-90, 175), null);
  assert.equal(calculateWaistToHeightRatio(Number.NaN, 175), null);
  assert.equal(calculateWaistToHeightRatio(90, Number.POSITIVE_INFINITY), null);
});

test("rounds to two decimals for display", () => {
  assert.equal(roundWaistToHeightRatio(80 / 175), 0.46);
  assert.equal(roundWaistToHeightRatio(null), null);
});
