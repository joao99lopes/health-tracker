/**
 * How the running version is shown.
 *
 * CI passes the full commit SHA; people compare the short form git prints.
 * Anything that is not a SHA (a tag, a hand-set value) is shown as given.
 *
 * This module is pure: no Next, no environment access.
 */

const FULL_SHA = /^[0-9a-f]{40}$/i;

export function displayVersion(version: string | null): string | null {
  if (version === null || version.trim() === "") {
    return null;
  }
  const trimmed = version.trim();
  return FULL_SHA.test(trimmed) ? trimmed.slice(0, 7) : trimmed;
}
