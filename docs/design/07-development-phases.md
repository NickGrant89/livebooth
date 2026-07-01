# 07 — Development Phases

Build in phases. Each phase is shippable and adds real value.

**Living doc:** Update this file and the [product design canvas](/Users/Nick/.cursor/projects/Users-Nick-Projects-NickStreaming/canvases/livebooth-product-design.canvas.tsx) whenever a phase (or major milestone) ships.

---

## Build log

| Date | Milestone | Notes |
|------|-----------|-------|
| 2026-06 | Phase 0 | Original Next.js MVP — mock wallet, simulated chat, localStorage |
| 2026-06 | Design complete | 7 spec docs + interactive canvas |
| 2026-06 | **Phase 1 shipped** | Full-stack rebuild: Prisma/SQLite, bcrypt auth, JWT sessions, server actions, 20+ API routes, HLS player, internal DROP ledger (90/10 tips), polling chat |
| 2026-06 | **Phase 2 started** | DropToken + TipRouter + AchievementVault contracts, wagmi, on-chain tips + claims |
| 2026-06 | **Phase 1 polish** | Search, RTMP credentials, viewer presence, mobile nav, subscribe/follow state |
| 2026-06 | **Retention sprint** | In-app notifications, daily DROP, genre nights, session goals/recap, top tippers, timestamp tips/VOD highlights, DJ staking (ledger), weekly schedule, VIP queue priority, profile settings, SSE chat |
| 2026-06 | **Phase 2 partial** | Stripe buy-DROP, profile `/settings`, VIP perks wired in stream |
| 2026-06 | **Radio + push** | Station tier MVP (`/station/[slug]`, tip split, presented-by badge), Web Push go-live alerts |
| 2026-06 | **Radio station suite** | Follower staking + milestones, CSV schedule import, white-label embed, station owner dashboard in Settings |
| 2026-06 | **Help & rankings** | Fan/DJ guides, support FAQ, leaderboard redesign (multi-tab podium) |
| 2026-06 | **Admin & trust** | Admin panel, stream reports + auto-stop, support tickets, Terms/Privacy, password reset |
| 2026-06 | **AI moderation** | Hive + AWS Rekognition scan pipeline, auto-stop on risk threshold, admin scan UI |
| 2026-06 | **Discover ranking** | Home hero + grid sorted by peak viewers + session tips; roadmap in doc 12 |
| 2026-06 | **Tier A partial** | Master backlog doc 13, Resend email, rate limits, chat ban/report, Livepeer VOD webhook |
| 2026-06 | **Gamification + discover** | Fan daily quests, set score/grades, promote booth (grid + hero), quest chip on stream |
| 2026-06 | **Polish sprint** | Station page + OG, leaderboard sets tab, admin promotions tab, recap PNG, VOD highlight seek |
| 2026-06 | **Sprint 1 — VOD + archive** | MediaMTX fmp4 recordings, DJ archive tab, live watching vs session peak labels |
| 2026-06 | **Sprint 2 — clips + discover** | 9:16 clip export on VOD, share reminder on go-live, For you home row |
| 2026-06 | **Sprint 3 — on-chain tips** | Tip tx verification, wallet link/unlink, on-chain tip UX, `smoke:onchain` |
| 2026-06 | **Sprint 4 — Postgres + Vercel** | PostgreSQL migrations, Docker local DB, `vercel-build`, `/api/health`, `smoke:deploy` |

---

## Phase 0: MVP Prototype (DONE — superseded)

**Status:** Complete (replaced by Phase 1 rebuild)

Original prototype with localStorage wallet and mock data. Kept only as reference; all active development is on the Phase 1 codebase.

---

## Phase 1: Core Platform (DONE — with gaps)

**Status:** Shipped 2026-06 · gaps listed below

**Goal:** Real streaming, real auth, real chat. No blockchain yet — internal DROP ledger.

### Delivered

