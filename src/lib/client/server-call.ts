/**
 * Calling a server action from the browser without hanging on a failure.
 *
 * A server action is a `fetch` underneath. When the request never completes -
 * the phone left the Wi-Fi, the Pi is restarting - the promise rejects with a
 * `TypeError`, and code that awaited it never reaches the line that clears its
 * "Saving…" state. Every caller would need the same `try`; this is that `try`,
 * once.
 *
 * What it does *not* swallow: Next.js signals a `redirect()` or `notFound()`
 * inside an action by rejecting with an error whose `digest` starts with
 * `NEXT_`. Those are navigation, not failure, and are rethrown untouched.
 *
 * This module is pure: no React, no Next.js imports, so it runs in the unit
 * tests as it is.
 */

/** The request did not produce an answer, so nothing is known to be saved. */
export type Unreachable = { status: "unreachable" };

export const UNREACHABLE: Unreachable = { status: "unreachable" };

function isNavigationSignal(error: unknown): boolean {
  if (typeof error !== "object" || error === null || !("digest" in error)) {
    return false;
  }
  const { digest } = error as { digest: unknown };
  return typeof digest === "string" && digest.startsWith("NEXT_");
}

/** `action()`'s result, or `UNREACHABLE` when the call itself failed. */
export async function callServer<T>(
  action: () => Promise<T>,
): Promise<T | Unreachable> {
  try {
    return await action();
  } catch (error) {
    if (isNavigationSignal(error)) {
      throw error;
    }
    return UNREACHABLE;
  }
}
