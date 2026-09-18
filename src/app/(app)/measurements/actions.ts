"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/session";
import {
  createMeasurement,
  deleteMeasurement,
  updateMeasurement,
} from "@/lib/measurements/queries";
import {
  parseMeasurementInput,
  type MeasurementInput,
  type MeasurementIssue,
} from "@/lib/measurements/validation";
import { getProfile } from "@/lib/profile/queries";

/**
 * Server actions for measurements.
 *
 * Each one starts from `requireUser()` and passes that id to every query, so
 * no row is ever addressed by id alone. The client validates first for
 * immediate feedback; these validate again because the client's check is a
 * convenience, not a guarantee.
 */

export type SaveMeasurementResult =
  | { status: "saved"; id: string }
  | { status: "invalid"; issues: MeasurementIssue[] }
  | { status: "no-height" }
  | { status: "not-found" }
  | { status: "error" };

export type DeleteMeasurementResult =
  | { status: "deleted" }
  | { status: "not-found" }
  | { status: "error" };

/** Everything a measurement page shows has to be re-read after a write. */
function revalidateMeasurements(id?: string): void {
  revalidatePath("/measurements");
  if (id) {
    revalidatePath(`/measurements/${id}`);
  }
}

/**
 * Adds a measurement for the signed-in user.
 *
 * The height is not taken from the request: it is read from the profile here
 * and stamped onto the row, which is what lets this measurement's BMI stay
 * put when the profile's height later changes.
 */
export async function createMeasurementAction(
  input: MeasurementInput,
): Promise<SaveMeasurementResult> {
  const user = await requireUser();

  const result = parseMeasurementInput(input);
  if (!result.measurement) {
    return { status: "invalid", issues: result.issues };
  }

  const profile = await getProfile(user.id);
  if (!profile) {
    return { status: "no-height" };
  }

  try {
    const id = await createMeasurement(
      user.id,
      result.measurement,
      profile.heightCm,
    );
    revalidateMeasurements(id);
    return { status: "saved", id };
  } catch {
    return { status: "error" };
  }
}

/**
 * Edits a measurement.
 *
 * `heightCmAtMeasurement` is untouched by design - see
 * `updateMeasurement`. Changing it would silently rewrite the measurement's
 * BMI, which is not what editing a weight means.
 */
export async function updateMeasurementAction(
  id: string,
  input: MeasurementInput,
): Promise<SaveMeasurementResult> {
  const user = await requireUser();

  const result = parseMeasurementInput(input);
  if (!result.measurement) {
    return { status: "invalid", issues: result.issues };
  }

  try {
    const updated = await updateMeasurement(user.id, id, result.measurement);
    if (!updated) {
      return { status: "not-found" };
    }
    revalidateMeasurements(id);
    return { status: "saved", id };
  } catch {
    return { status: "error" };
  }
}

/** Deletes a measurement. The interface confirms before calling this. */
export async function deleteMeasurementAction(
  id: string,
): Promise<DeleteMeasurementResult> {
  const user = await requireUser();

  try {
    const deleted = await deleteMeasurement(user.id, id);
    if (!deleted) {
      return { status: "not-found" };
    }
    revalidateMeasurements(id);
    return { status: "deleted" };
  } catch {
    return { status: "error" };
  }
}
