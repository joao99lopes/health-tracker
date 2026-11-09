import {
  EARLIEST_MEASURED_AT,
  NOTE_MAX_LENGTH,
  MEASUREMENT_FIELD_SPECS,
  MEASUREMENT_VALUE_FIELDS,
  type MeasurementValueField,
  type MeasurementValues,
} from "./fields.ts";

/**
 * Measurement validation rules shared by the server and the client, so both
 * enforce exactly the same thing.
 *
 * This module is pure: no Prisma, no React, no environment access. It takes
 * the raw strings a form produces and either reports every problem or returns
 * parsed values ready to store.
 */

/** A field is "supplied" when it is present and not null. */
function isSupplied(value: number | null | undefined): value is number {
  return value !== null && value !== undefined;
}

/**
 * The core rule: a measurement row with only a timestamp and a height records
 * nothing, so at least one actual value must be present.
 */
export function hasAtLeastOneValue(values: MeasurementValues): boolean {
  return MEASUREMENT_VALUE_FIELDS.some((field) => isSupplied(values[field]));
}

/** Which of the value fields the user actually supplied. */
export function suppliedValueFields(
  values: MeasurementValues,
): readonly string[] {
  return MEASUREMENT_VALUE_FIELDS.filter((field) => isSupplied(values[field]));
}

/** Raised when a measurement breaks a rule in this module. */
export class MeasurementValidationError extends Error {
  // Written out rather than declared as a constructor parameter property:
  // Node's type stripping does not support those, and the tests run on it.
  readonly code: "NO_VALUES";

  constructor(code: "NO_VALUES") {
    super(code);
    this.name = "MeasurementValidationError";
    this.code = code;
  }
}

/**
 * Server-side guard. Throws rather than returning a boolean so a caller cannot
 * forget to check the result.
 */
export function assertAtLeastOneValue(values: MeasurementValues): void {
  if (!hasAtLeastOneValue(values)) {
    throw new MeasurementValidationError("NO_VALUES");
  }
}

// ---------------------------------------------------------------------------
// Parsing a submitted form
// ---------------------------------------------------------------------------

/**
 * Exactly what the form submits.
 *
 * `measuredAt` is an ISO 8601 instant, not a wall-clock string: the browser
 * resolves the user's offset before submitting. See ./datetime.ts.
 *
 * Every value is a string because that is what an input produces; an empty
 * one means "not measured", which is allowed for all of them.
 */
export type MeasurementInput = {
  measuredAt: string;
  /** Free text; absent or blank means no note. */
  note?: string;
} & { [K in MeasurementValueField]: string };

/** A measurement parsed and ready for the database. */
export type ParsedMeasurement = {
  measuredAt: Date;
  /** Present for every field; null where the user left the input empty. */
  values: Record<MeasurementValueField, number | null>;
  /** Trimmed; null when blank. */
  note: string | null;
};

export type MeasurementIssueCode =
  | "MEASURED_AT_REQUIRED"
  | "MEASURED_AT_INVALID"
  | "MEASURED_AT_IN_FUTURE"
  | "MEASURED_AT_TOO_OLD"
  | "VALUE_INVALID"
  | "VALUE_OUT_OF_RANGE"
  | "NOTE_TOO_LONG"
  | "NO_VALUES";

/**
 * One problem, tagged with where it belongs.
 *
 * `"form"` is the whole-measurement case: no single input is wrong, the
 * combination is.
 */
export type MeasurementIssue = {
  field: MeasurementValueField | "measuredAt" | "note" | "form";
  code: MeasurementIssueCode;
};

export type MeasurementParseResult =
  | { issues: MeasurementIssue[]; measurement?: undefined }
  | { issues: []; measurement: ParsedMeasurement };

/**
 * Parses a number typed by a user. Both `,` and `.` are accepted as the
 * decimal separator: the interface is also Portuguese, where `,` is the norm.
 */
