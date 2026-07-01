# Discover ranking & promotion roadmap

How LiveBooth surfaces live booths on the home page, and what to build next.

---

## Phase 1 — Organic ranking ✅

**Goal:** Hero and grid reflect real engagement, not database order.

**Shipped:**

| Item | Location |
|------|----------|
| Score = `peakViewers + sessionTips × 8` | `src/lib/discover-ranking.ts` |
| Sort live booths descending; tie-break by `startedAt` (newer first) | `rankLiveStreams()` |
| Home hero = `#1` ranked booth | `src/app/page.tsx` |
| Grid = remaining booths, same order | `src/app/page.tsx` |
| Hero label **Trending** + peak / session tip badges | `src/app/page.tsx` |
| Grid cards show session tips when &gt; 0 | `src/components/StreamCard.tsx` |

**Notes:**

- `peakViewers` is session peak (not live concurrent count).
- `totalTips` on the live `Stream` row is tips for the current set only.
- Genre filter (`?genre=`) runs **after** ranking — filtered list stays ranked.

**Optional polish (not done):**

- [ ] Re-sort on interval via client poll or SSE (home is SSR today).
- [ ] Show discover score breakdown in admin for debugging.
- [ ] Unit tests for `discoverScore` / tie-break.

---

## Phase 2 — Editorial & genre-night rules

**Goal:** Curated moments without breaking organic order for everyone else.

- [ ] **Genre night hero boost** — On scheduled genre nights (`GenreNightBanner` weekdays), pin or +N score boost for matching genre booths (config in `src/lib/constants` or admin).
- [ ] **Station flagship slot** — If a booth is flagged `isFlagship` on the DJ profile, eligible for hero when live (override or large score bonus).
- [ ] **Empty-state hero** — When no live booths, keep current marketing hero (already works).
- [ ] **Single live booth** — Hero only; hide redundant “Live Now” grid section (already mostly OK).

**Design refs:** `02-tokenomics.md` (discovery), genre night in home page.

---

## Phase 3 — Paid “Promote booth” (DROP)

**Goal:** DJs spend DROP for temporary discover placement; clearly labeled.

### Data model

- [ ] `StreamPromotion` or fields on `Stream`: `promotedUntil`, `promotionTier`, `promotionPaidAt`, `promotionDropAmount`.
- [ ] Or `User`/`DJ` wallet debit + audit row in `Transaction` with type `promotion`.

### Product rules (suggested v1)

- [ ] **Price tiers** — e.g. 1h / 4h / 24h at fixed DROP (define in tokenomics doc).
- [ ] **Hero vs grid** — Tier 1 = boosted grid position (+score or pinned top 3); Tier 2 = hero slot when live (max one sponsored hero at a time).
- [ ] **Caps** — Max N promoted booths on home; max 1 sponsored hero.
- [ ] **Labeling** — “Sponsored” badge on hero/card (legal/trust).
- [ ] **While live only** — Promotion applies to current live stream; expires at `promotedUntil` or stream end.
- [ ] **Ranking merge** — `finalScore = discoverScore + promotionBoost`; sponsored hero overrides organic hero if tier allows.

### UI / API

- [ ] DJ dashboard: “Promote this set” CTA when live (balance check, confirm, receipt).
- [ ] `/api/streams/[id]/promote` — debit DROP, set promotion window, idempotent guard.
- [ ] Admin: view/cancel promotions, refund policy hook.
- [ ] Home: merge promoted ordering in `rankLiveStreams` or wrapper `rankForDiscover()`.

**Design refs:** `02-tokenomics.md`, `10-tokenomics-stability.md`.

---

## Phase 4 — Discovery depth

- [ ] **Leaderboard sync** — Align “Top Earners” with ranking signals or keep lifetime earned (document choice).
- [ ] **Follow graph** — Boost booths from followed DJs in a “For you” row (auth required).
- [ ] **Recency decay** — Fade score for long-running low-activity streams.
- [ ] **Chat velocity** — Optional signal from message rate (needs counter on stream).

---

## Related product checklist (outside discover)

Use this as the master “what’s left” list from current demo → production.

### Demo & polish

- [x] Local demo (`demo:setup`, `demo:start`, LAN URLs)
- [x] Mobile layout / stream tabs
- [x] In-app guidance + `/guide`
- [x] Admin panel (users, streams, support, moderation)
- [x] Social sharing Phase 1 (ShareMenu, OG images)
- [ ] Shareable recap PNG / clip export (`11-dj-social-sharing.md` Phase 2+)
- [ ] OAuth auto-post to X/IG (Phase 3)

### Gamification

- [ ] Fan quests & set score vertical slice (`09-fan-quests-set-score.md`)
- [ ] Quest UI on stream page, DJ quest config, DROP rewards

### Streaming & VOD

- [ ] VOD auto-record from Mux webhooks
- [ ] VOD discover tab / DJ archive polish
- [ ] Real concurrent viewer count (Mux or heartbeat) vs peak-only

### Crypto & tokenomics

- [ ] VeChain mainnet / testnet DROP integration (currently demo balances)
- [ ] Promotion + tipping settlement on-chain (`10-tokenomics-stability.md`)
- [ ] Treasury / fee splits in admin

### Production deploy

- [ ] Postgres + Vercel (or chosen host); migrate from SQLite
- [ ] Env secrets, Mux prod keys, email (password reset)
- [ ] Rate limits & abuse on tip/promote APIs

---

## Implementation order (recommended)

1. ✅ Phase 1 ranking
2. Phase 3 promote booth (highest revenue impact; can ship before Phase 2)
3. Phase 2 genre night / flagship (quick config wins)
4. Phase 4 personalization
5. Gamification + VOD + chain in parallel as capacity allows

---

## Quick test (local demo)

1. `npm run demo:setup` — seeds multiple live DJs with different peaks/tips.
2. Open home — booth with highest `peak + tips×8` should be hero **Trending**.
3. Tip a stream in another tab, refresh home — order should update after refresh.
