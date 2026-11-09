import type { CredentialOutcome } from "@/components/auth/credential-form";
import type { AuthOutcome } from "@/lib/firebase/client";
import type { Dictionary } from "@/lib/i18n/dictionary";

/**
 * A browser auth outcome as the credential form shows it.
 *
 * `sentMessage` is what "an email went out" means on the calling page: the
 * confirmation after registering, or the reset link.
 */
export function toCredentialOutcome(
  t: Dictionary,
  outcome: AuthOutcome,
  sentMessage: string,
): CredentialOutcome {
  switch (outcome.status) {
    case "ok":
      return { kind: "done" };
    case "verification-sent":
    case "reset-sent":
      return { kind: "notice", message: sentMessage };
    case "unverified":
      return {
        kind: "error",
        message: t.auth.login.unverified,
        followUp: {
          label: t.auth.login.resend,
          run: async () =>
            toCredentialOutcome(t, await outcome.resend(), t.auth.login.verificationSent),
        },
      };
    case "email-taken":
      return { kind: "error", message: t.auth.errors.emailTaken };
    case "error":
      return { kind: "error", message: t.auth.errors[outcome.key] };
  }
}
