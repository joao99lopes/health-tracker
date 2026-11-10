import assert from "node:assert/strict";
import { test } from "node:test";
import {
  HISTORY_MAX_ROWS,
  HISTORY_PAGE_SIZE,
  groupByMonth,
  historyHref,
  parseHistoryQuery,
} from "./history.ts";

test("no parameters: everything, first page", () => {
  assert.deepEqual(parseHistoryQuery({}), {
    period: "all",
    limit: HISTORY_PAGE_SIZE,
  });
});

test("a known period and a row count are read", () => {
  assert.deepEqual(parseHistoryQuery({ period: "3m", show: "100" }), {
    period: "3m",
    limit: 100,
  });
});

test("a count is rounded up to whole pages and capped", () => {
  assert.equal(parseHistoryQuery({ show: "51" }).limit, 2 * HISTORY_PAGE_SIZE);
  assert.equal(parseHistoryQuery({ show: "999999" }).limit, HISTORY_MAX_ROWS);
});

test("unreadable parameters fall back to the defaults", () => {
  assert.deepEqual(parseHistoryQuery({ period: "5y", show: "-3" }), {
    period: "all",
    limit: HISTORY_PAGE_SIZE,
  });
  assert.equal(parseHistoryQuery({ show: "abc" }).limit, HISTORY_PAGE_SIZE);
  assert.equal(parseHistoryQuery({ period: ["1w", "1m"] }).period, "1w");
});

test("the address leaves defaults out and round-trips", () => {
  assert.equal(historyHref({ period: "all", limit: HISTORY_PAGE_SIZE }), "/measurements");
  const href = historyHref({ period: "6m", limit: 150 });
  assert.equal(href, "/measurements?period=6m&show=150");
  const params = new URLSearchParams(href.split("?")[1]);
  assert.deepEqual(
    parseHistoryQuery({
      period: params.get("period") ?? undefined,
      show: params.get("show") ?? undefined,
    }),
    { period: "6m", limit: 150 },
  );
});

test("months group consecutive items, newest first, in the given zone", () => {
  const items = [
    { measuredAt: new Date("2026-11-07T09:00:00Z") },
    { measuredAt: new Date("2026-11-01T09:00:00Z") },
    // 23:30 UTC on 31 October: still October in UTC...
    { measuredAt: new Date("2026-10-31T23:30:00Z") },
    { measuredAt: new Date("2026-10-02T09:00:00Z") },
  ];
  const utc = groupByMonth(items, "UTC");
  assert.deepEqual(
    utc.map((group) => [group.key, group.items.length]),
    [
      ["2026-11", 2],
      ["2026-10", 2],
    ],
  );
  // ...but in Madrid (UTC+1) it is November.
  const madrid = groupByMonth(items, "Europe/Madrid");
  assert.deepEqual(
    madrid.map((group) => [group.key, group.items.length]),
    [
      ["2026-11", 3],
      ["2026-10", 1],
    ],
  );
});
