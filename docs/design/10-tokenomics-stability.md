# 10 — Tokenomics: Stability & Long-Term Value

> **Status:** Design spec · **Not implemented**  
> **Extends:** [02-tokenomics.md](./02-tokenomics.md) · [09-fan-quests-set-score.md](./09-fan-quests-set-score.md)

**Goal:** Keep DROP **useful and predictable** inside LiveBooth while building toward sustainable demand — without marketing DROP as an investment.

---

## 1. Two goals (and the tension)

| Goal | What it means | Phase |
|------|----------------|-------|
| **Stability** | Fans know what DROP buys; DJs know what they earn; platform can cover cash-outs | Phase 1–2 (now) |
| **Appreciation** | External market price rises over time | Phase 3+ (optional, high risk) |

These often conflict. A “stable” utility credit is **pegged**. A “moon” token is **volatile**.

**LiveBooth strategy:** Optimize for **utility stability first**, then optional external liquidity only when in-app demand is proven.

---

## 2. Operating model by phase

### Phase A — Internal economy (current → mainnet soft launch)

DROP behaves like **booth credits**:

```
Fan buys DROP (fiat)  →  spends in app  →  DJ earns DROP  →  withdraws via platform (fee)
                              ↓
                    Platform treasury (fees)
```

| Parameter | Example | Purpose |
|-----------|---------|---------|
| **Buy rate** | 10 DROP = $1.00 (Stripe) | Fixed entry price |
| **Redeem rate** | 10 DROP = $0.85–0.90 | Spread funds treasury + prevents arb |
| **Withdrawal fee** | 2% | Revenue + anti-spam |
| **In-app prices** | Fixed in DROP (5 unlock, 10 request, etc.) | Predictable UX |

**Stability =** “100 DROP always gets me ~10 unlocks + tips” — not CoinGecko price.

### Phase B — On-chain utility (VeChain testnet → mainnet)

Same internal peg for **buy/spend**. On-chain DROP used for:

- Tips via `TipRouter` (90/10 split)
- Achievement claims from `AchievementVault`
- Optional wallet-held balance (VeWorld)

Platform still acts as **liquidity backstop** for fiat on/off ramp. Chain is for transparency and low fees — not open speculation yet.

### Phase C — External market (optional, later)

Only if:

- ≥ X active DJs streaming weekly
- ≥ Y DROP spent in-app per day
- Treasury can seed DEX liquidity without risking ops runway

Mechanisms: controlled LP, buyback from fee revenue, partial fee burn. Legal review required.

---

## 3. Supply & emission schedule

Reference allocation from [02-tokenomics.md](./02-tokenomics.md) (1B DROP total).

### Emission buckets (controlled release)

| Bucket | Total | Release model | Used for |
|--------|-------|---------------|----------|
| Community rewards | 300M | **10-year linear** + achievement caps | Achievements, quests, referrals |
| DJ grants | 150M | **4-year vest**, milestone gates | Early DJ onboarding |
| Platform treasury | 200M | **Governance + ops**; no lump dump | Liquidity, buyback, partnerships |
| Team | 150M | **4-year vest, 1-year cliff** | Standard |
| Liquidity | 100M | **Locked until Phase C** | DEX LP only |
| Ecosystem | 100M | **Deal-by-deal** | Labels, sponsors |

### Daily emission cap (in-app rewards)

| Source | Max per active user / day | Max platform-wide / day |
|--------|---------------------------|-------------------------|
| Daily login | 5 DROP | — |
| Fan quests (proposed) | ~40 DROP | — |
| Achievement claims | One-time | Budget from community pool |
| Referrals | 25 DROP both sides | 10k DROP/day cap |

**Rule:** Free DROP emission must stay **≪** fee revenue + fiat sales, or the economy inflates.

### Emission dashboard (admin)

Track weekly:

- DROP minted (rewards)
- DROP burned (if enabled)
- DROP in treasury
- DROP withdrawn (fiat out)
- DROP sold (fiat in)

---

## 4. Sinks (DROP leaving circulation)

Sinks create **reasons to acquire** DROP and reduce sell pressure.

### Primary sinks (live today)

| Sink | Flow | Platform take |
|------|------|---------------|
| Tips | Fan → DJ | 10% |
| Track unlock | Fan → DJ | 15% |
| Crowd request | Fan → DJ (escrow) | 15% |
| VIP sub | Fan → DJ | 10% |
| Promoted booth (future) | DJ → burned/treasury | 100% |

### Secondary sinks (recommended)

| Sink | Mechanic |
|------|----------|
| **Quest rewards funded from treasury budget** | Not new mint — transfer from community allocation |
| **Staking lock-up** | DROP locked; reduces liquid supply |
| **Profile flair / tip animations** | Cosmetic spend (small DROP burn or treasury) |
| **Station residency fee** | Stations pay monthly DROP for branded channel |
| **Collab slot booking** | DJs pay DROP to book B2B slot |

### Burn policy (Phase B+)

On each platform fee collection:

```
50% → treasury (ops, liquidity)
30% → community reward pool (recycle)
20% → burn (deflationary, optional)
```

Start with **0% burn** until economy is measured; enable burn when fiat inflow > withdrawal outflow for 3 consecutive months.

---

## 5. Sources (DROP entering circulation)

