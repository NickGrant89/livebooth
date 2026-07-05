# Collab compositor (server-side B2B mix)

When two DJs collab and both publish RTMP, the **compositor** on the VPS reads both feeds, overlays partner video (PiP), mixes audio, and publishes a single HLS output. Fans see one synced stream on the host booth.

## Architecture

```
Host OBS  ──► MediaMTX live/lb_host
Partner OBS ──► MediaMTX live/lb_partner
                    │
              compositor (FFmpeg)
                    │
              MediaMTX live/lb_host_mix
                    │
              Fans → /stream/{host}
```

## VPS setup

1. On the RTMP droplet, set in `rtmp-server/.env`:

```bash
COMPOSITOR_SECRET=your-long-random-secret
```

Or run the automated setup (generates secret + Caddy + docker):

```bash
# From your Mac:
DROPLET=root@YOUR_VPS_IP bash scripts/deploy-compositor-to-droplet.sh

# Or on the VPS after copying files:
bash /opt/livebooth/setup-compositor-droplet.sh
```

2. Rebuild and start:

```bash
cd rtmp-server
docker compose -f docker-compose.production.yml --env-file .env up -d --build
```

3. Expose compositor control API to Vercel (Caddy — included in `Caddyfile.example`):

```
compositor.livebooth.uk {
  reverse_proxy 127.0.0.1:8090
}
```

DNS: `compositor.livebooth.uk` → VPS IP (grey cloud / DNS only).

4. On **Vercel** (production env):

```
COMPOSITOR_ENABLED=true
COMPOSITOR_CONTROL_URL=https://compositor.livebooth.uk
COMPOSITOR_SECRET=same-secret-as-vps
```

5. Run DB migration:

```bash
npx prisma migrate deploy
```

## Activation

Compositor starts automatically when **both** host and partner streams are `live`:

- Host publishes → `POST /api/streams/go-live/publish`
- Partner publishes → `PUT /api/collab`

Manual retry: `POST /api/collab/compositor` with `{ "collabId": "…" }`.

If compositor fails, viewers fall back to dual-player PiP (legacy mode).

## OBS requirements

- Both DJs stream to their own RTMP keys from `/collab` or dashboard
- **Enable audio** on both streams (mic for MC, deck + mic for DJ)
- Recommended: 720p30, keyframe interval 2s, CBR

## Health

```bash
curl -H "X-Compositor-Secret: $SECRET" https://compositor.livebooth.uk/health
curl -H "X-Compositor-Secret: $SECRET" "https://compositor.livebooth.uk/status?outputKey=lb_XXX_mix"
```

## Recordings

When compositor was active, host stream VOD uses the mixed recording (`lb_*_mix`).
