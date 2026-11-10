import assert from "node:assert/strict";
import { test } from "node:test";
import type { SeriesPoint } from "./series.ts";
import { summarizeSeries } from "./stats.ts";

const DAY = 24 * 60 * 60 * 1000;
const START = Date.UTC(2026, 9, 1, 8);

function point(day: number, value: number): SeriesPoint {
  const time = START + day * DAY;
  return { time, measuredAt: new Date(time), value };
}

test("no readings, no summary", () => {
  assert.equal(summarizeSeries([]), null);
});

test("count, min, max and mean describe the readings", () => {
  const summary = summarizeSeries([point(0, 80), point(3, 79), point(6, 81)]);
  assert.deepEqual(
    summary && { ...summary, weeklyTrend: undefined },
    { count: 3, min: 79, max: 81, mean: 80, weeklyTrend: undefined },
  );
});

test("a steady fall of 0.5 kg a week reads as -0.5 per week", () => {
  const points = [0, 7, 14, 21, 28].map((day, index) => point(day, 80 - index * 0.5));
  const trend = summarizeSeries(points)?.weeklyTrend ?? null;
  assert.ok(trend !== null && Math.abs(trend + 0.5) < 1e-9, String(trend));
});

test("one odd reading at the end does not decide the trend", () => {
  // Flat for four weeks, then one heavy reading.
  const points = [0, 7, 14, 21, 28].map((day) => point(day, 80));
  points.push(point(29, 82));
  const trend = summarizeSeries(points)?.weeklyTrend ?? 0;
  // "Last minus first" would say 2 kg over 29 days, about 0.48/week.
  assert.ok(trend < 0.4, String(trend));
});

test("readings less than a week apart give no weekly trend", () => {
  assert.equal(summarizeSeries([point(0, 80), point(3, 79)])?.weeklyTrend, null);
  assert.equal(summarizeSeries([point(0, 80)])?.weeklyTrend, null);
});
