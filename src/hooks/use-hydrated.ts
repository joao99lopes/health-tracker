"use client";

import { useSyncExternalStore } from "react";

/**
 * Whether this component has hydrated in the browser.
 *
 * Some values can only be right in the browser - anything shown in the
 * reader's own time zone, which the server does not know. Rendering them
 * needs the server pass and the hydration pass to agree, and only then to
 * change.
 *
 * `useSyncExternalStore` does exactly that: React uses the server snapshot for
 * both of those renders and re-renders with the client snapshot afterwards.
 * Flipping a flag in an effect would be the same idea done as a cascading
 * render, which React's lint rules rightly reject.
 */

/** Nothing ever changes; the difference is only server versus client. */
function subscribe(): () => void {
  return () => {};
}

export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
