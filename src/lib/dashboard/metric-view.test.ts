import assert from "node:assert/strict";
import { test } from "node:test";
import {
  DEFAULT_METRIC_VIEW,
  metricViewSearch,
  parseMetricView,
} from "./metric-view.ts";

test("an empty address is the default view, and the default is an empty address", () => {
  assert.deepEqual(parseMetricView({}), DEFAULT_METRIC_VIEW);
  assert.equal(metricViewSearch(DEFAULT_METRIC_VIEW), "");
});

test("a period and an average round-trip", () => {
  const view = parseMetricView({ period: "6m", avg: "30" });
  assert.deepEqual(view, { period: "6m", range: null, average: 30 });
  assert.equal(metricViewSearch(view), "period=6m&avg=30");
});

test("a readable range wins over the period and is written alone", () => {
  const view = parseMetricView({ period: "6m", from: "2026-08-01", to: "2026-08-31" });
  assert.deepEqual(view.range, { from: "2026-08-01", to: "2026-08-31" });
  assert.equal(metricViewSearch(view), "from=2026-08-01&to=2026-08-31");
});

test("anything unreadable falls back to the defaults", () => {
  assert.deepEqual(
    parseMetricView({ period: "5y", avg: "14", from: "2026-08-31", to: "2026-08-01" }),
    DEFAULT_METRIC_VIEW,
  );
  assert.deepEqual(parseMetricView({ period: ["3m", "6m"] }).period, "3m");
});
