#!/bin/bash
# Install LiveBooth recording remux + HLS VOD on the VPS (no git clone required).
#
# One-liner (fix all past + future replays):
#   curl -fsSL https://raw.githubusercontent.com/NickGrant89/livebooth/main/scripts/vps-install-remux.sh | bash
#
# Remux one ingest key immediately:
#   curl -fsSL https://raw.githubusercontent.com/NickGrant89/livebooth/main/scripts/vps-install-remux.sh | bash -s -- lb_YOUR_KEY
#
set -euo pipefail

REPO_RAW="${LIVEBOOTH_RAW:-https://raw.githubusercontent.com/NickGrant89/livebooth/main}"
RTMP_DIR="${RTMP_DIR:-/opt/livebooth/rtmp-server}"
RECORDINGS="${RTMP_DIR}/recordings"
INGEST_KEY="${1:-}"

REMUX_BIN="/usr/local/bin/livebooth-remux-recording.sh"
WATCHER_BIN="/usr/local/bin/livebooth-remux-watcher.sh"
QUEUE_BIN="/usr/local/bin/livebooth-queue-remux.sh"
SERVICE="/etc/systemd/system/livebooth-remux.service"

echo "=== LiveBooth VPS remux install ==="
echo "Recordings: ${RECORDINGS}"

if [[ ! -d "${RECORDINGS}" ]]; then
  echo "ERROR: ${RECORDINGS} not found." >&2
  echo "Expected layout: /opt/livebooth/rtmp-server/recordings (MediaMTX docker volume)." >&2
  exit 1
fi

apt-get update -qq
apt-get install -y -qq ffmpeg curl

curl -fsSL "${REPO_RAW}/scripts/remux-recording.sh" -o "${REMUX_BIN}"
curl -fsSL "${REPO_RAW}/scripts/livebooth-remux-watcher.sh" -o "${WATCHER_BIN}"
curl -fsSL "${REPO_RAW}/scripts/livebooth-queue-remux.sh" -o "${QUEUE_BIN}"
chmod +x "${REMUX_BIN}" "${WATCHER_BIN}" "${QUEUE_BIN}"

cat > "${SERVICE}" << EOF
[Unit]
Description=LiveBooth recording remux watcher (fMP4 → faststart MP4 + HLS VOD)
After=network.target docker.service

[Service]
Type=simple
Restart=always
RestartSec=15
Environment=RTMP_DIR=${RTMP_DIR}
Environment=REMUX_IDLE_SEC=180
ExecStart=${WATCHER_BIN}

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable --now livebooth-remux.service

# MediaMTX: queue remux when publisher disconnects (shared recordings volume).
MTX_CFG="${RTMP_DIR}/mediamtx.production.yml"
if [[ -f "${MTX_CFG}" ]] && ! grep -q 'runOnUnPublish' "${MTX_CFG}"; then
  echo "Adding runOnUnPublish hook to mediamtx.production.yml …"
  sed -i '/recordDeleteAfter:/a\  runOnUnPublish: sh -c '"'"'echo "$MTX_PATH $(date +%s)" >> /recordings/.remux-queue'"'"'' "${MTX_CFG}"
  if docker ps --format '{{.Names}}' | grep -q livebooth-rtmp; then
    cd "${RTMP_DIR}"
    docker compose -f docker-compose.production.yml restart mediamtx 2>/dev/null \
      || docker compose -f docker-compose.rtmp-solo.yml restart mediamtx 2>/dev/null \
      || docker restart livebooth-rtmp 2>/dev/null \
      || echo "WARN: restart mediamtx manually: cd ${RTMP_DIR} && docker compose restart mediamtx"
  fi
fi

remux_largest_in_dir() {
  local dir="$1"
  [[ -d "$dir" ]] || return 0
  local best="" best_size=0 size f
  while IFS= read -r f; do
    [[ -f "$f" ]] || continue
    size=$(stat -c %s "$f" 2>/dev/null || stat -f %z "$f")
    if (( size > best_size )); then
      best="$f"
      best_size=$size
    fi
  done < <(find "$dir" -maxdepth 1 -type f \( -name '*.mp4' -o -name '*.fmp4' \) ! -name '*.remuxing*')
  if [[ -n "$best" && ! -f "${best}.remuxed" ]]; then
    echo "Remuxing ${best} (${best_size} bytes) …"
    REMUX_FORCE=1 "${REMUX_BIN}" "$best" || echo "WARN: remux failed for ${best}" >&2
  fi
}

if [[ -n "${INGEST_KEY}" ]]; then
  remux_largest_in_dir "${RECORDINGS}/live/${INGEST_KEY}"
else
  echo "--- Remuxing existing recordings (largest file per folder) ---"
  for dir in "${RECORDINGS}/live/"*; do
    [[ -d "$dir" ]] || continue
    remux_largest_in_dir "$dir"
  done
fi

echo ""
echo "=== Done ==="
echo "  systemctl status livebooth-remux   # watcher (runs every 30s)"
echo "  tail -f /var/log/syslog | grep livebooth-remux   # logs (Debian/Ubuntu)"
echo ""
echo "After each stream ends, replays are ready ~3 min later (HLS at …/playback/index.m3u8)."
if [[ -n "${INGEST_KEY}" ]]; then
  echo "Test: curl -sI https://hls.livebooth.uk/recordings/live/${INGEST_KEY}/playback/index.m3u8"
fi
