import type { Metadata } from "next";
import { Dashboard } from "@/components/dashboard/dashboard";
import { AddMeasurementFab } from "@/components/measurements/add-measurement-fab";
import { ProfileRequiredCard } from "@/components/measurements/profile-required-card";
import { PageHeader } from "@/components/page-header";
import { requireUser } from "@/lib/auth/session";
import { parseDashboardView } from "@/lib/dashboard/view";
import { getTranslations } from "@/lib/i18n/server";
import { listMeasurements } from "@/lib/measurements/queries";
import { DEFAULT_DIRECTION_PREFERENCES } from "@/lib/preferences/direction";
import { getProfile } from "@/lib/profile/queries";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getTranslations();
  return { title: t.dashboard.title };
}

/**
 * The page a signed-in user lands on.
 *
 * Navigation to Measurements and Profile, and signing out, live in the app
 * shell around this page.
 */
export default async function DashboardPage({ searchParams }: PageProps<"/">) {
  // Authoritative check, and the only id the queries below are scoped by.
  const user = await requireUser();
  // The chart and comparison choices the address carries, so the server
  // renders the same view the browser will show.
  const initialView = parseDashboardView(await searchParams);
  const [measurements, profile, { t }] = await Promise.all([
    listMeasurements(user.id),
    getProfile(user.id),
    getTranslations(),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title={t.dashboard.title}
        description={t.dashboard.description}
      />

      {profile === null && <ProfileRequiredCard />}

      {/* Without a profile and without data, the card above already says
          what is missing; a second "nothing here yet" would only repeat it. */}
      {(profile !== null || measurements.length > 0) && (
        <Dashboard
          measurements={measurements}
          birthDate={profile?.birthDate ?? null}
          // Presentation only. Without a profile nobody has stated a
          // preference, so the page reads exactly as it did before.
          directions={profile?.directions ?? DEFAULT_DIRECTION_PREFERENCES}
          // One instant for the whole request: the period filter then means
          // the same thing on the server and after hydration.
          now={new Date()}
          initialView={initialView}
        />
      )}

      {profile !== null && <AddMeasurementFab />}
    </div>
  );
}
