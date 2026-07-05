# Production deploy guide

Steps to move LiveBooth from local demo to a hosted **Postgres + Vercel** deployment.

**Soft launch (5–10 creators):** see [SOFT-LAUNCH.md](./SOFT-LAUNCH.md) after deploy.

Run locally first:

```bash
npm run launch:check
npm run build
```

---

## Week 1 — Deploy (do in order)

### Day 1: Domain + database

1. **Register** [livebooth.uk](https://www.nominet.uk/) (or your chosen TLD).
2. **Neon** — [neon.tech](https://neon.tech) → New project → copy **pooled** connection string:
   ```
   postgresql://user:pass@ep-xxx.eu-west-2.aws.neon.tech/livebooth?sslmode=require
   ```
3. Generate secrets:
   ```bash
   openssl rand -base64 32   # AUTH_SECRET
   openssl rand -hex 32      # LIVEPEER_WEBHOOK_SECRET
   ```

### Day 2: GitHub + Vercel

1. Push this repo to GitHub (private is fine).
2. [vercel.com](https://vercel.com) → **Add New Project** → import repo.
3. Framework: **Next.js** (auto-detected). Build command comes from `vercel.json` → `npm run vercel-build`.
4. Add environment variables (Production):

| Variable | Required | Example |
|----------|----------|---------|
| `DATABASE_URL` | ✅ | Neon pooled URL |
| `AUTH_SECRET` | ✅ | output of `openssl rand -base64 32` |
| `NEXT_PUBLIC_APP_URL` | ✅ | `https://livebooth.uk` (after DNS) or `https://xxx.vercel.app` for first deploy |
| `RESEND_API_KEY` | ✅ | from resend.com |
| `EMAIL_FROM` | ✅ | `LiveBooth <noreply@livebooth.uk>` |
| `LIVEPEER_API_KEY` | ✅ | from livepeer.studio |
| `LIVEPEER_WEBHOOK_SECRET` | ✅ | random hex |
| `STRIPE_SECRET_KEY` | optional | test mode OK for beta |
| `STRIPE_WEBHOOK_SECRET` | optional | |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | optional | web push |
| `VAPID_PRIVATE_KEY` | optional | |
| `NEXT_PUBLIC_*_ADDRESS` | optional | VeChain testnet |

**Do not set:** `NEXT_PUBLIC_DEMO_MODE`, `SEED_DEMO_USERS`

**Streaming (pick one):**

| Mode | Vercel env |
|------|------------|
| **Livepeer** (easiest) | `LIVEPEER_API_KEY` + webhook secret — no RTMP vars |
| **Self-hosted RTMP** | `RTMP_SERVER_URL`, `HLS_SERVER_URL`, `RTMP_AUTH_ENABLED=true` — [RTMP-HETZNER-QUICKSTART.md](./RTMP-HETZNER-QUICKSTART.md) or [RTMP-ORACLE-UK-QUICKSTART.md](./RTMP-ORACLE-UK-QUICKSTART.md) |

Do not set both Livepeer and self-hosted RTMP — Livepeer takes priority.

5. **Deploy** → wait for build (runs `prisma migrate deploy`).

### Day 3: Verify + DNS

```bash
SMOKE_BASE_URL=https://YOUR-PROJECT.vercel.app npm run smoke:deploy
```

**DNS (livebooth.uk):** Vercel project → Settings → Domains → add `livebooth.uk` and `www.livebooth.uk` → apply records at your registrar (usually A/CNAME as Vercel shows).

Update `NEXT_PUBLIC_APP_URL` to `https://livebooth.uk` and **Redeploy**.

### Day 4: Admin + smoke test live

```bash
SEED_ADMIN_EMAIL="nickgrant1989@live.co.uk" \
SEED_ADMIN_PASSWORD="your-strong-password" \
SEED_ADMIN_USERNAME="digital89" \
DATABASE_URL="your-neon-url" \
npx tsx prisma/seed.ts
```

Or: sign up normally → `/admin` → Users → set your role to **admin**.

Test on production: signup → go live (Livepeer) → tip → `/admin` audit log.

---

## Sprint 4 quick start (reference)

### 1. Neon Postgres

1. Create a project at [neon.tech](https://neon.tech).
2. Copy the **pooled** connection string (`?sslmode=require`).
3. This repo uses **PostgreSQL migrations** in `prisma/migrations/` (SQLite migrations archived in `prisma/migrations-sqlite/`).

### 2. Vercel project

```bash
npm i -g vercel
vercel link
```

Set environment variables in the Vercel dashboard (or `vercel env add`):

| Variable | Required | Purpose |
|----------|----------|---------|
| `DATABASE_URL` | ✅ | Neon **pooled** Postgres URL (`-pooler` in hostname) |
| `DIRECT_URL` | ✅ | Neon **direct** URL (same creds, **no** `-pooler`) — used by `prisma migrate deploy` |
| `AUTH_SECRET` | ✅ | `openssl rand -base64 32` |
| `NEXT_PUBLIC_APP_URL` | ✅ | `https://your-app.vercel.app` |
| `RESEND_API_KEY` | ✅ | Password reset email |
| `EMAIL_FROM` | ✅ | Verified sender in Resend |
| `LIVEPEER_API_KEY` | ✅ | Cloud ingest + recording |
| `LIVEPEER_WEBHOOK_SECRET` | ✅ | VOD webhook verification |
| `STRIPE_SECRET_KEY` | optional | Buy DROP |
| `STRIPE_WEBHOOK_SECRET` | optional | Stripe events |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | optional | Web push |
| `VAPID_PRIVATE_KEY` | optional | Web push |
| `NEXT_PUBLIC_*_ADDRESS` | optional | VeChain testnet contracts |

**Do not set** `SEED_DEMO_USERS=true` on production.

### 3. Deploy

Vercel runs `npm run vercel-build` which executes:

```
prisma generate && prisma migrate deploy && next build
```

`migrate deploy` uses `DIRECT_URL` when set (Neon pooler cannot hold Prisma’s advisory lock — error **P1002**).

Push to GitHub and connect the repo, or:

```bash
vercel --prod
```

### 4. Verify

```bash
SMOKE_BASE_URL=https://your-app.vercel.app npm run smoke:deploy
```

Expect `GET /api/health` → `{ ok: true, database: { provider: "postgresql", ok: true } }`.

### 5. Webhooks

| Service | URL |
|---------|-----|
| Stripe | `https://yourdomain.com/api/stripe/webhook` |
| Livepeer | `https://yourdomain.com/api/webhooks/livepeer` |

---

## Local dev with Postgres (recommended)

Matches production schema and migrations.

```bash
npm run db:up          # Docker Postgres on :5432
npm run db:postgres:setup   # wait + migrate deploy
npm run db:seed:demo   # optional demo users
npm run demo:start
```

Default `DATABASE_URL` in `.env.example`:

```
postgresql://livebooth:livebooth@localhost:5432/livebooth
```

### Legacy SQLite

Archived in `prisma/migrations-sqlite/`. **Production and local dev use Postgres only.**

---

## Post-launch backlog (week 2+)

| Priority | Item |
|----------|------|
| Radio focus | Stripe subscription for Pro/Network station tiers |
| Band focus | `/creator/[username]` URLs + achievement copy |
| Scale | Upstash Redis for chat + rate limits on Vercel |
| Trust | Admin 2FA, moderation keys (Hive/AWS) |

---

## 1. Database — details

### Migrate manually

```bash
export DATABASE_URL="postgresql://..."
npx prisma migrate deploy
npx tsx prisma/seed.ts   # optional — never with SEED_DEMO_USERS on prod
```

Latest migrations include **support live chat** (`20260705140000_support_live_chat` — `SupportTicketMessage` + `channelToken`). See [SUPPORT-LIVE-CHAT.md](./SUPPORT-LIVE-CHAT.md).

### SQLite → Postgres data migration

For a one-off export from local `dev.db`, use `pgloader` or custom scripts. For greenfield launch, migrate deploy + invite beta DJs is usually enough.

---

## 2. Vercel configuration

`vercel.json` sets:

- `buildCommand`: `npm run vercel-build`
- `regions`: `iad1` (change if needed)

`next.config.ts` externalizes native DB drivers (`pg`, `better-sqlite3`) for serverless.

---

## 3. Email (Resend)

1. Sign up at [resend.com](https://resend.com).
2. Verify your sending domain.
3. Set `RESEND_API_KEY` and `EMAIL_FROM`.
4. Password reset uses `src/lib/email.ts` — dev mode still returns `devResetUrl` when `RESEND_API_KEY` is unset.

---

## 4. Rate limiting at scale

Local/dev uses in-memory rate limits (`src/lib/rate-limit.ts`). On Vercel serverless, use **Upstash Redis** or Vercel KV for shared limits across instances.

---

## 5. VeChain testnet

```bash
# Fund deployer from faucet.vecha.in
export DEPLOYER_PRIVATE_KEY="0x..."
npm run contracts:deploy
npm run contracts:sync-env
```

Set `NEXT_PUBLIC_CHAIN_ID=100010` and redeploy.

---

## 6. Pre-launch checklist

- [ ] Postgres migrated (`prisma migrate deploy` on Vercel build)
- [ ] `/api/health` returns 200 on production
- [ ] `AUTH_SECRET` rotated from dev default
- [ ] Resend sending verified
- [ ] Livepeer recording webhook receiving events
- [ ] Stripe webhook live mode (when ready)
- [ ] Hive/AWS moderation keys set (not mock)
- [ ] Terms + Privacy URLs public
- [ ] Demo seed accounts disabled (`SEED_DEMO_USERS` unset)

### Security (pre-deploy hardening)

- Admin audit log persisted (`AdminAuditLog` table) — view at `/admin` → Audit log
- Login/signup server actions rate-limited by IP
- Admin API routes rate-limited (120 req/min per IP)
- Security headers (HSTS in production, X-Frame-Options, nosniff)
- Demo credentials only shown when `NEXT_PUBLIC_DEMO_MODE=true`
- **Still TODO for scale:** Upstash Redis for shared rate limits on Vercel; admin 2FA

---

## 7. One-time production admin (optional)

After first deploy:

```bash
SEED_ADMIN_EMAIL="you@yourdomain.com" \
SEED_ADMIN_PASSWORD="strong-random-password" \
SEED_ADMIN_USERNAME="admin" \
DATABASE_URL="..." npx tsx prisma/seed.ts
```
