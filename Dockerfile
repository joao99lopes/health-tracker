# Multi-arch by construction: every stage uses the official node image, which
# publishes linux/amd64 and linux/arm64. Build this on the machine that will
# run it (amd64 for development, arm64 on the Raspberry Pi) and no emulation or
# cross-compilation is involved.
FROM node:22-bookworm-slim AS base
# Prisma's query engine needs OpenSSL at build and run time.
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*

# ---- dependencies -----------------------------------------------------------
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ---- build ------------------------------------------------------------------
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Build-stage placeholders only.
#
# `prisma generate` never connects, and `next build` only evaluates module
# scope while collecting page data - neither opens a database connection or
# signs a cookie. But both read these variables, so they must be set. The real
# values are injected at run time by docker-compose; these never leave the
# build stage and are not present in the runtime image (`runner` starts from
# `base`, not from here).
#
# The secret placeholder is padded past the 32-character minimum that
# src/env.ts enforces. It signs nothing: no cookie is issued during a build.
ENV DATABASE_URL="postgresql://placeholder:placeholder@127.0.0.1:5432/placeholder"
ENV BETTER_AUTH_SECRET="build-stage-placeholder-not-a-real-secret"
# next build runs with NODE_ENV=production, where src/env.ts requires this
# rather than defaulting to localhost. The real LAN origin is set at run time.
ENV BETTER_AUTH_URL="http://placeholder.invalid"
ENV NEXT_TELEMETRY_DISABLED=1

RUN npx prisma generate
RUN npm run build

# ---- runtime ----------------------------------------------------------------
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN groupadd --system --gid 1001 nodejs \
  && useradd --system --uid 1001 --gid nodejs nextjs

# `output: "standalone"` bundles the server and only the node_modules it needs.
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
# The Prisma CLI is deliberately absent. It drags in its whole dependency tree
# (effect, mysql2, ...), which has no business in the runtime image. Migrations
# run from the `migrate` service in docker-compose.yml, which uses the builder
# stage. The generated query client is traced into the standalone bundle by
# Next.

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
