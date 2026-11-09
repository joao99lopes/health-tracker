# Deployment

Two environments, one repository:

|              | Development                       | Production                     |
| ------------ | --------------------------------- | ------------------------------ |
| Machine      | Windows + Docker Desktop          | Raspberry Pi 4, 64-bit (ARM64) |
| App runs     | `npm run dev` on the host         | `app` container, image from GHCR |
| Images built | locally, when needed              | GitHub Actions, native arm64 runner |
| PostgreSQL   | `db` container, loopback port     | `db` container, no port        |
| Compose files| `docker-compose.yml` + `.dev.yml` | `deploy/compose.yaml`          |
| Access       | `http://localhost:3000`           | LAN, e.g. `http://192.168.1.170:3000` |

Three compose files, three jobs:

- **`deploy/compose.yaml`** is production: it only pulls and runs the images
  CI published. Nothing is ever compiled on the Pi.
- **`docker-compose.yml`** builds the same stack from source, for trying the
  production images on a development machine.
- **`docker-compose.dev.yml`** is layered on top of it in development and does
  one thing: publish the database port so host tooling can reach it. It is
  deliberately not named `docker-compose.override.yml`, which Compose would
  load implicitly.

Cloudflare Tunnel is not configured. Production is LAN-only for now.

---

## Prerequisites

### Development (Windows)

