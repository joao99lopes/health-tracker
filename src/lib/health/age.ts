/**
 * Age derived from a date of birth.
 *
 * The date of birth is what is stored; an age is always computed, so it is
 * never stale. Everything here works in UTC, which is how `birthDate` is
 * stored (a plain calendar date at midnight UTC) - using local time would
 * shift the birthday by a day for users west of Greenwich.
 *
 * This module is pure: no Prisma, no React, no environment access.
 */

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

type CalendarDate = { year: number; month: number; day: number };

/** Parses `YYYY-MM-DD`, rejecting dates that do not exist (2025-02-31). */
function parseCalendarDate(value: string): CalendarDate | null {
  const match = ISO_DATE.exec(value);
  if (!match) {
    return null;
  }
  const [year, month, day] = [
    Number(match[1]),
    Number(match[2]),
    Number(match[3]),
  ];
  const asDate = new Date(Date.UTC(year, month - 1, day));
  if (
    asDate.getUTCFullYear() !== year ||
    asDate.getUTCMonth() !== month - 1 ||
    asDate.getUTCDate() !== day
  ) {
    return null;
  }
  return { year, month, day };
}

function toCalendarDate(instant: Date): CalendarDate | null {
  if (Number.isNaN(instant.getTime())) {
    return null;
  }
  return {
    year: instant.getUTCFullYear(),
    month: instant.getUTCMonth() + 1,
    day: instant.getUTCDate(),
  };
}

/**
 * Completed years between a date of birth and an instant, or null when the
 * date of birth is unusable or lies in the future.
 *
 * Counting completed years is the everyday meaning of age: someone born on
 * 1990-05-04 is 35 on 2026-05-03 and 36 on 2026-05-04. A 29 February birthday
 * therefore completes a year on 1 March in non-leap years.
 */
export function ageInYears(
  birthDate: string | null | undefined,
  on: Date = new Date(),
): number | null {
  if (!birthDate) {
    return null;
  }
  const birth = parseCalendarDate(birthDate);
  const today = toCalendarDate(on);
  if (!birth || !today) {
    return null;
  }

  let age = today.year - birth.year;
  const birthdayPassed =
    today.month > birth.month ||
    (today.month === birth.month && today.day >= birth.day);
  if (!birthdayPassed) {
    age -= 1;
  }

  return age < 0 ? null : age;
}