export function parseDecimalInput(value: string): number | null {
  const normalized = value.trim().replace(",", ".");
  if (!/^-?\d+(\.\d+)?$/.test(normalized)) {
    return null;
  }
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

/** A value rounded to the precision its column stores. */
export function roundToField(
  field: MeasurementValueField,
  value: number,
): number {
  const factor = 10 ** MEASUREMENT_FIELD_SPECS[field].decimals;
  return Math.round(value * factor) / factor;
}

const EARLIEST_MEASURED_AT_MS = Date.parse(EARLIEST_MEASURED_AT);

/**
 * An ISO 8601 instant that names its own offset.
 *
 * The designator is required: a string such as `2026-03-01T08:00` would be
 * read against whichever time zone the code happens to run in, which is the
 * user's browser in one place and a UTC container in the other.
 */
const ISO_INSTANT =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})$/;

function parseMeasuredAt(
  value: string,
  now: Date,
): { date: Date } | { code: MeasurementIssueCode } {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return { code: "MEASURED_AT_REQUIRED" };
  }
  if (!ISO_INSTANT.test(trimmed)) {
    return { code: "MEASURED_AT_INVALID" };
  }
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    return { code: "MEASURED_AT_INVALID" };
  }
  // A measurement cannot have been taken later than now; a historical one is
  // the whole point, so there is no lower bound beyond plausibility.
  if (parsed.getTime() > now.getTime()) {
    return { code: "MEASURED_AT_IN_FUTURE" };
  }
  if (parsed.getTime() < EARLIEST_MEASURED_AT_MS) {
    return { code: "MEASURED_AT_TOO_OLD" };
  }
  return { date: parsed };
}

/**
 * Every problem with the submitted measurement, in display order, or the
 * parsed measurement when there are none.
 *
 * `now` is injectable so the future check is testable.
 */
export function parseMeasurementInput(
  input: MeasurementInput,
  now: Date = new Date(),
): MeasurementParseResult {
  const issues: MeasurementIssue[] = [];

  const measuredAt = parseMeasuredAt(input.measuredAt, now);
  if ("code" in measuredAt) {
    issues.push({ field: "measuredAt", code: measuredAt.code });
  }

  const values = {} as Record<MeasurementValueField, number | null>;
  for (const field of MEASUREMENT_VALUE_FIELDS) {
    const raw = (input[field] ?? "").trim();
    if (raw.length === 0) {
      values[field] = null;
      continue;
    }

    const parsed = parseDecimalInput(raw);
    if (parsed === null) {
      values[field] = null;
      issues.push({ field, code: "VALUE_INVALID" });
      continue;
    }

    const spec = MEASUREMENT_FIELD_SPECS[field];
    // Rounded before the range check, so a value that only leaves the range
    // through its discarded digits is not rejected for a digit we drop.
    const rounded = roundToField(field, parsed);
    if (rounded < spec.min || rounded > spec.max) {
      values[field] = null;
      issues.push({ field, code: "VALUE_OUT_OF_RANGE" });
      continue;
    }

    values[field] = rounded;
  }

  // A note is context, not a measurement: it is checked for length only and
  // never counts towards the at-least-one-value rule below.
  const note = (input.note ?? "").trim();
  if (note.length > NOTE_MAX_LENGTH) {
    issues.push({ field: "note", code: "NOTE_TOO_LONG" });
  }

  // Only meaningful once the individual values are known to be sound: an
  // out-of-range weight is one problem, not two.
  if (
    !issues.some((issue) => issue.code === "VALUE_INVALID" || issue.code === "VALUE_OUT_OF_RANGE") &&
    !hasAtLeastOneValue(values)
  ) {
    issues.push({ field: "form", code: "NO_VALUES" });
  }

  if (issues.length > 0) {
    return { issues };
  }

  return {
    issues: [],
    measurement: {
      measuredAt: (measuredAt as { date: Date }).date,
      values,
      note: note.length > 0 ? note : null,
    },
  };
}
