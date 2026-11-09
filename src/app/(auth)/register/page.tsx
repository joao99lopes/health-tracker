"use client";

import { CredentialForm } from "@/components/auth/credential-form";
import { toCredentialOutcome } from "@/components/auth/outcome";
import { useBrowserAuth } from "@/lib/firebase/client";
import { useTranslations } from "@/lib/i18n/context";

/**
 * Registration. The account exists in Firebase straight away, but no session
 * is created until the address is confirmed: signing in before then offers to
 * send the confirmation email again.
 */
export default function RegisterPage() {
  const t = useTranslations();
  const auth = useBrowserAuth();

  return (
    <CredentialForm
      title={t.auth.register.title}
      description={t.auth.register.description}
      submitLabel={t.auth.register.submit}
      passwordAutoComplete="new-password"
      newPassword
      onSubmit={async ({ email, password }) =>
        toCredentialOutcome(
          t,
          await auth.register(email, password),
          t.auth.register.verificationSent(email),
        )
      }
      alternate={{
        prompt: t.auth.register.alternatePrompt,
        href: "/login",
        label: t.auth.register.alternateLabel,
      }}
    />
  );
}
