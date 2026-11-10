import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeftIcon } from "lucide-react";
import { MetricDetail } from "@/components/metrics/metric-detail";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth/session";
import { parseMetricView } from "@/lib/dashboard/metric-view";
import { getTranslations } from "@/lib/i18n/server";
import { metricLabel } from "@/lib/measurements/messages";
import { isMetric } from "@/lib/measurements/metrics";
import { listMeasurementSnapshots } from "@/lib/measurements/queries";
import { DEFAULT_DIRECTION_PREFERENCES } from "@/lib/preferences/direction";
import { getProfile } from "@/lib/profile/queries";

export async function generateMetadata({
  params,
}: PageProps<"/metrics/[metric]">): Promise<Metadata> {
  const { metric } = await params;
  const { t } = await getTranslations();
  return { title: isMetric(metric) ? metricLabel(t, metric) : t.states.notFoundTitle };
}

/**
 * One metric on its own: a full-width chart over a period or a range of
 * days the reader picks, the period's figures, and every reading with its
 * change against the one before.
 *
 * Opened from the dashboard's chart. It reads the same snapshots as the
 * dashboard (no ids, no notes), scoped to the signed-in user, and switches
 * period in the browser as the dashboard does.
 */
export default async function MetricPage({
  params,
  searchParams,
}: PageProps<"/metrics/[metric]">) {
  const { metric } = await params;
  if (!isMetric(metric)) {
    notFound();
  }
  // Authoritative check, and the only id the queries below are scoped by.
  const user = await requireUser();
  const initialView = parseMetricView(await searchParams);
  const [measurements, profile, { t }] = await Promise.all([
    listMeasurementSnapshots(user.id),
    getProfile(user.id),
    getTranslations(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <Button asChild variant="ghost" size="sm" className="-ml-3 self-start">
          <Link href="/">
            <ChevronLeftIcon />
            {t.dashboard.title}
          </Link>
        </Button>
        <PageHeader
          title={metricLabel(t, metric)}
          description={t.metricPage.description}
        />
      </div>

      <MetricDetail
        metric={metric}
        measurements={measurements}
        directions={profile?.directions ?? DEFAULT_DIRECTION_PREFERENCES}
        // One instant for the whole request, as on the dashboard.
        now={new Date()}
        initialView={initialView}
      />
    </div>
  );
}
