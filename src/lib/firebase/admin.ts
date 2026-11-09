import "server-only";

import { cert, getApp, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { env } from "@/env";
import { normalisePrivateKey } from "@/lib/auth/rules";

/**
 * The Firebase Admin SDK, initialised on first use.
 *
 * Only the `app` and `auth` entry points are imported, so Firestore, Storage
 * and their gRPC stack never reach the server bundle.
 *
 * Against the emulator (`FIREBASE_AUTH_EMULATOR_HOST`, development only) the
 * SDK needs a project id and nothing else; the variable is read by the SDK
 * itself. In production it authenticates with the service account.
 */

const APP_NAME = "health-tracker";

function adminApp(): App {
  if (getApps().some((app) => app.name === APP_NAME)) {
    return getApp(APP_NAME);
  }
  if (env.FIREBASE_AUTH_EMULATOR_HOST) {
    return initializeApp({ projectId: env.FIREBASE_PROJECT_ID }, APP_NAME);
  }
  return initializeApp(
    {
      projectId: env.FIREBASE_PROJECT_ID,
      credential: cert({
        projectId: env.FIREBASE_PROJECT_ID,
        clientEmail: env.FIREBASE_CLIENT_EMAIL,
        privateKey: normalisePrivateKey(env.FIREBASE_PRIVATE_KEY),
      }),
    },
    APP_NAME,
  );
}

export function adminAuth(): Auth {
  return getAuth(adminApp());
}
