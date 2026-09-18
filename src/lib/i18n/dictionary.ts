import { en } from "./dictionaries/en.ts";
import { pt } from "./dictionaries/pt.ts";
import { DEFAULT_LANGUAGE, type Language } from "./languages.ts";

/**
 * Translation lookup.
 *
 * The English catalogue defines the shape; every other language is typed
 * against it. Dictionaries are plain data, so they can be used from server
 * components, client components and the validation layer alike - user-facing
 * strings never live in JSX.
 */
export type Dictionary = typeof en;

const DICTIONARIES: Record<Language, Dictionary> = { en, pt };

export function getDictionary(language: Language = DEFAULT_LANGUAGE): Dictionary {
  return DICTIONARIES[language];
}
