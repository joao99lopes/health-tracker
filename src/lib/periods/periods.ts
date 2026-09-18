/**
 * The period filter set, defined once and reused by charts, comparisons and
 * anything else that narrows a date range.
 *
 * Days are exact spans of 24 hours; months and years are calendar arithmetic,
 * so "1 month" before 31 March is 28 February rather than 3 March. Everything
 * works in UTC, matching how instants are stored.
 *
 * This module is pure: no Prisma, no React, no environment access.
 */

export const PERIOD_KEYS = [
  "3d",
  "1w",
  "2w",
  "1m",
  "3m",
  "6m",
  "1y",
  "2y",
  "all",
] as const;

export type PeriodKey = (typeof PERIOD_KEYS)[number];

/** Shown first wherever a period can be chosen. */
export const DEFAULT_PERIOD: PeriodKey = "1m";

/** How far back each key reaches; `null` means no lower bound at all. */
type PeriodSpan = { days: number } | { months: number } | { years: number } | null;

const PERIOD_SPANS: Record<PeriodKey, PeriodSpan> = {
  "3d": { days: 3 },
  "1w": { days: 7 },
  "2w": { days: 14 },
  "1m": { months: 1 },
  "3m": { months: 3 },
  "6m": { months: 6 },
  "1y": { years: 1 },
  "2y": { years: 2 },
  all: null,
};

export function isPeriodKey(value: string): value is PeriodKey {
  return (PERIOD_KEYS as readonly string[]).includes(value);
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Last day of a UTC month, so subtracting months cannot roll over. */
function lastDayOfMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
}

function subtractMonths(from: Date, months: number): Date {
  const year = from.getUTCFullYear();
  const month = from.getUTCMonth() - months;
  const day = Math.min(
    from.getUTCDate(),
    lastDayOfMonth(
      year + Math.floor(month / 12),
      ((month % 12) + 12) % 12,
    ),
  );
  return new Date(
    Date.UTC(
      year,
      month,
      day,
      from.getUTCHours(),
      from.getUTCMinutes(),
      from.getUTCSeconds(),
      from.getUTCMilliseconds(),
    ),
  );
}

/**
 * The earliest instant a period includes, or null for "all time".
 *
 * The bound is inclusive: a measurement taken exactly at the returned instant
 * is inside the period.
 */
export function periodStart(
  period: PeriodKey,
  now: Date = new Date(),
): Date | null {
  const span = PERIOD_SPANS[period];
  if (span === null) {
    return null;
  }
  if ("days" in span) {
    return new Date(now.getTime() - span.days * MS_PER_DAY);
  }
  if ("months" in span) {
    return subtractMonths(now, span.months);
  }
  return subtractMonths(now, span.years * 12);
}

/**
 * The items inside a period, in the order they were given.
 *
 * Only the lower bound is applied: a measurement dated in the future is a
 * mistake to surface, not to hide.
 */
export function filterByPeriod<T>(
  items: readonly T[],
  period: PeriodKey,
  dateOf: (item: T) => Date,
  now: Date = new Date(),
): T[] {
  const start = periodStart(period, now);
  if (start === null) {
    return [...items];
  }
  const startTime = start.getTime();
  return items.filter((item) => {
    const at = dateOf(item);
    return !Number.isNaN(at.getTime()) && at.getTime() >= startTime;
  });
}
