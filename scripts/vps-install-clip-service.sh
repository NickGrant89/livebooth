#!/usr/bin/env bash
# Build and start clip-service on the LiveBooth VPS (ffmpeg MP4 social clips).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
COMPOSE="${ROOT}/rtmp-server/docker-compose.production.yml"
ENV_FILE="${ROOT}/rtmp-server/.env"

if [[ ! -f "$COMPOSE" ]]; then
  echo "Missing $COMPOSE" >&2
  exit 1
fi

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Create $ENV_FILE with RECORDINGS_CLIP_SECRET (same value as Vercel RECORDINGS_CLIP_SECRET)." >&2
  exit 1
fi

if ! grep -q '^RECORDINGS_CLIP_SECRET=' "$ENV_FILE" 2>/dev/null; then
  echo "Add RECORDINGS_CLIP_SECRET to $ENV_FILE and set the same on Vercel as RECORDINGS_CLIP_SECRET." >&2
  exit 1
fi

echo "Building clip-service…"
docker compose -f "$COMPOSE" build clip-service
docker compose -f "$COMPOSE" up -d clip-service

echo ""
echo "Clip service: http://127.0.0.1:8093/health"
echo "Vercel: RECORDINGS_CLIP_URL=https://hls.livebooth.uk/_clip"
echo "Ensure Caddy routes /_clip/* → 127.0.0.1:8093 (see rtmp-server/Caddyfile.example)."
echo "Docs: docs/CLIPS.md"
