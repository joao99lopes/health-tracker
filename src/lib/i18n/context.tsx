"use client";

import { createContext, useContext, type ReactNode } from "react";
import { getDictionary, type Dictionary } from "@/lib/i18n/dictionary";
import { DEFAULT_LANGUAGE, type Language } from "@/lib/i18n/languages";

/**
 * The resolved language, handed from the server layout to client components.
 *
 * Client components read their strings from here instead of holding literals,
 * so translations stay outside React and adding a language stays additive.
 */
type I18n = { language: Language; t: Dictionary };

const I18nContext = createContext<I18n>({
  language: DEFAULT_LANGUAGE,
  t: getDictionary(DEFAULT_LANGUAGE),
});

export function I18nProvider({
  language,
  children,
}: {
  language: Language;
  children: ReactNode;
}) {
  return (
    <I18nContext.Provider value={{ language, t: getDictionary(language) }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n(): I18n {
  return useContext(I18nContext);
}

/** Shorthand for the common case of only needing the catalogue. */
export function useTranslations(): Dictionary {
  return useI18n().t;
}
