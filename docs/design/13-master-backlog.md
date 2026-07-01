# 13 — Master Backlog

> **Single source of truth** for what is shipped vs open. Update checkboxes when items land.  
> **Last reviewed:** 2026-06 · **Related:** [07-development-phases](./07-development-phases.md) · [12-discover-ranking-promotion](./12-discover-ranking-promotion.md)

**Legend:** ✅ Done · 🟡 Partial · ❌ Not started

---

## How to use this doc

1. Pick a **tier** (A = production blockers first).
2. Check off items here when merged.
3. Mirror major milestones in `07-development-phases.md` build log.
4. Stale design docs are noted in §Doc hygiene — fix when touching that area.

---

## Tier A — Production blockers

Must ship before public launch beyond LAN demo.

### Infrastructure & deploy

| Status | Item | Notes / location |
|--------|------|------------------|
| 🟡 | SQLite → PostgreSQL | ✅ Prisma postgresql + migrations; Vercel deploy ops pending — [PRODUCTION-DEPLOY.md](../PRODUCTION-DEPLOY.md) |
| 🟡 | Vercel (or host) deploy | ✅ `vercel.json` + `vercel-build`; create Neon + Vercel project (ops) |
| 🟡 | Production email | ✅ Resend via `src/lib/email.ts` — set `RESEND_API_KEY` + `EMAIL_FROM` |
| 🟡 | API rate limits | ✅ In-memory `src/lib/rate-limit.ts` on login/forgot/chat/tips — Redis for prod scale |

### Streaming & VOD

| Status | Item | Notes / location |
|--------|------|------------------|
| 🟡 | Real VOD recording | ✅ MediaMTX fmp4 + `/api/vod/file` when using local RTMP; Livepeer webhook for cloud |
| ❌ | Mux webhooks | Not implemented |
| ✅ | VOD discover / DJ archive polish | `/dj/[username]?tab=archive` + recent sets on overview |

### VeChain / on-chain (Phase 2)

| Status | Item | Notes / location |
|--------|------|------------------|
| ✅ | Deploy contracts to VeChain testnet | [VECHAIN-TESTNET.md](../VECHAIN-TESTNET.md) · `npm run contracts:verify` |
| ✅ | Set `.env` contract addresses | `npm run contracts:sync-env` after deploy |
| 🟡 | On-chain tips end-to-end | ✅ Verified tx sync + wallet UI; manual VeWorld E2E on [LOCAL-TEST-CHECKLIST](../LOCAL-TEST-CHECKLIST.md) |
| 🟡 | On-chain achievement claims | Same; see [ONCHAIN-ROADMAP.md](../ONCHAIN-ROADMAP.md) |

### Trust & moderation

| Status | Item | Notes / location |
|--------|------|------------------|
| ✅ | Stream report + auto-stop | `ReportStreamButton`, `lib/moderation.ts` |
| ✅ | AI moderation pipeline | `lib/ai-moderation.ts` — mock unless Hive/AWS keys |
| ✅ | Per-stream chat ban | `StreamChatBan` + `/api/chat/[streamId]/ban` + host ban in chat |
| ✅ | Report chat message | `ChatMessageReport` + `/api/chat/report/[messageId]` + admin queue |
| 🟡 | AI moderation in prod | Set `HIVE_API_KEY` or AWS creds |

---

## Tier B — Product gaps (internal demo OK, not prod-ready)

### Money out / tokenomics ([10-tokenomics-stability.md](./10-tokenomics-stability.md))

| Status | Item |
|--------|------|
| ✅ | DJ withdrawal flow | Request + admin approve/paid/reject at `/wallet` + `/admin` → Treasury |
| 🟡 | KYC above threshold | Gate at $1k/mo — manual support message only |
| 🟡 | Treasury admin dashboard | ✅ `/admin` → Treasury tab |
| 🟡 | Redeem-rate / withdraw fee enforcement | ✅ `REDEEM_USD_CENTS_PER_DROP` + 2% fee |
| ✅ | **Promote booth (DROP)** — [doc 12](./12-discover-ranking-promotion.md); admin tab at `/admin` → Promotions |

### Viewer metrics

| Status | Item |
|--------|------|
| 🟡 | Live concurrent (presence) vs peak (discover/OG) — inconsistent labels | ✅ Player shows watching + peak; discover cards use session peak |
| ❌ | Mux/CDN concurrent count |
| 🟡 | Home live re-sort (poll/SSE) | ✅ `HomeDiscoverRefresh` + `/api/discover/live` |

### VOD / highlights / clips

| Status | Item |
|--------|------|
| 🟡 | Timestamp tips + VOD highlights list |
| ✅ | Click highlight → seek in player |
| ❌ | Clip export 30–60s 9:16 ([11-dj-social-sharing.md](./11-dj-social-sharing.md)) | ✅ WebM 9:16 + vertical PNG on `/vod/[id]` |

