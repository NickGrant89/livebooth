# Self-hosted RTMP on a VPS

Run **MediaMTX** on your own server for OBS ingest + HLS playback. Your **Next.js app stays on Vercel**; only streaming runs on the VPS.

```
OBS --RTMP--> VPS :1935 (MediaMTX) --HLS--> Caddy :443 --> fans on livebooth.uk
                      |
                      POST https://livebooth.uk/api/rtmp/auth  (validate stream key)
```

---

## What you need

| Item | Example |
|------|---------|
| VPS | Hetzner CX22, DigitalOcean droplet, ~€5–10/mo |
| OS | Ubuntu 22.04+ |
| Domain (recommended) | `hls.livebooth.uk` → VPS IP |
| LiveBooth app | Already on Vercel |

**Ports to open on VPS firewall:**

| Port | Purpose |
|------|---------|
| 1935/tcp | RTMP ingest (OBS) |
| 443/tcp | HTTPS HLS (Caddy) |
| 80/tcp | Caddy ACME (Let's Encrypt) |

Do **not** expose 8888 publicly — Caddy proxies to it on localhost.

---

## Step 1 — VPS setup

SSH into the server:

```bash
ssh root@YOUR_VPS_IP
```

Install Docker:

```bash
curl -fsSL https://get.docker.com | sh
```

Install Caddy:

```bash
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update && sudo apt install -y caddy
```

---

## Step 2 — Copy RTMP files to the VPS

On your Mac:

```bash
cd /Users/Nick/Projects/NickStreaming
scp -r rtmp-server root@YOUR_VPS_IP:/opt/livebooth/
```

On the VPS, edit MediaMTX config — replace the placeholder with your **Vercel/production app URL**:

```bash
nano /opt/livebooth/rtmp-server/mediamtx.production.yml
```

Change:

```yaml
authHTTPAddress: https://livebooth.uk/api/rtmp/auth
```

(or `https://your-project.vercel.app/api/rtmp/auth` until DNS is live)

---

## Step 3 — Start MediaMTX

```bash
cd /opt/livebooth/rtmp-server
docker compose -f docker-compose.production.yml up -d
docker compose -f docker-compose.production.yml logs -f   # confirm no errors
```

Test API (on VPS):

```bash
curl -s http://127.0.0.1:9997/v3/config/global/get | head
```

---

## Step 4 — HTTPS for HLS (Caddy)

Browsers on `https://livebooth.uk` **cannot** play `http://VPS:8888/...` (mixed content). You need HTTPS.

1. Point DNS: `hls.livebooth.uk` → VPS IP
2. Copy and edit Caddy config:

```bash
cp /opt/livebooth/rtmp-server/Caddyfile.example /etc/caddy/Caddyfile
nano /etc/caddy/Caddyfile   # your email + domain
sudo systemctl reload caddy
```

3. Verify HLS proxy (after a test stream):

```bash
curl -I https://hls.livebooth.uk/
```

---

## Step 5 — Vercel environment variables

In **Vercel → Settings → Environment Variables** (Production):

| Variable | Value |
|----------|--------|
| `RTMP_SERVER_URL` | `rtmp://hls.livebooth.uk:1935/live` or `rtmp://YOUR_VPS_IP:1935/live` |
| `HLS_SERVER_URL` | `https://hls.livebooth.uk` (no trailing slash) |
| `RTMP_AUTH_ENABLED` | `true` |

**Important:**

- **Do not set** `LIVEPEER_API_KEY` — if both are set, Livepeer wins and your VPS is ignored.
- **Do not set** `RTMP_SERVER_URL` to `127.0.0.1` or LAN IP.

**Redeploy** after changing env vars.

---

## Step 6 — Test end-to-end

1. Sign up / log in as **Creator** on production
2. **Go Live** → copy **stream key** (`lb_…`)
3. OBS:

| Field | Value |
|-------|--------|
| Service | Custom |
| Server | `rtmp://YOUR_VPS_IP:1935/live` (or `rtmp://hls.livebooth.uk:1935/live`) |
| Stream key | paste `lb_…` from Go Live |

4. Start streaming in OBS → open your stream page on LiveBooth
5. Video should appear after ~3–5 seconds (HLS buffer)

**Auth failing?** Go Live **first** (creates live stream in DB), then OBS. With `RTMP_AUTH_ENABLED=true`, random keys are rejected.

**Publish rejected?** On VPS: `docker compose -f docker-compose.production.yml logs -f` — check auth callback reaches Vercel.

---

## VOD recordings (optional)

MediaMTX saves `.fmp4` files on the **VPS** at `rtmp-server/recordings/live/{ingestKey}/`.

Vercel has **no disk** — `/api/vod/file/...` only works when the app and recordings are on the same machine (local dev).

For production VOD with self-hosted RTMP:

1. Enable the `stream.livebooth.uk` block in `Caddyfile.example` (static file server)
2. Recordings URL pattern: `https://stream.livebooth.uk/live/{ingestKey}/{filename}.fmp4`
3. VOD auto-link from end-stream is **not wired for VPS yet** — replays may need a manual step or Livepeer for cloud VOD

For soft launch, **live streaming is enough**; add cloud VOD later.

---

## Security checklist

- [ ] `RTMP_AUTH_ENABLED=true` on Vercel
- [ ] Port 8888 bound to `127.0.0.1` only (production compose)
- [ ] Port 9997 not exposed publicly
- [ ] Strong VPS firewall (ufw): allow 22, 80, 443, 1935 only
- [ ] SSH keys only (disable password login)

```bash
sudo ufw allow 22
sudo ufw allow 80
sudo ufw allow 443
sudo ufw allow 1935/tcp
sudo ufw enable
```

---

## Commands reference

| Where | Command |
|-------|---------|
| VPS | `docker compose -f docker-compose.production.yml up -d` |
| VPS | `docker compose -f docker-compose.production.yml logs -f` |
| VPS | `sudo systemctl reload caddy` |
| Mac | `npm run rtmp:status` (local only) |

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| OBS connects, no video on site | Check `HLS_SERVER_URL` is **https://** domain, not `http://IP:8888` |
| OBS rejected | Go Live first; check `RTMP_AUTH_ENABLED` and Vercel URL in mediamtx config |
| Black screen | Wait 5s; check OBS bitrate; `docker logs livebooth-rtmp` |
| CORS errors | `hlsAllowOrigin: '*'` is set in mediamtx — usually HTTPS URL mismatch |
| Still uses demo stream | Remove `LIVEPEER_API_KEY` from Vercel; redeploy |

---

## Cost comparison

| | Self-hosted VPS | Livepeer |
|--|-----------------|----------|
| Setup | ~1–2 hours | ~15 min |
| Monthly | ~€5–10 VPS | Pay per usage |
| Uptime | You maintain | Managed |
| VOD | Files on VPS | Webhook to cloud |

See also: [PRODUCTION-DEPLOY.md](./PRODUCTION-DEPLOY.md) · [rtmp-server/README.md](../rtmp-server/README.md)
