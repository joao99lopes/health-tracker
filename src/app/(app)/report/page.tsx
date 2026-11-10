import type { Metadata } from "next";
import { LocalDateTime } from "@/components/measurements/local-date-time";
import { PageHeader } from "@/components/page-header";
import { ReportChart } from "@/components/report/report-chart";
import { ReportControls } from "@/components/report/report-controls";
import { requireUser } from "@/lib/auth/session";
import { calculateBmi, roundBmi } from "@/lib/health/bmi";
import { getTranslations } from "@/lib/i18n/server";
import { MEASUREMENT_VALUE_FIELDS } from "@/lib/measurements/fields";
import {
  formatBmi,
  formatMeasurementValue,
  formatMetricDelta,
  formatMetricValue,
} from "@/lib/measurements/format";
import { HISTORY_MAX_ROWS } from "@/lib/measurements/history";
import { metricLabel } from "@/lib/measurements/messages";
import { listMeasurementsPage } from "@/lib/measurements/queries";
import { buildReport } from "@/lib/measurements/report";
import {
  DEFAULT_PERIOD,
  isPeriodKey,
  periodStart,
} from "@/lib/periods/periods";
import { getProfile } from "@/lib/profile/queries";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getTranslations();
  return { title: t.report.title };
}

/**
 * A printable record of one period: per-metric figures, one chart and every
 * measurement, laid out for paper (the app's chrome is hidden in print).
 *
 * Read-only and scoped like every other page: the rows are the signed-in
 * user's and no one else's.
 */
