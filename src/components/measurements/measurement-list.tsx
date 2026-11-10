"use client";

import Link from "next/link";
import {
  ChevronRightIcon,
  PencilIcon,
  ScaleIcon,
  StickyNoteIcon,
} from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { AddMeasurementButton } from "@/components/measurements/add-measurement-fab";
import { DeleteMeasurementDialog } from "@/components/measurements/delete-measurement-dialog";
import { LocalDateTime } from "@/components/measurements/local-date-time";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useHydrated } from "@/hooks/use-hydrated";
import { calculateBmi, roundBmi } from "@/lib/health/bmi";
import { useI18n } from "@/lib/i18n/context";
import type { Dictionary } from "@/lib/i18n/dictionary";
import type { Language } from "@/lib/i18n/languages";
import {
  MEASUREMENT_VALUE_FIELDS,
  type MeasurementValueField,
} from "@/lib/measurements/fields";
import {
  formatBmi,
  formatMeasurementValue,
} from "@/lib/measurements/format";
import {
  HISTORY_PAGE_SIZE,
  groupByMonth,
  historyHref,
  type HistoryQuery,
} from "@/lib/measurements/history";
import type { Measurement } from "@/lib/measurements/queries";

/**
 * The measurement history, grouped by month.
 *
 * One set of data, two presentations: a table from the small breakpoint up,
 * and a compact list below it. On a phone each row is a link to the full
 * measurement, where editing and deleting live; it lists only the values
 * that were recorded, so a waist-only reading is one line, not five dashes.
 * The table keeps a fixed set of columns, where a dash marks a value that
 * was not recorded - never a zero.
 *
 * The list is one page of the history (see `lib/measurements/history.ts`);
 * "Show more" asks the server for the next one.
 */

/** The columns worth showing in the table; the rest are on the detail page. */
const SUMMARY_FIELDS: readonly MeasurementValueField[] = [
  "weightKg",
  "bodyFatPercent",
  "musclePercent",
  "abdominalCircumferenceCm",
];

function bmiText(measurement: Measurement, language: Language): string | null {
  return formatBmi(
    roundBmi(
      calculateBmi(measurement.weightKg, measurement.heightCmAtMeasurement),
    ),
    language,
  );
}

/** Every recorded value of a measurement, labelled, in canonical order. */
function recordedValues(
  measurement: Measurement,
  t: Dictionary,
  language: Language,
): Array<{ key: string; label: string; value: string }> {
  const values = MEASUREMENT_VALUE_FIELDS.flatMap((field) => {
    const value = formatMeasurementValue(field, measurement[field], language);
    return value === null
      ? []
      : [{ key: field, label: t.measurements.fieldsShort[field], value }];
  });
  const bmi = bmiText(measurement, language);
  return bmi === null
    ? values
    : [...values, { key: "bmi", label: t.measurements.bmi, value: bmi }];
}

function NoteMarker({ note, t }: { note: string | null; t: Dictionary }) {
  if (note === null) {
    return null;
  }
  return (
    <span title={note} className="text-muted-foreground inline-flex">
      <StickyNoteIcon className="size-3.5" aria-hidden />
      <span className="sr-only">{t.measurements.hasNote}</span>
    </span>
  );
}

