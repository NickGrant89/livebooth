#!/bin/bash
# Run on the DigitalOcean droplet as root while a stream is LIVE on livebooth.uk.
# Usage: INGEST_KEY=lb_xxx bash diagnose-rtmp-droplet.sh
set -euo pipefail

RTMP_DIR="/opt/livebooth/rtmp-server"
KEY="${INGEST_KEY:-lb_CHANGE_ME}"
APP_URL="${LIVEBOOTH_APP_URL:-https://livebooth.uk}"

echo "=== LiveBooth RTMP diagnose ==="
echo "Key: ${KEY}"
echo ""

echo "--- Docker ---"
docker ps --filter name=livebooth-rtmp --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'
echo ""

echo "--- MediaMTX auth URL in config ---"
grep -E 'auth(Method|HTTPAddress)|readTimeout' "${RTMP_DIR}/mediamtx.production.yml" || true
echo ""

echo "--- Auth from host (simulates MediaMTX callback) ---"
curl -s -X POST "${APP_URL}/api/rtmp/auth" \
  -H "Content-Type: application/json" \
  -d "{\"action\":\"publish\",\"path\":\"live/${KEY}\",\"protocol\":\"rtmp\",\"ip\":\"127.0.0.1\"}" \
  -w " HTTP:%{http_code}\n"
echo ""

echo "--- Recent MediaMTX logs (look for auth / publish / forbidden) ---"
docker logs livebooth-rtmp --tail 40 2>&1 || true
echo ""

echo "--- Active paths ---"
curl -s http://127.0.0.1:9997/v3/paths/list
echo ""

if [[ "${KEY}" != "lb_CHANGE_ME" ]]; then
  echo ""
  echo "--- 8s ffmpeg test publish ---"
  if ! command -v ffmpeg >/dev/null; then
    apt-get update -qq && apt-get install -y -qq ffmpeg
  fi
  timeout 8 ffmpeg -loglevel warning -re \
    -f lavfi -i "testsrc=size=640x360:rate=30" \
    -f lavfi -i "sine=frequency=440" \
    -c:v libx264 -preset ultrafast -tune zerolatency -pix_fmt yuv420p \
    -c:a aac \
    -f flv "rtmp://127.0.0.1:1935/live/${KEY}" || true
  sleep 1
  echo "--- Paths after ffmpeg ---"
  curl -s http://127.0.0.1:9997/v3/paths/list
  echo ""
  echo "--- MediaMTX logs after ffmpeg ---"
  docker logs livebooth-rtmp --tail 15 2>&1 || true
fi

echo ""
echo "If auth from host is 200 but ffmpeg still fails, read docker logs above."
echo "Common fixes:"
echo "  1. Wrong authHTTPAddress in mediamtx.production.yml → run fix-mediamtx-droplet.sh"
echo "  2. HTTP request failed in logs → MediaMTX cannot reach ${APP_URL}"
echo "  3. server replied with code 403 → Go Live first; use the current lb_ key"
echo "  4. Bypass test: BYPASS_AUTH=1 bash fix-mediamtx-droplet.sh (re-enable auth after)"
