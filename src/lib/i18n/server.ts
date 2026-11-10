import "server-only";

import { cookies, headers } from "next/headers";
import { getSessionUser } from "@/lib/auth/session";
import { getProfileLanguage } from "@/lib/profile/queries";
import { getDictionary, type Dictionary } from "@/lib/i18n/dictionary";
import {
  DEFAULT_LANGUAGE,
  LANGUAGE_COOKIE,
  isLanguage,
  type Language,
} from "@/lib/i18n/languages";

/**
 * Server-side language resolution, in order of authority:
 *
 * 1. the signed-in user's stored preference,
 * 2. the language this browser was using when it last signed out (the
 *    `LANGUAGE_COOKIE`), so signing out does not switch the language,
 * 3. the browser's `Accept-Language`, so a signed-out or brand-new user is not
 *    forced into English before they can pick,
 * 4. the default.
 */

/** First supported language in the header's list, ignoring quality weights. */
function fromAcceptLanguage(header: string | null): Language | null {
  if (!header) {
    return null;
  }
  for (const part of header.split(",")) {
    const tag = part.split(";")[0]?.trim().toLowerCase() ?? "";
    const base = tag.split("-")[0] ?? "";
    if (isLanguage(base)) {
      return base;
    }
  }
  return null;
}

export async function resolveLanguage(): Promise<Language> {
  const user = await getSessionUser();
  if (user) {
    const preferred = await getProfileLanguage(user.id);
    if (preferred) {
      return preferred;
    }
  }
  const remembered = (await cookies()).get(LANGUAGE_COOKIE)?.value;
  if (remembered !== undefined && isLanguage(remembered)) {
    return remembered;
  }
  const requestHeaders = await headers();
  return (
    fromAcceptLanguage(requestHeaders.get("accept-language")) ??
    DEFAULT_LANGUAGE
  );
}

/** The resolved language together with its catalogue. */
export async function getTranslations(): Promise<{
  language: Language;
  t: Dictionary;
}> {
  const language = await resolveLanguage();
  return { language, t: getDictionary(language) };
}
