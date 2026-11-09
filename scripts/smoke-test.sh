#!/usr/bin/env bash
# End-to-end smoke test of the two production images, exactly as the Pi runs
# them: a throwaway PostgreSQL, the migrate image, then the app image.
#
#   scripts/smoke-test.sh <app-image> <migrate-image>
#
# Checks that migrations apply, the app becomes healthy, /login renders
# without a session, the security headers are present, a protected page
# redirects, and a sign-up round-trips through the database. Everything it
# creates is removed on exit. Needs docker and curl on the host.
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
  -e BETTER_AUTH_SECRET="smoke-test-secret-not-used-anywhere-else" \
  -e BETTER_AUTH_URL="$ORIGIN" \
  "$APP_IMAGE" >/dev/null

status=""
for _ in $(seq 1 60); do
  status="$(docker inspect -f '{{.State.Health.Status}}' "${RUN}-app" 2>/dev/null || echo missing)"
  [ "$status" = "healthy" ] && break
  [ "$status" = "unhealthy" ] && break
  sleep 2
done
[ "$status" = "healthy" ] || fail "app container is '$status', expected healthy"

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

code="$(curl -sS -o /dev/null -w '%{http_code}' -X POST "${ORIGIN}/api/auth/sign-up/email" \
  -H "Origin: ${ORIGIN}" -H "Content-Type: application/json" \
  -d '{"email":"smoke@example.test","password":"smoke-test-password-1","name":""}')"
[ "$code" = "200" ] || fail "sign-up answered $code, expected 200"
users="$(docker exec "${RUN}-db" psql -U smoke -d smoke -Atc 'select count(*) from "User"')"
[ "$users" = "1" ] || fail "sign-up did not write a user row (found $users)"
echo "ok   sign-up reaches the database"

echo "PASS"
