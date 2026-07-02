# Self-hosted RTMP — DigitalOcean (simple fixed price)

**Easiest VPS signup** — flat monthly bill, **London datacenter**, web console if SSH is awkward.

| Plan | Price | Spec | Good for |
|------|-------|------|----------|
| **Basic 2 GB** (recommended) | **$12/mo** max | 1 vCPU, 2 GB RAM, 50 GB | RTMP + a few streams |
| Basic 1 GB | $6/mo max | 1 vCPU, 1 GB RAM | Tight — only 1 stream |

You are **never charged more than the monthly price** for the droplet.

**Time:** ~20 minutes

---

## Part 1 — Create the droplet

1. Sign up: [digitalocean.com](https://www.digitalocean.com/)
2. **Create → Droplets**
3. Choose:

   | Setting | Value |
   |---------|--------|
   | Region | **London (LON1)** |
   | Image | **Ubuntu 24.04 LTS** |
   | Size | **Basic → Regular → $12/mo** (2 GB / 1 vCPU) |
   | Authentication | **Password** — set a strong root password you’ll remember |
   | Hostname | `livebooth-rtmp` |

4. **Create Droplet**
5. Copy the **public IP** from the dashboard

**Stuck on SSH?** Use **Access → Launch Droplet Console** in the DigitalOcean web UI — full terminal in the browser, no SSH client needed.

---

## Part 2 — Firewall

**Networking → Firewalls → Create Firewall** → attach to your droplet:

| Type | Protocol | Port range | Sources |
|------|----------|------------|---------|
| Inbound | TCP | 22 | All IPv4 (or your IP) |
| Inbound | TCP | 80 | All IPv4 |
| Inbound | TCP | 443 | All IPv4 |
| Inbound | TCP | 1935 | All IPv4 |

Apply to `livebooth-rtmp`.

---

## Part 3 — Install (web console or SSH)

Log in as **root** (browser console or `ssh root@YOUR_IP`).

```bash
curl -fsSL https://get.docker.com | sh

apt update && apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list
apt update && apt install -y caddy
```

### Copy RTMP files

**Option A — from your Mac (password login):**
```bash
scp -r /Users/Nick/Projects/NickStreaming/rtmp-server root@YOUR_IP:/opt/livebooth/
```

**Option B — no scp:** In DigitalOcean console, create the folder and paste config, or use `git clone` if the repo is on GitHub:
```bash
mkdir -p /opt/livebooth
apt install -y git
git clone https://github.com/NickGrant89/livebooth.git /opt/livebooth/app
cp -r /opt/livebooth/app/rtmp-server /opt/livebooth/
```

Edit MediaMTX auth URL:

```bash
nano /opt/livebooth/rtmp-server/mediamtx.production.yml
```

Set (replace with your real app URL):
```yaml
authHTTPAddress: https://livebooth.uk/api/rtmp/auth
```

Start:

```bash
cd /opt/livebooth/rtmp-server
docker compose -f docker-compose.production.yml up -d
docker compose -f docker-compose.production.yml logs -f
```

---

## Part 4 — HTTPS HLS

DNS at your domain registrar:

```
hls.livebooth.uk  →  YOUR_DROPLET_IP
```

Caddy:

```bash
nano /etc/caddy/Caddyfile
```

```
{
	email nickgrant1989@live.co.uk
}

hls.livebooth.uk {
	handle /recordings/* {
		uri strip_prefix /recordings
		root * /opt/livebooth/rtmp-server/recordings
		file_server browse
		header Access-Control-Allow-Origin *
	}
	reverse_proxy 127.0.0.1:8888
}
```

```bash
systemctl reload caddy
```

---

## Part 5 — Vercel

| Variable | Value |
|----------|--------|
| `RTMP_SERVER_URL` | `rtmp://YOUR_DROPLET_IP:1935/live` |
| `HLS_SERVER_URL` | `https://hls.livebooth.uk` |
| `RECORDINGS_PUBLIC_URL` | `https://hls.livebooth.uk/recordings` |
| `RTMP_AUTH_ENABLED` | `true` |

Remove `LIVEPEER_API_KEY` → **Redeploy**.

---

## Part 6 — Test

1. Creator account → **Go Live**
2. OBS: server `rtmp://YOUR_IP:1935/live`, stream key `lb_…`
3. Start streaming → open stream page

---

## Why DigitalOcean vs Hetzner?

| | DigitalOcean | Hetzner |
|--|--------------|---------|
| Signup | Very easy | Fine but more “EU dev” |
| Billing | **Fixed $12/mo cap** | ~€5 + VAT |
| London | ✅ LON1 | ❌ (Germany) |
| Web console | ✅ Built in | Rescue mode only |
| Password login | ✅ At create | Email only |
| Bandwidth | 2 TB on $12 plan | 20 TB |

For soft launch, **2 TB is plenty**. Simplicity wins.

---

## Monthly cost summary

| Service | Cost |
|---------|------|
| DigitalOcean droplet | **$12/mo** (never more for that size) |
| Vercel | Free / existing |
| Neon | Free tier |
| **Total streaming infra** | **~$12/mo (~£10)** |

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Can’t SSH | Use **Launch Droplet Console** in DO dashboard |
| Forgot password | Droplet → **Access → Reset root password** |
| OBS rejected | Go Live first; check `authHTTPAddress` in mediamtx config |
| No video in browser | `HLS_SERVER_URL` must be `https://` |
| Replay black / HLS 404 | Run `bash scripts/fix-caddy-recordings.sh` on droplet; set `RECORDINGS_PUBLIC_URL=https://hls.livebooth.uk/recordings` on Vercel |
| Replay shows Recording but black | MediaMTX writes fMP4 — run `bash scripts/setup-recording-remux.sh` on droplet to remux for browsers |

See also: [RTMP-VPS-DEPLOY.md](./RTMP-VPS-DEPLOY.md)
