# 05 — System Architecture

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                           CLIENTS                                    │
│  Next.js Web App  │  OBS Browser Source  │  DJ Companion App (P2)  │
└────────┬──────────────────┬──────────────────────┬─────────────────┘
         │                  │                      │
         ▼                  ▼                      ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         API GATEWAY (REST + WS)                      │
└────────┬──────────┬──────────┬──────────┬──────────┬───────────────┘
         │          │          │          │          │
         ▼          ▼          ▼          ▼          ▼
    ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────────┐
    │ Auth   │ │ Stream │ │ Chat   │ │ Tips & │ │ Achievement│
    │ Service│ │ Service│ │ Service│ │ Wallet │ │ Service    │
    └────────┘ └────────┘ └────────┘ └────────┘ └────────────┘
         │          │          │          │          │
         ▼          ▼          ▼          ▼          ▼
    ┌─────────────────────────────────────────────────────────────┐
    │                      DATA LAYER                              │
    │  PostgreSQL  │  Redis  │  S3 (VOD)  │  VeChain (DROP)       │
    └─────────────────────────────────────────────────────────────┘
```

## Tech Stack (recommended)

| Layer | Technology | Rationale |
|-------|------------|-----------|
| Frontend | Next.js 16, TypeScript, Tailwind | Already in MVP |
| API | Node.js (Next.js API routes → NestJS/Fastify at scale) | TypeScript end-to-end |
| Real-time | WebSocket (Socket.io or native WS) | Chat, viewer counts |
| Database | PostgreSQL (Supabase or Neon) | Users, streams, achievements |
| Cache | Redis | Live viewer counts, rate limits |
| Streaming | Livepeer or Mux | HLS ingest + playback |
| OBS ingest | RTMP → Livepeer/Mux | Standard DJ workflow |
| Blockchain | VeChain (Ethereum L2) | Low gas, Coinbase ecosystem |
| Wallet | wagmi + viem + WalletConnect | Industry standard |
| Smart contracts | Solidity + Hardhat/Foundry | DROP, TipRouter, Vault |
| File storage | S3 / Cloudflare R2 | VOD replays, clips |
| Auth | NextAuth or Clerk + wallet signature | Email + wallet login |
| Payments (fiat) | Stripe + Coinbase Onramp | Buy DROP with card |

## Services

### Auth Service
- Email/password + social login
- Wallet signature login (Sign-In With Ethereum)
- Link wallet to account
- DJ verification badge (optional KYC)

### Stream Service
- Create/end stream sessions
- RTMP ingest URL generation
- HLS playback URL
- Stream metadata (title, genre, BPM)
- Viewer count aggregation
- VOD recording trigger

### Chat Service
- WebSocket rooms per stream
- Message persistence (last 500 msgs)
- Moderation (ban, timeout, slow mode)
- Tip messages highlighted
- Track unlock announcements

### Tips & Wallet Service
- DROP balance (on-chain + off-chain ledger for pending)
- Tip initiation → TipRouter contract
- Subscription management
- Track ID unlock payments
- Request escrow (hold → release/refund)
- Withdrawal to ETH/USDC
- Transaction history

### Achievement Service
- Metric aggregation from stream/tip/follow events
- Unlock detection (cron or event-driven)
- Claim authorization → AchievementVault contract
- Progress tracking API
- Leaderboard computation

### Request Service (Crowd Requests)
- Queue management per stream
- Accept/decline by DJ
- Escrow release/refund
- Rate limiting per fan

### Notification Service
- DJ went live (followed users)
- Achievement unlocked
- Tip received
- Request accepted/declined
- Push (web) + email

## Data Model (core entities)

```typescript
// Users
User {
  id: uuid
  username: string
  displayName: string
  email: string
  walletAddress: string?
  role: 'fan' | 'dj' | 'admin'
  avatarUrl: string?
  bio: string?
  genres: Genre[]
  followerCount: number
  createdAt: timestamp
}

// Streams
Stream {
  id: uuid
  djId: uuid → User
  title: string
  genre: Genre
  bpmRange?: string
  status: 'scheduled' | 'live' | 'ended'
  ingestUrl: string
  playbackUrl: string
  peakViewers: number
  totalTips: number
  startedAt: timestamp
  endedAt?: timestamp
  vodUrl?: string
}

// Tips
Tip {
  id: uuid
  streamId: uuid
  fromUserId: uuid
  toUserId: uuid
  amount: number          // DROP
  message?: string
  timestampMs?: number    // for highlight moments
  txHash: string
  createdAt: timestamp
}

