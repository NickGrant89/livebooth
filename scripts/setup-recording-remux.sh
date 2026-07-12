#!/bin/bash
# Install ffmpeg + a watcher that remuxes new MediaMTX recordings for browser playback.
# Run on the droplet as root.
set -euo pipefail

RTMP_DIR="/opt/livebooth/rtmp-server"
APP_DIR="${APP_DIR:-/opt/livebooth/app}"
SCRIPT_SRC=""
for candidate in "${APP_DIR}/scripts/remux-recording.sh" "${RTMP_DIR}/scripts/remux-recording.sh"; do
  if [[ -f "$candidate" ]]; then
    SCRIPT_SRC="$candidate"
    break
  fi
done
SCRIPT_DST="/usr/local/bin/livebooth-remux-recording.sh"
SERVICE="/etc/systemd/system/livebooth-remux.service"

echo "=== LiveBooth recording remux setup ==="

apt-get update -qq
apt-get install -y ffmpeg

if [[ -z "$SCRIPT_SRC" ]]; then
  echo "Missing remux-recording.sh — git pull app repo to ${APP_DIR} first."
  exit 1
fi
cp "$SCRIPT_SRC" "$SCRIPT_DST"
chmod +x "$SCRIPT_DST"

cat > "$SERVICE" << EOF
[Unit]
Description=LiveBooth recording remux watcher
After=network.target docker.service

[Service]
Type=simple
Restart=always
RestartSec=10
ExecStart=/bin/bash -c 'while true; do find ${RTMP_DIR}/recordings -type f \\( -name "*.mp4" -o -name "*.fmp4" \\) ! -name "*.remuxing*" ! -name "*.remuxed" -mmin +3 -print0 | while IFS= read -r -d "" f; do REMUX_IDLE_SEC=180 ${SCRIPT_DST} "\$f" || true; done; sleep 30; done'

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable --now livebooth-remux.service

echo "--- Remuxing existing recordings ---"
find "${RTMP_DIR}/recordings" -type f \( -name '*.mp4' -o -name '*.fmp4' \) ! -name '*.remuxing*' -mmin +3 | while read -r f; do
  "$SCRIPT_DST" "$f" || true
done

echo "Done. livebooth-remux.service is running."
