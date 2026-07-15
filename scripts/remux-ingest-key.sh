#!/bin/bash
# Remux one ingest folder on the VPS. Prefer: curl …/vps-install-remux.sh | bash -s -- INGEST_KEY
set -euo pipefail

INGEST_KEY="${1:-}"
if [[ -z "$INGEST_KEY" ]]; then
  echo "Usage: $0 <ingest_key>" >&2
  echo "Or: curl -fsSL https://raw.githubusercontent.com/NickGrant89/livebooth/main/scripts/vps-install-remux.sh | bash -s -- INGEST_KEY" >&2
  exit 1
fi

curl -fsSL "${LIVEBOOTH_RAW:-https://raw.githubusercontent.com/NickGrant89/livebooth/main}/scripts/vps-install-remux.sh" | bash -s -- "$INGEST_KEY"
