/**
 * The colour theme preference.
 *
 * Three states rather than a switch: "system" is the default and follows the
 * operating system, which is what a user who never opens the control expects.
 *
 * The preference lives in `localStorage` and is applied by toggling a single
 * class on `<html>` - the class the `dark` variant in `globals.css` keys off.
 * There is no server-side storage: this is a per-device display preference,
 * not profile data, so it stays out of the database and out of the schema.
 *
 * This module is pure data and DOM: no React, no Prisma.
 */

export const THEMES = ["system", "light", "dark"] as const;

export type Theme = (typeof THEMES)[number];

export const DEFAULT_THEME: Theme = "system";

/** Where the preference is kept; shared with the inline boot script. */
export const THEME_STORAGE_KEY = "health-tracker-theme";

export function isTheme(value: unknown): value is Theme {
  return (THEMES as readonly unknown[]).includes(value);
}

/** The theme actually painted, once "system" has been resolved. */
export type ResolvedTheme = "light" | "dark";

export function resolveTheme(theme: Theme, prefersDark: boolean): ResolvedTheme {
  if (theme === "system") {
    return prefersDark ? "dark" : "light";
  }
  return theme;
}

/**
 * The script that runs before the first paint.
 *
 * Without it the page renders light and then flips, which is the one thing a
 * dark theme must not do. It is deliberately tiny and defensive: private
 * browsing can make `localStorage` throw, and a theme is not worth an
 * exception on boot.
 *
 * Kept as a string so the same constants above are the only source of truth.
 */
export const THEME_BOOT_SCRIPT = `
(function () {
  try {
    var stored = localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});
    var dark =
      stored === "dark" ||
      ((stored === null || stored === "system") &&
        window.matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.classList.toggle("dark", dark);
  } catch (error) {}
})();
`.trim();
