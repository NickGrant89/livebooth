# Self-hosted RTMP — Oracle UK quickstart

Use **your own** MediaMTX server from day one. LiveBooth stays on Vercel; streaming runs on Oracle Cloud Always Free (UK).

**Time:** ~1–2 hours (Oracle signup can be the slow part)

---

## What you'll have when done

```
OBS → rtmp://YOUR_VPS:1935/live → MediaMTX → https://hls.livebooth.uk → fans
                                      ↓
                         https://livebooth.uk/api/rtmp/auth
```

---

## Part 1 — Oracle Cloud (UK, free)

1. Sign up: [oracle.com/uk/cloud/free](https://www.oracle.com/uk/cloud/free/)
2. **Home region:** **UK South (London)** — or **UK West (Newport)** if London fails
3. Create instance:
   - Shape: **VM.Standard.A1.Flex** (Always Free-eligible)
   - OCPUs: **1**, Memory: **6 GB** (easier to get capacity than 2/12)
   - Image: **Ubuntu 22.04** (aarch64)
   - Add your **SSH public key**
4. **Networking → VCN → Security List → Ingress rules** add:

   | Port | Source | Purpose |
   |------|--------|---------|
   | 22 | Your IP | SSH |
   | 80 | 0.0.0.0/0 | Caddy / Let's Encrypt |
   | 443 | 0.0.0.0/0 | HTTPS HLS |
   | 1935 | 0.0.0.0/0 | RTMP (OBS) |

5. Note the instance **public IP**

**"Out of host capacity"?** Try Newport, another availability domain, or retry tomorrow.

---

## Part 2 — Install on the VPS

SSH in:

```bash
ssh ubuntu@YOUR_VPS_IP
```

Install Docker + Caddy:

```bash
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
# log out and back in

sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update && sudo apt install -y caddy
```

Copy RTMP files from your Mac:

```bash
# On your Mac:
scp -r /Users/Nick/Projects/NickStreaming/rtmp-server ubuntu@YOUR_VPS_IP:/opt/livebooth/
```

On the VPS, set your LiveBooth app URL in MediaMTX config:

```bash
sudo nano /opt/livebooth/rtmp-server/mediamtx.production.yml
```

Replace `LIVEBOOTH_APP_URL` with your real app, e.g.:

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

---

## Part 3 — HTTPS for HLS (required)

Browsers on `https://livebooth.uk` block `http://IP:8888` video.

**Option A — subdomain (best)**

1. DNS: `hls.livebooth.uk` → VPS public IP
2. Caddy config:

```bash
sudo nano /etc/caddy/Caddyfile
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
sudo systemctl reload caddy
```

**Option B — IP only for first test (no custom domain yet)**

You can test OBS ingest on `rtmp://VPS_IP:1935/live` but **fans won't see video** in the browser until HLS is HTTPS. Get a subdomain or use Livepeer temporarily for viewers only — for own RTMP you need HTTPS HLS.

---

## Part 4 — Vercel env vars

**Remove** `LIVEPEER_API_KEY` if set (Livepeer overrides your RTMP).

Add / set:

| Variable | Example |
|----------|---------|
| `RTMP_SERVER_URL` | `rtmp://YOUR_VPS_IP:1935/live` |
| `HLS_SERVER_URL` | `https://hls.livebooth.uk` |
| `RTMP_AUTH_ENABLED` | `true` |

**Redeploy** Vercel after saving.

---

## Part 5 — First stream test

1. Production site → sign up as **Creator**
2. **Go Live** → copy stream key (`lb_…`)
3. OBS:

   | Field | Value |
   |-------|--------|
   | Server | `rtmp://YOUR_VPS_IP:1935/live` |
   | Stream key | from Go Live |

4. Start streaming → open your stream page
5. Video in ~3–5 seconds if HLS URL is correct

**Auth rejected?** Go Live **before** OBS. Key must match a live stream in the DB.

---

## Checklist

```
□ Oracle VM running (UK London or Newport)
□ Ports 1935, 80, 443 open
□ mediamtx.production.yml → your Vercel/livebooth URL
□ docker compose -f docker-compose.production.yml up -d
□ hls.livebooth.uk → Caddy → :8888
□ Vercel: RTMP_SERVER_URL, HLS_SERVER_URL, RTMP_AUTH_ENABLED=true
□ No LIVEPEER_API_KEY on Vercel
□ Creator account → Go Live → OBS test
```

---

## VOD (later)

Recordings save on the VPS at `recordings/live/{ingestKey}/`. Vercel can't read that disk — live streaming works first; replays need extra setup (see [RTMP-VPS-DEPLOY.md](./RTMP-VPS-DEPLOY.md)).

---

## Full reference

[RTMP-VPS-DEPLOY.md](./RTMP-VPS-DEPLOY.md) — troubleshooting, security, Caddy recordings
