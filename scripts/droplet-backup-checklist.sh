#!/usr/bin/env bash
# Droplet snapshot + recording archive checklist (RTMP VPS).
# Usage: npm run droplet:checklist
# Optional SSH verify: DROPLET_SSH=root@46.101.2.57 npm run droplet:checklist
set -euo pipefail

DROPLET_IP="${DROPLET_IP:-$(dig +short hls.livebooth.uk A 2>/dev/null | head -1)}"
RECORDINGS_PATH="${RECORDINGS_PATH:-/opt/livebooth/rtmp-server/recordings}"

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "  LiveBooth droplet backup checklist"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "Droplet IP (from hls.livebooth.uk DNS): ${DROPLET_IP:-unknown}"
echo "Recordings path on VPS: $RECORDINGS_PATH"
echo ""

echo "── 1. Create snapshot (DigitalOcean dashboard) ──"
echo ""
echo "  1. Log in: https://cloud.digitalocean.com/droplets"
echo "  2. Select your RTMP droplet (${DROPLET_IP:-IP})"
echo "  3. Power → Snapshots → Take snapshot"
echo "  4. Name: livebooth-rtmp-\$(date +%Y%m%d)  (e.g. before deploy / weekly)"
echo "  5. Wait until status = 'available' (~5–15 min)"
echo ""
echo "  Tip: schedule weekly snapshots in DO → Droplet → Backups (+\$1.20/mo on \$12 plan)"
echo ""

echo "── 2. Neon database backup ──"
echo ""
echo "  1. https://console.neon.tech → your project"
echo "  2. Branches → Create branch (instant snapshot before risky migrations)"
echo "  3. Enable Point-in-Time Recovery on paid tier if available"
echo ""

echo "── 3. Verify recordings on VPS (SSH) ──"
echo ""
echo "  ssh root@${DROPLET_IP:-YOUR_DROPLET_IP}"
echo "  ls -la $RECORDINGS_PATH/live/ | head"
echo "  du -sh $RECORDINGS_PATH"
echo "  systemctl status caddy --no-pager"
echo "  systemctl status mediamtx --no-pager  # or docker ps if containerized"
echo ""

echo "── 4. Public URL checks (no SSH) ──"
echo ""
RECORDINGS_URL="${RECORDINGS_PUBLIC_URL:-https://hls.livebooth.uk/recordings}"
code=$(curl -sS -o /dev/null -w "%{http_code}" "$RECORDINGS_URL/" 2>/dev/null || echo "000")
if [[ "$code" == "200" ]]; then
  echo "  ✓ $RECORDINGS_URL → HTTP $code"
else
  echo "  ✗ $RECORDINGS_URL → HTTP $code (check Caddy + fix-caddy-recordings.sh)"
fi
echo ""

if [[ -n "${DROPLET_SSH:-}" ]]; then
  echo "── 5. Remote checks via DROPLET_SSH=$DROPLET_SSH ──"
  ssh -o ConnectTimeout=10 -o BatchMode=yes "$DROPLET_SSH" bash -s <<REMOTE
set -e
echo "  Host: \$(hostname)"
if [[ -d "$RECORDINGS_PATH" ]]; then
  count=\$(find "$RECORDINGS_PATH/live" -mindepth 1 -maxdepth 1 -type d 2>/dev/null | wc -l | tr -d ' ')
  size=\$(du -sh "$RECORDINGS_PATH" 2>/dev/null | cut -f1)
  echo "  ✓ Recordings dir exists — \$count stream folders, \$size total"
else
  echo "  ✗ Missing $RECORDINGS_PATH"
fi
command -v caddy >/dev/null && caddy version | head -1 || echo "  ⚠ caddy not in PATH"
REMOTE
  echo ""
fi

echo "── Do NOT during beta ──"
echo "  • Delete $RECORDINGS_PATH"
echo "  • Rebuild droplet without snapshot"
echo "  • Change RECORDINGS_PUBLIC_URL on Vercel without migrating files"
echo ""
echo "Done. Snapshot the droplet now if you haven't this week."
echo ""
