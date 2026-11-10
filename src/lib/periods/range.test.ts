import assert from "node:assert/strict";
import { test } from "node:test";
import { isDay, parseDateRange, rangeBounds } from "./range.ts";

test("only real calendar days are days", () => {
  assert.equal(isDay("2026-08-31"), true);
  assert.equal(isDay("2024-02-29"), true);
  assert.equal(isDay("2026-02-29"), false);
  assert.equal(isDay("2026-13-01"), false);
  assert.equal(isDay("2026-8-1"), false);
  assert.equal(isDay("yesterday"), false);
});

test("a range needs both ends, in order", () => {
  assert.deepEqual(parseDateRange("2026-08-01", "2026-08-31"), {
    from: "2026-08-01",
    to: "2026-08-31",
  });
  assert.deepEqual(parseDateRange("2026-08-01", "2026-08-01"), {
    from: "2026-08-01",
    to: "2026-08-01",
  });
  assert.equal(parseDateRange("2026-08-31", "2026-08-01"), null);
  assert.equal(parseDateRange("2026-08-01", undefined), null);
  assert.equal(parseDateRange(undefined, "2026-08-01"), null);
  assert.equal(parseDateRange("2026-08-01", "nope"), null);
});

test("bounds run from the first day's start to the day after the last", () => {
  const { start, end } = rangeBounds({ from: "2026-08-01", to: "2026-08-31" }, "utc");
  assert.equal(start.toISOString(), "2026-08-01T00:00:00.000Z");
  assert.equal(end.toISOString(), "2026-09-01T00:00:00.000Z");
});

test("a one-day range covers that whole day, across a month end", () => {
  const { start, end } = rangeBounds({ from: "2026-12-31", to: "2026-12-31" }, "utc");
  assert.equal(start.toISOString(), "2026-12-31T00:00:00.000Z");
  assert.equal(end.toISOString(), "2027-01-01T00:00:00.000Z");
});
