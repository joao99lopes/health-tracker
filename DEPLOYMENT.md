# Deployment

Two environments, one repository:

|              | Development                       | Production                     |
| ------------ | --------------------------------- | ------------------------------ |
| Machine      | Windows + Docker Desktop          | Raspberry Pi 4, 64-bit (ARM64) |
| App runs     | `npm run dev` on the host         | `app` container                |
| PostgreSQL   | `db` container, loopback port     | `db` container, no port        |
| Compose files| `docker-compose.yml` + `.dev.yml` | `docker-compose.yml` alone     |
| Access       | `http://localhost:3000`           | LAN, e.g. `http://192.168.1.50:3000` |

`docker-compose.yml` **is** the production stack. Development adds
`docker-compose.dev.yml` on top, which does one thing: publish the database port
so host tooling can reach it. That file is deliberately not named
`docker-compose.override.yml`, which Compose would load implicitly — including
on the Pi.

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

- A static or DHCP-reserved LAN IP. It goes into `BETTER_AUTH_URL`, and
  sign-in breaks if it changes.
- Roughly 2 GB free disk for images and the build.

Build on the Pi itself. The base images are multi-arch, so it builds natively —
no emulation, no cross-compilation, no Prisma `binaryTargets` juggling.

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
| `BETTER_AUTH_SECRET`    | **yes**    | —                | `app`              | Session cookie signing key. **Minimum 32 characters**; the app refuses to start below that. Generate with `openssl rand -base64 32`. |
| `BETTER_AUTH_URL`       | **yes** in production | `http://localhost:3000` in dev | `app` | The origin users actually type. See the warning below. |

> **`BETTER_AUTH_URL` is the single most common deployment mistake.** On the Pi
> it must be the LAN origin users type, e.g. `http://192.168.1.50:3000` — not
> `localhost`. better-auth checks the `Origin` header of every state-changing
> request against it, so a wrong value rejects **every sign-in** as
> cross-origin. There is deliberately no production fallback: Compose fails
> fast with a readable message rather than mis-configuring silently.

---

## Development workflow

```sh
cp .env.example .env     # set POSTGRES_PASSWORD, DATABASE_URL, BETTER_AUTH_SECRET
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

## First deployment (Raspberry Pi)

```sh
git clone <your-repo-url> health-tracker
cd health-tracker
cp .env.example .env
```

Edit `.env`:

```sh
POSTGRES_PASSWORD=<a real password>
BETTER_AUTH_SECRET=<openssl rand -base64 32>
BETTER_AUTH_URL=http://192.168.1.50:3000    # this Pi's LAN address
```

Bring the whole stack up:

```sh
docker compose up -d --build
```

The first build takes several minutes on a Pi 4. Compose then starts things in
order: `db` → wait for healthy → `migrate` (applies migrations, exits) → `app`.

Verify:

```sh
docker compose ps           # db and app up; migrate exited 0
curl -I http://localhost:3000
```

Then open `http://192.168.1.50:3000` from another device on the LAN and
register an account.

> Registration is open to anyone who can reach the port. That is intended for a
> 1–2 user LAN app — just be aware of it before exposing the port more widely.

---

## Database migrations

Migrations are applied **automatically** on every `docker compose up` by the
one-shot `migrate` service. `app` waits for it to complete successfully before
starting, so the app never runs against an un-migrated schema.

There is no Prisma CLI in the runtime image — it pulls in `effect`, `mysql2`
and more, which have no business in production. The `migrate` service uses the
builder stage, where the CLI already lives.

| Task | Where | Command |
| ---- | ----- | ------- |
| Create a migration | development | `npm run db:migrate` |
| Apply migrations | development | `npm run db:deploy` |
| Apply migrations | production | automatic on `up`; or `docker compose run --rm migrate` |

After changing `prisma/schema.prisma`, always re-run `npm run db:generate`. A
stale client surfaces as a confusing "Prisma schema mismatch" from better-auth
at build time.

---

## Starting and stopping the stack

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

```sh
cd health-tracker
git pull
docker compose up -d --build
```

Rebuilds the image, re-runs migrations, and restarts the app. Old images
accumulate over time; reclaim space with `docker image prune -f`.

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

**Sign-in always fails, or the browser reports an invalid origin / 403.**
`BETTER_AUTH_URL` does not match the origin you typed. On the Pi it must be the
LAN address (`http://192.168.1.50:3000`), not `localhost`, and the port must
match. Fix `.env`, then `docker compose up -d`.

**`required variable BETTER_AUTH_URL is missing a value`.**
Compose is doing its job — set it in `.env`. Same for `POSTGRES_PASSWORD` and
`BETTER_AUTH_SECRET`.

**`BETTER_AUTH_SECRET must be at least 32 characters`.**
Still on the `change-me` placeholder. Generate one: `openssl rand -base64 32`.

**Repeated sign-in attempts return 429.**
better-auth's built-in rate limiter. Wait it out; it is not a bug.

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
the published port in `docker-compose.yml`, remembering to update
`BETTER_AUTH_URL` to match.

**Out of disk on the Pi.**
`docker image prune -f` reclaims superseded build layers.

---

## ARM64 compatibility

Verified against the live registry and by running the arm64 images, not from
assumption:

| Check | Result |
| ----- | ------ |
| `postgres:17-alpine` (`db`) | publishes `linux/arm64`; runs as `aarch64`, PostgreSQL 17.11 |
| `node:22-bookworm-slim` (`Dockerfile`) | publishes `linux/arm64`; runs as `aarch64`, Node arm64 v22.23.2 |
| Platform pins | none — no `platform:` in either compose file, no `--platform` in the Dockerfile |
| Native npm packages | `@next/swc`, `@tailwindcss/oxide`, `lightningcss`, `@unrs/resolver`, `sharp` — all ship `linux-arm64` builds, at full parity with x64 in `package-lock.json` |
| Prisma query engine | `binaryTargets = ["native"]`, resolved at generate time on the machine that builds |
| OpenSSL | genuinely absent from `node:*-slim`; the Dockerfile installs it explicitly in the base stage, which Prisma requires |

Because everything resolves on the build machine, the rule is simply: **build
the image on the machine that runs it.** An amd64 laptop and an arm64 Pi each
produce a correct native image with no emulation and no extra configuration.
