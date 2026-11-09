"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/session";
import {
  IMPORT_MAX_BYTES,
  planImport,
  type ImportIssue,
} from "@/lib/data-transfer/import";
import {
  createMeasurements,
  listMeasurementInstants,
} from "@/lib/measurements/queries";
import { getProfile } from "@/lib/profile/queries";

/** Enough to fix a file by; a file with more problems is not the right file. */
const MAX_REPORTED_ISSUES = 50;

export type ImportResult =
  | { status: "imported"; imported: number; skippedDuplicates: number }
  | { status: "invalid"; issues: ImportIssue[]; totalIssues: number }
  | { status: "error" };

/**
 * Imports measurements from CSV text for the signed-in user.
 *
 * The browser has already shown a preview from the same planning function;
 * this runs it again against the database's current state, because the
 * browser's answer is a convenience, not a guarantee. One INSERT writes every
 * row, so an import lands whole or not at all.
 */
export async function importMeasurementsAction(
  text: string,
): Promise<ImportResult> {
  const user = await requireUser();

  // Checked before any parsing work, on characters (cheap) as well as bytes
  // inside planImport.
  if (typeof text !== "string" || text.length > IMPORT_MAX_BYTES) {
    return {
      status: "invalid",
      issues: [{ line: 0, code: "FILE_TOO_LARGE" }],
      totalIssues: 1,
    };
  }

  const [profile, existing] = await Promise.all([
    getProfile(user.id),
    listMeasurementInstants(user.id),
  ]);
  const plan = planImport(text, {
    existing,
    profileHeightCm: profile?.heightCm ?? null,
  });
  if (plan.status === "invalid") {
    return {
      status: "invalid",
      issues: plan.issues.slice(0, MAX_REPORTED_ISSUES),
      totalIssues: plan.issues.length,
    };
  }

  try {
    const imported =
      plan.rows.length > 0 ? await createMeasurements(user.id, plan.rows) : 0;
    revalidatePath("/");
    revalidatePath("/measurements");
    return {
      status: "imported",
      imported,
      skippedDuplicates: plan.skippedDuplicates,
    };
  } catch {
    return { status: "error" };
  }
}
