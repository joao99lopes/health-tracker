#!/usr/bin/env bash
# End-to-end smoke test of the two production images, exactly as the Pi runs
# them: a throwaway PostgreSQL, the migrate image, then the app image.
#
#   scripts/smoke-test.sh <app-image> <migrate-image>
#
# Checks that migrations apply, the app becomes healthy, /api/health reaches
# the database (and reports when it cannot), /login renders without a session
# with the security headers, a protected page redirects, a forged session
# cookie is refused without a redirect loop, and the runtime image carries no
# build-only or unused heavy packages. Firebase is never contacted: the
# Firebase variables are placeholders. Everything it creates is removed on
# exit. Needs docker and curl on the host.
set -Eeuo pipefail

APP_IMAGE="${1:?usage: smoke-test.sh <app-image> <migrate-image>}"
MIGRATE_IMAGE="${2:?usage: smoke-test.sh <app-image> <migrate-image>}"
PORT="${SMOKE_PORT:-3999}"
ORIGIN="http://localhost:${PORT}"
RUN="smoke-$$"
NET="${RUN}-net"
DB_URL="postgresql://smoke:smoke@${RUN}-db:5432/smoke"

cleanup() {
  docker rm -f "${RUN}-db" "${RUN}-app" >/dev/null 2>&1 || true
  docker network rm "$NET" >/dev/null 2>&1 || true
}
trap cleanup EXIT

fail() {
  echo "FAIL: $*" >&2
  docker logs "${RUN}-app" 2>&1 | tail -30 >&2 || true
  exit 1
}

docker network create "$NET" >/dev/null
docker run -d --name "${RUN}-db" --network "$NET" \
  -e POSTGRES_USER=smoke -e POSTGRES_PASSWORD=smoke -e POSTGRES_DB=smoke \
  postgres:17-alpine >/dev/null

for _ in $(seq 1 30); do
  docker exec "${RUN}-db" pg_isready -U smoke -d smoke >/dev/null 2>&1 && break
  sleep 1
done
docker exec "${RUN}-db" pg_isready -U smoke -d smoke >/dev/null || fail "database never became ready"

echo "--- migrate"
docker run --rm --network "$NET" -e DATABASE_URL="$DB_URL" "$MIGRATE_IMAGE" \
  || fail "migrate deploy failed"

echo "--- app"
docker run -d --name "${RUN}-app" --network "$NET" -p "127.0.0.1:${PORT}:3000" \
  -e DATABASE_URL="$DB_URL" \
  -e APP_URL="$ORIGIN" \
  -e FIREBASE_API_KEY=smoke-placeholder \
  -e FIREBASE_AUTH_DOMAIN=smoke.invalid \
  -e FIREBASE_PROJECT_ID=smoke-placeholder \
  -e FIREBASE_CLIENT_EMAIL=smoke@smoke.invalid \
  -e FIREBASE_PRIVATE_KEY=not-a-key \
  "$APP_IMAGE" >/dev/null

status=""
for _ in $(seq 1 60); do
  status="$(docker inspect -f '{{.State.Health.Status}}' "${RUN}-app" 2>/dev/null || echo missing)"
  [ "$status" = "healthy" ] && break
  [ "$status" = "unhealthy" ] && break
  sleep 2
done
[ "$status" = "healthy" ] || fail "app container is '$status', expected healthy"

health="$(curl -sS "${ORIGIN}/api/health")"
[ "$health" = '{"status":"ok"}' ] || fail "/api/health answered $health"
echo "ok   /api/health reaches the database"

headers="$(curl -sS -D - -o /dev/null "${ORIGIN}/login")"
grep -q "^HTTP/1.1 200" <<<"$headers" || fail "/login did not answer 200"
for h in Content-Security-Policy X-Frame-Options X-Content-Type-Options Referrer-Policy; do
  grep -qi "^${h}:" <<<"$headers" || fail "/login is missing the ${h} header"
done
grep -qi "^X-Powered-By:" <<<"$headers" && fail "/login still sends X-Powered-By"
echo "ok   /login 200 with security headers"

code="$(curl -sS -o /dev/null -w '%{http_code}' "${ORIGIN}/")"
[ "$code" = "307" ] || fail "/ without a session answered $code, expected 307"
echo "ok   / redirects when signed out"

# A forged or stale session cookie must be refused, and must not cause a
# redirect loop between /login and /.
code="$(curl -sS -o /dev/null -w '%{http_code}' \
  -H "Cookie: session=forged.session.cookie" "${ORIGIN}/login")"
[ "$code" = "200" ] || fail "/login with a stale session cookie answered $code, expected 200"
code="$(curl -sS -o /dev/null -w '%{http_code}' -H "Cookie: session=forged.session.cookie" "${ORIGIN}/")"
[ "$code" = "307" ] || fail "/ with a forged session cookie answered $code, expected 307"
echo "ok   a forged session cookie is refused without looping"

# The runtime image must not carry build-only or unused heavy packages.
unwanted="$(docker exec "${RUN}-app" sh -c 'ls -d node_modules/sharp node_modules/@img node_modules/@google-cloud node_modules/@grpc node_modules/prisma 2>/dev/null' || true)"
[ -z "$unwanted" ] || fail "the runtime image contains: $unwanted"
echo "ok   no sharp, Firestore, gRPC or Prisma CLI in the runtime image"

# CI bakes the commit SHA in; check it actually reached the running app.
if [ -n "${EXPECTED_VERSION:-}" ]; then
  actual="$(docker exec "${RUN}-app" printenv APP_VERSION || true)"
  [ "$actual" = "$EXPECTED_VERSION" ] || fail "APP_VERSION is '$actual', expected '$EXPECTED_VERSION'"
  echo "ok   the image carries version $EXPECTED_VERSION"
fi

# Last, because it takes the database away: the probe must say so.
docker stop "${RUN}-db" >/dev/null
code="$(curl -sS -o /dev/null -w '%{http_code}' -m 15 "${ORIGIN}/api/health")"
[ "$code" = "503" ] || fail "/api/health with the database down answered $code, expected 503"
echo "ok   /api/health reports a database outage"

echo "PASS"
