import type { Metadata } from "next";
import { MeasurementForm } from "@/components/measurements/measurement-form";
import { ProfileRequiredCard } from "@/components/measurements/profile-required-card";
import { PageHeader } from "@/components/page-header";
import { requireUser } from "@/lib/auth/session";
import { getTranslations } from "@/lib/i18n/server";
import { getProfile } from "@/lib/profile/queries";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getTranslations();
  return { title: t.measurements.addTitle };
}

/**
 * Adding a measurement.
 *
 * The height comes from the profile here and is stamped onto the new row by
 * the server action; it is never something the request supplies. Without a
 * profile there is no height to record, so the form is not offered at all.
 */
export default async function NewMeasurementPage() {
  const user = await requireUser();
  const [profile, { t }] = await Promise.all([
    getProfile(user.id),
    getTranslations(),
  ]);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <PageHeader
        title={t.measurements.addTitle}
        description={t.measurements.addDescription}
      />

      {profile === null ? (
        <ProfileRequiredCard />
      ) : (
        <MeasurementForm heightCm={profile.heightCm} />
      )}
    </div>
  );
}
