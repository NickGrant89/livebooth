# 03 — Achievement System

## Overview

Achievements are milestone badges that unlock **DROP token rewards** from the community allocation pool. They serve three goals:

1. **Retention** — Give DJs and fans reasons to keep coming back
2. **Social proof** — Badges displayed on profiles attract new followers
3. **Token distribution** — Controlled DROP release tied to platform growth

## Two Audiences

| Audience | Purpose |
|----------|---------|
| **DJ achievements** | Reward streaming milestones, earnings, community growth |
| **Fan achievements** | Reward engagement, tipping, discovery — keeps fans spending |

---

## DJ Achievements

### Tiers

| Tier | Color | Reward range | Difficulty |
|------|-------|--------------|------------|
| Bronze | Amber | 50–100 DROP | Entry milestones |
| Silver | Slate | 200–300 DROP | Consistent effort |
| Gold | Yellow | 400–750 DROP | Significant growth |
| Platinum | Purple/pink | 2,000–5,000 DROP | Elite status |

### Categories

| Category | Tracks |
|----------|--------|
| `streaming` | Duration, frequency, genres |
| `community` | Followers, chat engagement |
| `earnings` | Tips received, single-tip records |
| `milestones` | Viewer peaks, total hours |

### Full Achievement Catalog

| ID | Name | Requirement | Tier | Reward |
|----|------|-------------|------|--------|
| `first-set` | First Drop | Complete 1 live stream (min 15 min) | Bronze | 50 DROP |
| `hour-warrior` | Hour Warrior | Stream 60 min in one session | Bronze | 100 DROP |
| `genre-explorer` | Genre Explorer | Stream 3 different genres | Silver | 200 DROP |
| `crowd-pleaser` | Crowd Pleaser | Reach 100 peak concurrent viewers | Silver | 250 DROP |
| `tip-master` | Tip Master | Receive 500 DROP total in tips | Silver | 300 DROP |
| `loyal-fans` | Loyal Fans | Reach 1,000 followers | Gold | 500 DROP |
| `marathon-dj` | Marathon DJ | Stream 4 hours in one session | Gold | 750 DROP |
| `whale-magnet` | Whale Magnet | Receive single tip ≥ 100 DROP | Gold | 400 DROP |
| `legend-status` | Legend Status | Reach 10,000 followers | Platinum | 2,000 DROP |
| `crypto-king` | Crypto King | Earn 10,000 DROP total (tips + claims) | Platinum | 5,000 DROP |

### Sponsored Achievements (Phase 2+)

| ID | Name | Sponsor | Requirement |
|----|------|---------|-------------|
| `pioneer-master` | Pioneer Master | Pioneer DJ | Stream 10 sets using Serato/Rekordbox integration |
| `redbull-marathon` | Red Bull Marathon | Red Bull | 6-hour stream event |
| `vinyl-purist` | Vinyl Purist | — | 5 vinyl-only streams |

---

## Fan Achievements

| ID | Name | Requirement | Tier | Reward |
|----|------|-------------|------|--------|
| `first-tip` | First Tip | Send 1 tip to any DJ | Bronze | 10 DROP |
| `generous-soul` | Generous Soul | Tip 100 DROP total | Silver | 25 DROP |
| `superfan` | Superfan | Tip 10 different DJs | Silver | 50 DROP |
| `night-owl` | Night Owl | Watch 5 hours of live streams | Silver | 30 DROP |
| `track-hunter` | Track Hunter | Unlock 20 track IDs | Gold | 75 DROP |
| `request-king` | Request King | 10 paid track requests accepted | Gold | 100 DROP |
| `vip-member` | VIP Member | Subscribe to 3 DJs | Gold | 50 DROP |
| `og-listener` | OG Listener | Account active 6 months | Platinum | 200 DROP |

---

## Lifecycle

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Track     │────►│   Unlock    │────►│   Claim     │────►│   Display   │
│   metrics   │     │  (server)   │     │  (on-chain) │     │  on profile │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
```

### 1. Track

Backend services monitor:

| Metric | Source |
|--------|--------|
| Stream duration | Streaming service heartbeat |
| Peak viewers | WebSocket viewer count |
| Tips received | TipRouter contract events |
| Followers | User service |
| Genres streamed | Stream metadata |
| Track unlocks | Request/unlock service |

### 2. Unlock

When threshold met:

- Server writes `achievement_unlock` record
- Push notification to DJ/fan: "You unlocked Crowd Pleaser!"
- Badge appears as **claimable** (glowing state in UI)

Rules:
- Each achievement unlocks **once per user**
- Progress bars shown for incremental achievements (e.g. "847/1000 followers")
- Anti-gaming: bot viewer detection, minimum stream quality gate

### 3. Claim

User clicks **Claim** on achievements page:

- Server verifies unlock + not already claimed
- `AchievementVault` transfers DROP to user wallet
- Record `achievement_claim` with tx hash
- Badge moves to **claimed** state (permanent on profile)

Requirements:
- Wallet must be connected
- Gas sponsored by platform (meta-transactions on VeChain)

### 4. Display

- Profile page: badge grid (locked / unlocked / claimed)
- Stream page: sidebar showing DJ's top badges
- Leaderboard: DJs ranked by achievement count / tier

---

## Data Model

```typescript
interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;           // emoji or SVG asset URL
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  rewardTokens: number;
  requirement: string;    // human-readable
  category: string;
  audience: 'dj' | 'fan';
  metricKey: string;      // e.g. 'peak_viewers', 'total_tips_received'
  threshold: number;
  sponsorId?: string;
}

interface UserAchievement {
  userId: string;
  achievementId: string;
  unlockedAt: Date;
  claimedAt?: Date;
  claimTxHash?: string;
  progress?: number;      // for incremental achievements
}
```

---

## Reward Pool Management

- Funded from 30% community allocation (300M DROP)
- Platform sets **monthly emission cap** to prevent drain (e.g. max 1M DROP/month in achievement rewards)
- Dashboard for admins: total claimed, remaining pool, top achievements by claim rate
- If pool low: reduce new achievement rewards or pause low-tier claims

---

## UI Surfaces

| Page | Achievement UI |
|------|----------------|
| `/achievements` | Full catalog, progress, claim buttons |
| `/dj/[username]` | Badge showcase on profile |
| `/stream/[username]` | DJ badges in sidebar |
| `/dashboard` | DJ progress toward next milestone |
| Notifications | Unlock + claimable alerts |

---

## MVP vs Production

| Behavior | MVP (current) | Production |
|----------|---------------|------------|
| Unlock trigger | Manual "Demo unlock" button | Server auto-detect from metrics |
| Claim | Adds to localStorage balance | On-chain transfer from vault |
| Progress | Not shown | Progress bars per achievement |
| Fan achievements | Not built | Full fan catalog |
| Sponsored | Not built | Brand admin panel |
