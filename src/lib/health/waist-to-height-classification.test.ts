import assert from "node:assert/strict";
import { test } from "node:test";
import {
  WAIST_TO_HEIGHT_BANDS,
  classifyWaistToHeightRatio,
} from "./waist-to-height-classification.ts";

test("classifies each band", () => {
  assert.equal(classifyWaistToHeightRatio(0.35), "LOW");
  assert.equal(classifyWaistToHeightRatio(0.45), "HEALTHY");
  assert.equal(classifyWaistToHeightRatio(0.55), "INCREASED");
  assert.equal(classifyWaistToHeightRatio(0.72), "HIGH");
});

test("a boundary belongs to the band above", () => {
  assert.equal(classifyWaistToHeightRatio(0.4), "HEALTHY");
  assert.equal(classifyWaistToHeightRatio(0.5), "INCREASED");
  assert.equal(classifyWaistToHeightRatio(0.6), "HIGH");
  assert.equal(classifyWaistToHeightRatio(0.3999), "LOW");
  assert.equal(classifyWaistToHeightRatio(0.4999), "HEALTHY");
  assert.equal(classifyWaistToHeightRatio(0.5999), "INCREASED");
});

test("no valid ratio has no classification", () => {
  assert.equal(classifyWaistToHeightRatio(null), null);
  assert.equal(classifyWaistToHeightRatio(undefined), null);
  assert.equal(classifyWaistToHeightRatio(0), null);
  assert.equal(classifyWaistToHeightRatio(Number.NaN), null);
});

test("the bands are contiguous", () => {
  for (let index = 1; index < WAIST_TO_HEIGHT_BANDS.length; index += 1) {
    assert.equal(
      WAIST_TO_HEIGHT_BANDS[index]?.min,
      WAIST_TO_HEIGHT_BANDS[index - 1]?.max,
    );
  }
});
