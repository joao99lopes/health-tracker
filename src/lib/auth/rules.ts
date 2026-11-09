/**
 * Authentication rules that need no network, no Firebase SDK and no database,
 * so they can be unit-tested and shared by the server and the browser.
 *
 * Firebase Auth owns the passwords; this app owns the session. A signed-in
 * browser holds an httpOnly Firebase *session cookie*, minted by the server
 * from a fresh ID token and verified locally on every request.
 *
 * This module is pure: no Next, no Prisma, no environment access.
 */

/** Name of the httpOnly session cookie. */
export const SESSION_COOKIE = "session";

/**
 * How long a session lasts. Firebase allows session cookies between five
 * minutes and two weeks; two weeks keeps a phone signed in without a password
 * every few days.
 */
export const SESSION_MAX_AGE_SECONDS = 14 * 24 * 60 * 60;

/**
 * An ID token is only exchanged for a session when the password was typed
 * this recently. A token stolen later, or minted from a long-lived refresh
 * token, cannot be turned into a fresh two-week session.
 */
export const RECENT_SIGN_IN_SECONDS = 5 * 60;

/** Whether `authTime` (seconds since the epoch) is a sign-in made just now. */
export function isRecentSignIn(authTimeSeconds: number, now: Date): boolean {
  const ageSeconds = now.getTime() / 1000 - authTimeSeconds;
  // A small negative age is clock skew between Google and this machine.
  return ageSeconds >= -60 && ageSeconds <= RECENT_SIGN_IN_SECONDS;
}

/**
 * Whether a session is still honoured after the user asked to end sessions
 * (a password change ends every other session).
 *
 * Session cookies are verified without asking Google whether they were
 * revoked - that would be a network round trip on every page load from a
 * Raspberry Pi. Instead the user row keeps the instant from which sessions
 * count, and a session whose sign-in predates it is refused. Firebase's
 * `auth_time` has one-second precision, so the comparison is in seconds.
 */
export function isSessionCurrent(
  authTimeSeconds: number,
  sessionsValidAfter: Date | null,
): boolean {
  if (sessionsValidAfter === null) {
    return true;
  }
  return authTimeSeconds >= Math.floor(sessionsValidAfter.getTime() / 1000);
}

/** Cookie attributes. `Secure` only when the app is served over HTTPS. */
export function sessionCookieOptions(appUrl: string): {
  httpOnly: true;
  secure: boolean;
  sameSite: "lax";
  path: "/";
  maxAge: number;
} {
  return {
    httpOnly: true,
    secure: appUrl.startsWith("https://"),
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  };
}

/**
 * Which application user a verified Firebase identity is.
 *
 * - Already linked by Firebase uid: that user.
 * - Otherwise, an existing user with the same (normalised) email - an account
 *   from before Firebase, or created by the migration script - is linked, but
 *   only once Firebase says the address is verified. Linking on an
 *   unverified address would hand someone's measurements to whoever
 *   registered their email first.
 * - Otherwise a new user is created.
 */
export type LinkDecision =
  | { action: "use"; userId: string }
  | { action: "link"; userId: string }
  | { action: "create" }
  | { action: "refuse"; reason: "EMAIL_NOT_VERIFIED" | "EMAIL_TAKEN" };

export function decideAccountLink(input: {
  byUid: { id: string } | null;
  byEmail: { id: string; firebaseUid: string | null } | null;
  emailVerified: boolean;
}): LinkDecision {
  if (input.byUid) {
    return { action: "use", userId: input.byUid.id };
  }
  if (!input.emailVerified) {
    return { action: "refuse", reason: "EMAIL_NOT_VERIFIED" };
  }
  if (input.byEmail) {
    // The address belongs to a user already linked to another Firebase
    // account: never re-point it.
    if (input.byEmail.firebaseUid !== null) {
      return { action: "refuse", reason: "EMAIL_TAKEN" };
    }
    return { action: "link", userId: input.byEmail.id };
  }
  return { action: "create" };
}

/**
 * Firebase Auth error codes the interface explains, mapped to message keys.
 * Anything else is a generic failure: the raw code is not shown to users.
 *
 * Wrong email and wrong password deliberately share one message, as Firebase
 * itself now reports both as `invalid-credential`.
 */
export type AuthErrorKey =
  | "invalidCredentials"
  | "emailInUse"
  | "weakPassword"
  | "tooManyRequests"
  | "network"
  | "failed";

export function authErrorKey(code: string | undefined): AuthErrorKey {
  switch (code) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
    case "auth/invalid-email":
    case "auth/user-disabled":
      return "invalidCredentials";
    case "auth/email-already-in-use":
      return "emailInUse";
    case "auth/weak-password":
    case "auth/password-does-not-meet-requirements":
      return "weakPassword";
    case "auth/too-many-requests":
      return "tooManyRequests";
    case "auth/network-request-failed":
      return "network";
    default:
      return "failed";
  }
}

/**
 * The service account private key as Node's crypto wants it.
 *
 * In a `.env` file the PEM is one line with literal `\n` sequences, as it
 * appears in the downloaded JSON; some tools also keep the surrounding quotes.
 */
export function normalisePrivateKey(raw: string): string {
  const trimmed = raw.trim();
  const quoted =
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"));
  // Only quotes are stripped: a key that is already proper PEM keeps its
  // trailing line break.
  const key = quoted ? trimmed.slice(1, -1) : raw;
  return key.replaceAll("\\n", "\n");
}
