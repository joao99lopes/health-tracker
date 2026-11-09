import "server-only";

import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { adminAuth } from "@/lib/firebase/admin";
import { SESSION_COOKIE, isSessionCurrent } from "@/lib/auth/rules";

/**
 * Server-side session access.
 *
 * This is the authoritative check. The proxy only looks at whether a session
 * cookie exists, which is enough to redirect early but proves nothing - every
 * route that reads user data must call `requireUser`.
 *
 * The cookie is a Firebase session cookie. It is verified locally against
 * Google's published signing keys (cached by the Admin SDK), not by asking
 * Google on every request: a page load on the Pi costs no network round trip.
 * Revocation is handled here instead - see `isSessionCurrent`.
 */

export type SessionUser = {
  id: string;
  email: string;
  firebaseUid: string;
  /** When this session's sign-in happened, in seconds since the epoch. */
  authTime: number;
};

/**
 * The signed-in user, or null. Never throws.
 *
 * Wrapped in `cache` so the layout, the page and the translations of one
 * request verify the cookie and read the user row once between them.
 */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const cookie = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!cookie) {
    return null;
  }

  let uid: string;
  let authTime: number;
  try {
    const decoded = await adminAuth().verifySessionCookie(cookie);
    uid = decoded.uid;
    authTime = decoded.auth_time;
  } catch {
    // Expired, malformed, or signed by someone else: simply not signed in.
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { firebaseUid: uid },
    select: { id: true, email: true, sessionsValidAfter: true },
  });
  if (!user || !isSessionCurrent(authTime, user.sessionsValidAfter)) {
    return null;
  }
  return { id: user.id, email: user.email, firebaseUid: uid, authTime };
});

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
