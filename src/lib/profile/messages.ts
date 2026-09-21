import type { Dictionary } from "@/lib/i18n/dictionary";
import {
  HEIGHT_CM_MAX,
  HEIGHT_CM_MIN,
  NAME_MAX_LENGTH,
} from "@/lib/profile/fields";
import type { ProfileIssue } from "@/lib/profile/validation";

/**
 * Validation codes rendered in the current language.
 *
 * Kept out of the form so no user-facing string lives in JSX, and so the
 * bounds quoted in a message can only come from the module that enforces them.
 */
export function profileIssueMessage(t: Dictionary, issue: ProfileIssue): string {
  const messages = t.profile.issues;
  switch (issue) {
    case "NAME_TOO_LONG":
      return messages.NAME_TOO_LONG(NAME_MAX_LENGTH);
    case "HEIGHT_OUT_OF_RANGE":
      return messages.HEIGHT_OUT_OF_RANGE(HEIGHT_CM_MIN, HEIGHT_CM_MAX);
    default:
      return messages[issue];
  }
}

/** The field each code belongs to, so the message appears under its input. */
export const PROFILE_ISSUE_FIELD: Record<
  ProfileIssue,
  "name" | "birthDate" | "sex" | "heightCm" | "language" | "directions"
> = {
  NAME_TOO_LONG: "name",
  BIRTH_DATE_REQUIRED: "birthDate",
  BIRTH_DATE_INVALID: "birthDate",
  BIRTH_DATE_IN_FUTURE: "birthDate",
  BIRTH_DATE_TOO_OLD: "birthDate",
  SEX_REQUIRED: "sex",
  SEX_INVALID: "sex",
  HEIGHT_REQUIRED: "heightCm",
  HEIGHT_INVALID: "heightCm",
  HEIGHT_OUT_OF_RANGE: "heightCm",
  LANGUAGE_INVALID: "language",
  DIRECTION_INVALID: "directions",
};
