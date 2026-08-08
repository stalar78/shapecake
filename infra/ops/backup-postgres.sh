#!/bin/sh
set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
ROOT_DIR=$(CDPATH= cd -- "$SCRIPT_DIR/../.." && pwd)
COMPOSE_FILE=${COMPOSE_FILE:-"$ROOT_DIR/docker-compose.prod.yml"}
ENV_FILE=${ENV_FILE:-"$ROOT_DIR/.env.production"}
BACKUP_DIR=${BACKUP_DIR:-"$ROOT_DIR/backups/postgres"}
POSTGRES_SERVICE=${POSTGRES_SERVICE:-postgres}

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

mkdir -p "$BACKUP_DIR"

timestamp=$(date -u +"%Y%m%d-%H%M%S")
backup_file="$BACKUP_DIR/postgres-$timestamp.dump"
tmp_file="$backup_file.tmp"

echo "Creating PostgreSQL logical backup: $backup_file"
if compose exec -T "$POSTGRES_SERVICE" sh -eu -c \
  'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' > "$tmp_file"; then
  mv "$tmp_file" "$backup_file"
  echo "PostgreSQL backup complete: $backup_file"
else
  rm -f "$tmp_file"
  echo "PostgreSQL backup failed" >&2
  exit 1
fi
