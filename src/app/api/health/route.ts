import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * GET /api/health - liveness and database reachability, for the container
 * HEALTHCHECK, deploy/ops/healthcheck.sh and the CI smoke test.
 *
 * Public on purpose (the proxy lets it through) and says nothing beyond
 * "ok": no version, no counts, no user data.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ status: "ok" }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json(
      { status: "database-unavailable" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
