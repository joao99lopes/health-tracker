import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeftIcon } from "lucide-react";
import { MeasurementDetail } from "@/components/measurements/measurement-detail";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth/session";
import { ageInYears } from "@/lib/health/age";
import { getTranslations } from "@/lib/i18n/server";
import { getMeasurement } from "@/lib/measurements/queries";
import { getProfile } from "@/lib/profile/queries";

/**
 * One measurement in full.
 *
 * The id comes from the URL, so it is only ever used together with the
 * session's user id: a measurement belonging to another account reads as not
 * found, which is also what it should look like.
 */
export default async function MeasurementPage({
  params,
}: PageProps<"/measurements/[id]">) {
  const { id } = await params;
  const user = await requireUser();

  const [measurement, profile, { t }] = await Promise.all([
    getMeasurement(user.id, id),
    getProfile(user.id),
    getTranslations(),
  ]);

  if (!measurement) {
    notFound();
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <div className="flex flex-col gap-3">
        <Button asChild variant="ghost" size="sm" className="-ml-3 self-start">
          <Link href="/measurements">
            <ChevronLeftIcon />
            {t.measurements.title}
          </Link>
        </Button>
        <PageHeader title={t.measurements.detailTitle} />
      </div>

      <MeasurementDetail
        measurement={measurement}
        // Age when the measurement was taken, not today's: that is the age the
        // BMI bands would have applied to.
        ageAtMeasurement={ageInYears(
          profile?.birthDate ?? null,
          measurement.measuredAt,
        )}
      />
    </div>
  );
}
