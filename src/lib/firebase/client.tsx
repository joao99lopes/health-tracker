"use client";

import { useMemo } from "react";
import { getApp, getApps, initializeApp } from "@firebase/app";
import {
  GoogleAuthProvider,
  browserPopupRedirectResolver,
  connectAuthEmulator,
  createUserWithEmailAndPassword,
  inMemoryPersistence,
  initializeAuth,
  isSignInWithEmailLink,
  sendEmailVerification,
  sendPasswordResetEmail,
  sendSignInLinkToEmail,
  signInWithEmailAndPassword,
  signInWithEmailLink,
  signInWithPopup,
  signOut,
  updatePassword,
  type Auth,
  type User,
} from "@firebase/auth";
import type { FirebaseWebConfig } from "@/env";
import {
  createSessionAction,
  deleteAccountAction,
  passwordChangedAction,
  type SessionResult,
} from "@/app/(auth)/actions";
import { authErrorKey, type AuthErrorKey } from "@/lib/auth/rules";
import { callServer } from "@/lib/client/server-call";
import { useFirebaseConfig } from "@/lib/firebase/config-context";

/**
 * Firebase Auth in the browser.
 *
 * The browser talks to Firebase only to prove who someone is - a password,
 * a Google account or a one-time email link - and to ask Firebase to send its
 * emails. It never keeps a Firebase session of its own
 * - persistence is in memory and every flow signs out of Firebase when done -
 * because the app's session is the httpOnly cookie the server mints from the
 * ID token. One session, one place to end it.
 *
 * The config arrives from the server at run time (see the root layout), so
 * CI builds one image for any Firebase project.
 */

const APP_NAME = "health-tracker";

/** `initializeAuth` may run once per app, so the instance is kept here. */
let cachedAuth: Auth | null = null;

function authFor(config: FirebaseWebConfig): Auth {
  if (cachedAuth) {
    return cachedAuth;
  }
  const app = getApps().some((existing) => existing.name === APP_NAME)
    ? getApp(APP_NAME)
    : initializeApp(
        { apiKey: config.apiKey, authDomain: config.authDomain, projectId: config.projectId },
        APP_NAME,
      );
  // The popup resolver is what lets Google sign-in open its window; it is
  // opt-in with initializeAuth.
  const auth = initializeAuth(app, {
    persistence: inMemoryPersistence,
    popupRedirectResolver: browserPopupRedirectResolver,
  });
  if (config.emulatorHost) {
    connectAuthEmulator(auth, `http://${config.emulatorHost}`, { disableWarnings: true });
  }
  cachedAuth = auth;
  return auth;
}

/** Outcome of a browser auth flow, ready for the interface to explain. */
export type AuthOutcome =
  | { status: "ok" }
  | { status: "unverified"; resend: () => Promise<AuthOutcome> }
  | { status: "verification-sent" }
  | { status: "reset-sent" }
  | { status: "link-sent" }
  // Opened on another device or browser: the address is needed again.
  | { status: "needs-email" }
  | { status: "stale" }
  | { status: "email-taken" }
  | { status: "error"; key: AuthErrorKey };

function errorOutcome(error: unknown): AuthOutcome {
  const code =
    typeof error === "object" && error !== null && "code" in error
      ? String((error as { code: unknown }).code)
      : undefined;
  return { status: "error", key: authErrorKey(code) };
}

function fromSession(result: SessionResult): AuthOutcome {
  switch (result.status) {
    case "ok":
      return { status: "ok" };
    case "email-taken":
      return { status: "email-taken" };
    case "stale":
      return { status: "stale" };
    case "unverified":
    case "error":
      return { status: "error", key: "failed" };
  }
}

export type BrowserAuth = {
  signIn: (email: string, password: string) => Promise<AuthOutcome>;
  register: (email: string, password: string) => Promise<AuthOutcome>;
  requestPasswordReset: (email: string) => Promise<AuthOutcome>;
  changePassword: (email: string, current: string, next: string) => Promise<AuthOutcome>;
  signInWithGoogle: () => Promise<AuthOutcome>;
  sendSignInLink: (email: string) => Promise<AuthOutcome>;
  /** Finishes an email-link sign-in from the current URL. */
  completeSignInLink: (email: string | null) => Promise<AuthOutcome>;
  isSignInLink: () => boolean;
  deleteAccount: () => Promise<AuthOutcome>;
};

/** Where the email link sends people back to; must be an authorized domain. */
export const EMAIL_LINK_PATH = "/login/email-link";

/**
 * The address an email link was sent to, kept in this browser so opening the
 * link here needs no retyping. Storage may be unavailable (private mode):
 * then the page simply asks for the address again.
 */
const EMAIL_FOR_LINK = "health-tracker:email-for-sign-in";

function rememberEmail(email: string | null): void {
  try {
    if (email === null) {
      window.localStorage.removeItem(EMAIL_FOR_LINK);
    } else {
      window.localStorage.setItem(EMAIL_FOR_LINK, email);
    }
  } catch {
    // Not stored: the link page will ask.
  }
}

