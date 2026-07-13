#!/bin/bash
# One-shot repair for OBS connect/disconnect loops on the VPS.
# Stops memory-heavy LiveKit/compositor, deploys solo RTMP stack + auth proxy.
#
# Usage (from your Mac):
#   DROPLET=root@46.101.2.57 bash scripts/deploy-rtmp-fix-to-droplet.sh
#
# Optional:
#   INGEST_KEY=lb_xxx  — run ffmpeg test after deploy
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DROPLET="${DROPLET:-root@46.101.2.57}"
REMOTE_DIR="/opt/livebooth/rtmp-server"
APP_DIR="/opt/livebooth/app"
KEY="${INGEST_KEY:-}"

echo "=== LiveBooth RTMP repair → ${DROPLET} ==="

ssh "${DROPLET}" "mkdir -p ${REMOTE_DIR}/auth-proxy ${APP_DIR}/scripts"

echo "--- Sync RTMP configs ---"
scp "${ROOT}/rtmp-server/mediamtx.production.yml" \
  "${ROOT}/rtmp-server/docker-compose.rtmp-solo.yml" \
  "${DROPLET}:${REMOTE_DIR}/"

scp "${ROOT}/rtmp-server/auth-proxy/server.mjs" \
  "${ROOT}/rtmp-server/auth-proxy/Dockerfile" \
  "${DROPLET}:${REMOTE_DIR}/auth-proxy/"

scp "${ROOT}/scripts/ensure-mediamtx-auth.sh" \
  "${ROOT}/scripts/fix-obs-disconnect-droplet.sh" \
  "${ROOT}/scripts/diagnose-rtmp-droplet.sh" \
  "${DROPLET}:${APP_DIR}/scripts/"

ssh "${DROPLET}" "chmod +x ${APP_DIR}/scripts/*.sh"

echo "--- Stop memory-heavy services (LiveKit/compositor starve MediaMTX on 2GB VPS) ---"
ssh "${DROPLET}" bash -s <<'REMOTE'
set -euo pipefail
for c in livebooth-livekit livebooth-egress livebooth-redis livebooth-compositor; do
  docker stop "$c" 2>/dev/null || true
done
echo "Stopped collab/LiveKit containers (solo RTMP mode)."
REMOTE

echo "--- Patch auth URL + start solo RTMP stack ---"
ssh "${DROPLET}" bash -s <<REMOTE
set -euo pipefail
CFG="${REMOTE_DIR}/mediamtx.production.yml"
APP_URL="https://livebooth.uk"

# MediaMTX → local auth proxy → Vercel (fixes x509 + cold-start auth from inside Docker)
sed -i "s|authHTTPAddress:.*|authHTTPAddress: http://auth-proxy:8091/auth|" "\${CFG}"
sed -i "s|https://LIVEBOOTH_APP_URL|\${APP_URL}|g" "\${CFG}" 2>/dev/null || true

grep authHTTPAddress "\${CFG}"

cd "${REMOTE_DIR}"
docker compose -f docker-compose.rtmp-solo.yml up -d --build --force-recreate
sleep 3

echo ""
echo "--- Docker status ---"
docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}' | grep -E 'livebooth|NAMES' || docker ps

echo ""
echo "--- Auth proxy health ---"
curl -sf http://127.0.0.1:8091/health && echo " auth-proxy ok" || echo "WARN: auth-proxy not healthy"

echo ""
echo "--- Auth chain (proxy → Vercel) ---"
curl -s -X POST http://127.0.0.1:8091/auth \
  -H "Content-Type: application/json" \
  -d '{"action":"publish","path":"live/lb_test","protocol":"rtmp"}' \
  -w " HTTP:%{http_code}\n"

echo ""
echo "--- MediaMTX logs ---"
docker logs livebooth-rtmp --tail 12 2>&1 || true
REMOTE

if [[ -n "${KEY}" ]]; then
  echo ""
  echo "--- Remote ffmpeg test (20s) ---"
  ssh "${DROPLET}" "INGEST_KEY=${KEY} bash ${APP_DIR}/scripts/fix-obs-disconnect-droplet.sh" || true
fi

echo ""
echo "=== Done ==="
echo "OBS:"
echo "  Server:      rtmp://rtmp.livebooth.uk:1935/live"
echo "  Stream key:  lb_… from Go Live (key field only)"
echo ""
echo "Mac OBS: Apple VT H264 encoder, keyframe interval 2 sec."
echo "Re-enable LiveKit collab later: DROPLET=${DROPLET} bash scripts/deploy-livekit-to-droplet.sh"
