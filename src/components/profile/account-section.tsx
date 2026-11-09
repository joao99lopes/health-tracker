"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { CircleCheckIcon, Trash2Icon, TriangleAlertIcon } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useHydrated } from "@/hooks/use-hydrated";
import {
  PASSWORD_MIN_LENGTH,
  validateNewPassword,
} from "@/lib/auth/credentials";
import { signOutAction } from "@/app/(auth)/actions";
import { useBrowserAuth, type AuthOutcome } from "@/lib/firebase/client";
import { useTranslations } from "@/lib/i18n/context";
import type { Dictionary } from "@/lib/i18n/dictionary";

/**
 * Account management on the profile page: change the password, delete the
 * account. Both are what someone holding an unlocked phone should not be able
 * to do alone: changing the password asks for the current one, and deleting
 * needs a sign-in from the last few minutes (by whichever method), so a
 * session left open for days is asked to sign in again first.
 */

function failureMessage(t: Dictionary, outcome: AuthOutcome): string | null {
  switch (outcome.status) {
    case "ok":
      return null;
    case "error":
      return t.auth.errors[outcome.key];
    case "email-taken":
      return t.auth.errors.emailTaken;
    default:
      return t.auth.errors.failed;
  }
}

function ChangePasswordForm({ email }: { email: string }) {
  const t = useTranslations();
  const auth = useBrowserAuth();
  const hydrated = useHydrated();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [issue, setIssue] = useState<string | null>(null);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setResult(null);
    const [problem] = validateNewPassword(next);
    if (current.length === 0) {
      setIssue(t.auth.issues.PASSWORD_REQUIRED);
      return;
    }
    if (problem) {
      setIssue(
        problem === "PASSWORD_TOO_SHORT"
          ? t.auth.issues.PASSWORD_TOO_SHORT(PASSWORD_MIN_LENGTH)
          : t.auth.issues.PASSWORD_TOO_LONG,
      );
      return;
    }
    setIssue(null);
    setPending(true);
    const outcome = await auth.changePassword(email, current, next);
    setPending(false);
    const failure = failureMessage(t, outcome);
    if (failure === null) {
      setCurrent("");
      setNext("");
      setResult({ ok: true, message: t.account.passwordChanged });
    } else {
      setResult({ ok: false, message: failure });
    }
  }

  return (
    <form method="post" onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
      <div className="flex flex-col gap-1">
        <p className="font-medium">{t.account.changePassword}</p>
        <p className="text-muted-foreground text-sm">
          {t.account.changePasswordDescription}
        </p>
        <p className="text-muted-foreground text-xs">
          {t.account.emailLinkHint}
        </p>
      </div>
      {/* Lets password managers file the change under the right account. */}
      <input type="email" name="username" autoComplete="username" value={email} readOnly hidden />
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="current-password">{t.account.currentPassword}</Label>
          <Input
            id="current-password"
            type="password"
            autoComplete="current-password"
            value={current}
            onChange={(event) => setCurrent(event.target.value)}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="new-password">{t.account.newPassword}</Label>
          <Input
            id="new-password"
            type="password"
            autoComplete="new-password"
            aria-invalid={issue !== null || undefined}
            aria-describedby={issue !== null ? "new-password-issue" : undefined}
            value={next}
            onChange={(event) => setNext(event.target.value)}
          />
        </div>
      </div>
      {issue !== null && (
        <p id="new-password-issue" className="text-destructive text-sm">
          {issue}
        </p>
      )}
      {result !== null && (
        <Alert variant={result.ok ? "default" : "destructive"}>
          {result.ok ? <CircleCheckIcon /> : <TriangleAlertIcon />}
          <AlertDescription>{result.message}</AlertDescription>
        </Alert>
      )}
      <Button
        type="submit"
        variant="outline"
        className="w-fit max-sm:w-full"
        disabled={pending || !hydrated}
      >
        {pending ? t.common.saving : t.account.changePasswordSubmit}
      </Button>
    </form>
  );
}

function DeleteAccountDialog() {
  const t = useTranslations();
  const auth = useBrowserAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<"idle" | "pending" | "stale" | "failed">("idle");

  async function handleDelete() {
    setState("pending");
    const outcome = await auth.deleteAccount();
    if (outcome.status === "ok") {
      setOpen(false);
      router.replace("/login");
      router.refresh();
      return;
    }
    setState(outcome.status === "stale" ? "stale" : "failed");
  }

  async function signInAgain() {
    await signOutAction();
    router.replace("/login");
    router.refresh();
  }

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          setState("idle");
        }
      }}
    >
      <AlertDialogTrigger asChild>
        <Button variant="destructive" className="w-fit max-sm:w-full">
          <Trash2Icon />
          {t.account.deleteButton}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogMedia className="text-destructive bg-destructive/10">
            <Trash2Icon />
          </AlertDialogMedia>
          <AlertDialogTitle>{t.account.deleteConfirmTitle}</AlertDialogTitle>
          <AlertDialogDescription>
            {state === "stale"
              ? t.account.deleteNeedsRecentSignIn
              : t.account.deleteConfirmDescription}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {state === "failed" && (
          <p role="alert" className="text-destructive text-sm">
            {t.auth.errors.failed}
          </p>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={state === "pending"}>
            {t.common.cancel}
          </AlertDialogCancel>
          {state === "stale" ? (
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                void signInAgain();
              }}
            >
              {t.account.signInAgain}
            </AlertDialogAction>
          ) : (
            <AlertDialogAction
              variant="destructive"
              onClick={(event) => {
                // Stay open until the server answers, so a refusal can be
                // explained instead of vanishing with the dialog.
                event.preventDefault();
                void handleDelete();
              }}
              disabled={state === "pending"}
            >
              {state === "pending" ? t.account.deleting : t.account.deleteConfirm}
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function AccountSection({
  email,
  hasPassword,
}: {
  email: string;
  /**
   * Whether this account signs in with a password. Accounts that only use
   * Google or email links have none to change.
   */
  hasPassword: boolean;
}) {
  const t = useTranslations();

  return (
    <Card className="[--card-spacing:--spacing(6)]">
      <CardHeader>
        <CardTitle>{t.account.title}</CardTitle>
        <CardDescription>{t.account.signedInAs(email)}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        {hasPassword ? (
          <ChangePasswordForm email={email} />
        ) : (
          <div className="flex flex-col gap-1">
            <p className="font-medium">{t.account.changePassword}</p>
            <p className="text-muted-foreground text-sm">{t.account.noPassword}</p>
          </div>
        )}
        <div className="border-border flex flex-col gap-3 border-t pt-6">
          <div className="flex flex-col gap-1">
            <p className="font-medium">{t.account.deleteTitle}</p>
            <p className="text-muted-foreground text-sm">
              {t.account.deleteDescription}
            </p>
          </div>
          <DeleteAccountDialog />
        </div>
      </CardContent>
    </Card>
  );
}
