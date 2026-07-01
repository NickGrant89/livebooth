# 04 — Features & Differentiation

## Core Platform Features (table stakes)

These are required to compete with Kick/Twitch for DJs.

| Feature | Description | Priority |
|---------|-------------|----------|
| Live streaming | Audio + optional webcam, low-latency | P0 |
| Browse / discovery | Live now, by genre, featured DJs | P0 |
| DJ profiles | Bio, genres, follower count, past streams | P0 |
| Real-time chat | WebSocket chat per stream | P0 |
| Follow system | Follow DJs, get notified when live | P0 |
| Wallet connect | VeWorld or MetaMask, WalletConnect, Coinbase Wallet | P0 |
| Crypto tips | DROP tips during live stream | P0 |
| Go live flow | Stream setup wizard, title, genre | P0 |
| DJ dashboard | Earnings, stats, stream controls | P0 |
| Achievements | DJ + fan badges with DROP rewards | P1 |
| VOD replays | Watch past sets after stream ends | P1 |
| Clips | Share 30–60s highlights | P2 |
| Notifications | Push/email when followed DJ goes live | P2 |

---

## Differentiators (what makes LiveBooth unique)

These 10 features are the moat. Kick and Twitch don't do these well for DJs.

### 1. Track ID Economy — P1

**What:** Fans pay DROP to reveal the currently playing track (title, artist, label).

**Why different:** Music discovery is the #1 ask in DJ chat ("ID??"). Monetize the answer.

**Flow:**
```
DJ streams with metadata feed (manual or Serato/Rekordbox)
  → Fan clicks "Unlock Track ID" (5 DROP)
  → Track info revealed in chat + saved to personal tracklist
  → DJ earns 85%, platform 15%
```

**UI:** Button below player. Unlocked tracks appear in fan's "Crate" page.

---

### 2. Timestamp Tips (Highlight Moments) — P2

**What:** Fan tips at a specific moment in the stream. That timestamp becomes a highlighted "legendary moment" on the VOD.

**Why different:** Creates shareable clips tied to real fan investment.

**Flow:**
```
Fan tips 50 DROP at 32:14 during the drop
  → Moment pinned on VOD timeline with tip amount
  → Other fans can jump to "top moments"
  → DJ sees which parts of set resonated
```

---

### 3. Genre / BPM Discovery — P1

**What:** Browse live streams by genre, BPM range, vinyl vs digital, key.

**Why different:** Kick has generic categories. DJs and fans think in BPM and genre.

**Filters:**
- Genre (house, techno, DnB, etc.)
- BPM range (120–130, 130–140, 140+)
- Source (vinyl, digital, hybrid)
- Mood (peak time, warmup, chill)

---

### 4. B2B / Collab Mode — P2

**What:** Two DJs stream split-screen or back-to-back. Tips auto-split via smart contract.

**Why different:** Built for DJ culture (B2B sets are core to the scene).

**Flow:**
```
DJ A invites DJ B to collab stream
  → Split ratio set (50/50, 60/40, etc.)
  → Single stream page, dual video/audio
  → Tips routed through CollabSplit contract
```

---

### 5. Crowd Requests (paid) — P1

**What:** Fan pays DROP to request a track. DJ sees queue, accepts or declines.

**Why different:** Interactive sets. Fans become participants, not passive viewers.

**Flow:**
```
Fan pays 10 DROP to request "Innerbloom - RÜFÜS"
  → Request appears in DJ dashboard queue
  → DJ accepts → plays track → fan notified
  → DJ declines → DROP refunded minus small fee
```

**Rules:**
- Max 3 pending requests per fan per stream
- DJ can set min request price
- Request queue visible in chat (optional)

---

### 6. Fan Achievements — P1

**What:** Badges for fans (Superfan, Night Owl, Track Hunter). Earn DROP for engagement.

**Why different:** Keeps fans engaged and spending, not just watching.

See [03-achievements.md](./03-achievements.md) for full fan catalog.

---

### 7. Hardware / Software Integration — P2

**What:** Connect Pioneer DJ, Denon, Serato, Rekordbox, Traktor to auto-push track metadata to stream overlay.

**Why different:** No general streaming platform integrates with DJ software. This is the technical moat.

**Integration tiers:**
| Tier | Source | Data |
|------|--------|------|
| Manual | DJ types track name | Title only |
| OBS overlay | Browser source widget | Title + artwork |
| Serato/Rekordbox | API / companion app | Title, artist, BPM, key, artwork |
| Pioneer LINK | Pro DJ Link protocol | Full deck metadata |

---

### 8. Residency Slots — P2

**What:** Clubs, labels, and collectives get branded channels with scheduled weekly slots.

**Why different:** Bridges offline club culture to online streaming.

**Example:**
```
" fabric London — Room 1 Residency"
  → Every Friday 10pm GMT
  → Featured on homepage
  → Revenue share: club 20%, DJ 70%, platform 10%
```

---

### 9. Cleared / Rights-Safe Streaming Tier — P3

