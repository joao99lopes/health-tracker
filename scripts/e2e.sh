#!/usr/bin/env bash
# Browser end-to-end tests (e2e/) against the two production images:
# a throwaway PostgreSQL, the migrate image, the Firebase Auth emulator
# (built from e2e/emulator), the app image, then Playwright in its own image.
#
#   scripts/e2e.sh <app-image> <migrate-image>
#
# The app and Playwright share the emulator container's network namespace,
# so the browser reaches both the app and the emulator on localhost - as a
# person's browser does in development. Nothing is published on the host.
# Everything it creates is removed on exit. Needs docker.
set -Eeuo pipefail

APP_IMAGE="${1:?usage: e2e.sh <app-image> <migrate-image>}"
MIGRATE_IMAGE="${2:?usage: e2e.sh <app-image> <migrate-image>}"
PLAYWRIGHT_IMAGE="mcr.microsoft.com/playwright:v1.49.1-noble"
EMULATOR_IMAGE="health-tracker-e2e-emulator"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# What Docker needs for a bind mount: on Git Bash for Windows, the C:/... form.
MOUNT_ROOT="$( (cd "$ROOT" && pwd -W) 2>/dev/null || echo "$ROOT")"
RUN="e2e-$$"
NET="${RUN}-net"
DB_URL="postgresql://e2e:e2e@${RUN}-db:5432/e2e"

cleanup() {
  docker rm -f "${RUN}-db" "${RUN}-emu" "${RUN}-app" >/dev/null 2>&1 || true
  docker network rm "$NET" >/dev/null 2>&1 || true
}
trap cleanup EXIT

fail() {
  echo "FAIL: $*" >&2
  for container in "${RUN}-app" "${RUN}-emu"; do
    if docker inspect "$container" >/dev/null 2>&1; then
      echo "--- last log lines of $container" >&2
      docker logs "$container" 2>&1 | tail -40 >&2 || true
    fi
  done
  exit 1
}

echo "--- emulator image"
docker build -q -t "$EMULATOR_IMAGE" "$MOUNT_ROOT/e2e/emulator" >/dev/null

docker network create "$NET" >/dev/null
docker run -d --name "${RUN}-db" --network "$NET" \
  -e POSTGRES_USER=e2e -e POSTGRES_PASSWORD=e2e -e POSTGRES_DB=e2e \
  postgres:17-alpine >/dev/null
docker run -d --name "${RUN}-emu" --network "$NET" "$EMULATOR_IMAGE" >/dev/null

# Over TCP, as in smoke-test.sh: the socket answers before the real server.
for _ in $(seq 1 120); do
  docker exec "${RUN}-db" pg_isready -h 127.0.0.1 -U e2e -d e2e >/dev/null 2>&1 && break
  sleep 1
done

echo "--- migrate"
docker run --rm --network "$NET" -e DATABASE_URL="$DB_URL" "$MIGRATE_IMAGE" \
  || fail "migrate deploy failed"

echo "--- app"
# The emulator replaces the service account; the web config is placeholders.
docker run -d --name "${RUN}-app" --network "container:${RUN}-emu" \
  -e DATABASE_URL="$DB_URL" \
  -e APP_URL="http://localhost:3000" \
  -e FIREBASE_AUTH_EMULATOR_HOST="localhost:9099" \
  -e FIREBASE_API_KEY=fake-api-key \
  -e FIREBASE_AUTH_DOMAIN=demo-health.firebaseapp.com \
  -e FIREBASE_PROJECT_ID=demo-health \
  "$APP_IMAGE" >/dev/null

status=""
for _ in $(seq 1 90); do
  status="$(docker inspect -f '{{.State.Health.Status}}' "${RUN}-app" 2>/dev/null || echo missing)"
  [ "$status" = "healthy" ] && break
  [ "$status" = "unhealthy" ] && break
  sleep 2
done
[ "$status" = "healthy" ] || fail "app container is '$status', expected healthy"
emulator_ready() {
  docker exec "${RUN}-emu" curl -fsS -o /dev/null http://127.0.0.1:9099/ >/dev/null 2>&1
}
for _ in $(seq 1 60); do
  emulator_ready && break
  sleep 2
done
emulator_ready || fail "the Auth emulator is not answering"

echo "--- playwright"
# e2e/ is copied in rather than mounted, so node_modules never lands on the
# host (on Windows a bind-mounted install is very slow).
docker run --rm --network "container:${RUN}-emu" --ipc=host \
  -e CI="${CI:-}" \
  -v "$MOUNT_ROOT/e2e:/src:ro" \
  "$PLAYWRIGHT_IMAGE" \
  bash -c 'cp -r /src /e2e && cd /e2e && npm ci --no-audit --no-fund --loglevel=error && npx playwright test' \
  || fail "browser tests failed"

echo "PASS"
