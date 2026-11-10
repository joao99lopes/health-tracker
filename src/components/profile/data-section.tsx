"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, type ChangeEvent } from "react";
import {
  CircleCheckIcon,
  DownloadIcon,
  TriangleAlertIcon,
  UploadIcon,
} from "lucide-react";
import { importMeasurementsAction } from "@/app/(app)/measurements/import-actions";
import { callServer } from "@/lib/client/server-call";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useHydrated } from "@/hooks/use-hydrated";
import {
  IMPORT_MAX_BYTES,
  planImport,
  type ImportIssue,
} from "@/lib/data-transfer/import";
import { importIssueMessage } from "@/lib/data-transfer/messages";
import { useTranslations } from "@/lib/i18n/context";

type ImportState =
  | { step: "idle" }
  /** `unreachable`: the last attempt got no answer; the file is kept to retry. */
  | { step: "ready"; text: string; count: number; unreachable?: boolean }
  | { step: "importing"; text: string; count: number }
  | { step: "invalid"; issues: ImportIssue[]; totalIssues: number }
  | { step: "done"; imported: number; skipped: number }
  | { step: "error" };

const PREVIEW_ISSUE_LIMIT = 50;

/**
 * Export and import of the user's own data.
 *
 * Export is two plain links: the route handler sets `Content-Disposition`, so
 * the browser downloads rather than navigates.
 *
 * Import previews in the browser with the same planning function the server
 * runs, so problems show before anything is sent. The browser does not know
 * which measurements already exist, so its count can be higher than what the
 * server finally imports; the result says how many were skipped.
 */
export function DataSection({
  profileHeightCm,
}: {
  /** Fallback height for rows without one; null without a profile. */
  profileHeightCm: number | null;
}) {
  const t = useTranslations();
  const router = useRouter();
  const hydrated = useHydrated();
  const fileInput = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<ImportState>({ step: "idle" });

  function reset() {
    setState({ step: "idle" });
    if (fileInput.current) {
      fileInput.current.value = "";
    }
  }

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    // Refused before reading, so a wrong (huge) file is never loaded.
    if (file.size > IMPORT_MAX_BYTES) {
      setState({
        step: "invalid",
        issues: [{ line: 0, code: "FILE_TOO_LARGE" }],
        totalIssues: 1,
      });
      return;
    }
    const text = await file.text();
    const plan = planImport(text, { existing: new Set(), profileHeightCm });
    if (plan.status === "invalid") {
      setState({
        step: "invalid",
        issues: plan.issues.slice(0, PREVIEW_ISSUE_LIMIT),
        totalIssues: plan.issues.length,
      });
      return;
    }
    setState({ step: "ready", text, count: plan.rows.length });
  }

  async function confirmImport() {
    if (state.step !== "ready") {
      return;
    }
    const { text, count } = state;
    setState({ step: "importing", text, count });
    const result = await callServer(() => importMeasurementsAction(text));
    if (result.status === "unreachable") {
      // Nothing is known to be imported - and re-importing is safe, since
      // rows already recorded at the same instant are skipped.
      setState({ step: "ready", text, count, unreachable: true });
      return;
    }
    if (result.status === "imported") {
      setState({
        step: "done",
        imported: result.imported,
        skipped: result.skippedDuplicates,
      });
      if (fileInput.current) {
        fileInput.current.value = "";
      }
      router.refresh();
    } else if (result.status === "invalid") {
      setState({
        step: "invalid",
        issues: result.issues,
        totalIssues: result.totalIssues,
      });
    } else {
      setState({ step: "error" });
    }
  }

  return (
    <Card className="[--card-spacing:--spacing(6)]">
      <CardHeader>
        <CardTitle>{t.data.title}</CardTitle>
        <CardDescription>{t.data.description}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <div className="flex flex-col gap-3 sm:flex-row">
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
        </div>

        <div className="border-border flex flex-col gap-3 border-t pt-6">
          <div className="flex flex-col gap-1">
            <p className="font-medium">{t.data.importTitle}</p>
            <p className="text-muted-foreground text-sm">
              {t.data.importDescription}
            </p>
          </div>

          <input
            ref={fileInput}
            id="import-file"
            type="file"
            accept=".csv,text/csv"
            className="sr-only"
            // The visible button below is the control; this input is only
            // the browser's file picker behind it, so it is kept out of the
            // tab order and the accessibility tree rather than announced as
            // a second, unlabelled control.
            tabIndex={-1}
            aria-hidden
            onChange={handleFile}
          />
          {(state.step === "idle" ||
            state.step === "done" ||
            state.step === "error") && (
            <Button
              type="button"
              variant="outline"
              className="w-fit max-sm:w-full"
              disabled={!hydrated}
              onClick={() => fileInput.current?.click()}
            >
              <UploadIcon />
              {t.data.importChoose}
            </Button>
          )}

          {(state.step === "ready" || state.step === "importing") && (
            <div className="flex flex-col gap-3">
              {state.step === "ready" && (
                <p className="text-sm">{t.data.importReady(state.count)}</p>
              )}
              {state.step === "ready" && state.unreachable && (
                <Alert variant="destructive">
                  <TriangleAlertIcon />
                  <AlertDescription>{t.common.unreachable}</AlertDescription>
                </Alert>
              )}
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button
                  type="button"
                  disabled={state.step === "importing"}
                  onClick={confirmImport}
                  className="max-sm:w-full"
                >
                  {state.step === "importing"
                    ? t.data.importing
                    : t.data.importConfirm}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  disabled={state.step === "importing"}
                  onClick={reset}
                  className="max-sm:w-full"
                >
                  {t.data.importCancel}
                </Button>
              </div>
            </div>
          )}

          {state.step === "invalid" && (
            <div className="flex flex-col gap-3">
              <Alert variant="destructive">
                <TriangleAlertIcon />
                <AlertDescription className="flex flex-col gap-2">
                  <p>
                    {t.data.importProblems(
                      state.issues.length,
                      state.totalIssues,
                    )}
                  </p>
                  <ul className="list-disc pl-4">
                    {state.issues.map((issue, index) => (
                      <li key={index}>{importIssueMessage(t, issue)}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
              <Button
                type="button"
                variant="outline"
                className="w-fit max-sm:w-full"
                onClick={reset}
              >
                {t.data.importCancel}
              </Button>
            </div>
          )}

          {state.step === "done" && (
            <Alert>
              <CircleCheckIcon />
              <AlertDescription>
                {t.data.imported(state.imported, state.skipped)}
              </AlertDescription>
            </Alert>
          )}

          {state.step === "error" && (
            <Alert variant="destructive">
              <TriangleAlertIcon />
              <AlertDescription>{t.data.importFailed}</AlertDescription>
            </Alert>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
