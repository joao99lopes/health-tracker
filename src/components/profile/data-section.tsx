"use client";

import { DownloadIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useTranslations } from "@/lib/i18n/context";

/**
 * Export of the user's own data. Plain links: the route handler sets
 * `Content-Disposition`, so the browser downloads rather than navigates.
 */
export function DataSection() {
  const t = useTranslations();

  return (
    <Card className="[--card-spacing:--spacing(6)]">
      <CardHeader>
        <CardTitle>{t.data.title}</CardTitle>
        <CardDescription>{t.data.description}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 sm:flex-row">
        <Button asChild variant="outline" className="max-sm:w-full">
          <a href="/api/export?format=csv" download>
            <DownloadIcon />
            {t.data.exportCsv}
          </a>
        </Button>
        <Button asChild variant="outline" className="max-sm:w-full">
          <a href="/api/export?format=json" download>
            <DownloadIcon />
            {t.data.exportJson}
          </a>
        </Button>
      </CardContent>
    </Card>
  );
}