| Item | Status | Implementation |
|------|--------|----------------|
| Auth | Done | Email signup/login, bcrypt, JWT cookie (`lb_session`), server actions |
| DJ profiles | Done | Username, display name, bio, avatar, genres, `/dj/[username]` |
| Follow system | Done | Follow/unfollow API + button |
| Streaming | Done | HLS player (Mux test URL; Livepeer if `LIVEPEER_API_KEY` set) |
| Go live | Done | Stream key, RTMP URL, OBS wizard, `/go-live` → `/dashboard` |
| Chat | Done | SSE real-time stream + in-memory pub/sub |
| Internal DROP ledger | Done | Prisma `BeatBalance` + `LedgerEntry`, 90/10 tip split |
| Tips | Done | Live tips from ledger balance |
| VOD | Partial | `/vod/[id]` + local RTMP fmp4 via `/api/vod/file`; Livepeer webhook for cloud |
| Deploy | Not done | Local dev only (SQLite); Postgres/Vercel pending |

### Exit criteria

| Criterion | Met? |
|-----------|------|
| DJ can go live with OBS, fans can watch | Yes (test HLS; real RTMP needs Livepeer key) |
| Fans can tip (internal DROP) | Yes |
| Fans can chat | Yes (SSE real-time) |
| Streams recorded and replayable | Partial |

### Remaining Phase 1 gaps (→ next sprint)

- [x] Real-time chat (SSE stream, replaces 2s polling)
- [ ] Migrate SQLite → PostgreSQL (Neon) for production
- [ ] Vercel deploy + env config
- [x] VOD auto-record on stream end (local RTMP fmp4 + Livepeer webhook)
- [x] Follow state on stream page (GET `/api/follow/[username]`)
- [x] Basic moderation (ban user from chat, report message)

---

## Phase 1.5: Engagement Layer (DONE)

**Status:** Shipped 2026-06

Built ahead of the original roadmap — internal ledger versions of features planned for Phase 2/3.

### Delivered

| Item | Status | Implementation |
|------|--------|----------------|
| Achievement engine | Done | Server metrics, auto-unlock, progress bars, claim rewards |
| Fan + DJ achievements | Done | 18 achievements in `src/lib/constants.ts` |
| Track ID unlocks | Done | 5 DROP unlock, saved to `/crate` |
| Crowd requests | Done | Paid queue, DJ accept/decline on dashboard |
| VIP subscriptions | Done | 10 DROP/mo, 90/10 split |
| Collab / B2B mode | Done | Invite API + `/collab` page (DB split, not on-chain) |
| Leaderboard | Done | `/leaderboard` + API |
| Wallet + buy DROP | Done | Simulated purchase (no Stripe yet) |
| Premium UI | Done | Glass design system, theater stream layout, genre filters |

---

## Phase 2: Crypto + On-Chain (IN PROGRESS)

**Status:** Testnet live 2026-06 · verify E2E tips + mainnet prep

**Goal:** Real DROP token on VeChain testnet, wallet connect, on-chain tips and claims.

### Delivered

| Item | Status | Implementation |
|------|--------|----------------|
| DROP token | Done | `contracts/src/DropToken.sol` — ERC-20 + testnet faucet |
| VeWorld connect | Done | Branded `ConnectWalletButton`, wallet link on connect |
| Brand UI | Done | Logo component, tagline hero, footer, login/signup polish |
| TipRouter | Done | 90/10 on-chain tip split |
| AchievementVault | Done | Server-signed EIP-712 claims |
| Contract tests | Done | `npm run contracts:test` |
| dapp-kit + VeWorld | Done | `Web3Provider`, `ConnectWalletButton`, `useOnChainDrop` |
| Wallet page | Done | Connect wallet, testnet faucet |
| On-chain tips | Done | Stream chat → TipRouter when DJ wallet linked |
| On-chain claims | Done | Achievements → vault claim with backend signature |
| Deploy script | Done | `npm run contracts:deploy` → VeChain Testnet |

### Remaining

- [x] Deploy contracts to VeChain Testnet — see [VECHAIN-TESTNET.md](../VECHAIN-TESTNET.md)
- [x] Set `.env` contract addresses (`npm run contracts:sync-env`)
- [ ] Verify on-chain tip + claim E2E ([LOCAL-TEST-CHECKLIST.md](../LOCAL-TEST-CHECKLIST.md))
- [ ] Mainnet: audit, cap enforcement, separate claim signer ([ONCHAIN-ROADMAP.md](../ONCHAIN-ROADMAP.md))
- [x] Stripe test mode for buying DROP (checkout + webhook; dev top-up fallback)
- [x] Profile settings (`/settings` — bio, avatar, genres, password)
- [x] VIP subscription perks (30% off requests & track IDs, cancel, settings list)

