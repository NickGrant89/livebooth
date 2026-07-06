#!/bin/bash
# Self-host LiveKit (+ egress) on the LiveBooth RTMP VPS for low-latency WebRTC collab.
#
# Run ON THE DROPLET as root:
#   bash /opt/livebooth/setup-livekit-droplet.sh
#
# Or from your Mac:
#   DROPLET=root@46.101.2.57 bash scripts/deploy-livekit-to-droplet.sh
set -euo pipefail

RTMP_DIR="${RTMP_DIR:-/opt/livebooth/rtmp-server}"
CADDYFILE="${CADDYFILE:-/etc/caddy/Caddyfile}"
RTC_DOMAIN="${LIVEKIT_DOMAIN:-rtc.livebooth.uk}"
TURN_DOMAIN="${LIVEKIT_TURN_DOMAIN:-turn.livebooth.uk}"
COMPOSITOR_DOMAIN="${COMPOSITOR_DOMAIN:-compositor.livebooth.uk}"

echo "=== LiveBooth LiveKit self-host setup ==="
echo "RTMP dir: ${RTMP_DIR}"

if [[ ! -f "${RTMP_DIR}/docker-compose.production.yml" ]]; then
  echo "ERROR: ${RTMP_DIR}/docker-compose.production.yml missing."
  echo "Run: DROPLET=root@YOUR_VPS bash scripts/deploy-livekit-to-droplet.sh"
  exit 1
fi

mkdir -p "${RTMP_DIR}"
ENV_FILE="${RTMP_DIR}/.env"
touch "${ENV_FILE}"

PUBLIC_IP="$(curl -sf ifconfig.me 2>/dev/null || curl -sf https://api.ipify.org 2>/dev/null || true)"
if [[ -z "${PUBLIC_IP}" ]]; then
  echo "WARN: Could not detect public IP — set LIVEKIT_NODE_IP in ${ENV_FILE} manually"
fi

upsert_env() {
  local key="$1"
  local val="$2"
  if grep -q "^${key}=" "${ENV_FILE}" 2>/dev/null; then
    sed -i "s|^${key}=.*|${key}=${val}|" "${ENV_FILE}"
  else
    echo "${key}=${val}" >> "${ENV_FILE}"
  fi
}

if ! grep -q '^LIVEKIT_API_KEY=' "${ENV_FILE}" 2>/dev/null; then
  upsert_env "LIVEKIT_API_KEY" "lb_$(openssl rand -hex 8)"
  echo "Generated LIVEKIT_API_KEY"
fi
if ! grep -q '^LIVEKIT_API_SECRET=' "${ENV_FILE}" 2>/dev/null; then
  upsert_env "LIVEKIT_API_SECRET" "$(openssl rand -base64 42 | tr -d '/+=' | head -c 48)"
  echo "Generated LIVEKIT_API_SECRET"
fi
if ! grep -q '^COMPOSITOR_SECRET=' "${ENV_FILE}" 2>/dev/null; then
  upsert_env "COMPOSITOR_SECRET" "$(openssl rand -hex 32)"
  echo "Generated COMPOSITOR_SECRET"
fi
if [[ -n "${PUBLIC_IP}" ]]; then
  upsert_env "LIVEKIT_NODE_IP" "${PUBLIC_IP}"
fi

# shellcheck disable=SC1090
source "${ENV_FILE}"

if [[ -z "${LIVEKIT_API_KEY:-}" || -z "${LIVEKIT_API_SECRET:-}" ]]; then
  echo "ERROR: LIVEKIT_API_KEY / LIVEKIT_API_SECRET missing in ${ENV_FILE}"
  exit 1
fi

NODE_IP="${LIVEKIT_NODE_IP:-${PUBLIC_IP}}"

