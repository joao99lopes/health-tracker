"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { CheckCircle2Icon, TriangleAlertIcon } from "lucide-react";
import { saveProfileAction } from "@/app/(app)/profile/actions";
import { DirectionPreferencesSection } from "@/components/profile/direction-preferences";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useHydrated } from "@/hooks/use-hydrated";
import { callServer } from "@/lib/client/server-call";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTranslations } from "@/lib/i18n/context";
import type { Dictionary } from "@/lib/i18n/dictionary";
import { LANGUAGES, LANGUAGE_NAMES, type Language } from "@/lib/i18n/languages";
import {
  HEIGHT_CM_MAX,
  HEIGHT_CM_MIN,
  NAME_MAX_LENGTH,
  SEXES,
} from "@/lib/profile/fields";
import {
  PROFILE_ISSUE_FIELD,
  profileIssueMessage,
} from "@/lib/profile/messages";
import {
  DEFAULT_DIRECTION_PREFERENCES,
  type DirectionPreferences,
} from "@/lib/preferences/direction";
import type { Profile } from "@/lib/profile/queries";
import { parseProfileInput, type ProfileIssue } from "@/lib/profile/validation";

type FieldName = (typeof PROFILE_ISSUE_FIELD)[ProfileIssue];

/** The validation messages belonging to one field, if any. */
function FieldIssues({
  field,
  issues,
  t,
}: {
  field: FieldName;
  issues: ProfileIssue[];
  t: Dictionary;
}) {
  const found = issues.filter((issue) => PROFILE_ISSUE_FIELD[issue] === field);
  if (found.length === 0) {
    return null;
  }
  return (
    <ul
      id={`${field}-issues`}
      className="text-destructive flex flex-col gap-1 text-sm"
    >
      {found.map((issue) => (
        <li key={issue}>{profileIssueMessage(t, issue)}</li>
      ))}
    </ul>
  );
}

/**
 * Create-or-edit form for the profile.
 *
 * The same validation module runs here and in the server action, so the two
 * cannot disagree. Editing the height affects future measurements only:
 * stored measurements keep their own copy of the height they were taken at.
 */