function rememberedEmail(): string | null {
  try {
    return window.localStorage.getItem(EMAIL_FOR_LINK);
  } catch {
    return null;
  }
}

/** Runs `flow`, always leaving the browser signed out of Firebase. */
async function signedOutAfter(
  auth: Auth,
  flow: () => Promise<AuthOutcome>,
): Promise<AuthOutcome> {
  try {
    return await flow();
  } catch (error) {
    return errorOutcome(error);
  } finally {
    await signOut(auth).catch(() => undefined);
  }
}

/** Signs in with the password, runs `then` with the fresh user, signs out. */
async function withFreshSignIn(
  auth: Auth,
  email: string,
  password: string,
  then: (user: User) => Promise<AuthOutcome>,
): Promise<AuthOutcome> {
  try {
    const { user } = await signInWithEmailAndPassword(auth, email, password);
    return await then(user);
  } catch (error) {
    return errorOutcome(error);
  } finally {
    await signOut(auth).catch(() => undefined);
  }
}

export function useBrowserAuth(): BrowserAuth {
  const config = useFirebaseConfig();
  if (config === null) {
    throw new Error("useBrowserAuth needs a FirebaseProvider above it.");
  }

  return useMemo(() => {
    const auth = () => authFor(config);

    return {
      signIn: (email, password) =>
        withFreshSignIn(auth(), email, password, async (user) => {
          if (!user.emailVerified) {
            // Kept signed in to Firebase only long enough to offer a resend.
            return {
              status: "unverified",
              resend: () =>
                withFreshSignIn(auth(), email, password, async (again) => {
                  await sendEmailVerification(again);
                  return { status: "verification-sent" };
                }),
            };
          }
          return fromSession(await createSessionAction(await user.getIdToken()));
        }),

      register: async (email, password) => {
        try {
          const { user } = await createUserWithEmailAndPassword(auth(), email, password);
          await sendEmailVerification(user);
          return { status: "verification-sent" };
        } catch (error) {
          return errorOutcome(error);
        } finally {
          await signOut(auth()).catch(() => undefined);
        }
      },

      requestPasswordReset: async (email) => {
        try {
          await sendPasswordResetEmail(auth(), email);
        } catch (error) {
          // Whether an account exists is not something to reveal here.
          const outcome = errorOutcome(error);
          if (outcome.status === "error" && outcome.key !== "invalidCredentials") {
            return outcome;
          }
        }
        return { status: "reset-sent" };
      },

      changePassword: async (email, current, next) => {
        const changed = await withFreshSignIn(auth(), email, current, async (user) => {
          await updatePassword(user, next);
          return { status: "ok" };
        });
        if (changed.status !== "ok") {
          return changed;
        }
        // Signing in again with the new password gives a token whose sign-in
        // time is after the change: the server ends every session older than
        // it, and Firebase does not count this one among the revoked.
        return withFreshSignIn(auth(), email, next, async (user) =>
          fromSession(await passwordChangedAction(await user.getIdToken())),
        );
      },

      signInWithGoogle: () =>
        signedOutAfter(auth(), async () => {
          const provider = new GoogleAuthProvider();
          // Always offer the account chooser, so a shared computer does not
          // silently reuse whoever signed in to Google last.
          provider.setCustomParameters({ prompt: "select_account" });
          const { user } = await signInWithPopup(auth(), provider);
          // Google vouches for the address: no verification email needed.
          return fromSession(await createSessionAction(await user.getIdToken()));
        }),

      sendSignInLink: async (email) => {
        try {
          await sendSignInLinkToEmail(auth(), email, {
            // The host the person is using now, so the link comes back here.
            url: `${window.location.origin}${EMAIL_LINK_PATH}`,
            handleCodeInApp: true,
          });
          rememberEmail(email);
          return { status: "link-sent" };
        } catch (error) {
          return errorOutcome(error);
        }
      },

      isSignInLink: () => isSignInWithEmailLink(auth(), window.location.href),

      completeSignInLink: (typedEmail) =>
        signedOutAfter(auth(), async () => {
          const href = window.location.href;
          if (!isSignInWithEmailLink(auth(), href)) {
            return { status: "error", key: "invalidLink" };
          }
          const email = typedEmail ?? rememberedEmail();
          if (email === null) {
            return { status: "needs-email" };
          }
          const { user } = await signInWithEmailLink(auth(), email, href);
          rememberEmail(null);
          return fromSession(await createSessionAction(await user.getIdToken()));
        }),

      deleteAccount: async () => {
        const result = await callServer(deleteAccountAction);
        // No answer means nothing is known to be deleted; say it was the
        // connection, not the account, that failed.
        return result.status === "unreachable"
          ? { status: "error", key: "network" }
          : fromSession(result);
      },
    } satisfies BrowserAuth;
  }, [config]);
}
