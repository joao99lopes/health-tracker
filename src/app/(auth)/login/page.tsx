"use client";

import { CredentialForm } from "@/components/auth/credential-form";
import { signIn } from "@/lib/auth-client";
import { useTranslations } from "@/lib/i18n/context";

export default function LoginPage() {
  const t = useTranslations();

  return (
    <CredentialForm
      title={t.auth.login.title}
      description={t.auth.login.description}
      submitLabel={t.auth.login.submit}
      passwordAutoComplete="current-password"
      onSubmit={async ({ email, password }) => {
        const { error } = await signIn.email({ email, password });
        return error ? { error: t.auth.login.failed } : {};
      }}
      alternate={{
        prompt: t.auth.login.alternatePrompt,
        href: "/register",
        label: t.auth.login.alternateLabel,
      }}
    />
  );
}
