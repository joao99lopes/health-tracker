"use client";

import { useRouter } from "next/navigation";
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
  HISTORY_PAGE_SIZE,
  historyHref,
  type HistoryQuery,
} from "@/lib/measurements/history";
import { PERIOD_KEYS, isPeriodKey } from "@/lib/periods/periods";

/**
 * The period picker above the history. Picking one changes the address and
 * the server sends that slice; the period set is the one defined once.
 */
export function HistoryControls({ query }: { query: HistoryQuery }) {
  const t = useTranslations();
  const router = useRouter();

  return (
    <div className="flex items-center gap-3 print:hidden">
      <Label htmlFor="history-period" className="text-muted-foreground text-sm">
        {t.charts.period}
      </Label>
      <Select
        value={query.period}
        onValueChange={(value) => {
          if (isPeriodKey(value)) {
            // A new period starts again from the first page.
            router.replace(
              historyHref({ period: value, limit: HISTORY_PAGE_SIZE }),
              { scroll: false },
            );
          }
        }}
      >
        <SelectTrigger id="history-period" className="w-40">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {PERIOD_KEYS.map((option) => (
            <SelectItem key={option} value={option}>
              {t.periods[option]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
