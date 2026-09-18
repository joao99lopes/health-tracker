import type { ReactNode } from "react";
import { ActivityIcon } from "lucide-react";
import { MainNav, MobileNav } from "@/components/main-nav";
import { SignOutButton } from "@/components/sign-out-button";
import { ThemeToggle } from "@/components/theme-toggle";
import { getTranslations } from "@/lib/i18n/server";

/**
 * Page chrome for signed-in routes.
 *
 * The header sticks to the top so the reader never loses their place while
 * scrolling a long measurement history. Below the small breakpoint the
 * sections move to a bar fixed at the bottom of the viewport, and the main
 * column reserves room for it - and for the floating action button above it -
 * so nothing ever hides the last row of a list.
 */
export async function AppShell({
  children,
  userEmail,
}: {
  children: ReactNode;
  userEmail: string;
}) {
  const { t } = await getTranslations();

  return (
    <div className="bg-background text-foreground flex min-h-dvh flex-col">
      <header className="bg-background/85 border-border sticky top-0 z-30 border-b backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-5xl items-center gap-2 px-4 sm:h-16 sm:gap-4 sm:px-6">
          <span className="flex items-center gap-2">
            <span
              className="bg-primary text-primary-foreground flex size-7 items-center justify-center rounded-lg"
              aria-hidden
            >
              <ActivityIcon className="size-4" />
            </span>
            <span className="font-heading text-[0.9375rem] font-semibold">
              {t.common.appName}
            </span>
          </span>

          <MainNav />

          <div className="ml-auto flex items-center gap-1 sm:gap-2">
            <span
              className="text-muted-foreground hidden max-w-50 truncate text-sm md:inline"
              title={userEmail}
            >
              {userEmail}
            </span>
            <ThemeToggle />
            <SignOutButton />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pt-6 pb-28 sm:px-6 sm:pt-10 sm:pb-16">
        {children}
      </main>

      <MobileNav />
    </div>
  );
}
