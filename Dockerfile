# Images for the Raspberry Pi 4 (linux/arm64), built in GitHub Actions on a
# native arm64 runner and pulled from GHCR - see
# .github/workflows/docker-arm64.yml. node:22-alpine is multi-arch, so the same
# file also builds natively on an amd64 development machine.
#
# Targets:
#   runner  - the application image (`:latest`, `:<sha>`)
#   builder - the one-shot migration image (`:migrate`): Prisma CLI, schema
#             and migrations, nothing else
#
# Prisma 7 runs queries through a WebAssembly query compiler and the `pg`
# driver adapter, so no native query engine and no OpenSSL package is needed
# at run time - which is what makes alpine (musl) usable here.
FROM node:22-alpine AS base

# ---- dependencies -----------------------------------------------------------
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ---- application build ------------------------------------------------------
FROM base AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Build-stage placeholders only.
#
# `prisma generate` never connects, and `next build` renders the few
# prerendered pages (the not-found page) through the root layout, which reads
# the public Firebase web config. Nothing here opens a database connection,
# talks to Firebase or issues a cookie. The real values are injected at run
# time; these never reach the `runner` image, which copies files out of this
# stage rather than starting from it. No secret is needed to build.
ENV DATABASE_URL="postgresql://placeholder:placeholder@127.0.0.1:5432/placeholder"
ENV APP_URL="http://placeholder.invalid"
ENV FIREBASE_API_KEY="build-placeholder"
ENV FIREBASE_AUTH_DOMAIN="placeholder.invalid"
ENV FIREBASE_PROJECT_ID="build-placeholder"
ENV NEXT_TELEMETRY_DISABLED=1

RUN npx prisma generate
RUN npm run build
# Next's file tracer pulls in sharp and its prebuilt libvips binaries (about
# 45 MB, for glibc and musl alike) because next/image *could* use them. This
# app serves no optimised images (`images.unoptimized` in next.config.ts), so
# they are dead weight on the Pi's microSD card.
RUN rm -rf .next/standalone/node_modules/sharp .next/standalone/node_modules/@img

# ---- migrations (target name kept as `builder`: compose and CI refer to it) --
# Deliberately not the build stage above: that one carries every
# devDependency, the sources and the build output (over 2 GB on the Pi).
# `migrate deploy` needs the Prisma CLI, the schema, the migrations and
# prisma.config.ts - nothing more.
FROM base AS builder
WORKDIR /app
ENV NODE_ENV=production
COPY package.json ./
# Install exactly the Prisma CLI version package.json pins, and nothing else.
# package.json is only read for that version and removed *before* installing:
# with it present, npm would install every dependency it lists.
RUN PRISMA_VERSION="$(node -p "require('./package.json').devDependencies.prisma")" \
  && rm package.json \
  && npm install --no-save --no-package-lock --no-audit --no-fund "prisma@${PRISMA_VERSION}" \
  && npm cache clean --force
COPY prisma.config.ts ./
COPY prisma ./prisma
USER node
# `node_modules/.bin/prisma` is a symlink that COPY would flatten, breaking its
# relative require - call the entry point directly.
CMD ["node", "node_modules/prisma/build/index.js", "migrate", "deploy"]

# ---- runtime ----------------------------------------------------------------
FROM base AS runner
# The commit this image was built from. CI passes the SHA; a local build
# leaves it empty and the profile page says "development build".
ARG APP_VERSION=""
LABEL org.opencontainers.image.revision="${APP_VERSION}"
WORKDIR /app
ENV APP_VERSION="${APP_VERSION}"
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
# The container is capped at 512 MB. Without a heap limit V8 sizes itself from
# the host's 2 GB and is OOM-killed by the kernel before it ever collects
# garbage hard; with one it collects in time and leaves room for buffers.
ENV NODE_OPTIONS="--max-old-space-size=320"

RUN addgroup -S -g 1001 nodejs \
  && adduser -S -D -H -u 1001 -G nodejs nextjs

# `output: "standalone"` bundles the server and only the node_modules it needs,
# including the generated Prisma client. The Prisma CLI is deliberately absent:
# migrations run from the `builder` image.
COPY --from=build /app/public ./public
COPY --from=build --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
# No curl or wget in the image: Node's own fetch. /api/health answers 200 only
# when the server is up and the database answers a query.
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"]
CMD ["node", "server.js"]
