#!/bin/bash
# Quick VPS check — WebRTC media ports + TURN/TLS (run ON the droplet as root).
set -euo pipefail

echo "=== LiveKit media path check ==="
echo "Public IP: $(curl -sf ifconfig.me 2>/dev/null || echo unknown)"
echo

echo "--- Docker ---"
docker ps --format 'table {{.Names}}\t{{.Status}}' | grep -E 'livekit|NAMES' || true
echo

echo "--- Listening ports (7880 signal, 7881 rtc tcp, 3478 turn udp, 5349 turn tls) ---"
ss -tulnp 2>/dev/null | grep -E ':7880|:7881|:3478|:5349' || netstat -tulnp 2>/dev/null | grep -E ':7880|:7881|:3478|:5349' || echo "install ss/netstat to inspect ports"
echo

echo "--- UFW ---"
ufw status 2>/dev/null | grep -E '7881|3478|5349|50000:50100' || echo "ufw not active or rules missing"
echo

echo "--- livekit.yaml turn block ---"
grep -A6 '^turn:' /opt/livebooth/rtmp-server/livekit.yaml 2>/dev/null || echo "livekit.yaml not found"
echo

echo "--- HTTPS ---"
curl -sf "https://rtc.livebooth.uk/" >/dev/null && echo "rtc.livebooth.uk OK" || echo "rtc.livebooth.uk FAIL"
curl -sf "https://turn.livebooth.uk/" >/dev/null && echo "turn.livebooth.uk OK" || echo "turn.livebooth.uk FAIL (cert host for TURN/TLS)"
echo

echo "Required firewall (if missing, run on VPS):"
echo "  ufw allow 7881/tcp"
echo "  ufw allow 3478/udp"
echo "  ufw allow 5349/tcp"
echo "  ufw allow 50000:50100/udp"
