/**
 * Conversion between an `<input type="datetime-local">` value and an instant.
 *
 * A measurement is stored as an instant (`Timestamptz`), but a user enters a
 * wall-clock time with no offset. The browser is the only place that knows
 * which offset that wall clock means, so the conversion happens there and the
 * server is handed an unambiguous ISO instant. Nothing here parses a
 * datetime-local string on the server, where the offset would be the
 * container's rather than the user's.
 *
 * This module is pure: no Prisma, no React, no environment access.
 */

const LOCAL_DATETIME = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(:(\d{2}))?$/;

function pad(value: number, length = 2): string {
  return String(value).padStart(length, "0");
}

/** An instant as the local wall clock writes it, to the minute. */
export function toLocalInputValue(date: Date): string {
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return (
    `${pad(date.getFullYear(), 4)}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  );
}

/**
 * A local wall-clock string as an instant, or null when it is not a real
 * date and time.
 *
 * Reading the components back off the constructed date rejects the values
 * `Date` silently rolls over, such as 31 February.
 */
export function fromLocalInputValue(value: string): Date | null {
  const match = LOCAL_DATETIME.exec(value.trim());
  if (!match) {
    return null;
  }
  const [year, month, day, hours, minutes] = [
    Number(match[1]),
    Number(match[2]),
    Number(match[3]),
    Number(match[4]),
    Number(match[5]),
  ];
  const seconds = match[7] === undefined ? 0 : Number(match[7]);

  const date = new Date(year, month - 1, day, hours, minutes, seconds, 0);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day ||
    date.getHours() !== hours ||
    date.getMinutes() !== minutes
  ) {
    return null;
  }
  return date;
}

/** The instant a form submits: an ISO 8601 string in UTC. */
export function toIsoInstant(date: Date): string {
  return date.toISOString();
}
