"use client";

import Link from "next/link";
import { CircleCheckIcon, TriangleAlertIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
import { normalizeEmail } from "@/lib/auth/email";
import {
  PASSWORD_MIN_LENGTH,
  validateCredentials,
  validateEmail,
  type CredentialIssue,
} from "@/lib/auth/credentials";
import { useTranslations } from "@/lib/i18n/context";
import type { Dictionary } from "@/lib/i18n/dictionary";

/** Maps a validation code to the message for the current language. */
function issueMessage(t: Dictionary, issue: CredentialIssue): string {
  const messages = t.auth.issues;
  return issue === "PASSWORD_TOO_SHORT"
    ? messages.PASSWORD_TOO_SHORT(PASSWORD_MIN_LENGTH)
    : messages[issue];
}

/** The validation messages belonging to one field, if any. */
function FieldIssues({
  id,
  field,
  issues,
  t,
}: {
  id: string;
  field: "email" | "password";
  issues: CredentialIssue[];
  t: Dictionary;
}) {
  const prefix = field.toUpperCase();
  const found = issues.filter((issue) => issue.startsWith(prefix));
  if (found.length === 0) {
    return null;
  }
  return (
    <ul id={id} className="text-destructive flex flex-col gap-1 text-sm">
      {found.map((issue) => (
        <li key={issue}>{issueMessage(t, issue)}</li>
      ))}
    </ul>
  );
}

/**
 * What a submission led to.
 *
 * - `done`: signed in; the form goes to the dashboard.
 * - `notice`: worked, and there is something to read (an email was sent);
 *   the form stays.
 * - `error`: did not work. `followUp` offers one more step, such as sending
 *   the confirmation email again, whose own result replaces the message.
 */
export type CredentialOutcome =
  | { kind: "done" }
  | { kind: "notice"; message: string }
  | { kind: "error"; message: string; followUp?: FollowUp };

type FollowUp = { label: string; run: () => Promise<CredentialOutcome> };

function FollowUpButton({
  followUp,
  disabled,
  onRun,
}: {
  followUp: FollowUp;
  disabled: boolean;
  onRun: (run: FollowUp["run"]) => void;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={disabled}
      onClick={() => onRun(followUp.run)}
    >
      {followUp.label}
    </Button>
  );
}

export type CredentialSubmit = (credentials: {
  email: string;
  password: string;
}) => Promise<CredentialOutcome>;

/**
 * Shared sign-in / register / forgot-password form.
 *
 * Client-side validation uses the shared credentials module. The password
 * itself never reaches this app's server: it goes to Firebase, which applies
 * its own policy too.
 */
export function CredentialForm({
  title,
  description,
  submitLabel,
  passwordAutoComplete,
  newPassword,
  onSubmit,
  passwordHelp,
  alternate,
}: {
  title: string;
  description: string;
  submitLabel: string;
  /** Null for the email-only form (forgot password). */
  passwordAutoComplete: "current-password" | "new-password" | null;
  /** Whether the password is being chosen now (length rules apply). */
  newPassword: boolean;
  onSubmit: CredentialSubmit;
  /** Shown under the password field, such as a "forgot password" link. */
  passwordHelp?: { href: string; label: string };
  alternate: { prompt: string; href: string; label: string };
}) {
  const router = useRouter();
  const t = useTranslations();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [issues, setIssues] = useState<CredentialIssue[]>([]);
  const [outcome, setOutcome] = useState<CredentialOutcome | null>(null);
  const [pending, setPending] = useState(false);
  const hydrated = useHydrated();
  const withPassword = passwordAutoComplete !== null;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setOutcome(null);

    const found = withPassword
      ? validateCredentials({ email, password }, { passwordRules: newPassword })
      : validateEmail(email);
    setIssues(found);
    if (found.length > 0) {
      return;
    }

    setPending(true);
    const result = await onSubmit({ email: normalizeEmail(email), password });
    setPending(false);

    if (result.kind === "done") {
      router.replace("/");
      router.refresh();
      return;
    }
    if (result.kind === "notice") {
      setPassword("");
    }
    setOutcome(result);
  }

  async function runFollowUp(run: () => Promise<CredentialOutcome>) {
    setPending(true);
    setOutcome(await run());
    setPending(false);
  }

  const hasIssue = (field: "email" | "password") =>
    issues.some((issue) => issue.startsWith(field.toUpperCase()));

  return (
    <Card className="[--card-spacing:--spacing(6)]">
      <CardHeader>
        <CardTitle className="text-xl">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {/* Until React has hydrated, submitting would be a native form
            submission - by default a GET that puts the password in the URL,
            the browser history and the server log. The button stays disabled
            until then, and `method="post"` keeps the credentials out of the
            URL even if a submission slips through some other way. */}
        <form
          method="post"
          onSubmit={handleSubmit}
          className="flex flex-col gap-5"
          noValidate
        >
          <div className="flex flex-col gap-2">
            <Label htmlFor="email">{t.auth.email}</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              // The message below is the field's own, so it is announced with
              // it rather than only read as loose text after the form.
              aria-invalid={hasIssue("email") || undefined}
              aria-describedby={hasIssue("email") ? "email-issues" : undefined}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
            <FieldIssues id="email-issues" field="email" issues={issues} t={t} />
          </div>

          {withPassword && (
            <div className="flex flex-col gap-2">
              <div className="flex items-baseline justify-between gap-3">
                <Label htmlFor="password">{t.auth.password}</Label>
                {passwordHelp && (
                  <Link
                    href={passwordHelp.href}
                    className="text-muted-foreground hover:text-foreground text-xs underline-offset-4 hover:underline"
                  >
                    {passwordHelp.label}
                  </Link>
                )}
              </div>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete={passwordAutoComplete}
                required
                aria-invalid={hasIssue("password") || undefined}
                aria-describedby={
                  hasIssue("password") ? "password-issues" : undefined
                }
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
              <FieldIssues
                id="password-issues"
                field="password"
                issues={issues}
                t={t}
              />
            </div>
          )}

          {outcome?.kind === "error" && (
            <Alert variant="destructive">
              <TriangleAlertIcon />
              <AlertDescription className="flex flex-col items-start gap-2">
                <p>{outcome.message}</p>
                {outcome.followUp && (
                  <FollowUpButton
                    followUp={outcome.followUp}
                    disabled={pending}
                    onRun={runFollowUp}
                  />
                )}
              </AlertDescription>
            </Alert>
          )}

          {outcome?.kind === "notice" && (
            <Alert>
              <CircleCheckIcon />
              <AlertDescription>{outcome.message}</AlertDescription>
            </Alert>
          )}

          <Button
            type="submit"
            size="lg"
            disabled={pending || !hydrated}
            className="w-full"
          >
            {pending ? t.common.saving : submitLabel}
          </Button>
        </form>

        <p className="text-muted-foreground mt-6 text-center text-sm">
          {alternate.prompt}{" "}
          <Link
            href={alternate.href}
            className="text-foreground font-medium underline underline-offset-4"
          >
            {alternate.label}
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
