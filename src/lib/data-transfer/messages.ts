import type { Dictionary } from "@/lib/i18n/dictionary";
import type { ImportIssue } from "@/lib/data-transfer/import";
import { measurementIssueMessage } from "@/lib/measurements/messages";
import type { MeasurementIssue } from "@/lib/measurements/validation";
import { metricLabel } from "@/lib/measurements/messages";
import { isMetric } from "@/lib/measurements/metrics";

/**
 * Import problems in the current language, prefixed with where they are.
 *
 * Row-level problems that come from the shared measurement rules reuse the
 * form's messages, so a file and the form never word the same rule twice.
 */
export function importIssueMessage(t: Dictionary, issue: ImportIssue): string {
  const messages = t.data.importIssues;
  let text: string;
  switch (issue.code) {
    case "FILE_EMPTY":
    case "FILE_TOO_LARGE":
    case "TOO_MANY_ROWS":
    case "MALFORMED":
    case "MISSING_MEASURED_AT_COLUMN":
    case "WRONG_CELL_COUNT":
    case "HEIGHT_INVALID":
    case "HEIGHT_REQUIRED":
    case "DUPLICATE_IN_FILE":
      text = messages[issue.code];
      break;
    case "UNKNOWN_COLUMN":
    case "DUPLICATE_COLUMN":
      text = messages[issue.code](issue.field ?? "");
      break;
    default: {
      const base = measurementIssueMessage(t, {
        code: issue.code,
        field: issue.field,
      } as MeasurementIssue);
      text =
        issue.field && isMetric(issue.field)
          ? `${metricLabel(t, issue.field)}: ${base}`
          : base;
    }
  }
  return issue.line > 0 ? `${messages.line(issue.line)} ${text}` : text;
}
