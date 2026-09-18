"use client";

import Link from "next/link";
import { TriangleAlertIcon } from "lucide-react";
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
import { normalizeEmail } from "@/lib/auth/email";
import {
  PASSWORD_MIN_LENGTH,
  validateCredentials,
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

export type CredentialSubmit = (credentials: {
  email: string;
  password: string;
}) => Promise<{ error?: string }>;

/**
 * Shared login/register form.
 *
 * Client-side validation mirrors the server using the same module, so the two
 * cannot disagree. It is a convenience only - the server validates again.
 */
export function CredentialForm({
  title,
  description,
  submitLabel,
  passwordAutoComplete,
  onSubmit,
  alternate,
}: {
  title: string;
  description: string;
  submitLabel: string;
  passwordAutoComplete: "current-password" | "new-password";
  onSubmit: CredentialSubmit;
  alternate: { prompt: string; href: string; label: string };
}) {
  const router = useRouter();
  const t = useTranslations();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [issues, setIssues] = useState<CredentialIssue[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const found = validateCredentials({ email, password });
    setIssues(found);
    if (found.length > 0) {
      return;
    }

    setPending(true);
    const result = await onSubmit({ email: normalizeEmail(email), password });
    setPending(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    router.replace("/");
    router.refresh();
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
        <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
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

          <div className="flex flex-col gap-2">
            <Label htmlFor="password">{t.auth.password}</Label>
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

          {error && (
            <Alert variant="destructive">
              <TriangleAlertIcon />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Button type="submit" size="lg" disabled={pending} className="w-full">
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
