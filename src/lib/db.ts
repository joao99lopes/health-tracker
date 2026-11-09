import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { env } from "@/env";

/**
 * Prisma client singleton.
 *
 * Next.js hot-reloads modules in development, which would otherwise open a new
 * connection pool on every reload until Postgres refuses more connections.
 *
 * Prisma 7 connects through a driver adapter rather than a URL in the schema.
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * Connection pool sizing for a Raspberry Pi with 2 GB of RAM shared with
 * PostgreSQL. One or two users never need more than a handful of concurrent
 * queries, and every idle connection costs PostgreSQL several MB, so the pool
 * is small and lets connections go after a quiet minute.
 */
const POOL_MAX_CONNECTIONS = 5;
const POOL_IDLE_TIMEOUT_MS = 60_000;

function createClient(): PrismaClient {
  const adapter = new PrismaPg({
    connectionString: env.DATABASE_URL,
    max: POOL_MAX_CONNECTIONS,
    idleTimeoutMillis: POOL_IDLE_TIMEOUT_MS,
  });
  return new PrismaClient({
    adapter,
    log: env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

export const prisma = globalForPrisma.prisma ?? createClient();

if (env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
