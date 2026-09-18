"use client";

import Link from "next/link";
import { FileQuestionIcon, TriangleAlertIcon } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useTranslations } from "@/lib/i18n/context";

/**
 * The two screens a page falls back to: something failed, or nothing is
 * there.
 *
 * Both say what happened in plain language and offer the one action that
 * makes sense - retrying, or going back to the dashboard. The failure screen
 * also states that nothing was changed, because the reader cannot tell
 * whether a save went through.
 *
 * Kept together so the error and not-found boundaries in every segment look
 * the same, and so their strings stay in the dictionaries.
 */

export function ErrorScreen({ retry }: { retry: () => void }) {
  const t = useTranslations();

  return (
    <Card>
      <CardContent className="p-0">
        <EmptyState
          icon={TriangleAlertIcon}
          title={t.states.errorTitle}
          description={t.states.errorDescription}
          action={<Button onClick={retry}>{t.states.retry}</Button>}
        />
      </CardContent>
    </Card>
  );
}

export function NotFoundScreen() {
  const t = useTranslations();

  return (
    <Card>
      <CardContent className="p-0">
        <EmptyState
          icon={FileQuestionIcon}
          title={t.states.notFoundTitle}
          description={t.states.notFoundDescription}
          action={
            <Button asChild variant="outline">
              <Link href="/">{t.states.backToDashboard}</Link>
            </Button>
          }
        />
      </CardContent>
    </Card>
  );
}
