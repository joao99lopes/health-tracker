"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { LoaderCircleIcon } from "lucide-react";
import { CredentialForm } from "@/components/auth/credential-form";
import { toCredentialOutcome } from "@/components/auth/outcome";
import { Card, CardContent } from "@/components/ui/card";
import { useHydrated } from "@/hooks/use-hydrated";
import { useBrowserAuth } from "@/lib/firebase/client";
import { useTranslations } from "@/lib/i18n/context";

/**
 * Passwordless sign-in.
 *
 * Without a link in the URL this page asks for an address and has Firebase
 * email it a one-time link. Opened from that link, it finishes signing in -
 * straight away in the browser that asked for it, or after the address is
 * typed again when the link is opened somewhere else (Firebase needs the
 * address to accept the link, and asking prevents a forwarded link from
 * signing in someone else).
 */
export default function EmailLinkPage() {
  const t = useTranslations();
  const auth = useBrowserAuth();
  const router = useRouter();
  const hydrated = useHydrated();
  const [mode, setMode] = useState<"request" | "completing" | "confirm-email">("request");
  const started = useRef(false);

  useEffect(() => {
    if (!hydrated || started.current || !auth.isSignInLink()) {
      return;
    }
    started.current = true;
    setMode("completing");
    void auth.completeSignInLink(null).then((outcome) => {
      if (outcome.status === "ok") {
        router.replace("/");
        router.refresh();
        return;
      }
      // Needs the address typed (another browser), or the link was bad: the
      // form below explains either.
      setMode("confirm-email");
    });
  }, [hydrated, auth, router]);

  if (mode === "completing") {
    return (
      <Card>
        <CardContent className="text-muted-foreground flex items-center justify-center gap-2 py-10 text-sm">
          <LoaderCircleIcon className="size-4 animate-spin" aria-hidden />
          {t.auth.emailLink.completing}
        </CardContent>
      </Card>
    );
  }

  if (mode === "confirm-email") {
    return (
      <CredentialForm
        title={t.auth.emailLink.confirmTitle}
        description={t.auth.emailLink.needsEmail}
        submitLabel={t.auth.emailLink.confirmSubmit}
        passwordAutoComplete={null}
        newPassword={false}
        onSubmit={async ({ email }) =>
          toCredentialOutcome(t, await auth.completeSignInLink(email), "")
        }
        alternate={{
          prompt: t.auth.emailLink.alternatePrompt,
          href: "/login",
          label: t.auth.emailLink.alternateLabel,
        }}
      />
    );
  }

  return (
    <CredentialForm
      title={t.auth.emailLink.title}
      description={t.auth.emailLink.description}
      submitLabel={t.auth.emailLink.submit}
      passwordAutoComplete={null}
      newPassword={false}
      onSubmit={async ({ email }) =>
        toCredentialOutcome(t, await auth.sendSignInLink(email), t.auth.emailLink.sent(email))
      }
      alternate={{
        prompt: t.auth.emailLink.alternatePrompt,
        href: "/login",
        label: t.auth.emailLink.alternateLabel,
      }}
    />
  );
}
