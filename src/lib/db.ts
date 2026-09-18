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

function createClient(): PrismaClient {
  const adapter = new PrismaPg({ connectionString: env.DATABASE_URL });
  return new PrismaClient({
    adapter,
    log: env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

export const prisma = globalForPrisma.prisma ?? createClient();

if (env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
