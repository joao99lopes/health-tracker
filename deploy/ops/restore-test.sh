#!/usr/bin/env bash
# Restore test: loads a health-tracker dump into a throwaway PostgreSQL and
# reports what came back. Never touches the real database.
#
# Usage: deploy/ops/restore-test.sh [dump.sql.gz]   (default: the newest local backup)
set -Eeuo pipefail

BACKUP_ROOT="${BACKUP_ROOT:-$HOME/backups/health-tracker}"
DUMP="${1:-$(ls -1d "$BACKUP_ROOT"/*/health-tracker-db.sql.gz 2>/dev/null | tail -1)}"
[ -n "$DUMP" ] && [ -f "$DUMP" ] || { echo "No dump found (looked in $BACKUP_ROOT)." >&2; exit 1; }
NAME="health-tracker-restore-test-$$"

echo "Dump: $DUMP"
docker run -d --rm --name "$NAME" -e POSTGRES_PASSWORD=restoretest -e POSTGRES_DB=restore \
  --memory 256m postgres:17-alpine >/dev/null
trap 'docker stop "$NAME" >/dev/null 2>&1 || true' EXIT

for _ in $(seq 30); do
  docker exec "$NAME" pg_isready -U postgres -d restore >/dev/null 2>&1 && break
  sleep 1
done
sleep 2

gunzip -c "$DUMP" | docker exec -i "$NAME" psql -q -U postgres -d restore -v ON_ERROR_STOP=1 >/dev/null
docker exec "$NAME" psql -U postgres -d restore -Atc \
  'select $$users: $$ || count(*) from "User"
   union all select $$profiles: $$ || count(*) from "Profile"
   union all select $$measurements: $$ || count(*) from "Measurement"
   union all select $$migrations: $$ || count(*) from "_prisma_migrations"'
echo "Restore OK"
