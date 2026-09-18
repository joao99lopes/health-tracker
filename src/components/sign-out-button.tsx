"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { LogOutIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { signOut } from "@/lib/auth-client";
import { useTranslations } from "@/lib/i18n/context";

/**
 * Signing out.
 *
 * The header has room for the label from the small breakpoint up; below it
 * the icon carries the button and the label moves to its accessible name, so
 * the control is never announced as unlabelled.
 */
export function SignOutButton() {
  const router = useRouter();
  const t = useTranslations();
  const [pending, setPending] = useState(false);

  async function handleSignOut() {
    setPending(true);
    await signOut();
    // Replace so the signed-in page is not reachable with the back button.
    router.replace("/login");
    router.refresh();
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleSignOut}
      disabled={pending}
      aria-label={t.common.signOut}
      title={t.common.signOut}
      className="max-sm:size-8 max-sm:px-0"
    >
      <LogOutIcon aria-hidden />
      <span className="max-sm:sr-only">{t.common.signOut}</span>
    </Button>
  );
}