export function MeasurementList({
  measurements,
  query,
  hasMore,
  emptyPeriod,
}: {
  measurements: Measurement[];
  query: HistoryQuery;
  /** Whether older rows exist beyond this page. */
  hasMore: boolean;
  /**
   * True when the user has measurements, just none in this period: then the
   * empty list says so instead of "nothing recorded yet".
   */
  emptyPeriod: boolean;
}) {
  const { t, language } = useI18n();
  const hydrated = useHydrated();
  // Months in the reader's zone once it is known; UTC for the server pass and
  // hydration, which must agree. See `useHydrated`.
  const timeZone = hydrated ? undefined : "UTC";

  if (measurements.length === 0) {
    return (
      <Card>
        <CardContent className="p-0">
          {emptyPeriod ? (
            <EmptyState
              icon={ScaleIcon}
              title={t.measurements.emptyPeriod}
            />
          ) : (
            <EmptyState
              icon={ScaleIcon}
              title={t.measurements.empty}
              description={t.measurements.emptyDescription}
              action={<AddMeasurementButton />}
            />
          )}
        </CardContent>
      </Card>
    );
  }

  const groups = groupByMonth(measurements, timeZone);
  const monthLabel = (month: Date) =>
    new Intl.DateTimeFormat(language, {
      month: "long",
      year: "numeric",
      timeZone,
    }).format(month);

  return (
    <div className="flex flex-col gap-6">
      {/* Table: small screens up. */}
      <Card className="hidden py-0 sm:block">
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="text-muted-foreground bg-muted/40 border-border border-b">
              <tr>
                <th
                  scope="col"
                  className="px-5 py-3 text-left text-xs font-medium tracking-wide uppercase"
                >
                  {t.measurements.measuredAt}
                </th>
                {SUMMARY_FIELDS.map((field) => (
                  <th
                    key={field}
                    scope="col"
                    className="px-5 py-3 text-right text-xs font-medium tracking-wide uppercase"
                  >
                    {t.measurements.fields[field]}
                  </th>
                ))}
                <th
                  scope="col"
                  className="px-5 py-3 text-right text-xs font-medium tracking-wide uppercase"
                >
                  {t.measurements.bmi}
                </th>
                <th scope="col" className="px-5 py-3 text-right font-medium">
                  <span className="sr-only">{t.measurements.actions}</span>
                </th>
              </tr>
            </thead>
            {groups.map((group) => (
              <tbody key={group.key}>
                <tr className="border-border bg-muted/20 border-b">
                  <th
                    scope="rowgroup"
                    colSpan={SUMMARY_FIELDS.length + 3}
                    className="text-muted-foreground px-5 py-2 text-left text-xs font-medium capitalize"
                  >
                    {monthLabel(group.month)}
                  </th>
                </tr>
                {group.items.map((measurement) => (
                  <tr
                    key={measurement.id}
                    className="border-border hover:bg-muted/40 border-b transition-colors"
                  >
                    <td className="px-5 py-3.5">
                      <span className="flex items-center gap-2">
                        <Link
                          href={`/measurements/${measurement.id}`}
                          className="focus-visible:ring-ring/50 rounded-sm font-medium outline-none hover:underline focus-visible:ring-3"
                        >
                          <LocalDateTime value={measurement.measuredAt} />
                        </Link>
                        <NoteMarker note={measurement.note} t={t} />
                      </span>
                    </td>
                    {SUMMARY_FIELDS.map((field) => (
                      <td
                        key={field}
                        className="px-5 py-3.5 text-right tabular-nums"
                      >
                        {formatMeasurementValue(
                          field,
                          measurement[field],
                          language,
                        ) ?? <span className="text-muted-foreground">—</span>}
                      </td>
                    ))}
                    <td className="px-5 py-3.5 text-right tabular-nums">
                      {bmiText(measurement, language) ?? (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          asChild
                          variant="ghost"
                          size="icon-sm"
                          aria-label={t.common.edit}
                          title={t.common.edit}
                        >
                          <Link href={`/measurements/${measurement.id}/edit`}>
                            <PencilIcon />
                          </Link>
                        </Button>
                        <DeleteMeasurementDialog
                          id={measurement.id}
                          measuredAt={measurement.measuredAt}
                          iconOnly
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            ))}
          </table>
        </CardContent>
      </Card>

      {/* Compact list: below the small breakpoint. */}
      <div className="flex flex-col gap-5 sm:hidden">
        {groups.map((group) => (
          <section key={group.key} className="flex flex-col gap-2">
            <h2 className="text-muted-foreground px-1 text-xs font-medium tracking-wide uppercase">
              {monthLabel(group.month)}
            </h2>
            <Card className="py-0">
              <ul className="divide-border divide-y">
                {group.items.map((measurement) => (
                  <li key={measurement.id}>
                    <Link
                      href={`/measurements/${measurement.id}`}
                      className="focus-visible:ring-ring/50 hover:bg-muted/40 flex items-center gap-3 px-4 py-3 outline-none focus-visible:ring-3 focus-visible:ring-inset"
                    >
                      <div className="flex min-w-0 flex-1 flex-col gap-1">
                        <span className="flex items-center gap-2 text-sm font-medium">
                          <LocalDateTime value={measurement.measuredAt} />
                          <NoteMarker note={measurement.note} t={t} />
                        </span>
                        <dl className="text-muted-foreground flex flex-wrap gap-x-3 gap-y-0.5 text-xs">
                          {recordedValues(measurement, t, language).map(
                            (entry) => (
                              <div key={entry.key} className="flex gap-1">
                                <dt>{entry.label}</dt>
                                <dd className="text-foreground font-medium tabular-nums">
                                  {entry.value}
                                </dd>
                              </div>
                            ),
                          )}
                        </dl>
                      </div>
                      <ChevronRightIcon
                        className="text-muted-foreground size-4 shrink-0"
                        aria-hidden
                      />
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          </section>
        ))}
      </div>

      {hasMore && (
        <Button asChild variant="outline" className="self-center">
          <Link
            href={historyHref({
              ...query,
              limit: query.limit + HISTORY_PAGE_SIZE,
            })}
            scroll={false}
          >
            {t.measurements.showMore}
          </Link>
        </Button>
      )}
    </div>
  );
}