export default async function ReportPage({ searchParams }: PageProps<"/report">) {
  const user = await requireUser();
  const raw = (await searchParams).period;
  const requested = Array.isArray(raw) ? raw[0] : raw;
  const period =
    requested !== undefined && isPeriodKey(requested) ? requested : DEFAULT_PERIOD;
  const now = new Date();

  const [{ measurements }, profile, { t, language }] = await Promise.all([
    listMeasurementsPage(user.id, {
      since: periodStart(period, now),
      limit: HISTORY_MAX_ROWS,
    }),
    getProfile(user.id),
    getTranslations(),
  ]);
  const rows = buildReport(measurements, period, now);
  const oldest = measurements[measurements.length - 1];
  const newest = measurements[0];
  const leading = rows[0];

  const cell = "px-3 py-2 text-right tabular-nums";
  const head = "px-3 py-2 text-right text-xs font-medium";

  return (
    <div className="flex flex-col gap-8 print:gap-6 print:text-[11px]">
      <PageHeader title={t.report.title} description={t.report.description} />

      <ReportControls period={period} />

      {/* What the page is a record of: who, which period, when printed. */}
      <div className="flex flex-col gap-1 text-sm">
        <p className="font-medium">
          {[profile?.name, user.email].filter(Boolean).join(" · ")}
        </p>
        <p className="text-muted-foreground">
          {t.charts.period}: {t.periods[period]}
          {oldest !== undefined && newest !== undefined && (
            <>
              {` · ${t.report.range}: `}
              <LocalDateTime value={oldest.measuredAt} mode="date" />
              {" – "}
              <LocalDateTime value={newest.measuredAt} mode="date" />
            </>
          )}
        </p>
        <p className="text-muted-foreground">
          {`${t.report.generatedOn} `}
          <LocalDateTime value={now} />
        </p>
      </div>

      {rows.length === 0 || leading === undefined ? (
        <p className="border-border text-muted-foreground rounded-lg border border-dashed px-4 py-6 text-center text-sm">
          {t.dashboard.notEnoughData}
        </p>
      ) : (
        <>
          <section className="flex flex-col gap-3">
            <h2 className="font-heading text-lg font-semibold">
              {t.report.byMetric}
            </h2>
            <div className="overflow-x-auto rounded-lg border print:overflow-visible">
              <table className="w-full text-sm print:text-[11px]">
                <thead className="bg-muted/40 text-muted-foreground">
                  <tr>
                    <th scope="col" className="px-3 py-2 text-left text-xs font-medium">
                      {t.report.columns.metric}
                    </th>
                    <th scope="col" className={head}>{t.report.columns.readings}</th>
                    <th scope="col" className={head}>{t.report.columns.first}</th>
                    <th scope="col" className={head}>{t.report.columns.last}</th>
                    <th scope="col" className={head}>{t.report.columns.change}</th>
                    <th scope="col" className={head}>{t.report.columns.min}</th>
                    <th scope="col" className={head}>{t.report.columns.max}</th>
                    <th scope="col" className={head}>{t.report.columns.mean}</th>
                    <th scope="col" className={head}>{t.report.columns.trend}</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.metric} className="border-border border-t">
                      <th scope="row" className="px-3 py-2 text-left font-medium">
                        {metricLabel(t, row.metric)}
                      </th>
                      <td className={cell}>{row.summary.count}</td>
                      <td className={cell}>
                        {formatMetricValue(row.metric, row.first.value, language)}
                      </td>
                      <td className={cell}>
                        {formatMetricValue(row.metric, row.last.value, language)}
                      </td>
                      <td className={cell}>
                        {row.change === null
                          ? "—"
                          : formatMetricDelta(
                              row.metric,
                              row.change.delta,
                              language,
                              t.common.percentagePoints,
                            )}
                      </td>
                      <td className={cell}>
                        {formatMetricValue(row.metric, row.summary.min, language)}
                      </td>
                      <td className={cell}>
                        {formatMetricValue(row.metric, row.summary.max, language)}
                      </td>
                      <td className={cell}>
                        {formatMetricValue(row.metric, row.summary.mean, language)}
                      </td>
                      <td className={cell}>
                        {row.summary.weeklyTrend === null
                          ? "—"
                          : formatMetricDelta(
                              row.metric,
                              row.summary.weeklyTrend,
                              language,
                              t.common.percentagePoints,
                            )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-muted-foreground text-xs">{t.report.footnote}</p>
          </section>

          <section className="flex flex-col gap-3 break-inside-avoid">
            <h2 className="font-heading text-lg font-semibold">
              {metricLabel(t, leading.metric)}
            </h2>
            <ReportChart
              measurements={measurements}
              metric={leading.metric}
              period={period}
              now={now}
            />
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="font-heading text-lg font-semibold">
              {t.report.measurements}
            </h2>
            <div className="overflow-x-auto rounded-lg border print:overflow-visible">
              <table className="w-full text-sm print:text-[10px]">
                <thead className="bg-muted/40 text-muted-foreground">
                  <tr>
                    <th scope="col" className="px-3 py-2 text-left text-xs font-medium">
                      {t.measurements.measuredAt}
                    </th>
                    {MEASUREMENT_VALUE_FIELDS.map((field) => (
                      <th key={field} scope="col" className={head}>
                        {t.measurements.fields[field]}
                      </th>
                    ))}
                    <th scope="col" className={head}>{t.measurements.bmi}</th>
                    <th scope="col" className="px-3 py-2 text-left text-xs font-medium">
                      {t.measurements.note}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {measurements.map((measurement) => (
                    <tr
                      key={measurement.id}
                      className="border-border break-inside-avoid border-t"
                    >
                      <th scope="row" className="px-3 py-2 text-left font-normal whitespace-nowrap">
                        <LocalDateTime value={measurement.measuredAt} />
                      </th>
                      {MEASUREMENT_VALUE_FIELDS.map((field) => (
                        <td key={field} className={cell}>
                          {formatMeasurementValue(field, measurement[field], language) ?? "—"}
                        </td>
                      ))}
                      <td className={cell}>
                        {formatBmi(
                          roundBmi(
                            calculateBmi(
                              measurement.weightKg,
                              measurement.heightCmAtMeasurement,
                            ),
                          ),
                          language,
                        ) ?? "—"}
                      </td>
                      <td className="px-3 py-2 text-left">{measurement.note ?? ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
