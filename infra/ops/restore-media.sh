#!/bin/sh
set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
ROOT_DIR=$(CDPATH= cd -- "$SCRIPT_DIR/../.." && pwd)
COMPOSE_FILE=${COMPOSE_FILE:-"$ROOT_DIR/docker-compose.prod.yml"}
ENV_FILE=${ENV_FILE:-"$ROOT_DIR/.env.production"}
ARCHIVE_FILE=${1:-${ARCHIVE_FILE:-}}
MEDIA_VOLUME=${MEDIA_VOLUME:-api_prod_media}
VERIFY_VOLUME=${VERIFY_VOLUME:-media_restore_verify}

if [ -z "$ARCHIVE_FILE" ]; then
  echo "Usage: ARCHIVE_FILE=path/to/media.tar.gz $0" >&2
  echo "Or: $0 path/to/media.tar.gz" >&2
  exit 1
fi

if [ ! -f "$ARCHIVE_FILE" ]; then
  echo "Media archive not found: $ARCHIVE_FILE" >&2
  exit 1
fi

if [ ! -f "$COMPOSE_FILE" ]; then
  echo "Compose file not found: $COMPOSE_FILE" >&2
  exit 1
fi

case "$ARCHIVE_FILE" in
  /*) archive_abs="$ARCHIVE_FILE" ;;
  *) archive_abs="$(pwd)/$ARCHIVE_FILE" ;;
esac
archive_dir=$(dirname "$archive_abs")
archive_name=$(basename "$archive_abs")

echo "Validating media archive paths"
docker run --rm \
  -v "$archive_dir:/backup:ro" \
  busybox sh -eu -c '
    tar -tzf "/backup/'"$archive_name"'" | while IFS= read -r path; do
      case "$path" in
        "" | /* | ../* | */../* )
          echo "Unsafe archive path: $path" >&2
          exit 1
          ;;
      esac
    done
  '

project_name=${COMPOSE_PROJECT_NAME:-$(basename "$ROOT_DIR")}
if [ "${ALLOW_MEDIA_REPLACE:-}" = "yes" ]; then
  target_volume="${project_name}_${MEDIA_VOLUME}"
  if ! docker volume inspect "$target_volume" >/dev/null 2>&1; then
    echo "Production media volume not found: $target_volume" >&2
    echo "Set COMPOSE_PROJECT_NAME if production Compose uses a non-default project name." >&2
    exit 1
  fi
  echo "Replacing production media volume after explicit opt-in: $target_volume"
else
  target_volume="${project_name}_${VERIFY_VOLUME}"
  echo "Restoring into verification media volume: $target_volume"
fi

docker run --rm \
  -v "$target_volume:/media" \
  -v "$archive_dir:/backup:ro" \
  busybox sh -eu -c '
    if [ "'"${ALLOW_MEDIA_REPLACE:-}"'" = "yes" ]; then
      find /media -mindepth 1 -maxdepth 1 -exec rm -rf {} +
    fi
    tar -xzf "/backup/'"$archive_name"'" -C /media
    find /media -maxdepth 2 -print | head -50
  '

if [ "${ALLOW_MEDIA_REPLACE:-}" = "yes" ]; then
  echo "Media restore complete: $target_volume"
else
  echo "Media restore verification complete: $target_volume"
  echo "Set ALLOW_MEDIA_REPLACE=yes only for a deliberate replacement of the production media volume."
fi
