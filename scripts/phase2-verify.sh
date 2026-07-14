#!/usr/bin/env bash
# Phase 2 production readiness checks (safe — no secrets printed).
# Usage:
#   npm run phase2:verify
#   CRON_SECRET=... npm run phase2:verify   # also tests membership billing cron
set -euo pipefail

BASE="${SMOKE_BASE_URL:-https://livebooth.uk}"
RECORDINGS="${RECORDINGS_PUBLIC_URL:-https://hls.livebooth.uk/recordings}"
RTMP_HOST="${RTMP_HOST:-rtmp.livebooth.uk}"

pass() { echo "✓ $1"; }
warn() { echo "⚠ $1"; }
fail() { echo "✗ $1"; FAILED=1; }

FAILED=0

echo ""
echo "LiveBooth Phase 2 verify — $BASE"
echo ""

# App health
code=$(curl -sS -o /dev/null -w "%{http_code}" "$BASE/api/health" || echo "000")
if [[ "$code" == "200" ]]; then pass "App health ($code)"; else fail "App health ($code)"; fi

# Cron configured (401 = secret set; 503 = CRON_SECRET missing on Vercel)
cron_code=$(curl -sS -o /dev/null -w "%{http_code}" "$BASE/api/cron/membership-billing" || echo "000")
if [[ "$cron_code" == "401" ]]; then
  pass "Membership cron endpoint protected ($cron_code — CRON_SECRET is set)"
elif [[ "$cron_code" == "503" ]]; then
  fail "CRON_SECRET not set on Vercel (cron returned 503)"
else
  warn "Membership cron unexpected status: $cron_code"
fi

if [[ -n "${CRON_SECRET:-}" ]]; then
  cron_body=$(curl -sS -H "Authorization: Bearer $CRON_SECRET" "$BASE/api/cron/membership-billing" || true)
  if echo "$cron_body" | grep -q '"ok":true'; then
    pass "Membership cron auth OK"
  else
    fail "Membership cron auth failed — check CRON_SECRET matches Vercel"
  fi
else
  warn "Set CRON_SECRET in env to test cron auth (vercel env pull .env.vercel.production --environment=production)"
fi

# Platform status
status=$(curl -sS "$BASE/api/platform/status" 2>/dev/null || echo "{}")
if echo "$status" | grep -q '"maintenanceMode":false'; then
  pass "Not in maintenance mode"
else
  warn "Maintenance mode may be on — check /admin settings"
fi

# Recordings CDN
rec_code=$(curl -sS -o /dev/null -w "%{http_code}" "$RECORDINGS/" || echo "000")
if [[ "$rec_code" == "200" ]]; then
  pass "Recordings CDN reachable ($RECORDINGS)"
else
  fail "Recordings CDN ($RECORDINGS) returned $rec_code"
fi

# HLS host
hls_base="${HLS_SERVER_URL:-https://hls.livebooth.uk}"
hls_code=$(curl -sS -o /dev/null -w "%{http_code}" "$hls_base/" || echo "000")
if [[ "$hls_code" == "200" ]]; then pass "HLS host reachable ($hls_base)"; else warn "HLS host returned $hls_code"; fi

# RTMP DNS
if command -v dig >/dev/null 2>&1; then
  droplet_ip=$(dig +short "$RTMP_HOST" A | head -1)
  if [[ -n "$droplet_ip" ]]; then
    pass "RTMP DNS $RTMP_HOST → $droplet_ip"
  else
    fail "No A record for $RTMP_HOST"
  fi
fi

echo ""
echo "--- Vercel env (run locally) ---"
echo "  npx vercel env ls production"
echo "  Required: CRON_SECRET, DIRECT_URL, DATABASE_URL, NEXT_PUBLIC_BETA_MODE=true"
echo "  Required: RECORDINGS_PUBLIC_URL, RTMP_SERVER_URL, HLS_SERVER_URL, RTMP_AUTH_ENABLED=true"
echo ""
echo "--- After changing Vercel env ---"
echo "  npx vercel --prod   # or push to main for auto-deploy"
echo ""

if [[ "$FAILED" -eq 0 ]]; then
  echo "✅ Phase 2 public checks passed."
  exit 0
fi
echo "❌ Some checks failed — fix above before beta traffic."
exit 1
