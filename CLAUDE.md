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

Browser tests live in `e2e/` with their **own** `package.json` (Playwright
and axe, exact versions matching the `mcr.microsoft.com/playwright` image),
so nothing of theirs reaches the app's dependencies or images; `e2e` is in
`.dockerignore` and excluded from the root `tsconfig.json`.
`scripts/e2e.sh <app-image> <migrate-image>` starts PostgreSQL, the Firebase
Auth emulator (`e2e/emulator/`) and the images, then runs the suite in the
Playwright image. The test browser bypasses the CSP (the shipped images do
not allow the emulator); the headers are covered by the smoke test.

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
`docker-compose.yml` alone gives PostgreSQL no published port at all. The dev
file is deliberately not named `docker-compose.override.yml`, which Compose
would load implicitly.

The Raspberry Pi runs **`deploy/compose.yaml`** - GHCR images only, never a
build - with its per-service operations in `deploy/ops/` (backup,
healthcheck, restore test). The root `docker-compose.yml` builds the same
stack from source for development machines and must never be run on the Pi
(same project name). See DEPLOYMENT.md.

Prisma is pinned to **7.10.1**. Do not run a bare `npm install prisma` - the
registry's `latest` tag currently points at an 8.0 release candidate.

Prisma 7 changed two things that older examples get wrong:

- The connection URL is **not** allowed in `schema.prisma`. Migrations read it
  from `prisma.config.ts`; the application connects through the `@prisma/adapter-pg`
  driver adapter in `src/lib/db.ts`.
- `.env` is no longer loaded automatically. `prisma.config.ts` calls
  `process.loadEnvFile()` itself.

Re-run `npm run db:generate` after every schema change - a stale client is
reported as a confusing schema mismatch at build time.

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
Locally, `docker compose up -d --build` builds and runs the whole stack; only
`app` publishes a port.

Base image is `node:22-alpine`. Two targets matter: `runner` (the app,
GHCR `:latest` / `:<sha>`) and `builder` (the migration job, GHCR
`:migrate`). The stage that runs `next build` is called `build`.

Things there are deliberate and easy to undo by accident:

- The `build` stage sets **placeholder** `DATABASE_URL`, `APP_URL` and
  Firebase web config. `prisma generate` and `next build` read them, and
  neither connects to anything. No secret is needed to build; real values
  are injected at run time.
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
a native arm64 runner, never on the Pi. Nothing is pushed until lint, tests,
`scripts/smoke-test.sh` and the browser tests (`scripts/e2e.sh`) pass, and
`:migrate` is pushed before `:latest`. Run either locally against a pair of
images: `scripts/smoke-test.sh <app-image> <migrate-image>`, likewise
`scripts/e2e.sh`.

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

**Firebase Auth** (`@firebase/auth` 1.13.8 in the browser, `firebase-admin`
14.5.0 on the server). Three ways in: **email and password** (verification
required before a session exists), **Google** (popup) and a one-time **email
link** (`/login/email-link`). Password reset, change and account deletion are
supported. Google and email links only work from hosts listed in Firebase's
*Authorized domains* - on the Pi, its LAN address.

- **Deleting an account** needs a session signed in within the last five
  minutes, by any method; an older one is asked to sign in again. Changing the
  password asks for the current one. Firebase reports password and
  email-link accounts alike as the `password` provider, so the change form is
  shown to both (with a hint for link users); Google-only accounts get a note
  instead (`src/lib/auth/providers.ts`).
- The CSP allows Google's script loader (`apis.google.com`) and the auth
  domain's iframe (`*.firebaseapp.com`, `*.web.app` - the project's own domain
  is runtime config, the headers are build-time), and the opener policy is
  `same-origin-allow-popups` so the Google window can report back.

How it fits together:

- The browser proves the password to Firebase and sends the resulting **ID
  token** to a server action (`src/app/(auth)/actions.ts`). The server
  verifies it, checks the password was typed in the last five minutes, and
  sets an httpOnly **Firebase session cookie** (`session`, 14 days). The
  browser keeps no Firebase session of its own (in-memory persistence, signed
  out after every flow).
- `src/lib/auth/session.ts` — `requireUser()` / `getSessionUser()`. **This is
  the authoritative check.** Every route or query touching user data calls
  `requireUser()` and scopes on the id it returns. The cookie is verified
  locally (no network round trip per request); revocation is our own
  `User.sessionsValidAfter`, set when the password changes.
- `src/lib/auth/rules.ts` — the pure rules: cookie attributes, the
  recent-sign-in window, revocation, which user a Firebase identity maps to
  (`decideAccountLink`), and Firebase error codes → message keys. Tested.
- `src/lib/firebase/admin.ts` / `client.tsx` — the SDKs. Only `app` and `auth`
  entry points are imported, never the umbrella `firebase` package, so
  Firestore and gRPC stay out of both bundles. The web config is read at run
  time and handed to the browser by the root layout: one image fits any
  Firebase project. The layout's provider lives in
  `src/lib/firebase/config-context.tsx`, apart from the SDK, so pages that
  never sign anyone in do not download Firebase Auth - keep it that way.
- `src/proxy.ts` — optimistic only: checks that a session *cookie exists*,
  nothing more. It is not access control, and it never redirects *away* from
  an auth page (see `src/lib/auth/routing.ts`).
- `src/lib/auth/credentials.ts` — email and password rules for the forms. Keep
  `PASSWORD_MIN_LENGTH` (6, Firebase's own minimum) in step with any password
  policy set in the Firebase console.

**Users table.** `User` holds no credentials: `email` (normalised, unique),
`firebaseUid` (unique, null for a pre-Firebase account that has not signed in
since) and `sessionsValidAfter`. A verified Firebase identity is linked to an
existing row by email on first sign-in, never on an unverified address. Ids
are strings: rows from before Firebase keep the old library's non-UUID ids.

**Migrating accounts from before Firebase:** `scripts/firebase-migrate-users.mjs`
(dry run by default, `--apply` to act) creates the Firebase accounts and has
Firebase send each one a "set your password" email. See DEPLOYMENT.md.

**Local development without a Firebase project:** the Auth emulator. Set
`FIREBASE_AUTH_EMULATOR_HOST`; the Admin SDK then needs no service account.
Two differences from production to remember when testing:

- The emulator **always** checks session-cookie revocation, so a password
  change ends the old cookie there even though production relies on
  `sessionsValidAfter`. The flows are written to work either way.
- The browser and the server must reach the emulator under the same
  `host:port`. With the app in a container, use a `*.localhost` name (Chrome
  resolves it to 127.0.0.1) and `--add-host` it to the emulator's address.

Emails Firebase "sends" from the emulator are listed at
`http://<emulator>/emulator/v1/projects/<project>/oobCodes`. Google sign-in
against the emulator shows a fake account chooser in the popup; it needs a
browser that opens real popup windows.
