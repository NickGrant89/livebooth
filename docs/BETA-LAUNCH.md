# Beta testing guide

How to get LiveBooth in front of real people — from **same-room demo** to **hosted beta URL**.

---

## Pick your path

| Path | Time | Who can access | Best for |
|------|------|----------------|----------|
| **A. LAN demo** | 5 min | Same Wi‑Fi only | House party, studio, office |
| **B. Tunnel** | ~30 min | Anyone with the link | Remote friends while your Mac stays on |
| **C. Hosted beta** | 2–4 hours | Anyone, 24/7 URL | Real beta (5–50 testers, multiple DJs) |

**Recommendation:** Start with **A or B** this week. Move to **C** when you want testers who aren’t on your network and you don’t want your laptop running 24/7.

---

## Path A — LAN demo (you may already be here)

```bash
npm run demo:setup
npm run demo:start
```

Share the URL from the cyan banner (e.g. `http://192.168.178.96:3008`).

**Works well:** watch seeded live DJs, signup, tip, chat, quests, promote booth (internal DROP).

**Limits:** same Wi‑Fi; your machine must stay on; password reset has no email (use signup or seeded accounts).

Full details: [LOCAL-DEMO.md](./LOCAL-DEMO.md)

---

## Path B — Tunnel (remote beta without deploy)

Expose your local server to the internet with a temporary HTTPS URL.

### 1. Start the app (LAN mode)

```bash
npm run demo:setup
npm run demo:start
```

### 2. Open a tunnel

**Option 1 — Cloudflare (free, no account for quick tunnel)**

```bash
brew install cloudflared   # or download from developers.cloudflare.com
cloudflared tunnel --url http://localhost:3008
```

Copy the `https://….trycloudflare.com` URL.

**Option 2 — ngrok**

```bash
ngrok http 3008
```

### 3. Point the app at the public URL

In `.env`:

```bash
NEXT_PUBLIC_APP_URL="https://YOUR-TUNNEL-URL"
```

Restart `npm run demo:start` so share links and OG previews use the tunnel URL.

### 4. Share with testers

Send them:

- The **https** tunnel URL (not the LAN IP)
- “Sign up at `/signup` — fan or DJ”
- Optional: `/guide` for a quick tour

**Do not** post `password123` demo accounts publicly on the internet. Create fresh accounts or share invite credentials privately.

### Tunnel limits

- Your Mac must stay on; tunnel drops when you close it
- SQLite + single process — fine for ~10–20 concurrent testers
- Chat SSE and presence work on one machine; don’t expect Kick-scale load
- Real OBS streaming to **your** RTMP only works if testers can reach your LAN RTMP port (usually **no** through a tunnel) — use **seeded live DJs** or skip live OBS for tunnel beta
- For **your** OBS through tunnel you’d need Livepeer (Path C) or a more complex RTMP relay

---

## Path C — Hosted beta (proper URL)

Deploy to **Vercel + Neon Postgres** so anyone can use the app without your laptop.

### Why Postgres is required

The repo uses **SQLite** locally. Vercel serverless **cannot** run SQLite on disk. Hosted beta = switch to Postgres once (see [PRODUCTION-DEPLOY.md](./PRODUCTION-DEPLOY.md)).

### Minimum beta stack (free tiers)

