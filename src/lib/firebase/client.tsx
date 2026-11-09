"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { getApp, getApps, initializeApp } from "@firebase/app";
import {
  connectAuthEmulator,
  createUserWithEmailAndPassword,
  inMemoryPersistence,
  initializeAuth,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
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

/**
 * Firebase Auth in the browser.
 *
 * The browser talks to Firebase only to prove the password (and to ask
 * Firebase to send its emails). It never keeps a Firebase session of its own
 * - persistence is in memory and every flow signs out of Firebase when done -
 * because the app's session is the httpOnly cookie the server mints from the
 * ID token. One session, one place to end it.
 *
 * The config arrives from the server at run time (see the root layout), so
 * CI builds one image for any Firebase project.
 */

const FirebaseConfigContext = createContext<FirebaseWebConfig | null>(null);

export function FirebaseProvider({
  config,
  children,
}: {
  config: FirebaseWebConfig;
  children: ReactNode;
}) {
  return (
    <FirebaseConfigContext.Provider value={config}>
      {children}
    </FirebaseConfigContext.Provider>
  );
}

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
  const auth = initializeAuth(app, { persistence: inMemoryPersistence });
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
  deleteAccount: (email: string, password: string) => Promise<AuthOutcome>;
};

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
  const config = useContext(FirebaseConfigContext);
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

      deleteAccount: (email, password) =>
        withFreshSignIn(auth(), email, password, async (user) =>
          fromSession(await deleteAccountAction(await user.getIdToken())),
        ),
    } satisfies BrowserAuth;
  }, [config]);
}
