#!/bin/bash
# Ensure MediaMTX calls livebooth.uk for RTMP auth (fixes OBS connect/disconnect loops).
# Run on droplet as root: bash /opt/livebooth/app/scripts/ensure-mediamtx-auth.sh
set -euo pipefail

RTMP_DIR="${RTMP_DIR:-/opt/livebooth/rtmp-server}"
APP_URL="${LIVEBOOTH_APP_URL:-https://livebooth.uk}"
CFG="${RTMP_DIR}/mediamtx.production.yml"

if [[ ! -f "${CFG}" ]]; then
  echo "Missing ${CFG}"
  exit 1
fi

echo "=== Ensure MediaMTX auth URL ==="
if grep -q 'LIVEBOOTH_APP_URL' "${CFG}"; then
  sed -i "s|https://LIVEBOOTH_APP_URL|${APP_URL}|g" "${CFG}"
  echo "Patched LIVEBOOTH_APP_URL placeholder → ${APP_URL}"
fi

if ! grep -q "authHTTPAddress: ${APP_URL}/api/rtmp/auth" "${CFG}"; then
  sed -i "s|authHTTPAddress:.*|authHTTPAddress: ${APP_URL}/api/rtmp/auth|" "${CFG}"
  echo "Set authHTTPAddress → ${APP_URL}/api/rtmp/auth"
fi

grep authHTTPAddress "${CFG}"

echo ""
echo "--- Auth test from host ---"
curl -s -X POST "${APP_URL}/api/rtmp/auth" \
  -H "Content-Type: application/json" \
  -d '{"action":"publish","path":"live/lb_test","protocol":"rtmp"}' \
  -w "\nHTTP:%{http_code}\n"

cd "${RTMP_DIR}"
docker compose -f docker-compose.production.yml up -d mediamtx
sleep 2
docker logs livebooth-rtmp --tail 8 2>&1 || true
echo ""
echo "Done. OBS: Server rtmp://rtmp.livebooth.uk:1935/live · Stream key = lb_… from Go Live"