| Service | Purpose | Sign up |
|---------|---------|---------|
| **Neon** | Postgres database | [neon.tech](https://neon.tech) |
| **Vercel** | Host Next.js app | [vercel.com](https://vercel.com) |
| **Livepeer** | Real DJ go-live + VOD | [livepeer.studio](https://livepeer.studio) |
| **Resend** | Password reset email | [resend.com](https://resend.com) (optional for beta) |

You can skip Stripe, VeChain, and Hive for first beta — internal DROP ledger + signup is enough.

### Beta env vars (minimum)

```bash
DATABASE_URL=postgresql://...          # Neon pooled URL
AUTH_SECRET=<openssl rand -base64 32>
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
LIVEPEER_API_KEY=...                   # for real streaming
LIVEPEER_WEBHOOK_SECRET=...            # VOD after stream ends
NEXT_PUBLIC_DEMO_MODE=false            # hide “LAN demo” banner
```

Optional but nice:

```bash
RESEND_API_KEY=...
EMAIL_FROM="LiveBooth <noreply@yourdomain.com>"
HIVE_API_KEY=...                       # real moderation (else mock)
```

### Deploy steps (summary)

1. Create Neon project → copy `DATABASE_URL`
2. In `prisma/schema.prisma`, set `provider = "postgresql"` (and wire `src/lib/db.ts` for Postgres — see PRODUCTION-DEPLOY)
3. Locally: `DATABASE_URL=postgresql://... npx prisma migrate deploy`
4. Optionally seed: `npx tsx prisma/seed.ts` (then **change demo passwords** or skip seed and use real signups only)
5. Push repo to GitHub → Import in Vercel → add env vars → Deploy
6. In Livepeer dashboard → Webhooks → `https://your-app.vercel.app/api/webhooks/livepeer`

### Custom domain (optional)

Point `beta.livebooth.fm` (or similar) at Vercel → set `NEXT_PUBLIC_APP_URL` to match.

---

## Beta test plan (what to ask people to try)

Copy this into your invite message:

### Fans (10 min)

1. Sign up → open Discover → watch a live booth
2. Tip in chat (you start with 500 DROP on new accounts, or use wallet)
3. Unlock track ID (5 DROP)
4. Complete 1 daily quest on home → claim reward
5. Follow a DJ → optional: enable notifications in settings

### DJs (20 min)

1. Sign up as **DJ**
2. Go Live → use Livepeer stream key in OBS (hosted) or demo HLS (local)
3. Set now playing → accept a track request
4. End stream → check **Grade** in recap
5. Optional: Promote booth (75–250 DROP) while live

### You (host)

- [ ] `/admin` as admin user — watch reports, support tickets
- [ ] Note anything broken → GitHub issues or support form
- [ ] After beta: rotate `AUTH_SECRET`, disable or password-change seeded accounts

---

## Security before public beta

| Do | Why |
|----|-----|
| New `AUTH_SECRET` (not `change-me-in-production`) | Session security |
| Don’t publish demo `password123` accounts | Anyone could admin/DJ hijack |
| Terms + Privacy linked (already in footer) | Trust |
| Rate limits already on login/chat/tips | Basic abuse protection |
| Consider `NEXT_PUBLIC_DEMO_MODE=false` on hosted | Less “dev demo” framing |
| **`SEED_DEMO_USERS` unset** on production | No demo `password123` accounts |
| **`RTMP_AUTH_ENABLED=true`** on public RTMP | Publish auth — `rtmp-server/README.md` |
| **`RESEND_API_KEY`** + [RESEND-SETUP.md](./RESEND-SETUP.md) | Password reset email |
| **`npm run smoke:beta`** on staging URL | Pre-invite smoke test |

---

## What works without extra setup

| Feature | LAN | Tunnel | Hosted |
|---------|-----|--------|--------|
| Signup / login | ✅ | ✅ | ✅ |
| Seeded live streams (demo video) | ✅ | ✅ | ✅ if seeded |
| Tips, chat, quests | ✅ | ✅ | ✅ |
| Promote booth | ✅ | ✅ | ✅ |
| Real OBS go-live | ✅ LAN RTMP | ❌* | ✅ Livepeer |
| Password reset email | ❌ | ❌ | ✅ Resend |
| On-chain DROP | ❌ | ❌ | optional |

\*Unless you use Livepeer on hosted deploy.

---

## Suggested timeline

| Week | Goal |
|------|------|
| **Now** | Path A — 3–5 friends on same Wi‑Fi |
| **+1 day** | Path B — tunnel URL to 2 remote friends; signup + tip flow |
| **+1 week** | Path C — Vercel + Neon; invite 10–20 testers with a single beta link |
| **+2 weeks** | Livepeer + Resend; 2–3 real DJs streaming weekly |

---

## Need help choosing?

- **“Friends at my place tonight”** → Path A (`npm run demo:start`)
- **“Friends in other cities this weekend”** → Path B (tunnel + signup)
- **“Proper beta link I can post in Discord”** → Path C (Vercel + Neon — we can wire Postgres next)

See also: [13-master-backlog.md](./design/13-master-backlog.md) · [PRODUCTION-DEPLOY.md](./PRODUCTION-DEPLOY.md)