---

## Phase 3: Differentiation + Mainnet (PARTIAL — internal only)

**Status:** Several features exist on internal ledger; need on-chain polish + net-new items

**Goal:** Ship differentiators, audit contracts, launch on VeChain mainnet.

### Already built (internal ledger)

| Item | Status |
|------|--------|
| BPM/genre discovery | Done — genre filters + engagement ranking on home |
| Collab/B2B mode | Done — DB only |
| Subscriptions | Done — VIP booth |
| Leaderboard | Done |
| Track ID + requests | Done |

### Still to build

| Item | Details |
|------|---------|
| Timestamp tips | Tip at moment → VOD highlights |
| Clips | 30–60s shareable clips from VOD |
| Notifications | Push when followed DJ goes live |
| CollabSplit contract | On-chain 50/50 tip split for B2B |
| Contract audit | Third-party audit before mainnet |
| Mainnet launch | DROP on VeChain mainnet, real money |
| KYC | Withdrawal verification above threshold |

### Exit criteria

- Platform live on VeChain mainnet with real DROP
- Timestamp tips + clips shipped
- Audited smart contracts

---

## Phase 4: Growth + Partnerships (ongoing)

**Goal:** Scale, hardware integrations, label deals.

### Deliverables

| Item | Details |
|------|---------|
| Serato/Rekordbox integration | Auto track metadata |
| OBS browser source widget | Now playing overlay |
| Residency slots | Club/label branded channels |
| Sponsored achievements | Brand badge admin panel |
| Cleared streaming tier | Label partnership pilot |
| DROP staking | Fan stakes on DJs |
| Mobile PWA | Installable web app |
| API for third parties | Public API for stats/embeds |

---

## Sprint checklist (updated)

### Sprint 1–2: Auth + Profiles + Follow — DONE
- [x] Database schema (users, follows, sessions)
- [x] Auth (bcrypt + JWT + server actions)
- [x] DJ profile pages
- [x] Follow/unfollow API
- [x] Frontend wired to real data

### Sprint 3–4: Streaming — DONE
- [x] Livepeer/Mux integration (optional key)
- [x] Stream create/end API
- [x] RTMP key generation
- [x] HLS player component
- [x] Go live wizard

### Sprint 5–6: Chat + Internal Tips — MOSTLY DONE
- [x] Real-time chat (SSE)
- [x] Chat UI
- [x] Internal DROP ledger
- [x] Tip API (90/10 split)
- [x] Tip UI

### Sprint 7–8: VOD + Achievements — MOSTLY DONE
- [x] VOD auto-recording + replay polish (local RTMP + file serve API)
- [x] Achievement metric collectors
- [x] Auto-unlock service
- [x] Progress bar UI
- [x] Fan achievements

### Sprint 9–10: Blockchain — IN PROGRESS
- [x] DROP ERC-20 contracts (DropToken, TipRouter, AchievementVault)
- [ ] VeChain Testnet deploy + env addresses
- [x] wagmi wallet connect (VeWorld styling)
- [x] On-chain tips + achievement claims (wired, needs deploy)

### Sprint 11–12: Differentiators — PARTIAL
- [x] Track ID unlock flow
- [x] Crowd request queue
- [x] BPM/genre filters
- [ ] Buy DROP (Stripe test)
- [x] Collab mode (DB)
- [x] Subscriptions
- [x] Leaderboard

### Sprint 12.5: Gamification slice — SHIPPED (local)

Spec: [09-fan-quests-set-score.md](./09-fan-quests-set-score.md)

- [x] **Phase A:** Fan daily quests (3 slots, claim flow, home panel + stream chip)
- [x] **Phase B:** Set score + letter grades (DJ recap modal)
- [x] **Phase C:** Quest ↔ score link, fan contribution, shareable grade card, live booth score

### Sprint 12.6: Social sharing — MOSTLY DONE

Spec: [11-dj-social-sharing.md](./11-dj-social-sharing.md)

- [x] ShareMenu + copy/X/WhatsApp on dashboard, go-live, recap
- [x] Open Graph metadata + `/api/og` for stream, DJ, station, recap pages
- [x] Recap share image download + UTM tracking
- [ ] OAuth auto-post (“I’m live”)

