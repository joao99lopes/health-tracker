"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent, type KeyboardEvent } from "react";
import {
  HistoryIcon,
  InfoIcon,
  PlusIcon,
  TriangleAlertIcon,
} from "lucide-react";
import {
  createMeasurementAction,
  updateMeasurementAction,
} from "@/app/(app)/measurements/actions";
import { Alert, AlertAction, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useHydrated } from "@/hooks/use-hydrated";
import { callServer } from "@/lib/client/server-call";
import { useI18n } from "@/lib/i18n/context";
import type { Dictionary } from "@/lib/i18n/dictionary";
import { toLocalInputValue } from "@/lib/measurements/datetime";
import {
  DRAFT_STORAGE_KEY,
  parseDraft,
  serializeDraft,
  type MeasurementDraft,
} from "@/lib/measurements/draft";
import {
  MEASUREMENT_FIELD_SPECS,
  MEASUREMENT_VALUE_FIELDS,
  NOTE_MAX_LENGTH,
  type MeasurementValueField,
} from "@/lib/measurements/fields";
import {
  formatHeightCm,
  formatMeasurementNumber,
} from "@/lib/measurements/format";
import {
  emptyFormValues,
  formValuesFrom,
  primaryFields,
  toMeasurementInput,
  type MeasurementFormValues,
} from "@/lib/measurements/form";
import {
  measurementFieldHelp,
  measurementIssueMessage,
} from "@/lib/measurements/messages";
import type { Measurement } from "@/lib/measurements/queries";
import {
  parseMeasurementInput,
  type MeasurementIssue,
} from "@/lib/measurements/validation";

/** The validation messages belonging to one field, if any. */
function FieldIssues({
  field,
  issues,
  t,
}: {
  field: MeasurementIssue["field"];
  issues: MeasurementIssue[];
  t: Dictionary;
}) {
  const found = issues.filter((issue) => issue.field === field);
  if (found.length === 0) {
    return null;
  }
  return (
    <ul
      id={`${field}-issues`}
      className="text-destructive flex flex-col gap-1 text-sm"
    >
      {found.map((issue) => (
        <li key={issue.code}>{measurementIssueMessage(t, issue)}</li>
      ))}
    </ul>
  );
}

/**
 * `sessionStorage` can throw (private browsing, storage disabled); a draft is
 * a convenience and never worth an error.
 */
function readStoredDraft(): MeasurementDraft | null {
  try {
    return parseDraft(window.sessionStorage.getItem(DRAFT_STORAGE_KEY));
  } catch {
    return null;
  }
}

function storeDraft(draft: MeasurementDraft | null): void {
  try {
    const text = draft === null ? null : serializeDraft(draft);
    if (text === null) {
      window.sessionStorage.removeItem(DRAFT_STORAGE_KEY);
    } else {
      window.sessionStorage.setItem(DRAFT_STORAGE_KEY, text);
    }
  } catch {
    // Nothing to do: the form works the same without a draft.
  }
}

/**
 * Add-or-edit form for one measurement.
 *
 * The same validation module runs here and in the server action, so the two
 * cannot disagree about what is acceptable.
 *
 * The height is never an input. Creating stamps the row with the profile's
 * current height; editing leaves the stored one alone, which is what keeps a
 * past measurement's BMI from moving when an unrelated field is corrected.
 */
