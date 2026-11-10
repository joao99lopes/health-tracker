/**
 * How long ago something was recorded, in the units a person would say it in:
 * "today", "yesterday", "5 days ago", "3 weeks ago", "4 months ago".
 *
 * Days are *calendar* days in the reader's time zone - a reading from 23:50
 * seen at 00:10 was "yesterday", not "0 days ago" - so the caller passes the
 * time zone it renders in (none means the runtime's own, i.e. the browser).
 *
 * The words come from `Intl.RelativeTimeFormat` in the reader's language, so
 * there is nothing here to translate.
 *
 * This module is pure: no React, no environment access.
 */

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Midnight UTC of the calendar day `date` falls on in `timeZone`. */
function calendarDay(date: Date, timeZone: string | undefined): number {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const part = (type: string) =>
    Number(parts.find((item) => item.type === type)?.value);
  return Date.UTC(part("year"), part("month") - 1, part("day"));
}

/** Whole calendar days from `then` to `now`; never negative. */
export function calendarDaysBetween(
  then: Date,
  now: Date,
  timeZone?: string,
): number {
  const days = Math.round(
    (calendarDay(now, timeZone) - calendarDay(then, timeZone)) / MS_PER_DAY,
  );
  return Math.max(0, days);
}

export type RelativeAge = {
  value: number;
  unit: "day" | "week" | "month" | "year";
};

/**
 * The unit a person would use for an age in days: days for the first two
 * weeks, then weeks, then months, then years - always rounded down, so a
 * reading is never made to sound older than it is.
 */
export function relativeAge(days: number): RelativeAge {
  if (days < 14) return { value: days, unit: "day" };
  if (days < 60) return { value: Math.floor(days / 7), unit: "week" };
  if (days < 365) return { value: Math.floor(days / 30), unit: "month" };
  return { value: Math.floor(days / 365), unit: "year" };
}

/** "today", "yesterday", "3 weeks ago" - in `language`. */
export function formatRelativeAge(
  then: Date,
  now: Date,
  language: string,
  timeZone?: string,
): string {
  const { value, unit } = relativeAge(calendarDaysBetween(then, now, timeZone));
  return new Intl.RelativeTimeFormat(language, { numeric: "auto" }).format(
    -value,
    unit,
  );
}
