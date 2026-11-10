"use client";

import Link from "next/link";
import { PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslations } from "@/lib/i18n/context";

/** Where a new measurement is started, from every entry point. */
const NEW_MEASUREMENT_HREF = "/measurements/new";

/**
 * The floating action button that starts a new measurement.
 *
 * It is a link rather than a dialog trigger so the form has its own address
 * and the browser's back button does what it looks like it does.
 */
export function AddMeasurementFab() {
  const t = useTranslations();

  return (
    <Button
      asChild
      size="icon-lg"
      // Clear of the bottom navigation on a phone, and of the viewport's own
      // safe area below it.
      className="shadow-accent fixed right-4 bottom-[calc(4.75rem+env(safe-area-inset-bottom,0px))] z-40 size-14 rounded-2xl sm:right-8 sm:bottom-8 print:hidden"
    >
      <Link href={NEW_MEASUREMENT_HREF} aria-label={t.measurements.add}>
        <PlusIcon className="size-6" />
      </Link>
    </Button>
  );
}

/**
 * The same action, spelled out, for an empty page: there the floating button
 * is the only thing on screen and an icon alone says too little.
 */
export function AddMeasurementButton() {
  const t = useTranslations();

  return (
    <Button asChild>
      <Link href={NEW_MEASUREMENT_HREF}>
        <PlusIcon />
        {t.measurements.add}
      </Link>
    </Button>
  );
}
