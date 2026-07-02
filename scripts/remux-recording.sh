#!/bin/bash
# Remux MediaMTX fMP4 recordings into browser-playable progressive MP4.
# Usage: remux-recording.sh /path/to/file.mp4
set -euo pipefail

FILE="${1:-}"
if [[ -z "$FILE" || ! -f "$FILE" ]]; then
  exit 0
fi

case "$FILE" in
  *.mp4) ;;
  *) exit 0 ;;
esac

MARKER="${FILE}.remuxed"
if [[ -f "$MARKER" ]]; then
  exit 0
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
