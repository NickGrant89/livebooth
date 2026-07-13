#!/bin/bash
# Build HLS VOD playlists for existing remuxed MP4 recordings (run once on VPS).
# Usage: bash /opt/livebooth/app/scripts/backfill-vod-hls.sh
set -euo pipefail

RTMP_DIR="${RTMP_DIR:-/opt/livebooth/rtmp-server}"
RECORDINGS="${RTMP_DIR}/recordings/live"
APP_DIR="${APP_DIR:-/opt/livebooth/app}"
for candidate in \
  "/usr/local/bin/livebooth-remux-recording.sh" \
  "${APP_DIR}/scripts/remux-recording.sh"; do
  if [[ -f "$candidate" ]]; then
    REMUX_SCRIPT="$candidate"
    break
  fi
done
if [[ -z "${REMUX_SCRIPT:-}" ]]; then
  echo "Missing remux-recording.sh — git pull app repo first." >&2
  exit 1
fi

echo "=== Backfill HLS VOD for existing recordings ==="
echo "Using remux script: ${REMUX_SCRIPT}"

if ! command -v ffmpeg >/dev/null; then
  apt-get update -qq && apt-get install -y -qq ffmpeg
fi

count=0
while IFS= read -r f; do
  dir="$(dirname "$f")/playback"
  if [[ -f "${dir}/index.m3u8" && -f "${dir}/.ready" ]]; then
    continue
  fi

  if [[ ! -f "${f}.remuxed" ]]; then
    echo "Remux (faststart + HLS): ${f}"
    REMUX_FORCE=1 REMUX_IDLE_SEC=0 bash "${REMUX_SCRIPT}" "${f}" || {
      echo "WARN: remux failed, trying HLS from raw file: ${f}" >&2
    }
  fi

  if [[ -f "${dir}/index.m3u8" && -f "${dir}/.ready" ]]; then
    count=$((count + 1))
    continue
  fi

  if [[ ! -f "${f}.remuxed" ]]; then
    echo "Skip (remux failed): ${f}"
    continue
  fi

  echo "HLS VOD only: ${f}"
  rm -rf "$dir"
  mkdir -p "$dir"
  ffmpeg -y -loglevel error -i "$f" \
    -c copy \
    -hls_time 6 \
    -hls_list_size 0 \
    -hls_playlist_type vod \
    -hls_flags independent_segments \
    -hls_segment_filename "${dir}/seg_%04d.ts" \
    "${dir}/index.m3u8"
  touch "${dir}/.ready"
  count=$((count + 1))
done < <(find "${RECORDINGS}" -type f \( -name '*.mp4' -o -name '*.fmp4' \) ! -name '*.remuxing*' | sort)

echo "Done. Processed ${count} recording(s)."
echo "Test: curl -sI https://hls.livebooth.uk/recordings/live/INGEST_KEY/playback/index.m3u8"
