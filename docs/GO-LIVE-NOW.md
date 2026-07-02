# Go live now — full checklist

**App:** Vercel · **DB:** Neon · **RTMP:** DigitalOcean `46.101.2.57` · **DNS:** Cloudflare

Do these **in order**. Wait 5–15 min after DNS changes before testing HTTPS.

---

## 1. Vercel — custom domain

1. [vercel.com](https://vercel.com) → your **livebooth** project → **Settings → Domains**
2. Add:
   - `livebooth.uk`
   - `www.livebooth.uk`
3. Note the DNS records Vercel shows (usually apex **A** + **CNAME** for www)

---

## 2. Cloudflare DNS

Cloudflare → **livebooth.uk** → **DNS → Records**

### Main site → Vercel (proxied orange ☁️)

| Type | Name | Content | Proxy |
|------|------|---------|--------|
| A | `@` | `76.76.21.21` | Proxied |
| CNAME | `www` | `cname.vercel-dns.com` | Proxied |

Use exact values from Vercel if different.

### HLS + RTMP → DigitalOcean (DNS only grey ☁️)

| Type | Name | Content | Proxy |
|------|------|---------|--------|
| A | `hls` | `46.101.2.57` | **DNS only** |
| A | `rtmp` | `46.101.2.57` | **DNS only** |

**Do not** proxy `hls` or `rtmp` — Caddy needs direct Let’s Encrypt on `hls`; RTMP ingest uses TCP **1935** on the droplet IP.

### Cloudflare SSL

**SSL/TLS → Overview → Full** (not Flexible)

---

## 3. Vercel — environment variables

**Settings → Environment Variables → Production**

| Variable | Value |
|----------|--------|
| `DATABASE_URL` | Neon pooled URL |
| `AUTH_SECRET` | strong random (openssl rand -base64 32) |
| `NEXT_PUBLIC_APP_URL` | `https://livebooth.uk` |
| `RTMP_SERVER_URL` | `rtmp://rtmp.livebooth.uk:1935/live` |
| `HLS_SERVER_URL` | `https://hls.livebooth.uk` |
| `RTMP_AUTH_ENABLED` | `true` |

**Remove** if set: `LIVEPEER_API_KEY`, `NEXT_PUBLIC_DEMO_MODE`, `SEED_DEMO_USERS`

Optional: Resend, Livepeer webhook, VeChain, VAPID keys.

**Deploy → Redeploy** production.

---

## 4. DigitalOcean — firewall

**Networking → Firewalls** (or droplet networking):

Inbound allow: **22, 80, 443, 1935** from all sources (or restrict 22 to your IP).

---

## 5. Droplet — Caddy (SSH `root@46.101.2.57`)

```bash
cat > /etc/caddy/Caddyfile << 'EOF'
{
	email nickgrant1989@live.co.uk
}

hls.livebooth.uk {
	reverse_proxy 127.0.0.1:8888
}
EOF

systemctl reload caddy
systemctl status caddy
```

---

## 6. Droplet — MediaMTX auth URL

```bash
grep authHTTPAddress /opt/livebooth/rtmp-server/mediamtx.production.yml
```

Must be:

```yaml
authHTTPAddress: https://livebooth.uk/api/rtmp/auth
```

If wrong:

```bash
sed -i 's|https://.*\.vercel\.app|https://livebooth.uk|g' /opt/livebooth/rtmp-server/mediamtx.production.yml
sed -i 's|https://LIVEBOOTH_APP_URL|https://livebooth.uk|g' /opt/livebooth/rtmp-server/mediamtx.production.yml
cd /opt/livebooth/rtmp-server
docker compose -f docker-compose.production.yml restart
docker compose -f docker-compose.production.yml logs --tail 10
```

---

## 7. Admin account (if none)

**Option A:** Sign up at https://livebooth.uk/signup → Neon SQL Editor:

```sql
UPDATE "User" SET role = 'admin' WHERE email = 'your@email.com';
```

**Option B:** From Mac:

```bash
SEED_ADMIN_EMAIL="nickgrant1989@live.co.uk" \
SEED_ADMIN_PASSWORD="your-strong-password" \
SEED_ADMIN_USERNAME="digital89" \
DATABASE_URL="your-neon-url" \
npm run db:seed
```

---

## 8. Verify

```bash
# Mac
curl -I https://livebooth.uk
curl -I https://hls.livebooth.uk
SMOKE_BASE_URL=https://livebooth.uk npm run smoke:deploy
```

**Stream test:**

1. Creator login → **Go Live**
2. OBS: server `rtmp://rtmp.livebooth.uk:1935/live`, stream key `lb_…`
3. Watch on https://livebooth.uk/stream/yourusername

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| livebooth.uk 525/526 SSL | Cloudflare SSL → **Full** |
| Vercel domain invalid | DNS not propagated; match Vercel’s required records |
| OBS connects, no video | `HLS_SERVER_URL` must be `https://hls.livebooth.uk`; grey cloud on `hls` |
| Publish forbidden | Go Live first; auth URL `https://livebooth.uk/api/rtmp/auth` |
| Demo stream still | Remove `LIVEPEER_API_KEY`; redeploy |

---

## Done when

- [ ] https://livebooth.uk loads
- [ ] https://hls.livebooth.uk responds
- [ ] `/api/health` OK
- [ ] OBS stream visible on stream page
- [ ] Admin can open `/admin`
