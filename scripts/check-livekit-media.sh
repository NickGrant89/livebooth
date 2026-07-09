#!/bin/bash
# Quick VPS check — WebRTC media ports + TURN/TLS (run ON the droplet as root).
set -euo pipefail

PUBLIC_IP="$(curl -sf ifconfig.me 2>/dev/null || echo unknown)"
CPU_COUNT="$(nproc 2>/dev/null || echo 1)"

echo "=== LiveKit media path check ==="
echo "Public IP: ${PUBLIC_IP}"
echo "CPU cores: ${CPU_COUNT} (1 vCPU needs udp_port mux on 7882 — not a port range)"
echo

echo "--- Docker ---"
docker ps --format 'table {{.Names}}\t{{.Status}}' | grep -E 'livekit|NAMES' || true
echo

echo "--- Listening ports (7880 signal, 7881 rtc tcp, 7882 udp mux, 3478 turn, 5349 turn tls) ---"
ss -tulnp 2>/dev/null | grep -E ':7880|:7881|:7882|:3478|:5349' || netstat -tulnp 2>/dev/null | grep -E ':7880|:7881|:7882|:3478|:5349' || echo "install ss/netstat to inspect ports"
echo

echo "--- livekit.yaml rtc + node_ip ---"
if [[ -f /opt/livebooth/rtmp-server/livekit.yaml ]]; then
  grep -E 'node_ip|udp_port|port_range|allow_tcp' /opt/livebooth/rtmp-server/livekit.yaml || true
  NODE_IP="$(grep 'node_ip:' /opt/livebooth/rtmp-server/livekit.yaml | awk '{print $2}')"
  if [[ -n "${NODE_IP}" && "${NODE_IP}" != "${PUBLIC_IP}" ]]; then
    echo "WARN: node_ip (${NODE_IP}) != public IP (${PUBLIC_IP}) — WebRTC ICE will fail"
  fi
  if grep -q 'port_range_start' /opt/livebooth/rtmp-server/livekit.yaml && [[ "${CPU_COUNT}" -le 1 ]]; then
    echo "WARN: port_range on ${CPU_COUNT} vCPU — use udp_port: 7882 instead (re-run setup-livekit-droplet.sh)"
  fi
else
  echo "livekit.yaml not found"
fi
echo

echo "--- UFW ---"
ufw status 2>/dev/null | grep -E '7881|7882|3478|5349' || echo "ufw not active or rules missing"
echo

echo "--- livekit.yaml turn block ---"
grep -A6 '^turn:' /opt/livebooth/rtmp-server/livekit.yaml 2>/dev/null || echo "livekit.yaml not found"
echo

echo "--- HTTPS ---"
curl -sf "https://rtc.livebooth.uk/" >/dev/null && echo "rtc.livebooth.uk OK" || echo "rtc.livebooth.uk FAIL"
curl -sf "https://turn.livebooth.uk/" >/dev/null && echo "turn.livebooth.uk OK" || echo "turn.livebooth.uk FAIL (cert host for TURN/TLS)"
echo

echo "Required DigitalOcean Cloud Firewall INBOUND:"
echo "  TCP 7881, TCP 5349, UDP 7882, UDP 3478, TCP 22, TCP 443, TCP 80"
