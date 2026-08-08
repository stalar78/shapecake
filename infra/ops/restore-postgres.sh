#!/bin/sh
set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
ROOT_DIR=$(CDPATH= cd -- "$SCRIPT_DIR/../.." && pwd)
COMPOSE_FILE=${COMPOSE_FILE:-"$ROOT_DIR/docker-compose.prod.yml"}
ENV_FILE=${ENV_FILE:-"$ROOT_DIR/.env.production"}
POSTGRES_SERVICE=${POSTGRES_SERVICE:-postgres}
BACKUP_FILE=${1:-${BACKUP_FILE:-}}
TARGET_DB=${TARGET_DB:-}

if [ -z "$BACKUP_FILE" ]; then
  echo "Usage: BACKUP_FILE=path/to/postgres.dump $0" >&2
  echo "Or: $0 path/to/postgres.dump" >&2
  exit 1
fi

if [ ! -f "$BACKUP_FILE" ]; then
  echo "Backup file not found: $BACKUP_FILE" >&2
  exit 1
fi

if [ ! -f "$COMPOSE_FILE" ]; then
  echo "Compose file not found: $COMPOSE_FILE" >&2
  exit 1
fi

compose() {
  if [ -f "$ENV_FILE" ]; then
    docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" "$@"
  else
    docker compose -f "$COMPOSE_FILE" "$@"
  fi
}

production_db=$(compose exec -T "$POSTGRES_SERVICE" sh -eu -c 'printf "%s" "$POSTGRES_DB"')
if [ -z "$production_db" ]; then
  echo "Could not determine production POSTGRES_DB from the postgres service" >&2
  exit 1
fi

if [ -z "$TARGET_DB" ]; then
  TARGET_DB="${production_db}_restore_verify_$(date -u +"%Y%m%d_%H%M%S")"
fi

case "$TARGET_DB" in
  *[!A-Za-z0-9_]* | "" )
    echo "TARGET_DB must contain only letters, numbers, and underscores" >&2
    exit 1
    ;;
esac

if [ "$TARGET_DB" = "$production_db" ] && [ "${ALLOW_PRODUCTION_RESTORE:-}" != "yes" ]; then
  echo "Refusing in-place production restore. Set ALLOW_PRODUCTION_RESTORE=yes only for a deliberate production recovery." >&2
  exit 1
fi

echo "Validating backup archive readability"
compose exec -T "$POSTGRES_SERVICE" sh -eu -c 'pg_restore --list >/dev/null' < "$BACKUP_FILE"

db_exists=$(compose exec -T -e TARGET_DB="$TARGET_DB" "$POSTGRES_SERVICE" sh -eu -c \
  'psql -U "$POSTGRES_USER" -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname = '"'"'$TARGET_DB'"'"'"')

if [ "$db_exists" = "1" ]; then
  if [ "${ALLOW_REPLACE_TARGET_DB:-}" != "yes" ]; then
    echo "Target database already exists: $TARGET_DB" >&2
    echo "Set ALLOW_REPLACE_TARGET_DB=yes to drop and recreate only this target database." >&2
    exit 1
  fi
  if [ "$TARGET_DB" = "$production_db" ] && [ "${ALLOW_PRODUCTION_RESTORE:-}" != "yes" ]; then
    echo "Refusing to replace production database without ALLOW_PRODUCTION_RESTORE=yes" >&2
    exit 1
  fi
  echo "Dropping existing target database after explicit opt-in: $TARGET_DB"
  compose exec -T -e TARGET_DB="$TARGET_DB" "$POSTGRES_SERVICE" sh -eu -c \
    'psql -U "$POSTGRES_USER" -d postgres -v ON_ERROR_STOP=1 -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '"'"'$TARGET_DB'"'"' AND pid <> pg_backend_pid();" && dropdb -U "$POSTGRES_USER" "$TARGET_DB"'
fi

echo "Creating target database: $TARGET_DB"
compose exec -T -e TARGET_DB="$TARGET_DB" "$POSTGRES_SERVICE" sh -eu -c 'createdb -U "$POSTGRES_USER" "$TARGET_DB"'

echo "Restoring backup into: $TARGET_DB"
compose exec -T -e TARGET_DB="$TARGET_DB" "$POSTGRES_SERVICE" sh -eu -c \
  'pg_restore -U "$POSTGRES_USER" -d "$TARGET_DB" --no-owner --no-privileges' < "$BACKUP_FILE"

echo "Checking restored database queryability"
compose exec -T -e TARGET_DB="$TARGET_DB" "$POSTGRES_SERVICE" sh -eu -c \
  'psql -U "$POSTGRES_USER" -d "$TARGET_DB" -v ON_ERROR_STOP=1 -c "SELECT version_num FROM alembic_version LIMIT 1;"'

echo "PostgreSQL restore verification complete: $TARGET_DB"
