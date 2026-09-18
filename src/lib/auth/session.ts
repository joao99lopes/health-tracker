import "server-only";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

/**
 * Server-side session access.
 *
 * This is the authoritative check. Middleware only looks at whether a session
 * cookie exists, which is enough to redirect early but proves nothing - every
 * route that reads user data must call `requireUser`.
 */

export type SessionUser = {
  id: string;
  email: string;
};

/** The signed-in user, or null. Never throws. */
export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return null;
  }
  return { id: session.user.id, email: session.user.email };
}

/**
 * The signed-in user, or a redirect to the login page.
 *
 * Returns the user id that every data query must be scoped by, so no caller
 * has an excuse to query unscoped.
 */
export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }
  return user;
}
