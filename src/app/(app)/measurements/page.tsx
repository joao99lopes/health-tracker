import type { Metadata } from "next";
import { AddMeasurementFab } from "@/components/measurements/add-measurement-fab";
import { HistoryControls } from "@/components/measurements/history-controls";
import { MeasurementList } from "@/components/measurements/measurement-list";
import { ProfileRequiredCard } from "@/components/measurements/profile-required-card";
import { PageHeader } from "@/components/page-header";
import { requireUser } from "@/lib/auth/session";
import { getTranslations } from "@/lib/i18n/server";
import { parseHistoryQuery } from "@/lib/measurements/history";
import {
  hasMeasurements,
  listMeasurementsPage,
} from "@/lib/measurements/queries";
import { periodStart } from "@/lib/periods/periods";
import { getProfile } from "@/lib/profile/queries";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getTranslations();
  return { title: t.measurements.title };
}

/**
 * The history, a page at a time.
 *
 * Which slice is shown comes from the address (see `lib/measurements/
 * history.ts`), and only that slice is read: the list does not grow with
 * years of data.
 */
export default async function MeasurementsPage({
  searchParams,
}: PageProps<"/measurements">) {
  // Authoritative check, and the only id the queries below are scoped by.
  const user = await requireUser();
  const query = parseHistoryQuery(await searchParams);
  const [page, profile, { t }] = await Promise.all([
    listMeasurementsPage(user.id, {
      since: periodStart(query.period),
      limit: query.limit,
    }),
    getProfile(user.id),
    getTranslations(),
  ]);
  // An empty slice of a non-empty history is "nothing in this period", not
  // "nothing yet"; only the second case needs the extra look.
  const anyAtAll =
    page.measurements.length > 0 || (await hasMeasurements(user.id));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t.measurements.title}
        description={t.measurements.description}
      />

      {profile === null && <ProfileRequiredCard />}

      {anyAtAll && <HistoryControls query={query} />}

      {(profile !== null || anyAtAll) && (
        <MeasurementList
          measurements={page.measurements}
          query={query}
          hasMore={page.hasMore}
          emptyPeriod={anyAtAll}
        />
      )}

      {profile !== null && <AddMeasurementFab />}
    </div>
  );
}
