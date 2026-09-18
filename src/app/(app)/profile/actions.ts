"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/session";
import { saveProfile } from "@/lib/profile/queries";
import {
  parseProfileInput,
  type ProfileInput,
  type ProfileIssue,
} from "@/lib/profile/validation";

export type SaveProfileResult =
  | { status: "saved" }
  | { status: "invalid"; issues: ProfileIssue[] }
  | { status: "error" };

/**
 * Saves the signed-in user's profile.
 *
 * The client validates first for immediate feedback; this validates again
 * because the client's check is a convenience, not a guarantee. The row is
 * addressed by the session's user id only - nothing here takes an id from the
 * request.
 */
export async function saveProfileAction(
  input: ProfileInput,
): Promise<SaveProfileResult> {
  const user = await requireUser();

  const result = parseProfileInput(input);
  if (!result.profile) {
    return { status: "invalid", issues: result.issues };
  }

  try {
    await saveProfile(user.id, result.profile);
  } catch {
    return { status: "error" };
  }

  // The language preference is read on the server for every page, so the whole
  // tree has to re-render when it changes.
  revalidatePath("/", "layout");
  return { status: "saved" };
}
