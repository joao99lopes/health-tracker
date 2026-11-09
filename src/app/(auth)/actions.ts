"use server";

import { cookies } from "next/headers";
import { env } from "@/env";
import { prisma } from "@/lib/db";
import { adminAuth } from "@/lib/firebase/admin";
import { getSessionUser } from "@/lib/auth/session";
import { normalizeEmail } from "@/lib/auth/email";
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
  decideAccountLink,
  isRecentSignIn,
  sessionCookieOptions,
} from "@/lib/auth/rules";

/**
 * Session and account actions.
 *
 * The browser signs in with Firebase and sends the resulting ID token here;
 * nothing else from the browser is trusted. Every action verifies that token
 * with the Admin SDK and, before minting a session or changing an account,
 * that the password was typed in the last few minutes (`isRecentSignIn`).
 *
 * Server actions only accept same-origin requests (Next compares Origin with
 * Host), which is the CSRF protection for all of these.
 */

export type SessionResult =
  | { status: "ok" }
  | { status: "unverified" }
  | { status: "email-taken" }
  | { status: "stale" }
  | { status: "error" };

type VerifiedToken = {
  uid: string;
  email: string;
  emailVerified: boolean;
  authTime: number;
};

/**
 * Server log line for an auth failure. Only the step and the error's code or
 * message - never a token, a cookie or an address - so the log stays safe to
 * read and share.
 */
function logFailure(step: string, error: unknown): void {
  const detail =
    typeof error === "object" && error !== null && "code" in error
      ? String((error as { code: unknown }).code)
      : error instanceof Error
        ? error.message
        : String(error);
  console.error(`[auth] ${step} failed: ${detail}`);
}

/** The token's claims, or null when it is not a fresh, valid Firebase token. */
async function verifyFreshToken(idToken: string): Promise<VerifiedToken | "stale" | null> {
  if (typeof idToken !== "string" || idToken.length === 0) {
    return null;
  }
  try {
    const decoded = await adminAuth().verifyIdToken(idToken);
    if (!decoded.email) {
      return null;
    }
    if (!isRecentSignIn(decoded.auth_time, new Date())) {
      return "stale";
    }
    return {
      uid: decoded.uid,
      email: normalizeEmail(decoded.email),
      emailVerified: decoded.email_verified === true,
      authTime: decoded.auth_time,
    };
  } catch (error) {
    logFailure("verifyIdToken", error);
    return null;
  }
}

async function setSessionCookie(idToken: string): Promise<void> {
  const value = await adminAuth().createSessionCookie(idToken, {
    expiresIn: SESSION_MAX_AGE_SECONDS * 1000,
  });
  (await cookies()).set(SESSION_COOKIE, value, sessionCookieOptions(env.APP_URL));
}

/**
 * Turns a fresh Firebase sign-in into an app session, linking or creating
 * the user row on the way (see `decideAccountLink`).
 */
export async function createSessionAction(idToken: string): Promise<SessionResult> {
  const token = await verifyFreshToken(idToken);
  if (token === null) return { status: "error" };
  if (token === "stale") return { status: "stale" };

  try {
    const [byUid, byEmail] = await Promise.all([
      prisma.user.findUnique({ where: { firebaseUid: token.uid }, select: { id: true } }),
      prisma.user.findUnique({
        where: { email: token.email },
        select: { id: true, firebaseUid: true },
      }),
    ]);
    const decision = decideAccountLink({
      byUid,
      byEmail,
      emailVerified: token.emailVerified,
    });

    switch (decision.action) {
      case "refuse":
        return {
          status: decision.reason === "EMAIL_NOT_VERIFIED" ? "unverified" : "email-taken",
        };
      case "link":
        await prisma.user.update({
          where: { id: decision.userId },
          data: { firebaseUid: token.uid },
        });
        break;
      case "create":
        await prisma.user.create({
          data: { email: token.email, firebaseUid: token.uid },
        });
        break;
      case "use":
        break;
    }

    await setSessionCookie(idToken);
    return { status: "ok" };
  } catch (error) {
    logFailure("createSession", error);
    // Includes two first sign-ins racing on the unique email or uid: the
    // loser fails here, and simply signing in again finds the row.
    return { status: "error" };
  }
}

/** Ends this browser's session. Other devices are unaffected. */
export async function signOutAction(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
}

/**
 * After the browser changed the password with Firebase and signed in again
 * with the new one: ends every other session and gives this browser a new one.
 *
 * The user is identified by the token, not by the current cookie. The token
 * was minted moments ago from the new password, which is stronger proof than
 * the cookie - and Firebase may already treat the old cookie as revoked by
 * the password change (the emulator always does).
 */
export async function passwordChangedAction(idToken: string): Promise<SessionResult> {
  const token = await verifyFreshToken(idToken);
  if (token === null) return { status: "error" };
  if (token === "stale") return { status: "stale" };

  try {
    const updated = await prisma.user.updateMany({
      where: { firebaseUid: token.uid },
      data: { sessionsValidAfter: new Date(token.authTime * 1000) },
    });
    if (updated.count === 0) {
      logFailure("passwordChanged", "no user for this Firebase account");
      return { status: "error" };
    }
    await setSessionCookie(idToken);
    return { status: "ok" };
  } catch (error) {
    logFailure("passwordChanged", error);
    return { status: "error" };
  }
}

/**
 * Deletes the signed-in account: every measurement and the profile (by
 * cascade), then the Firebase account, then this browser's session.
 *
 * Only from a session signed in within the last few minutes, whichever way
 * (password, Google or email link) - so an unlocked phone left signed in for
 * days cannot erase everything. An older session gets "stale", and the
 * interface asks for a fresh sign-in first.
 */
export async function deleteAccountAction(): Promise<SessionResult> {
  const user = await getSessionUser();
  if (!user) {
    logFailure("deleteAccount", "no current session");
    return { status: "error" };
  }
  if (!isRecentSignIn(user.authTime, new Date())) {
    return { status: "stale" };
  }

  try {
    const deleted = await prisma.user.deleteMany({
      where: { id: user.id, firebaseUid: user.firebaseUid },
    });
    if (deleted.count === 0) {
      logFailure("deleteAccount", "no user row for this session");
      return { status: "error" };
    }
  } catch (error) {
    logFailure("deleteAccount", error);
    return { status: "error" };
  }
  // The data is gone at this point; a Firebase failure only leaves an empty
  // login behind, which signing in again would reuse.
  try {
    await adminAuth().deleteUser(user.firebaseUid);
  } catch (error) {
    // Logged, not reported to the user: they asked for their data to go,
    // and it has.
    logFailure("deleteFirebaseUser", error);
  }
  (await cookies()).delete(SESSION_COOKIE);
  return { status: "ok" };
}
