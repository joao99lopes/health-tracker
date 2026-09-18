"use client";

import Link from "next/link";
import { PencilIcon } from "lucide-react";
import { DeleteMeasurementDialog } from "@/components/measurements/delete-measurement-dialog";
import { LocalDateTime } from "@/components/measurements/local-date-time";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { calculateBmi, roundBmi } from "@/lib/health/bmi";
import {
  classifyBmi,
  isAdultBmiApplicable,
} from "@/lib/health/bmi-classification";
import { useI18n } from "@/lib/i18n/context";
import { MEASUREMENT_VALUE_FIELDS } from "@/lib/measurements/fields";
import {
  formatBmi,
  formatHeightCm,
  formatMeasurementValue,
} from "@/lib/measurements/format";
import type { Measurement } from "@/lib/measurements/queries";

/**
 * Everything one measurement holds.
 *
 * Values that were not recorded say so rather than showing a zero. BMI is
 * derived here from the weight and the height stored *with this measurement*,
 * never from the profile's current height.
 *
 * The WHO band is shown only when it applies - its cut-off points are defined
 * for adults - and it is stated as the band the number falls into. Nothing
 * here interprets it.
 */
export function MeasurementDetail({
  measurement,
  ageAtMeasurement,
}: {
  measurement: Measurement;
  /** The user's age when it was taken, or null when unknown. */
  ageAtMeasurement: number | null;
}) {
  const { t, language } = useI18n();

  const bmi = roundBmi(
    calculateBmi(measurement.weightKg, measurement.heightCmAtMeasurement),
  );
  const category = isAdultBmiApplicable(ageAtMeasurement)
    ? classifyBmi(bmi)
    : null;

  return (
    <div className="flex flex-col gap-4">
      {/* The derived number the page is really about, given the most weight. */}
      <Card className="from-accent/60 to-card bg-gradient-to-br">
        <CardContent className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-1">
            <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
              {t.measurements.bmi}
            </p>
            <p className="text-4xl leading-none font-semibold tabular-nums">
              {formatBmi(bmi, language) ?? (
                <span className="text-muted-foreground text-lg font-normal">
                  {t.common.notRecorded}
                </span>
              )}
            </p>
            {category && (
              <p className="bg-card/70 text-foreground ring-foreground/10 mt-1 w-fit rounded-full px-2.5 py-0.5 text-xs font-medium ring-1">
                {t.measurements.bmiCategories[category]}
              </p>
            )}
          </div>
          <p className="text-muted-foreground max-w-xs text-xs sm:text-right">
            {t.measurements.bmiDerived}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-base font-medium">
              <LocalDateTime value={measurement.measuredAt} />
            </p>
            <div className="flex items-center gap-2">
              <Button asChild variant="outline" size="sm">
                <Link href={`/measurements/${measurement.id}/edit`}>
                  <PencilIcon />
                  {t.common.edit}
                </Link>
              </Button>
              <DeleteMeasurementDialog
                id={measurement.id}
                measuredAt={measurement.measuredAt}
                redirectTo="/measurements"
              />
            </div>
          </div>

          <dl className="border-border grid gap-x-8 gap-y-4 border-t pt-5 sm:grid-cols-2">
            {MEASUREMENT_VALUE_FIELDS.map((field) => {
              const value = formatMeasurementValue(
                field,
                measurement[field],
                language,
              );
              return (
                <div
                  key={field}
                  className="flex items-baseline justify-between gap-4"
                >
                  <dt className="text-muted-foreground text-sm">
                    {t.measurements.fields[field]}
                  </dt>
                  <dd className="text-right font-medium tabular-nums">
                    {value ?? (
                      <span className="text-muted-foreground font-normal">
                        {t.common.notRecorded}
                      </span>
                    )}
                  </dd>
                </div>
              );
            })}
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-1">
          <div className="flex items-baseline justify-between gap-4">
            <p className="text-muted-foreground text-sm">
              {t.measurements.heightAtMeasurement}
            </p>
            <p className="font-medium tabular-nums">
              {formatHeightCm(measurement.heightCmAtMeasurement, language)}
            </p>
          </div>
          <p className="text-muted-foreground text-xs">
            {t.measurements.heightKept}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
