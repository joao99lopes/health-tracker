# Handoff

State of the project as of commit `d42e26e` (2026-11-10, running on the Pi),
for whoever picks it
up next — a person or a Claude Code session. It summarises and points; the
authoritative detail lives in [`CLAUDE.md`](../CLAUDE.md) (engineering rules and
architecture) and [`DEPLOYMENT.md`](../DEPLOYMENT.md) (operations). Read those
before changing anything.

> This repository is **public**. Never commit secrets, user email addresses,
> healthchecks.io ping URLs, anything from a `.env`, or details of the home
> network (addresses, hostnames, other services on the Pi).

---

## 1. What exists today

A self-hosted body-measurement tracker for one or two people, served on the
home LAN from a Raspberry Pi 4. It presents data and objective trends and
deliberately gives no advice (see "Explicitly out of scope" in `CLAUDE.md`).

**Pages**

| Route | What it does |
| ----- | ------------ |
| `/` Dashboard | Latest measurement and how long ago it was, current value per metric (with change vs. that metric's previous reading; a card opens that metric in the chart), evolution chart with a period summary, a table view and a link to the metric's own page, and one comparison table (each metric vs its first reading and over a chosen period; on a phone the first five rows until "Show all"). Chart and comparison choices live in the address (`?metric=&period=&avg=&vs=&cmp=`). Reads snapshots only (no ids, no notes). |
| `/metrics/[metric]` | One metric: full-width chart over a period **or a range of dates** (`?period=` or `?from=&to=`, plus `&avg=`), the period's figures, and every reading with its change from the one before. |
| `/measurements` | History grouped by month, 50 rows at a time, filtered by period (`?period=&show=`); `/new` (last values as placeholders, unused fields behind "more values"), `/new` folds the date away as "Now" with "Change", keeps an unsaved draft in `sessionStorage` (offered back, never applied unasked), `/[id]` (confirms a save via `?saved=`, then strips it; "Add another" after adding), `/[id]/edit`. Optional free-text **note** per measurement. |
| `/report?period=` | Printable summary of a period: per-metric figures, one chart, every measurement. Opened from the measurement list. |
| `/profile` | Profile (birth date, sex, height, language, direction preferences), **Your data** (CSV/JSON export, CSV import), **Account** (change password, delete account), running version. |
| `/login`, `/register`, `/forgot-password`, `/login/email-link` | Firebase Auth: email + password (verification required), Google, one-time email link. |
| `/api/export?format=csv\|json` | The signed-in user's data as a file. |
| `/api/health` | Liveness + `SELECT 1`; public; used by every health check. |

**Metrics**: weight, body fat %, hydration %, muscle %, bone mass, visceral fat,
waist circumference; derived BMI (WHO bands, adults only) and waist-to-height
ratio. Height is stored per measurement so history never moves.

**Charts**: one metric over a period (the period set is defined once in
`src/lib/periods/periods.ts`), optional 7/30-day moving average, optional second
metric on its own axis. Straight lines between readings; the y axis has a
minimum span per metric and round ticks (`metricAxis`, `MIN_AXIS_SPAN` in
`src/lib/measurements/series.ts`). Colour follows the reader's per-metric
direction preference — never a judgement. Recharts is loaded only when there
is a line to draw.

**Numbers**: a change is computed and shown at the metric's display precision
(`metricDisplay` / `roundForDisplay` in `src/lib/measurements/metrics.ts`), so
nothing rounds to "0.00" with an arrow; changes in a percentage metric are in
percentage points ("pp" / "p.p."). Period statistics (count, min, max, mean,
least-squares weekly trend, omitted under 7 days) are in
`src/lib/measurements/stats.ts`.

**i18n**: English and Portuguese, dictionaries in `src/lib/i18n/dictionaries/`.
No user-facing string lives in JSX. Every page sets its own `<title>`.

**Quality bar today**: 256 unit tests (pure logic, Node's runner), strict
TypeScript, ESLint clean, `npm run build` clean, and two checks of the images
gating every publish: the smoke test (`scripts/smoke-test.sh`) and the browser
suite in `e2e/` (`scripts/e2e.sh`, 20 Playwright tests including axe WCAG 2.1
AA in both themes).

---

## 2. Production

| Thing | Where |
| ----- | ----- |
| Host | Raspberry Pi 4, 2 GB, Debian 13 arm64, on the home LAN, port 3000 (its address is `APP_URL` in the Pi's `.env`) |
| Stack | `~/health-tracker/deploy/compose.yaml` — GHCR images only; app 512 MB, PostgreSQL 17 384 MB (`shared_buffers=64MB`, `max_connections=20`) |
| Secrets | `~/health-tracker/.env` (mode 600); `deploy/.env` is a symlink to it |
| Images | Built by `.github/workflows/docker-arm64.yml` on every push to `main`: lint → tests → arm64 build → smoke test → push `:migrate` then `:latest` (+ SHA tags) |
| Update | push to `main`, wait for green CI, then on the Pi: `cd ~/health-tracker && git pull && cd deploy && docker compose pull && docker compose up -d` |
| Ops (this service only) | `deploy/ops/`: `backup.sh` 03:35 daily (local 7 d + encrypted rclone remote 30 d), `healthcheck.sh` every 5 min, `restore-test.sh`; alerts via `deploy/ops/monitor.env` (healthchecks.io) |
| Host-level ops | `~/ops/` on the Pi (host-wide monitoring and other services) — not in this repo |

The Pi runs `d42e26e` (check with `docker compose exec app printenv
APP_VERSION`, or the Profile page footer). Both pre-Firebase accounts have been
migrated and linked; there is nothing pending on the Pi.

**When updating:** run `docker compose pull` only after CI for the pushed
commit is green. Pulling while it is still running silently fetches the
previous `:latest`, and `up -d` then reports success on the old code; this
happened once. A pre-migration dump is kept under `~/backups/` on the Pi until
the owner removes it.

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

From the first `/propose-improvements` review (2026-11-10), all built:

- **The add form never pre-fills a value.** The last reading is a
  placeholder only; pre-filling would record a reading nobody took. Fields a
  user has no recent value for wait behind "N more values"; with no history,
  every field is shown.
- **The y axis is never fitted tightly to the data**: each metric has a
  minimum span (presentation choice, not a threshold) so scale noise does not
  look like an event.
- **The waist-to-height band "Generally healthy range" keeps its wording**:
  it is the cited source's (Ashwell & Gibson / NICE). Do not rename it to
  match BMI's "Normal range".
- **View state lives in the address**, written with `history.replaceState`
  on the dashboard (no server render per click) and as real navigations on the
  history list (only the visible slice is read).
- **The printable report** (`/report`) is neutral: no direction colours, no
  bands coloured, nothing projected; printing always uses the light theme.
- **Firebase Auth SDK stays off pages that do not sign in**: the root layout
  imports only `src/lib/firebase/config-context.tsx`.
- **Light theme `--primary` and `--destructive` were darkened** to reach
  WCAG AA (4.5:1); check contrast if either is changed again.

From the second `/propose-improvements` review (2026-11-10), all built:

- **No server-action call may hang.** Every call from the browser goes through
  `callServer` (`src/lib/client/server-call.ts`): a request that gets no
  answer becomes `unreachable`, shown as `t.common.unreachable`, with the form
  and its values left as they were. Redirect/not-found signals pass through.
- **The add form keeps an unsaved draft** in `sessionStorage` and *offers* it
  back after a reload; it is never applied unasked (same reason as no
  pre-filling). The date is "Now" until "Change", and "now" is taken when the
  form is sent.
- **The dashboard still switches view in the browser** (decision above), so
  it still receives the whole history - but as snapshots
  (`listMeasurementSnapshots`: no ids, no notes). Sending only the chosen
  period was proposed and set aside because it would undo that decision.
- **One comparison table** replaces the two comparison cards. The relative
  change is omitted for percentage metrics and where the rounded change is
  zero, so two numbers never contradict each other.
- **A range of dates exists only on the metric page** (`/metrics/[metric]`).
  The period set in `periods.ts` is unchanged and still defined once.
- **Signed-out pages keep the reader's language** through a `lang` cookie set
  on sign-out (a language code, nothing else).
- **Browser tests gate publishing** (`scripts/e2e.sh` in CI, after the smoke
  test). The test browser bypasses the CSP so the shipped images can talk to
  the emulator; CSP headers stay covered by the smoke test.

---

## 4. Working on it locally

Node is not installed on the Windows host; every `npm` command runs in
`node:22-bookworm` with `node_modules` in the named volume
`health_tracker_node_modules` (see `CLAUDE.md` → Development environment).

**Running the app without a Firebase project** — the Auth emulator. Its
image is `e2e/emulator/Dockerfile`, and `scripts/e2e.sh` is a complete,
working setup of PostgreSQL + emulator + the images to copy from. The recipe:

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

Three things that recipe does not say, each of which cost time:

- **The CSP is fixed at build time.** `next.config.ts` only adds the emulator
  to `connect-src` when `FIREBASE_AUTH_EMULATOR_HOST` is set while
  `next build` runs. An image built by CI (or by the plain `Dockerfile`)
  therefore refuses to talk to the emulator, and sign-in fails with "Could
  not reach the sign-in service". For an image, build from a copy of the
  `Dockerfile` with `ENV FIREBASE_AUTH_EMULATOR_HOST=localhost:9099` added
  to the `build` stage.
- **Claude's built-in browser** blocks requests to any host other than the
  page's, so `auth-emulator.localhost` does not work there. Use
  `localhost:9099` instead, and let the app reach the same address by
  sharing the emulator container's network namespace: publish both `3000`
  and `9099` on the emulator container and start the app with
  `--network container:<emulator>` (it still reaches PostgreSQL by name,
  since the emulator container is on the Docker network).
- **Migrations:** with an empty `node_modules`, `npx prisma` fetches the
  registry's `latest` (an 8.0 release candidate). Either install first, or
  build the `builder` target and run
  `node node_modules/prisma/build/index.js migrate deploy` in it.

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
- **Browser end-to-end checks** were run with Playwright, not the built-in
  pane: `mcr.microsoft.com/playwright:v1.49.1-noble` with `playwright@1.49.1`
  and `@axe-core/playwright@4.10.1`, started with
  `--network container:<emulator>` so `localhost:3000` and `localhost:9099`
  both resolve. Its Chromium opens real popups (Google sign-in through the
  emulator works), generates real print PDFs (`page.pdf` after
  `emulateMedia({ media: "print" })`) and runs axe. The suite covered
  sign-up/verification, reset, email link, Google, redirects, isolation
  between users, password change ending other sessions, account deletion,
  add/edit/delete, history paging and filters, dashboard URL state, Portuguese,
  export/re-import, keyboard and skip link, axe WCAG 2.1 AA (both themes,
  signed in and out), 375 px layout, and the report PDF. It passed 21/21 on
  amd64 and on the **arm64** images under QEMU with the Pi's memory limits
  (app peaked at ~270 MB of 512 MB). That script was kept outside the repo;
  **`e2e/` is its successor in the repository** (20 tests, run by
  `scripts/e2e.sh` locally and in CI). Not yet ported from the old one:
  password reset, email link, Google, password change, account deletion and
  the report PDF.
  Lessons from writing it:
  - Wait for hydration (`waitUntil: "networkidle"`) before typing: text typed
    into a server-rendered input before React hydrates is lost.
  - Pages with a `loading.tsx` stream, so `notFound()` arrives with status
    200; assert on the page content, not the status code.
  - Playwright's `page.pdf()` does not fire `beforeprint`; dispatch it.
  - `checkVisibility()`, not `getComputedStyle().display`, to tell whether an
    element inside a hidden ancestor is shown.
- **arm64 images can be built and smoke-tested locally**: Docker Desktop's
  buildx has QEMU (`docker buildx build --platform linux/arm64 --target
  runner|builder --load .`, then `scripts/smoke-test.sh <app> <migrate>`). It
  takes several minutes per image, but it is the closest thing to the Pi
  without touching it.

---

## 6. Known gaps and loose ends

- `npm audit` reports 6 *moderate* advisories, all in `firebase-admin`'s
  **optional** dependencies (Firestore, Storage). The smoke test asserts they
  never reach the runtime image; revisit on the next `firebase-admin` release.
- `CLAUDE.md` → UI components still says dark mode "is not wired up yet", but
  `src/components/theme-toggle.tsx` and `src/lib/theme/theme.ts` implement a
  light/dark/system toggle. The sentence is stale.
- GitHub Actions warns that `actions/checkout@v4`, `setup-node@v4` and the
  `docker/*` actions target Node 20, which runners now force onto Node 24.
  Harmless today; bump the action versions when convenient.
- Google sign-in with a real Google account and the HTTP-on-IP origin were
  verified by the owner in a real browser; automated tests only cover the
  emulator's Google flow.
- **Not yet checked on the Pi in a real browser**: printing `/report` from
  Chrome's own print dialog (automated only through Playwright's PDF), and
  the new screens on the owner's phone. Nothing has been tried with a real
  screen reader (axe and keyboard checks only).
- **Typing before hydration is lost** (pre-existing): on a slow first load a
  value typed into a form before React hydrates disappears. More likely on the
  Pi than on a desktop. Not addressed.
- **The browser suite has not run in CI yet**: it passed locally against
  amd64 images. The first push runs it on the arm64 runner, pulling the
  Playwright image (about 2 GB) and building the emulator image each time;
  expect a few extra minutes per publish.
- The metric page is opened from the chart ("More on …"), not from the metric
  cards, which still select the chart's metric as the first review decided.
- Node 22 now appears to be installed on the Windows host (`node -v` →
  22.22.0 from Git Bash), but every documented command still runs in the
  container; `CLAUDE.md` says to drop the prefix once Node is installed. Not
  switched yet.

---

## 7. Next step

Both `/propose-improvements` reviews are built; the second is not deployed
yet. After deploying it, check the open items in §6 on the Pi (print from
Chrome, the phone, the first CI run of the browser suite). Then run `/propose-improvements` again (defined in
[`.claude/commands/propose-improvements.md`](../.claude/commands/propose-improvements.md))
for a fresh pass; it only analyses and proposes and changes nothing until the
owner picks what to build.
