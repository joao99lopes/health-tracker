#!/usr/bin/env bash
# Health check of health-tracker only (cron, every 5 minutes).
#
# Checks: both long-running containers are up and healthy, the last migration
# run succeeded, and the app answers GET /login with 200. Host-level checks
# (disk, temperature, other services) belong to the host, not to this repo.
#
# Silent on success. On failure it appends one line to
# $BACKUP_ROOT/healthcheck.log and exits 1. With HC_CHECK_URL in ./monitor.env
# it also reports to healthchecks.io (ping on success, /fail with the reason),
# which is what sends the alert.
#
# Usage: deploy/ops/healthcheck.sh && echo OK      (cron: */5 * * * *)
set -uo pipefail

OPS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOY_DIR="$(dirname "$OPS_DIR")"
[ -f "$OPS_DIR/monitor.env" ] && . "$OPS_DIR/monitor.env"

BACKUP_ROOT="${BACKUP_ROOT:-$HOME/backups/health-tracker}"
APP_URL="${APP_HEALTH_URL:-http://127.0.0.1:3000/login}"
LOG="$BACKUP_ROOT/healthcheck.log"
mkdir -p "$BACKUP_ROOT"

compose() { docker compose -f "$DEPLOY_DIR/compose.yaml" --project-directory "$DEPLOY_DIR" "$@"; }

fail=()
for service in db app; do
  id="$(compose ps -aq "$service" 2>/dev/null)"
  if [ -z "$id" ]; then
    fail+=("$service=missing")
    continue
  fi
  state="$(docker inspect -f '{{.State.Status}}{{if .State.Health}}/{{.State.Health.Status}}{{end}}' "$id" 2>/dev/null || echo unknown)"
  case "$state" in
    running/healthy | running/starting) ;;
    *) fail+=("$service=$state") ;;
  esac
done

migrate_id="$(compose ps -aq migrate 2>/dev/null)"
if [ -n "$migrate_id" ]; then
  code="$(docker inspect -f '{{.State.ExitCode}}' "$migrate_id" 2>/dev/null || echo unknown)"
  [ "$code" = "0" ] || fail+=("migrate-exit=$code")
fi

http="$(curl -s -o /dev/null -w '%{http_code}' -m 10 "$APP_URL" || true)"
[ "$http" = "200" ] || fail+=("http=$http")

if [ ${#fail[@]} -eq 0 ]; then
  [ -n "${HC_CHECK_URL:-}" ] && curl -fsS -m 10 --retry 2 "$HC_CHECK_URL" >/dev/null || true
  exit 0
fi

msg="$(date -Is) FAIL: ${fail[*]}"
echo "$msg" >> "$LOG"
[ -n "${HC_CHECK_URL:-}" ] && curl -fsS -m 10 --retry 2 --data-raw "$msg" "$HC_CHECK_URL/fail" >/dev/null || true
exit 1
