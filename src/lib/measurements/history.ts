import { isPeriodKey, type PeriodKey } from "../periods/periods.ts";

/**
 * The measurement history page: which slice of it to show, and how it is
 * grouped.
 *
 * The slice lives in the address (`?period=3m&show=100`), so a reload, the
 * back button and a bookmark all land on the same list, and the server only
 * ever reads and sends the rows on screen - not years of history to a phone
 * that shows the first screenful.
 *
 * This module is pure: no Prisma, no React, no environment access.
 */

/** Rows per step of "Show more". */
export const HISTORY_PAGE_SIZE = 50;

/**
 * Upper bound on a single page, whatever the address says. Matches the
 * largest file the importer accepts, so a whole import still fits on one
 * page if someone asks for it.
 */
export const HISTORY_MAX_ROWS = 5000;

/** The history shows everything until the reader narrows it. */
export const HISTORY_DEFAULT_PERIOD: PeriodKey = "all";

export type HistoryQuery = {
  period: PeriodKey;
  /** How many rows to show, a multiple of the page size. */
  limit: number;
};

/** Search parameters as Next.js hands them over. */
type RawParam = string | string[] | undefined;

function first(value: RawParam): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/**
 * The slice the address asks for. Anything unreadable falls back to the
 * default rather than failing: a hand-edited address is not an error page.
 */
export function parseHistoryQuery(params: {
  period?: RawParam;
  show?: RawParam;
}): HistoryQuery {
  const period = first(params.period);
  const show = Number(first(params.show));
  const pages = Number.isInteger(show) && show > 0
    ? Math.ceil(show / HISTORY_PAGE_SIZE)
    : 1;
  return {
    period: period !== undefined && isPeriodKey(period) ? period : HISTORY_DEFAULT_PERIOD,
    limit: Math.min(pages * HISTORY_PAGE_SIZE, HISTORY_MAX_ROWS),
  };
}

/** The address of a slice; the defaults are left out so URLs stay short. */
export function historyHref(query: HistoryQuery): string {
  const params = new URLSearchParams();
  if (query.period !== HISTORY_DEFAULT_PERIOD) {
    params.set("period", query.period);
  }
  if (query.limit > HISTORY_PAGE_SIZE) {
    params.set("show", String(query.limit));
  }
  const search = params.toString();
  return search === "" ? "/measurements" : `/measurements?${search}`;
}

/**
 * Consecutive items grouped by calendar month in `timeZone`, keeping their
 * order. The list arrives newest first, so the groups do too.
 *
 * `key` is `YYYY-MM`; the caller writes the month's name in the reader's
 * language.
 */
export function groupByMonth<T extends { measuredAt: Date }>(
  items: readonly T[],
  timeZone?: string,
): Array<{ key: string; month: Date; items: T[] }> {
  const format = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    timeZone,
  });
  const groups: Array<{ key: string; month: Date; items: T[] }> = [];
  for (const item of items) {
    const key = format.format(item.measuredAt).slice(0, 7);
    const last = groups[groups.length - 1];
    if (last !== undefined && last.key === key) {
      last.items.push(item);
    } else {
      groups.push({ key, month: item.measuredAt, items: [item] });
    }
  }
  return groups;
}
