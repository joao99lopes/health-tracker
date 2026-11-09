"use client";

import { AlternativeSignIn } from "@/components/auth/alternative-sign-in";
import { CredentialForm } from "@/components/auth/credential-form";
import { toCredentialOutcome } from "@/components/auth/outcome";
import { useBrowserAuth } from "@/lib/firebase/client";
import { useTranslations } from "@/lib/i18n/context";

export default function LoginPage() {
  const t = useTranslations();
  const auth = useBrowserAuth();

  return (
    <CredentialForm
      title={t.auth.login.title}
      description={t.auth.login.description}
      submitLabel={t.auth.login.submit}
      passwordAutoComplete="current-password"
      newPassword={false}
      passwordHelp={{ href: "/forgot-password", label: t.auth.login.forgot }}
      onSubmit={async ({ email, password }) =>
        toCredentialOutcome(
          t,
          await auth.signIn(email, password),
          t.auth.login.verificationSent,
        )
      }
      alternatives={<AlternativeSignIn />}
      alternate={{
        prompt: t.auth.login.alternatePrompt,
        href: "/register",
        label: t.auth.login.alternateLabel,
      }}
    />
  );
}
