#!/bin/sh
set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
ROOT_DIR=$(CDPATH= cd -- "$SCRIPT_DIR/../.." && pwd)
COMPOSE_FILE=${COMPOSE_FILE:-"$ROOT_DIR/docker-compose.prod.yml"}
ENV_FILE=${ENV_FILE:-"$ROOT_DIR/.env.production"}
BACKUP_DIR=${BACKUP_DIR:-"$ROOT_DIR/backups/media"}
MEDIA_VOLUME=${MEDIA_VOLUME:-api_prod_media}

if [ ! -f "$COMPOSE_FILE" ]; then
  echo "Compose file not found: $COMPOSE_FILE" >&2
  exit 1
fi

mkdir -p "$BACKUP_DIR"

project_name=${COMPOSE_PROJECT_NAME:-$(basename "$ROOT_DIR")}
volume_name="${project_name}_${MEDIA_VOLUME}"
timestamp=$(date -u +"%Y%m%d-%H%M%S")
archive_file="$BACKUP_DIR/media-$timestamp.tar.gz"
tmp_file="$archive_file.tmp"

if ! docker volume inspect "$volume_name" >/dev/null 2>&1; then
  echo "Media volume not found: $volume_name" >&2
  echo "Set COMPOSE_PROJECT_NAME if production Compose uses a non-default project name." >&2
  exit 1
fi

echo "Creating media backup from Docker volume: $volume_name"
if docker run --rm \
  -v "$volume_name:/media:ro" \
  -v "$BACKUP_DIR:/backup" \
  busybox sh -eu -c 'tar -czf "/backup/'"$(basename "$tmp_file")"'" -C /media .'; then
  mv "$tmp_file" "$archive_file"
  echo "Media backup complete: $archive_file"
else
  rm -f "$tmp_file"
  echo "Media backup failed" >&2
  exit 1
fi
