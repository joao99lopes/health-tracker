import assert from "node:assert/strict";
import { test } from "node:test";
import {
  fromLocalInputValue,
  toIsoInstant,
  toLocalInputValue,
} from "./datetime.ts";

// These run in whatever time zone the runner is in, so they assert on the
// round trip rather than on a fixed offset.

test("a local input value round-trips through an instant", () => {
  const value = "2026-09-18T08:30";
  const date = fromLocalInputValue(value);
  assert.notEqual(date, null);
  assert.equal(toLocalInputValue(date as Date), value);
});

test("an instant round-trips through a local input value", () => {
  const date = new Date(2019, 3, 2, 7, 15, 0, 0);
  assert.equal(
    fromLocalInputValue(toLocalInputValue(date))?.getTime(),
    date.getTime(),
  );
});

test("pads a single-digit month, day and hour", () => {
  assert.equal(
    toLocalInputValue(new Date(2026, 0, 5, 9, 4)),
    "2026-01-05T09:04",
  );
});

test("accepts a value that carries seconds", () => {
  assert.equal(
    fromLocalInputValue("2026-09-18T08:30:45")?.getSeconds(),
    45,
  );
});

test("rejects a date that does not exist", () => {
  assert.equal(fromLocalInputValue("2026-02-31T08:30"), null);
});

test("rejects an out-of-range time", () => {
  assert.equal(fromLocalInputValue("2026-09-18T24:00"), null);
});

test("rejects text that is not a date", () => {
  assert.equal(fromLocalInputValue("yesterday"), null);
});

test("rejects an empty value", () => {
  assert.equal(fromLocalInputValue(""), null);
});

test("an invalid date has no local input value", () => {
  assert.equal(toLocalInputValue(new Date("nonsense")), "");
});

test("an instant is submitted in UTC", () => {
  assert.equal(
    toIsoInstant(new Date("2026-09-18T08:30:00.000Z")),
    "2026-09-18T08:30:00.000Z",
  );
});