// Track Unlocks
TrackUnlock {
  id: uuid
  streamId: uuid
  userId: uuid
  trackTitle: string
  trackArtist: string
  amount: number
  txHash: string
  createdAt: timestamp
}

// Crowd Requests
CrowdRequest {
  id: uuid
  streamId: uuid
  fanId: uuid
  trackTitle: string
  trackArtist?: string
  amount: number
  status: 'pending' | 'accepted' | 'declined' | 'refunded'
  createdAt: timestamp
}

// Achievements — see 03-achievements.md
UserAchievement { ... }

// Subscriptions
Subscription {
  id: uuid
  fanId: uuid
  djId: uuid
  amount: number          // DROP/month
  status: 'active' | 'cancelled'
  nextBillingAt: timestamp
}

// Currently Playing (from DJ software or manual)
NowPlaying {
  streamId: uuid
  title: string
  artist: string
  bpm?: number
  key?: string
  artworkUrl?: string
  updatedAt: timestamp
}
```

## Smart Contract Architecture

```
                    ┌─────────────────┐
                    │    DROP.sol     │
                    │   (ERC-20)      │
                    └────────┬────────┘
                             │
          ┌──────────────────┼──────────────────┐
          ▼                  ▼                  ▼
   ┌─────────────┐   ┌──────────────┐   ┌─────────────────┐
   │ TipRouter   │   │ Achievement  │   │ RequestEscrow   │
   │ (10% fee)   │   │ Vault        │   │ (hold/refund)   │
   └─────────────┘   └──────────────┘   └─────────────────┘
          │
          ▼
   ┌─────────────┐
   │ CollabSplit │
   │ (multi-DJ)  │
   └─────────────┘
```

## Streaming Pipeline

```
DJ (OBS / browser)
  │
  │ RTMP
  ▼
Livepeer/Mux Ingest
  │
  ├──► HLS playback URL → Web player
  │
  └──► Recording → S3 → VOD page
```

**Latency target:** 5–15 seconds (HLS). WebRTC option for <1s later.

## Security

| Area | Measure |
|------|---------|
| Smart contracts | Audit before mainnet |
| Tips | Reentrancy guards, pull over push |
| API | Rate limiting, JWT + wallet sig |
| Chat | Profanity filter, report system |
| Withdrawals | KYC threshold, daily limits |
| Stream keys | Rotating RTMP keys per session |

## Infrastructure (production)

| Component | Provider options |
|-----------|------------------|
| Hosting | Vercel (frontend) + Railway/Fly.io (API) |
| Database | Neon PostgreSQL |
| Redis | Upstash |
| Streaming | Livepeer (decentralized, cheaper) or Mux (managed) |
| CDN | Cloudflare |
| Monitoring | Sentry + Datadog |
| Blockchain RPC | Alchemy / QuickNode (Base) |

## Environment Variables

```
DATABASE_URL=
REDIS_URL=
LIVEPEER_API_KEY=
JWT_SECRET=
NEXTAUTH_SECRET=
BASE_RPC_URL=
DROP_TOKEN_ADDRESS=
TIP_ROUTER_ADDRESS=
ACHIEVEMENT_VAULT_ADDRESS=
PLATFORM_WALLET_PRIVATE_KEY=  # server-side only, vault/HSM
STRIPE_SECRET_KEY=
COINBASE_COMMERCE_KEY=
```

---

## As implemented (June 2026 — Phase 1 + 1.5)

Current production target differs from design in a few places. See [07-development-phases.md](./07-development-phases.md) for the living build log.

| Design target | As built |
|---------------|----------|
| PostgreSQL | SQLite via Prisma 7 + `@prisma/adapter-better-sqlite3` |
| NextAuth / Clerk | bcrypt + jose JWT sessions + server actions |
| WebSocket chat | REST API + SSE live stream (in-memory hub) |
| On-chain DROP | Internal `BeatBalance` + `LedgerEntry` tables |
| Redis viewer counts | `peakViewers` on `Stream` model |
| Livepeer/Mux | HLS playback (Mux test URL; Livepeer if key set) |

**Key paths:** `src/lib/auth.ts`, `src/lib/ledger.ts`, `src/lib/achievements.ts`, `src/lib/streaming.ts`, `prisma/schema.prisma`.

**Next architecture changes (Phase 2):** `/contracts` Hardhat project, wagmi provider, VeChain Testnet RPC, dual ledger sync layer.
