# Handoff

State of the project as of commit `3b8ec52` (2026-11-10), for whoever picks it
up next — a person or a Claude Code session. It summarises and points; the
authoritative detail lives in [`CLAUDE.md`](../CLAUDE.md) (engineering rules and
architecture) and [`DEPLOYMENT.md`](../DEPLOYMENT.md) (operations). Read those
before changing anything.

> This repository is **public**. Never commit secrets, user email addresses,
> healthchecks.io ping URLs or anything from a `.env`.

---

## 1. What exists today

A self-hosted body-measurement tracker for one or two people, served on the
home LAN from a Raspberry Pi 4. It presents data and objective trends and
deliberately gives no advice (see "Explicitly out of scope" in `CLAUDE.md`).

**Pages**

| Route | What it does |
| ----- | ------------ |
| `/` Dashboard | Latest measurement, current value per metric (with change vs. that metric's previous reading), evolution chart, three comparisons (latest vs previous / vs first / over a period). |
| `/measurements` | Table of all measurements; `/new`, `/[id]`, `/[id]/edit`. Optional free-text **note** per measurement. |
| `/profile` | Profile (birth date, sex, height, language, direction preferences), **Your data** (CSV/JSON export, CSV import), **Account** (change password, delete account), running version. |
| `/login`, `/register`, `/forgot-password`, `/login/email-link` | Firebase Auth: email + password (verification required), Google, one-time email link. |
| `/api/export?format=csv\|json` | The signed-in user's data as a file. |
| `/api/health` | Liveness + `SELECT 1`; public; used by every health check. |

**Metrics**: weight, body fat %, hydration %, muscle %, bone mass, visceral fat,
waist circumference; derived BMI (WHO bands, adults only) and waist-to-height
ratio. Height is stored per measurement so history never moves.

**Charts**: one metric over a period (the period set is defined once in
`src/lib/periods/periods.ts`), optional 7/30-day moving average, optional second
metric on its own axis. Colour follows the reader's per-metric direction
preference — never a judgement.

**i18n**: English and Portuguese, dictionaries in `src/lib/i18n/dictionaries/`.
No user-facing string lives in JSX.

**Quality bar today**: 208 unit tests (pure logic, Node's runner), strict
TypeScript, ESLint clean, `npm run build` clean, an end-to-end image smoke test
(`scripts/smoke-test.sh`) gating every publish.

---

## 2. Production

| Thing | Where |
| ----- | ----- |
| Host | Raspberry Pi 4, 2 GB, Debian 13 arm64, LAN `192.168.1.170` / `impiza.local`, port 3000 |
| Stack | `~/health-tracker/deploy/compose.yaml` — GHCR images only; app 512 MB, PostgreSQL 17 384 MB (`shared_buffers=64MB`, `max_connections=20`) |
| Secrets | `~/health-tracker/.env` (mode 600); `deploy/.env` is a symlink to it |
| Images | Built by `.github/workflows/docker-arm64.yml` on every push to `main`: lint → tests → arm64 build → smoke test → push `:migrate` then `:latest` (+ SHA tags) |
| Update | push to `main`, wait for green CI, then on the Pi: `cd ~/health-tracker && git pull && cd deploy && docker compose pull && docker compose up -d` |
| Ops (this service only) | `deploy/ops/`: `backup.sh` 03:35 daily (local 7 d + encrypted rclone remote 30 d), `healthcheck.sh` every 5 min, `restore-test.sh`; alerts via `deploy/ops/monitor.env` (healthchecks.io) |
| Host-level ops | `~/ops/` on the Pi (Pi-hole, pokedex, disk, temperature, cloudflared) — not in this repo |

Both pre-Firebase accounts have been migrated and linked; there is nothing
pending on the Pi. A pre-migration dump is kept at
`~/backups/pre-firebase-health-tracker-db.sql.gz` until the owner removes it.

---

## 3. Decisions already taken (do not reopen without the owner)

- **Firebase Auth**, not a self-hosted library: email + password with
  **mandatory verification**, Google, email link. Password minimum **6**
  (Firebase's own). Account deletion needs a sign-in from the last 5 minutes.
- **LAN only**, plain HTTP. No HSTS, no `upgrade-insecure-requests` until HTTPS
  exists. Cloudflare Tunnel is *not* to be built yet.
- **Images are never built on the Pi.**
- **Ops are per service**: each deployed service carries its own backup and
  health check; the host keeps only host-level checks.
- **Comparisons are per metric** (each metric between its own readings), not
  between whole measurements — measurements are often partial.
- **Moving average and second metric are opt-in** and off by default; the
  chart's default is the raw readings.
- **Import format = export format** (stable field-key CSV headers).

---

## 4. Working on it locally

Node is not installed on the Windows host; every `npm` command runs in
`node:22-bookworm` with `node_modules` in the named volume
`health_tracker_node_modules` (see `CLAUDE.md` → Development environment).

**Running the app without a Firebase project** — the Auth emulator. The
emulator image is not in the repo; this is the recipe used so far:

```Dockerfile
FROM node:22-bookworm
RUN npm install -g firebase-tools@15.34.1 && npm cache clean --force
WORKDIR /emu
RUN printf '{ "emulators": { "auth": { "host": "0.0.0.0", "port": 9099 }, "ui": { "enabled": false }, "singleProjectMode": true } }\n' > firebase.json
EXPOSE 9099
CMD ["firebase", "emulators:start", "--only", "auth", "--project", "demo-health"]
```

Run it on a Docker network with PostgreSQL, apply migrations with
`npx prisma migrate deploy`, then start the app with
`FIREBASE_AUTH_EMULATOR_HOST=auth-emulator.localhost:9099`,
`--add-host auth-emulator.localhost:<emulator container IP>`, and any
placeholder `FIREBASE_API_KEY` / `FIREBASE_AUTH_DOMAIN`, with
`FIREBASE_PROJECT_ID=demo-health`. Emails the emulator "sends" (verification,
reset, sign-in links) are listed at
`http://localhost:9099/emulator/v1/projects/demo-health/oobCodes`.

Prefer `npm run build && npm start` over `npm run dev` for manual testing:
hot reload over the Windows bind mount is unreliable and has produced stale
server code more than once.

---

## 5. Testing caveats learned the hard way

- **Claude's built-in browser pane** opens popups in the same tab (Google
  sign-in cannot complete there), blocks sub-resources from hosts other than
  the one navigated to (so `nip.io`-style tricks fail), and does not run
  `requestAnimationFrame` while hidden — streamed pages then look stuck on
  "Loading…". Take a screenshot to force a render. Its `form_input` sometimes
  does not reach React state; real typing (`left_click` + `type`) does.
- **The emulator always checks session-cookie revocation**; production does
  not (it relies on `User.sessionsValidAfter`). Flows are written to work
  either way — keep it so.
- **Unauthenticated GitHub API** works for run status, but job logs need a
  signed-in session.

---

## 6. Known gaps and loose ends

- `npm audit` reports 6 *moderate* advisories, all in `firebase-admin`'s
  **optional** dependencies (Firestore, Storage). The smoke test asserts they
  never reach the runtime image; revisit on the next `firebase-admin` release.
- `CLAUDE.md` → UI components still says dark mode "is not wired up yet", but
  `src/components/theme-toggle.tsx` and `src/lib/theme/theme.ts` implement a
  light/dark/system toggle. The sentence is stale.
- The Firebase Auth emulator recipe above lives only in this file.
- GitHub Actions warns that `actions/checkout@v4`, `setup-node@v4` and the
  `docker/*` actions target Node 20, which runners now force onto Node 24.
  Harmless today; bump the action versions when convenient.
- Google sign-in and the HTTP-on-IP origin were verified by the owner in a
  real browser, not by automated tests.

---

## 7. Next step

Run `/propose-improvements` (defined in
[`.claude/commands/propose-improvements.md`](../.claude/commands/propose-improvements.md))
for a fresh review of features and UX/UI. It only analyses and proposes; it
changes nothing until the owner picks what to build.