**What:** Partner with labels for pre-cleared track libraries. DJs in this tier stream without DMCA risk.

**Why different:** Solves the biggest pain in music streaming.

**Model:**
- Label provides cleared catalog
- DJ selects from cleared library during stream
- Tips/revenue shared with label (5–10%)
- Non-cleared tier still exists with standard DMCA policy

---

### 10. DROP Staking on DJs — P3

**What:** Fan stakes DROP on a favorite DJ. When DJ hits milestones, stakers share a reward pool.

**Why different:** Turns fans into invested supporters. Gamifies DJ growth.

**Flow:**
```
Fan stakes 100 DROP on DJ "Neon Pulse"
  → DJ hits "Legend Status" (10K followers)
  → Stakers split 1,000 DROP reward pool proportionally
  → Unstake anytime (no lock, or 7-day cooldown)
```

---

### 11. Radio & Station Partners — P2 (planned)

**What:** Internet radio stations, FM/community stations, and label channels get a **branded booth** on LiveBooth — not just another DJ profile.

**Why different:** Stations already have audience, schedule, and brand. LiveBooth adds tipping, chat, track IDs, and DROP without replacing their existing stack.

**Suggested tiers:**

| Tier | Who | LiveBooth offers |
|------|-----|------------------|
| **Community** | Small internet / FM simulcast | Branded `/station/[slug]`, up to 5 residents, 70/20/10 tip split |
| **Pro** | Weekly residency lineup | Relay mode (keep Icecast/Radio.co encoder), station dashboard, 15 residents |
| **Network** | Multi-show network | White-label player, listener staking milestones, 50 residents |

**Shipped (MVP):**

- `RadioStation` + `StationResident` models, `/station/[slug]` hub
- Tip split 70% DJ / 20% station / 10% platform in ledger when stream has `stationId`
- “Presented by [Station]” badge on live player
- Go-live attaches station when DJ is a resident
- **Web Push** for go-live alerts (VAPID + service worker; enable in Settings or notification bell)

**Flows to build (next):**

```
Station signs up → verifies stream URL or RTMP relay
  → Books resident DJs to weekly slots (extends weekly schedule)
  → Listeners tip the show (70% DJ / 20% station / 10% platform)
  → Station dashboard: peak listeners, DROP revenue, top tracks unlocked
```

**Quick wins without full `/residencies` page:**

- ~~DJ `role: station` with linked station and shared branding~~ → **done** (`role: station`, `/station/kxradio` demo)
- ~~Tip split override (station + DJ) in ledger~~ → **done**
- ~~“Presented by [Station]” badge on stream player~~ → **done**
- ~~Web Push go-live alerts~~ → **done** (`/api/push/subscribe`, `public/sw.js`)
- ~~Station follower staking + milestones~~ → **done** (`StationStake`, milestone DROP rewards)
- ~~CSV schedule import~~ → **done** (`POST /api/stations/owner/schedule/import`)
- ~~White-label embed~~ → **done** (`/embed/station/[slug]`, iframe snippet in Settings)
- ~~Station owner dashboard~~ → **done** (Settings for `role: station`)
- “Starting soon” home banner from imported schedule (future)

**Integrations to explore:** AzuraCast, Radio.co, Mixcloud Live, existing FM simulcast RTMP.

---

```
                    IMPACT
                      ▲
          P1 diff     │  Track IDs    Crowd Requests
          features    │  BPM browse   Fan achievements
                      │
          P0 core     │  Streaming    Tips    Chat
                      │  Profiles     Wallet
                      │
          P2/P3       │  Collab       Staking
          future      │  Hardware     Cleared tier
                      │
                      └──────────────────────────► EFFORT
```

---

## Pages Map (target product)

| Route | Features |
|-------|----------|
| `/` | Browse live, genres, featured, top DJs |
| `/stream/[username]` | Player, chat, tips, track ID unlock, requests |
| `/dj/[username]` | Profile, achievements, VOD list, follow |
| `/achievements` | DJ + fan achievement catalog, claim |
| `/dashboard` | Go live, earnings, request queue, stats |
| `/go-live` | Setup wizard (title, genre, audio, collab) |
| `/crate` | Fan's unlocked track history |
| `/wallet` | DROP balance, buy, withdraw, tx history |
| `/residencies` | Scheduled slots, club channels |
| `/leaderboard` | Top DJs by tips, viewers, achievements |

---

## Competitive Feature Comparison

| Feature | Kick | Twitch | Mixcloud | LiveBooth |
|---------|------|--------|----------|------------|
| Live streaming | Yes | Yes | No | Yes |
| Crypto tips | No | No | No | Yes |
| Track ID unlocks | No | No | No | Yes |
| Crowd requests | No | No | No | Yes |
| BPM discovery | No | No | Partial | Yes |
| DJ software integration | No | No | No | Yes |
| Achievements + token rewards | No | No | No | Yes |
| Collab/B2B mode | No | Partial | No | Yes |
| Fan staking | No | No | No | Yes (ledger MVP) |