### Social sharing Phase 2+ ([11-dj-social-sharing.md](./11-dj-social-sharing.md))

| Status | Item |
|--------|------|
| ✅ | ShareMenu, OG images, metadata (Phase 1) |
| ✅ | Downloadable recap PNG |
| ✅ | Station OG metadata |
| ❌ | OAuth auto-post (“I’m live”) |
| ❌ | Push reminder to share on go-live | ✅ In-app + web push + dashboard/go-live banner |

### Collab on-chain

| Status | Item |
|--------|------|
| ✅ | DB + ledger split |
| ❌ | CollabSplit smart contract |

---

## Tier C — Gamification ([09-fan-quests-set-score.md](./09-fan-quests-set-score.md))

| Status | Phase | Item |
|--------|-------|------|
| ✅ | A | Fan daily quests (schema, API, UI, ledger) |
| ✅ | B | Set score + letter grades (recap modal) |
| ✅ | C | Quest ↔ score link, shareable grade card, live set score |

**Baseline shipped:** daily login, achievements, session goals (DJ), session recap, leaderboard, `watchMinutes`.

---

## Tier D — Discover (excluding Promote booth)

| Status | Item | Doc |
|--------|------|-----|
| ✅ | Phase 1 — organic ranking | [12](./12-discover-ranking-promotion.md) |
| ✅ | Phase 2 — genre night boost, flagship hero | `discover-ranking.ts` + home |
| ✅ | Phase 3 — Promote booth (DROP) | shipped |
| 🟡 | Phase 4 — For you, decay, chat velocity | For you row on home; decay + chat velocity open ([12](./12-discover-ranking-promotion.md)) |

---

## Tier E — Differentiators ([04-features-differentiation.md](./04-features-differentiation.md))

| Feature | Status |
|---------|--------|
| Track ID economy | ✅ |
| Timestamp tips | ✅ (seek partial) |
| Genre / BPM discovery | 🟡 genre filter only; no BPM browse |
| B2B / Collab | 🟡 DB split; no split-screen |
| Crowd requests | ✅ |
| VIP subs | ✅ |
| Serato/Rekordbox | ❌ |
| OBS now-playing widget | ❌ |
| Stations / residency SaaS | 🟡 stations exist |
| Cleared streaming tier | ❌ |
| Sponsored achievements | ❌ |
| DROP staking | 🟡 fan stake on DJ/station |

---

## Tier F — Phase 4 growth ([07-development-phases.md](./07-development-phases.md))

| Status | Item |
|--------|------|
| 🟡 | PWA — SW for push only; no manifest |
| ❌ | Public API for stats/embeds |
| ❌ | Hardware integrations |
| ❌ | Label / club partnerships |
| ❌ | Contract audit + mainnet |
| ❌ | 10+ beta DJs (ops) |

---

## Recommended build order

```
1. ✅ Master backlog doc (this file)
2. 🟡 Tier A code: email, rate limits, chat mod, VOD webhook — **shipped**; Postgres/Vercel/Resend keys remain ops
3. Postgres + Vercel deploy (ops — PRODUCTION-DEPLOY.md)
4. ✅ VeChain testnet deploy — verify on-chain tips (checklist)
5. ✅ Social recap PNG
6. ✅ Discover Phase 2 (genre night + flagship)
7. ✅ Gamification Phase A–C (quests + set score + grade share)
8. ✅ Promote booth (DROP)
9. ✅ VOD recording (local RTMP) + DJ archive tab
10. ✅ Sprint 2 — clip export, share reminder, For you discover
11. ✅ Sprint 3 — on-chain tip verification, wallet link/unlink, smoke:onchain
12. 🟡 Sprint 4 — Postgres + Vercel (code shipped; Neon/Vercel ops)
13. Mainnet + contract audit
```

---

## Doc hygiene (stale entries to fix)

| Doc | Issue |
|-----|-------|
| `07-development-phases.md` | Marks timestamp tips, notifications, Stripe, terms as open — **shipped** |
| `11-dj-social-sharing.md` | §1 “no custom previews” — **wrong** since OG shipped |
| Sprint 12.6 in 07 | Social Phase 1 — **shipped** |

---

## Quick reference — what is definitely shipped

Auth, profiles, follow, HLS streaming, go-live, SSE chat, internal DROP ledger, tips, achievements, track IDs, requests, VIP subs, collab (DB), leaderboard, stations, staking, guidance, admin panel, terms/privacy, password reset flow, stream report, AI moderation, web push, Stripe buy-DROP, social share Phase 1, discover ranking Phase 1, local demo tooling, mobile layout.
