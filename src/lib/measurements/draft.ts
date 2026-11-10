import { MEASUREMENT_VALUE_FIELDS, NOTE_MAX_LENGTH } from "./fields.ts";
import { emptyFormValues, type MeasurementFormValues } from "./form.ts";

/**
 * An unsaved new measurement, kept in the tab's `sessionStorage` while it is
 * being typed.
 *
 * If saving fails and the page is reloaded, or the phone discards the tab in
 * the background, what was typed would otherwise be gone. The draft is
 * offered back - never applied by itself, so nothing appears in the form that
 * the reader did not ask for - and it is forgotten once the measurement is
 * saved or the offer is dismissed.
 *
 * Only adding keeps a draft: an edit starts from the stored row, which is
 * still there after a reload.
 *
 * Whatever is read back is treated as untrusted text and checked field by
 * field; anything unexpected makes the whole draft count as absent.
 *
 * This module is pure: no React, no storage access.
 */

export type MeasurementDraft = {
  values: MeasurementFormValues;
  note: string;
  /** The typed date and time, or null when it was left at "now". */
  measuredAt: string | null;
};

export const DRAFT_STORAGE_KEY = "health-tracker:measurement-draft";

/** Longer than any number or date anyone types; a cap on what is read back. */
const MAX_FIELD_LENGTH = 32;

/** Whether a draft holds anything worth offering back. */
export function hasDraftContent(draft: MeasurementDraft): boolean {
  return (
    MEASUREMENT_VALUE_FIELDS.some((field) => draft.values[field].trim() !== "") ||
    draft.note.trim() !== ""
  );
}

/** The draft as stored text, or null when there is nothing to keep. */
export function serializeDraft(draft: MeasurementDraft): string | null {
  return hasDraftContent(draft) ? JSON.stringify(draft) : null;
}

function isShortString(value: unknown, max: number): value is string {
  return typeof value === "string" && value.length <= max;
}

/** A stored draft read back, or null when there is none or it is not one. */
export function parseDraft(text: string | null): MeasurementDraft | null {
  if (text === null) {
    return null;
  }
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return null;
  }
  if (typeof raw !== "object" || raw === null) {
    return null;
  }
  const { values, note, measuredAt } = raw as Record<string, unknown>;
  if (typeof values !== "object" || values === null) {
    return null;
  }
  const parsed = emptyFormValues();
  for (const field of MEASUREMENT_VALUE_FIELDS) {
    const value = (values as Record<string, unknown>)[field];
    if (!isShortString(value, MAX_FIELD_LENGTH)) {
      return null;
    }
    parsed[field] = value;
  }
  if (!isShortString(note, NOTE_MAX_LENGTH)) {
    return null;
  }
  if (measuredAt !== null && !isShortString(measuredAt, MAX_FIELD_LENGTH)) {
    return null;
  }
  const draft = { values: parsed, note, measuredAt };
  return hasDraftContent(draft) ? draft : null;
}