| Source | Risk if unchecked | Mitigation |
|--------|-------------------|------------|
| Fiat purchase (Stripe) | Low — backed by USD | Primary healthy source |
| Achievement claims | Medium — farmable | Metrics + cooldowns; cap daily claims |
| Daily login / quests | Medium | Per-user caps; account age gate |
| DJ grants | Low if vested | Milestone-based unlock |
| Testnet faucet | High on mainnet | **Disable on mainnet** |
| Contract mint | Critical | Only `AchievementVault` authorized; multisig admin |

**Anti-farm rule:** Withdrawals require account age ≥ 7 days + minimum 1 organic action (tip sent or stream hosted).

---

## 6. Treasury management

### Treasury wallets

| Wallet | Holds | Purpose |
|--------|-------|---------|
| **Hot (ops)** | ≤ 30 days runway in DROP/USD | Payouts, small grants |
| **Cold (treasury)** | Majority of platform fee DROP | LP, buyback, emergencies |
| **Community vault** | Achievement + quest budget | On-chain `AchievementVault` |

### Revenue → treasury flow

```
Tips/unlocks/subs fees (DROP)
        │
        ├── Ops reserve (USD + DROP float for cash-outs)
        ├── DJ grant program
        ├── Liquidity reserve (Phase C)
        └── Buyback/burn (Phase C, if surplus)
```

### Cash-out (DJ withdrawals)

1. DJ requests withdrawal (min 500 DROP)
2. KYC if > $1,000/month cumulative
3. Platform sells internal DROP at **redeem rate** (not DEX price in Phase A/B)
4. 2% fee → treasury
5. Payout via Stripe Connect / bank (future)

**Stability key:** Redeem rate slightly below buy rate so platform isn’t arbitraged.

---

## 7. Demand drivers (what makes DROP “worth more” legitimately)

Price appreciation should be a **side effect** of platform growth, not the product promise.

| Driver | Mechanism |
|--------|-----------|
| More DJs | More tips, unlocks, subs |
| Gamification | Quests + set scores → more sessions & spending ([09](./09-fan-quests-set-score.md)) |
| Social sharing | DJs bring fans who buy DROP ([11](./11-dj-social-sharing.md)) |
| Stations / radio | Larger audiences, residency fees |
| VIP / staking | Locks DROP, recurring spend |
| Fiat simplicity | “Buy $10 of DROP” without wallet friction |
| VeChain low fees | On-chain tips viable at small amounts |

### KPIs that matter more than token price

- DROP spent per live stream
- % fans who purchase DROP (not only free rewards)
- DJ withdrawal vs reinvest rate
- Revenue DROP / emitted DROP ratio (**must stay > 1** long term)

---

## 8. Stability scenarios

### Scenario 1: Too much free DROP

**Symptoms:** Users farm login/quests, cash out, no tips.  
**Fix:** Lower emission, raise withdraw gate, increase sink variety.

### Scenario 2: DJs dump earnings

**Symptoms:** Withdrawals > fiat sales.  
**Fix:** Improve redeem spread temporarily; DJ incentives to hold (promoted booth discounts paid in DROP); staking on own channel.

### Scenario 3: Speculative pump (Phase C)

**Symptoms:** DEX price disconnects from in-app peg.  
**Fix:** Don’t honor DEX price for buy/redeem; use internal peg only; communicate utility-only.

### Scenario 4: Insufficient liquidity for cash-out

**Symptoms:** DJs can’t withdraw.  
**Fix:** Treasury USD reserve policy (hold % of fiat inflow); cap daily withdrawals.

---

## 9. Legal & communications

- DROP is a **utility token** for in-app actions — not equity, not yield product
- No “investment” or “guaranteed returns” marketing
- Terms: DJs responsible for content rights; platform moderation
- KYC/AML for withdrawals above threshold
- Consult counsel before mainnet + DEX

**Approved copy:**  
> “DROP powers tips, unlocks, and subs on LiveBooth. Buy what you need, spend in the booth.”

**Avoid:**  
> “DROP will increase in value” / “Get in early”

---

## 10. Implementation checklist

### Phase A (no code dependency on chain)

- [ ] Admin treasury dashboard (inflow/outflow/emission)
- [ ] Redeem rate config (env or admin)
- [ ] Withdrawal request flow + 2% fee
- [ ] Emission caps on daily login + quests
- [ ] Account-age gate on withdraw

### Phase B (VeChain)

- [ ] Deploy contracts testnet → mainnet
- [ ] Disable testnet faucet on mainnet
- [ ] Multisig on vault admin
- [ ] On-chain tip volume vs ledger reconciliation report

### Phase C (optional market)

- [ ] Legal sign-off
- [ ] LP seed plan from 100M allocation
- [ ] Buyback/burn policy triggered by treasury surplus
- [ ] Public transparency page (supply, burns, treasury)

---

## 11. Summary

| Question | Answer |
|----------|--------|
| How to keep DROP stable? | Internal buy/redeem peg, fixed in-app prices, limited free emission |
| How to increase value over time? | Grow platform usage + sinks + fee revenue; optional burn/buyback later |
| When to list on DEX? | After utility demand is proven — not before |
| What not to do? | Promise price, massive airdrops, unlimited free DROP with easy cash-out |

---

*Last updated: 2026-06 · Owner: Product/Economics · Legal review required before mainnet.*