find_turn_tls_certs() {
  local domain="$1"
  local base cert key
  for base in \
    "/var/lib/caddy/.local/share/caddy/certificates/acme-v02.api.letsencrypt.org-directory/${domain}" \
    "/var/lib/caddy/certificates/acme-v02.api.letsencrypt.org-directory/${domain}"; do
    if [[ -f "${base}/${domain}.crt" && -f "${base}/${domain}.key" ]]; then
      cert="${base}/${domain}.crt"
      key="${base}/${domain}.key"
      echo "${cert}:${key}"
      return 0
    fi
  done
  if [[ -f "/etc/letsencrypt/live/${domain}/fullchain.pem" && -f "/etc/letsencrypt/live/${domain}/privkey.pem" ]]; then
    echo "/etc/letsencrypt/live/${domain}/fullchain.pem:/etc/letsencrypt/live/${domain}/privkey.pem"
    return 0
  fi
  return 1
}

# Caddy + TURN TLS certs before livekit.yaml (mobile needs TURN/TLS on 5349)
if [[ -f "${CADDYFILE}" ]]; then
  CHANGED=0
  if ! grep -q "${RTC_DOMAIN}" "${CADDYFILE}"; then
    cat >> "${CADDYFILE}" << EOF

# LiveKit WebRTC signaling (WSS) — ${RTC_DOMAIN}
${RTC_DOMAIN} {
	reverse_proxy 127.0.0.1:7880
}
EOF
    CHANGED=1
  fi
  if ! grep -q "${COMPOSITOR_DOMAIN}" "${CADDYFILE}"; then
    cat >> "${CADDYFILE}" << EOF

# RTMP collab compositor API — ${COMPOSITOR_DOMAIN}
${COMPOSITOR_DOMAIN} {
	reverse_proxy 127.0.0.1:8090
}
EOF
    CHANGED=1
  fi
  if ! grep -q "${TURN_DOMAIN}" "${CADDYFILE}"; then
    cat >> "${CADDYFILE}" << EOF

# LiveKit TURN TLS cert host — ${TURN_DOMAIN} (mobile/cellular WebRTC)
${TURN_DOMAIN} {
	respond "ok" 200
}
EOF
    CHANGED=1
  fi
  if [[ "${CHANGED}" -eq 1 ]]; then
    caddy validate --config "${CADDYFILE}"
    systemctl reload caddy
    echo "Caddy reloaded (rtc + compositor + turn)"
    curl -sf "https://${TURN_DOMAIN}/" >/dev/null 2>&1 || true
    sleep 3
  fi
fi

TURN_CERT_DIR="${RTMP_DIR}/livekit-certs"
mkdir -p "${TURN_CERT_DIR}"
TURN_TLS_BLOCK=""
if TURN_CERTS="$(find_turn_tls_certs "${TURN_DOMAIN}")"; then
  TURN_CERT_FILE="${TURN_CERTS%%:*}"
  TURN_KEY_FILE="${TURN_CERTS##*:}"
  cp "${TURN_CERT_FILE}" "${TURN_CERT_DIR}/fullchain.pem"
  cp "${TURN_KEY_FILE}" "${TURN_CERT_DIR}/privkey.pem"
  chmod 644 "${TURN_CERT_DIR}/fullchain.pem"
  chmod 600 "${TURN_CERT_DIR}/privkey.pem"
  TURN_TLS_BLOCK=$(
    cat << EOF
  tls_port: 5349
  cert_file: /etc/livekit/certs/fullchain.pem
  key_file: /etc/livekit/certs/privkey.pem
EOF
  )
  echo "TURN/TLS certs copied for ${TURN_DOMAIN}"
else
  echo "WARN: No TLS cert for ${TURN_DOMAIN} — mobile/cellular WebRTC may fail until Caddy issues one and you re-run this script"
fi

echo "--- Writing livekit.yaml ---"
cat > "${RTMP_DIR}/livekit.yaml" << EOF
port: 7880
bind_addresses:
  - ""

