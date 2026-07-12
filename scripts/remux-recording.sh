#!/bin/bash
# Remux MediaMTX fMP4 recordings into browser-playable progressive MP4.
# Only remuxes after the file has been idle (stream finished writing).
# Usage: remux-recording.sh /path/to/file.mp4
set -euo pipefail

FILE="${1:-}"
IDLE_SEC="${REMUX_IDLE_SEC:-180}"

if [[ -z "$FILE" || ! -f "$FILE" ]]; then
  exit 0
fi

case "$FILE" in
  *.mp4 | *.fmp4) ;;
  *) exit 0 ;;
esac

MARKER="${FILE}.remuxed"
if [[ -f "$MARKER" ]]; then
  exit 0
fi

# Do not remux while MediaMTX is still appending to the file — that caused ~30s replays.
if [[ "${REMUX_FORCE:-}" != "1" ]]; then
  now=$(date +%s)
  mtime=$(stat -f %m "$FILE" 2>/dev/null || stat -c %Y "$FILE" 2>/dev/null || echo 0)
  age=$((now - mtime))
  if (( age < IDLE_SEC )); then
    exit 0
  fi
fi

if ! command -v ffmpeg >/dev/null 2>&1; then
  echo "ffmpeg required for recording remux" >&2
  exit 1
fi

TMP="${FILE}.remuxing.$$"
if ffmpeg -y -loglevel error -i "$FILE" -c copy -movflags +faststart "$TMP"; then
  mv "$TMP" "$FILE"
  touch "$MARKER"
else
  rm -f "$TMP"
  exit 1
fi
