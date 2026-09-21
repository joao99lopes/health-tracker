import assert from "node:assert/strict";
import { test } from "node:test";

import { METRICS } from "../measurements/metrics.ts";
import {
  DEFAULT_DIRECTION_PREFERENCES,
  changeTone,
  isMetricDirection,
} from "./direction.ts";

test("every metric defaults to no preference", () => {
  for (const metric of METRICS) {
    assert.equal(DEFAULT_DIRECTION_PREFERENCES[metric], "indifferent");
  }
});

test("only the three known values are preferences", () => {
  assert.ok(isMetricDirection("decrease"));
  assert.ok(isMetricDirection("indifferent"));
  assert.ok(isMetricDirection("increase"));
  assert.ok(!isMetricDirection("lower"));
  assert.ok(!isMetricDirection(""));
});

test("no preference leaves every change neutral", () => {
  assert.equal(changeTone("indifferent", "up"), "neutral");
  assert.equal(changeTone("indifferent", "down"), "neutral");
  assert.equal(changeTone("indifferent", "same"), "neutral");
});

test("a change with the preference is positive, against it negative", () => {
  assert.equal(changeTone("decrease", "down"), "positive");
  assert.equal(changeTone("decrease", "up"), "negative");
  assert.equal(changeTone("increase", "up"), "positive");
  assert.equal(changeTone("increase", "down"), "negative");
});

test("an unchanged value keeps the preference's own tone", () => {
  assert.equal(changeTone("decrease", "same"), "positive");
  assert.equal(changeTone("increase", "same"), "positive");
});
