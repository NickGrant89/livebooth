# 02 — Tokenomics (DROP)

## Token Overview

| Property | Value |
|----------|-------|
| Name | DropToken |
| Symbol | DROP |
| Type | ERC-20 (deploy on VeChain for low fees) |
| Decimals | 18 |
| Initial supply | 1,000,000,000 DROP |

## Supply Allocation

| Allocation | % | DROP | Purpose |
|------------|---|------|---------|
| Community rewards | 30% | 300M | Achievement rewards, fan incentives, airdrops |
| Platform treasury | 20% | 200M | Operations, liquidity, partnerships |
| Team & advisors | 15% | 150M | 4-year vest, 1-year cliff |
| DJ grants | 15% | 150M | Early adopter DJ incentives |
| Liquidity pool | 10% | 100M | DEX liquidity (Phase 3+) |
| Ecosystem fund | 10% | 100M | Integrations, label deals, sponsorships |

## How the Platform Earns Money

### Revenue Streams

| Stream | Mechanism | Est. take |
|--------|-----------|-----------|
| **Tip fees** | Fan tips DJ → smart contract splits | 10% to platform |
| **DROP sales** | Fan buys DROP with fiat/crypto via platform | Spread + margin |
| **Withdrawal fees** | DJ converts DROP → USD/ETH | 2% |
| **Subscriptions** | VIP booth subs in DROP | 10% |
| **Track ID unlocks** | Fan pays to see current track | 15% |
| **Crowd requests** | Fan pays to request a track | 15% |
| **Promoted streams** | DJ pays DROP for homepage feature | 100% (marketplace) |
| **Sponsored achievements** | Brand sponsors a badge | Flat fee |
| **Residency slots** | Clubs pay for branded channels | SaaS fee |

### Example: Daily Platform Revenue

Assumptions: 200 active streams/day, 30 avg tips/stream, 40 DROP avg tip, 10% fee

```
200 streams × 30 tips × 40 DROP × 10% = 24,000 DROP/day to platform
At $0.10/DROP = $2,400/day ≈ $72,000/month
```

Additional from subs, track unlocks, and DROP sales not included.

### Fee Flow (Tips)

```
Fan wallet ──100 DROP──► TipContract
                              │
                    ┌─────────┴─────────┐
                    ▼                   ▼
              DJ wallet (90)      Platform treasury (10)
```

## How DJs Earn Money

| Source | Description | Who pays |
|--------|-------------|----------|
| **Live tips** | Instant DROP during stream | Fans |
| **Achievement rewards** | Claim DROP from reward pool | Platform (community allocation) |
| **VIP subscriptions** | Recurring DROP/month | Fans |
| **Track ID unlocks** | Per-unlock fee during set | Fans |
| **Crowd requests** | Paid track requests | Fans |
| **Paywalled VODs** | Replay access after stream | Fans |
| **Collab splits** | Auto-split tips between 2 DJs | Fans (split contract) |
| **DJ grants** | Early adopter token grants | Platform |
| **Sponsored sets** | Brand pays DJ in DROP | Brands |

### DJ Revenue Example (mid-tier)

| Source | Monthly |
|--------|---------|
| Tips (20 streams × 500 DROP) | 10,000 DROP |
| VIP subs (30 × 10 DROP) | 300 DROP |
| Track unlocks (200 × 5 DROP × 85%) | 850 DROP |
| Achievement claims | 500 DROP |
| **Total** | **~11,650 DROP** |

At $0.10/DROP ≈ **$1,165/month** for a growing DJ.

## How Fans Spend DROP

| Action | Typical cost |
|--------|--------------|
| Tip DJ | 10–500 DROP |
| VIP sub | 10 DROP/month |
| Unlock track ID | 5 DROP |
| Request a track | 10 DROP |
| Buy VOD replay | 25 DROP |
| Stake on DJ (Phase 3) | 100+ DROP |

## DROP Acquisition (how fans get tokens)

1. **Buy with card/crypto** — Platform checkout (Stripe + on-ramp)
2. **Earn via fan achievements** — Watch milestones, superfan badges
3. **Referral rewards** — Invite friends, both get DROP
4. **Promotional airdrops** — Launch campaigns

## Creator Split Policy

| Platform | Creator share | Platform share |
|----------|---------------|----------------|
| Kick | 95% | 5% |
| Twitch subs | 50–70% | 30–50% |
| **LiveBooth (target)** | **90%** | **10%** |

Competitive with Kick. Lower than Kick on paper, but DROP utility (unlocks, requests, achievements) adds non-tip revenue.

## Smart Contracts (Phase 2)

| Contract | Responsibility |
|----------|----------------|
| `DROP.sol` | ERC-20 token |
| `TipRouter.sol` | Tips with configurable fee split |
| `AchievementVault.sol` | Holds reward pool, authorized mint/transfer on claim |
| `SubscriptionManager.sol` | Recurring DROP subs |
| `CollabSplit.sol` | Multi-recipient tip splitting |
| `RequestEscrow.sol` | Crowd request payments (refund if declined) |

## Regulatory Considerations

- DROP is a **utility token** (tips, unlocks, subs) — not marketed as investment
- KYC for withdrawals above threshold (e.g. $1,000/month)
- Terms of service: DJs responsible for music rights; platform offers "cleared" tier via label partnerships
- Consult legal counsel before mainnet launch

## Token Price (Phase 3 — optional)

Initial DROP has no public market price. Platform sets internal rate for buy/sell (e.g. 1 DROP = $0.10). DEX listing is Phase 3+ and only if utility demand justifies it.
