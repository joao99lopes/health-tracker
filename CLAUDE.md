# CLAUDE.md

Guidance for Claude Code working in this repository.

## What this project is

A small, self-hosted **personal health tracker** for 1–2 users. It records body
measurements over time and presents the data and objective trends.

The app **presents data. It does not tell users how they should live.**

### Explicitly out of scope

Weight-loss goals, diet plans, exercise tracking, health scores, AI coaching,
medical diagnosis, notifications, social features. Do not add these, and do not
add any other feature that was not requested.

## Stack

- Next.js + TypeScript (**strict**)
- PostgreSQL + Prisma
- Tailwind CSS + shadcn/ui
- Recharts
- Docker Compose

Everything must build and run on **ARM64** — production is a Raspberry Pi 4
(64-bit). Avoid dependencies with x86-only native binaries.

## Deployment

- **Development:** Windows.
- **Production:** Raspberry Pi 4, 64-bit, **LAN only** for now. Cloudflare
  Tunnel may be added later — do not build it yet.
- PostgreSQL uses a **persistent Docker volume**.
- PostgreSQL is **never exposed to the network** — no published port on the
  host beyond what local development needs.

The full workflow for both environments — prerequisites, environment variables,
first deployment, migrations, start/stop, updates, logs and troubleshooting —
lives in `DEPLOYMENT.md`. Keep it current when any of that
changes, and do not duplicate it into README.md.

## Domain model

### Users

- Independent accounts; email + password authentication.
- **Never store plaintext passwords.**
- **A user must never be able to read or write another user's data.** Every
  query that touches user data is scoped by the authenticated user's id.
- Name is optional.
- Profile: date of birth, sex, height. **Height changes over time.**

### Measurements

Fields:

- measured date + time
- `weight_kg`
- `body_fat_percent`
- `hydration_percent`
- `muscle_percent`
- `bone_mass_kg`
- `visceral_fat`
- `height_cm_at_measurement`

All values except the date/time are optional, but **at least one actual
measurement value is required** — enforce this both server-side and
client-side.

### BMI

- **Never manually entered.** Always derived.
- Computed from `weight_kg` and `height_cm_at_measurement`.
- Because height is stored per measurement, **historical BMI must not change
  when the user's current height changes.** Never recompute history from the
  profile's current height.
- BMI calculation and classification live in **dedicated modules**, with the
  classification thresholds isolated in one clearly documented place with a
  cited reference.

## UI

- Modern health/fitness aesthetic, in the spirit of Apple Health / Google Fit,
  **without copying them**.
- Responsive: desktop and mobile.
- Pages: **Dashboard** (home after login), **Measurements**, **Profile**.
- Floating action button to add a measurement.
- Charts with a selectable metric and period.
- Comparisons: latest vs previous, latest vs first, and a selectable period.
- When there is not enough data, show a clear message such as
  **"Not enough data yet."** — never an empty chart or a misleading zero.
- Dark mode only while it stays near-free (Tailwind/shadcn tokens). Drop it if
  it starts costing real complexity.

### Period filters

3 days · 1 week · 2 weeks · 1 month · 3 months · 6 months · 1 year · 2 years ·
all time. Define this set **once** and reuse it.

## i18n

- Portuguese and English, designed so further languages are additive.
- **Translations live outside React components** — no hardcoded user-facing
  strings in JSX.

## Engineering principles

- Keep the architecture **simple**. No microservices, Redis, Kubernetes, or
  other infrastructure this app does not need.
- Prefer established libraries over custom implementations; avoid unnecessary
  dependencies.
- Validate data **server-side and client-side**.
- Keep business logic separate from UI.
- Strict TypeScript. No `any` to escape a problem.

## Working agreement

- **Inspect the existing project before changing it.**
- Make the **smallest coherent change** for the current task.
- Do not rewrite working code without a reason.
- After changes, run the relevant type check, lint, tests, and build.
- Report **what changed, what was verified, and what is still broken** — and
  nothing else. Do not dump large amounts of code into the response.
- **Do not proceed to future phases unless explicitly asked.**
- If an important requirement is ambiguous, **ask before implementing it**.
- **Do not invent product requirements.**

## Development environment

`@AGENTS.md` — Next.js regenerates that file and it carries version-specific
rules. Read it.

**This project uses Next.js 16 with the App Router, React 19, and Tailwind
CSS v4.** These differ from older conventions; when unsure about a Next.js API,
read `node_modules/next/dist/docs/` rather than relying on recall.

Node.js is **not installed on the Windows development host** — everything runs
through Docker:

