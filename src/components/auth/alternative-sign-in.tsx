"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { MailIcon, TriangleAlertIcon } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useHydrated } from "@/hooks/use-hydrated";
import { EMAIL_LINK_PATH, useBrowserAuth } from "@/lib/firebase/client";
import { useTranslations } from "@/lib/i18n/context";
import { authErrorMessage } from "@/components/auth/outcome";

/** Google's "G", drawn here so no image is fetched from Google. */
function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="size-4">
      <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.2-2.1 3.5-5.1 3.5-8.7Z" />
      <path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3a7.2 7.2 0 0 1-10.8-3.8H1.3v3.1A12 12 0 0 0 12 24Z" />
      <path fill="#FBBC05" d="M5.3 14.3a7.2 7.2 0 0 1 0-4.6V6.6h-4a12 12 0 0 0 0 10.8l4-3.1Z" />
      <path fill="#EA4335" d="M12 4.8c1.8 0 3.4.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.3 6.6l4 3.1A7.2 7.2 0 0 1 12 4.8Z" />
    </svg>
  );
}

/**
 * The other ways in: Google, or a one-time link by email.
 *
 * Shown under the password form on the sign-in and register pages. Google
 * signs in on the spot; the email link has its own page.
 */
export function AlternativeSignIn() {
  const t = useTranslations();
  const auth = useBrowserAuth();
  const router = useRouter();
  const hydrated = useHydrated();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function google() {
    setPending(true);
    setError(null);
    const outcome = await auth.signInWithGoogle();
    setPending(false);
    if (outcome.status === "ok") {
      router.replace("/");
      router.refresh();
      return;
    }
    if (outcome.status === "error" && outcome.key === "cancelled") {
      return;
    }
    setError(
      outcome.status === "error"
        ? authErrorMessage(t, outcome.key)
        : outcome.status === "email-taken"
          ? t.auth.errors.emailTaken
          : t.auth.errors.failed,
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="text-muted-foreground flex items-center gap-3 text-xs">
        <span className="bg-border h-px flex-1" />
        {t.auth.alternatives.or}
        <span className="bg-border h-px flex-1" />
      </div>
      <Button
        type="button"
        variant="outline"
        size="lg"
        className="w-full"
        disabled={pending || !hydrated}
        onClick={google}
      >
        <GoogleMark />
        {t.auth.alternatives.google}
      </Button>
      <Button asChild variant="ghost" size="lg" className="w-full">
        <Link href={EMAIL_LINK_PATH}>
          <MailIcon />
          {t.auth.alternatives.emailLink}
        </Link>
      </Button>
      {error !== null && (
        <Alert variant="destructive">
          <TriangleAlertIcon />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
