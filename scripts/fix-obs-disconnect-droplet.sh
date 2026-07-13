#!/bin/bash
# Diagnose + fix OBS "connect then disconnect every ~3s" (WriteN RTMP send error 32).
# Run on droplet as root while reproducing from OBS, or right after a failed attempt.
#
# Usage:
#   INGEST_KEY=lb_your_key bash fix-obs-disconnect-droplet.sh
#   BYPASS_AUTH=1 bash fix-obs-disconnect-droplet.sh   # isolate auth vs encoder (test only)
set -euo pipefail

RTMP_DIR="${RTMP_DIR:-/opt/livebooth/rtmp-server}"
APP_URL="${LIVEBOOTH_APP_URL:-https://livebooth.uk}"
KEY="${INGEST_KEY:-}"
BYPASS_AUTH="${BYPASS_AUTH:-0}"

echo "=== LiveBooth OBS disconnect fix ==="
echo ""

echo "--- Memory / OOM (2GB VPS kills encoders mid-stream) ---"
free -h 2>/dev/null || true
if command -v dmesg >/dev/null 2>&1; then
  dmesg 2>/dev/null | grep -iE 'oom|killed process' | tail -5 || echo "(no recent OOM in dmesg)"
fi
docker stats --no-stream --format 'table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}' 2>/dev/null || true
echo ""

echo "--- Docker services ---"
docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}' 2>/dev/null || true
echo ""

echo "--- MediaMTX auth URL + CA mount ---"
CFG="${RTMP_DIR}/mediamtx.production.yml"
if [[ -f "${CFG}" ]]; then
  grep -E 'auth(Method|HTTPAddress)|readTimeout' "${CFG}" || true
else
  echo "Missing ${CFG}"
fi
COMPOSE="${RTMP_DIR}/docker-compose.production.yml"
if [[ -f "${COMPOSE}" ]]; then
  grep -E 'ssl/certs|SSL_CERT' "${COMPOSE}" || echo "WARN: no CA cert mount — HTTPS auth to Vercel will fail (x509)"
fi
echo ""

if [[ "${BYPASS_AUTH}" == "1" ]]; then
  echo "--- Applying auth bypass (test only) ---"
  LIVEBOOTH_APP_URL="${APP_URL}" BYPASS_AUTH=1 bash "$(dirname "$0")/fix-mediamtx-droplet.sh"
else
  if [[ -f "$(dirname "$0")/ensure-mediamtx-auth.sh" ]]; then
    LIVEBOOTH_APP_URL="${APP_URL}" bash "$(dirname "$0")/ensure-mediamtx-auth.sh"
  fi
fi
echo ""

echo "--- Auth callback (403 = fake key; 500/timeout = server cannot reach Vercel) ---"
if [[ -n "${KEY}" ]]; then
  curl -s -X POST "${APP_URL}/api/rtmp/auth" \
    -H "Content-Type: application/json" \
    -d "{\"action\":\"publish\",\"path\":\"live/${KEY}\",\"protocol\":\"rtmp\"}" \
    -w "\nHTTP:%{http_code}\n"
else
  echo "Set INGEST_KEY=lb_… to test your real Go Live key"
fi
echo ""

echo "--- MediaMTX logs (H264 parse / forbidden / x509 / closed) ---"
docker logs livebooth-rtmp --tail 60 2>&1 | grep -iE 'parse|h264|forbidden|403|x509|certificate|closed|error|publisher' || \
  docker logs livebooth-rtmp --tail 25 2>&1 || true
echo ""

if [[ -n "${KEY}" && "${KEY}" != "lb_CHANGE_ME" ]]; then
  echo "--- 20s ffmpeg test publish (known-good H264) ---"
  if ! command -v ffmpeg >/dev/null; then
    apt-get update -qq && apt-get install -y -qq ffmpeg
  fi
  timeout 20 ffmpeg -loglevel warning -re \
    -f lavfi -i "testsrc=size=1280x720:rate=30" \
    -f lavfi -i "sine=frequency=440" \
    -c:v libx264 -preset ultrafast -tune zerolatency -pix_fmt yuv420p \
    -profile:v main -g 60 -keyint_min 60 \
    -c:a aac -b:a 128k \
    -f flv "rtmp://127.0.0.1:1935/live/${KEY}" || true
  sleep 1
  echo "--- Paths after ffmpeg ---"
  curl -s http://127.0.0.1:9997/v3/paths/list || true
  echo ""
  docker logs livebooth-rtmp --tail 10 2>&1 || true
  echo ""
  echo "If ffmpeg stays up 20s but OBS drops at ~3s → fix OBS encoder (Apple VT H264, keyframe 2s)."
  echo "If ffmpeg also drops → auth, memory, or MediaMTX config on this VPS."
fi

echo ""
echo "--- Recommendations ---"
echo "1. Solo stream test: docker stop livebooth-compositor 2>/dev/null; stop LiveKit if running"
echo "2. OBS Mac: Apple VT H264, keyframe interval 2, 1280x720, Display Capture source"
echo "3. Auth bypass test: BYPASS_AUTH=1 bash $0  then retry OBS (re-enable auth after)"
echo "4. Upgrade OBS if older than v30"
