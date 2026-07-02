#!/bin/bash
# Install ffmpeg + a watcher that remuxes new MediaMTX recordings for browser playback.
# Run on the droplet as root.
set -euo pipefail

RTMP_DIR="/opt/livebooth/rtmp-server"
SCRIPT_SRC="${RTMP_DIR}/scripts/remux-recording.sh"
SCRIPT_DST="/usr/local/bin/livebooth-remux-recording.sh"
SERVICE="/etc/systemd/system/livebooth-remux.service"

echo "=== LiveBooth recording remux setup ==="

apt-get update -qq
apt-get install -y ffmpeg

if [[ -f "$SCRIPT_SRC" ]]; then
  cp "$SCRIPT_SRC" "$SCRIPT_DST"
else
  echo "Missing ${SCRIPT_SRC} — copy repo scripts/ to the droplet first."
  exit 1
fi
chmod +x "$SCRIPT_DST"

cat > "$SERVICE" << EOF
[Unit]
Description=LiveBooth recording remux watcher
After=network.target docker.service

[Service]
Type=simple
Restart=always
RestartSec=10
ExecStart=/bin/bash -c 'while true; do find ${RTMP_DIR}/recordings -type f -name "*.mp4" ! -name "*.remuxing*" -mmin -720 -print0 | while IFS= read -r -d "" f; do ${SCRIPT_DST} "\$f" || true; done; sleep 20; done'

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable --now livebooth-remux.service

echo "--- Remuxing existing recordings ---"
find "${RTMP_DIR}/recordings" -type f -name '*.mp4' ! -name '*.remuxing*' | while read -r f; do
  "$SCRIPT_DST" "$f" || true
done

echo "Done. livebooth-remux.service is running."
