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
EOF

echo "--- Testing auth callback from host ---"
curl -sf -X POST "${APP_URL}/api/rtmp/auth" \
  -H "Content-Type: application/json" \
  -d '{"action":"publish","path":"live/lb_test","protocol":"rtmp"}' \
  && echo "auth reachable (403 expected for fake key)" || echo "AUTH UNREACHABLE FROM SERVER"

cd "${RTMP_DIR}"
docker compose -f docker-compose.production.yml up -d --force-recreate
sleep 2
docker compose -f docker-compose.production.yml logs --tail 15

echo "--- Active paths (should show publisher while OBS is live) ---"
curl -s http://127.0.0.1:9997/v3/paths/list
echo ""
echo "Done. OBS (Option A):"
echo "  Server:      rtmp://$(curl -s ifconfig.me)/live"
echo "  Stream key:  YOUR_lb_KEY from Go Live"
