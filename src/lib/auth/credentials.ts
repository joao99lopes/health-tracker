import { normalizeEmail } from "./email.ts";

/**
 * Credential rules, shared by the register form and the server.
 *
 * Pure: no React, no Prisma, no environment access, so the client and the
 * server cannot drift apart on what they accept.
 */

/** Must match `emailAndPassword.minPasswordLength` in src/lib/auth.ts. */
export const PASSWORD_MIN_LENGTH = 12;

/** better-auth's own upper bound; rejecting early gives a better message. */
export const PASSWORD_MAX_LENGTH = 128;

/**
 * A deliberately permissive shape check. Real deliverability is not something
 * a regex can decide, and we do not send email yet, so this only catches
 * obvious typos.
 */
export function isPlausibleEmail(email: string): boolean {
  const normalized = normalizeEmail(email);
  return /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/.test(normalized);
}

export type CredentialIssue =
  | "EMAIL_REQUIRED"
  | "EMAIL_INVALID"
  | "PASSWORD_TOO_SHORT"
  | "PASSWORD_TOO_LONG";

/** Every problem with the supplied credentials, in display order. */
export function validateCredentials(input: {
  email: string;
  password: string;
}): CredentialIssue[] {
  const issues: CredentialIssue[] = [];

  const email = normalizeEmail(input.email);
  if (email.length === 0) {
    issues.push("EMAIL_REQUIRED");
  } else if (!isPlausibleEmail(email)) {
    issues.push("EMAIL_INVALID");
  }

  if (input.password.length < PASSWORD_MIN_LENGTH) {
    issues.push("PASSWORD_TOO_SHORT");
  } else if (input.password.length > PASSWORD_MAX_LENGTH) {
    issues.push("PASSWORD_TOO_LONG");
  }

  return issues;
}
