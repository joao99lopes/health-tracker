"use client";

import { useHydrated } from "@/hooks/use-hydrated";
import { useI18n } from "@/lib/i18n/context";
import { formatDate, formatDateTime } from "@/lib/measurements/format";

/**
 * An instant written in the reader's own time zone.
 *
 * Only the browser knows that zone: the server renders in whatever the
 * container is set to. The server pass and the hydration pass therefore both
 * write the instant in UTC - a zone both of them agree on - and the reader's
 * zone takes over once hydrated.
 */
export function LocalDateTime({
  value,
  mode = "datetime",
}: {
  value: Date;
  mode?: "datetime" | "date";
}) {
  const { language } = useI18n();
  const hydrated = useHydrated();
  const format = mode === "date" ? formatDate : formatDateTime;

  return (
    <time dateTime={value.toISOString()}>
      {format(value, language, hydrated ? undefined : "UTC")}
    </time>
  );
}
