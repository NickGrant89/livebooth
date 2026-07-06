#!/bin/bash
# Wire collab compositor on the LiveBooth RTMP VPS.
# Run ON THE DROPLET as root (after copying latest rtmp-server files):
#   bash /opt/livebooth/setup-compositor-droplet.sh
#
# Or from your Mac (set DROPLET first):
#   DROPLET=root@YOUR_VPS_IP bash scripts/deploy-compositor-to-droplet.sh
set -euo pipefail

RTMP_DIR="${RTMP_DIR:-/opt/livebooth/rtmp-server}"
CADDYFILE="${CADDYFILE:-/etc/caddy/Caddyfile}"
APP_URL="${LIVEBOOTH_APP_URL:-https://livebooth.uk}"
COMPOSITOR_DOMAIN="${COMPOSITOR_DOMAIN:-compositor.livebooth.uk}"

echo "=== LiveBooth collab compositor setup ==="
echo "RTMP dir: ${RTMP_DIR}"
echo "Compositor domain: ${COMPOSITOR_DOMAIN}"

if [[ ! -d "${RTMP_DIR}/compositor" ]]; then
  echo "ERROR: ${RTMP_DIR}/compositor not found."
  echo "Copy from your Mac:"
  echo "  scp -r rtmp-server/compositor root@YOUR_VPS:/opt/livebooth/rtmp-server/"
  exit 1
fi

mkdir -p "${RTMP_DIR}"
ENV_FILE="${RTMP_DIR}/.env"
if [[ ! -f "${ENV_FILE}" ]]; then
  touch "${ENV_FILE}"
fi

if ! grep -q '^COMPOSITOR_SECRET=' "${ENV_FILE}" 2>/dev/null; then
  SECRET="$(openssl rand -hex 32)"
  echo "COMPOSITOR_SECRET=${SECRET}" >> "${ENV_FILE}"
  echo "Generated COMPOSITOR_SECRET in ${ENV_FILE}"
else
  SECRET="$(grep '^COMPOSITOR_SECRET=' "${ENV_FILE}" | cut -d= -f2-)"
  echo "Using existing COMPOSITOR_SECRET from ${ENV_FILE}"
fi

if [[ -z "${SECRET}" ]]; then
  echo "ERROR: COMPOSITOR_SECRET is empty"
  exit 1
fi

echo "--- Updating docker compose (use repo file — do not overwrite) ---"
if [[ ! -f "${RTMP_DIR}/docker-compose.production.yml" ]]; then
  echo "ERROR: Missing ${RTMP_DIR}/docker-compose.production.yml"
  echo "Run: DROPLET=root@YOUR_VPS bash scripts/deploy-livekit-to-droplet.sh"
  exit 1
fi

echo "--- Building and starting containers ---"
cd "${RTMP_DIR}"
docker compose -f docker-compose.production.yml --env-file "${ENV_FILE}" up -d --build
sleep 3

echo "--- Compositor health (local) ---"
curl -sf "http://127.0.0.1:8090/health" | head -c 200 || echo "WARN: compositor not responding on :8090"
echo ""

if [[ -f "${CADDYFILE}" ]]; then
  if grep -q "${COMPOSITOR_DOMAIN}" "${CADDYFILE}"; then
    echo "Caddy already has ${COMPOSITOR_DOMAIN} — skipping"
  else
    echo "--- Appending Caddy block for ${COMPOSITOR_DOMAIN} ---"
    cat >> "${CADDYFILE}" << EOF

# Collab compositor control API (Vercel → FFmpeg mixer)
${COMPOSITOR_DOMAIN} {
	reverse_proxy 127.0.0.1:8090
}
EOF
    if systemctl is-active --quiet caddy 2>/dev/null; then
      caddy validate --config "${CADDYFILE}"
      systemctl reload caddy
      echo "Caddy reloaded"
    else
      echo "Caddy not running — add DNS for ${COMPOSITOR_DOMAIN} then: systemctl reload caddy"
    fi
  fi
else
  echo "No ${CADDYFILE} — add manually:"
  echo ""
  echo "${COMPOSITOR_DOMAIN} {"
  echo "  reverse_proxy 127.0.0.1:8090"
  echo "}"
fi

echo ""
echo "=== Done ==="
echo ""
echo "1. DNS (Cloudflare DNS-only / grey cloud):"
echo "   ${COMPOSITOR_DOMAIN}  →  $(curl -s ifconfig.me 2>/dev/null || echo 'YOUR_VPS_IP')"
echo ""
echo "2. Vercel → Production env (then redeploy):"
echo "   COMPOSITOR_ENABLED=true"
echo "   COMPOSITOR_CONTROL_URL=https://${COMPOSITOR_DOMAIN}"
echo "   COMPOSITOR_SECRET=${SECRET}"
echo ""
echo "3. Database migration (local or CI):"
echo "   npx prisma migrate deploy"
echo ""
echo "4. Test HTTPS (after DNS propagates):"
echo "   curl -s https://${COMPOSITOR_DOMAIN}/health"
echo ""
echo "5. Collab test: both DJs go live on /collab — host page shows 'B2B mix · synced audio'"
