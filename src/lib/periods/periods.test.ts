import assert from "node:assert/strict";
import { test } from "node:test";
import {
  DEFAULT_PERIOD,
  PERIOD_KEYS,
  filterByPeriod,
  isPeriodKey,
  periodStart,
} from "./periods.ts";

const NOW = new Date("2026-09-18T12:00:00.000Z");

function at(iso: string) {
  return { measuredAt: new Date(iso) };
}

const dateOf = (item: { measuredAt: Date }) => item.measuredAt;

test("the period set is the one the product defines", () => {
  assert.deepEqual(
    [...PERIOD_KEYS],
    ["3d", "1w", "2w", "1m", "3m", "6m", "1y", "2y", "all"],
  );
  assert.ok(isPeriodKey(DEFAULT_PERIOD));
  assert.equal(isPeriodKey("5y"), false);
});

test("day-based periods are exact spans", () => {
  assert.equal(
    periodStart("3d", NOW)?.toISOString(),
    "2026-09-15T12:00:00.000Z",
  );
  assert.equal(
    periodStart("1w", NOW)?.toISOString(),
    "2026-09-11T12:00:00.000Z",
  );
  assert.equal(
    periodStart("2w", NOW)?.toISOString(),
    "2026-09-04T12:00:00.000Z",
  );
});

test("month and year periods are calendar arithmetic", () => {
  assert.equal(
    periodStart("1m", NOW)?.toISOString(),
    "2026-08-18T12:00:00.000Z",
  );
  assert.equal(
    periodStart("3m", NOW)?.toISOString(),
    "2026-06-18T12:00:00.000Z",
  );
  assert.equal(
    periodStart("6m", NOW)?.toISOString(),
    "2026-03-18T12:00:00.000Z",
  );
  assert.equal(
    periodStart("1y", NOW)?.toISOString(),
    "2025-09-18T12:00:00.000Z",
  );
  assert.equal(
    periodStart("2y", NOW)?.toISOString(),
    "2024-09-18T12:00:00.000Z",
  );
});

test("a short target month clamps instead of rolling over", () => {
  // One month before 31 March is 28 February, not 3 March.
  assert.equal(
    periodStart("1m", new Date("2026-03-31T08:00:00.000Z"))?.toISOString(),
    "2026-02-28T08:00:00.000Z",
  );
  // 2028 is a leap year, so the same subtraction lands on the 29th.
  assert.equal(
    periodStart("1m", new Date("2028-03-31T08:00:00.000Z"))?.toISOString(),
    "2028-02-29T08:00:00.000Z",
  );
  // Crossing the year boundary keeps the right month.
  assert.equal(
    periodStart("3m", new Date("2026-01-31T00:00:00.000Z"))?.toISOString(),
    "2025-10-31T00:00:00.000Z",
  );
  assert.equal(
    periodStart("1y", new Date("2028-02-29T00:00:00.000Z"))?.toISOString(),
    "2027-02-28T00:00:00.000Z",
  );
});

test("all time has no lower bound", () => {
  assert.equal(periodStart("all", NOW), null);
});

test("filters to the items inside the period", () => {
  const items = [
    at("2024-01-01T00:00:00.000Z"),
    at("2026-08-01T00:00:00.000Z"),
    at("2026-09-16T00:00:00.000Z"),
    at("2026-09-18T11:00:00.000Z"),
  ];

  assert.deepEqual(filterByPeriod(items, "3d", dateOf, NOW), items.slice(2));
  assert.deepEqual(filterByPeriod(items, "1m", dateOf, NOW), items.slice(2));
  assert.deepEqual(filterByPeriod(items, "3m", dateOf, NOW), items.slice(1));
  assert.deepEqual(filterByPeriod(items, "all", dateOf, NOW), items);
});

test("the lower bound is inclusive", () => {
  const start = periodStart("1w", NOW) as Date;
  const items = [
    { measuredAt: new Date(start.getTime() - 1) },
    { measuredAt: new Date(start.getTime()) },
  ];
  assert.deepEqual(filterByPeriod(items, "1w", dateOf, NOW), [items[1]]);
});

test("future items are kept rather than hidden", () => {
  const items = [at("2027-01-01T00:00:00.000Z")];
  assert.deepEqual(filterByPeriod(items, "3d", dateOf, NOW), items);
});

test("invalid dates and empty input are handled", () => {
  assert.deepEqual(filterByPeriod([at("nonsense")], "1m", dateOf, NOW), []);
  assert.deepEqual(filterByPeriod([], "1m", dateOf, NOW), []);
});

test("filtering does not mutate or alias the input", () => {
  const items = [at("2026-09-17T00:00:00.000Z")];
  const result = filterByPeriod(items, "all", dateOf, NOW);
  assert.notEqual(result, items);
  assert.deepEqual(result, items);
});
