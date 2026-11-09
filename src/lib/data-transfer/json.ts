import type { ExportableMeasurement } from "./csv.ts";

/**
 * The JSON export: everything the app holds about one user, in one document.
 *
 * Unlike the CSV it includes the profile, because it is meant as the user's
 * complete copy of their data. Field names match the CSV columns, and
 * instants are ISO 8601 in UTC. `formatVersion` lets a future reader tell
 * layouts apart if this ever changes.
 *
 * This module is pure: no Prisma, no React, no environment access.
 */

export const JSON_EXPORT_FORMAT_VERSION = 1;

export type ExportableProfile = {
  name: string | null;
  birthDate: string;
  sex: string;
  heightCm: number;
  language: string;
  directions: Record<string, string>;
};

export type JsonExport = {
  formatVersion: number;
  exportedAt: string;
  account: { email: string };
  profile: ExportableProfile | null;
  measurements: Array<
    Omit<ExportableMeasurement, "measuredAt"> & { measuredAt: string }
  >;
};

export function buildJsonExport(input: {
  exportedAt: Date;
  email: string;
  profile: ExportableProfile | null;
  measurements: readonly ExportableMeasurement[];
}): JsonExport {
  return {
    formatVersion: JSON_EXPORT_FORMAT_VERSION,
    exportedAt: input.exportedAt.toISOString(),
    account: { email: input.email },
    profile: input.profile,
    measurements: [...input.measurements]
      .sort((a, b) => a.measuredAt.getTime() - b.measuredAt.getTime())
      .map((measurement) => ({
        measuredAt: measurement.measuredAt.toISOString(),
        weightKg: measurement.weightKg,
        bodyFatPercent: measurement.bodyFatPercent,
        hydrationPercent: measurement.hydrationPercent,
        musclePercent: measurement.musclePercent,
        boneMassKg: measurement.boneMassKg,
        visceralFat: measurement.visceralFat,
        abdominalCircumferenceCm: measurement.abdominalCircumferenceCm,
        heightCmAtMeasurement: measurement.heightCmAtMeasurement,
        note: measurement.note,
      })),
  };
}

/** `health-tracker-2026-09-18.csv` - the date the file was made, in UTC. */
export function exportFileName(exportedAt: Date, extension: "csv" | "json"): string {
  return `health-tracker-${exportedAt.toISOString().slice(0, 10)}.${extension}`;
}
