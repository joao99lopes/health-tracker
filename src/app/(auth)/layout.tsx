import type { ReactNode } from "react";
import { ActivityIcon } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { getTranslations } from "@/lib/i18n/server";

/**
 * Centred, chrome-free frame for the signed-out pages.
 *
 * The product is named once, above the card, so the two auth pages open with
 * the same mark and the card itself only has to carry the form.
 */
export default async function AuthLayout({
  children,
}: {
  children: ReactNode;
}) {
  const { t } = await getTranslations();

  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center px-4 py-12">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <div className="flex w-full max-w-sm flex-col gap-6">
        <div className="flex flex-col items-center gap-3">
          <span
            className="bg-primary text-primary-foreground flex size-11 items-center justify-center rounded-2xl"
            aria-hidden
          >
            <ActivityIcon className="size-6" />
          </span>
          <span className="font-heading text-lg font-semibold">
            {t.common.appName}
          </span>
        </div>

        {children}
      </div>
    </div>
  );
}
