"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboardIcon, ScaleIcon, UserRoundIcon } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslations } from "@/lib/i18n/context";
import type { Dictionary } from "@/lib/i18n/dictionary";

/**
 * The signed-in navigation, in the two shapes the app needs.
 *
 * `MainNav` is the row of tabs in the header from the small breakpoint up.
 * `MobileNav` is the bar fixed to the bottom of the viewport below it, where
 * the header has no room for three labels and the thumb does not reach the
 * top of a phone.
 *
 * Both are driven by the same list and the same active rule, so they cannot
 * disagree about where the reader is. Only the pages that exist are listed.
 */

type NavItem = { href: string; label: string; icon: LucideIcon };

function navItems(t: Dictionary): NavItem[] {
  return [
    { href: "/", label: t.nav.dashboard, icon: LayoutDashboardIcon },
    { href: "/measurements", label: t.nav.measurements, icon: ScaleIcon },
    { href: "/profile", label: t.nav.profile, icon: UserRoundIcon },
  ];
}

/** A nested page such as /measurements/new keeps its section marked. */
function isActive(pathname: string, href: string): boolean {
  return (
    pathname === href || (href !== "/" && pathname.startsWith(`${href}/`))
  );
}

export function MainNav() {
  const pathname = usePathname();
  const t = useTranslations();

  return (
    <nav aria-label={t.nav.primary} className="hidden items-center gap-1 sm:flex">
      {navItems(t).map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "focus-visible:ring-ring/50 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors outline-none focus-visible:ring-3",
              active
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function MobileNav() {
  const pathname = usePathname();
  const t = useTranslations();

  return (
    <nav
      aria-label={t.nav.primary}
      className="bg-background/95 border-border pb-safe fixed inset-x-0 bottom-0 z-30 border-t backdrop-blur sm:hidden"
    >
      <ul className="grid grid-cols-3">
        {navItems(t).map((item) => {
          const active = isActive(pathname, item.href);
          const Icon = item.icon;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "focus-visible:ring-ring/50 flex flex-col items-center gap-1 px-2 pt-2.5 pb-2 text-[0.6875rem] font-medium transition-colors outline-none -outline-offset-2 focus-visible:ring-3",
                  active
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="size-5" aria-hidden />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