export function MeasurementForm({
  measurement,
  heightCm,
  latestValues,
}: {
  /** Absent when adding; the row being edited otherwise. */
  measurement?: Measurement;
  /** What will be recorded (adding) or what was recorded (editing). */
  heightCm: number;
  /**
   * Adding only: each field's most recent value. Shown as a placeholder -
   * never filled in, which would record a reading nobody took - and used to
   * lead with the fields this user records.
   */
  latestValues?: Record<MeasurementValueField, number | null>;
}) {
  const router = useRouter();
  const { t, language } = useI18n();
  const hydrated = useHydrated();
  const editing = measurement !== undefined;

  const [values, setValues] = useState<MeasurementFormValues>(() =>
    measurement ? formValuesFrom(measurement) : emptyFormValues(),
  );
  const [note, setNote] = useState(measurement?.note ?? "");

  // A datetime-local input has no time zone, so its value can only be right
  // once the browser is running it. Until then it stays empty rather than
  // showing the container's idea of the time; `null` means "the user has not
  // typed a date", which is what lets the default below apply.
  const [now] = useState(() => new Date());
  const [typedMeasuredAt, setTypedMeasuredAt] = useState<string | null>(null);
  const measuredAt =
    typedMeasuredAt ??
    (hydrated ? toLocalInputValue(measurement?.measuredAt ?? now) : "");
  // Adding almost always records "now", so the date input stays folded away
  // behind "Change" until it is wanted; it opens on its own when the date
  // has a problem. Editing shows it, since the date is part of the record.
  const [dateOpen, setDateOpen] = useState(editing);

  // A draft left by an earlier visit to this form, offered back once. Read in
  // the state initializer so it is the draft from *before* this visit, not
  // the one written as the reader types; it is only rendered after
  // hydration, so the server pass (which has no storage) still matches.
  const [offeredDraft, setOfferedDraft] = useState<MeasurementDraft | null>(
    () => (editing || typeof window === "undefined" ? null : readStoredDraft()),
  );

  const [issues, setIssues] = useState<MeasurementIssue[]>([]);
  const [status, setStatus] = useState<
    "idle" | "error" | "not-found" | "no-height" | "unreachable"
  >("idle");
  const [pending, setPending] = useState(false);
  // Which field's "how to measure" note is open. Collapsed by default so the
  // guidance stays secondary to the inputs.
  const [openHelp, setOpenHelp] = useState<MeasurementValueField | null>(
    null,
  );

  // Fields this user does not record wait behind "More values" until asked
  // for; editing shows everything the row could hold.
  const [showAllFields, setShowAllFields] = useState(false);
  const leadingFields =
    latestValues === undefined
      ? MEASUREMENT_VALUE_FIELDS
      : primaryFields(latestValues, values);
  const visibleFields = showAllFields ? MEASUREMENT_VALUE_FIELDS : leadingFields;
  const hiddenCount = MEASUREMENT_VALUE_FIELDS.length - visibleFields.length;

  /** Keeps what has been typed so far, when adding; see `draft.ts`. */
  function keepDraft(change: Partial<MeasurementDraft>) {
    if (editing) {
      return;
    }
    storeDraft({ values, note, measuredAt: typedMeasuredAt, ...change });
  }

  function setValue(field: MeasurementValueField, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
    keepDraft({ values: { ...values, [field]: value } });
  }

  function changeNote(value: string) {
    setNote(value);
    keepDraft({ note: value });
  }

  function changeMeasuredAt(value: string) {
    setTypedMeasuredAt(value);
    keepDraft({ measuredAt: value });
  }

  function restoreDraft(draft: MeasurementDraft) {
    setValues(draft.values);
    setNote(draft.note);
    if (draft.measuredAt !== null) {
      setTypedMeasuredAt(draft.measuredAt);
      setDateOpen(true);
    }
    // A restored value in a field that is folded away would be invisible.
    if (
      MEASUREMENT_VALUE_FIELDS.some(
        (field) =>
          draft.values[field].trim() !== "" && !leadingFields.includes(field),
      )
    ) {
      setShowAllFields(true);
    }
    setOfferedDraft(null);
  }

  function discardDraft() {
    storeDraft(null);
    setOfferedDraft(null);
  }

  /**
   * Enter moves to the next value, as the phone keyboard's "next" key
   * promises; on the last one it submits as usual. Typing a weight, a fat
   * percentage and a waist then never needs a tap between them.
   */
  function focusNextOnEnter(
    event: KeyboardEvent<HTMLInputElement>,
    field: MeasurementValueField,
  ) {
    if (event.key !== "Enter") {
      return;
    }
    const next = visibleFields[visibleFields.indexOf(field) + 1];
    if (next !== undefined) {
      event.preventDefault();
      document.getElementById(next)?.focus();
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("idle");

    // Left at "now", the instant is taken as the form is sent, not as it was
    // opened: a form that sat open for an hour still records when it was saved.
    const submittedAt =
      typedMeasuredAt ??
      toLocalInputValue(measurement?.measuredAt ?? new Date());
    const input = toMeasurementInput(submittedAt, values, note);
    const parsed = parseMeasurementInput(input);
    setIssues(parsed.issues);
    if (!parsed.measurement) {
      if (parsed.issues.some((issue) => issue.field === "measuredAt")) {
        setDateOpen(true);
      }
      return;
    }

    setPending(true);
    const result = await callServer(() =>
      measurement
        ? updateMeasurementAction(measurement.id, input)
        : createMeasurementAction(input),
    );
    setPending(false);

    if (result.status === "invalid") {
      setIssues(result.issues);
      return;
    }
    if (result.status !== "saved") {
      // Unreachable included: nothing is known to be saved, and everything
      // typed is still in the form to send again.
      setStatus(result.status);
      return;
    }

    storeDraft(null);
    // The detail page confirms what happened; `replace` keeps the form out
    // of the history so "back" does not reopen a form that was submitted.
    router.replace(
      `/measurements/${result.id}?saved=${editing ? "updated" : "created"}`,
    );
    router.refresh();
  }

  const cancelHref = measurement
    ? `/measurements/${measurement.id}`
    : "/measurements";

  /** Whether a field carries a message, so the input can be marked invalid. */
  const invalid = (field: MeasurementIssue["field"]) =>
    issues.some((issue) => issue.field === field);

  /** The three whole-form failures share one alert; only one can be set. */
  const failureMessage =
    status === "error"
      ? t.measurements.saveFailed
      : status === "not-found"
        ? t.measurements.notFound
        : status === "no-height"
          ? t.measurements.noHeight
          : status === "unreachable"
            ? t.common.unreachable
            : null;
  const showDateInput = dateOpen || invalid("measuredAt");

  return (
    // `overflow-visible`: the card clips by default, and a clipping ancestor
    // stops the save bar below from sticking to the viewport.
    <Card className="overflow-visible [--card-spacing:--spacing(6)]">
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-7" noValidate>
          {hydrated && offeredDraft !== null && (
            <Alert>
              <HistoryIcon />
              <AlertDescription>{t.measurements.draftFound}</AlertDescription>
              <AlertAction className="flex gap-2 max-sm:static max-sm:col-span-full max-sm:mt-2">
                <Button
                  type="button"
                  size="sm"
                  onClick={() => restoreDraft(offeredDraft)}
                >
                  {t.measurements.draftRestore}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={discardDraft}
                >
                  {t.measurements.draftDiscard}
                </Button>
              </AlertAction>
            </Alert>
          )}

          {showDateInput ? (
            <div className="flex flex-col gap-2">
              <Label htmlFor="measuredAt">{t.measurements.measuredAt}</Label>
              <Input
                id="measuredAt"
                name="measuredAt"
                type="datetime-local"
                className="w-full sm:w-64"
                // Opened with "Change": the reader is here to edit it.
                autoFocus={!editing}
                aria-invalid={invalid("measuredAt") || undefined}
                aria-describedby={
                  invalid("measuredAt")
                    ? "measuredAt-issues measuredAt-hint"
                    : "measuredAt-hint"
                }
                value={measuredAt}
                onChange={(event) => changeMeasuredAt(event.target.value)}
              />
              <p id="measuredAt-hint" className="text-muted-foreground text-xs">
                {t.measurements.measuredAtHint}
              </p>
              <FieldIssues field="measuredAt" issues={issues} t={t} />
            </div>
          ) : (
            <div className="flex items-center justify-between gap-3">
              <p className="flex flex-col gap-0.5">
                <span className="text-sm font-medium">
                  {t.measurements.measuredAt}
                </span>
                <span className="text-muted-foreground text-sm">
                  {t.measurements.now}
                </span>
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                aria-label={t.measurements.changeMeasuredAt}
                onClick={() => setDateOpen(true)}
              >
                {t.measurements.change}
              </Button>
            </div>
          )}

          <fieldset className="border-border flex flex-col gap-4 border-t pt-6">
            <legend className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
              {t.measurements.values}
            </legend>
            <div className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
              {visibleFields.map((field, index) => {
                const latest = latestValues?.[field] ?? null;
                const help = measurementFieldHelp(t, field);
                const helpOpen = help !== null && openHelp === field;
                const describedBy =
                  [
                    invalid(field) ? `${field}-issues` : null,
                    helpOpen ? `${field}-help` : null,
                  ]
                    .filter(Boolean)
                    .join(" ") || undefined;
                return (
                  <div key={field} className="flex flex-col gap-2">
                    <div className="flex items-center gap-1">
                      {/* No "(optional)" on each value: the page says once
                          that all of them are, and repeating it seven times
                          only lengthens the form. */}
                      <Label htmlFor={field}>
                        {t.measurements.fields[field]}
                      </Label>
                      {help !== null && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-xs"
                          className="text-muted-foreground -my-1"
                          aria-label={t.measurements.howToMeasure}
                          title={t.measurements.howToMeasure}
                          aria-expanded={helpOpen}
                          aria-controls={helpOpen ? `${field}-help` : undefined}
                          onClick={() => setOpenHelp(helpOpen ? null : field)}
                        >
                          <InfoIcon />
                        </Button>
                      )}
                    </div>
                    <Input
                      id={field}
                      name={field}
                      type="text"
                      inputMode={
                        MEASUREMENT_FIELD_SPECS[field].decimals > 0
                          ? "decimal"
                          : "numeric"
                      }
                      autoComplete="off"
                      // Adding is the quick path: the keyboard opens on the
                      // first value. Editing starts wherever the reader taps.
                      autoFocus={!editing && index === 0}
                      enterKeyHint={
                        index < visibleFields.length - 1 ? "next" : "done"
                      }
                      onKeyDown={(event) => focusNextOnEnter(event, field)}
                      placeholder={
                        latest === null
                          ? undefined
                          : t.measurements.lastValue(
                              formatMeasurementNumber(field, latest, language),
                            )
                      }
                      aria-invalid={invalid(field) || undefined}
                      aria-describedby={describedBy}
                      value={values[field]}
                      onChange={(event) => setValue(field, event.target.value)}
                    />
                    {helpOpen && (
                      <p
                        id={`${field}-help`}
                        className="text-muted-foreground text-xs leading-relaxed"
                      >
                        {help}
                      </p>
                    )}
                    <FieldIssues field={field} issues={issues} t={t} />
                  </div>
                );
              })}
            </div>
            {hiddenCount > 0 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="self-start"
                aria-expanded={false}
                onClick={() => setShowAllFields(true)}
              >
                <PlusIcon />
                {t.measurements.moreValues(hiddenCount)}
              </Button>
            )}
          </fieldset>

          <div className="flex flex-col gap-2">
            <Label htmlFor="note">
              {t.measurements.note}{" "}
              <span className="text-muted-foreground font-normal">
                ({t.common.optional})
              </span>
            </Label>
            <Textarea
              id="note"
              name="note"
              rows={2}
              // The validator enforces the same limit; this only stops typing.
              maxLength={NOTE_MAX_LENGTH}
              aria-invalid={invalid("note") || undefined}
              aria-describedby={invalid("note") ? "note-issues note-hint" : "note-hint"}
              value={note}
              onChange={(event) => changeNote(event.target.value)}
            />
            <p id="note-hint" className="text-muted-foreground text-xs">
              {t.measurements.noteHint(NOTE_MAX_LENGTH)}
            </p>
            <FieldIssues field="note" issues={issues} t={t} />
          </div>

          <div className="bg-muted/50 text-muted-foreground flex flex-col gap-1 rounded-xl p-4 text-sm">
            <p className="text-foreground font-medium">
              {t.measurements.heightAtMeasurement}:{" "}
              {formatHeightCm(heightCm, language)}
            </p>
            <p className="text-xs leading-relaxed">
              {editing
                ? t.measurements.heightKept
                : t.measurements.heightFromProfile(
                    formatHeightCm(heightCm, language),
                  )}
            </p>
          </div>

          <FieldIssues field="form" issues={issues} t={t} />

          {failureMessage !== null && (
            <Alert variant="destructive">
              <TriangleAlertIcon />
              <AlertDescription>{failureMessage}</AlertDescription>
            </Alert>
          )}

          {/* Thumb-reachable on a phone, where the bar stays pinned just
              above the bottom navigation so saving never needs a scroll. The
              two buttons share one row there - stacked, they took a fifth of
              the screen away from the form - with Save, the wider one, under
              the right thumb; a trailing pair on a wider screen. */}
          <div className="border-border bg-card flex flex-row gap-2 border-t pt-4 max-sm:sticky max-sm:bottom-[calc(4rem+env(safe-area-inset-bottom,0px))] max-sm:z-20 max-sm:-mx-6 max-sm:rounded-b-xl max-sm:px-6 max-sm:pb-4 sm:justify-end sm:gap-3 sm:pt-6">
            <Button
              type="button"
              variant="ghost"
              size="lg"
              asChild
              className="max-sm:flex-1"
            >
              <Link href={cancelHref}>{t.common.cancel}</Link>
            </Button>
            <Button
              type="submit"
              size="lg"
              // A submission before hydration would be a native GET.
              disabled={pending || !hydrated}
              className="max-sm:flex-[2]"
            >
              {pending ? t.common.saving : t.common.save}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
