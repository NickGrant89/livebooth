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

file_mtime() {
  local path="$1"
  local ts=""
  ts=$(stat -c %Y "$path" 2>/dev/null) && { echo "$ts"; return; }
  ts=$(stat -f %m "$path" 2>/dev/null) && { echo "$ts"; return; }
  echo 0
}

# Do not remux while MediaMTX is still appending to the file — that caused ~30s replays.
if [[ "${REMUX_FORCE:-}" != "1" ]]; then
  now=$(date +%s)
  mtime=$(file_mtime "$FILE")
  age=$((now - mtime))
  if (( age < IDLE_SEC )); then
    exit 0
  fi
fi

if ! command -v ffmpeg >/dev/null 2>&1; then
  echo "ffmpeg required for recording remux" >&2
  exit 1
fi

base="${FILE%.*}"
ext="${FILE##*.}"
TMP="${base}.remux-$$.${ext}"
if ffmpeg -nostdin -y -loglevel error -i "$FILE" -c copy -movflags +faststart -f mp4 "$TMP" < /dev/null; then
  mv "$TMP" "$FILE"
  touch "$MARKER"
else
  rm -f "$TMP"
  exit 1
fi

# HLS VOD — small segments start playback in seconds (vs 200MB+ MP4 range storms).
HLS_DIR="$(dirname "$FILE")/playback"
rm -rf "$HLS_DIR"
mkdir -p "$HLS_DIR"
if ffmpeg -nostdin -y -loglevel error -i "$FILE" \
  -c copy \
  -hls_time 6 \
  -hls_list_size 0 \
  -hls_playlist_type vod \
  -hls_flags independent_segments \
  -hls_segment_filename "${HLS_DIR}/seg_%04d.ts" \
  "${HLS_DIR}/index.m3u8" < /dev/null; then
  touch "${HLS_DIR}/.ready"
else
  rm -rf "$HLS_DIR"
  echo "WARN: HLS VOD generation failed for ${FILE}" >&2
fi