rtc:
  tcp_port: 7881
  port_range_start: 50000
  port_range_end: 50100
  use_external_ip: true
  node_ip: ${NODE_IP}

redis:
  address: redis:6379

keys:
  ${LIVEKIT_API_KEY}: ${LIVEKIT_API_SECRET}

room:
  auto_create: false
  empty_timeout: 300
  max_participants: 10

turn:
  enabled: true
  domain: ${TURN_DOMAIN}
  udp_port: 3478
${TURN_TLS_BLOCK}

logging:
  level: info
EOF
chmod 600 "${RTMP_DIR}/livekit.yaml"

echo "--- Writing egress.yaml ---"
cat > "${RTMP_DIR}/egress.yaml" << EOF
log_level: info
api_key: ${LIVEKIT_API_KEY}
api_secret: ${LIVEKIT_API_SECRET}
ws_url: ws://livekit:7880
insecure: true

redis:
  address: redis:6379
EOF
# Egress container runs as non-root; 600 (root-only) causes "permission denied" on mount.
chmod 644 "${RTMP_DIR}/egress.yaml"

echo "--- Starting stack (MediaMTX + compositor + LiveKit + egress) ---"
cd "${RTMP_DIR}"
docker compose -f docker-compose.production.yml --env-file "${ENV_FILE}" up -d --build
sleep 5

echo "--- Health checks ---"
curl -sf "http://127.0.0.1:8090/health" && echo " compositor OK" || echo "WARN: compositor not ready"
curl -sf "http://127.0.0.1:7880" >/dev/null && echo "livekit HTTP OK" || echo "WARN: livekit :7880 not responding"

if [[ -f "${CADDYFILE}" ]]; then
  if grep -q "${RTC_DOMAIN}" "${CADDYFILE}"; then
    echo "Caddy already configured for LiveKit/compositor/turn"
  fi
else
  echo "No ${CADDYFILE} — add rtc + turn blocks manually (see docs/COLLAB-LIVEKIT.md)"
fi

echo ""
echo "=== Firewall (run if ufw enabled) ==="
echo "  ufw allow 1935/tcp"
echo "  ufw allow 7881/tcp"
echo "  ufw allow 3478/udp"
echo "  ufw allow 5349/tcp"
echo "  ufw allow 50000:50100/udp"
echo ""

echo "=== Done ==="
echo ""
echo "DNS (Cloudflare grey cloud / DNS only):"
echo "  ${RTC_DOMAIN}           →  ${NODE_IP:-YOUR_VPS_IP}"
echo "  ${TURN_DOMAIN}          →  ${NODE_IP:-YOUR_VPS_IP}"
echo "  ${COMPOSITOR_DOMAIN}    →  ${NODE_IP:-YOUR_VPS_IP}"
echo ""
echo "Vercel → Production env:"
echo "  LIVEKIT_URL=wss://${RTC_DOMAIN}"
echo "  LIVEKIT_API_KEY=${LIVEKIT_API_KEY}"
echo "  LIVEKIT_API_SECRET=${LIVEKIT_API_SECRET}"
echo "  LIVEKIT_EGRESS_RTMP_URL=rtmp://mediamtx:1935/live"
echo "  COLLAB_WEBRTC_ENABLED=true"
echo "  COMPOSITOR_ENABLED=true"
echo "  COMPOSITOR_CONTROL_URL=https://${COMPOSITOR_DOMAIN}"
echo "  COMPOSITOR_SECRET=${COMPOSITOR_SECRET:-$(grep '^COMPOSITOR_SECRET=' "${ENV_FILE}" | cut -d= -f2-)}"
echo ""
echo "Test (after DNS + Caddy):"
echo "  curl -s https://${RTC_DOMAIN}/"
echo "  docker logs livebooth-livekit --tail 20"
echo "  docker logs livebooth-egress --tail 20"
echo ""
echo "Note: 2GB VPS is OK for testing; use 4GB+ for LiveKit egress + RTMP collab in production."
