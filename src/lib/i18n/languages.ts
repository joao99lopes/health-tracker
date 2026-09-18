/**
 * The supported interface languages, defined once.
 *
 * Adding a language is additive: add its code here and add a dictionary in
 * `./dictionaries`. TypeScript then requires the new dictionary to cover every
 * key, so nothing can be half-translated.
 *
 * These codes are BCP 47 tags used for `<html lang>`. The database stores the
 * same set as the `Language` enum in upper case; the mapping lives in
 * `src/lib/profile/queries.ts`.
 */
export const LANGUAGES = ["en", "pt"] as const;

export type Language = (typeof LANGUAGES)[number];

/** Used before a user has chosen one, and when a stored value is unknown. */
export const DEFAULT_LANGUAGE: Language = "en";

export function isLanguage(value: string): value is Language {
  return (LANGUAGES as readonly string[]).includes(value);
}

/** How each language names itself, for the language picker. */
export const LANGUAGE_NAMES: Record<Language, string> = {
  en: "English",
  pt: "Português",
};
