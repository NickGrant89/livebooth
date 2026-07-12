#!/bin/bash
# Full VOD recording stack on the VPS: Caddy /recordings + remux watcher + MediaMTX hints.
# Run on the droplet as root after RTMP is working:
#   cd /opt/livebooth/app && git pull && bash scripts/setup-full-recording.sh
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/livebooth/app}"
RTMP_DIR="${RTMP_DIR:-/opt/livebooth/rtmp-server}"

echo "=== LiveBooth full recording setup ==="
echo "Records every RTMP publish (solo, collab host, partner, B2B mix) to disk."
echo ""

if [[ -f "${APP_DIR}/scripts/fix-caddy-recordings.sh" ]]; then
  bash "${APP_DIR}/scripts/fix-caddy-recordings.sh"
else
  echo "WARN: fix-caddy-recordings.sh not found — serve recordings via Caddy manually."
fi

if [[ -f "${APP_DIR}/scripts/setup-recording-remux.sh" ]]; then
  bash "${APP_DIR}/scripts/setup-recording-remux.sh"
else
  echo "WARN: setup-recording-remux.sh not found."
fi

if [[ -f "${RTMP_DIR}/mediamtx.production.yml" ]]; then
  if grep -q 'readTimeout: 30s' "${RTMP_DIR}/mediamtx.production.yml" 2>/dev/null; then
    echo ""
    echo "WARN: mediamtx still has 30s timeouts — pull latest mediamtx.production.yml and restart:"
    echo "  cd ${RTMP_DIR} && docker compose -f docker-compose.production.yml restart mediamtx"
  fi
fi

HLS_DOMAIN="${HLS_DOMAIN:-hls.livebooth.uk}"
echo ""
echo "=== Vercel env (required for replays) ==="
echo "  RECORDINGS_PUBLIC_URL=https://${HLS_DOMAIN}/recordings"
echo "  RTMP_SERVER_URL=rtmp://rtmp.livebooth.uk:1935/live"
echo "  HLS_SERVER_URL=https://${HLS_DOMAIN}"
echo ""
echo "=== What gets recorded ==="
echo "  • Solo DJ stream     → live/lb_{host}/"
echo "  • Collab host        → live/lb_{host}/"
echo "  • Collab partner     → live/lb_{partner}/"
echo "  • B2B mixed booth    → live/lb_{host}_mix/  (used for host replay when compositor ran)"
echo ""
echo "Replays appear on /vod/{streamId} ~3 min after you end the stream (remux idle wait)."
echo "Done."