### Sprint 12.7: Discover promotion — DONE (local)

Spec: [12-discover-ranking-promotion.md](./12-discover-ranking-promotion.md)

- [x] Home ranking (peak + tips + genre night + flagship)
- [x] Promote booth — grid (75 DROP) + hero (250 DROP)
- [x] Admin promotions tab (active/revenue/cancel)

Spec: [10-tokenomics-stability.md](./10-tokenomics-stability.md)

- [ ] Treasury dashboard, emission caps, withdraw flow design → implement when fiat cash-out ships

### Sprint 3: On-chain tips — DONE (local)

- [x] On-chain tip tx verification (`verify-tip.ts` + `/api/tips/on-chain`)
- [x] Wallet link/unlink + on-chain status API (`/api/wallet/on-chain`, `DELETE /api/wallet`)
- [x] `OnChainWalletCard` + linked-state badge on `ConnectWalletButton`
- [x] Stream chat on-chain tip UX (auto-suggest when VeWorld + DJ wallet ready)
- [x] DJ dashboard on-chain tips row
- [x] `npm run smoke:onchain` API smoke script
- [ ] Manual E2E: VeWorld on localhost:3008 → faucet → live on-chain tip

### Sprint 4: Postgres + Vercel — DONE (code)

- [x] Prisma `postgresql` provider + init migration
- [x] Dual driver adapters (Postgres + legacy SQLite runtime)
- [x] Docker Postgres for local dev (`npm run db:up`)
- [x] `vercel-build` with `prisma migrate deploy`
- [x] `/api/health` + `npm run smoke:deploy`
- [ ] Neon project + Vercel env vars (ops)
- [ ] First production deploy + webhook URLs

### Sprint 13+: Mainnet + Growth
- [ ] Contract audit
- [ ] Mainnet deploy
- [ ] Timestamp tips
- [ ] Clips
- [ ] Notifications
- [ ] Production deploy (Postgres + Vercel)

---

## Current stack (as built)

| Layer | Target (design) | As implemented |
|-------|-----------------|----------------|
| Frontend | Next.js 16, Tailwind | Next.js 16, Tailwind 4, Outfit font |
| Database | PostgreSQL | PostgreSQL (Prisma 7 + `@prisma/adapter-pg`); legacy SQLite via adapter |
| Auth | NextAuth/Clerk | bcrypt + jose JWT + server actions |
| Real-time | SSE (chat) | SSE stream + in-memory hub |
| Streaming | Livepeer/Mux | HLS (Mux test / Livepeer optional) |
| Blockchain | VeChain | Contracts built; wagmi on VeChain Testnet (100010) |
| Dev server | — | `npm run dev:clean` on port 3008 |

Demo accounts (seeded): `demo@livebooth.local` / `password123` (fan), `neonpulse@livebooth.local` / `password123` (DJ).

---

## Team Requirements (minimum)

| Role | Phase 1 | Phase 2+ |
|------|---------|----------|
| Full-stack dev | 1 | 1–2 |
| Smart contract dev | — | 1 (part-time) |
| Designer | 1 (part-time) | 1 (part-time) |
| DevOps | — | 1 (part-time) |

Solo dev can reach Phase 2 with focused effort (~3 months full-time).

---

## Risk Register

| Risk | Impact | Mitigation |
|------|--------|------------|
| DMCA takedowns | High | Cleared tier, education, fast response |
| Low DJ adoption | High | 90/10 split, DJ grants, achievement rewards |
| Token regulatory issues | High | Utility-only positioning, legal counsel |
| Streaming costs | Medium | Livepeer (cheaper), limit free VOD retention |
| Smart contract exploit | Critical | Audit, bug bounty, start on testnet |
| Bot/fake engagement | Medium | Viewer verification, achievement caps |

---

## Definition of Done (production launch)

- [x] DJ can stream live via OBS (test HLS playback)
- [ ] Fan can connect wallet and tip on-chain
- [ ] Achievements auto-unlock and claim on-chain
- [x] Track ID unlocks and crowd requests work
- [ ] VOD replays available after stream (auto-record)
- [ ] Smart contracts audited
- [ ] DROP on VeChain mainnet
- [ ] Terms of service + privacy policy published
- [ ] Basic moderation tools (ban, report)
- [ ] 10+ beta DJs streaming regularly
