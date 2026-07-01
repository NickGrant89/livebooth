# LiveBooth — Product Design

> Design-first specification. Updated after each shipped phase — see build log in [07-development-phases.md](./07-development-phases.md).

**Tagline:** Tip the drop · **Token:** $DROP · **Chain:** VeChain · **Domain:** livebooth.fm

## Document Index

| Doc | Purpose |
|-----|---------|
| [01-product-vision.md](./01-product-vision.md) | What LiveBooth is, who it's for, positioning vs Kick/Twitch |
| [02-tokenomics.md](./02-tokenomics.md) | DROP token, revenue splits, how platform + DJs earn |
| [03-achievements.md](./03-achievements.md) | Achievement system — DJ + fan badges, unlock rules, rewards |
| [04-features-differentiation.md](./04-features-differentiation.md) | Core features + 10 DJ-native differentiators |
| [05-architecture.md](./05-architecture.md) | System architecture, services, data model, integrations |
| [06-user-flows.md](./06-user-flows.md) | Key user journeys (fan, DJ, platform admin) |
| [07-development-phases.md](./07-development-phases.md) | Phased build plan, build log, next sprint |
| [08-domain-options.md](./08-domain-options.md) | Available domain names for launch |
| [09-fan-quests-set-score.md](./09-fan-quests-set-score.md) | **Gamification slice** — fan daily quests + per-set score & grades (design only) |
| [10-tokenomics-stability.md](./10-tokenomics-stability.md) | Treasury, sinks, emission schedule, stability vs appreciation |
| [11-dj-social-sharing.md](./11-dj-social-sharing.md) | OG previews, share buttons, recap cards, clip export (design) |
| [12-discover-ranking-promotion.md](./12-discover-ranking-promotion.md) | **Discover ranking** (Phase 1 shipped) + promote booth roadmap |
| [13-master-backlog.md](./13-master-backlog.md) | **Master backlog** — single checklist of all open work |

## Visual Overview

Open the interactive design canvas beside chat:

[LiveBooth Product Design Canvas](/Users/Nick/.cursor/projects/Users-Nick-Projects-NickStreaming/canvases/livebooth-product-design.canvas.tsx)

## Design Principles

1. **DJ-native first** — Every feature should serve how DJs actually work (sets, track IDs, BPM, hardware).
2. **Crypto as utility, not gimmick** — DROP must be useful for tips, unlocks, subs, and requests before speculation.
3. **Creator-friendly economics** — Competitive split (target 90/10) to attract DJs away from Twitch/Kick.
4. **Achievements drive retention** — Milestones keep DJs streaming and fans engaging.
5. **Build in phases** — Ship streaming + tips first; add differentiators incrementally.
6. **Keep docs in sync** — When a phase ships, update `07-development-phases.md` and the canvas.

## Implementation Status

| Area | Design target | As built (2026-06) |
|------|---------------|---------------------|
| Brand | LiveBooth + Tip the drop | Logo, tagline, VeWorld-styled connect |
| Streaming | WebRTC/HLS + OBS ingest | HLS player + go-live + RTMP key |
| Crypto | ERC-20 DROP + VeWorld | Contracts built; VeChain Testnet deploy pending |
| Tips | On-chain smart contract | Internal ledger + on-chain TipRouter wired |
| Achievements | Server auto-unlock + claim | Done — 18 achievements; on-chain vault wired |
| Chat | SSE real-time | SSE stream at `/api/chat/[streamId]/stream` |
| Discover | Ranked hero + grid | Phase 1: peak viewers + session tips; promote booth pending |
| Track IDs / requests | Paid unlock + queue | Done |
| Collab / subs / leaderboard | Phase 3 | Done on internal ledger |
| Deploy | Vercel + Neon Postgres | Local SQLite dev |

## Phase Status

| Phase | Status | Summary |
|-------|--------|---------|
| Product design | **Complete** | 13 specs + canvas |
| Phase 0 (mock MVP) | Superseded | Replaced by full rebuild |
| Phase 1 (core platform) | **Shipped** | Auth, streaming, tips, chat (poll), ledger |
| Phase 1.5 (engagement) | **Shipped** | Achievements, track IDs, requests, collab, UI |
| Phase 2 (crypto) | **In progress** | Contracts + wagmi done; VeChain deploy next |
| Phase 3 (mainnet + polish) | Partial | Internal features done; clips, notifications, audit pending |
| Phase 4 (growth) | Not started | Integrations, PWA, partnerships |

## Next Up

See **[13-master-backlog.md](./13-master-backlog.md)** for the full prioritized checklist.  
**Beta testing with people:** [BETA-LAUNCH.md](../BETA-LAUNCH.md) (LAN → tunnel → hosted).

1. **Production deploy** — [PRODUCTION-DEPLOY.md](../PRODUCTION-DEPLOY.md) (Postgres + Vercel + Resend)
2. **VeChain testnet** — deploy contracts, set addresses in `.env`
3. **Promote booth (DROP)** — [12-discover-ranking-promotion.md](./12-discover-ranking-promotion.md) Phase 3
4. **Gamification** — [09-fan-quests-set-score.md](./09-fan-quests-set-score.md)
5. **Social sharing Phase 2** — recap PNG ([11-dj-social-sharing.md](./11-dj-social-sharing.md))
