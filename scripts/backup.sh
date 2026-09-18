#!/bin/sh
# Daily PostgreSQL backup: one gzipped plain-SQL dump per run, older dumps
# pruned by age.
#
# Runs as the `backup` service in docker-compose.yml, on the compose network.
# It reaches PostgreSQL by service name, so no database port is published to
# the host or the LAN for this to work.
#
# Plain SQL rather than pg_dump's custom format: a .sql.gz can be read with
# `zcat` and restored with `psql`, needing nothing but the tools already in
# this image. See README.md for the restore procedure.
set -eu

BACKUP_DIR=${BACKUP_DIR:-/backups}
RETENTION_DAYS=${BACKUP_RETENTION_DAYS:-30}
# Daily. Exposed mainly so the test suite does not have to wait a day.
INTERVAL_SECONDS=${BACKUP_INTERVAL_SECONDS:-86400}

DB_HOST=${POSTGRES_HOST:-db}
DB_USER=${POSTGRES_USER:-health}
DB_NAME=${POSTGRES_DB:-health_tracker}

log() {
  echo "[backup] $(date -u +%Y-%m-%dT%H:%M:%SZ) $*"
}

# A non-numeric retention would make `find -mtime` behave in ways nobody
# intends, and this script deletes files. Refuse to start instead.
case "$RETENTION_DAYS" in
  '' | *[!0-9]*)
    log "BACKUP_RETENTION_DAYS must be a whole number of days (got '$RETENTION_DAYS')"
    exit 1
    ;;
esac

create_backup() {
  stamp=$(date -u +%Y%m%dT%H%M%SZ)
  final="$BACKUP_DIR/${DB_NAME}-${stamp}.sql.gz"
  partial="$final.partial"

  # Written under a .partial name and renamed only once pg_dump has exited
  # successfully. A dump cut short by a power failure therefore never leaves
  # behind a truncated file that looks like a usable backup.
  #
  # `--compress` rather than piping into gzip: a pipeline would report gzip's
  # exit status, not pg_dump's, and busybox ash has no dependable pipefail.
  # --no-owner/--no-privileges let the dump restore under whatever role does
  # the restoring, which is what makes it usable in a scratch instance.
  if pg_dump \
    --host="$DB_HOST" \
    --username="$DB_USER" \
    --dbname="$DB_NAME" \
    --no-owner \
    --no-privileges \
    --compress=gzip:9 \
    --file="$partial"; then
    mv "$partial" "$final"
    log "wrote $(basename "$final") ($(du -h "$final" | cut -f1))"
  else
    rm -f "$partial"
    log "FAILED: pg_dump did not complete; keeping existing backups"
    return 1
  fi
}

prune_backups() {
  # Scoped deliberately: regular files, one level deep, inside BACKUP_DIR,
  # matching the names this script writes. It can only ever remove dumps this
  # script created - it does not touch the database, the db_data volume, or
  # anything else on the host.
  deleted=$(find "$BACKUP_DIR" -maxdepth 1 -type f -name '*.sql.gz' -mtime +"$RETENTION_DAYS" -print -delete | wc -l)
  if [ "$deleted" -gt 0 ]; then
    log "pruned $deleted backup(s) older than ${RETENTION_DAYS} days"
  fi
  # Leftovers from an interrupted run; harmless, but do not keep them forever.
  find "$BACKUP_DIR" -maxdepth 1 -type f -name '*.sql.gz.partial' -mtime +1 -delete
}

mkdir -p "$BACKUP_DIR"
log "directory=$BACKUP_DIR retention=${RETENTION_DAYS}d database=$DB_NAME@$DB_HOST"

# `once` is the manual/one-off path:
#   docker compose run --rm backup /usr/local/bin/backup.sh once
if [ "${1:-}" = "once" ]; then
  create_backup
  prune_backups
  exit 0
fi

# Backs up immediately on start, then once per interval. Starting with a dump
# means a fresh deployment has a verified backup straight away rather than a
# day later.
while true; do
  if create_backup; then
    prune_backups
  fi
  sleep "$INTERVAL_SECONDS"
done
