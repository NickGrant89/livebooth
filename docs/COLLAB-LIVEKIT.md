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
| `LIVEKIT_EGRESS_RTMP_URL` | `rtmp://mediamtx:1935/live` (egress → MediaMTX on Docker network) |
| `COLLAB_WEBRTC_ENABLED` | `true` when ready to enable WebRTC studio on `/collab` |
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
| VPS LiveKit + egress | Deploy + fix egress health (see below) |
| `src/lib/livekit.ts` | Room tokens |
| `/api/livekit/token` | Collab join token (auth required) |
| `/collab` WebRTC studio | **Browser UI** — host + partner join LiveKit room |
| `/api/collab/webrtc` | Poll status + start room composite egress |
| Egress → `lb_*_mix` | Auto-starts when both DJs publish camera |

### WebRTC collab flow (after deploy)

1. Host goes live and accepts partner on **`/collab`** (same as RTMP collab).
2. Both click **Open WebRTC studio** — browser camera/mic into LiveKit room.
3. When both publish video, the app starts **room composite egress** → `rtmp://mediamtx:1935/live/lb_{hostKey}_mix`.
4. Fans watch **`/stream/{hostUsername}`** — same auto-switch to synced mix as RTMP compositor.

RTMP/OBS remains available under **OBS / Larix RTMP (legacy)** on the partner panel.

Until `COLLAB_WEBRTC_ENABLED=true` on Vercel, the studio UI stays hidden and RTMP collab remains default.

## Troubleshooting

**LiveKit won't start**

```bash
docker logs livebooth-livekit --tail 50
cat /opt/livebooth/rtmp-server/livekit.yaml
```

Check `node_ip` matches VPS public IP.

**Egress restart loop (`livebooth-egress` Restarting)**

```bash
docker logs livebooth-egress --tail 80
```

**`open /etc/egress.yaml: permission denied`** — setup wrote `egress.yaml` as mode `600`; the egress container runs non-root and cannot read it. On the VPS:

```bash
chmod 644 /opt/livebooth/rtmp-server/egress.yaml
docker compose -f docker-compose.production.yml --env-file .env up -d egress --force-recreate
docker logs livebooth-egress --tail 20
```

You should see egress connect to LiveKit/redis, not permission errors.

**OOM / `/dev/shm` errors** — egress uses headless Chrome. On **2GB VPS**, bump compose `shm_size: 1gb`, add swap, or resize to **4GB+** for production.

**WebRTC connects but no media**

- Open UDP `50000-50100` and `3478` and TCP `5349` (TURN/TLS for mobile/cellular)
- Confirm `turn.livebooth.uk` DNS (grey cloud, not proxied)
- Mobile **must use Safari or Chrome** — in-app browsers (Instagram, Discord) break WebRTC
- Log in on the phone as the **partner account**, then `/collab` → Open WebRTC studio
- Run `bash /opt/livebooth/setup-livekit-droplet.sh` after deploy to enable TURN/TLS certs

**Phone joins studio but camera fails**

- iOS: Settings → Safari → Camera/Microphone → Allow for livebooth.uk
- Android: site permissions in Chrome → Camera + Mic Allow
- Use **front camera** — some phones default to no device until you pick one in the Camera menu

## Related

- [COLLAB-COMPOSITOR.md](./COLLAB-COMPOSITOR.md) — RTMP FFmpeg mix (current default)
- [RTMP-VPS-DEPLOY.md](./RTMP-VPS-DEPLOY.md) — full VPS guide
