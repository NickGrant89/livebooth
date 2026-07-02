#!/bin/bash
# Run on droplet while a stream is LIVE on livebooth.uk (note the lb_ key).
# Usage: INGEST_KEY=lb_xxx bash test-rtmp-local.sh
set -euo pipefail

KEY="${INGEST_KEY:?Set INGEST_KEY=lb_... from Go Live page}"

echo "=== Auth callback ==="
curl -s -X POST "https://livebooth.uk/api/rtmp/auth" \
  -H "Content-Type: application/json" \
  -d "{\"action\":\"publish\",\"path\":\"live/${KEY}\",\"protocol\":\"rtmp\"}" \
  -w " HTTP:%{http_code}\n"

echo "=== Paths before ==="
curl -s http://127.0.0.1:9997/v3/paths/list
echo ""

echo "=== Test publish (10s) via ffmpeg ==="
if ! command -v ffmpeg >/dev/null; then
  apt-get update -qq && apt-get install -y -qq ffmpeg
fi

timeout 12 ffmpeg -loglevel warning -re \
  -f lavfi -i "testsrc=size=640x360:rate=30" \
  -f lavfi -i "sine=frequency=440" \
  -c:v libx264 -preset ultrafast -tune zerolatency -pix_fmt yuv420p \
  -c:a aac -b:a 128k \
  -f flv "rtmp://127.0.0.1:1935/live/${KEY}" || true

sleep 2
echo "=== Paths after ==="
curl -s http://127.0.0.1:9997/v3/paths/list
echo ""

echo "=== HLS manifest ==="
curl -sI "http://127.0.0.1:8888/live/${KEY}/index.m3u8" | head -5
curl -s "https://hls.livebooth.uk/live/${KEY}/index.m3u8" | head -5