export function ProfileForm({
  profile,
  fallbackLanguage,
}: {
  profile: Profile | null;
  /** Used when there is no profile yet: whatever the page rendered in. */
  fallbackLanguage: Language;
}) {
  const router = useRouter();
  const t = useTranslations();

  const [name, setName] = useState(profile?.name ?? "");
  const [birthDate, setBirthDate] = useState(profile?.birthDate ?? "");
  const [sex, setSex] = useState<string>(profile?.sex ?? "");
  const [heightCm, setHeightCm] = useState(
    profile ? String(profile.heightCm) : "",
  );
  const [language, setLanguage] = useState<string>(
    profile?.language ?? fallbackLanguage,
  );
  const [directions, setDirections] = useState<DirectionPreferences>(
    profile?.directions ?? DEFAULT_DIRECTION_PREFERENCES,
  );

  const [issues, setIssues] = useState<ProfileIssue[]>([]);
  const [status, setStatus] = useState<
    "idle" | "saved" | "error" | "unreachable"
  >("idle");
  // The chosen options' labels, given to the selects directly: Radix only
  // learns an item's text once its list has mounted in the browser, so
  // without them the server-rendered page shows the selects empty.
  const sexOption = SEXES.find((option) => option === sex);
  const languageOption = LANGUAGES.find((option) => option === language);
  const [pending, setPending] = useState(false);
  // A submission before hydration would be a native GET.
  const hydrated = useHydrated();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("idle");

    const input = { name, birthDate, sex, heightCm, language, directions };
    const parsed = parseProfileInput(input);
    setIssues(parsed.issues);
    if (!parsed.profile) {
      return;
    }

    setPending(true);
    const result = await callServer(() => saveProfileAction(input));
    setPending(false);

    if (result.status === "invalid") {
      setIssues(result.issues);
      return;
    }
    if (result.status === "error" || result.status === "unreachable") {
      setStatus(result.status);
      return;
    }

    setStatus("saved");
    // The language may have changed, and every page is rendered in it.
    router.refresh();
  }

  /** Whether a field carries a message, so the input can be marked invalid. */
  const invalid = (field: FieldName) =>
    issues.some((issue) => PROFILE_ISSUE_FIELD[issue] === field);

  return (
    <Card className="[--card-spacing:--spacing(6)]">
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-6" noValidate>
          <div className="flex flex-col gap-2">
            <Label htmlFor="name">
              {t.profile.name}{" "}
              <span className="text-muted-foreground font-normal">
                ({t.common.optional})
              </span>
            </Label>
            <Input
              id="name"
              name="name"
              autoComplete="name"
              maxLength={NAME_MAX_LENGTH}
              placeholder={t.profile.namePlaceholder}
              aria-invalid={invalid("name") || undefined}
              aria-describedby={invalid("name") ? "name-issues" : undefined}
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
            <FieldIssues field="name" issues={issues} t={t} />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="birthDate">{t.profile.birthDate}</Label>
            <Input
              id="birthDate"
              name="birthDate"
              type="date"
              autoComplete="bday"
              className="w-full sm:w-64"
              aria-invalid={invalid("birthDate") || undefined}
              aria-describedby={
                invalid("birthDate")
                  ? "birthDate-issues birthDate-hint"
                  : "birthDate-hint"
              }
              value={birthDate}
              onChange={(event) => setBirthDate(event.target.value)}
            />
            <p id="birthDate-hint" className="text-muted-foreground text-xs">
              {t.profile.birthDateHint}
            </p>
            <FieldIssues field="birthDate" issues={issues} t={t} />
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="sex">{t.profile.sex}</Label>
              <Select value={sex} onValueChange={setSex}>
                <SelectTrigger id="sex" className="w-full">
                  <SelectValue placeholder={t.common.choose}>
                    {sexOption && t.profile.sexes[sexOption]}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {SEXES.map((option) => (
                    <SelectItem key={option} value={option}>
                      {t.profile.sexes[option]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldIssues field="sex" issues={issues} t={t} />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="heightCm">{t.profile.heightCm}</Label>
              <Input
                id="heightCm"
                name="heightCm"
                type="text"
                inputMode="decimal"
                autoComplete="off"
                placeholder={`${HEIGHT_CM_MIN}-${HEIGHT_CM_MAX}`}
                aria-invalid={invalid("heightCm") || undefined}
                aria-describedby={
                  invalid("heightCm")
                    ? "heightCm-issues heightCm-hint"
                    : "heightCm-hint"
                }
                value={heightCm}
                onChange={(event) => setHeightCm(event.target.value)}
              />
              <p id="heightCm-hint" className="text-muted-foreground text-xs">
                {t.profile.heightHint}
              </p>
              <FieldIssues field="heightCm" issues={issues} t={t} />
            </div>
          </div>

          <div className="border-border flex flex-col gap-2 border-t pt-6">
            <Label htmlFor="language">{t.profile.language}</Label>
            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger id="language" className="w-full sm:w-56">
                <SelectValue placeholder={t.common.choose}>
                  {languageOption && LANGUAGE_NAMES[languageOption]}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {LANGUAGES.map((option) => (
                  <SelectItem key={option} value={option}>
                    {LANGUAGE_NAMES[option]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldIssues field="language" issues={issues} t={t} />
          </div>

          {/* A presentation preference: it changes how a recorded change is
              coloured, and nothing about what is recorded. */}
          <DirectionPreferencesSection
            value={directions}
            onChange={setDirections}
          />
          <FieldIssues field="directions" issues={issues} t={t} />

          {/* Announced when it appears: a save that only changed a colour on
              screen is a save the reader can miss entirely. */}
          <div aria-live="polite">
            {(status === "error" || status === "unreachable") && (
              <Alert variant="destructive">
                <TriangleAlertIcon />
                <AlertDescription>
                  {status === "unreachable"
                    ? t.common.unreachable
                    : t.profile.failed}
                </AlertDescription>
              </Alert>
            )}
            {status === "saved" && (
              <Alert>
                <CheckCircle2Icon className="text-primary" />
                <AlertDescription>{t.profile.saved}</AlertDescription>
              </Alert>
            )}
          </div>

          <div className="border-border flex border-t pt-6 sm:justify-end">
            <Button
              type="submit"
              size="lg"
              disabled={pending || !hydrated}
              className="max-sm:w-full"
            >
              {pending ? t.common.saving : t.common.save}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
