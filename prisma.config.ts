import { defineConfig, env } from "prisma/config";

// Prisma 7 no longer reads .env automatically, and no longer accepts the
// connection URL inside schema.prisma. Node's own loader keeps this
// dependency-free; in Docker the variables are already in the environment, so
// a missing .env is not an error.
if (!process.env.DATABASE_URL) {
  try {
    process.loadEnvFile();
  } catch {
    // No .env file - fall through to whatever the environment provides.
  }
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  // Used by migrate and introspection only. The application connects through
  // the driver adapter in src/lib/db.ts.
  datasource: { url: env("DATABASE_URL") },
});
