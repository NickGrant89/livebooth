#!/bin/bash
# Install ffmpeg + remux watcher on the VPS. Delegates to vps-install-remux.sh.
# Run on the droplet as root:
#   curl -fsSL https://raw.githubusercontent.com/NickGrant89/livebooth/main/scripts/setup-recording-remux.sh | bash
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/livebooth/app}"
SCRIPT="${APP_DIR}/scripts/vps-install-remux.sh"

if [[ -f "$SCRIPT" ]]; then
  exec bash "$SCRIPT" "$@"
fi

curl -fsSL "${LIVEBOOTH_RAW:-https://raw.githubusercontent.com/NickGrant89/livebooth/main}/scripts/vps-install-remux.sh" | bash -s -- "$@"
