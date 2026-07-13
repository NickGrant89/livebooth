#!/bin/bash
# Serve archive MP4s at https://hls.livebooth.uk/recordings/ (no extra DNS needed).
# Run on the droplet as root:
#   curl -fsSL https://raw.githubusercontent.com/NickGrant89/livebooth/main/scripts/fix-caddy-recordings.sh | bash
# Or copy from repo: bash scripts/fix-caddy-recordings.sh
set -euo pipefail

CADDYFILE="/etc/caddy/Caddyfile"
RECORDINGS_ROOT="/opt/livebooth/rtmp-server/recordings"
EMAIL="${CADDY_EMAIL:-nickgrant1989@live.co.uk}"
HLS_DOMAIN="${HLS_DOMAIN:-hls.livebooth.uk}"

if [[ ! -d "${RECORDINGS_ROOT}" ]]; then
  echo "Recordings dir missing: ${RECORDINGS_ROOT}"
  exit 1
fi

echo "=== LiveBooth Caddy: recordings at https://${HLS_DOMAIN}/recordings/ ==="

cat > "${CADDYFILE}" << EOF
{
	email ${EMAIL}
}

${HLS_DOMAIN} {
	handle /recordings/* {
		uri strip_prefix /recordings
		root * ${RECORDINGS_ROOT}
		file_server browse
		header Access-Control-Allow-Origin *
		header Access-Control-Expose-Headers "Content-Length, Content-Range, Accept-Ranges"
		header Accept-Ranges bytes
		header Cache-Control "public, max-age=86400"
	}
	reverse_proxy 127.0.0.1:8888
}
EOF

systemctl reload caddy

echo "--- Verify listing (latest ingest key dir) ---"
SAMPLE="$(ls -1 "${RECORDINGS_ROOT}/live" 2>/dev/null | tail -1 || true)"
if [[ -n "${SAMPLE}" ]]; then
  curl -sfI "https://${HLS_DOMAIN}/recordings/live/${SAMPLE}/" | head -3 || true
  echo "Sample files:"
  ls -la "${RECORDINGS_ROOT}/live/${SAMPLE}/" | tail -3
else
  echo "(no recordings yet — stream once from OBS, then re-run)"
fi

echo ""
echo "Done. Set on Vercel:"
echo "  RECORDINGS_PUBLIC_URL=https://${HLS_DOMAIN}/recordings"
echo "  (Remove stream.livebooth.uk unless you add DNS for it)"
