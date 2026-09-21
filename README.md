# health-tracker

A small self-hosted personal health tracker: record body measurements over time
and see objective trends. For 1–2 users on a home LAN.

See [CLAUDE.md](./CLAUDE.md) for the full project context and conventions.

## Requirements

- Docker (Docker Desktop on Windows for development)
- Node.js 22 — optional on the host; all commands below can run in a container

## Getting started

```sh
cp .env.example .env   # then set POSTGRES_PASSWORD, DATABASE_URL and BETTER_AUTH_SECRET

# PostgreSQL, published on 127.0.0.1:5432 for the host to reach.
# The dev file is what publishes that port; it is never loaded implicitly.
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d db

npm install
npm run db:generate    # generate the Prisma client
npm run db:deploy      # apply migrations
npm run dev
```

`BETTER_AUTH_SECRET` must be at least 32 characters or the app refuses to
start — generate one with `openssl rand -base64 32`. See
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

Short version for the Pi:

```sh
cp .env.example .env    # set POSTGRES_PASSWORD, BETTER_AUTH_SECRET, BETTER_AUTH_URL
docker compose up -d --build
```

`docker-compose.yml` alone is the production stack: PostgreSQL on a persistent
`db_data` volume with no published port, migrations applied automatically, and
port 3000 as the only thing reachable from the LAN.

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
