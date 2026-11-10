"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { PrinterIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTranslations } from "@/lib/i18n/context";
import {
  PERIOD_KEYS,
  isPeriodKey,
  type PeriodKey,
} from "@/lib/periods/periods";

/**
 * The report's controls: its period and a print button. Neither is printed.
 *
 * Printing always uses the light theme. A dark page printed as is loses its
 * background (browsers skip backgrounds by default) and keeps its light
 * text, which comes out nearly invisible; the theme class is lifted for the
 * duration of the print and put back afterwards, whichever way the print
 * was started (this button or the browser's own menu).
 */
export function ReportControls({ period }: { period: PeriodKey }) {
  const t = useTranslations();
  const router = useRouter();

  useEffect(() => {
    const root = document.documentElement;
    // Some print paths fire `beforeprint` more than once; only the first one
    // may record the theme, or the second would record "light" and the dark
    // theme would never come back.
    let printing = false;
    let wasDark = false;
    const before = () => {
      if (!printing) {
        printing = true;
        wasDark = root.classList.contains("dark");
      }
      root.classList.remove("dark");
    };
    const after = () => {
      if (printing && wasDark) {
        root.classList.add("dark");
      }
      printing = false;
    };
    window.addEventListener("beforeprint", before);
    window.addEventListener("afterprint", after);
    return () => {
      window.removeEventListener("beforeprint", before);
      window.removeEventListener("afterprint", after);
    };
  }, []);

  return (
    <div className="flex flex-col gap-2 print:hidden">
      <div className="flex flex-wrap items-center gap-3">
        <Label htmlFor="report-period" className="text-muted-foreground text-sm">
          {t.charts.period}
        </Label>
        <Select
          value={period}
          onValueChange={(value) => {
            if (isPeriodKey(value)) {
              router.replace(`/report?period=${value}`, { scroll: false });
            }
          }}
        >
          <SelectTrigger id="report-period" className="w-40">
            <SelectValue>{t.periods[period]}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {PERIOD_KEYS.map((option) => (
              <SelectItem key={option} value={option}>
                {t.periods[option]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button type="button" onClick={() => window.print()}>
          <PrinterIcon />
          {t.report.print}
        </Button>
      </div>
      <p className="text-muted-foreground text-xs">{t.report.printHint}</p>
    </div>
  );
}
