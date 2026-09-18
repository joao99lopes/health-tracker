"use client";

import Link from "next/link";
import { PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslations } from "@/lib/i18n/context";

/**
 * The floating action button that starts a new measurement.
 *
 * It is a link rather than a dialog trigger so the form has its own address:
 * a half-filled measurement survives a reload, and the browser's back button
 * does what it looks like it does.
 */
export function AddMeasurementFab() {
  const t = useTranslations();

  return (
    <Button
      asChild
      size="icon-lg"
      // Clear of the bottom navigation on a phone, and of the viewport's own
      // safe area below it.
      className="shadow-raised fixed right-4 bottom-[calc(4.75rem+env(safe-area-inset-bottom,0px))] z-40 size-14 rounded-full sm:right-8 sm:bottom-8"
    >
      <Link href="/measurements/new" aria-label={t.measurements.add}>
        <PlusIcon className="size-6" />
      </Link>
    </Button>
  );
}
