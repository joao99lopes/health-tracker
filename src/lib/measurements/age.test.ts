import assert from "node:assert/strict";
import { test } from "node:test";
import {
  calendarDaysBetween,
  formatRelativeAge,
  relativeAge,
} from "./age.ts";

test("days are calendar days in the given time zone", () => {
  const lateEvening = new Date("2026-11-09T23:50:00Z");
  const justAfterMidnight = new Date("2026-11-10T00:10:00Z");
  assert.equal(calendarDaysBetween(lateEvening, justAfterMidnight, "UTC"), 1);
  // In Lisbon's winter time (UTC+0) the same; in New York both are the 9th.
  assert.equal(
    calendarDaysBetween(lateEvening, justAfterMidnight, "America/New_York"),
    0,
  );
});

test("a reading in the future of `now` is today, not a negative age", () => {
  const now = new Date("2026-11-10T12:00:00Z");
  assert.equal(calendarDaysBetween(new Date("2026-11-11T12:00:00Z"), now, "UTC"), 0);
});

test("the unit grows with the age and always rounds down", () => {
  assert.deepEqual(relativeAge(0), { value: 0, unit: "day" });
  assert.deepEqual(relativeAge(13), { value: 13, unit: "day" });
  assert.deepEqual(relativeAge(20), { value: 2, unit: "week" });
  assert.deepEqual(relativeAge(59), { value: 8, unit: "week" });
  assert.deepEqual(relativeAge(89), { value: 2, unit: "month" });
  assert.deepEqual(relativeAge(800), { value: 2, unit: "year" });
});

test("worded in the reader's language", () => {
  const now = new Date("2026-11-10T12:00:00Z");
  const weekAgo = new Date("2026-11-03T19:23:00Z");
  assert.equal(formatRelativeAge(now, now, "en", "UTC"), "today");
  assert.equal(formatRelativeAge(weekAgo, now, "en", "UTC"), "7 days ago");
  assert.equal(formatRelativeAge(weekAgo, now, "pt", "UTC"), "há 7 dias");
});
