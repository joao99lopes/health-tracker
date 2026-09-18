"use client";

import { CredentialForm } from "@/components/auth/credential-form";
import { signUp } from "@/lib/auth-client";
import { useTranslations } from "@/lib/i18n/context";

export default function RegisterPage() {
  const t = useTranslations();

  return (
    <CredentialForm
      title={t.auth.register.title}
      description={t.auth.register.description}
      submitLabel={t.auth.register.submit}
      passwordAutoComplete="new-password"
      onSubmit={async ({ email, password }) => {
        const { error } = await signUp.email({
          email,
          password,
          // better-auth requires a name; the product's optional display name
          // lives on the profile.
          name: "",
        });
        if (!error) {
          return {};
        }
        // better-auth reports a duplicate address as a 422 with this code.
        if (error.code === "USER_ALREADY_EXISTS") {
          return { error: t.auth.register.duplicate };
        }
        return { error: t.auth.register.failed };
      }}
      alternate={{
        prompt: t.auth.register.alternatePrompt,
        href: "/login",
        label: t.auth.register.alternateLabel,
      }}
    />
  );
}
