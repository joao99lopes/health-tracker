"use client";

import Link from "next/link";
import { PencilIcon, ScaleIcon } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { DeleteMeasurementDialog } from "@/components/measurements/delete-measurement-dialog";
import { LocalDateTime } from "@/components/measurements/local-date-time";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { calculateBmi, roundBmi } from "@/lib/health/bmi";
import { useI18n } from "@/lib/i18n/context";
import type { Language } from "@/lib/i18n/languages";
import type { MeasurementValueField } from "@/lib/measurements/fields";
import {
  formatBmi,
  formatMeasurementValue,
} from "@/lib/measurements/format";
import type { Measurement } from "@/lib/measurements/queries";

/**
 * The measurement history.
 *
 * One set of data, two presentations: a table from the small breakpoint up,
 * and a stack of cards below it, where six columns would be unreadable. The
 * full set of values lives on the detail page rather than being squeezed in
 * here.
 *
 * A value that was not recorded reads as such. Nothing is filled in with a
 * zero, which would be a measurement that was never taken.
 */

/** The columns worth showing in the summary; the rest are on the detail page. */
const SUMMARY_FIELDS: readonly MeasurementValueField[] = [
  "weightKg",
  "bodyFatPercent",
  "musclePercent",
];

function bmiText(measurement: Measurement, language: Language): string | null {
  return formatBmi(
    roundBmi(
      calculateBmi(measurement.weightKg, measurement.heightCmAtMeasurement),
    ),
    language,
  );
}

export function MeasurementList({
  measurements,
}: {
  measurements: Measurement[];
}) {
  const { t, language } = useI18n();

  if (measurements.length === 0) {
    return (
      <Card>
        <CardContent className="p-0">
          <EmptyState
            icon={ScaleIcon}
            title={t.measurements.empty}
            description={t.measurements.emptyDescription}
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
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
            <tbody>
              {measurements.map((measurement) => (
                <tr
                  key={measurement.id}
                  className="border-border hover:bg-muted/40 border-b transition-colors last:border-0"
                >
                  <td className="px-5 py-3.5">
                    <Link
                      href={`/measurements/${measurement.id}`}
                      className="focus-visible:ring-ring/50 rounded-sm font-medium outline-none hover:underline focus-visible:ring-3"
                    >
                      <LocalDateTime value={measurement.measuredAt} />
                    </Link>
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
                      ) ?? (
                        <span className="text-muted-foreground">—</span>
                      )}
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
          </table>
        </CardContent>
      </Card>

      {/* Cards: below the small breakpoint. */}
      <ul className="flex flex-col gap-3 sm:hidden">
        {measurements.map((measurement) => (
          <li key={measurement.id}>
            <Card>
              <CardContent className="flex flex-col gap-3">
                <div className="flex items-start justify-between gap-2">
                  <Link
                    href={`/measurements/${measurement.id}`}
                    className="focus-visible:ring-ring/50 rounded-sm text-[0.9375rem] font-medium outline-none hover:underline focus-visible:ring-3"
                  >
                    <LocalDateTime value={measurement.measuredAt} />
                  </Link>
                  <div className="-mr-1 -mt-1 flex items-center gap-1">
                    <Button
                      asChild
                      variant="ghost"
                      size="icon-sm"
                      aria-label={t.common.edit}
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
                </div>
                <dl className="border-border grid grid-cols-2 gap-x-4 gap-y-3 border-t pt-3 text-sm">
                  {SUMMARY_FIELDS.map((field) => (
                    <div key={field} className="flex flex-col">
                      <dt className="text-muted-foreground text-xs">
                        {t.measurements.fields[field]}
                      </dt>
                      <dd className="tabular-nums">
                        {formatMeasurementValue(
                          field,
                          measurement[field],
                          language,
                        ) ?? (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </dd>
                    </div>
                  ))}
                  <div className="flex flex-col">
                    <dt className="text-muted-foreground text-xs">
                      {t.measurements.bmi}
                    </dt>
                    <dd className="tabular-nums">
                      {bmiText(measurement, language) ?? (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </dd>
                  </div>
                </dl>
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>
    </>
  );
}
