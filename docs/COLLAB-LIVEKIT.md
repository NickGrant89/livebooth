# LiveKit WebRTC collab (self-hosted on VPS)

Low-latency B2B collab uses **LiveKit** on the same London VPS as RTMP/MediaMTX. RTMP collab (FFmpeg compositor) remains the default until `COLLAB_WEBRTC_ENABLED=true`.

## Architecture

```
Host browser/OBS WHIP ──┐
                          ├──► LiveKit room (rtc.livebooth.uk)
Partner browser/OBS ────┘           │
                                    │ composite egress
                                    ▼
                            MediaMTX lb_*_mix ──► HLS ──► fans
```

Solo DJ sets still use **RTMP → MediaMTX → HLS** unchanged.

## VPS setup (London droplet)

### 1. Deploy from your Mac

```bash
cd /Users/Nick/Projects/NickStreaming
DROPLET=root@46.101.2.57 bash scripts/deploy-livekit-to-droplet.sh
```

Or on the VPS after copying files:

```bash
bash /opt/livebooth/setup-livekit-droplet.sh
```

This starts:

| Container | Purpose |
|-----------|---------|
| `livebooth-rtmp` | MediaMTX RTMP/HLS |
| `livebooth-compositor` | RTMP B2B FFmpeg mix (fallback) |
| `livebooth-redis` | LiveKit + egress coordination |
| `livebooth-livekit` | WebRTC SFU |
| `livebooth-egress` | Room composite → RTMP/HLS |

### 2. DNS (Cloudflare **grey cloud** / DNS only)

| Host | Points to |
|------|-----------|
| `rtc.livebooth.uk` | VPS IP |
| `turn.livebooth.uk` | VPS IP |
| `compositor.livebooth.uk` | VPS IP |
| `hls.livebooth.uk` | VPS IP (existing) |

### 3. Firewall (UFW)

```bash
ufw allow 1935/tcp
ufw allow 443/tcp
ufw allow 80/tcp
ufw allow 7881/tcp
ufw allow 3478/udp
ufw allow 50000:50100/udp
```

### 4. Verify on VPS

```bash
curl -s http://127.0.0.1:7880 && echo " livekit OK"
curl -s http://127.0.0.1:8090/health
curl -s https://rtc.livebooth.uk/
docker ps
docker logs livebooth-livekit --tail 30
docker logs livebooth-egress --tail 30
```

Secrets live in `/opt/livebooth/rtmp-server/.env`:

```bash
grep LIVEKIT /opt/livebooth/rtmp-server/.env
```

## Vercel env (Production)

| Variable | Example |
|----------|---------|
| `LIVEKIT_URL` | `wss://rtc.livebooth.uk` |
| `LIVEKIT_API_KEY` | from VPS `.env` |
| `LIVEKIT_API_SECRET` | from VPS `.env` |
| `COLLAB_WEBRTC_ENABLED` | `true` when ready to switch collab mode |
| `COMPOSITOR_ENABLED` | `true` (RTMP fallback) |
| `COMPOSITOR_CONTROL_URL` | `https://compositor.livebooth.uk` |
| `COMPOSITOR_SECRET` | from VPS `.env` |

Redeploy after changing env.

## Hardware notes

| VPS | Recommendation |
|-----|----------------|
| 1 vCPU / 2GB | RTMP + compositor OK; LiveKit test only |
| 4 vCPU / 8GB | LiveKit + egress + RTMP production collab |

Egress uses headless Chrome — spikes RAM when compositing.

## App integration status

| Piece | Status |
|-------|--------|
| VPS LiveKit + egress | **Ready** (this doc) |
| `src/lib/livekit.ts` | Room tokens |
| `/api/livekit/token` | Collab join token (auth required) |
| `/collab` WebRTC UI | **Next** — browser publish + OBS WHIP |
| Egress → `lb_*_mix` | **Next** — start composite on both joined |

Until UI ships, keep `COLLAB_WEBRTC_ENABLED` unset and use RTMP collab (working today).

## Troubleshooting

**LiveKit won't start**

```bash
docker logs livebooth-livekit --tail 50
cat /opt/livebooth/rtmp-server/livekit.yaml
```

Check `node_ip` matches VPS public IP.

**Egress idle / errors**

```bash
docker logs livebooth-egress --tail 50
```

Ensure redis + livekit are healthy: `docker compose -f docker-compose.production.yml ps`

**WebRTC connects but no media**

- Open UDP `50000-50100` and `3478`
- Confirm `turn.livebooth.uk` DNS
- Test from mobile network (NAT) not same Wi‑Fi only

## Related

- [COLLAB-COMPOSITOR.md](./COLLAB-COMPOSITOR.md) — RTMP FFmpeg mix (current default)
- [RTMP-VPS-DEPLOY.md](./RTMP-VPS-DEPLOY.md) — full VPS guide
