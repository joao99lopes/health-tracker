"use client";

import Link from "next/link";
import { useEffect } from "react";
import { CheckCircle2Icon, PlusIcon } from "lucide-react";
import { Alert, AlertAction, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useTranslations } from "@/lib/i18n/context";

/**
 * The confirmation shown once after the form saved a measurement.
 *
 * The form marks the address with `?saved=`; the mark is removed again as
 * soon as the page is up, so a reload, a bookmark or a shared link does not
 * announce a save that happened long ago. `replaceState` rather than a
 * navigation: nothing needs to be fetched again.
 *
 * After adding, it offers the next one straight away - entering a few older
 * readings in a row should not mean going back to the list each time.
 */
export function SavedNotice({ kind }: { kind: "created" | "updated" }) {
  const t = useTranslations();

  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.has("saved")) {
      url.searchParams.delete("saved");
      window.history.replaceState(null, "", url.pathname + url.search + url.hash);
    }
  }, []);

  return (
    <Alert role="status">
      <CheckCircle2Icon className="text-primary" />
      <AlertDescription>
        {kind === "created" ? t.measurements.created : t.measurements.updated}
      </AlertDescription>
      {kind === "created" && (
        <AlertAction>
          <Button asChild size="sm" variant="outline">
            <Link href="/measurements/new">
              <PlusIcon />
              {t.measurements.addAnother}
            </Link>
          </Button>
        </AlertAction>
      )}
    </Alert>
  );
}
