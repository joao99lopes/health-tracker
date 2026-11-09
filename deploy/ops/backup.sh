#!/usr/bin/env bash
# Daily backup of health-tracker, and nothing else on the host.
#
# What it keeps, per day:
#   - health-tracker-db.sql.gz  pg_dump of the database (consistent, app stays up)
#   - env.tar.gz                this service's .env (the secrets live nowhere else)
#   - SHA256SUMS
#
# Where: $BACKUP_ROOT/AAAA-MM-DD locally (default ~/backups/health-tracker,
# kept 7 days) and, when rclone is configured, $BACKUP_REMOTE/AAAA-MM-DD
# (default gdrive-crypt:impiza/health-tracker, an encrypted remote, kept 30 days).
#
# Monitoring: HC_BACKUP_URL in ./monitor.env pings healthchecks.io on start,
# success and failure - one check per service.
#
# Usage: deploy/ops/backup.sh        (cron: 30 3 * * *)
set -Eeuo pipefail
umask 077

OPS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOY_DIR="$(dirname "$OPS_DIR")"
[ -f "$OPS_DIR/monitor.env" ] && . "$OPS_DIR/monitor.env"

BACKUP_ROOT="${BACKUP_ROOT:-$HOME/backups/health-tracker}"
REMOTE="${BACKUP_REMOTE:-gdrive-crypt:impiza/health-tracker}"
LOCAL_DAYS="${BACKUP_LOCAL_DAYS:-7}"
REMOTE_DAYS="${BACKUP_REMOTE_DAYS:-30}"
DAY="$(date +%F)"
DEST="$BACKUP_ROOT/$DAY"
LOG="$BACKUP_ROOT/backup.log"

ping_hc() { [ -n "${HC_BACKUP_URL:-}" ] && curl -fsS -m 10 --retry 3 "${HC_BACKUP_URL}$1" >/dev/null || true; }
compose() { docker compose -f "$DEPLOY_DIR/compose.yaml" --project-directory "$DEPLOY_DIR" "$@"; }

mkdir -p "$DEST"
exec >>"$LOG" 2>&1
echo "=== $(date -Is) backup start"
trap 'echo "!!! $(date -Is) backup FAILED (line $LINENO)"; ping_hc /fail' ERR
ping_hc /start

# 1. Database. Credentials are read inside the container, never on the host.
compose exec -T db sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --no-owner --clean --if-exists' \
  | gzip -9 > "$DEST/health-tracker-db.sql.gz"
gzip -t "$DEST/health-tracker-db.sql.gz"

# 2. This service's secrets (the .env may be a symlink; store its contents).
# Written from inside $DEST: a relative archive name can never be mistaken
# for a remote "host:path" by tar.
(cd "$DEST" && tar -czf env.tar.gz -C "$DEPLOY_DIR" --dereference .env)

(cd "$DEST" && sha256sum -- *.gz > SHA256SUMS)

# 3. Off-site copy, when an rclone remote is configured.
if command -v rclone >/dev/null && rclone listremotes | grep -q "^${REMOTE%%:*}:$"; then
  rclone copy "$DEST" "$REMOTE/$DAY" --log-level NOTICE
  rclone cryptcheck "$DEST" "$REMOTE/$DAY" --one-way --log-level ERROR \
    || rclone check "$DEST" "$REMOTE/$DAY" --one-way --log-level ERROR
  rclone delete "$REMOTE" --min-age "${REMOTE_DAYS}d" --log-level NOTICE || true
  rclone rmdirs "$REMOTE" --leave-root --log-level NOTICE || true
else
  echo "    (no rclone remote ${REMOTE%%:*}: - local copy only)"
fi

# 4. Local retention.
find "$BACKUP_ROOT" -mindepth 1 -maxdepth 1 -type d -mtime "+$LOCAL_DAYS" -exec rm -rf -- {} +

echo "=== $(date -Is) backup OK ($(du -sh "$DEST" | cut -f1))"
ping_hc ""