- Docker Desktop, with WSL 2 back end.
- Git.
- Node.js 22 is **optional**. Without it, every `npm` command runs in a
  container — see [Development workflow](#development-workflow).

### Production (Raspberry Pi 4)

- Raspberry Pi OS **64-bit** (or any arm64 Linux). Confirm with `uname -m` —
  it must print `aarch64`, not `armv7l`. A 32-bit OS will not run this stack.
- Docker Engine and the Compose plugin:

  ```sh
  curl -fsSL https://get.docker.com | sh
  sudo usermod -aG docker "$USER"   # log out and back in
  ```

- A static or DHCP-reserved LAN IP. It goes into `APP_URL`, and the
  session cookie and Firebase's emails depend on it.
- Internet access: signing in goes through Firebase Auth. Pages of an
  already signed-in browser keep working offline (the session cookie is
  verified locally), but signing in, registering and password resets do not.
- Roughly 1 GB free disk for the images (app ≈ 280 MB, migrate ≈ 610 MB,
  postgres ≈ 400 MB as Docker reports them on the Pi).
- Optional, for off-site backups: `rclone` with an encrypted remote (see
  [Backups and monitoring](#backups-and-monitoring)).

The Pi never builds. Every push to `main` runs
`.github/workflows/docker-arm64.yml`: lint, unit tests, both images built on a
native arm64 runner, an end-to-end smoke test (`scripts/smoke-test.sh`), and
only then a push to GHCR — `:migrate` first, then `:latest`, each also tagged
with the commit SHA.

---

## Environment variables

Copy `.env.example` to `.env` and edit. `.env` is git-ignored and must never be
committed; `.env.example` is committed and must never hold real secrets.

| Variable                | Required   | Default          | Used by            | Notes |
| ----------------------- | ---------- | ---------------- | ------------------ | ----- |
| `POSTGRES_USER`         | no         | `health`         | `db`               | |
| `POSTGRES_PASSWORD`     | **yes**    | —                | `db`, `app`        | Compose refuses to start without it. |
| `POSTGRES_DB`           | no         | `health_tracker` | `db`, `app`        | |
| `DATABASE_URL`          | dev only   | —                | host `npm` tooling | Points at `localhost:5432`. The containers ignore it — Compose builds its own pointing at the `db` service. |
| `APP_URL`               | **yes** in production | `http://localhost:3000` in dev | `app` | The origin users actually type, e.g. `http://192.168.1.170:3000`. Decides whether the session cookie is `Secure`. |
| `FIREBASE_API_KEY`      | **yes**    | —                | `app`              | Firebase web config. Public by design. |
| `FIREBASE_AUTH_DOMAIN`  | **yes**    | —                | `app`              | Firebase web config, e.g. `my-project.firebaseapp.com`. |
| `FIREBASE_PROJECT_ID`   | **yes**    | —                | `app`              | Firebase web config. |
| `FIREBASE_CLIENT_EMAIL` | **yes** (not with the emulator) | — | `app` | Service account. **Secret**, with the key below. |
| `FIREBASE_PRIVATE_KEY`  | **yes** (not with the emulator) | — | `app` | Service account private key: one line, in double quotes, `
` escapes kept as in the JSON. **Secret.** |
| `FIREBASE_AUTH_EMULATOR_HOST` | dev only | — | `app`, scripts | `host:port` of the Firebase Auth emulator. Never set in production. |

Where each Firebase value comes from is written next to it in `.env.example`.
The web config is read at run time, so changing it needs a restart, not a
rebuild.

---

## Development workflow

```sh
cp .env.example .env     # set POSTGRES_PASSWORD, DATABASE_URL and the FIREBASE_* values
```

Start PostgreSQL, with the dev overlay so port 5432 is published to the host:

```sh
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d db
```

The port binds to `127.0.0.1` only — reachable from your machine, never from
the LAN.

Then install, migrate and run:

```sh
npm install
npm run db:generate      # generate the Prisma client
npm run db:deploy        # apply existing migrations
npm run dev              # http://localhost:3000
```

### Without Node.js on the host

Prefix every `npm` command:

```sh
docker run --rm -it \
  -v "${PWD}:/work" \
  -v health_tracker_node_modules:/work/node_modules \
  -w /work -p 3000:3000 node:22-bookworm npm <args>
```

Two details that are easy to get wrong:

- **`node_modules` lives in a named volume**, not on the Windows bind mount.
  Installing onto the bind mount takes upwards of fifteen minutes and times
  out; in the volume it takes about a minute. Every container command must
  mount that volume, or it sees an empty `node_modules`.
- Use `node:22-bookworm`, **not** `-slim`. Prisma needs OpenSSL, which the slim
  image does not ship.

### Checks

```sh
npm test         # unit tests (Node's built-in runner)
npm run lint     # ESLint
npm run build    # production build; also the authoritative type check
```

`npm run typecheck` needs a prior `dev` or `build` — Next generates route types
into `.next/types/`, so a standalone `tsc` on a clean tree reports them missing.

---

## Firebase project

Sign-in runs on Firebase Auth (free for these methods). One project serves
every environment that points at it; create it once.

1. **Create the project** at <https://console.firebase.google.com> (Analytics
   is not needed), then **Authentication → Get started**.
2. **Authentication → Sign-in method:** enable **Email/Password** with
   **Email link (passwordless sign-in)**, and **Google**.
3. **Authentication → Settings → Authorized domains:** add every host the app
   is opened from, exactly as typed in the browser — on the Pi its LAN address
   (e.g. `192.168.1.170`). Google sign-in and email links are refused from any
   other host; `localhost` is there by default.
4. **Password policy:** leave it unset. Firebase's own minimum is 6, the same
   as `PASSWORD_MIN_LENGTH` in `src/lib/auth/credentials.ts`; raise both
   together if ever.
5. **Authentication → Templates** (optional): the sender name and language of
   the verification, sign-in link and reset emails.
6. **Project settings → General → Your apps:** add a **Web** app. Its config
   gives `FIREBASE_API_KEY`, `FIREBASE_AUTH_DOMAIN` and `FIREBASE_PROJECT_ID`.
7. **Project settings → Service accounts → Generate new private key:** from
   the downloaded JSON copy `client_email` to `FIREBASE_CLIENT_EMAIL` and
   `private_key` to `FIREBASE_PRIVATE_KEY`, then delete the file. Anyone with
   these two can manage every account.

---

## First deployment (Raspberry Pi)

The repository is cloned on the Pi only for `deploy/` — the compose file and
the ops scripts. Its source is never built there.

```sh
git clone <your-repo-url> ~/health-tracker
cd ~/health-tracker/deploy
cp ../.env.example .env && chmod 600 .env
```

Edit `deploy/.env`:

```sh
POSTGRES_PASSWORD=<a real password>
APP_URL=http://192.168.1.170:3000           # this Pi's LAN address
FIREBASE_API_KEY=...                        # see "Firebase project" above
FIREBASE_AUTH_DOMAIN=...
FIREBASE_PROJECT_ID=...
FIREBASE_CLIENT_EMAIL=...
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

Pull and start:

```sh
docker compose pull
docker compose up -d
```

Compose starts things in order: `db` → wait for healthy → `migrate` (applies
migrations, exits) → `app`. If `pull` answers "denied", the GHCR package is
private: make it public under GitHub → Packages → health-tracker → Package
settings, or `docker login ghcr.io` on the Pi with a read-only token.

Verify:

```sh
docker compose ps           # db and app healthy; migrate exited 0
curl -I http://localhost:3000/login
```

Then open `http://192.168.1.170:3000` from another device on the LAN and
register an account. The profile page shows the running version (the commit's
short SHA); `docker inspect -f '{{index .Config.Labels "org.opencontainers.image.revision"}}' ghcr.io/joao99lopes/health-tracker:latest`
shows the same from the shell.

> Never run `docker compose up` in the repository root on the Pi. That file
> builds from source and has the same project name, so it would replace the
> production containers with a local build.

> Registration is open to anyone who can reach the port. That is intended for a
> 1–2 user LAN app — just be aware of it before exposing the port more widely.

---

## Database migrations

Migrations are applied **automatically** on every `docker compose up` by the
one-shot `migrate` service. `app` waits for it to complete successfully before
starting, so the app never runs against an un-migrated schema.

There is no Prisma CLI in the runtime image — it pulls in `effect`, `mysql2`
and more, which have no business in production. The `migrate` service runs the
`:migrate` image (the Dockerfile's `builder` target), which holds the CLI, the
schema and the migrations and nothing else.

| Task | Where | Command |
| ---- | ----- | ------- |
| Create a migration | development | `npm run db:migrate` |
| Apply migrations | development | `npm run db:deploy` |
| Apply migrations | production | automatic on `up`; or `docker compose run --rm migrate` |

After changing `prisma/schema.prisma`, always re-run `npm run db:generate`. A
stale client surfaces as a confusing schema mismatch at build time.

---

## Starting and stopping the stack

On the Pi, from `~/health-tracker/deploy`:

```sh
docker compose up -d          # start (and apply migrations)
docker compose ps             # status
docker compose stop           # stop containers, keep them
docker compose start          # start them again
docker compose restart app    # restart one service
docker compose down           # stop and remove containers + network
```

`docker compose down` **keeps** your data: the database lives in the named
`db_data` volume, which is not removed.

> `docker compose down -v` **deletes the `db_data` volume and all health data.**
> There is no way to undo it.

The stack sets `restart: unless-stopped`, so it comes back by itself after a
reboot or a crash.

---

## Updating the application

1. Push to `main` and wait for the **Build arm64 images** workflow to pass.
2. On the Pi:

   ```sh
   cd ~/health-tracker && git pull     # only if deploy/ changed
   cd deploy
   docker compose pull
   docker compose up -d
   docker image prune -f               # drop the superseded images
   ```

`up -d` re-runs `migrate` before restarting `app`. Check the profile page shows
the new short SHA.

**Moving an installation from before Firebase (one-off).** The migration
`20261110090000_move_auth_to_firebase` drops the old sessions and password
hashes and keeps every user, profile and measurement. In order:

1. Back up: `deploy/ops/backup.sh`, and check `backup.log` says OK.
2. In `deploy/.env`, add `APP_URL` and the `FIREBASE_*` variables; remove
   `BETTER_AUTH_SECRET` and `BETTER_AUTH_URL`.
3. `docker compose pull && docker compose up -d` — `migrate` applies the change.
4. List the accounts still to move, on the Pi:

   ```sh
   docker compose exec -T db sh -c \
     'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Atc "select email from \"User\" where \"firebaseUid\" is null"'
   ```

5. From a machine with the repository and the same `FIREBASE_*` values in its
   `.env`, move them — a dry run first:

   ```sh
   node scripts/firebase-migrate-users.mjs a@example.com b@example.com
   node scripts/firebase-migrate-users.mjs --apply a@example.com b@example.com
   ```

   This creates each Firebase account (marked verified) and has Firebase send
   it a "set your password" email.
6. Each person sets a password from that email and signs in; the first
   sign-in links the Firebase account to their existing data.

**Rolling back.** Every image is also tagged with its commit SHA. Pin both
images in `deploy/compose.yaml` to the previous one —
`:<sha>` for `app`, `:migrate-<sha>` for `migrate` — and `docker compose up -d`.
A rollback across a migration that changed the schema needs a database restore
as well (see below); migrations only move forward.

---

## Backups and monitoring

`deploy/ops/` holds the operations for **this service only**; each service on
the Pi keeps its own, with its own healthchecks.io checks. Host-level checks
(disk, temperature, other services) do not belong here.

| Script | Schedule | Does |
| ------ | -------- | ---- |
| `backup.sh` | daily, `30 3 * * *` | `pg_dump` + this service's `.env` to `~/backups/health-tracker/AAAA-MM-DD` (7 days), and to `gdrive-crypt:impiza/health-tracker` (30 days) when that rclone remote exists |
| `healthcheck.sh` | every 5 min | `db` and `app` healthy, last `migrate` exited 0, `GET /api/health` is 200 (app and database); silent on success |
| `restore-test.sh` | by hand, monthly | restores the newest dump into a throwaway PostgreSQL and counts users, profiles, measurements and migrations |

Set up:

```sh
cd ~/health-tracker/deploy/ops
cp monitor.env.example monitor.env && chmod 600 monitor.env   # paste the two healthchecks.io URLs
crontab -e
#   30 3 * * *   $HOME/health-tracker/deploy/ops/backup.sh
#   */5 * * * *  $HOME/health-tracker/deploy/ops/healthcheck.sh
```

Logs: `~/backups/health-tracker/backup.log` and `healthcheck.log` (failures
only).

**Restoring for real** (replaces every row):

```sh
gunzip -c ~/backups/health-tracker/AAAA-MM-DD/health-tracker-db.sql.gz \
  | docker compose -f ~/health-tracker/deploy/compose.yaml exec -T db \
      sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"'
```

From the off-site copy: `rclone copy gdrive-crypt:impiza/health-tracker/AAAA-MM-DD ~/restore/`
first. Without the rclone crypt passwords the off-site copies cannot be read —
keep them in a password manager.

---

## Viewing logs

```sh
docker compose logs -f app           # follow the app
docker compose logs -f               # everything
docker compose logs --tail=100 app   # recent lines only
docker compose logs migrate          # did migrations apply?
```

---

## Troubleshooting

**Every sign-in says "Something went wrong".**
The server could not verify the Firebase token or mint the session. `docker
compose logs app | grep '\[auth\]'` names the failing step and Firebase's
error code (never a token or an address). Usual causes: `FIREBASE_PROJECT_ID`
does not match the web config, or `FIREBASE_PRIVATE_KEY` lost its quotes or its
`\n` escapes.

**"Could not reach the sign-in service".**
The Pi, or the browser, has no internet access. Firebase Auth needs it for
signing in; an existing session keeps working without it.

**"This address is not allowed to sign in with Google or email links yet".**
The host in the browser's address bar is not in Firebase → Authentication →
Settings → *Authorized domains*. Add it exactly as typed (e.g.
`192.168.1.170`); password sign-in works regardless.

**"The browser blocked the Google window".**
Allow pop-ups for the app's address. Google sign-in opens a small window and
needs it to report back.

**"Confirm your email address first".**
By design: no session until the address is verified. The message offers to
send the email again; check the spam folder.

**`required variable APP_URL is missing a value`.**
Compose is doing its job — set it in `.env`. Same for `POSTGRES_PASSWORD` and
every `FIREBASE_*` variable.

**"Too many attempts".**
Firebase's own protection against password guessing. Wait it out.

**Development: host cannot connect to PostgreSQL.**
You started the stack without the dev overlay, so no port is published. Use:
`docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d db`

**Container sees an empty `node_modules`.**
The `-v health_tracker_node_modules:/work/node_modules` mount was omitted.

**`npm run typecheck` reports `LayoutProps` / `PageProps` missing.**
Next generates those into `.next/types/`. Run `npm run build` first — that is
the authoritative check anyway.

**Build fails with a Prisma "schema mismatch".**
Stale generated client. Run `npm run db:generate`.

**`migrate` exits non-zero and `app` never starts.**
By design — the app will not run against an un-migrated schema. Read
`docker compose logs migrate`; it is usually a bad `POSTGRES_PASSWORD` or a
database that has not finished starting.

**Port 3000 already in use.**
Something else holds it. Find it with `sudo ss -ltnp | grep 3000`, or change
the published port in `deploy/compose.yaml`, remembering to update `APP_URL`
to match.

**Out of disk on the Pi.**
`docker image prune -f` reclaims superseded images after an update.

**`docker compose pull` says "denied" or "unauthorized".**
The GHCR package is private. Make it public, or `docker login ghcr.io` on the
Pi with a token that only has `read:packages`.

**The profile page still shows the old version after an update.**
The pull found nothing new (the workflow has not finished, or failed), or
`up -d` was not run after `pull`.

---

## ARM64 compatibility

Verified against the live registry and by running the arm64 images, not from
assumption:

| Check | Result |
| ----- | ------ |
| `postgres:17-alpine` (`db`) | publishes `linux/arm64`; runs as `aarch64`, PostgreSQL 17.11 |
| `node:22-alpine` (`Dockerfile`) | publishes `linux/arm64/v8`; Node v22.23.4 |
| Platform pins | none in the compose files or the Dockerfile; CI passes `platforms: linux/arm64` |
| Native npm packages | `@next/swc`, `@tailwindcss/oxide`, `lightningcss`, `@unrs/resolver` ship `linux-arm64` and musl builds; they run only at build time |
| Prisma at run time | Prisma 7 queries through a WebAssembly query compiler and the `pg` driver adapter — no native engine, no OpenSSL, so musl (alpine) works |
| `sharp` | not shipped: `images.unoptimized` is set and the Dockerfile deletes it from the standalone bundle |

The images are built natively on an arm64 GitHub Actions runner, so nothing is
emulated. An amd64 development machine builds the same Dockerfile natively too.
