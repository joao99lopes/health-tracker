import type { Metadata } from "next";
import { AddMeasurementFab } from "@/components/measurements/add-measurement-fab";
import { MeasurementList } from "@/components/measurements/measurement-list";
import { ProfileRequiredCard } from "@/components/measurements/profile-required-card";
import { PageHeader } from "@/components/page-header";
import { requireUser } from "@/lib/auth/session";
import { getTranslations } from "@/lib/i18n/server";
import { listMeasurements } from "@/lib/measurements/queries";
import { getProfile } from "@/lib/profile/queries";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getTranslations();
  return { title: t.measurements.title };
}

export default async function MeasurementsPage() {
  // Authoritative check, and the only id the queries below are scoped by.
  const user = await requireUser();
  const [measurements, profile, { t }] = await Promise.all([
    listMeasurements(user.id),
    getProfile(user.id),
    getTranslations(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t.measurements.title}
        description={t.measurements.description}
      />

      {profile === null && <ProfileRequiredCard />}

      {(profile !== null || measurements.length > 0) && (
        <MeasurementList measurements={measurements} />
      )}

      {profile !== null && <AddMeasurementFab />}
    </div>
  );
}
