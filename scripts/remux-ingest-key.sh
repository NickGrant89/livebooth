#!/bin/bash
# Remux one ingest folder on the VPS (faststart MP4 + HLS VOD). Run on the droplet as root.
# Usage: bash scripts/remux-ingest-key.sh lb_37ef72ce8d8a401eaa9c472c9da11e34
set -euo pipefail

INGEST_KEY="${1:-}"
if [[ -z "$INGEST_KEY" ]]; then
  echo "Usage: $0 <ingest_key>" >&2
  exit 1
fi

APP_DIR="${APP_DIR:-/opt/livebooth}"
RTMP_DIR="${RTMP_DIR:-/opt/livebooth/rtmp-server}"
RECORDINGS="${RTMP_DIR}/recordings/live/${INGEST_KEY}"

for candidate in \
  "/usr/local/bin/livebooth-remux-recording.sh" \
  "${APP_DIR}/scripts/remux-recording.sh"; do
  if [[ -x "$candidate" || -f "$candidate" ]]; then
    REMUX_SCRIPT="$candidate"
    break
  fi
done

if [[ -z "${REMUX_SCRIPT:-}" ]]; then
  echo "Missing remux-recording.sh — git pull ${APP_DIR} and run scripts/setup-recording-remux.sh" >&2
  exit 1
fi

if [[ ! -d "$RECORDINGS" ]]; then
  echo "No recordings dir: ${RECORDINGS}" >&2
  exit 1
fi

if ! command -v ffmpeg >/dev/null; then
  apt-get update -qq && apt-get install -y -qq ffmpeg
fi

best=""
best_size=0
while IFS= read -r f; do
  [[ -f "$f" ]] || continue
  size=$(stat -c %s "$f" 2>/dev/null || stat -f %z "$f")
  if (( size > best_size )); then
    best="$f"
    best_size=$size
  fi
done < <(find "$RECORDINGS" -maxdepth 1 -type f \( -name '*.mp4' -o -name '*.fmp4' \) ! -name '*.remuxing*')

if [[ -z "$best" ]]; then
  echo "No mp4/fmp4 in ${RECORDINGS}" >&2
  exit 1
fi

echo "Remuxing largest file (${best_size} bytes): ${best}"
rm -f "${best}.remuxed"
REMUX_FORCE=1 bash "$REMUX_SCRIPT" "$best"

if [[ -f "${RECORDINGS}/playback/index.m3u8" ]]; then
  echo "OK — HLS VOD: https://hls.livebooth.uk/recordings/live/${INGEST_KEY}/playback/index.m3u8"
else
  echo "WARN — remux finished but HLS playlist missing. Check ffmpeg logs on VPS." >&2
  exit 1
fi
