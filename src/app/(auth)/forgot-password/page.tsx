"use client";

import { CredentialForm } from "@/components/auth/credential-form";
import { toCredentialOutcome } from "@/components/auth/outcome";
import { useBrowserAuth } from "@/lib/firebase/client";
import { useTranslations } from "@/lib/i18n/context";

/**
 * Password reset. Firebase sends the email and hosts the page where the new
 * password is chosen; the answer here is the same whether or not the address
 * has an account.
 */
export default function ForgotPasswordPage() {
  const t = useTranslations();
  const auth = useBrowserAuth();

  return (
    <CredentialForm
      title={t.auth.forgot.title}
      description={t.auth.forgot.description}
      submitLabel={t.auth.forgot.submit}
      passwordAutoComplete={null}
      newPassword={false}
      onSubmit={async ({ email }) =>
        toCredentialOutcome(t, await auth.requestPasswordReset(email), t.auth.forgot.sent)
      }
      alternate={{
        prompt: t.auth.forgot.alternatePrompt,
        href: "/login",
        label: t.auth.forgot.alternateLabel,
      }}
    />
  );
}
