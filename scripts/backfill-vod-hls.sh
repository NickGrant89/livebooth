#!/bin/bash
# Build HLS VOD playlists for existing remuxed MP4 recordings (run once on VPS).
# Usage: bash /opt/livebooth/app/scripts/backfill-vod-hls.sh
set -euo pipefail

RTMP_DIR="${RTMP_DIR:-/opt/livebooth/rtmp-server}"
RECORDINGS="${RTMP_DIR}/recordings/live"
SCRIPT="${SCRIPT:-/usr/local/bin/livebooth-remux-recording.sh}"

echo "=== Backfill HLS VOD for existing recordings ==="

if ! command -v ffmpeg >/dev/null; then
  apt-get update -qq && apt-get install -y -qq ffmpeg
fi

count=0
find "${RECORDINGS}" -type f \( -name '*.mp4' -o -name '*.fmp4' \) ! -name '*.remuxing*' | while read -r f; do
  if [[ ! -f "${f}.remuxed" ]]; then
    echo "Skip (not remuxed yet): ${f}"
    continue
  fi
  dir="$(dirname "$f")/playback"
  if [[ -f "${dir}/index.m3u8" && -f "${dir}/.ready" ]]; then
    continue
  fi
  echo "HLS VOD: ${f}"
  REMUX_FORCE=1 REMUX_IDLE_SEC=0 bash -c '
    FILE="$1"
    HLS_DIR="$(dirname "$FILE")/playback"
    rm -rf "$HLS_DIR"
    mkdir -p "$HLS_DIR"
    ffmpeg -y -loglevel error -i "$FILE" \
      -c copy \
      -hls_time 6 \
      -hls_list_size 0 \
      -hls_playlist_type vod \
      -hls_flags independent_segments \
      -hls_segment_filename "${HLS_DIR}/seg_%04d.ts" \
      "${HLS_DIR}/index.m3u8"
    touch "${HLS_DIR}/.ready"
  ' _ "$f"
  count=$((count + 1))
done

echo "Done. Processed ${count} recording(s)."
echo "Test: curl -sI https://hls.livebooth.uk/recordings/live/INGEST_KEY/playback/index.m3u8"
