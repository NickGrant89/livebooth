# Local test checklist

Run the demo on your LAN without deploy or Postgres.

## Start

```bash
# First time or after schema/seed changes
npm run demo:fresh

# Day-to-day (server only)
npm run demo:start
```

Open **http://localhost:3008** for VeWorld (LAN IP breaks wallet connect). The terminal may also print `http://192.168.x.x:3008` for phone-only smoke tests.

### Demo accounts

| Email | Password | Role |
|-------|----------|------|
| `demo@livebooth.local` | `password123` | Fan |
| `neonpulse@livebooth.local` | `password123` | DJ (Neon Pulse) |
| `admin@livebooth.local` | `password123` | Admin |

---

## Quick smoke (15 min)

### Home / Discover

- [ ] Home loads live booth hero + grid (or single-booth layout)
- [ ] Genre night banner shows on weekday matching today's genre
- [ ] **Quest panel** — progress updates after tip/chat; claim rewards
- [ ] Grid **Sponsored** badge on promoted booth (75 DROP, while live)
- [ ] Hero **SPONSORED** on top slot (250 DROP, while live)

### Fan on stream (`/stream/neonpulse`)

- [ ] Video plays (demo HLS); unmute works
- [ ] **Quest chip** below DJ info — expand, claim if ready
- [ ] Tip panel — amount buttons visible, default 25 DROP, send tip
- [ ] Chat — send message; report message
- [ ] Track unlock / request queue if seeded

### DJ dashboard (`neonpulse` → Go Live / Dashboard)

- [ ] Go live → end set → **Session recap** with grade + **Download Card** PNG
- [ ] **Promote booth** — grid (75) vs hero (250); success copy explains placement
- [ ] Chat **Ban** on viewer message (host only)

### VOD replay

- [ ] Open ended set from DJ profile or recap **Replay** link
- [ ] **Legendary moments** — click timestamp → player seeks

### Admin (`admin@livebooth.local` → `/admin`)

- [ ] **Treasury** tab — inflow, liabilities, withdrawal queue (approve / mark paid / reject)
- [ ] **Promotions** tab — hero slot, active boosts
- [ ] Moderation + live streams tabs

### DJ cash-out (`neonpulse@livebooth.local` → `/wallet`)

- [ ] **Cash out DROP** — request 50+ DROP (demo min), see pending status
- [ ] Admin marks paid or rejects (refunds balance)

### On-chain tips (VeChain testnet)

See [VECHAIN-TESTNET.md](./VECHAIN-TESTNET.md) and [ONCHAIN-ROADMAP.md](./ONCHAIN-ROADMAP.md).

- [ ] `npm run contracts:verify` — contracts + `.env` OK
- [ ] **neonpulse** → `/wallet` → Connect VeWorld (sets DJ `walletAddress`)
- [ ] **demo** → `/wallet` → Connect + faucet 100 DROP (add custom VIP-180 token in VeWorld if needed)
- [ ] `/stream/neonpulse` → Tip → check **On-chain** → confirm in VeWorld
- [ ] Explorer: [explore.vechain.org](https://explore.vechain.org/) with **Testnet** toggle

### Station (`/station/kxradio`)

- [ ] Hero header with followers/stakers + **Share station**
- [ ] Live card or **Next show** schedule when off-air
- [ ] Residency lineup with **Live** / **Flagship** badges
- [ ] Stake panel + tier info

### Leaderboard (`/leaderboard`)

- [ ] Summary stats row (live DJs, top grade)
- [ ] **Best sets** tab — graded replays link to VOD
- [ ] Stations tab — toggle DROP vs followers

---

## Verify in SQLite (optional)

```bash
sqlite3 dev.db "SELECT COUNT(*) FROM Tip;"
sqlite3 dev.db "SELECT setGrade, setScore, title FROM Stream WHERE status='ended' ORDER BY endedAt DESC LIMIT 3;"
sqlite3 dev.db "SELECT tier, streamId FROM PromotionPurchase ORDER BY createdAt DESC LIMIT 5;"
```

---

## Known local limits

- **Docker / RTMP** — optional; demo uses seeded HLS URLs (no OBS required)
- **Email** — logs to console unless `RESEND_API_KEY` is set
- **Stripe / VeChain / push** — need env keys; skip for LAN demo
- **Hydration warnings** — often browser extensions; safe to ignore

---

## After code changes

| Change type | Command |
|-------------|---------|
| Schema / seed | `npm run demo:fresh` |
| UI / API only | restart `npm run demo:start` (HMR usually enough) |
| Prisma client stale | `npx prisma generate` then restart |
