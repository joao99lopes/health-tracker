"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent, type KeyboardEvent } from "react";
import { InfoIcon, PlusIcon, TriangleAlertIcon } from "lucide-react";
import {
  createMeasurementAction,
  updateMeasurementAction,
} from "@/app/(app)/measurements/actions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useHydrated } from "@/hooks/use-hydrated";
import { useI18n } from "@/lib/i18n/context";
import type { Dictionary } from "@/lib/i18n/dictionary";
import { toLocalInputValue } from "@/lib/measurements/datetime";
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

  const [issues, setIssues] = useState<MeasurementIssue[]>([]);
  const [status, setStatus] = useState<
    "idle" | "error" | "not-found" | "no-height"
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

  function setValue(field: MeasurementValueField, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
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

    const input = toMeasurementInput(measuredAt, values, note);
    const parsed = parseMeasurementInput(input);
    setIssues(parsed.issues);
    if (!parsed.measurement) {
      return;
    }

    setPending(true);
    const result = measurement
      ? await updateMeasurementAction(measurement.id, input)
      : await createMeasurementAction(input);
    setPending(false);

    if (result.status === "invalid") {
      setIssues(result.issues);
      return;
    }
    if (result.status !== "saved") {
      setStatus(result.status);
      return;
    }

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
          : null;

  return (
    // `overflow-visible`: the card clips by default, and a clipping ancestor
    // stops the save bar below from sticking to the viewport.
    <Card className="overflow-visible [--card-spacing:--spacing(6)]">
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-7" noValidate>
          <div className="flex flex-col gap-2">
            <Label htmlFor="measuredAt">{t.measurements.measuredAt}</Label>
            <Input
              id="measuredAt"
              name="measuredAt"
              type="datetime-local"
              className="w-full sm:w-64"
              aria-invalid={invalid("measuredAt") || undefined}
              aria-describedby={
                invalid("measuredAt")
                  ? "measuredAt-issues measuredAt-hint"
                  : "measuredAt-hint"
              }
              value={measuredAt}
              onChange={(event) => setTypedMeasuredAt(event.target.value)}
            />
            <p id="measuredAt-hint" className="text-muted-foreground text-xs">
              {t.measurements.measuredAtHint}
            </p>
            <FieldIssues field="measuredAt" issues={issues} t={t} />
          </div>

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
                      <Label htmlFor={field}>
                        {t.measurements.fields[field]}{" "}
                        <span className="text-muted-foreground font-normal">
                          ({t.common.optional})
                        </span>
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
              onChange={(event) => setNote(event.target.value)}
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

          {/* Full width and thumb-reachable on a phone, where the bar stays
              pinned just above the bottom navigation so saving never needs
              a scroll; a trailing pair of buttons on a wider screen. */}
          <div className="border-border bg-card flex flex-col-reverse gap-2 border-t pt-4 max-sm:sticky max-sm:bottom-[calc(4rem+env(safe-area-inset-bottom,0px))] max-sm:z-20 max-sm:-mx-6 max-sm:rounded-b-xl max-sm:px-6 max-sm:pb-4 sm:flex-row sm:justify-end sm:gap-3 sm:pt-6">
            <Button
              type="button"
              variant="ghost"
              size="lg"
              asChild
              className="max-sm:w-full"
            >
              <Link href={cancelHref}>{t.common.cancel}</Link>
            </Button>
            <Button
              type="submit"
              size="lg"
              // A submission before hydration would be a native GET.
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
