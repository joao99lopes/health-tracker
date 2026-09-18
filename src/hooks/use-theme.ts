"use client";

import { useEffect, useSyncExternalStore } from "react";
import {
  DEFAULT_THEME,
  THEME_STORAGE_KEY,
  isTheme,
  type Theme,
} from "@/lib/theme/theme";

/**
 * Reads and writes the colour theme preference.
 *
 * The preference lives in `localStorage`, which only the browser can read, so
 * it is exposed as an external store rather than as state seeded in an
 * effect: React uses the server snapshot - the default - for the server pass
 * and the hydration pass, then re-renders with the stored value. This is the
 * same shape as `useHydrated`, and for the same reason.
 *
 * The *painted* theme is never wrong in the meantime: the boot script in the
 * root layout sets the class on `<html>` before React runs.
 */

/** Read once and kept, so `getSnapshot` returns a stable value per change. */
let cached: Theme | null = null;

function readStored(): Theme {
  if (cached === null) {
    try {
      const stored = localStorage.getItem(THEME_STORAGE_KEY);
      cached = isTheme(stored) ? stored : DEFAULT_THEME;
    } catch {
      // Storage can be unavailable; the default is a fine answer.
      cached = DEFAULT_THEME;
    }
  }
  return cached;
}

const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) {
    listener();
  }
}

/** Applies a resolved preference to the class the `dark` variant keys off. */
function applyTheme(theme: Theme): void {
  const dark =
    theme === "dark" ||
    (theme === "system" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", dark);
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);

  // Another tab of the same app changing the preference.
  const onStorage = (event: StorageEvent) => {
    if (event.key !== THEME_STORAGE_KEY) {
      return;
    }
    cached = isTheme(event.newValue) ? event.newValue : DEFAULT_THEME;
    applyTheme(cached);
    emit();
  };
  window.addEventListener("storage", onStorage);

  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

function setStoredTheme(next: Theme): void {
  cached = next;
  try {
    localStorage.setItem(THEME_STORAGE_KEY, next);
  } catch {
    // A preference that cannot be stored still applies to this page.
  }
  applyTheme(next);
  emit();
}

export function useTheme(): {
  theme: Theme;
  setTheme: (theme: Theme) => void;
} {
  const theme = useSyncExternalStore(
    subscribe,
    readStored,
    () => DEFAULT_THEME,
  );

  // Keeps the class in step with the preference, and - while the preference
  // is "system" - with the operating system for as long as the page is open.
  //
  // It applies the *stored* value rather than `theme`, because the first
  // committed render is the hydration pass, which still holds the server
  // snapshot. Applying that would briefly override what the boot script had
  // already painted correctly.
  useEffect(() => {
    const apply = () => applyTheme(readStored());
    apply();
    if (theme !== "system") {
      return;
    }
    const query = window.matchMedia("(prefers-color-scheme: dark)");
    query.addEventListener("change", apply);
    return () => query.removeEventListener("change", apply);
  }, [theme]);

  return { theme, setTheme: setStoredTheme };
}
