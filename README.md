# health-tracker

A small self-hosted personal health tracker: record body measurements over time
and see objective trends. For 1–2 users on a home LAN.

See [CLAUDE.md](./CLAUDE.md) for the full project context and conventions.

## Requirements

- Docker (Docker Desktop on Windows for development)
- Node.js 22 — optional on the host; all commands below can run in a container

## Getting started

```sh
cp .env.example .env   # then set POSTGRES_PASSWORD, DATABASE_URL and the FIREBASE_* values

# PostgreSQL, published on 127.0.0.1:5432 for the host to reach.
# The dev file is what publishes that port; it is never loaded implicitly.
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d db

npm install
npm run db:generate    # generate the Prisma client
npm run db:deploy      # apply migrations
npm run dev
```

Sign-in uses Firebase Auth: create the project as described in
[DEPLOYMENT.md](./DEPLOYMENT.md#firebase-project), or point
`FIREBASE_AUTH_EMULATOR_HOST` at a local Auth emulator. See
[DEPLOYMENT.md](./DEPLOYMENT.md#environment-variables) for every variable.

Without Node.js on the host, prefix npm commands with:

```sh
docker run --rm -it   -v "${PWD}:/work"   -v health_tracker_node_modules:/work/node_modules   -w /work -p 3000:3000 node:22-bookworm npm <args>
```

`node_modules` lives in a named volume rather than on the Windows bind mount —
installing onto the bind mount takes upwards of fifteen minutes and times out,
against about a minute in the volume. Every container command must mount that
volume or it will see an empty `node_modules`. Use `node:22-bookworm`, not
`-slim`: Prisma needs OpenSSL.

## Deployment

Development and Raspberry Pi production workflows, environment variables,
migrations and troubleshooting are all in
**[DEPLOYMENT.md](./DEPLOYMENT.md)**.

Short version for the Pi, which only pulls images CI built:

```sh
cd deploy
cp ../.env.example .env    # set POSTGRES_PASSWORD, APP_URL and the FIREBASE_* values
docker compose pull && docker compose up -d
```

`deploy/compose.yaml` is the production stack: PostgreSQL on a persistent
`db_data` volume with no published port, migrations applied automatically, and
port 3000 as the only thing reachable from the LAN. Backups and health checks
for it live in `deploy/ops/`.

## Scripts

| Command               | Purpose                                     |
| --------------------- | ------------------------------------------- |
| `npm run dev`         | Development server                          |
| `npm run build`       | Production build (also type-checks)         |
| `npm run start`       | Serve the production build                  |
| `npm run typecheck`   | `tsc --noEmit` (needs a prior dev or build) |
| `npm run lint`        | ESLint                                      |
| `npm run db:generate` | Generate the Prisma client                  |
| `npm run db:migrate`  | Create and apply a migration (development)  |
| `npm run db:deploy`   | Apply pending migrations (production)       |
| `npm test`            | Unit tests (Node's built-in runner)         |

## Status

Dashboard, measurements, charts and profile are built, in English and
Portuguese, on top of email/password authentication.
