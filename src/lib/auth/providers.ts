import "server-only";

import { adminAuth } from "@/lib/firebase/admin";

/**
 * Whether a Firebase account has the email provider (password or email
 * link - Firebase reports both as "password").
 *
 * Asked only by the profile page, so its one network call is not on every
 * request. If Firebase cannot be reached the answer is "yes": showing the
 * change-password form to someone without a password costs a clear error
 * message, hiding it from someone with one would cost the feature.
 */
export async function hasEmailProvider(firebaseUid: string): Promise<boolean> {
  try {
    const record = await adminAuth().getUser(firebaseUid);
    return record.providerData.some((provider) => provider.providerId === "password");
  } catch {
    return true;
  }
}
