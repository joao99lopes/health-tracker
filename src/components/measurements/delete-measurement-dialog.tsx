"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Trash2Icon } from "lucide-react";
import { deleteMeasurementAction } from "@/app/(app)/measurements/actions";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n/context";
import { formatDateTime } from "@/lib/measurements/format";

/**
 * Deleting a measurement, behind a confirmation.
 *
 * Deletion is irreversible and there is no undo anywhere in this app, so the
 * dialog names the measurement being removed rather than asking an abstract
 * "are you sure?".
 *
 * The date in the description is formatted on the client only: it is shown in
 * the reader's time zone, and the dialog is not rendered until it is opened.
 */
export function DeleteMeasurementDialog({
  id,
  measuredAt,
  iconOnly = false,
  /** Where to go afterwards; the list simply refreshes in place. */
  redirectTo,
}: {
  id: string;
  measuredAt: Date;
  iconOnly?: boolean;
  redirectTo?: string;
}) {
  const router = useRouter();
  const { t, language } = useI18n();

  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);

  async function handleDelete() {
    setPending(true);
    setFailed(false);
    const result = await deleteMeasurementAction(id);
    setPending(false);

    if (result.status === "error") {
      setFailed(true);
      return;
    }

    // "not-found" is treated as success: the row is gone either way, and the
    // only way to reach it is a measurement deleted in another tab.
    setOpen(false);
    if (redirectTo) {
      router.push(redirectTo);
    }
    router.refresh();
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        {iconOnly ? (
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={t.common.delete}
            title={t.common.delete}
            className="hover:text-destructive"
          >
            <Trash2Icon />
          </Button>
        ) : (
          <Button variant="destructive">
            <Trash2Icon />
            {t.common.delete}
          </Button>
        )}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogMedia className="text-destructive bg-destructive/10">
            <Trash2Icon />
          </AlertDialogMedia>
          <AlertDialogTitle>{t.measurements.deleteTitle}</AlertDialogTitle>
          <AlertDialogDescription>
            {t.measurements.deleteDescription(
              formatDateTime(measuredAt, language),
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {failed && (
          <p role="alert" className="text-destructive text-sm">
            {t.measurements.deleteFailed}
          </p>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>
            {t.common.cancel}
          </AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={(event) => {
              // The dialog closes on its own once the server has answered, so
              // a failure can be reported instead of vanishing with it.
              event.preventDefault();
              void handleDelete();
            }}
            disabled={pending}
          >
            {pending ? t.common.deleting : t.common.delete}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
