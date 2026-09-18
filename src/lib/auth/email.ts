/**
 * Email normalisation, shared by the server and the client so both agree on
 * what counts as the same account.
 *
 * Scope is deliberately conservative: trim surrounding whitespace and lowercase
 * the address. We do not strip dots or `+tags` - that is provider-specific
 * behaviour, and treating `a.b@gmail.com` and `ab@gmail.com` as one account
 * would be wrong for every provider that does not work like Gmail.
 */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
