import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MeasurementForm } from "@/components/measurements/measurement-form";
import { PageHeader } from "@/components/page-header";
import { requireUser } from "@/lib/auth/session";
import { getTranslations } from "@/lib/i18n/server";
import { getMeasurement } from "@/lib/measurements/queries";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getTranslations();
  return { title: t.measurements.editTitle };
}

/**
 * Editing a measurement.
 *
 * The form is handed the height this measurement was recorded at, not the
 * profile's current one, and the update never writes that column: correcting
 * a weight from three years ago must not silently re-derive its BMI against
 * today's height.
 */
export default async function EditMeasurementPage({
  params,
}: PageProps<"/measurements/[id]/edit">) {
  const { id } = await params;
  const user = await requireUser();

  const [measurement, { t }] = await Promise.all([
    getMeasurement(user.id, id),
    getTranslations(),
  ]);

  if (!measurement) {
    notFound();
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <PageHeader
        title={t.measurements.editTitle}
        description={t.measurements.editDescription}
      />

      <MeasurementForm
        measurement={measurement}
        heightCm={measurement.heightCmAtMeasurement}
      />
    </div>
  );
}
