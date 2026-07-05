#!/bin/bash
# Run on the DigitalOcean droplet as root:
#   bash fix-mediamtx-droplet.sh
set -euo pipefail

RTMP_DIR="/opt/livebooth/rtmp-server"
APP_URL="${LIVEBOOTH_APP_URL:-https://livebooth.uk}"
BYPASS_AUTH="${BYPASS_AUTH:-0}"

echo "=== LiveBooth MediaMTX fix ==="
if [[ "${BYPASS_AUTH}" == "1" ]]; then
  echo "Auth: DISABLED (internal allow-all — test only)"
else
  echo "Auth callback: ${APP_URL}/api/rtmp/auth"
fi

if [[ "${BYPASS_AUTH}" == "1" ]]; then
  cat > "${RTMP_DIR}/mediamtx.production.yml" << 'EOF'
logLevel: info
readTimeout: 30s
writeTimeout: 30s

rtmp: yes
rtmpAddress: :1935

hls: yes
hlsAddress: :8888
hlsAlwaysRemux: yes
hlsAllowOrigins: ['*']

api: yes
apiAddress: :9997

authMethod: internal
authInternalUsers:
  - user: any
    pass:
    ips: []
    permissions:
      - action: publish
      - action: read
      - action: playback

pathDefaults:
  record: yes
  recordFormat: fmp4
  recordPath: /recordings/%path/%Y-%m-%d_%H-%M-%S-%f

paths:
  all_others:
    source: publisher
EOF
else
  cat > "${RTMP_DIR}/mediamtx.production.yml" << EOF
logLevel: info
readTimeout: 30s
writeTimeout: 30s

rtmp: yes
rtmpAddress: :1935

hls: yes
hlsAddress: :8888
hlsAlwaysRemux: yes
hlsAllowOrigins: ['*']

api: yes
apiAddress: :9997

authMethod: http
authHTTPAddress: ${APP_URL}/api/rtmp/auth
authHTTPExclude:
  - action: api
  - action: metrics
  - action: pprof
  - action: read
  - action: playback

pathDefaults:
  record: yes
  recordFormat: fmp4
  recordPath: /recordings/%path/%Y-%m-%d_%H-%M-%S-%f

paths:
  all_others:
    source: publisher
EOF
fi

cat > "${RTMP_DIR}/docker-compose.production.yml" << 'EOF'
services:
  mediamtx:
    image: bluenviron/mediamtx:1
    container_name: livebooth-rtmp
    restart: unless-stopped
    volumes:
      - ./recordings:/recordings
      - ./mediamtx.production.yml:/mediamtx.yml:ro
      # Required: image has no CA certs; without this HTTPS auth to livebooth.uk fails with
      # "x509: certificate signed by unknown authority"
      - /etc/ssl/certs:/etc/ssl/certs:ro
    environment:
      SSL_CERT_FILE: /etc/ssl/certs/ca-certificates.crt
    ports:
      - "1935:1935"
      - "127.0.0.1:8888:8888"
      - "127.0.0.1:9997:9997"
    command: /mediamtx.yml

  compositor:
    build: ./compositor
    container_name: livebooth-compositor
    restart: unless-stopped
    environment:
      COMPOSITOR_SECRET: ${COMPOSITOR_SECRET:-}
      MEDIAMTX_RTMP_URL: rtmp://mediamtx:1935/live
      MEDIAMTX_API_URL: http://mediamtx:9997
      COMPOSITOR_PORT: 8090
    ports:
      - "127.0.0.1:8090:8090"
    depends_on:
      - mediamtx
EOF

echo "--- Optional: collab compositor (.env + compositor/ required) ---"
if [[ -d "${RTMP_DIR}/compositor" ]]; then
  ENV_FILE="${RTMP_DIR}/.env"
  if [[ ! -f "${ENV_FILE}" ]] || ! grep -q '^COMPOSITOR_SECRET=' "${ENV_FILE}" 2>/dev/null; then
    echo "COMPOSITOR_SECRET=$(openssl rand -hex 32)" >> "${ENV_FILE}"
    echo "Created COMPOSITOR_SECRET in ${ENV_FILE}"
  fi
  echo "Run: bash /opt/livebooth/setup-compositor-droplet.sh for Caddy + Vercel instructions"
else
  echo "Skip compositor — copy rtmp-server/compositor/ then run setup-compositor-droplet.sh"
fi

echo "--- Testing auth callback from host ---"
curl -sf -X POST "${APP_URL}/api/rtmp/auth" \
  -H "Content-Type: application/json" \
  -d '{"action":"publish","path":"live/lb_test","protocol":"rtmp"}' \
  && echo "auth reachable (403 expected for fake key)" || echo "AUTH UNREACHABLE FROM SERVER"

cd "${RTMP_DIR}"
if [[ -f "${RTMP_DIR}/.env" ]] && [[ -d "${RTMP_DIR}/compositor" ]]; then
  docker compose -f docker-compose.production.yml --env-file "${RTMP_DIR}/.env" up -d --build --force-recreate
else
  docker compose -f docker-compose.production.yml up -d --force-recreate
fi
sleep 2
docker compose -f docker-compose.production.yml logs --tail 15

echo "--- Active paths (should show publisher while OBS is live) ---"
curl -s http://127.0.0.1:9997/v3/paths/list
echo ""
echo "Done. OBS (Option A):"
echo "  Server:      rtmp://$(curl -s ifconfig.me)/live"
echo "  Stream key:  YOUR_lb_KEY from Go Live"
echo ""
echo "Archive replays: run scripts/setup-recording-remux.sh once (remuxes fmp4 → browser MP4)"
