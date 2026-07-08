#!/bin/bash
# Deploy LiveKit + full RTMP stack to the VPS.
# Usage:
#   DROPLET=root@46.101.2.57 bash scripts/deploy-livekit-to-droplet.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DROPLET="${DROPLET:-}"

if [[ -z "${DROPLET}" ]]; then
  echo "Set DROPLET to your VPS SSH target, e.g.:"
  echo "  DROPLET=root@46.101.2.57 bash scripts/deploy-livekit-to-droplet.sh"
  exit 1
fi

REMOTE_DIR="/opt/livebooth/rtmp-server"

echo "=== Deploy LiveKit stack to ${DROPLET} ==="

ssh "${DROPLET}" "mkdir -p ${REMOTE_DIR}/compositor /opt/livebooth/scripts"

scp "${ROOT}/rtmp-server/docker-compose.production.yml" \
  "${ROOT}/rtmp-server/livekit.yaml.example" \
  "${ROOT}/rtmp-server/egress.yaml.example" \
  "${DROPLET}:${REMOTE_DIR}/"

scp "${ROOT}/rtmp-server/compositor/server.mjs" \
  "${ROOT}/rtmp-server/compositor/Dockerfile" \
  "${DROPLET}:${REMOTE_DIR}/compositor/"

scp "${ROOT}/scripts/setup-livekit-droplet.sh" \
  "${DROPLET}:/opt/livebooth/setup-livekit-droplet.sh"

scp "${ROOT}/scripts/check-livekit-media.sh" \
  "${DROPLET}:/opt/livebooth/scripts/check-livekit-media.sh"

ssh "${DROPLET}" "chmod +x /opt/livebooth/setup-livekit-droplet.sh /opt/livebooth/scripts/check-livekit-media.sh"

ssh "${DROPLET}" "bash /opt/livebooth/setup-livekit-droplet.sh"

echo ""
echo "Media check (on VPS): bash /opt/livebooth/scripts/check-livekit-media.sh"
echo ""
echo "Deploy complete. Add Vercel env vars printed above, then redeploy livebooth.uk."
