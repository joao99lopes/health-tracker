import type { ReactNode } from "react";
import { getTranslations } from "@/lib/i18n/server";

/**
 * Wraps a loading placeholder and announces it.
 *
 * The skeletons themselves are shapes with no text in them, which a screen
 * reader has nothing to say about; this states that the page is loading and
 * hides the shapes from the accessibility tree.
 */
export async function LoadingRegion({ children }: { children: ReactNode }) {
  const { t } = await getTranslations();

  return (
    <div role="status" aria-live="polite">
      <span className="sr-only">{t.states.loading}</span>
      <div aria-hidden>{children}</div>
    </div>
  );
}
