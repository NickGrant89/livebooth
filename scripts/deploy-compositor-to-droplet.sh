#!/bin/bash
# Deploy collab compositor files to the RTMP VPS and run setup.
# Usage:
#   DROPLET=root@YOUR_VPS_IP bash scripts/deploy-compositor-to-droplet.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DROPLET="${DROPLET:-}"

if [[ -z "${DROPLET}" ]]; then
  echo "Set DROPLET to your VPS SSH target, e.g.:"
  echo "  DROPLET=root@123.45.67.89 bash scripts/deploy-compositor-to-droplet.sh"
  exit 1
fi

REMOTE_DIR="/opt/livebooth/rtmp-server"

echo "=== Deploy compositor to ${DROPLET} ==="

ssh "${DROPLET}" "mkdir -p ${REMOTE_DIR}/compositor /opt/livebooth"

scp "${ROOT}/rtmp-server/compositor/server.mjs" \
  "${ROOT}/rtmp-server/compositor/Dockerfile" \
  "${DROPLET}:${REMOTE_DIR}/compositor/"

scp "${ROOT}/rtmp-server/docker-compose.production.yml" \
  "${DROPLET}:${REMOTE_DIR}/"

scp "${ROOT}/scripts/setup-compositor-droplet.sh" \
  "${DROPLET}:/opt/livebooth/setup-compositor-droplet.sh"

ssh "${DROPLET}" "bash /opt/livebooth/setup-compositor-droplet.sh"

echo ""
echo "Deploy complete. Add Vercel env vars printed above, then redeploy livebooth.uk."