```sh
docker run --rm   -v "${PWD}:/work"   -v health_tracker_node_modules:/work/node_modules   -w /work node:22-bookworm npm <args>
```

**`node_modules` lives in a named volume, not on the bind mount.** Installing
onto the Windows bind mount took upwards of fifteen minutes and repeatedly
timed out; in the volume it takes about a minute. Every container command must
mount that volume, or it will see an empty `node_modules`. Use `node:22-bookworm`
rather than `-slim`: Prisma needs OpenSSL, which slim does not ship.

If Node gets installed on the host later, drop the prefix and run a plain
`npm install`; nothing else changes.

### Commands

- `npm run dev` — development server
- `npm run build` — production build; also runs the TypeScript check
- `npm run typecheck` — `tsc --noEmit`
- `npm run lint` — ESLint
- `npm test` — unit tests

Tests use Node 22's built-in runner and type stripping, so there is no test
framework dependency. Put them next to the code as `*.test.ts`, import with an
explicit `.ts` extension, and keep them to pure logic — the runner has no DOM
and does not resolve the `@/` alias.

`npm run typecheck` **needs a prior `dev` or `build`.** Next 16 generates global
route types (`LayoutProps`, `PageProps`, …) into `.next/types/`, so a standalone
`tsc` on a clean tree reports them as missing. `npm run build` is the
authoritative check.

### Database

`docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d db` starts
PostgreSQL 17 with the named volume `db_data`, published on
**127.0.0.1:5432 only**. Credentials come from `.env` (git-ignored; see
`.env.example`).

The port is published by `docker-compose.dev.yml`, never by the base file:
`docker-compose.yml` alone is the production stack and gives PostgreSQL no
published port at all. The dev file is deliberately not named
`docker-compose.override.yml`, which Compose would load implicitly — including
on the Raspberry Pi.

Prisma is pinned to **7.10.1**. Do not run a bare `npm install prisma` - the
registry's `latest` tag currently points at an 8.0 release candidate.

Prisma 7 changed two things that older examples get wrong:

- The connection URL is **not** allowed in `schema.prisma`. Migrations read it
  from `prisma.config.ts`; the application connects through the `@prisma/adapter-pg`
  driver adapter in `src/lib/db.ts`.
- `.env` is no longer loaded automatically. `prisma.config.ts` calls
  `process.loadEnvFile()` itself.

Re-run `npm run db:generate` after every schema change - a stale client is
reported by better-auth as a confusing "Prisma schema mismatch" at build time.

- `npm run db:generate` after changing `prisma/schema.prisma`
- `npm run db:migrate` to create and apply a migration in development
- `npm run db:deploy` to apply migrations in production

Import the client from `@/lib/db`, never by constructing `PrismaClient`
directly.

**Schema conventions.** Body metrics are `Decimal`, never `Float` - these are
numbers a user reads off a scale and compares over time, so binary floating
point error would be visible. Instants are `Timestamptz(3)`; `birthDate` is a
plain `Date` because a birthday has no time zone. Ids are UUIDs.

**Isolation.** `Profile` and `Measurement` both carry `userId` with a cascading
foreign key, and nothing references another user's rows. Every query that
touches them must filter on the authenticated user's id - the database does not
enforce that for you.

**BMI is not stored.** `Measurement.heightCmAtMeasurement` is written once and
never updated, which is what keeps historical BMI stable when a user's current
height changes.

**At least one value.** A measurement's six value fields are all nullable in
the database; the rule that at least one must be present lives in
`src/lib/measurements/validation.ts` and is shared by server and client. The
field list itself is defined once in `src/lib/measurements/fields.ts`.

### Environment variables

`src/env.ts` validates them once and throws a readable error when one is
missing. Read configuration from there, not from `process.env`.

### Docker

`Dockerfile` is a multi-stage build producing a standalone Next.js server.
`docker compose up -d --build` runs the whole stack; only `app` publishes a
LAN-reachable port.

Base image is `node:22-alpine`. Two targets matter: `runner` (the app,
GHCR `:latest` / `:<sha>`) and `builder` (the migration job, GHCR
`:migrate`). The stage that runs `next build` is called `build`.

Things there are deliberate and easy to undo by accident:

- The `build` stage sets **placeholder** `DATABASE_URL` and
  `BETTER_AUTH_SECRET`. `prisma generate` and `next build` both read them while
  evaluating module scope, and neither connects to anything. Real values are
  injected at run time.
- The runtime image has **no Prisma CLI** - it pulls in `effect`, `mysql2` and
  more. Migrations run from the one-shot `migrate` service, which uses the
  `builder` target and which `app` waits on via `service_completed_successfully`.
