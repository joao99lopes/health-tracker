import assert from "node:assert/strict";
import { test } from "node:test";
import {
  DEFAULT_DASHBOARD_VIEW,
  dashboardViewSearch,
  parseDashboardView,
} from "./view.ts";

test("an empty address is the default view, and the default is an empty address", () => {
  assert.deepEqual(parseDashboardView({}), DEFAULT_DASHBOARD_VIEW);
  assert.equal(dashboardViewSearch(DEFAULT_DASHBOARD_VIEW), "");
});

test("every part of the view round-trips through the address", () => {
  const view = {
    metric: "bodyFatPercent",
    period: "3m",
    average: 7,
    compare: "weightKg",
    comparePeriod: "1y",
  } as const;
  const params = Object.fromEntries(new URLSearchParams(dashboardViewSearch(view)));
  assert.deepEqual(parseDashboardView(params), view);
});

test("unknown values fall back to the defaults", () => {
  assert.deepEqual(
    parseDashboardView({ metric: "kcal", period: "5y", avg: "14", vs: "x", cmp: "" }),
    DEFAULT_DASHBOARD_VIEW,
  );
});

test("a metric is never compared with itself", () => {
  assert.equal(parseDashboardView({ metric: "bmi", vs: "bmi" }).compare, null);
  assert.equal(
    dashboardViewSearch({ ...DEFAULT_DASHBOARD_VIEW, compare: "weightKg" }),
    "",
  );
});
