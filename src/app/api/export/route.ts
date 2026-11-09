import { NextResponse, type NextRequest } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { measurementsToCsv } from "@/lib/data-transfer/csv";
import { buildJsonExport, exportFileName } from "@/lib/data-transfer/json";
import { listMeasurements } from "@/lib/measurements/queries";
import { getProfile } from "@/lib/profile/queries";

/**
 * GET /api/export?format=csv|json - the signed-in user's own data as a file.
 *
 * Scoped by the session's user id like every other read. Answers 401 rather
 * than redirecting: this is a download, not a page.
 */
export async function GET(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return new NextResponse(null, { status: 401 });
  }

  const format = request.nextUrl.searchParams.get("format") ?? "csv";
  if (format !== "csv" && format !== "json") {
    return new NextResponse(null, { status: 400 });
  }

  const now = new Date();
  const measurements = await listMeasurements(user.id);
  const headers = {
    "Content-Disposition": `attachment; filename="${exportFileName(now, format)}"`,
    // Personal health data: never cached by the browser or anything between.
    "Cache-Control": "no-store",
  };

  if (format === "csv") {
    return new NextResponse(measurementsToCsv(measurements), {
      headers: { ...headers, "Content-Type": "text/csv; charset=utf-8" },
    });
  }

  const profile = await getProfile(user.id);
  const body = buildJsonExport({
    exportedAt: now,
    email: user.email,
    profile,
    measurements,
  });
  return new NextResponse(JSON.stringify(body, null, 2), {
    headers: { ...headers, "Content-Type": "application/json; charset=utf-8" },
  });
}
