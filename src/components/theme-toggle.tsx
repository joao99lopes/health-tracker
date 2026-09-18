"use client";

import { MonitorIcon, MoonIcon, SunIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/hooks/use-theme";
import { useTranslations } from "@/lib/i18n/context";
import type { Theme } from "@/lib/theme/theme";

/**
 * Cycles the colour theme: system → light → dark → system.
 *
 * One control rather than three, because the header has one slot for it on a
 * phone. The accessible name states what pressing it will do, and the title
 * states where it currently stands, so neither is left to the icon alone.
 */

const ICONS = {
  system: MonitorIcon,
  light: SunIcon,
  dark: MoonIcon,
} as const;

const NEXT_THEME: Record<Theme, Theme> = {
  system: "light",
  light: "dark",
  dark: "system",
};

export function ThemeToggle() {
  const t = useTranslations();
  const { theme, setTheme } = useTheme();

  const Icon = ICONS[theme];
  const next = NEXT_THEME[theme];

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      onClick={() => setTheme(next)}
      aria-label={t.theme.switchTo(t.theme.names[next])}
      title={t.theme.current(t.theme.names[theme])}
    >
      <Icon />
    </Button>
  );
}
