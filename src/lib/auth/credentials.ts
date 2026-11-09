import { normalizeEmail } from "./email.ts";

/**
 * Credential rules, shared by every form that takes an email or a password.
 *
 * Pure: no React, no Prisma, no environment access, so the forms cannot
 * drift apart on what they accept. Firebase applies its own password policy
 * on top; keep its minimum in step with PASSWORD_MIN_LENGTH.
 */

/**
 * Enforced by the register and change-password forms. Set the same minimum in
 * Firebase (Authentication -> Settings -> Password policy) so the reset page
 * Firebase hosts cannot accept shorter passwords.
 */
export const PASSWORD_MIN_LENGTH = 12;

/** Firebase's own upper bound is 4096; this keeps typos and pastes sane. */
export const PASSWORD_MAX_LENGTH = 128;

/**
 * A deliberately permissive shape check. Real deliverability is not something
 * a regex can decide - Firebase's verification email does that - so this
 * only catches obvious typos.
 */
export function isPlausibleEmail(email: string): boolean {
  const normalized = normalizeEmail(email);
  return /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/.test(normalized);
}

export type CredentialIssue =
  | "EMAIL_REQUIRED"
  | "EMAIL_INVALID"
  | "PASSWORD_REQUIRED"
  | "PASSWORD_TOO_SHORT"
  | "PASSWORD_TOO_LONG";

/**
 * Every problem with the supplied credentials, in display order.
 *
 * `passwordRules: false` is for signing in: an existing password is whatever
 * Firebase accepted when it was set (its own reset page included), so only
 * its presence is checked. New passwords get the full length rules.
 */
export function validateCredentials(
  input: { email: string; password: string },
  options: { passwordRules: boolean } = { passwordRules: true },
): CredentialIssue[] {
  if (!options.passwordRules) {
    const issues = validateEmail(input.email);
    if (input.password.length === 0) {
      issues.push("PASSWORD_REQUIRED");
    }
    return issues;
  }
  return [...validateEmail(input.email), ...validateNewPassword(input.password)];
}

/** Problems with an email address alone. */
export function validateEmail(email: string): CredentialIssue[] {
  const normalized = normalizeEmail(email);
  if (normalized.length === 0) {
    return ["EMAIL_REQUIRED"];
  }
  return isPlausibleEmail(normalized) ? [] : ["EMAIL_INVALID"];
}

/** Problems with a password being chosen (registration, change). */
export function validateNewPassword(password: string): CredentialIssue[] {
  if (password.length < PASSWORD_MIN_LENGTH) {
    return ["PASSWORD_TOO_SHORT"];
  }
  if (password.length > PASSWORD_MAX_LENGTH) {
    return ["PASSWORD_TOO_LONG"];
  }
  return [];
}