- `builder` is **not** the build stage: it installs only the Prisma CLI at the
  version `package.json` pins, plus the schema and migrations. Reusing the
  build stage made the `:migrate` image over 2 GB on the Pi.
- Do not copy `node_modules/.bin/prisma` into an image: `COPY` flattens the
  symlink and its relative `require("./cli.js")` then fails. Call
  `node node_modules/prisma/build/index.js` instead.
- `sharp` is deleted from the standalone bundle and `images.unoptimized` is
  set. Nothing uses `next/image`; if that changes, both must go.
- The runner sets `NODE_OPTIONS=--max-old-space-size=320` for the 512 MB
  container limit on the Pi.

Images are built in GitHub Actions (`.github/workflows/docker-arm64.yml`) on
a native arm64 runner, never on the Pi. Nothing is pushed until lint, tests
and `scripts/smoke-test.sh` pass, and `:migrate` is pushed before `:latest`.
Run the smoke test locally with
`scripts/smoke-test.sh <app-image> <migrate-image>`.

Security headers (CSP and friends) are defined in
`src/lib/security/headers.ts` and applied in `next.config.ts`. The app is
served over plain HTTP on the LAN, so there is no HSTS and no
`upgrade-insecure-requests` - add both if it ever moves to HTTPS.

The Prisma pool (`src/lib/db.ts`) is capped at 5 connections, and the
compose file runs PostgreSQL with `shared_buffers=64MB`, `max_connections=20`.

### UI components

shadcn/ui is initialised (`components.json`, style `radix-nova`, Radix
primitives, Lucide icons). Add components with:

```sh
npx shadcn@latest add <component>
```

They land in `src/components/ui/` and are ours to edit. Application components
live in `src/components/`. `cn` is a runtime dependency; `shadcn` and
`tw-animate-css` are devDependencies - `globals.css` imports their CSS at build
time only, and the `shadcn` CLI drags in an MCP server and other packages
with open advisories that have no place in production. All versions in
`package.json` are exact; keep them that way.

Dark mode is not wired up yet: the tokens exist and the `dark` variant keys off
a `.dark` class, but nothing sets it. That belongs with the UI phase.

### Authentication

**better-auth 1.7.18**, email and password only. No social login, no password
reset, no email verification — all deliberately out of scope.

- `src/lib/auth.ts` — server instance. The Prisma adapter, the password policy
  and the session lifetime live here.
- `src/lib/auth/session.ts` — `requireUser()` / `getSessionUser()`. **This is
  the authoritative check.** Every route or query touching user data calls
  `requireUser()` and scopes on the id it returns.
- `src/proxy.ts` (Next 16 renamed middleware to proxy) — optimistic only. It checks that a session *cookie
  exists*, nothing more, to avoid rendering a protected page for a signed-out
  visitor. It is not access control.
- `src/lib/auth/credentials.ts` — email and password rules shared by the form
  and the server, so the two cannot drift. `src/lib/auth/email.ts` holds
  normalisation.
- `src/app/(app)/` requires a session via its layout; `src/app/(auth)/` is the
  signed-out area.

**The schema is better-auth's, not ours.** `User`, `Session`, `Account` and
`Verification` come from `@better-auth/cli generate` — do not rename or remove
fields by hand. Two consequences worth knowing:

- The password hash lives on **`Account.password`** (scrypt), not on `User`.
  There is no `User.passwordHash` column.
- better-auth generates its own ids, which are not UUIDs, so `User.id` and
  every `userId` foreign key are plain strings while our own rows keep UUID
  primary keys.

`User.name` is required by the library and is written as an empty string at
registration; the product's optional display name belongs to `Profile`.

Emails are normalised (trimmed, lowercased) in the form, again in a
`databaseHooks` hook, and backed by a unique index — so duplicate accounts are
refused whatever casing is used.

**Testing auth with `curl`** has three traps, all of them the harness's fault
rather than the app's:

- State-changing requests need an `Origin` header matching `BETTER_AUTH_URL`,
  or better-auth answers `403 MISSING_OR_NULL_ORIGIN` / `Invalid origin`.
- Repeated attempts hit the built-in rate limiter and come back `429`.
- curl's cookie jar will not replay a cookie for a single-label host such as
  the compose service name `app`. Capture `Set-Cookie` and pass
  `-H "Cookie: ..."` explicitly, or you will chase a phantom "sessions are
  broken in production" bug.

`BETTER_AUTH_URL` must be the origin users actually type. On the Raspberry Pi
that is the LAN address, not `localhost`, or every sign-in is rejected as a
cross-origin request.
