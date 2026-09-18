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

/**
 * Shortest secret that is worth calling one.
 *
 * better-auth only *warns* about a weak signing key and carries on, which
 * means a deployment left on the `.env.example` placeholder would sign session
 * cookies with a guessable value - forgeable sessions, no error anywhere.
 * Refusing to start is the honest response, so this is enforced in
 * development too: a secret that fails here would fail on the Raspberry Pi.
 */
const SECRET_MIN_LENGTH = 32;

export const env = {
  /** PostgreSQL connection string. Prisma also reads this via `env()`. */
  get DATABASE_URL(): string {
    return required("DATABASE_URL");
  },
  /** Signing key for session cookies. Generate with `openssl rand -base64 32`. */
  get BETTER_AUTH_SECRET(): string {
    const secret = required("BETTER_AUTH_SECRET");
    if (secret.length < SECRET_MIN_LENGTH) {
      throw new Error(
        `BETTER_AUTH_SECRET must be at least ${SECRET_MIN_LENGTH} characters ` +
          `(got ${secret.length}). Generate one with: openssl rand -base64 32`,
      );
    }
    return secret;
  },
  /**
   * Origin the app is served from, used to build auth callback URLs and to
   * check the Origin header of state-changing requests.
   *
   * Required in production. On the Raspberry Pi this is the LAN address users
   * actually type; silently falling back to localhost there would reject every
   * sign-in as cross-origin, with nothing in the logs explaining why.
   */
  get BETTER_AUTH_URL(): string {
    if (isProduction()) {
      return required("BETTER_AUTH_URL");
    }
    return process.env.BETTER_AUTH_URL ?? "http://localhost:3000";
  },
  get NODE_ENV(): string {
    return process.env.NODE_ENV ?? "development";
  },
} as const;
