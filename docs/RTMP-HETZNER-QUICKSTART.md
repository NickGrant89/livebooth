# Self-hosted RTMP — Hetzner quickstart

**LiveBooth on Vercel** + **MediaMTX on Hetzner** — easy signup, 20 TB bandwidth, ~€5/mo.

**Plan:** **CX23** (2 vCPU, 4 GB RAM, 40 GB NVMe) — replaces the old CX22.  
**Region:** **Falkenstein** or **Nuremberg** (Germany, ~20–30 ms to UK).

**Time:** ~30–45 minutes

---

## What you'll have when done

```
OBS → rtmp://YOUR_VPS:1935/live → MediaMTX → https://hls.livebooth.uk → fans
                                      ↓
                         https://livebooth.uk/api/rtmp/auth
```

---

## Part 1 — Create the Hetzner server

1. Sign up: [hetzner.com/cloud](https://www.hetzner.com/cloud)
2. **New Project** → **Add Server**
3. Settings:

   | Setting | Value |
   |---------|--------|
   | Location | **Falkenstein (fsn1)** or Nuremberg |
   | Image | **Ubuntu 24.04** |
   | Type | **Shared vCPU → CX23** (Cost Optimized) |
   | Networking | Public IPv4 ✅ |
   | SSH key | Add yours (recommended) |
   | Name | `livebooth-rtmp` |

4. **Create & Buy Now** (~€5.49/mo + VAT)

5. Copy the **public IPv4** from the server overview

---

## Part 2 — Firewall (Hetzner Cloud Console)

**Firewalls → Create Firewall** → attach to `livebooth-rtmp`:

| Direction | Protocol | Port | Source | Purpose |
|-----------|----------|------|--------|---------|
| In | TCP | 22 | Your IP (or 0.0.0.0/0) | SSH |
| In | TCP | 80 | 0.0.0.0/0 | Caddy / Let's Encrypt |
| In | TCP | 443 | 0.0.0.0/0 | HTTPS HLS |
| In | TCP | 1935 | 0.0.0.0/0 | RTMP (OBS) |

Apply firewall to the server.

---

## Part 3 — Install Docker + Caddy on the VPS

```bash
ssh root@YOUR_VPS_IP
```

```bash
# Docker
curl -fsSL https://get.docker.com | sh

# Caddy
apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list
apt update && apt install -y caddy
```

---

## Part 4 — Copy RTMP files from your Mac

On your Mac:

```bash
scp -r /Users/Nick/Projects/NickStreaming/rtmp-server root@YOUR_VPS_IP:/opt/livebooth/
```

On the VPS, set your LiveBooth app URL:

```bash
nano /opt/livebooth/rtmp-server/mediamtx.production.yml
```

Change to your production URL:

```yaml
authHTTPAddress: https://livebooth.uk/api/rtmp/auth
```

(or `https://your-project.vercel.app/api/rtmp/auth` until DNS is ready)

Start MediaMTX:

```bash
cd /opt/livebooth/rtmp-server
docker compose -f docker-compose.production.yml up -d
docker compose -f docker-compose.production.yml logs -f
```

You should see MediaMTX listening on `:1935` and `:8888`.

---

## Part 5 — HTTPS for HLS (required)

Browsers on `https://livebooth.uk` **block** `http://IP:8888` video.

### DNS

Add an **A record**:

```
hls.livebooth.uk  →  YOUR_VPS_IP
```

(Use your Vercel domain or any domain you control.)

### Caddy

```bash
nano /etc/caddy/Caddyfile
```

```
{
	email nickgrant1989@live.co.uk
}

hls.livebooth.uk {
	reverse_proxy 127.0.0.1:8888
}
```

```bash
systemctl reload caddy
```

Test:

```bash
curl -I https://hls.livebooth.uk/
```

---

## Part 6 — Vercel environment variables

**Remove** `LIVEPEER_API_KEY` if set (Livepeer overrides your RTMP).

In **Vercel → Settings → Environment Variables** (Production):

| Variable | Value |
|----------|--------|
| `RTMP_SERVER_URL` | `rtmp://YOUR_VPS_IP:1935/live` |
| `HLS_SERVER_URL` | `https://hls.livebooth.uk` |
| `RTMP_AUTH_ENABLED` | `true` |

**Redeploy** Vercel after saving.

---

## Part 7 — First stream test

1. Production site → log in as **Creator**
2. **Go Live** → copy stream key (`lb_…`)
3. OBS:

   | Field | Value |
   |-------|--------|
   | Service | Custom |
   | Server | `rtmp://YOUR_VPS_IP:1935/live` |
   | Stream key | paste `lb_…` |

4. **Go Live first**, then start OBS
5. Open your stream page — video in ~3–5 seconds

---

## Checklist

```
□ Hetzner CX23 created (Falkenstein)
□ Firewall: 22, 80, 443, 1935
□ mediamtx.production.yml → your livebooth URL
□ docker compose -f docker-compose.production.yml up -d
□ hls.livebooth.uk DNS → VPS IP
□ Caddy serving HTTPS → :8888
□ Vercel: RTMP_SERVER_URL, HLS_SERVER_URL, RTMP_AUTH_ENABLED=true
□ No LIVEPEER_API_KEY
□ Go Live → OBS → watch stream page
```

---

## Bandwidth

CX23 includes **20 TB/month** outbound (Germany/Finland). Soft launch with 5–10 creators is typically **well under 1 TB/month**.

---

## Optional: RTMP subdomain

Instead of IP in OBS, add DNS:

```
rtmp.livebooth.uk  →  YOUR_VPS_IP
```

Then use `rtmp://rtmp.livebooth.uk:1935/live` in OBS and `RTMP_SERVER_URL`.

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| OBS can't connect | Firewall 1935; `docker logs livebooth-rtmp` |
| OBS OK, no video on site | `HLS_SERVER_URL` must be **https://** not `http://IP:8888` |
| Publish forbidden | Go Live first; `RTMP_AUTH_ENABLED=true`; check auth URL in mediamtx config |
| Still demo stream | Remove `LIVEPEER_API_KEY` from Vercel; redeploy |
| Caddy cert fails | DNS must point to VPS before reload |

---

## Costs

| Item | ~Cost |
|------|-------|
| Hetzner CX23 | €5.49/mo (+ VAT) |
| Vercel + Neon | Free tier / existing |
| Domain | Already have livebooth.uk |

---

## Full reference

[RTMP-VPS-DEPLOY.md](./RTMP-VPS-DEPLOY.md) — security, VOD, advanced Caddy
