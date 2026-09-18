import assert from "node:assert/strict";
import { test } from "node:test";
import { ageInYears } from "./age.ts";

const ON = new Date("2026-09-18T10:00:00.000Z");

test("counts completed years", () => {
  assert.equal(ageInYears("1990-05-04", ON), 36);
  assert.equal(ageInYears("2000-09-18", ON), 26);
});

test("the birthday itself counts, the day before does not", () => {
  const on = new Date("2026-05-04T00:00:00.000Z");
  assert.equal(ageInYears("1990-05-04", on), 36);
  assert.equal(ageInYears("1990-05-05", on), 35);
});

test("a later month in the same year has not happened yet", () => {
  assert.equal(ageInYears("1990-12-31", ON), 35);
  assert.equal(ageInYears("1990-01-01", ON), 36);
});

test("29 February completes a year on 1 March in a non-leap year", () => {
  assert.equal(ageInYears("2000-02-29", new Date("2027-02-28T12:00:00.000Z")), 26);
  assert.equal(ageInYears("2000-02-29", new Date("2027-03-01T12:00:00.000Z")), 27);
  assert.equal(ageInYears("2000-02-29", new Date("2028-02-29T12:00:00.000Z")), 28);
});

test("age is zero in the first year of life", () => {
  assert.equal(ageInYears("2026-01-02", ON), 0);
  assert.equal(ageInYears("2026-09-18", ON), 0);
});

test("the time of day does not matter", () => {
  assert.equal(ageInYears("1990-09-18", new Date("2026-09-18T00:00:00.000Z")), 36);
  assert.equal(ageInYears("1990-09-18", new Date("2026-09-18T23:59:59.999Z")), 36);
});

test("returns null for a missing, malformed or impossible date", () => {
  assert.equal(ageInYears(null, ON), null);
  assert.equal(ageInYears(undefined, ON), null);
  assert.equal(ageInYears("", ON), null);
  assert.equal(ageInYears("04-05-1990", ON), null);
  assert.equal(ageInYears("1990-13-01", ON), null);
  assert.equal(ageInYears("2025-02-31", ON), null);
});

test("returns null for a date of birth in the future", () => {
  assert.equal(ageInYears("2026-09-19", ON), null);
  assert.equal(ageInYears("2030-01-01", ON), null);
});

test("returns null when the instant is invalid", () => {
  assert.equal(ageInYears("1990-05-04", new Date("nonsense")), null);
});
