import {
  EARLIEST_BIRTH_DATE,
  HEIGHT_CM_DECIMALS,
  HEIGHT_CM_MAX,
  HEIGHT_CM_MIN,
  NAME_MAX_LENGTH,
  isSex,
  type Sex,
} from "./fields.ts";
import { isLanguage, type Language } from "../i18n/languages.ts";

/**
 * Profile validation, shared by the form and the server action so the two
 * cannot disagree about what is acceptable.
 *
 * This module is pure: no Prisma, no React, no environment access. It takes
 * the raw strings a form produces and either reports every problem or returns
 * parsed values ready to store.
 */

/** Exactly what the form submits - every field as the browser gives it. */
export type ProfileInput = {
  name: string;
  birthDate: string;
  sex: string;
  heightCm: string;
  language: string;
};

/** A stored profile, parsed and ready for the database. */
export type ParsedProfile = {
  name: string | null;
  /** Calendar date as `YYYY-MM-DD`; a birthday has no time or time zone. */
  birthDate: string;
  sex: Sex;
  heightCm: number;
  language: Language;
};

export type ProfileIssue =
  | "NAME_TOO_LONG"
  | "BIRTH_DATE_REQUIRED"
  | "BIRTH_DATE_INVALID"
  | "BIRTH_DATE_IN_FUTURE"
  | "BIRTH_DATE_TOO_OLD"
  | "SEX_REQUIRED"
  | "SEX_INVALID"
  | "HEIGHT_REQUIRED"
  | "HEIGHT_INVALID"
  | "HEIGHT_OUT_OF_RANGE"
  | "LANGUAGE_INVALID";

export type ProfileParseResult =
  | { issues: ProfileIssue[]; profile?: undefined }
  | { issues: []; profile: ParsedProfile };

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Whether `value` is a real calendar date written as `YYYY-MM-DD`.
 *
 * Comparing back to the input rejects the dates `Date` silently rolls over,
 * such as 2025-02-31.
 */
function isCalendarDate(value: string): boolean {
  if (!ISO_DATE.test(value)) {
    return false;
  }
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return (
    !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value
  );
}

/** Today in UTC as `YYYY-MM-DD`, so the future check has no time component. */
function todayIso(now: Date): string {
  return now.toISOString().slice(0, 10);
}

function validateBirthDate(value: string, now: Date): ProfileIssue | null {
  if (value.length === 0) {
    return "BIRTH_DATE_REQUIRED";
  }
  if (!isCalendarDate(value)) {
    return "BIRTH_DATE_INVALID";
  }
  if (value > todayIso(now)) {
    return "BIRTH_DATE_IN_FUTURE";
  }
  if (value < EARLIEST_BIRTH_DATE) {
    return "BIRTH_DATE_TOO_OLD";
  }
  return null;
}

/**
 * Parses a height typed by a user. Both `,` and `.` are accepted as the
 * decimal separator: the interface is also Portuguese, where `,` is the norm.
 */
export function parseHeightCm(value: string): number | null {
  const normalized = value.trim().replace(",", ".");
  if (!/^\d+(\.\d+)?$/.test(normalized)) {
    return null;
  }
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

/** Height as the Decimal(5, 1) column stores it. */
export function roundHeightCm(value: number): number {
  const factor = 10 ** HEIGHT_CM_DECIMALS;
  return Math.round(value * factor) / factor;
}

/**
 * Every problem with the submitted profile, in display order, or the parsed
 * profile when there are none.
 *
 * `now` is injectable so the future check is testable.
 */
export function parseProfileInput(
  input: ProfileInput,
  now: Date = new Date(),
): ProfileParseResult {
  const issues: ProfileIssue[] = [];

  const name = input.name.trim();
  if (name.length > NAME_MAX_LENGTH) {
    issues.push("NAME_TOO_LONG");
  }

  const birthDate = input.birthDate.trim();
  const birthDateIssue = validateBirthDate(birthDate, now);
  if (birthDateIssue) {
    issues.push(birthDateIssue);
  }

  const sex = input.sex.trim();
  if (sex.length === 0) {
    issues.push("SEX_REQUIRED");
  } else if (!isSex(sex)) {
    issues.push("SEX_INVALID");
  }

  const heightRaw = input.heightCm.trim();
  const heightCm = parseHeightCm(heightRaw);
  if (heightRaw.length === 0) {
    issues.push("HEIGHT_REQUIRED");
  } else if (heightCm === null) {
    issues.push("HEIGHT_INVALID");
  } else if (heightCm < HEIGHT_CM_MIN || heightCm > HEIGHT_CM_MAX) {
    issues.push("HEIGHT_OUT_OF_RANGE");
  }

  const language = input.language.trim();
  if (!isLanguage(language)) {
    issues.push("LANGUAGE_INVALID");
  }

  if (issues.length > 0) {
    return { issues };
  }

  return {
    issues: [],
    profile: {
      name: name.length > 0 ? name : null,
      birthDate,
      sex: sex as Sex,
      // Rounded to the column's precision here rather than letting the
      // database do it silently, so what is stored is what was validated.
      heightCm: roundHeightCm(heightCm as number),
      language: language as Language,
    },
  };
}

/** Raised when a profile reaches the server without passing the rules above. */
export class ProfileValidationError extends Error {
  // Written out rather than declared as a constructor parameter property:
  // Node's type stripping does not support those, and the tests run on it.
  readonly issues: ProfileIssue[];

  constructor(issues: ProfileIssue[]) {
    super(issues.join(", "));
    this.name = "ProfileValidationError";
    this.issues = issues;
  }
}

/** Server-side guard: parse or throw, so a caller cannot skip the check. */
export function parseProfileOrThrow(
  input: ProfileInput,
  now: Date = new Date(),
): ParsedProfile {
  const result = parseProfileInput(input, now);
  if (!result.profile) {
    throw new ProfileValidationError(result.issues);
  }
  return result.profile;
}
