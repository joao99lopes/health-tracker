/**
 * A range of calendar days the reader picks ("from 1 August to 31 August"),
 * as opposed to the fixed periods in `periods.ts`, which always count back
 * from now. The period set stays defined once there; a range is a separate
 * way of choosing, offered where a past stretch needs to be looked at on its
 * own.
 *
 * Days are written as `YYYY-MM-DD`, which is what `<input type="date">`
 * produces and what goes in the address. Which instants a day covers depends
 * on the reader's time zone, which only the browser knows, so the bounds are
 * computed either in the runtime's local zone (the browser) or in UTC (the
 * server, and the first render, which must agree with it).
 *
 * This module is pure: no React, no environment access.
 */

export type DateRange = {
  /** First day included, `YYYY-MM-DD`. */
  from: string;
  /** Last day included, `YYYY-MM-DD`. */
  to: string;
};

const DAY = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Year, month (1-12) and day of a valid `YYYY-MM-DD`, or null. */
function parseDay(value: string): [number, number, number] | null {
  const match = DAY.exec(value);
  if (match === null) {
    return null;
  }
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  // Round-trip through a date to reject 2026-02-30 and friends.
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return [year, month, day];
}

export function isDay(value: string): boolean {
  return parseDay(value) !== null;
}

/**
 * The range an address or a form asks for, or null when either end is
 * missing or unreadable, or when it ends before it starts.
 */
export function parseDateRange(
  from: string | undefined,
  to: string | undefined,
): DateRange | null {
  if (from === undefined || to === undefined || !isDay(from) || !isDay(to)) {
    return null;
  }
  // `YYYY-MM-DD` sorts as text in date order.
  return from <= to ? { from, to } : null;
}

/**
 * The instants a range covers: from the start of its first day (inclusive)
 * to the start of the day after its last (exclusive), so every reading of the
 * last day is inside.
 */
export function rangeBounds(
  range: DateRange,
  zone: "local" | "utc",
): { start: Date; end: Date } {
  const make = ([year, month, day]: [number, number, number], plusDays: number) =>
    zone === "utc"
      ? new Date(Date.UTC(year, month - 1, day + plusDays))
      : new Date(year, month - 1, day + plusDays);
  const from = parseDay(range.from);
  const to = parseDay(range.to);
  if (from === null || to === null) {
    // A `DateRange` only comes out of `parseDateRange`, which checked both.
    throw new Error(`Not a date range: ${range.from}..${range.to}`);
  }
  return { start: make(from, 0), end: make(to, 1) };
}
