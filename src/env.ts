/**
 * Environment variables, read through one checked accessor.
 *
 * Values are resolved lazily. Validating at module load would break
 * `next build`, which imports application modules without a database
 * configured; this way a missing variable fails on first use, with a readable
 * message instead of an obscure runtime error.
 */

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing required environment variable ${name}. See .env.example.`,
    );
  }
  return value;
}

function isProduction(): boolean {
  return (process.env.NODE_ENV ?? "development") === "production";
}

/** The Firebase web config the browser needs. Public by design. */
export type FirebaseWebConfig = {
  apiKey: string;
  authDomain: string;
  projectId: string;
  /** Set only in development, to talk to the local Auth emulator. */
  emulatorHost: string | null;
};

export const env = {
  /** PostgreSQL connection string. Prisma also reads this via `env()`. */
  get DATABASE_URL(): string {
    return required("DATABASE_URL");
  },
  /**
   * Origin the app is served from, exactly as users type it.
   *
   * Required in production. On the Raspberry Pi this is the LAN address; it
   * decides whether the session cookie is `Secure` and where Firebase's emails
   * send people back to.
   */
  get APP_URL(): string {
    if (isProduction()) {
      return required("APP_URL");
    }
    return process.env.APP_URL ?? "http://localhost:3000";
  },
  /**
   * The Firebase Auth emulator (`host:port`), development only. When set, the
   * Admin SDK and the browser both talk to it instead of Google, and no
   * service account is needed.
   */
  get FIREBASE_AUTH_EMULATOR_HOST(): string | null {
    return process.env.FIREBASE_AUTH_EMULATOR_HOST || null;
  },
  get FIREBASE_PROJECT_ID(): string {
    return required("FIREBASE_PROJECT_ID");
  },
  /** Read at run time and handed to the browser; not a secret. */
  get FIREBASE_WEB_CONFIG(): FirebaseWebConfig {
    return {
      apiKey: required("FIREBASE_API_KEY"),
      authDomain: required("FIREBASE_AUTH_DOMAIN"),
      projectId: required("FIREBASE_PROJECT_ID"),
      emulatorHost: process.env.FIREBASE_AUTH_EMULATOR_HOST || null,
    };
  },
  /** Service account e-mail. Secret together with the key below. */
  get FIREBASE_CLIENT_EMAIL(): string {
    return required("FIREBASE_CLIENT_EMAIL");
  },
  /** Service account private key, as copied from the JSON (`\n` escapes). */
  get FIREBASE_PRIVATE_KEY(): string {
    return required("FIREBASE_PRIVATE_KEY");
  },
  get NODE_ENV(): string {
    return process.env.NODE_ENV ?? "development";
  },
  /**
   * The commit the running image was built from, baked in by CI as a build
   * argument. Optional and never a secret: absent outside an image (`next
   * dev`, a local build), where the interface says so.
   */
  get APP_VERSION(): string | null {
    return process.env.APP_VERSION || null;
  },
} as const;
